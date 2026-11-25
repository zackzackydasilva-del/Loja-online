import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory } from '../../types/store';

interface StorefrontFooterProps {
  onNavigateCategory: (cat: ProductCategory | 'Todos') => void;
}

export const StorefrontFooter: React.FC<StorefrontFooterProps> = ({ onNavigateCategory }) => {
  const { subscribeNewsletter, settings } = useStore();
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
    <footer className="bg-white border-t border-black/[0.06] pt-10 lg:pt-12 pb-24 md:pb-12 text-[#111111]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-black/[0.06]">
          <div className="md:col-span-5 space-y-2.5">
            <p className="font-serif text-xl tracking-[0.14em] font-semibold">{wordmark}</p>
            <p className="text-xs leading-relaxed text-[#666666] max-w-sm">{ft.tagline}</p>
          </div>

          <div className="md:col-span-3 space-y-2">
            <p className="text-xs font-semibold text-[#111111]">Categorias</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#666666]">
              {[
                'Todos',
                ...(cfg.categoryStripItems || [])
                  .slice(0, 6)
                  .map((c) => c.category)
                  .filter(Boolean),
              ].map((cat, idx) => (
                <button
                  key={`${cat}-${idx}`}
                  type="button"
                  onClick={() => onNavigateCategory(cat)}
                  className="hover:text-[#111111] cursor-pointer"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-4 space-y-2.5">
            <p className="text-xs font-semibold text-[#111111]">{ft.newsletterTitle}</p>
            <p className="text-xs text-[#666666]">{ft.newsletterDescription}</p>
            {done ? (
              <p className="text-xs font-medium text-[#111111]">Obrigado pela sua subscrição.</p>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex items-center bg-[#F3F3F3] rounded-full overflow-hidden p-1"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="O seu email"
                  className="flex-1 bg-transparent px-3.5 py-1.5 text-xs text-[#111111] placeholder:text-[#888888] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscrever"
                  className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center hover:bg-[#2C2C2C] transition-colors cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#777777]">
          <p>{ft.copyrightText}</p>
          <p>{ft.locationText}</p>
        </div>
      </div>
    </footer>
  );
};
