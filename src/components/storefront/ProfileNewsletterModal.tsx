import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface ProfileNewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileNewsletterModal: React.FC<ProfileNewsletterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { submitProfileEmail, settings } = useStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setSubscribed(false);
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cfg = settings.storefrontConfig;
  const promoCode = cfg.newsletter?.promoCode || 'LUNORA10';

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
        className="relative w-full max-w-md bg-white rounded-[28px] p-7 sm:p-8 shadow-2xl border border-black/5"
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

        {subscribed ? (
          <div className="text-center py-3 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#111111] text-white flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <h2 className="text-xl font-bold text-[#111111] tracking-tight">
              Subscrição Confirmada
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
              Obrigado por se inscrever na Newsletter da {settings.storeName}. Utilize o código{' '}
              <span className="font-mono font-semibold text-[#111111]">{promoCode}</span> no saco
              para 10% de desconto.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full h-11 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-[#262626] transition-colors cursor-pointer"
            >
              Continuar na Loja
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="w-11 h-11 rounded-full bg-[#F3F3F3] text-[#111111] flex items-center justify-center">
              <Mail className="w-5 h-5" strokeWidth={1.8} />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#111111] tracking-tight">
                {cfg.footer?.newsletterTitle || 'Subscrever Newsletter'}
              </h2>
              <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
                {cfg.footer?.newsletterDescription ||
                  'Receba novidades da coleção, reposições exclusivas e 10% na primeira compra.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1.5">
                Endereço de Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                autoFocus
                className="w-full bg-[#F3F3F3] rounded-full px-4 py-3 text-sm text-[#111111] placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#111111]"
              />
            </div>

            {error && (
              <p className="text-xs text-red-700 bg-red-50 px-3.5 py-2 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-[#111111] text-white text-sm font-semibold hover:bg-[#262626] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {submitting ? 'A processar...' : 'Inscrever na Newsletter'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
