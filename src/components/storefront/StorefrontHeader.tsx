import React, { useState } from 'react';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory } from '../../types/store';

interface StorefrontHeaderProps {
  onNavigateSection: (sectionId: string, category?: ProductCategory | 'Todos') => void;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({ onNavigateSection }) => {
  const {
    cart,
    setIsCartOpen,
    setActiveAppView,
    searchQuery,
    setSearchQuery,
    settings,
  } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);

  const cfg = settings.storefrontConfig;
  const wordmark = cfg.headerWordmark || settings.storeName.toUpperCase();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-[#F8F6F2]/95 backdrop-blur-md border-b border-[#141413]/10">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigateSection('top', 'Todos')}
          className="font-serif text-2xl tracking-[0.14em] font-semibold text-[#141413] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141413]"
        >
          {wordmark}
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#524F49]">
          <button
            type="button"
            onClick={() => onNavigateSection('collections', 'Todos')}
            className="hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.collections}
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('catalog', 'Mulher')}
            className="hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.apparel}
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('catalog', 'Malas')}
            className="hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.accessories}
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('catalog', 'Saldos')}
            className="hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.sale}
          </button>
          <button
            type="button"
            onClick={() => setActiveAppView('admin')}
            className="text-[#141413] font-semibold underline underline-offset-4 decoration-[#141413]/30 hover:decoration-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.admin}
          </button>
        </nav>

        {/* Zone 3: Search & Bag Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Pesquisar catálogo"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#141413] hover:bg-[#141413]/5 transition-colors cursor-pointer"
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveAppView('admin')}
            className="md:hidden px-3 py-2 text-xs font-medium text-[#141413] border border-[#141413]/20 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.admin}
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#141413] text-[#F8F6F2] text-xs font-medium rounded-lg hover:bg-[#2B2B29] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="tabular-nums">Saco ({totalItems})</span>
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#141413]/10 bg-[#F8F6F2] px-6 md:px-10 py-3">
          <div className="max-w-[1280px] mx-auto flex items-center gap-3">
            <Search className="w-4 h-4 text-[#66635C] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onNavigateSection('catalog');
              }}
              placeholder="Procurar blazer, vestido, malas em pele, óculos..."
              className="w-full bg-transparent text-sm text-[#141413] placeholder:text-[#8A857C] focus:outline-none py-1.5"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#66635C] hover:text-[#141413] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
