const PDFDocument = require('pdfkit');
const { normalizeDecimal } = require('../utils/money');
const { lineTotals } = require('../utils/calculate');

const COLOR = {
  ink: '#111827',
  body: '#374151',
  soft: '#6B7280',
  faint: '#9CA3AF',
  surface: '#F3F4F6',
  line: '#E5E7EB',
  onInk: '#FFFFFF',
  onInkSoft: '#CBD5E1',
};

const FONT = 'Helvetica';
const LEFT = 48;
const RIGHT = 547;
const CONTENT_W = RIGHT - LEFT;
const FOOTER_H = 94;
const fmtMoney = (n) => `Rs. ${Number(n).toFixed(2)}`;

const TWO_GROUPS = 2;

const COL = {
  sn: { x: LEFT + 8, w: 24, align: 'left' },
  item: { x: LEFT + 34, w: 210, align: 'left' },
  qty: { x: 300, w: 58, align: 'right' },
  price: { x: 366, w: 84, align: 'right' },
  amt: { x: 458, w: 81, align: 'right' },
};

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function two(num) {
  if (num < 20) return ONES[num];
  return (TENS[Math.floor(num / 10)] + (num % 10 ? ` ${ONES[num % 10]}` : '')).trim();
}

function three(num) {
  const h = Math.floor(num / 100);
  const r = num % 100;
  let s = two(r);
  if (h) s = (s ? `${two(h)} Hundred ${s}` : `${two(h)} Hundred`);
  return s;
}

function inrWords(num) {
  if (num === undefined || num === null) return '';
  let rupees = Math.floor(num);
  let paise = Math.round((num - rupees) * 100);
  if (paise === 100) { rupees += 1; paise = 0; }
  let n = rupees;
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const parts = [];
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  let words = parts.length ? `${parts.join(' ')} Rupees` : 'Zero Rupees';
  if (paise) words += ` and ${two(paise)} Paise`;
  return `${words} Only`;
}

function rightText(doc, text, y, width = 140, x = 320) {
  doc.text(text, x, y, { width, align: 'right' });
}

function cell(doc, col, text, y, opts = {}) {
  doc.text(String(text), col.x, y, { width: col.w, align: col.align, ...opts });
}

function drawLetterhead(doc) {
  const W = doc.page.width;
  doc.rect(0, 0, W, 96).fill(COLOR.ink);

  doc.font(FONT).fontSize(21).fillColor(COLOR.onInk).text('ZENITEK INDUSTRIES', LEFT, 32);
  doc.font(FONT).fontSize(8).fillColor(COLOR.onInkSoft).text('Precision Engineering & Industrial Automation', LEFT, 56);

  const contactLines = [
    'Plot 42, MIDC Industrial Estate',
    'Pune - 411026, Maharashtra, India',
    `Ph: +91 98220 12345   |   GSTIN: 27ABCDE1234F1Z5`,
  ];
  doc.font(FONT).fontSize(7.5).fillColor(COLOR.onInkSoft);
  contactLines.forEach((line, i) => {
    doc.text(line, RIGHT - 250, 30 + i * 13, { width: 250, align: 'right' });
  });

  doc.rect(0, 96, W, 4).fill('#4B5563');
}

