import type { Ledger } from '../core/ledger.ts';
import type { Actor, ActionContext, ActionRecord } from '../core/types.ts';

// Ideas adapted from cloudflare/agentic-inbox (Apache-2.0): draft-only agent, fail-closed injection screen,
// per-mailbox isolation. What this adds: access control per mailbox (upstream: any user past the single
// Access policy can operate every mailbox, including via /mcp, which exposes send_email), a send path that
// is a ledger action bound to the exact recipients/body, and a rule that a send to anyone NOT already on the
// thread is surfaced to the approver as a new recipient.

export type Role = 'read' | 'draft' | 'send';

export class MailboxAcl {
  private grants = new Map<string, Set<Role>>();
  private key = (p: Actor, mailbox: string) => `${p.kind}:${p.id}|${mailbox.toLowerCase()}`;

  grant(p: Actor, mailbox: string, roles: Role[]) {
    this.grants.set(this.key(p, mailbox), new Set(roles));
  }
  can(p: Actor, mailbox: string, role: Role): boolean {
    return this.grants.get(this.key(p, mailbox))?.has(role) ?? false; // default deny
  }
}

export interface InboundEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml?: string | null;
}

export interface Screening {
  quarantined: boolean;
  reasons: string[];
}

const INJECTION_PATTERNS: [RegExp, string][] = [
  [/ignore (all |any |the )?(previous|prior|above) (instructions|prompts?)/i, 'instruction-override phrase'],
  [/disregard (your|the) (system|previous) (prompt|instructions)/i, 'instruction-override phrase'],
  [/\byou are now\b/i, 'role reassignment'],
  [/(reveal|print|show|repeat) (your |the )?(system )?(prompt|instructions)/i, 'prompt-extraction request'],
  [/\b(forward|send|email) (all|every|the) .{0,40}(to|at) \S+@\S+/i, 'bulk-forward directive'],
  [/\b(call|use|invoke) (the )?(send|delete|forward)[_ ]?(email|reply|message)?\b/i, 'tool-invocation directive'],
];
const HIDDEN_HTML = /(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|color\s*:\s*#?fff(fff)?\b[^"']*background[^"']*#?fff)/i;

/** Deterministic pre-screen. Fails closed: a missing body or any internal error quarantines. */
export function screenInbound(mail: InboundEmail): Screening {
  try {
    if (mail.bodyText === null && !mail.bodyHtml) return { quarantined: true, reasons: ['no readable body'] };
    const text = `${mail.subject}\n${mail.bodyText ?? ''}\n${(mail.bodyHtml ?? '').replace(/<[^>]+>/g, ' ')}`;
    const reasons = INJECTION_PATTERNS.filter(([re]) => re.test(text)).map(([, why]) => why);
    if (mail.bodyHtml && HIDDEN_HTML.test(mail.bodyHtml)) reasons.push('hidden text in HTML');
    return { quarantined: reasons.length > 0, reasons };
  } catch {
    return { quarantined: true, reasons: ['screening error'] };
  }
}

export interface Draft {
  mailbox: string; // the From address; must be a mailbox the principal can draft in
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  threadParticipants: string[]; // everyone already on the thread (lowercased by the caller or here)
}

/** "Client <client@acme.example>" and "client@acme.example" are the same recipient. */
export const norm = (a: string) => (a.match(/<([^<>]+)>\s*$/)?.[1] ?? a).trim().toLowerCase();

export function newRecipients(d: Draft): string[] {
  const known = new Set([norm(d.mailbox), ...d.threadParticipants.map(norm)]);
  return [...d.to, ...(d.cc ?? [])].map(norm).filter((a) => !known.has(a));
}

export class AccessError extends Error {}

/** Drafting is reversible and local, so it is DRAFT class. It still requires the draft role on that mailbox. */
export function proposeDraft(ledger: Ledger, acl: MailboxAcl, ctx: ActionContext, actor: Actor, draft: Draft): ActionRecord {
  if (!acl.can(actor, draft.mailbox, 'draft')) throw new AccessError(`${actor.id} may not draft in ${draft.mailbox}`);
  return ledger.propose({ kind: 'inbox.draft', context: ctx, actor, payload: draft });
}

/**
 * Sending is CONSEQUENTIAL. The payload (recipients, subject, body, and the list of NEW recipients) is what the
 * approver's hash covers, so a body or recipient swapped after review cannot be sent.
 */
export function proposeSend(ledger: Ledger, acl: MailboxAcl, ctx: ActionContext, actor: Actor, draft: Draft): ActionRecord {
  if (!acl.can(actor, draft.mailbox, 'send')) throw new AccessError(`${actor.id} may not propose sends from ${draft.mailbox}`);
  if (draft.to.length === 0) throw new AccessError('a send needs at least one recipient');
  return ledger.propose({
    kind: 'email.send',
    context: ctx,
    actor,
    payload: { ...draft, newRecipients: newRecipients(draft) },
  });
}

export interface Transport {
  send(msg: { from: string; to: string[]; cc: string[]; subject: string; body: string; inReplyTo?: string }): Promise<{ messageId: string }>;
}

/** The only code that can send. The transport is injected; this package ships none (no SMTP, no API client). */
export function registerSend(ledger: Ledger, transport: Transport) {
  ledger.registerExecutor('email.send', {
    lanes: ['NVS_DELIVERY'],
    run: async (p: Draft & { newRecipients: string[] }) =>
      transport.send({ from: p.mailbox, to: p.to, cc: p.cc ?? [], subject: p.subject, body: p.body, inReplyTo: p.inReplyTo }),
  });
}
