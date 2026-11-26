import { jsPDF } from 'jspdf';
import { Product, StoreCustomer, StoreOrder, StoreSettings } from '../types/store';
import { formatMoney } from './currency';

function safePdfText(value: string): string {
  return String(value || '')
    .replace(/[—–]/g, '-')
    .replace(/−/g, '-')
    .replace(/•/g, '·');
}

export function downloadOrderInvoicePdf(params: {
  order: StoreOrder;
  settings: StoreSettings;
  products: Product[];
  customers: StoreCustomer[];
}) {
  const { order, settings, products, customers } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const isPaid = order.status === 'Entregue';
  const productMap = new Map(products.map((p) => [p.id, p]));
  const matchedCustomer = customers.find(
    (c) =>
      (order.customerId && c.id === order.customerId) ||
      c.email.toLowerCase() === order.customerEmail.toLowerCase()
  );

  const itemsSubtotal = order.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const discountValue =
    typeof order.discountAmount === 'number'
      ? order.discountAmount
      : Math.max(0, itemsSubtotal - order.total);
  const shippingValue =
    typeof order.shippingFee === 'number'
      ? order.shippingFee
      : Math.max(0, order.total - (itemsSubtotal - discountValue));
  const paidAmount = isPaid ? order.total : 0;
  const dueAmount = isPaid ? 0 : order.total;

  const displayEmail = order.customerEmail.endsWith('@registo.local')
    ? 'Não informado (registo manual)'
    : order.customerEmail;

  const displayPhone =
    order.customerPhone && order.customerPhone !== '—'
      ? order.customerPhone
      : matchedCustomer?.phone || '-';

  const displayAddress = order.shippingAddress || matchedCustomer?.shippingAddress || '-';
  const displayCity = order.city || matchedCustomer?.city || '-';
  const displayPostal =
    order.postalCode && order.postalCode !== '—'
      ? order.postalCode
      : matchedCustomer?.postalCode || '-';

  let y = 16;

  // Header left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(114, 114, 110);
  doc.text('FACTURA / COMPROVATIVO DE ENCOMENDA', margin, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(28, 28, 30);
  doc.text(safePdfText(settings.storeName || 'Loja Online'), margin, y);

  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(85, 85, 82);
  const tagline = safePdfText(settings.storefrontConfig?.footer?.tagline || '');
  const taglineLines = tagline ? doc.splitTextToSize(tagline, 108) : [];
  if (taglineLines.length > 0) {
    doc.text(taglineLines, margin, y);
    y += taglineLines.length * 4.2;
  }

  const contactLine = [
    settings.supportEmail,
    settings.storefrontConfig?.footer?.locationText,
  ]
    .filter(Boolean)
    .map((s) => safePdfText(String(s)))
    .join(' · ');
  if (contactLine) {
    doc.setFontSize(8.5);
    doc.setTextColor(114, 114, 110);
    const contactLines = doc.splitTextToSize(contactLine, 108);
    doc.text(contactLines, margin, y);
    y += contactLines.length * 4;
  }

  // Header right invoice badge box
  const boxW = 62;
  const boxH = 26;
  const boxX = pageWidth - margin - boxW;
  const boxY = 14;
  doc.setFillColor(246, 246, 244);
  doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(114, 114, 110);
  doc.text('N.º da Factura', boxX + boxW - 4, boxY + 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 28, 30);
  doc.text(safePdfText(`FAC-${order.id}`), boxX + boxW - 4, boxY + 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(114, 114, 110);
  doc.text('Data de Registo', boxX + boxW - 4, boxY + 17.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 28, 30);
  doc.text(safePdfText(order.createdAt), boxX + boxW - 4, boxY + 22.5, { align: 'right' });

  y = Math.max(y + 4, boxY + boxH + 6);
  doc.setDrawColor(225, 225, 222);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Two-column metadata cards
  const colGap = 5;
  const colW = (contentWidth - colGap) / 2;

  const customerLines = [
    ...doc.splitTextToSize(safePdfText(order.customerName), colW - 8),
    ...doc.splitTextToSize(safePdfText(`Email: ${displayEmail}`), colW - 8),
    ...doc.splitTextToSize(safePdfText(`Telefone / WhatsApp: ${displayPhone}`), colW - 8),
    ...doc.splitTextToSize(safePdfText(`Morada: ${displayAddress}`), colW - 8),
    ...doc.splitTextToSize(
      safePdfText(
        `Cidade / Zona: ${displayCity}${displayPostal !== '-' ? ` · ${displayPostal}` : ''}`
      ),
      colW - 8
    ),
  ];

  const paymentLines = [
    ...doc.splitTextToSize(safePdfText(`Referência do Pedido: #${order.id}`), colW - 8),
    ...doc.splitTextToSize(safePdfText(`Método de Pagamento: ${order.paymentMethod}`), colW - 8),
    ...doc.splitTextToSize(safePdfText(`Estado da Encomenda: ${order.status}`), colW - 8),
    ...doc.splitTextToSize(
      safePdfText(
        `Situação Financeira: ${isPaid ? 'Pago e Contabilizado' : 'Pendente (Não contabilizado)'}`
      ),
      colW - 8
    ),
  ];

  const cardH = Math.max(customerLines.length, paymentLines.length) * 4.4 + 13;
  doc.setFillColor(246, 246, 244);
  doc.roundedRect(margin, y, colW, cardH, 3, 3, 'F');
  doc.roundedRect(margin + colW + colGap, y, colW, cardH, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(114, 114, 110);
  doc.text('DADOS DO CLIENTE', margin + 4, y + 6);
  doc.text('PAGAMENTO & ESTADO', margin + colW + colGap + 4, y + 6);

  let cy = y + 11.5;
  customerLines.forEach((line, index) => {
    doc.setFont('helvetica', index === 0 ? 'bold' : 'normal');
    doc.setFontSize(index === 0 ? 9.5 : 8.5);
    doc.setTextColor(index === 0 ? 28 : 85, index === 0 ? 28 : 85, index === 0 ? 30 : 82);
    doc.text(line, margin + 4, cy);
    cy += 4.4;
  });

  let py = y + 11.5;
  paymentLines.forEach((line, index) => {
    doc.setFont('helvetica', index === 3 ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    if (index === 3) {
      if (isPaid) {
        doc.setTextColor(4, 120, 87);
      } else {
        doc.setTextColor(180, 83, 9);
      }
    } else {
      doc.setTextColor(65, 65, 62);
    }
    doc.text(line, margin + colW + colGap + 4, py);
    py += 4.4;
  });

  y += cardH + 7;

  // Table header
  const colArtigoX = margin + 4;
  const colTamX = margin + 92;
  const colQtdX = margin + 122;
  const colUnitX = margin + 150;
  const colSubX = pageWidth - margin - 4;

  const drawTableHeader = (topY: number) => {
    doc.setFillColor(246, 246, 244);
    doc.roundedRect(margin, topY, contentWidth, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(114, 114, 110);
    doc.text('Artigo', colArtigoX, topY + 6);
    doc.text('Tamanho', colTamX, topY + 6);
    doc.text('Qtd', colQtdX, topY + 6, { align: 'right' });
    doc.text('Preço Unit.', colUnitX, topY + 6, { align: 'right' });
    doc.text('Subtotal', colSubX, topY + 6, { align: 'right' });
  };

  drawTableHeader(y);
  y += 12;

  order.items.forEach((item) => {
    const prod = item.productId ? productMap.get(item.productId) : undefined;
    const itemNameLines = doc.splitTextToSize(safePdfText(item.name), 80);
    const metaText = prod?.sku ? `SKU: ${prod.sku} · ${prod.category}` : 'Artigo registado';
    const rowHeight = itemNameLines.length * 4.2 + 6;

    if (y + rowHeight > pageHeight - 48) {
      doc.addPage();
      y = 18;
      drawTableHeader(y);
      y += 12;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(28, 28, 30);
    doc.text(itemNameLines, colArtigoX, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(114, 114, 110);
    doc.text(safePdfText(metaText), colArtigoX, y + itemNameLines.length * 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(85, 85, 82);
    doc.text(safePdfText(item.size || 'Único'), colTamX, y);
    doc.text(String(item.quantity), colQtdX, y, { align: 'right' });
    doc.text(
      safePdfText(formatMoney(item.unitPrice, settings.currencySymbol)),
      colUnitX,
      y,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 28, 30);
    doc.text(
      safePdfText(formatMoney(item.unitPrice * item.quantity, settings.currencySymbol)),
      colSubX,
      y,
      { align: 'right' }
    );

    y += rowHeight + 2;
    doc.setDrawColor(238, 238, 235);
    doc.line(margin, y - 1, pageWidth - margin, y - 1);
    y += 3;
  });

  if (y > pageHeight - 52) {
    doc.addPage();
    y = 20;
  }

  y += 3;

  // Totals summary box & note
  const noteWidth = 86;
  const noteText = isPaid
    ? 'Esta encomenda encontra-se marcada como Entregue e o respetivo valor está refletido no faturamento da loja.'
    : 'Encomenda com estado Pendente: nenhum valor é contabilizado como pago no faturamento até ser marcada como Entregue.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(114, 114, 110);
  doc.text(doc.splitTextToSize(safePdfText(noteText), noteWidth), margin, y + 6);

  const sumW = 76;
  const sumX = pageWidth - margin - sumW;
  const sumRows = 4 + (discountValue > 0 ? 1 : 0) + (dueAmount > 0 ? 1 : 0);
  const sumH = sumRows * 6.5 + 10;

  doc.setFillColor(246, 246, 244);
  doc.roundedRect(sumX, y, sumW, sumH, 3, 3, 'F');

  let sy = y + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(85, 85, 82);
  doc.text('Subtotal dos Artigos', sumX + 4, sy);
  doc.text(safePdfText(formatMoney(itemsSubtotal, settings.currencySymbol)), sumX + sumW - 4, sy, {
    align: 'right',
  });
  sy += 6;

  if (discountValue > 0) {
    doc.setTextColor(4, 120, 87);
    doc.text(
      safePdfText(order.promoCode ? `Desconto (${order.promoCode})` : 'Desconto Aplicado'),
      sumX + 4,
      sy
    );
    doc.text(
      safePdfText(`-${formatMoney(discountValue, settings.currencySymbol)}`),
      sumX + sumW - 4,
      sy,
      { align: 'right' }
    );
    sy += 6;
  }

  doc.setTextColor(85, 85, 82);
  doc.text('Taxa de Entrega', sumX + 4, sy);
  doc.text(
    safePdfText(shippingValue > 0 ? formatMoney(shippingValue, settings.currencySymbol) : 'Gratis'),
    sumX + sumW - 4,
    sy,
    { align: 'right' }
  );
  sy += 6;

  doc.setDrawColor(218, 218, 214);
  doc.line(sumX + 4, sy - 2, sumX + sumW - 4, sy - 2);
  sy += 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 28, 30);
  doc.text('Total da Factura', sumX + 4, sy);
  doc.text(safePdfText(formatMoney(order.total, settings.currencySymbol)), sumX + sumW - 4, sy, {
    align: 'right',
  });
  sy += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(114, 114, 110);
  doc.text('Valor Pago', sumX + 4, sy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isPaid ? 4 : 114, isPaid ? 120 : 114, isPaid ? 87 : 110);
  doc.text(safePdfText(formatMoney(paidAmount, settings.currencySymbol)), sumX + sumW - 4, sy, {
    align: 'right',
  });

  if (dueAmount > 0) {
    sy += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('Pendente por Pagar', sumX + 4, sy);
    doc.text(safePdfText(formatMoney(dueAmount, settings.currencySymbol)), sumX + sumW - 4, sy, {
      align: 'right',
    });
  }

  const footerNote = [
    settings.storeName,
    settings.storefrontConfig?.footer?.copyrightText,
  ]
    .filter(Boolean)
    .map((s) => safePdfText(String(s)))
    .join(' · ');
  if (footerNote) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 136);
    doc.text(footerNote, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  doc.save(`Fatura-${order.id}.pdf`);
}
