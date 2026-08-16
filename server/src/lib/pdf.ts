import PDFDocument from 'pdfkit';

export interface MemoLine {
  label: string;
  value: string;
}

export interface MemoPayload {
  title: string;
  assumptions: MemoLine[];
  lines: MemoLine[];
  notes?: string[];
}

export function renderMemoPdf(memo: MemoPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(memo.title, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#666').text(`Generated ${new Date().toLocaleString('en-US')} — internal draft, not a legal, tax, or investment document.`);
    doc.moveDown(1);

    const section = (heading: string, items: MemoLine[]) => {
      doc.fontSize(12).fillColor('#111').text(heading, { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#333');
      for (const item of items) {
        doc.text(`${item.label}:  ${item.value}`);
      }
      doc.moveDown(0.8);
    };

    section('Assumptions', memo.assumptions);
    section('Summary', memo.lines);

    if (memo.notes && memo.notes.length) {
      doc.fontSize(12).fillColor('#111').text('Notes', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#333');
      for (const n of memo.notes) doc.text(`•  ${n}`);
    }

    doc.end();
  });
}
