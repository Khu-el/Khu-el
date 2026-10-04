// The portal's database calls. Every table, RPC and Edge Function call lives
// here or in src/data/staff.ts (catalog inserts, edits and publish toggles;
// the catalog delete is below), so those
// two files are the full database surface the app touches. Auth calls are not
// here: sign-in, sign-up, password reset and change, and sign-out are made
// from pages/AuthScreens.tsx and pages/Account.tsx, auth/useSession.ts reads
// the session, and deleteMyAccount below signs out after deleting. RLS is the
// real gate; these functions never assume a check passed because the UI hid a
// button.
import { requireClient } from '../supabase';
import type {
  ActionPlan,
  ActionPlanWeek,
  IntegrationStatus,
  LearningModule,
  LearningProgress,
  LearningTrack,
  MemberPreferences,
  Notification,
  OpportunityBlueprint,
  OpportunityPathway,
  PlanStatus,
  Profile,
  Resource,
  SavedResource,
  SignupInvite,
  StaffRole,
  SupportRequest,
  SupportStatus,
} from '../types';
import type { WeekDraft } from '../logic/plans';

/** Throws the Supabase error (it has message/code/status) so callers can map it. */
function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

/**
 * For an UPDATE or DELETE ending in `.select('id')`. PostgREST reports a write
 * that matched no row -- it no longer exists, or RLS filtered it out -- as a
 * success with no rows, so this throws `message` then rather than let the UI
 * claim a change that did not happen.
 */
export function unwrapChanged(res: { data: unknown[] | null; error: unknown }, message: string): void {
  if (res.error) throw res.error;
  if (!res.data || res.data.length === 0) throw { message };
}

// ---------------------------------------------------------------- profile

export async function getProfile(userId: string): Promise<Profile | null> {
  const res = await requireClient().from('profiles').select('*').eq('id', userId).maybeSingle();
  return unwrap(res) as Profile | null;
}

export async function updateProfile(userId: string, patch: Partial<Pick<Profile, 'display_name' | 'timezone' | 'onboarding_complete'>>): Promise<void> {
  unwrap(await requireClient().from('profiles').update(patch).eq('id', userId));
}

export async function getPreferences(userId: string): Promise<MemberPreferences | null> {
  return unwrap(await requireClient().from('member_preferences').select('*').eq('user_id', userId).maybeSingle()) as MemberPreferences | null;
}

