/**
 * Read a spreadsheet into rows of strings: `.xlsx` or `.csv`.
 *
 * No dependency. An .xlsx is a zip of XML parts; the zip's deflate streams are
 * inflated with the platform's own DecompressionStream (every current browser,
 * and Node 18+ for the tests). Only what an import needs is read: sheet names,
 * shared strings and cell values. Formulas contribute their cached value;
 * styles are ignored, so a date cell arrives as its Excel serial number and the
 * importer converts the columns it knows are dates.
 *
 * The file never leaves the browser. Nothing here makes a request.
 */

export type Sheet = string[][];
export type Workbook = { name: string; rows: Sheet }[];

// ── zip ──────────────────────────────────────────────────────────────────────

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Every file in a zip archive, by path. Supports stored (0) and deflate (8) entries. */
export async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // End of central directory: scan back from the end (it may carry a comment).
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip archive — is this really an .xlsx file?');

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();

  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('Corrupt zip central directory.');
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    // The local header's name/extra lengths can differ from the central copy's.
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const raw = bytes.subarray(start, start + compressedSize);

    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, await inflateRaw(raw));
    // Other methods do not occur in spreadsheets; skip rather than fail the whole file.
  }
  return files;
}

// ── xml ──────────────────────────────────────────────────────────────────────

export function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    const lower = e.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'quot') return '"';
    if (lower === 'apos') return "'";
    const code = lower.startsWith('#x') ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : '';
  });
}

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? decodeXml(m[1]) : undefined;
}

/** All text runs inside an element (a shared string can be split into rich-text runs). */
function textOf(xml: string): string {
  let out = '';
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += decodeXml(m[1]);
  return out;
}

/** "AB12" → 27 (zero-based column index). */
export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSheetXml(xml: string, shared: string[]): Sheet {
  const rows: Sheet = [];
  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNum = Number(attr(rowMatch[1], 'r') ?? rows.length + 1);
    const row: string[] = [];
    for (const cell of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = cell[1];
      const body = cell[2] ?? '';
      const col = columnIndex(attr(tag, 'r') ?? '');
      const type = attr(tag, 't');
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = '';
      if (type === 's') value = v !== undefined ? (shared[Number(v)] ?? '') : '';
      else if (type === 'inlineStr') value = textOf(body);
      else if (type === 'b') value = v === '1' ? 'TRUE' : v === '0' ? 'FALSE' : '';
      else value = v !== undefined ? decodeXml(v) : '';
      while (row.length < col) row.push('');
      row[col] = value;
    }
    while (rows.length < rowNum - 1) rows.push([]);
    rows[rowNum - 1] = row;
  }
  return rows;
}

export async function readXlsx(buffer: ArrayBuffer): Promise<Workbook> {
  const files = await unzip(buffer);
  // Element prefixes vary by writer (`<x:sheet>` from some exporters, `<sheet>`
  // from Excel); drop them so one set of patterns reads both.
  const text = (path: string) => {
    const f = files.get(path);
    return f ? new TextDecoder().decode(f).replace(/<(\/?)[A-Za-z_][\w.-]*:/g, '<$1') : '';
  };

  const shared: string[] = [];
  for (const si of text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(si[1]));

  const rels = new Map<string, string>();
  for (const r of text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(r[0], 'Id');
    const target = attr(r[0], 'Target');
    if (id && target) rels.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }

  const book: Workbook = [];
  for (const s of text('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = attr(s[0], 'name') ?? `Sheet${book.length + 1}`;
    const rid = attr(s[0], 'r:id');
    const path = rid ? rels.get(rid) : undefined;
    if (!path || !files.has(path)) continue;
    book.push({ name, rows: parseSheetXml(text(path), shared) });
  }
  if (book.length === 0) throw new Error('No worksheets found in this file.');
  return book;
}

// ── csv ──────────────────────────────────────────────────────────────────────

/** RFC 4180: quoted fields, doubled quotes, embedded commas and newlines. */
export function parseCsv(input: string): Sheet {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: Sheet = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else if (ch === '\r' && text[i + 1] === '\n') {
        // A line break inside a quoted cell: keep one \n, whatever the file used.
        field += '\n';
        i++;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function toCsv(rows: (string | number | boolean)[][]): string {
  const cell = (v: string | number | boolean) => {
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** Excel's day serial (1900 date system) → ISO instant. Serial 25569 is 1970-01-01. */
export function excelSerialToIso(serial: number): string {
  return new Date(Math.round((serial - 25569) * 86_400_000)).toISOString();
}
