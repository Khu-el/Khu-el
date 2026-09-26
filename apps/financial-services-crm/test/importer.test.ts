/**
 * Import: reading .xlsx/.csv, mapping columns, and the upsert rules from the
 * workbook's Compliance Notes (neutral import, match on Google Resource Name,
 * never merge on a name, never overwrite a human classification, never delete).
 *
 * Every fixture is synthetic. Real contact exports never belong in this public repo.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { contactsToRows, parseContacts, planImport, toDayString } from '../src/importer.ts';
import { columnIndex, decodeXml, parseCsv, readXlsx, toCsv } from '../src/sheets.ts';
import { emptyContact } from '../src/defaults.ts';

// ── a minimal zip writer, for building .xlsx fixtures ────────────────────────

function zip(entries: { name: string; text: string; deflate?: boolean }[]): ArrayBuffer {
  const enc = new TextEncoder();
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(enc.encode(e.name));
    const raw = Buffer.from(enc.encode(e.text));
    const data = e.deflate ? deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(e.deflate ? 8 : 0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(e.deflate ? 8 : 0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  const buf = Buffer.concat([...locals, cd, eocd]);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** A workbook shaped like the real one: title rows, header on row 4, namespaced XML, a shared-string table. */
function workbook(prefix: string, deflate: boolean) {
  const p = prefix ? `${prefix}:` : '';
  const ns = prefix ? ` xmlns:${prefix}="http://schemas.openxmlformats.org/spreadsheetml/2006/main"` : ' xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const strings = ['THE CRM', 'Contact ID', 'Contact', 'Primary Email', 'Primary Phone', 'Operational Lane', 'Consent Status', 'Google Resource Name', 'Notes', 'Ada Example', 'ada@example.test', 'Unqualified', 'Not Established', 'people/c1', 'Bo &amp; Co', 'Recruiting', 'Do Not Contact', 'people/c2', 'Knighted by Queen', 'FS-0001', 'FS-0002'];
  const sst = `<${p}sst${ns}>${strings.map((s) => `<${p}si><${p}t>${s}</${p}t></${p}si>`).join('')}</${p}sst>`;
  const c = (r: string, s: number) => `<${p}c r="${r}" t="s"><${p}v>${s}</${p}v></${p}c>`;
  const sheet = `<${p}worksheet${ns}><${p}sheetData>
    <${p}row r="1">${c('A1', 0)}</${p}row>
    <${p}row r="4">${c('A4', 1)}${c('B4', 2)}${c('C4', 3)}${c('D4', 4)}${c('E4', 5)}${c('F4', 6)}${c('G4', 7)}${c('H4', 8)}<${p}c r="I4" t="inlineStr"><${p}is><${p}t>Sensitive Data Present</${p}t></${p}is></${p}c></${p}row>
    <${p}row r="5">${c('A5', 19)}${c('B5', 9)}${c('C5', 10)}<${p}c r="D5" t="str"><${p}v>+1 (404) 555-0100</${p}v></${p}c>${c('E5', 11)}${c('F5', 12)}${c('G5', 13)}<${p}c r="I5" t="b"><${p}v>0</${p}v></${p}c></${p}row>
    <${p}row r="6">${c('A6', 20)}${c('B6', 14)}${c('E6', 15)}${c('F6', 16)}${c('G6', 17)}<${p}c r="H6" t="inlineStr"><${p}is><${p}t>SSN 123-45-6789</${p}t></${p}is></${p}c><${p}c r="D6"><${p}v>4045550199</${p}v></${p}c></${p}row>
    <${p}row r="7"><${p}c r="A7"><${p}f>=1+1</${p}f></${p}c></${p}row>
  </${p}sheetData></${p}worksheet>`;
  const wb = `<${p}workbook${ns}><${p}sheets><${p}sheet name="Lists" sheetId="1" r:id="rId9" xmlns:r="x"/><${p}sheet name="CRM Contact Master" sheetId="2" r:id="rId2" xmlns:r="x"/></${p}sheets></${p}workbook>`;
  const rels = `<Relationships><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/><Relationship Target="worksheets/sheet1.xml" Id="rId9"/></Relationships>`;
  const lists = `<${p}worksheet${ns}><${p}sheetData><${p}row r="1"><${p}c r="A1" t="inlineStr"><${p}is><${p}t>Lane</${p}t></${p}is></${p}c></${p}row></${p}sheetData></${p}worksheet>`;
  return zip([
    { name: 'xl/workbook.xml', text: wb, deflate },
    { name: 'xl/_rels/workbook.xml.rels', text: rels, deflate },
    { name: 'xl/sharedStrings.xml', text: sst, deflate },
    { name: 'xl/worksheets/sheet1.xml', text: lists, deflate },
    { name: 'xl/worksheets/sheet2.xml', text: sheet, deflate },
  ]);
}