export async function savePreferences(userId: string, prefs: Pick<MemberPreferences, 'email_updates' | 'push_updates' | 'product_updates' | 'analytics_consent'>): Promise<void> {
  unwrap(await requireClient().from('member_preferences').upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' }));
}

export async function getStaffRole(): Promise<StaffRole | null> {
  const res = await requireClient().rpc('current_staff_role');
  return (unwrap(res) as StaffRole | null) ?? null;
}

// ---------------------------------------------------------------- catalog

export async function listTracks(): Promise<LearningTrack[]> {
  return unwrap(await requireClient().from('learning_tracks').select('*').order('sort_order').order('id')) as LearningTrack[];
}

export async function listModules(trackId?: string): Promise<LearningModule[]> {
  let q = requireClient().from('learning_modules').select('*');
  if (trackId) q = q.eq('track_id', trackId);
  return unwrap(await q.order('sort_order').order('id')) as LearningModule[];
}

export async function getModule(moduleId: string): Promise<LearningModule | null> {
  return unwrap(await requireClient().from('learning_modules').select('*').eq('id', moduleId).maybeSingle()) as LearningModule | null;
}

export async function listResources(): Promise<Resource[]> {
  return unwrap(await requireClient().from('resources').select('*').order('sort_order').order('id')) as Resource[];
}

export async function listPathways(): Promise<OpportunityPathway[]> {
  return unwrap(await requireClient().from('opportunity_pathways').select('*').order('sort_order').order('id')) as OpportunityPathway[];
}

export async function listIntegrationStatus(): Promise<IntegrationStatus[]> {
  return unwrap(await requireClient().from('integration_status').select('*').order('integration_key')) as IntegrationStatus[];
}

// ---------------------------------------------------------------- progress

export async function listProgress(userId: string): Promise<LearningProgress[]> {
  return unwrap(await requireClient().from('learning_progress').select('*').eq('user_id', userId)) as LearningProgress[];
}

export async function setModuleCompleted(userId: string, trackId: string, moduleId: string, completed: boolean): Promise<void> {
  unwrap(
    await requireClient()
      .from('learning_progress')
      .upsert(
        {
          user_id: userId,
          track_id: trackId,
          module_id: moduleId,
          completed,
          progress_percent: completed ? 100 : 0,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,track_id,module_id' },
      ),
  );
}

export async function listSaved(userId: string): Promise<SavedResource[]> {
  return unwrap(await requireClient().from('saved_resources').select('*').eq('user_id', userId)) as SavedResource[];
}

export async function saveResource(userId: string, resourceId: string): Promise<void> {
  unwrap(await requireClient().from('saved_resources').upsert({ user_id: userId, resource_id: resourceId }, { onConflict: 'user_id,resource_id', ignoreDuplicates: true }));
}

export async function unsaveResource(userId: string, resourceId: string): Promise<void> {
  unwrap(await requireClient().from('saved_resources').delete().eq('user_id', userId).eq('resource_id', resourceId));
}

// ---------------------------------------------------------------- blueprints and plans

export async function listBlueprints(userId: string): Promise<OpportunityBlueprint[]> {
  return unwrap(await requireClient().from('opportunity_blueprints').select('*').eq('user_id', userId).order('created_at', { ascending: false })) as OpportunityBlueprint[];
}

export async function createBlueprint(userId: string, input: Pick<OpportunityBlueprint, 'goal' | 'pathway_key' | 'pathway_snapshot' | 'notes'>): Promise<OpportunityBlueprint> {
  return unwrap(await requireClient().from('opportunity_blueprints').insert({ user_id: userId, ...input }).select('*').single()) as OpportunityBlueprint;
}

export async function updateBlueprint(id: string, patch: Partial<Pick<OpportunityBlueprint, 'goal' | 'notes'>>): Promise<void> {
  unwrap(await requireClient().from('opportunity_blueprints').update(patch).eq('id', id));
}

export async function deleteBlueprint(id: string): Promise<void> {
  unwrap(await requireClient().from('opportunity_blueprints').delete().eq('id', id));
}

export async function listPlans(userId: string): Promise<ActionPlan[]> {
  return unwrap(await requireClient().from('action_plans').select('*').eq('user_id', userId).order('created_at', { ascending: false })) as ActionPlan[];
}

// Plan ids are uuids. Postgres rejects anything else (a link cut short, like
// #/plans/3f2a9c) with an error no retry can fix, so it is answered as the
// not-found case it is instead of being queried.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPlan(planId: string): Promise<{ plan: ActionPlan | null; weeks: ActionPlanWeek[] }> {
  if (!UUID.test(planId)) return { plan: null, weeks: [] };
  const client = requireClient();
  const plan = unwrap(await client.from('action_plans').select('*').eq('id', planId).maybeSingle()) as ActionPlan | null;
  const weeks = plan ? (unwrap(await client.from('action_plan_weeks').select('*').eq('plan_id', planId).order('week_number')) as ActionPlanWeek[]) : [];
  return { plan, weeks };
}

export async function listAllWeeks(userId: string): Promise<ActionPlanWeek[]> {
  return unwrap(await requireClient().from('action_plan_weeks').select('*').eq('user_id', userId)) as ActionPlanWeek[];
}

/**
 * Creates the plan and its four weeks in one database transaction
 * (public.create_action_plan), so no plan is ever left without its weeks.
 * clientRef is an idempotency key made once per form: a retry after a lost
 * response returns the plan the first attempt created instead of a duplicate.
 * The plan belongs to the signed-in user; the function takes no user id.
 */
export async function createPlan(
  input: { goal: string; title: string; pathway_key: string | null; start_date: string },
  weeks: WeekDraft[],
  clientRef: string,
): Promise<ActionPlan> {
  return unwrap(
    await requireClient().rpc('create_action_plan', {
      p_goal: input.goal,
      p_title: input.title,
      p_pathway_key: input.pathway_key,
      p_start_date: input.start_date,
      p_weeks: weeks,
      p_client_ref: clientRef,
    }),
  ) as ActionPlan;
}

export async function updatePlan(planId: string, patch: Partial<Pick<ActionPlan, 'title' | 'goal' | 'status'>>): Promise<void> {
  unwrap(await requireClient().from('action_plans').update(patch).eq('id', planId));
}

export async function setPlanStatus(planId: string, status: PlanStatus): Promise<void> {
  await updatePlan(planId, { status });
}

export async function deletePlan(planId: string): Promise<void> {
  unwrap(await requireClient().from('action_plans').delete().eq('id', planId));
}

export async function updateWeek(weekId: string, patch: Partial<Pick<ActionPlanWeek, 'title' | 'action_text' | 'completed'>>): Promise<void> {
  const full: Record<string, unknown> = { ...patch };
  if (patch.completed !== undefined) full.completed_at = patch.completed ? new Date().toISOString() : null;
  unwrap(await requireClient().from('action_plan_weeks').update(full).eq('id', weekId));
}

// ---------------------------------------------------------------- support and notifications

export async function listMySupport(userId: string): Promise<SupportRequest[]> {
  return unwrap(await requireClient().from('support_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false })) as SupportRequest[];
}

/** external_ref is a client-made idempotency key: a double-submit inserts once. */
export async function fileSupportRequest(
  userId: string,
  input: Pick<SupportRequest, 'category' | 'subject' | 'message'> & { requester_name: string | null; contact_email: string | null; external_ref: string },
): Promise<void> {
  const res = await requireClient().from('support_requests').insert({ user_id: userId, ...input });
  if (res.error && (res.error as { code?: string }).code !== '23505') throw res.error;
}

/** The most notifications listNotifications returns. */
export const NOTIFICATION_LIST_LIMIT = 100;

/**
 * Unread first (newest first), then the newest read ones, NOTIFICATION_LIST_LIMIT
 * in all. Unread come first so an older unread one is never pushed out of the
 * list by newer read ones; countUnreadNotifications gives the exact total.
 */
export async function listNotifications(userId: string): Promise<Notification[]> {
  const client = requireClient();
  const unread = unwrap(
    await client.from('notifications').select('*').eq('user_id', userId).is('read_at', null).order('created_at', { ascending: false }).limit(NOTIFICATION_LIST_LIMIT),
  ) as Notification[];
  const room = NOTIFICATION_LIST_LIMIT - unread.length;
  const read =
    room > 0
      ? (unwrap(
          await client.from('notifications').select('*').eq('user_id', userId).not('read_at', 'is', null).order('created_at', { ascending: false }).limit(room),
        ) as Notification[])
      : [];
  return [...unread, ...read];
}

/** The exact number of unread notifications, however many there are. */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const res = await requireClient().from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null);
  if (res.error) throw res.error;
  // A count the server did not report is unknown, never zero.
  if (typeof res.count !== 'number') throw { message: 'The unread count was not returned.' };
  return res.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  unwrap(await requireClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id));
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  unwrap(await requireClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null));
}

