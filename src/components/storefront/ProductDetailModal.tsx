import React, { useEffect, useState } from 'react';
import { Heart, Minus, Plus, ShieldCheck, Truck, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatMoney } from '../../utils/currency';
import { SafeImage } from '../SafeImage';

export const ProductDetailModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    wishlist,
    toggleWishlist,
    settings,
  } = useStore();

  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (quickViewProduct) {
      setSelectedSize(quickViewProduct.sizes[0] || 'Único');
      setQuantity(1);
    }
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const isWishlisted = wishlist.includes(quickViewProduct.id);
  const outOfStock = quickViewProduct.stock <= 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 md:p-6"
      onClick={() => setQuickViewProduct(null)}
    >
      <div
        className="relative w-full max-w-4xl bg-[#F8F6F2] rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setQuickViewProduct(null)}
          aria-label="Fechar detalhes do produto"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white text-[#141413] flex items-center justify-center shadow-sm hover:bg-[#EFECE5] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Image */}
        <div className="md:col-span-6 bg-[#F1EEE8] aspect-[3/4] md:aspect-auto md:h-full">
          <SafeImage
            src={quickViewProduct.image}
            alt={quickViewProduct.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Contiguous Purchase Module */}
        <div className="md:col-span-6 p-7 md:p-9 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#66635C] mb-2">
              <span>{quickViewProduct.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{quickViewProduct.sku}</span>
            </div>

            <h2 className="font-serif text-2xl md:text-3xl font-medium text-[#141413] mb-3">
              {quickViewProduct.name}
            </h2>

            <div className="flex items-baseline gap-3 mb-5 tabular-nums">
              <span className="text-xl font-semibold text-[#141413]">
                {formatMoney(quickViewProduct.price, settings.currencySymbol)}
              </span>
              {quickViewProduct.originalPrice && (
                <span className="text-sm text-[#8A857C] line-through">
                  {formatMoney(quickViewProduct.originalPrice, settings.currencySymbol)}
                </span>
              )}
              <span className="text-xs text-[#66635C] ml-auto">
                {quickViewProduct.stock > 0
                  ? `${quickViewProduct.stock} unidades disponíveis`
                  : 'Temporariamente esgotado'}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-[#524F49] mb-6">
              {quickViewProduct.description}
            </p>

            {/* Size Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="font-semibold text-[#141413]">Tamanho</span>
                <span className="text-[#66635C]">{quickViewProduct.colors.join(' / ')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickViewProduct.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[44px] px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      selectedSize === size
                        ? 'bg-[#141413] text-[#F8F6F2] border-[#141413]'
                        : 'bg-white text-[#141413] border-[#141413]/15 hover:border-[#141413]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-[#66635C] py-3 border-t border-b border-[#141413]/10">
              <span className="font-medium text-[#141413]">Composição: </span>
              {quickViewProduct.material}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-[#141413]/15 bg-white rounded-lg h-11">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 h-full text-[#141413] hover:bg-[#F1EEE8] rounded-l-lg cursor-pointer"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-sm font-medium tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(Math.max(1, quickViewProduct.stock), q + 1))
                  }
                  className="px-3 h-full text-[#141413] hover:bg-[#F1EEE8] rounded-r-lg cursor-pointer"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                disabled={outOfStock}
                onClick={() => {
                  addToCart(quickViewProduct.id, selectedSize, quantity);
                  setQuickViewProduct(null);
                }}
                className="flex-1 h-11 px-5 bg-[#141413] text-[#F8F6F2] text-sm font-medium rounded-lg hover:bg-[#2B2B29] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {outOfStock ? 'Esgotado' : 'Adicionar ao Saco'}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(quickViewProduct.id)}
                aria-label="Favorito"
                className="w-11 h-11 rounded-lg border border-[#141413]/15 bg-white flex items-center justify-center text-[#141413] hover:border-[#141413] cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#141413]' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#66635C]">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                Envio gratuito acima de {formatMoney(settings.freeShippingThreshold, settings.currencySymbol)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Trocas gratuitas em 30 dias
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