describe('reading .xlsx', () => {
  for (const [label, prefix, deflate] of [
    ['namespaced, deflated (the source workbook’s shape)', 'x', true],
    ['unprefixed, stored', '', false],
  ] as const) {
    test(label, async () => {
      const book = await readXlsx(workbook(prefix, deflate));
      assert.deepEqual(
        book.map((s) => s.name),
        ['Lists', 'CRM Contact Master']
      );
      const master = book[1].rows;
      assert.equal(master[0][0], 'THE CRM');
      assert.equal(master[3][1], 'Contact');
      assert.equal(master[4][3], '+1 (404) 555-0100');
      assert.equal(master[5][1], 'Bo & Co', 'entities are decoded');
      assert.equal(master[4][8], 'FALSE', 'booleans read as TRUE/FALSE');
    });
  }

  test('a file that is not a zip says so', async () => {
    await assert.rejects(readXlsx(new TextEncoder().encode('Name,Email\n').buffer as ArrayBuffer), /Not a zip/);
  });

  test('column letters', () => {
    assert.equal(columnIndex('A1'), 0);
    assert.equal(columnIndex('Z9'), 25);
    assert.equal(columnIndex('AA10'), 26);
    assert.equal(columnIndex('AT4'), 45);
  });

  test('xml entities', () => {
    assert.equal(decodeXml('a &amp; b &lt;c&gt; &#8217; &#x2014;'), 'a & b <c> ’ —');
  });
});

describe('mapping the CRM Contact Master sheet', () => {
  test('finds the header below the title rows and maps known columns', async () => {
    const parsed = parseContacts(await readXlsx(workbook('x', true)));
    assert.equal(parsed.sheetName, 'CRM Contact Master', 'the contact sheet is chosen by name, not position');
    assert.equal(parsed.headerRow, 4);
    assert.equal(parsed.contacts.length, 2, 'the formula-only row is skipped');
    const [ada, bo] = parsed.contacts;
    assert.equal(ada.displayName, 'Ada Example');
    assert.equal(ada.contactId, 'FS-0001');
    assert.equal(ada.googleResourceName, 'people/c1');
    assert.equal(ada.allPhones, ada.primaryPhone, 'all-phones falls back to the primary');
    assert.equal(bo.operationalLane, 'Recruiting', 'a valid classification in the file is kept');
    assert.equal(bo.consentStatus, 'Do Not Contact');
  });

  test('notes that look like regulated data flag the contact rather than being imported silently', async () => {
    const parsed = parseContacts(await readXlsx(workbook('x', true)));
    assert.equal(parsed.contacts[1].sensitiveDataPresent, true);
    assert.equal(parsed.flaggedSensitive, 1);
  });
});

