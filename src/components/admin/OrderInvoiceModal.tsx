import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clock, Download, Printer, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus, StoreOrder } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { downloadOrderInvoicePdf } from '../../utils/invoicePdf';

interface OrderInvoiceModalProps {
  order: StoreOrder | null;
  onClose: () => void;
  onChangeStatus?: (orderId: string, nextStatus: OrderStatus) => void;
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({
  order,
  onClose,
  onChangeStatus,
}) => {
  const { settings, products, customers } = useStore();

  if (!order) return null;

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
      : matchedCustomer?.phone || '—';

  const displayAddress = order.shippingAddress || matchedCustomer?.shippingAddress || '—';
  const displayCity = order.city || matchedCustomer?.city || '—';
  const displayPostal =
    order.postalCode && order.postalCode !== '—'
      ? order.postalCode
      : matchedCustomer?.postalCode || '—';

  const handleDownloadPdf = () => {
    downloadOrderInvoicePdf({
      order,
      settings,
      products,
      customers,
    });
  };

  const modalNode = (
    <div
      id="printable-invoice-overlay"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white"
      onClick={onClose}
    >
      <div
        id="printable-invoice-sheet"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-[24px] shadow-2xl border border-black/10 max-h-[92vh] overflow-y-auto print:shadow-none print:border-none print:max-h-none print:rounded-none"
      >
        {/* Top Modal Action Bar (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-black/8 bg-[#F6F6F4] rounded-t-[24px] print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-[#1C1C1E]">
              FACTURA #{order.id}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isPaid ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Entregue · Pago</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  <span>{order.status} · Não Pago</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onChangeStatus && (
              <button
                type="button"
                onClick={() =>
                  onChangeStatus(order.id, isPaid ? 'Pendente' : 'Entregue')
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                  isPaid
                    ? 'bg-white border border-black/15 text-[#1C1C1E] hover:bg-black/5'
                    : 'bg-[#1C1C1E] text-white hover:bg-[#323235]'
                }`}
              >
                {isPaid ? 'Mudar para Pendente' : 'Aprovar Pedido (Entregue · Pago)'}
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1C1E] text-white text-xs font-medium hover:bg-[#323235] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Guardar PDF</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-black/15 text-xs font-medium text-[#1C1C1E] hover:bg-black/5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar factura"
              className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4 text-[#1C1C1E]" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Content */}
        <div className="p-6 sm:p-8 space-y-6 text-[#1C1C1E]">
          {/* Issuer & Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-black/10">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#72726E] font-medium">
                Factura / Comprovativo de Encomenda
              </p>
              <h2 className="text-2xl font-display font-semibold tracking-tight text-[#1C1C1E]">
                {settings.storeName}
              </h2>
              <p className="text-xs text-[#555552] max-w-sm">
                {settings.storefrontConfig.footer.tagline}
              </p>
              <p className="text-xs text-[#72726E]">
                {settings.supportEmail} · {settings.storefrontConfig.footer.locationText}
              </p>
            </div>

            <div className="sm:text-right space-y-1 bg-[#F6F6F4] px-4 py-3 rounded-2xl shrink-0">
              <p className="text-[11px] text-[#72726E]">Nº da Factura</p>
              <p className="text-base font-mono font-semibold text-[#1C1C1E]">
                FAC-{order.id}
              </p>
              <p className="text-[11px] text-[#72726E] pt-1">Data de Registo</p>
              <p className="text-xs font-mono font-medium text-[#1C1C1E]">{order.createdAt}</p>
            </div>
          </div>

          {/* Customer & Order Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#F6F6F4] space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#72726E]">
                Dados do Cliente
              </p>
              <p className="text-sm font-semibold text-[#1C1C1E]">{order.customerName}</p>
              <p className="text-xs text-[#555552]">
                <span className="text-[#72726E]">Email:</span> {displayEmail}
              </p>
              <p className="text-xs text-[#555552]">
                <span className="text-[#72726E]">Telefone / WhatsApp:</span> {displayPhone}
              </p>
              <p className="text-xs text-[#555552]">
                <span className="text-[#72726E]">Morada:</span> {displayAddress}
              </p>
              <p className="text-xs text-[#555552]">
                <span className="text-[#72726E]">Cidade / Zona:</span> {displayCity}
                {displayPostal !== '—' ? ` · ${displayPostal}` : ''}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F6F4] space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#72726E]">
                Informações de Pagamento & Estado
              </p>
              <p className="text-xs text-[#555552]">
                <span className="text-[#72726E]">Referência do Pedido:</span>{' '}
                <span className="font-mono font-medium text-[#1C1C1E]">#{order.id}</span>
              </p>
              <p className="text-xs text-[#555552]">
                <span className="text-[#72726E]">Método de Pagamento:</span>{' '}
                <span className="font-medium text-[#1C1C1E]">{order.paymentMethod}</span>
              </p>
              <p className="text-xs text-[#555552]">
                <span className="text-[#72726E]">Estado da Encomenda:</span>{' '}
                <span className="font-semibold text-[#1C1C1E]">{order.status}</span>
              </p>
              <p className="text-xs text-[#555552]">
                <span className="text-[#72726E]">Situação Financeira:</span>{' '}
                <span
                  className={`font-semibold ${
                    isPaid ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {isPaid ? 'Pago e Contabilizado' : 'Pendente (Não contabilizado como pago)'}
                </span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-black/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F6F6F4] border-b border-black/8 text-[11px] font-semibold text-[#72726E]">
                  <th className="py-3 px-4">Artigo</th>
                  <th className="py-3 px-3">Tamanho</th>
                  <th className="py-3 px-3 text-right">Qtd</th>
                  <th className="py-3 px-3 text-right">Preço Unit.</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6 text-xs">
                {order.items.map((item, idx) => {
                  const prod = item.productId ? productMap.get(item.productId) : undefined;
                  return (
                    <tr key={`${item.productId}-${idx}`}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#1C1C1E]">{item.name}</p>
                        <p className="text-[11px] text-[#72726E]">
                          {prod?.sku ? `SKU: ${prod.sku} · ${prod.category}` : 'Artigo registado'}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-[#555552]">{item.size || 'Único'}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {formatMoney(item.unitPrice, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                        {formatMoney(item.unitPrice * item.quantity, settings.currencySymbol)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
            <div className="text-[11px] text-[#72726E] max-w-xs leading-relaxed">
              {isPaid
                ? 'Esta encomenda encontra-se marcada como Entregue e o respetivo valor está refletido no faturamento da loja.'
                : 'Encomenda com estado Pendente: nenhum valor é contabilizado como pago no faturamento até ser marcada como Entregue.'}
            </div>

            <div className="w-full sm:w-72 bg-[#F6F6F4] rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-[#555552]">
                <span>Subtotal dos Artigos</span>
                <span className="font-mono tabular-nums whitespace-nowrap">
                  {formatMoney(itemsSubtotal, settings.currencySymbol)}
                </span>
              </div>

              {discountValue > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Desconto{order.promoCode ? ` (${order.promoCode})` : ' Aplicado'}
                  </span>
                  <span className="font-mono tabular-nums whitespace-nowrap">
                    −{formatMoney(discountValue, settings.currencySymbol)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-[#555552]">
                <span>Taxa de Entrega</span>
                <span className="font-mono tabular-nums whitespace-nowrap">
                  {shippingValue > 0 ? formatMoney(shippingValue, settings.currencySymbol) : 'Grátis'}
                </span>
              </div>

              <div className="pt-2 border-t border-black/10 flex justify-between items-center text-sm font-semibold text-[#1C1C1E]">
                <span>Total da Factura</span>
                <span className="font-mono tabular-nums whitespace-nowrap">
                  {formatMoney(order.total, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-[#72726E]">Valor Pago</span>
                <span
                  className={`font-mono font-semibold tabular-nums whitespace-nowrap ${
                    isPaid ? 'text-emerald-700' : 'text-[#72726E]'
                  }`}
                >
                  {formatMoney(paidAmount, settings.currencySymbol)}
                </span>
              </div>

              {dueAmount > 0 && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-amber-700 font-medium">Pendente por Pagar</span>
                  <span className="font-mono font-semibold tabular-nums text-amber-700 whitespace-nowrap">
                    {formatMoney(dueAmount, settings.currencySymbol)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
