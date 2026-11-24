import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PaymentMethod, StoreOrder } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { getVisitorSessionId, reportVisitorStage } from '../../utils/storeTracker';
import { SafeImage } from '../SafeImage';

const DRAFT_ORDER_STORAGE_KEY = 'lunora_checkout_draft_id_v1';

function readStoredDraftId(): string {
  try {
    return sessionStorage.getItem(DRAFT_ORDER_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveStoredDraftId(id: string) {
  try {
    if (id) sessionStorage.setItem(DRAFT_ORDER_STORAGE_KEY, id);
    else sessionStorage.removeItem(DRAFT_ORDER_STORAGE_KEY);
  } catch {
    // Ignore storage error
  }
}

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    products,
    updateCartQuantity,
    removeFromCart,
    placeOrder,
    settings,
    setQuickViewProduct,
  } = useStore();

  const [step, setStep] = useState<'cart' | 'checkout' | 'confirmed'>('cart');
  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<StoreOrder | null>(null);

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    city: '',
    postalCode: '',
    paymentMethod: 'Contra-Reembolso' as PaymentMethod,
  });

  const [checkoutError, setCheckoutError] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [draftOrderId, setDraftOrderId] = useState<string>(() => readStoredDraftId());
  const draftOrderIdRef = useRef<string>(draftOrderId);
  draftOrderIdRef.current = draftOrderId;
  const lastSavedPayloadRef = useRef<string>('');

  const activePromoCode = (settings.storefrontConfig.newsletter.promoCode || 'LUNORA10').trim().toUpperCase();

  const cartLines = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = cartLines.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = discountApplied ? subtotal * 0.9 : subtotal;
  const freeShippingProgress =
    settings.freeShippingThreshold > 0
      ? Math.min(100, (subtotal / settings.freeShippingThreshold) * 100)
      : 100;
  const remainingForFreeShipping = Math.max(0, settings.freeShippingThreshold - subtotal);
  const cartTotalUnits = cartLines.reduce((s, i) => s + i.quantity, 0);
  const cartItemsSummary = cartLines.map((i) => `${i.quantity}x ${i.product.name}`);

  useEffect(() => {
    if (!isCartOpen) return;
    if (step === 'confirmed' && confirmedOrder) {
      reportVisitorStage({
        stage: 'comprou',
        cartCount: confirmedOrder.items.reduce((s, i) => s + i.quantity, 0),
        cartTotal: confirmedOrder.total,
        cartItemsSummary: confirmedOrder.items.map((i) => `${i.quantity}x ${i.name}`),
        customerName: confirmedOrder.customerName,
        customerEmail: confirmedOrder.customerEmail,
        city: confirmedOrder.city,
        completedOrderId: confirmedOrder.id,
        eventId: `evt-order-${confirmedOrder.id}`,
      });
      return;
    }

    if (step === 'checkout') {
      reportVisitorStage({
        stage: 'checkout',
        cartCount: cartTotalUnits,
        cartTotal: total,
        cartItemsSummary,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        city: form.city,
      });
      return;
    }

    reportVisitorStage({
      stage: 'saco',
      cartCount: cartTotalUnits,
      cartTotal: total,
      cartItemsSummary,
    });
  }, [
    isCartOpen,
    step,
    cartTotalUnits,
    total,
    form.customerName,
    form.customerEmail,
    form.city,
    confirmedOrder,
  ]);

  useEffect(() => {
    if (!isCartOpen || step !== 'checkout' || cartLines.length === 0) return;

    const name = form.customerName.trim();
    const phone = form.customerPhone.trim();
    const address = form.shippingAddress.trim();
    const city = form.city.trim();

    if (name.length < 2 || phone.length < 6 || address.length < 3 || city.length < 2) {
      return;
    }

    const itemsPayload = cartLines.map((i) => ({
      productId: i.product.id,
      size: i.size,
      quantity: i.quantity,
    }));

    const signature = JSON.stringify({
      name,
      email: form.customerEmail.trim(),
      phone,
      address,
      city,
      postalCode: form.postalCode.trim(),
      paymentMethod: form.paymentMethod,
      discountApplied,
      itemsPayload,
    });

    if (lastSavedPayloadRef.current === signature) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/orders/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftOrderId: draftOrderIdRef.current || undefined,
            customerName: name,
            customerEmail: form.customerEmail.trim(),
            customerPhone: phone,
            shippingAddress: address,
            city,
            postalCode: form.postalCode.trim(),
            paymentMethod: form.paymentMethod,
            items: itemsPayload,
            discountApplied,
            sessionId: getVisitorSessionId(),
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; order?: StoreOrder };
        if (data.order?.id) {
          lastSavedPayloadRef.current = signature;
          draftOrderIdRef.current = data.order.id;
          setDraftOrderId(data.order.id);
          saveStoredDraftId(data.order.id);
        }
      } catch {
        // Silent background draft save
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    isCartOpen,
    step,
    cartLines,
    form.customerName,
    form.customerEmail,
    form.customerPhone,
    form.shippingAddress,
    form.city,
    form.postalCode,
    form.paymentMethod,
    discountApplied,
  ]);

  if (!isCartOpen) return null;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === activePromoCode) {
      setDiscountApplied(true);
      setPromoFeedback(`Código ${activePromoCode} aplicado (10% desconto).`);
    } else {
      setPromoFeedback(`Código inválido. Experimente ${activePromoCode}.`);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    setSubmittingOrder(true);
    try {
      const order = await placeOrder({
        ...form,
        draftOrderId: draftOrderIdRef.current || undefined,
        discountApplied,
      });
      draftOrderIdRef.current = '';
      lastSavedPayloadRef.current = '';
      setDraftOrderId('');
      saveStoredDraftId('');
      setConfirmedOrder(order);
      setStep('confirmed');
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Erro ao concluir encomenda.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const resetAndClose = () => {
    setIsCartOpen(false);
    setTimeout(() => {
      setStep('cart');
      setConfirmedOrder(null);
    }, 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex justify-end"
      onClick={resetAndClose}
    >
      <aside
        className="w-full max-w-md bg-[#F7F7F7] h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-[#141413]/10 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="p-1.5 rounded-lg hover:bg-[#EFECE5] cursor-pointer"
                aria-label="Voltar ao saco"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-serif text-xl font-medium text-[#141413]">
              {step === 'cart' && `O Seu Saco (${cartLines.reduce((s, i) => s + i.quantity, 0)})`}
              {step === 'checkout' && 'Finalizar Encomenda'}
              {step === 'confirmed' && 'Encomenda Confirmada'}
            </h2>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Fechar saco"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#EFECE5] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'confirmed' && confirmedOrder ? (
            <div className="py-6 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-[#141413]/10 text-center space-y-3">
                <CheckCircle2 className="w-11 h-11 text-emerald-700 mx-auto" strokeWidth={1.6} />
                <p className="text-xs font-mono text-[#66635C]">Encomenda #{confirmedOrder.id}</p>
                <h3 className="font-serif text-2xl text-[#141413]">
                  Obrigado, {confirmedOrder.customerName.split(' ')[0]}!
                </h3>
                <p className="text-sm text-[#58544D]">
                  A sua encomenda foi registada e já aparece em tempo real no painel de gestão da loja.
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-[#141413]/10 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#66635C]">Estado</span>
                  <span className="font-medium text-[#141413]">{confirmedOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#66635C]">Pagamento</span>
                  <span className="font-medium text-[#141413]">{confirmedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#66635C]">Destino</span>
                  <span className="font-medium text-[#141413] text-right">
                    {confirmedOrder.city}, {confirmedOrder.postalCode}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#141413]/10 flex justify-between font-semibold tabular-nums">
                  <span>Total Pago</span>
                  <span>{formatMoney(confirmedOrder.total, settings.currencySymbol)}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="w-full py-3 bg-[#141413] text-[#F8F6F2] text-sm font-medium rounded-lg hover:bg-[#2B2B29] cursor-pointer"
                >
                  Continuar a Comprar
                </button>
              </div>
            </div>
          ) : cartLines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-10 h-10 text-[#8A857C] mb-3" strokeWidth={1.4} />
              <p className="font-serif text-xl text-[#141413] mb-1">O seu saco está vazio</p>
              <p className="text-sm text-[#66635C] mb-6 max-w-xs">
                Explore o catálogo da loja para adicionar peças ao seu saco.
              </p>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-5 py-2.5 bg-[#141413] text-[#F8F6F2] text-xs font-medium rounded-lg cursor-pointer"
              >
                Explorar Coleção
              </button>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-5">
              {/* Free Shipping Progress */}
              <div className="bg-white rounded-xl p-4 border border-[#141413]/8">
                <p className="text-xs text-[#524F49] mb-2">
                  {remainingForFreeShipping === 0
                    ? 'Tem direito a Envio Gratuito nesta encomenda.'
                    : `Faltam ${formatMoney(remainingForFreeShipping, settings.currencySymbol)} para Envio Gratuito.`}
                </p>
                <div className="w-full h-1.5 bg-[#EFECE5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#141413] transition-all duration-300"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>

              {/* Cart Items */}
              <div className="space-y-4">
                {cartLines.map(({ product, size, quantity }) => (
                  <div
                    key={`${product.id}-${size}`}
                    className="flex gap-4 bg-white p-3.5 rounded-xl border border-[#141413]/8"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartOpen(false);
                        setQuickViewProduct(product);
                      }}
                      className="w-20 h-24 rounded-lg overflow-hidden bg-[#F1EEE8] shrink-0 cursor-pointer"
                    >
                      <SafeImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    </button>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCartOpen(false);
                            setQuickViewProduct(product);
                          }}
                          className="text-left cursor-pointer"
                        >
                          <h4 className="text-sm font-semibold text-[#141413] truncate max-w-[20ch] hover:underline">
                            {product.name}
                          </h4>
                          <p className="text-xs text-[#66635C]">Tamanho: {size}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id, size)}
                          aria-label="Remover artigo"
                          className="text-[#8A857C] hover:text-[#141413] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center border border-[#141413]/15 rounded-md">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(product.id, size, quantity - 1)}
                            className="p-1.5 hover:bg-[#EFECE5] cursor-pointer"
                            aria-label="Diminuir"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-medium tabular-nums">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(product.id, size, quantity + 1)}
                            className="p-1.5 hover:bg-[#EFECE5] cursor-pointer"
                            aria-label="Aumentar"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-sm font-semibold text-[#141413] tabular-nums">
                          {formatMoney(product.price * quantity, settings.currencySymbol)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <form onSubmit={handleApplyPromo} className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder={`Código promocional (ex: ${activePromoCode})`}
                    className="flex-1 bg-white border border-[#141413]/15 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-[#141413]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#EFECE5] text-[#141413] text-xs font-medium rounded-lg hover:bg-[#E4DFD4] cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
                {promoFeedback && <p className="text-[11px] text-[#524F49]">{promoFeedback}</p>}
              </form>
            </div>
          ) : (
            /* Checkout Form */
            <form id="lunora-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#141413] mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Ex: Ana Sebastião"
                  className="w-full bg-white border border-[#141413]/15 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#141413]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    placeholder="cliente@email.ao"
                    className="w-full bg-white border border-[#141413]/15 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#141413]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">Telemóvel</label>
                  <input
                    type="tel"
                    required
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="+244 923 000 000"
                    className="w-full bg-white border border-[#141413]/15 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#141413]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#141413] mb-1">Morada de Entrega</label>
                <input
                  type="text"
                  required
                  value={form.shippingAddress}
                  onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                  placeholder="Rua Comandante Gika 45"
                  className="w-full bg-white border border-[#141413]/15 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#141413]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">Cidade</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Luanda"
                    className="w-full bg-white border border-[#141413]/15 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#141413]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">Bairro / Zona</label>
                  <input
                    type="text"
                    required
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    placeholder="Talatona"
                    className="w-full bg-white border border-[#141413]/15 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#141413]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#141413] mb-1.5">
                  Pagamento na Entrega
                </label>
                <p className="text-[11px] text-[#555555] bg-white border border-[#141413]/10 rounded-lg px-3 py-2 mb-2">
                  O pagamento é feito apenas no ato da entrega (em dinheiro ou TPA/Multicaixa móvel).
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['Contra-Reembolso', 'Multicaixa Express', 'Cartão'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: method })}
                      className={`py-2.5 px-2 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer ${
                        form.paymentMethod === method
                          ? 'bg-[#141413] text-[#F8F6F2] border-[#141413]'
                          : 'bg-white text-[#141413] border-[#141413]/15'
                      }`}
                    >
                      {method === 'Contra-Reembolso' ? 'Dinheiro na Entrega' : method}
                    </button>
                  ))}
                </div>
              </div>
              {draftOrderId && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                  Pré-registo guardado automaticamente como encomenda pendente (#{draftOrderId}).
                </p>
              )}
              {checkoutError && (
                <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                  {checkoutError}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {cartLines.length > 0 && step !== 'confirmed' && (
          <div className="px-6 py-5 border-t border-[#141413]/10 bg-white space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#66635C] tabular-nums">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, settings.currencySymbol)}</span>
              </div>
              {discountApplied && (
                <div className="flex justify-between text-emerald-700 text-xs tabular-nums">
                  <span>Desconto ({activePromoCode})</span>
                  <span>-{formatMoney(subtotal * 0.1, settings.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-[#141413] pt-1.5 border-t border-[#141413]/8 tabular-nums">
                <span>Total</span>
                <span>{formatMoney(total, settings.currencySymbol)}</span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3.5 bg-[#141413] text-[#F8F6F2] text-sm font-medium rounded-lg hover:bg-[#2B2B29] transition-colors cursor-pointer"
              >
                Avançar para Checkout
              </button>
            ) : (
              <button
                type="submit"
                form="lunora-checkout-form"
                disabled={submittingOrder}
                className="w-full py-3.5 bg-[#141413] text-[#F8F6F2] text-sm font-medium rounded-lg hover:bg-[#2B2B29] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {submittingOrder
                  ? 'A registar encomenda...'
                  : `Confirmar Encomenda (${formatMoney(total, settings.currencySymbol)})`}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};