describe('Google Contacts CSV', () => {
  const csv = [
    'First Name,Middle Name,Last Name,E-mail 1 - Value,E-mail 2 - Value,Phone 1 - Value,Organization Name,Organization Title,Notes,Operational Lane',
    'Cy,,Sample,cy@example.test,cy2@example.test,770-555-0101,"Acme, Inc.",Manager,"Line one',
    'line two",Licensed Prospect Plus',
    ',,,,,,,,,',
    'Di,,,,,,,,,',
  ].join('\r\n');

  test('maps Google’s column names, quoted commas and multi-line notes', () => {
    const parsed = parseContacts([{ name: 'contacts.csv', rows: parseCsv(csv) }]);
    assert.equal(parsed.contacts.length, 2);
    const cy = parsed.contacts[0];
    assert.equal(cy.displayName, 'Cy Sample', 'display name is built from first + last');
    assert.equal(cy.primaryEmail, 'cy@example.test', 'the first email column wins');
    assert.equal(cy.company, 'Acme, Inc.');
    assert.equal(cy.notes, 'Line one\nline two');
    assert.equal(cy.source, 'Google Contacts');
  });

  test('a value off the list falls back to the neutral default and is counted', () => {
    const parsed = parseContacts([{ name: 'contacts.csv', rows: parseCsv(csv) }]);
    assert.equal(parsed.contacts[0].operationalLane, 'Unqualified');
    assert.equal(parsed.unrecognizedValues, 1);
  });

  test('a file with no recognizable header is refused', () => {
    assert.throws(() => parseContacts([{ name: 'x.csv', rows: parseCsv('foo,bar\n1,2\n') }]), /No sheet/);
  });
});

describe('dates from a spreadsheet', () => {
  test('ISO, US and Excel serial dates become YYYY-MM-DD; anything else is kept as typed', () => {
    assert.equal(toDayString('2026-10-01'), '2026-10-01');
    assert.equal(toDayString('2026-10-01T09:00:00Z'), '2026-10-01');
    assert.equal(toDayString('10/1/2026'), '2026-10-01');
    assert.equal(toDayString('46296'), '2026-10-01');
    assert.equal(toDayString('next Tuesday'), 'next Tuesday', 'not guessed; followUpState reports it unreadable');
    assert.equal(toDayString('12'), '12');
  });
});

