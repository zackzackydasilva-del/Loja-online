import React from 'react';
import { Heart, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory } from '../../types/store';

interface StorefrontHeaderProps {
  onNavigateSection: (sectionId: string, category?: ProductCategory | 'Todos') => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  onOpenProfile: () => void;
  wishlistOnly?: boolean;
  onToggleWishlist?: () => void;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({
  onNavigateSection,
  searchOpen,
  onToggleSearch,
  onOpenProfile,
  wishlistOnly = false,
  onToggleWishlist,
}) => {
  const {
    cart,
    wishlist,
    setIsCartOpen,
    searchQuery,
    setSearchQuery,
    settings,
  } = useStore();

  const cfg = settings.storefrontConfig;
  const wordmark = cfg.headerWordmark || settings.storeName.toUpperCase();
  const topNotice =
    cfg.topNoticeText?.trim() ||
    'Pagamento feito apenas na entrega · Pague apenas quando receber a sua encomenda';
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-black/[0.06]">
      <div className="bg-[#111111] text-white text-[11px] sm:text-xs font-medium py-1.5 overflow-hidden tracking-wide select-none">
        <div className="lunora-marquee-track">
          {[0, 1].map((loopIdx) => (
            <div key={loopIdx} className="flex shrink-0 items-center">
              {[0, 1, 2, 3].map((copyIdx) => (
                <span key={`${loopIdx}-${copyIdx}`} className="whitespace-nowrap px-6 sm:px-10">
                  {topNotice}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-12 sm:h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigateSection('top', 'Todos')}
          className="font-serif text-[22px] sm:text-2xl tracking-[0.12em] font-semibold text-[#111111] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111111]"
        >
          {wordmark}
        </button>

        {/* Zone 2: Clean Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-10 text-[13px] lg:text-sm font-medium text-[#555555]">
          <button
            type="button"
            onClick={() => onNavigateSection('top', 'Todos')}
            className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.collections}
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('catalog', 'Mulher')}
            className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.apparel}
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('catalog', 'Malas')}
            className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.accessories}
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('catalog', 'Saldos')}
            className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {cfg.navLabels.sale}
          </button>
        </nav>

        {/* Zone 3: Minimalist Search, Wishlist (PC), Profile & Shopping Bag Icon */}
        <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleSearch}
            aria-label="Pesquisar catálogo"
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full text-[#111111] hover:bg-[#F3F3F3] transition-colors cursor-pointer"
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {onToggleWishlist && (
            <button
              type="button"
              onClick={onToggleWishlist}
              aria-label={`Favoritos (${wishlist.length})`}
              title="Ver Favoritos"
              className={`hidden md:flex relative w-9 h-9 items-center justify-center rounded-full transition-colors cursor-pointer ${
                wishlistOnly
                  ? 'bg-[#111111] text-white'
                  : 'text-[#111111] hover:bg-[#F3F3F3]'
              }`}
            >
              <Heart
                className={`w-[17px] h-[17px] ${wishlistOnly ? 'fill-white' : ''}`}
                strokeWidth={1.85}
              />
              {wishlist.length > 0 && !wishlistOnly && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#111111] text-white text-[9px] font-mono font-semibold flex items-center justify-center tabular-nums">
                  {wishlist.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Perfil e Newsletter"
            className="hidden md:flex w-9 h-9 items-center justify-center rounded-full text-[#111111] hover:bg-[#F3F3F3] transition-colors cursor-pointer"
          >
            <User className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`Abrir saco (${totalItems} artigos)`}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#111111] hover:bg-[#F3F3F3] transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />
            {totalItems > 0 && (
              <span className="absolute top-1 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#111111] text-white text-[10px] font-mono font-semibold flex items-center justify-center tabular-nums">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-black/[0.06] bg-white px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-[1360px] mx-auto flex items-center gap-3 bg-[#F3F3F3] rounded-full px-4 py-1.5">
            <Search className="w-4 h-4 text-[#666666] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onNavigateSection('catalog');
              }}
              placeholder="Procurar casacos, vestidos, tops, malas..."
              className="w-full bg-transparent text-xs sm:text-sm text-[#111111] placeholder:text-[#888888] focus:outline-none py-1"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-medium text-[#555555] hover:text-[#111111] whitespace-nowrap shrink-0 cursor-pointer"
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
