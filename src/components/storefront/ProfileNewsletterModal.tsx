import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, Package, Search, Truck, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus } from '../../types/store';
import { formatMoney } from '../../utils/currency';

interface ProfileNewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TrackingResultPayload {
  trackingCode: string;
  orderId: string;
  status: OrderStatus;
  progressStep: number;
  totalSteps: number;
  createdAt: string;
  city: string;
  paymentMethod: string;
  total: number;
  currencySymbol: string;
  items: {
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;
  }[];
}

const TRACKING_STEPS: { step: number; label: OrderStatus }[] = [
  { step: 1, label: 'Pendente' },
  { step: 2, label: 'Em Preparação' },
  { step: 3, label: 'Em Trânsito' },
  { step: 4, label: 'Entregue' },
];

export const ProfileNewsletterModal: React.FC<ProfileNewsletterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { submitProfileEmail, settings } = useStore();
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [trackingResult, setTrackingResult] = useState<TrackingResultPayload | null>(null);

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTrackingCode('');
      setTrackingLoading(false);
      setTrackingError('');
      setTrackingResult(null);
      setEmail('');
      setSubscribed(false);
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cfg = settings.storefrontConfig;
  const promoCode = cfg.newsletter?.promoCode || 'LUNORA10';

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = trackingCode.trim();
    if (!cleaned) {
      setTrackingError('Introduza o código de rastreio da sua encomenda.');
      return;
    }

    setTrackingError('');
    setTrackingResult(null);
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/orders/track?code=${encodeURIComponent(cleaned)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        tracking?: TrackingResultPayload;
        error?: string;
      };
      if (!res.ok || !data.tracking) {
        setTrackingError(data.error || 'Código de rastreio não encontrado.');
        return;
      }
      setTrackingResult(data.tracking);
    } catch {
      setTrackingError('Não foi possível consultar o estado neste momento.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await submitProfileEmail(email);
    setSubmitting(false);

    if (result.status === 'admin') {
      onClose();
      return;
    }

    if (result.status === 'subscribed') {
      setSubscribed(true);
      return;
    }

    setError(result.error || 'Não foi possível concluir a subscrição.');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-[28px] p-6 sm:p-7 shadow-2xl border border-black/5 max-h-[90vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#F3F3F3] text-[#111111] flex items-center justify-center hover:bg-[#E5E5E5] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Order Tracking Lookup */}
        <div className="space-y-3.5 pr-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111] tracking-tight">
                Acompanhar Encomenda
              </h2>
              <p className="text-xs text-[#666666]">
                Coloque o código de rastreio da factura para ver o estado do produto.
              </p>
            </div>
          </div>

          <form onSubmit={handleTrackOrder} className="flex gap-2">
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
              placeholder="Ex: TRK-2050-8F3K"
              className="flex-1 bg-[#F3F3F3] rounded-full px-4 py-2.5 text-sm font-mono uppercase text-[#111111] placeholder:normal-case placeholder:font-sans placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#111111]"
            />
            <button
              type="submit"
              disabled={trackingLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-[#262626] disabled:opacity-60 transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{trackingLoading ? 'A procurar...' : 'Ver Estado'}</span>
            </button>
          </form>

          {trackingError && (
            <p className="text-xs text-red-700 bg-red-50 px-3.5 py-2 rounded-xl">
              {trackingError}
            </p>
          )}

          {trackingResult && (
            <div className="rounded-2xl bg-[#F7F6F3] border border-black/8 p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-mono text-[#666666]">
                    Rastreio: <span className="font-semibold text-[#111111]">{trackingResult.trackingCode}</span> · #{trackingResult.orderId}
                  </p>
                  <p className="text-[11px] text-[#777777]">
                    Registado em {trackingResult.createdAt} · {trackingResult.city}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    trackingResult.status === 'Entregue'
                      ? 'bg-emerald-100 text-emerald-800'
                      : trackingResult.status === 'Em Trânsito'
                      ? 'bg-blue-100 text-blue-800'
                      : trackingResult.status === 'Em Preparação'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#E9E7E1] text-[#111111]'
                  }`}
                >
                  {trackingResult.status}
                </span>
              </div>

              {/* Progress Stepper */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {TRACKING_STEPS.map((st) => {
                  const active = trackingResult.progressStep >= st.step;
                  const current = trackingResult.progressStep === st.step;
                  return (
                    <div key={st.step} className="space-y-1">
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          active ? 'bg-[#111111]' : 'bg-black/10'
                        }`}
                      />
                      <p
                        className={`text-[10px] leading-tight ${
                          current
                            ? 'font-semibold text-[#111111]'
                            : active
                            ? 'text-[#333333]'
                            : 'text-[#888888]'
                        }`}
                      >
                        {st.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Ordered Products & Status */}
              <div className="pt-2 border-t border-black/8 space-y-2">
                <p className="text-[11px] font-semibold text-[#111111] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>Produto(s) nesta encomenda</span>
                </p>
                <div className="space-y-1.5">
                  {trackingResult.items.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="flex items-center justify-between gap-2 text-xs bg-white rounded-xl px-3 py-2 border border-black/5"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#111111] truncate">
                          {item.quantity}x {item.name}
                        </p>
                        <p className="text-[10px] text-[#777777]">Tamanho: {item.size}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F3F3] text-[#111111] shrink-0">
                        {trackingResult.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs pt-1 text-[#555555]">
                  <span>{trackingResult.paymentMethod}</span>
                  <span className="font-mono font-semibold text-[#111111] tabular-nums">
                    Total: {formatMoney(trackingResult.total, trackingResult.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-black/8 pt-5">
          {subscribed ? (
            <div className="text-center py-2 space-y-3">
              <div className="w-11 h-11 rounded-full bg-[#111111] text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-[#111111] tracking-tight">
                Subscrição Confirmada
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Obrigado por se inscrever na Newsletter da {settings.storeName}. Utilize o código{' '}
                <span className="font-mono font-semibold text-[#111111]">{promoCode}</span> no saco.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-1 w-full h-11 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-[#262626] transition-colors cursor-pointer"
              >
                Continuar na Loja
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F3F3F3] text-[#111111] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111111] tracking-tight">
                    {cfg.footer?.newsletterTitle || 'Subscrever Newsletter'}
                  </h3>
                  <p className="text-xs text-[#666666] leading-snug">
                    {cfg.footer?.newsletterDescription ||
                      'Receba novidades da coleção, reposições exclusivas e descontos.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@exemplo.com"
                  className="flex-1 bg-[#F3F3F3] rounded-full px-4 py-2.5 text-sm text-[#111111] placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-5 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-[#262626] disabled:opacity-60 transition-colors cursor-pointer shrink-0"
                >
                  {submitting ? 'A processar...' : 'Inscrever'}
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-700 bg-red-50 px-3.5 py-2 rounded-xl">{error}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

