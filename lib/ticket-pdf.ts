import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { formatCurrency } from '@/lib/currency';
import type { TicketPdfDetails } from '@/lib/ticket-details';
import { buildTicketQrVerifyUrl } from '@/lib/ticket-signature';

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function buildTicketPdfBuffer(details: TicketPdfDetails): Promise<Uint8Array> {
  const verifyUrl = buildTicketQrVerifyUrl(details.bookingId, details.bookingCode);
  const qrPng = await QRCode.toBuffer(verifyUrl, { type: 'png', width: 200, margin: 1 });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 595]);
  const { width, height } = page.getSize();
  const margin = 40;
  const bodyWidth = width - margin * 2;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const qrImage = await pdfDoc.embedPng(qrPng);

  let y = height - margin;

  page.drawText('AweTravel', {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.35),
  });
  y -= 28;
  page.drawText('Boarding pass', {
    x: margin,
    y,
    size: 11,
    font,
    color: rgb(0.35, 0.35, 0.4),
  });
  y -= 22;

  const qrSize = 132;
  page.drawImage(qrImage, {
    x: width - margin - qrSize,
    y: y - qrSize + 14,
    width: qrSize,
    height: qrSize,
  });

  page.drawText(`Booking ${details.bookingCode}`, {
    x: margin,
    y,
    size: 13,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 20;
  page.drawText('Scan the QR code for verification.', {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.45),
  });
  y -= 28;

  const rows: [string, string][] = [
    ['Passenger', details.passengerName],
    ['Route', details.routeLabel],
    ['Travel date', details.travelDate],
    ['Departure', details.departureTime],
    ['Seat', details.seatCode],
    ['Operator', details.companyName ?? '—'],
    ['Fare', formatCurrency(details.amountMinor)],
  ];

  for (const [label, value] of rows) {
    page.drawText(label, {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.45, 0.45, 0.5),
    });
    y -= 12;
    const lines = wrapText(String(value), Math.floor(bodyWidth / 5.2));
    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.05, 0.05, 0.08),
      });
      y -= 14;
    }
    y -= 6;
  }

  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.88),
  });
  y -= 18;
  const foot = wrapText('Present this ticket (digital or printed) to the operator. Valid only for the trip above.', 58);
  for (const line of foot) {
    page.drawText(line, {
      x: margin,
      y,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.5),
    });
    y -= 11;
  }

  const bytes = await pdfDoc.save();
  return bytes;
}
