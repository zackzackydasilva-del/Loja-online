import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus, PaymentMethod, StoreOrder } from '../../types/store';
import { formatMoney } from '../../utils/currency';

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (order: StoreOrder) => void;
}

interface OrderLineDraft {
  id: string;
  mode: 'catalog' | 'custom';
  productId: string;
  customName: string;
  size: string;
  quantity: number;
  unitPrice: string;
}

const PAYMENT_OPTIONS: PaymentMethod[] = ['Multicaixa Express', 'Cartão', 'Contra-Reembolso'];
const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'Pendente', label: 'Pendente (Não contabiliza como pago)' },
  { value: 'Entregue', label: 'Entregue (Pago e contabilizado)' },
];

export const ManualOrderModal: React.FC<ManualOrderModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { products, customers, settings, createManualOrder } = useStore();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [city, setCity] = useState('Luanda');
  const [shippingAddress, setShippingAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Multicaixa Express');
  const [status, setStatus] = useState<OrderStatus>('Pendente');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [includeShipping, setIncludeShipping] = useState(false);
  const [lines, setLines] = useState<OrderLineDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const promoPercent = Math.max(
    0,
    Math.min(100, Number(settings.storefrontConfig?.promoDiscountPercent ?? 10) || 0)
  );
  const baseShippingFee = Math.max(0, Number(settings.storefrontConfig?.shippingFee ?? 0) || 0);

  const availableProducts = useMemo(() => products, [products]);

  const buildDefaultLine = (): OrderLineDraft => {
    const first = availableProducts[0];
    if (first) {
      return {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'catalog',
        productId: first.id,
        customName: '',
        size: first.sizes[0] || 'Único',
        quantity: 1,
        unitPrice: String(first.price),
      };
    }
    return {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mode: 'custom',
      productId: '',
      customName: '',
      size: 'Único',
      quantity: 1,
      unitPrice: '25000',
    };
  };

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCity('Luanda');
    setShippingAddress('');
    setPostalCode('');
    setPaymentMethod('Multicaixa Express');
    setStatus('Pendente');
    setDiscountApplied(false);
    setIncludeShipping(false);
    setLines([buildDefaultLine()]);
  }, [isOpen]);

  const handleSelectExistingCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (!found) return;
    setCustomerName(found.name);
    setCustomerPhone(found.phone === '—' ? '' : found.phone);
    setCustomerEmail(found.email.endsWith('@registo.local') ? '' : found.email);
    setCity(found.city || 'Luanda');
    setShippingAddress(found.shippingAddress === 'Registo manual em loja' ? '' : found.shippingAddress);
    setPostalCode(found.postalCode === '—' ? '' : found.postalCode);
  };

  const updateLine = (lineId: string, patch: Partial<OrderLineDraft>) => {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
  };

  const subtotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const price = Math.max(0, Number(line.unitPrice) || 0);
      const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
      return sum + price * qty;
    }, 0);
  }, [lines]);

  const discountAmount =
    discountApplied && promoPercent > 0 ? +((subtotal * promoPercent) / 100).toFixed(2) : 0;
  const qualifiesFreeShipping =
    settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold;
  const appliedShippingFee =
    includeShipping && baseShippingFee > 0 && !qualifiesFreeShipping
      ? +baseShippingFee.toFixed(2)
      : 0;
  const finalTotal = +(Math.max(0, subtotal - discountAmount) + appliedShippingFee).toFixed(2);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!customerName.trim()) {
      setErrorMsg('Informe o nome do cliente.');
      return;
    }
    if (lines.length === 0) {
      setErrorMsg('Adicione pelo menos um artigo à encomenda.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createManualOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        city: city.trim() || 'Luanda',
        shippingAddress: shippingAddress.trim(),
        postalCode: postalCode.trim(),
        paymentMethod,
        status,
        discountApplied,
        includeShipping,
        items: lines.map((line) =>
          line.mode === 'catalog'
            ? {
                productId: line.productId,
                size: line.size || 'Único',
                quantity: Math.max(1, Math.floor(Number(line.quantity) || 1)),
                unitPrice: Math.max(0, Number(line.unitPrice) || 0),
              }
            : {
                name: line.customName.trim(),
                size: line.size || 'Único',
                quantity: Math.max(1, Math.floor(Number(line.quantity) || 1)),
                unitPrice: Math.max(0, Number(line.unitPrice) || 0),
              }
        ),
      });
      onCreated?.(created);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao registar encomenda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-[24px] p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#1C1C1E]">
              Registar Encomenda Manual
            </h3>
            <p className="text-xs text-[#72726E] mt-0.5">
              Para pedidos recebidos por WhatsApp, Instagram, telefone ou venda presencial.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Section */}
        <div className="space-y-3 bg-[#F6F6F4] p-4 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#1C1C1E]">Dados do Cliente</span>
            {customers.length > 0 && (
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                className="bg-white border border-black/15 rounded-xl px-2.5 py-1 text-[11px] focus:outline-none"
              >
                <option value="">Preencher cliente existente...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#555552] mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Ana Paula Mateus"
                className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#555552] mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+244 923 000 000"
                className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#555552] mb-1">
                Email (opcional)
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="cliente@email.ao"
                className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#555552] mb-1">
                Cidade / Província
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Luanda"
                className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-[#555552] mb-1">
                  Morada de Entrega (opcional)
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Rua, bairro ou levantamento em loja"
                  className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#555552] mb-1">
                  Referência / Zona
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Ex: Talatona"
                  className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order Lines Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1C1C1E]">
              Artigos ({lines.length})
            </span>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, buildDefaultLine()])}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F2F1EE] hover:bg-[#E5E4DF] text-xs font-medium text-[#1C1C1E] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Artigo</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {lines.map((line, index) => {
              const selectedProd = products.find((p) => p.id === line.productId);
              const sizeChoices = selectedProd?.sizes?.length ? selectedProd.sizes : ['Único'];
              const lineSubtotal =
                (Math.max(0, Number(line.unitPrice) || 0)) *
                Math.max(1, Math.floor(Number(line.quantity) || 1));
              return (
                <div
                  key={line.id}
                  className="p-3.5 rounded-2xl border border-black/10 space-y-2.5 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#72726E]">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={availableProducts.length === 0}
                        onClick={() => {
                          const first = availableProducts[0];
                          if (!first) return;
                          updateLine(line.id, {
                            mode: 'catalog',
                            productId: first.id,
                            size: first.sizes[0] || 'Único',
                            unitPrice: String(first.price),
                          });
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer disabled:opacity-40 ${
                          line.mode === 'catalog'
                            ? 'bg-[#1C1C1E] text-white'
                            : 'bg-[#F2F1EE] text-[#555552]'
                        }`}
                      >
                        Do Catálogo
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLine(line.id, {
                            mode: 'custom',
                            productId: '',
                            size: line.size || 'Único',
                          })
                        }
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer ${
                          line.mode === 'custom'
                            ? 'bg-[#1C1C1E] text-white'
                            : 'bg-[#F2F1EE] text-[#555552]'
                        }`}
                      >
                        Artigo Avulso
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold text-[#1C1C1E] tabular-nums">
                        {formatMoney(lineSubtotal, settings.currencySymbol)}
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                          aria-label="Remover artigo"
                          className="p-1 text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] text-[#555552] mb-1">
                        {line.mode === 'catalog' ? 'Produto' : 'Descrição do Artigo'}
                      </label>
                      {line.mode === 'catalog' ? (
                        <select
                          value={line.productId}
                          onChange={(e) => {
                            const prod = products.find((p) => p.id === e.target.value);
                            updateLine(line.id, {
                              productId: e.target.value,
                              size: prod?.sizes[0] || 'Único',
                              unitPrice: prod ? String(prod.price) : line.unitPrice,
                            });
                          }}
                          className="w-full border border-black/15 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                        >
                          {availableProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.stock} un.) — {formatMoney(p.price, settings.currencySymbol)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          value={line.customName}
                          onChange={(e) => updateLine(line.id, { customName: e.target.value })}
                          placeholder="Ex: Blazer Linho por Encomenda"
                          className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                        />
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-[#555552] mb-1">Tamanho</label>
                      {line.mode === 'catalog' && sizeChoices.length > 0 ? (
                        <select
                          value={line.size}
                          onChange={(e) => updateLine(line.id, { size: e.target.value })}
                          className="w-full border border-black/15 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                        >
                          {sizeChoices.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={line.size}
                          onChange={(e) => updateLine(line.id, { size: e.target.value })}
                          className="w-full border border-black/15 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                        />
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-[#555552] mb-1">Qtd</label>
                      <div className="flex items-center border border-black/15 rounded-xl overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(line.id, {
                              quantity: Math.max(1, (Number(line.quantity) || 1) - 1),
                            })
                          }
                          aria-label="Diminuir quantidade"
                          className="px-2 py-2 text-xs font-semibold hover:bg-[#F2F1EE] cursor-pointer"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.id, {
                              quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full text-center font-mono tabular-nums py-2 text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(line.id, {
                              quantity: Math.max(1, (Number(line.quantity) || 1) + 1),
                            })
                          }
                          aria-label="Aumentar quantidade"
                          className="px-2 py-2 text-xs font-semibold hover:bg-[#F2F1EE] cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-[#555552] mb-1">
                        Preço Unit. ({settings.currencySymbol})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        required
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.id, { unitPrice: e.target.value })}
                        className="w-full font-mono tabular-nums border border-black/15 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, buildDefaultLine()])}
              className="w-full py-2.5 rounded-2xl border border-dashed border-black/20 hover:border-[#1C1C1E] text-xs font-medium text-[#1C1C1E] inline-flex items-center justify-center gap-1.5 hover:bg-[#F6F6F4] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Mais Artigo / Calça nesta Encomenda</span>
            </button>
          </div>
        </div>

        {/* Payment, Status & Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#F6F6F4] p-4 rounded-2xl">
          <div>
            <label className="block text-[11px] font-medium text-[#555552] mb-1">
              Método de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
            >
              {PAYMENT_OPTIONS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#555552] mb-1">
              Estado da Encomenda
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-xs text-[#1C1C1E] cursor-pointer">
              <input
                type="checkbox"
                checked={discountApplied}
                onChange={(e) => setDiscountApplied(e.target.checked)}
                className="rounded"
              />
              <span>Aplicar desconto do cupão ({promoPercent}%) nesta encomenda</span>
            </label>

            {baseShippingFee > 0 && (
              <label className="inline-flex items-center gap-2 text-xs text-[#1C1C1E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeShipping}
                  onChange={(e) => setIncludeShipping(e.target.checked)}
                  className="rounded"
                />
                <span>
                  {qualifiesFreeShipping
                    ? 'Taxa de entrega (Grátis pelo limiar)'
                    : `Adicionar taxa de entrega (${formatMoney(baseShippingFee, settings.currencySymbol)})`}
                </span>
              </label>
            )}
          </div>

          <div className="sm:col-span-2 pt-2 border-t border-black/8 flex items-center justify-between">
            <span className="text-xs font-medium text-[#555552]">
              Total ({lines.reduce((s, l) => s + Math.max(1, Math.floor(Number(l.quantity) || 1)), 0)} unidade(s))
            </span>
            <span className="text-lg font-mono font-semibold tabular-nums text-[#1C1C1E]">
              {formatMoney(finalTotal, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-xl">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#555552] hover:text-[#1C1C1E] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'A registar...' : 'Registar Encomenda'}
          </button>
        </div>
      </form>
    </div>
  );
};