function drawMeta(doc, quotation, startY) {
  const boxH = 48;
  doc.roundedRect(LEFT, startY, CONTENT_W, boxH, 8).fill(COLOR.surface);

  const cols = [
    { label: 'Quotation No', value: quotation.quotationNumber },
    { label: 'Date', value: new Date(quotation.createdAt).toLocaleDateString('en-IN') },
    { label: 'Valid Until', value: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-IN') : '-' },
    { label: 'Enquiry Ref', value: quotation.enquiry?.enquiryNumber || '-' },
  ];
  const colW = CONTENT_W / cols.length;
  cols.forEach((c, i) => {
    const x = LEFT + 12 + i * colW;
    doc.font(FONT).fontSize(6.5).fillColor(COLOR.soft).text(c.label.toUpperCase(), x, startY + 10, { width: colW - 12, characterSpacing: 0.5 });
    doc.font(FONT).fontSize(9.5).fillColor(COLOR.ink).text(c.value, x, startY + 23, { width: colW - 12 });
  });
  return startY + boxH;
}

function drawBillTo(doc, quotation, y) {
  doc.font(FONT).fontSize(7).fillColor(COLOR.soft).text('BILL TO'.toUpperCase(), LEFT, y, { characterSpacing: 1 });
  y += 13;

  const name = quotation.customer.companyName;
  const nameH = doc.font(FONT).fontSize(12).heightOfString(name, { width: CONTENT_W - 16 });
  doc.rect(LEFT, y, 3, Math.max(40, nameH + 34)).fill(COLOR.ink);

  doc.font(FONT).fontSize(12).fillColor(COLOR.ink).text(name, LEFT + 12, y, { width: CONTENT_W - 18 });
  let ly = y + nameH + 4;
  doc.font(FONT).fontSize(9).fillColor(COLOR.body);
  const detailLines = [
    `${quotation.customer.contactPerson || '-'}  |  ${quotation.customer.mobile || '-'}`,
    quotation.customer.email,
    quotation.customer.city,
  ].filter(Boolean);
  detailLines.forEach((line) => {
    doc.text(line, LEFT + 12, ly, { width: CONTENT_W - 18 });
    ly += 12;
  });
  return Math.max(y + nameH + 4 + detailLines.length * 12, y + 40) + 6;
}

function drawTableHeader(doc, y) {
  const headerH = 24;
  doc.rect(LEFT, y, CONTENT_W, headerH).fill(COLOR.ink);
  doc.font(FONT).fontSize(7.5).fillColor(COLOR.onInk);
  const labels = [
    { col: COL.sn, text: '#' },
    { col: COL.item, text: 'ITEM' },
    { col: COL.qty, text: 'QTY' },
    { col: COL.price, text: 'UNIT PRICE' },
    { col: COL.amt, text: 'AMOUNT' },
  ];
  labels.forEach(({ col, text }) => {
    doc.text(text, col.x, y + 8, { width: col.w, align: col.align, characterSpacing: 0.6 });
  });
  return y + headerH;
}

function buildInvoicePDF(quotation) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: LEFT, autoFirstPage: true });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      drawLetterhead(doc);

      // Title
      doc.font(FONT).fontSize(23).fillColor(COLOR.ink).text('QUOTATION', LEFT, 122);
      let y = drawMeta(doc, quotation, 150);

      // Bill to
      y = drawBillTo(doc, quotation, y + 6) + 12;

      const ensureSpace = (h) => {
        if (y + h > doc.page.height - FOOTER_H) {
          doc.addPage();
          y = 50;
          return true;
        }
        return false;
      };

      let pageCount = 1;
      const drawPageFooter = () => {
        const fy = doc.page.height - 74;
        doc.moveTo(LEFT, fy - 14).lineTo(RIGHT, fy - 14).strokeColor(COLOR.line).lineWidth(0.6).stroke();
        doc.font(FONT).fontSize(7).fillColor(COLOR.faint);
        doc.text('Zenitek Industries \u00b7 GSTIN 27ABCDE1234F1Z5 \u00b7 Ph +91 98220 12345', LEFT, fy, { width: 380, lineBreak: false });
        doc.text(`Generated by Zenitek ERP \u00b7 ${new Date().toLocaleString('en-IN')}`, LEFT, fy + 10, { width: 380, lineBreak: false });
        doc.text(`Page ${pageCount}`, RIGHT - 90, fy, { width: 90, align: 'right', lineBreak: false });
      };

      doc.on('pageAdded', () => {
        pageCount += 1;
        drawPageFooter();
      });
      drawPageFooter();

      //----- Items table
      let subtotal = 0;
      let netSum = 0;
      const rows = quotation.items.map((it) => {
        const t = lineTotals(it.qty, it.unitPrice, Number(quotation.discountPct), Number(quotation.gstPct));
        subtotal = normalizeDecimal(subtotal + t.lineAmount);
        netSum = normalizeDecimal(netSum + t.netAmount);
        return { it, t };
      });
      const discountAmt = normalizeDecimal(subtotal - netSum);
      const gstAmt = normalizeDecimal(quotation.grandTotal - netSum);

      ensureSpace(150);
      y = drawTableHeader(doc, y);

      rows.forEach(({ it }, i) => {
        doc.font(FONT).fontSize(9);
        const nameH = Math.ceil(doc.heightOfString(it.product.name, { width: COL.item.w }));
        const rowH = Math.max(24, nameH + 22);

        if (ensureSpace(rowH)) y = drawTableHeader(doc, y);

        if (i % TWO_GROUPS === 0) {
          doc.rect(LEFT, y, CONTENT_W, rowH).fill('#FAFAFA');
        }

        const nameY = y + 7;
        doc.font(FONT).fontSize(9).fillColor(COLOR.ink).text(it.product.name, COL.item.x, nameY, { width: COL.item.w });
        doc.font(FONT).fontSize(7.5).fillColor(COLOR.soft).text(it.product.code, COL.item.x, nameY + nameH + 2, { width: COL.item.w });

        const numY = y + Math.max(8, (rowH - 12) / 2);
        doc.font(FONT).fontSize(9).fillColor(COLOR.body);
        cell(doc, COL.sn, i + 1, y + 7, {});
        cell(doc, COL.qty, `${it.qty} ${it.product.unit}`, numY);
        cell(doc, COL.price, fmtMoney(it.unitPrice), numY);
        doc.font(FONT).fontSize(9).fillColor(COLOR.ink).text(fmtMoney(it.lineAmount), COL.amt.x, numY, { width: COL.amt.w, align: COL.amt.align });
        y += rowH;
      });

      doc.moveTo(LEFT, y + 1).lineTo(RIGHT, y + 1).strokeColor(COLOR.line).lineWidth(0.6).stroke();
      y += 12;

      //----- Totals
      ensureSpace(104);
      rightText(doc, 'Subtotal', y);
      doc.font(FONT).fontSize(9.5).fillColor(COLOR.body).text(fmtMoney(subtotal), 460, y, { width: 87, align: 'right' });
      y += 16;
      rightText(doc, `Discount (${quotation.discountPct}%)`, y);
      doc.font(FONT).fontSize(9.5).fillColor(COLOR.body).text(`- ${fmtMoney(discountAmt)}`, 460, y, { width: 87, align: 'right' });
      y += 16;
      rightText(doc, `GST (${quotation.gstPct}%)`, y);
      doc.font(FONT).fontSize(9.5).fillColor(COLOR.body).text(`+ ${fmtMoney(gstAmt)}`, 460, y, { width: 87, align: 'right' });
      y += 24;

      doc.roundedRect(LEFT, y, CONTENT_W, 34, 8).fill(COLOR.ink);
      doc.font(FONT).fontSize(10).fillColor(COLOR.onInk).text('GRAND TOTAL', LEFT + 14, y + 11);
      doc.font(FONT).fontSize(14).fillColor(COLOR.onInk).text(fmtMoney(quotation.grandTotal), RIGHT - 14 - 220, y + 8, { width: 220, align: 'right' });
      y += 46;

      // Amount in words
      ensureSpace(30);
      doc.font(FONT).fontSize(9).fillColor(COLOR.ink).text(`Amount in words: ${inrWords(quotation.grandTotal)}`, LEFT, y, { width: CONTENT_W });
      y += 24;

      //----- Terms
      ensureSpace(92);
      doc.font(FONT).fontSize(7).fillColor(COLOR.soft).text('TERMS & CONDITIONS'.toUpperCase(), LEFT, y, { characterSpacing: 1 });
      y += 12;
      const termsBoxH = 74;
      doc.roundedRect(LEFT, y, CONTENT_W, termsBoxH, 8).fill(COLOR.surface);
      const terms = [
        'Quotation is valid until the validity date mentioned above.',
        'Prices are exclusive of transportation charges. GST at the shown rate applies.',
        'Payment terms: 50% advance, balance before dispatch.',
        'All goods are subject to our standard quality and warranty norms.',
        'This is a computer-generated quotation and does not require a signature.',
      ];
      doc.font(FONT).fontSize(8.5).fillColor(COLOR.body);
      terms.forEach((t, i) => {
        doc.text(`${i + 1}. ${t}`, LEFT + 12, y + 10 + i * 12, { width: CONTENT_W - 24 });
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildInvoicePDF };