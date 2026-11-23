import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Plus } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductCategory } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { SafeImage } from '../SafeImage';

const FILTER_TABS: (ProductCategory | 'Todos')[] = [
  'Todos',
  'Mulher',
  'Homem',
  'Vestidos',
  'Tops',
  'Calçado',
  'Malas',
  'Acessórios',
  'Saldos',
];

interface ProductGridProps {
  wishlistOnly: boolean;
  onResetView: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  wishlistOnly,
  onResetView,
}) => {
  const {
    products,
    isStoreLoaded,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    wishlist,
    toggleWishlist,
    setQuickViewProduct,
    settings,
  } = useStore();

  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const cfg = settings.storefrontConfig;

  const favoriteCarouselProducts = useMemo(() => {
    const featured = products.filter((p) => p.featured || wishlist.includes(p.id));
    if (featured.length >= 4) return featured;
    const seen = new Set(featured.map((p) => p.id));
    return [...featured, ...products.filter((p) => !seen.has(p.id))];
  }, [products, wishlist]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (wishlistOnly && !wishlist.includes(p.id)) {
        return false;
      }

      const matchesCat =
        selectedCategory === 'Todos'
          ? true
          : selectedCategory === 'Saldos'
          ? Boolean(p.onSale || p.originalPrice)
          : p.category === selectedCategory;

      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query);

      return matchesCat && matchesSearch;
    });

    if (sortBy === 'price-asc') return [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, selectedCategory, searchQuery, sortBy, wishlistOnly, wishlist]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    const el = carouselRef.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.72));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const renderProductCard = (product: Product, wrapperClass = '') => {
    const isWishlisted = wishlist.includes(product.id);
    const outOfStock = product.stock <= 0;

    return (
      <article
        key={product.id}
        onClick={() => setQuickViewProduct(product)}
        className={`group cursor-pointer rounded-[22px] bg-[#F3F3F3] p-3 sm:p-4 pb-4 sm:pb-5 flex flex-col transition-transform duration-200 hover:-translate-y-0.5 ${wrapperClass}`}
      >
        {/* Top Row: Wishlist Heart + Status label completely clear of the product photo */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label={isWishlisted ? 'Remover dos favoritos' : 'Guardar nos favoritos'}
            className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer shrink-0"
          >
            <Heart
              className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-white text-white' : 'text-white'}`}
              strokeWidth={1.9}
            />
          </button>

          {outOfStock ? (
            <span className="text-[11px] font-medium text-[#666666]">Esgotado</span>
          ) : product.onSale ? (
            <span className="text-[11px] font-semibold text-[#111111]">Saldos</span>
          ) : (
            <span className="text-[11px] text-[#777777]">{product.category}</span>
          )}
        </div>

        {/* Full Uncropped Product Image Area */}
        <div className="w-full aspect-[3/4] rounded-[16px] overflow-hidden bg-white p-1.5 sm:p-2 mb-3.5 flex items-center justify-center">
          <SafeImage
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>

        {/* Product Info & Price Bar cleanly BELOW the photo (never overlapping) */}
        <div className="mt-auto space-y-2.5 text-center px-1">
          <h3 className="text-[13px] sm:text-[15px] font-medium text-[#111111] leading-snug line-clamp-2 min-h-[2.4em] flex items-center justify-center">
            {product.name}
          </h3>

          <div className="flex items-center justify-center gap-2 tabular-nums">
            <span className="text-xs sm:text-sm font-mono font-semibold text-[#111111]">
              {formatMoney(product.price, settings.currencySymbol)}
            </span>
            {product.originalPrice && (
              <span className="text-[11px] font-mono text-[#888888] line-through">
                {formatMoney(product.originalPrice, settings.currencySymbol)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={(e) => handleQuickAdd(e, product)}
            className="w-full py-2 px-3 rounded-full bg-[#111111] text-white text-[11px] sm:text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-[#2B2B2B] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{outOfStock ? 'Indisponível' : 'Adicionar ao Saco'}</span>
          </button>
        </div>
      </article>
    );
  };

  return (
    <section
      id="catalog"
      className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-10 lg:pb-12 space-y-8 lg:space-y-10"
    >
      {/* ALWAYS-VISIBLE HORIZONTAL CAROUSEL: "As Nossas Escolhas Favoritas" */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[17px] sm:text-xl lg:text-2xl font-semibold text-[#111111] tracking-tight">
            {cfg.catalogTitle || 'As Nossas Escolhas Favoritas'}
          </h2>

          <div className="flex items-center gap-2 shrink-0">
            {favoriteCarouselProducts.length > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollCarousel('left')}
                  aria-label="Rolar para a esquerda"
                  className="w-8 h-8 rounded-full bg-[#EFEFEF] hover:bg-[#111111] hover:text-white text-[#111111] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel('right')}
                  aria-label="Rolar para a direita"
                  className="w-8 h-8 rounded-full bg-[#EFEFEF] hover:bg-[#111111] hover:text-white text-[#111111] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onResetView();
                setSelectedCategory('Todos');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-medium text-[#555555] hover:text-[#111111] transition-colors whitespace-nowrap shrink-0 cursor-pointer ml-1"
            >
              <span>Ver Todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {favoriteCarouselProducts.length === 0 && !isStoreLoaded ? (
          <div className="flex items-stretch gap-4 sm:gap-5 overflow-hidden pb-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={`skel-card-${idx}`}
                className="w-[68%] sm:w-[44%] md:w-[31%] lg:w-[23.8%] shrink-0 rounded-[22px] bg-[#F3F3F3] p-4 space-y-3 animate-pulse"
              >
                <div className="flex justify-between items-center">
                  <div className="w-8 h-8 rounded-full bg-black/8" />
                  <div className="w-14 h-3 rounded-full bg-black/8" />
                </div>
                <div className="w-full aspect-[3/4] rounded-[16px] bg-white/80" />
                <div className="h-4 w-3/4 mx-auto rounded-full bg-black/8" />
                <div className="h-3 w-1/3 mx-auto rounded-full bg-black/8" />
                <div className="h-8 w-full rounded-full bg-black/10" />
              </div>
            ))}
          </div>
        ) : favoriteCarouselProducts.length > 0 ? (
          <div
            ref={carouselRef}
            className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {favoriteCarouselProducts.map((product) =>
              renderProductCard(
                product,
                'w-[68%] sm:w-[44%] md:w-[31%] lg:w-[23.8%] shrink-0 snap-start'
              )
            )}
          </div>
        ) : null}
      </div>

      {/* FILTERABLE CATALOG GRID SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FILTER_TABS.map((cat) => {
              const active = !wishlistOnly && selectedCategory === cat;
              const label = cat === 'Todos' ? 'Novidades & Destaques' : cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    if (wishlistOnly) onResetView();
                    setSelectedCategory(cat);
                  }}
                  className={`px-4 py-2 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#EFEFEF] text-[#333333] hover:bg-[#E4E4E4]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {products.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              <span className="hidden lg:inline text-xs text-[#777777] font-mono tabular-nums">
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1 ? 'artigo' : 'artigos'}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Ordenar produtos"
                className="bg-[#EFEFEF] rounded-full px-3.5 py-2 text-xs font-medium text-[#111111] focus:outline-none cursor-pointer shrink-0"
              >
                <option value="featured">Destaques</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
              </select>
            </div>
          )}
        </div>

        {wishlistOnly && (
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#111111]">
              Favoritos ({filteredProducts.length})
            </h3>
            <button
              type="button"
              onClick={onResetView}
              className="text-xs font-medium text-[#555555] hover:text-[#111111] cursor-pointer"
            >
              Mostrar todo o catálogo
            </button>
          </div>
        )}

        {filteredProducts.length === 0 && products.length > 0 ? (
          <div className="bg-[#F3F3F3] rounded-[22px] p-10 text-center">
            <p className="text-base sm:text-lg font-semibold text-[#111111] mb-1.5">
              {wishlistOnly
                ? 'Ainda não guardou nenhum artigo nos favoritos'
                : 'Nenhuma peça encontrada nesta seleção'}
            </p>
            <p className="text-xs sm:text-sm text-[#666666] mb-5">
              Toque no coração de um artigo para guardar ou explore toda a coleção.
            </p>
            <button
              type="button"
              onClick={() => {
                onResetView();
                setSelectedCategory('Todos');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-[#111111] text-white text-xs font-medium rounded-full hover:bg-[#2A2A2A] transition-colors cursor-pointer"
            >
              Ver Todos os Artigos
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {filteredProducts.map((product) => renderProductCard(product))}
          </div>
        ) : null}
      </div>
    </section>
  );
};
