import React, { useMemo } from 'react';
import { ArrowRight, Heart, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { SafeImage } from '../SafeImage';

function normalizeSearchStr(val: string): string {
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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
    products,
    setIsCartOpen,
    setQuickViewProduct,
    setSelectedCategory,
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

  const normalizedQuery = normalizeSearchStr(searchQuery);
  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return products.filter((p) => p.featured).slice(0, 4);
    }
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      const haystack = normalizeSearchStr(
        [p.name, p.category, p.description, p.material, p.sku, ...(p.colors || [])].join(' ')
      );
      return terms.every((term) => haystack.includes(term));
    });
  }, [products, normalizedQuery]);

  const scrollToCatalogResults = () => {
    if (searchOpen) onToggleSearch();
    setSelectedCategory('Todos');
    window.setTimeout(() => {
      const el =
        document.getElementById('catalog-grid') || document.getElementById('catalog');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

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
            className={`flex w-9 h-9 items-center justify-center rounded-full transition-colors cursor-pointer ${
              searchOpen
                ? 'bg-[#111111] text-white'
                : 'text-[#111111] hover:bg-[#F3F3F3]'
            }`}
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

      {/* Expandable Search Bar + Instant Live Results */}
      {searchOpen && (
        <div className="border-t border-black/[0.06] bg-white px-4 sm:px-6 lg:px-8 py-3 shadow-lg">
          <div className="max-w-[1360px] mx-auto space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                scrollToCatalogResults();
              }}
              className="flex items-center gap-3 bg-[#F3F3F3] rounded-full px-4 py-2"
            >
              <Search className="w-4 h-4 text-[#666666] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar peças, categorias, cores ou estilos..."
                className="w-full bg-transparent text-xs sm:text-sm text-[#111111] placeholder:text-[#888888] focus:outline-none py-0.5"
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
              <button
                type="submit"
                className="px-3 py-1 rounded-full bg-[#111111] text-white text-[11px] font-medium hover:bg-[#2B2B2B] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ver na loja
              </button>
            </form>

            {/* Quick Live Search Results */}
            <div className="max-h-[58vh] overflow-y-auto pr-1 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#666666]">
                <span className="font-semibold uppercase tracking-wider">
                  {normalizedQuery
                    ? `Resultados (${searchResults.length})`
                    : 'Sugestões em Destaque'}
                </span>
                {normalizedQuery && searchResults.length > 0 && (
                  <button
                    type="button"
                    onClick={scrollToCatalogResults}
                    className="inline-flex items-center gap-1 font-medium text-[#111111] hover:underline cursor-pointer"
                  >
                    <span>Ver todos no catálogo</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {searchResults.length === 0 ? (
                <div className="rounded-2xl bg-[#F6F6F4] p-5 text-center space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-[#111111]">
                    Nenhum produto encontrado para &ldquo;{searchQuery.trim()}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-black/10 text-xs font-medium text-[#111111] hover:bg-black/5 cursor-pointer"
                  >
                    Mostrar sugestões
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pb-1">
                  {searchResults.slice(0, 8).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        onToggleSearch();
                        setQuickViewProduct(product);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#F6F6F4] hover:bg-[#ECEAE3] text-left transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-14 rounded-xl bg-white overflow-hidden shrink-0">
                        <SafeImage
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-[#777777] truncate">{product.category}</p>
                        <p className="text-xs font-semibold text-[#111111] truncate">
                          {product.name}
                        </p>
                        <p className="text-xs font-mono font-semibold text-[#111111] tabular-nums mt-0.5">
                          {formatMoney(product.price, settings.currencySymbol)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
