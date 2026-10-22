// Small quote-aware scanner for HTML opening tags. Not a full parser: it reads tag names and quoted attributes,
// which is all the audits need, and it never executes or fetches anything. A ">" inside a quoted attribute value
// does not end the tag. Comments are dropped; <script>/<style> bodies are skipped but their opening tags are kept.

export interface Tag {
  name: string;
  a: Record<string, string>;
}

/** Quote-aware scan of opening tags, so a '>' inside an attribute value does not end the tag early. */
export function scanTags(html: string): Tag[] {
  const tags: Tag[] = [];
  const src = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => m.slice(0, m.indexOf('>') + 1));
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;
    const nm = src.slice(lt).match(/^<([a-zA-Z][\w-]*)/);
    if (!nm) {
      i = lt + 1;
      continue;
    }
    let j = lt + nm[0].length;
    let quote: string | null = null;
    for (; j < src.length; j++) {
      const c = src[j]!;
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
    }
    const a: Record<string, string> = {};
    for (const m of src.slice(lt + nm[0].length, j).matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      a[m[1]!.toLowerCase()] = m[2] ?? m[3] ?? '';
    }
    tags.push({ name: nm[1]!.toLowerCase(), a });
    i = j + 1;
  }
  return tags;
}