describe('import plan', () => {
  const contact = (over: Partial<ReturnType<typeof emptyContact>>) => ({ ...emptyContact(), ...over });

  test('a first import creates everything, neutral', () => {
    const plan = planImport([], [contact({ displayName: 'A', googleResourceName: 'people/1' }), contact({ displayName: 'B' })]);
    assert.equal(plan.creates.length, 2);
    assert.deepEqual(
      plan.creates.map((c) => c.contactId),
      ['FS-0001', 'FS-0002']
    );
    assert.equal(plan.creates[0].consentStatus, 'Not Established');
  });

  test('re-importing the same file changes nothing', () => {
    const rows = [contact({ displayName: 'A', googleResourceName: 'people/1', primaryPhone: '1' })];
    const first = planImport([], rows);
    const again = planImport(first.creates.map((data, i) => ({ id: `r${i}`, data })), rows);
    assert.equal(again.creates.length, 0);
    assert.equal(again.updates.length, 0);
    assert.equal(again.unchanged, 1);
  });

  test('a re-import refreshes identity and never overwrites what a human set', () => {
    const existing = [
      {
        id: 'r1',
        data: contact({
          contactId: 'FS-0007',
          displayName: 'Ann Old',
          googleResourceName: 'people/1',
          primaryPhone: '111',
          operationalLane: 'Recruiting',
          opportunityInterest: 'Interested',
          consentStatus: 'Do Not Contact',
          notes: 'Asked not to be called.',
          nextFollowUp: '2026-10-01',
        }),
      },
    ];
    const incoming = [contact({ displayName: 'Ann New', googleResourceName: 'people/1', primaryPhone: '222', operationalLane: 'Unqualified', consentStatus: 'Not Established' })];
    const plan = planImport(existing, incoming);
    assert.equal(plan.updates.length, 1);
    const u = plan.updates[0].data;
    assert.equal(u.displayName, 'Ann New');
    assert.equal(u.primaryPhone, '222');
    assert.equal(u.consentStatus, 'Do Not Contact', 'a Do Not Contact must survive any re-import');
    assert.equal(u.operationalLane, 'Recruiting');
    assert.equal(u.notes, 'Asked not to be called.');
    assert.equal(u.nextFollowUp, '2026-10-01');
    assert.equal(u.contactId, 'FS-0007');
    assert.deepEqual(plan.updates[0].changed.sort(), ['displayName', 'primaryPhone']);
  });

  test('a blank cell in the file does not erase an identity field', () => {
    const existing = [{ id: 'r1', data: contact({ displayName: 'A', googleResourceName: 'people/1', primaryEmail: 'a@example.test' }) }];
    const plan = planImport(existing, [contact({ displayName: 'A', googleResourceName: 'people/1', primaryEmail: '' })]);
    assert.equal(plan.unchanged, 1);
  });

  test('the same name is never enough to merge', () => {
    const existing = [{ id: 'r1', data: contact({ contactId: 'FS-0001', displayName: 'Chris Lee', primaryPhone: '111' }) }];
    const plan = planImport(existing, [contact({ displayName: 'Chris Lee', primaryPhone: '999' })]);
    assert.equal(plan.creates.length, 1, 'a second Chris Lee is a new contact; the duplicate check puts it in front of a human');
    assert.equal(plan.creates[0].contactId, 'FS-0002');
  });

  test('a Contact ID matches only when the name agrees and neither side has a Google key', () => {
    const existing = [{ id: 'r1', data: contact({ contactId: 'FS-0001', displayName: 'Chris Lee', primaryPhone: '111' }) }];
    assert.equal(planImport(existing, [contact({ contactId: 'FS-0001', displayName: 'Chris Lee', primaryPhone: '222' })]).updates.length, 1);
    const other = planImport(existing, [contact({ contactId: 'FS-0001', displayName: 'Pat Doe' })]);
    assert.equal(other.updates.length, 0);
    assert.equal(other.creates[0].contactId, 'FS-0002', 'a colliding ID is reassigned, not reused');
  });

  test('a resource name repeated within one file is imported once', () => {
    const plan = planImport([], [contact({ displayName: 'A', googleResourceName: 'people/1' }), contact({ displayName: 'A again', googleResourceName: 'people/1' })]);
    assert.equal(plan.creates.length, 1);
    assert.equal(plan.repeatedInFile, 1);
  });

  test('nothing is ever deleted: contacts missing from the file are simply not mentioned', () => {
    const existing = [{ id: 'r1', data: contact({ displayName: 'Kept', googleResourceName: 'people/9' }) }];
    const plan = planImport(existing, []);
    assert.deepEqual(plan, { creates: [], updates: [], unchanged: 0, repeatedInFile: 0 });
  });
});

describe('export round trip', () => {
  test('an exported CSV re-imports to the same contacts with no changes', () => {
    const rows = [
      { ...emptyContact(), contactId: 'FS-0001', displayName: 'Ada, "the first"', googleResourceName: 'people/1', primaryPhone: '4045550100', allPhones: '4045550100', operationalLane: 'General Network' as const, notes: 'two\nlines', macho: { m: 'Y', a: 'N', c: '', h: '', o: 'Y' } as const },
    ];
    const csv = toCsv(contactsToRows(rows));
    const parsed = parseContacts([{ name: 'export.csv', rows: parseCsv(csv) }]);
    assert.equal(parsed.contacts.length, 1);
    const back = parsed.contacts[0];
    assert.equal(back.displayName, 'Ada, "the first"');
    assert.equal(back.notes, 'two\nlines');
    assert.equal(back.operationalLane, 'General Network');
    assert.deepEqual(back.macho, { m: 'Y', a: 'N', c: '', h: '', o: 'Y' });
    assert.equal(planImport([{ id: 'r1', data: rows[0] }], parsed.contacts).unchanged, 1);
  });
});
