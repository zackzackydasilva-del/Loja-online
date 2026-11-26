import React, { useState } from 'react';
import { Check, Headphones, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatMoney } from '../../utils/currency';
import { SafeImage } from '../SafeImage';

export const TrustAndNewsletter: React.FC = () => {
  const { subscribeNewsletter, settings } = useStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const cfg = settings.storefrontConfig;
  const g = cfg.guarantees;
  const nl = cfg.newsletter;

  return (
    <section className="max-w-[1280px] mx-auto px-6 md:px-10 py-12 space-y-10">
      {/* 4-Column Guarantee Band */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-[#EFECE5] rounded-2xl px-6 py-7 border border-[#141413]/6">
        <div className="flex items-center gap-3.5">
          <Truck className="w-5 h-5 text-[#141413] shrink-0" strokeWidth={1.6} />
          <div>
            <p className="text-sm font-semibold text-[#141413]">{g[0]?.title || 'Envio Gratuito'}</p>
            <p className="text-xs text-[#66635C]">
              {g[0]?.subtitle || `Em compras acima de ${formatMoney(settings.freeShippingThreshold, settings.currencySymbol)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <RotateCcw className="w-5 h-5 text-[#141413] shrink-0" strokeWidth={1.6} />
          <div>
            <p className="text-sm font-semibold text-[#141413]">{g[1]?.title || 'Devoluções Simples'}</p>
            <p className="text-xs text-[#66635C]">{g[1]?.subtitle || '30 dias para trocar ou devolver'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <ShieldCheck className="w-5 h-5 text-[#141413] shrink-0" strokeWidth={1.6} />
          <div>
            <p className="text-sm font-semibold text-[#141413]">{g[2]?.title || 'Pagamento Seguro'}</p>
            <p className="text-xs text-[#66635C]">{g[2]?.subtitle || 'Encriptação 100% protegida'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <Headphones className="w-5 h-5 text-[#141413] shrink-0" strokeWidth={1.6} />
          <div>
            <p className="text-sm font-semibold text-[#141413]">{g[3]?.title || 'Apoio Dedicado'}</p>
            <p className="text-xs text-[#66635C]">{g[3]?.subtitle || 'Atendimento personalizado 24/7'}</p>
          </div>
        </div>
      </div>

      {/* Newsletter Split Banner */}
      <div className="rounded-2xl overflow-hidden bg-[#EFECE5] border border-[#141413]/8 grid grid-cols-1 md:grid-cols-12 items-stretch">
        {nl.image?.trim() && (
          <div className="md:col-span-4 min-h-[220px] max-h-[280px]">
            <SafeImage
              src={nl.image}
              alt={nl.title}
              className="w-full h-full object-cover object-top"
            />
          </div>
        )}
        <div className={`${nl.image?.trim() ? 'md:col-span-8' : 'md:col-span-12'} p-8 md:p-12 flex flex-col justify-center`}>
          <p className="text-xs font-medium tracking-[0.14em] text-[#66635C] mb-2">
            {nl.eyebrow}
          </p>
          <h3 className="font-serif text-2xl md:text-3xl font-medium text-[#141413] mb-2">
            {nl.title}
          </h3>
          <p className="text-sm text-[#58544D] mb-6 max-w-lg">
            {nl.description}{' '}
            {nl.promoCode && (
              <span className="font-mono font-semibold text-[#141413]">{nl.promoCode}</span>
            )}
          </p>

          {subscribed ? (
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#141413] bg-white px-4 py-3 rounded-lg border border-[#141413]/12 w-fit">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>
                Subscrição confirmada. Utilize o código {nl.promoCode || 'LUNORA10'}
                {Number(cfg.promoDiscountPercent ?? 10) > 0
                  ? ` (${Number(cfg.promoDiscountPercent ?? 10)}% de desconto)`
                  : ''}{' '}
                no checkout.
              </span>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (await subscribeNewsletter(email)) {
                  setSubscribed(true);
                  setEmail('');
                }
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-lg"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Introduza o seu email"
                className="flex-1 bg-white border border-[#141413]/15 rounded-lg px-4 py-3 text-sm text-[#141413] placeholder:text-[#8A857C] focus:outline-none focus:border-[#141413]"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#141413] text-[#F8F6F2] text-sm font-medium rounded-lg hover:bg-[#2B2B29] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {nl.buttonText || 'Subscrever'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
