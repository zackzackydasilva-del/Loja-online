import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory } from '../../types/store';

interface StorefrontFooterProps {
  onNavigateCategory: (cat: ProductCategory | 'Todos') => void;
}

export const StorefrontFooter: React.FC<StorefrontFooterProps> = ({ onNavigateCategory }) => {
  const { setActiveAppView, subscribeNewsletter, settings } = useStore();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const cfg = settings.storefrontConfig;
  const ft = cfg.footer;
  const wordmark = cfg.headerWordmark || settings.storeName.toUpperCase();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await subscribeNewsletter(email)) {
      setDone(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-[#121210] text-[#E8E3DA] pt-14 pb-10">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Brand */}
          <div className="lg:col-span-3 space-y-4">
            <p className="font-serif text-2xl tracking-[0.16em] text-white">{wordmark}</p>
            <p className="text-xs leading-relaxed text-[#A39E94] max-w-[26ch]">{ft.tagline}</p>
            <button
              type="button"
              onClick={() => setActiveAppView('admin')}
              className="inline-flex items-center gap-2 text-xs font-medium text-white underline underline-offset-4 decoration-white/30 hover:decoration-white cursor-pointer"
            >
              <span>Aceder ao Painel de Gestão</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Loja */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold tracking-[0.12em] text-white uppercase">Loja</h4>
            <ul className="space-y-2 text-xs text-[#A39E94]">
              <li>
                <button type="button" onClick={() => onNavigateCategory('Todos')} className="hover:text-white cursor-pointer">
                  Todos os Produtos
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigateCategory('Mulher')} className="hover:text-white cursor-pointer">
                  Coleção Mulher
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigateCategory('Homem')} className="hover:text-white cursor-pointer">
                  Coleção Homem
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigateCategory('Malas')} className="hover:text-white cursor-pointer">
                  Malas & Acessórios
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigateCategory('Saldos')} className="hover:text-white cursor-pointer">
                  Saldos
                </button>
              </li>
            </ul>
          </div>

          {/* Apoio ao Cliente */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold tracking-[0.12em] text-white uppercase">
              {ft.supportTitle}
            </h4>
            <ul className="space-y-2 text-xs text-[#A39E94]">
              {ft.supportLinks.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Atelier */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold tracking-[0.12em] text-white uppercase">
              {ft.atelierTitle}
            </h4>
            <ul className="space-y-2 text-xs text-[#A39E94]">
              {ft.atelierLinks.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold tracking-[0.12em] text-white uppercase">
              {ft.newsletterTitle}
            </h4>
            <p className="text-xs text-[#A39E94]">{ft.newsletterDescription}</p>
            {done ? (
              <p className="text-xs text-white font-medium">Obrigado pela sua subscrição.</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center bg-white rounded-lg overflow-hidden">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="O seu email"
                  className="flex-1 px-3.5 py-2.5 text-xs text-[#141413] placeholder:text-[#8A857C] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscrever"
                  className="px-3.5 py-2.5 text-[#141413] hover:bg-[#EFECE5] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#8A857C]">
          <p>{ft.copyrightText}</p>
          <p>{ft.locationText}</p>
        </div>
      </div>
    </footer>
  );
};
