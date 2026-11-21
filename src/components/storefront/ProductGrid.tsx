import React, { useMemo, useState } from 'react';
import { ArrowRight, Heart, Plus, Star } from 'lucide-react';
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

export const ProductGrid: React.FC = () => {
  const {
    products,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    wishlist,
    toggleWishlist,
    addToCart,
    setQuickViewProduct,
    setActiveAppView,
    settings,
  } = useStore();

  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const cfg = settings.storefrontConfig;

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
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
    if (sortBy === 'rating') return [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (product.stock <= 0) return;
    addToCart(product.id, product.sizes[0] || 'Único', 1);
  };

  return (
    <section id="catalog" className="max-w-[1280px] mx-auto px-6 md:px-10 py-10">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-[#66635C] mb-1.5">
            {cfg.catalogEyebrow}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-[#141413]">
            {cfg.catalogTitle}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Ordenar produtos"
            className="bg-white border border-[#141413]/12 rounded-lg px-3 py-2 text-xs font-medium text-[#141413] focus:outline-none focus:border-[#141413] cursor-pointer"
          >
            <option value="featured">Destaques</option>
            <option value="price-asc">Preço: Menor para Maior</option>
            <option value="price-desc">Preço: Maior para Menor</option>
            <option value="rating">Melhor Avaliação</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSelectedCategory('Todos');
              setSearchQuery('');
            }}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-[#141413] hover:opacity-70 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Ver Todos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Segmented Interactive Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-8">
        {FILTER_TABS.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#141413] text-[#F8F6F2]'
                  : 'bg-[#EFECE5] text-[#524F49] hover:text-[#141413] hover:bg-[#E7E3DA]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#141413]/8 p-12 text-center">
          <p className="font-serif text-xl text-[#141413] mb-2">
            {products.length === 0
              ? 'O catálogo da loja aguarda as primeiras peças'
              : 'Nenhuma peça encontrada nesta seleção'}
          </p>
          <p className="text-sm text-[#66635C] mb-6">
            {products.length === 0
              ? 'Registe novos produtos no painel de Gestão para que apareçam automaticamente aqui.'
              : 'Experimente limpar o filtro de pesquisa ou explorar toda a coleção.'}
          </p>
          {products.length === 0 ? (
            <button
              type="button"
              onClick={() => setActiveAppView('admin')}
              className="px-5 py-2.5 bg-[#141413] text-[#F8F6F2] text-xs font-medium rounded-lg hover:bg-[#2B2B29] transition-colors cursor-pointer"
            >
              Ir para Gestão & Registar Produto
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Todos');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-[#141413] text-[#F8F6F2] text-xs font-medium rounded-lg hover:bg-[#2B2B29] transition-colors cursor-pointer"
            >
              Repor Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const isWishlisted = wishlist.includes(product.id);
            const outOfStock = product.stock <= 0;

            return (
              <article
                key={product.id}
                onClick={() => setQuickViewProduct(product)}
                className="group cursor-pointer flex flex-col"
              >
                {/* Studio Product Image Surface */}
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#F1EEE8] border border-[#141413]/6 mb-3.5">
                  <SafeImage
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />

                  {/* Subtle top-left text tag */}
                  {(outOfStock || product.onSale || product.isNew) && (
                    <span className="absolute top-3 left-3 text-[11px] font-medium tracking-wide text-[#141413] bg-[#F8F6F2]/90 backdrop-blur-sm px-2.5 py-1 rounded">
                      {outOfStock ? 'Esgotado' : product.onSale ? 'Saldos' : 'Novo'}
                    </span>
                  )}

                  {/* Wishlist Heart */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(product.id);
                    }}
                    aria-label={isWishlisted ? 'Remover dos favoritos' : 'Guardar nos favoritos'}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-[#141413] hover:bg-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Heart
                      className={`w-4 h-4 ${isWishlisted ? 'fill-[#141413]' : ''}`}
                      strokeWidth={1.6}
                    />
                  </button>

                  {/* Hover Quick-Add CTA */}
                  <div className="absolute inset-x-3 bottom-3 opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={(e) => handleQuickAdd(e, product)}
                      className="w-full py-2.5 px-3 bg-[#141413]/95 text-[#F8F6F2] text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#141413] disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{outOfStock ? 'Indisponível' : 'Adicionar ao Saco'}</span>
                    </button>
                  </div>
                </div>

                {/* Clean Unboxed Metadata */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#66635C] mb-1">
                  <span>{product.category}</span>
                  <span>{product.stock > 0 ? `${product.stock} em stock` : 'Sem stock'}</span>
                </div>

                <h3 className="text-[15px] font-semibold text-[#141413] leading-snug mb-1 group-hover:underline underline-offset-4">
                  {product.name}
                </h3>

                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                  <div className="flex items-baseline gap-2 tabular-nums">
                    <span className="text-[15px] font-semibold text-[#141413]">
                      {formatMoney(product.price, settings.currencySymbol)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-[#8A857C] line-through">
                        {formatMoney(product.originalPrice, settings.currencySymbol)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-[#524F49] tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#C29B53] text-[#C29B53]" />
                    <span>{product.rating.toFixed(1)}</span>
                    <span className="text-[#8A857C]">({product.reviewCount})</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