// ---------------------------------------------------------------- account

/** Deletes the signed-in member's own account. The function only ever deletes the caller. */
export async function deleteMyAccount(): Promise<void> {
  const client = requireClient();
  const { error } = await client.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await client.auth.signOut({ scope: 'local' });
}

// ---------------------------------------------------------------- staff

export async function staffListSupport(): Promise<SupportRequest[]> {
  return unwrap(await requireClient().from('support_requests').select('*').order('created_at', { ascending: false }).limit(500)) as SupportRequest[];
}

/**
 * Updating status or note writes an in-app notification for the member (database trigger). Nothing is emailed.
 * Throws when no row was changed (the request no longer exists, or RLS refused it), so no notification is claimed.
 */
export async function staffUpdateSupport(id: string, patch: { status?: SupportStatus; staff_note?: string | null }): Promise<void> {
  unwrapChanged(
    await requireClient().from('support_requests').update(patch).eq('id', id).select('id'),
    'Nothing was saved, so the member was not notified. The request may have been deleted, or your role may not allow this. Reload and try again.',
  );
}

export async function staffCreateInvite(email: string): Promise<string> {
  return unwrap(await requireClient().rpc('create_signup_invite', { p_email: email })) as string;
}

export async function staffRevokeInvite(email: string): Promise<void> {
  unwrap(await requireClient().rpc('revoke_signup_invite', { p_email: email }));
}

export async function staffListInvites(): Promise<SignupInvite[]> {
  return unwrap(await requireClient().rpc('list_signup_invites')) as SignupInvite[];
}

type CatalogTable = 'learning_tracks' | 'learning_modules' | 'resources' | 'opportunity_pathways';

/** Throws when no row was deleted (it was already gone, or RLS refused it). */
export async function staffDelete(table: CatalogTable, id: string): Promise<void> {
  unwrapChanged(
    await requireClient().from(table).delete().eq('id', id).select('id'),
    'Nothing was deleted. The item may already have been deleted, or your role may not allow this. Reload and try again.',
  );
}
