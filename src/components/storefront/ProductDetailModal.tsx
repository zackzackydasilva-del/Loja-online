import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  Heart,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductColorVariant } from '../../types/store';
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
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const colorOptions = useMemo<ProductColorVariant[]>(() => {
    if (!quickViewProduct) return [];
    const variants = Array.isArray(quickViewProduct.colorVariants)
      ? quickViewProduct.colorVariants.filter((v) => v.name && v.image)
      : [];

    if (variants.length > 0) {
      const mainAlreadyListed = variants.some((v) => v.image === quickViewProduct.image);
      if (mainAlreadyListed) {
        return variants;
      }
      return [
        {
          name: quickViewProduct.colors?.[0] || 'Principal',
          image: quickViewProduct.image,
        },
        ...variants,
      ];
    }

    return [
      {
        name: quickViewProduct.colors?.[0] || 'Principal',
        image: quickViewProduct.image,
      },
    ];
  }, [quickViewProduct]);

  useEffect(() => {
    if (quickViewProduct) {
      setSelectedSize(quickViewProduct.sizes[0] || 'Único');
      setQuantity(1);
      setActiveColorIdx(0);
      setShowSizeGuide(false);
      setCopiedShare(false);
    }
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const isWishlisted = wishlist.includes(quickViewProduct.id);
  const outOfStock = quickViewProduct.stock <= 0;
  const sizes = quickViewProduct.sizes.length > 0 ? quickViewProduct.sizes : ['Único'];
  const activeOption = colorOptions[activeColorIdx] || colorOptions[0];
  const hasMultipleColors = colorOptions.length > 1;

  const hasDiscount =
    Boolean(quickViewProduct.originalPrice) &&
    (quickViewProduct.originalPrice || 0) > quickViewProduct.price;
  const discountPercent = hasDiscount
    ? Math.round(
        (((quickViewProduct.originalPrice || 0) - quickViewProduct.price) /
          (quickViewProduct.originalPrice || 1)) *
          100
      )
    : 0;

  const handleShare = async () => {
    const shareText = `${quickViewProduct.name} — ${formatMoney(
      quickViewProduct.price,
      settings.currencySymbol
    )}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: quickViewProduct.name,
          text: shareText,
          url: window.location.href,
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText} (${window.location.href})`);
      }
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 font-sans"
      onClick={() => setQuickViewProduct(null)}
    >
      <div
        className="relative w-full sm:max-w-[450px] bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Product Gallery Canvas */}
        <div className="relative bg-[#F6F6F6] h-[340px] sm:h-[385px] flex items-center justify-center overflow-hidden">
          {/* Top-Left Back Button */}
          <button
            type="button"
            onClick={() => setQuickViewProduct(null)}
            aria-label="Voltar"
            className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center shadow-md hover:bg-[#2A2A2A] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
          </button>

          {/* Top-Right Share Button */}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Partilhar produto"
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center shadow-md hover:bg-[#2A2A2A] transition-colors cursor-pointer"
          >
            {copiedShare ? (
              <Check className="w-4 h-4" strokeWidth={2.2} />
            ) : (
              <Share2 className="w-4 h-4" strokeWidth={2} />
            )}
          </button>

          {copiedShare && (
            <span className="absolute top-16 right-4 z-20 px-2.5 py-1 rounded-full bg-[#111111] text-white text-[11px] font-medium shadow-sm">
              Link copiado
            </span>
          )}

          {/* Main Uncropped Product Photo for Selected Color */}
          <div className="w-full h-full px-14 pt-6 pb-9 flex items-center justify-center">
            <SafeImage
              src={activeOption?.image || quickViewProduct.image}
              alt={`${quickViewProduct.name}${activeOption ? ` - ${activeOption.name}` : ''}`}
              className="w-full h-full object-contain object-center transition-all duration-300"
            />
          </div>

          {/* Right Vertical Color Photo Options */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 max-h-[250px] overflow-y-auto py-1">
            {colorOptions.map((option, idx) => {
              const active = activeColorIdx === idx;
              return (
                <button
                  key={`${option.name}-${idx}`}
                  type="button"
                  onClick={() => setActiveColorIdx(idx)}
                  title={option.name}
                  aria-label={`Cor ${option.name}`}
                  className={`group/thumb relative w-11 h-12 rounded-xl overflow-hidden bg-white p-0.5 transition-all cursor-pointer shrink-0 ${
                    active
                      ? 'border-2 border-[#111111] shadow-sm scale-105'
                      : 'border border-black/15 opacity-80 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={option.image}
                    alt={`${quickViewProduct.name} - ${option.name}`}
                    className="w-full h-full object-contain object-center rounded-[9px]"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Overlapping Rounded White Product Details Sheet */}
        <div className="relative z-20 -mt-6 bg-white rounded-t-[28px] px-6 pt-6 pb-7">
          {/* Top Highlight Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
            {(quickViewProduct.isNew || !hasDiscount) && (
              <span className="px-3 py-1 rounded-full bg-[#FF9F5A] text-[#111111] text-[11px] font-medium leading-none">
                {quickViewProduct.isNew ? 'Novo' : quickViewProduct.category}
              </span>
            )}
            {hasDiscount ? (
              <span className="px-3 py-1 rounded-full bg-[#73F37B] text-[#111111] text-[11px] font-medium leading-none">
                Desconto {discountPercent}%
              </span>
            ) : quickViewProduct.onSale ? (
              <span className="px-3 py-1 rounded-full bg-[#73F37B] text-[#111111] text-[11px] font-medium leading-none">
                Saldos
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-[#73F37B] text-[#111111] text-[11px] font-medium leading-none">
                {outOfStock ? 'Esgotado' : 'Em Stock'}
              </span>
            )}
          </div>

          {/* Title, Subtitle + Active Color & Wishlist Heart */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-sans text-[21px] sm:text-[23px] font-bold tracking-[-0.02em] text-[#111111] leading-snug">
                {quickViewProduct.name}
              </h2>
              <p className="text-xs sm:text-[13px] text-[#7A7A7A] mt-0.5 leading-snug">
                {quickViewProduct.category}
                {quickViewProduct.material ? ` · ${quickViewProduct.material}` : ''}
                {hasMultipleColors && activeOption ? ` · Cor: ${activeOption.name}` : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleWishlist(quickViewProduct.id)}
              aria-label={isWishlisted ? 'Remover dos favoritos' : 'Guardar nos favoritos'}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#111111] hover:bg-[#F3F3F3] transition-colors cursor-pointer shrink-0"
            >
              <Heart
                className={`w-5 h-5 ${isWishlisted ? 'fill-[#111111] text-[#111111]' : 'text-[#111111]'}`}
                strokeWidth={1.8}
              />
            </button>
          </div>

          {/* Size Selector + Size Guide */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-[#111111]">Selecionar tamanho</span>
              <button
                type="button"
                onClick={() => setShowSizeGuide((v) => !v)}
                className="text-xs text-[#666666] underline underline-offset-2 hover:text-[#111111] cursor-pointer"
              >
                Guia de Tamanhos
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {sizes.map((size) => {
                const selected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[44px] h-11 px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#111111] border-black/15 hover:border-[#111111]'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {showSizeGuide && (
              <div className="mt-3 rounded-2xl bg-[#F5F5F5] p-3.5 text-[11px] text-[#444444] space-y-1.5">
                <p className="font-semibold text-[#111111]">
                  Medidas & Descrição ({quickViewProduct.sku})
                </p>
                {quickViewProduct.description && (
                  <p className="leading-relaxed text-[#555555]">{quickViewProduct.description}</p>
                )}
                <p className="font-mono text-[10px] text-[#666666] pt-1">
                  S (88–94 cm) · M (95–100 cm) · L (101–107 cm) · XL (108–114 cm)
                </p>
              </div>
            )}
          </div>

          {/* Qty Stepper & Total Price */}
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#111111] mb-2">Qtd</p>
              <div className="inline-flex items-center bg-[#F3F3F3] rounded-full h-11 px-1.5 gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#111111] hover:bg-white transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="min-w-[20px] text-center text-sm font-semibold text-[#111111] tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(Math.max(1, quickViewProduct.stock), q + 1))
                  }
                  aria-label="Aumentar quantidade"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#111111] hover:bg-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold text-[#111111] mb-1">Preço total</p>
              {hasDiscount && (
                <p className="text-xs text-[#999999] line-through tabular-nums">
                  {formatMoney((quickViewProduct.originalPrice || 0) * quantity, settings.currencySymbol)}
                </p>
              )}
              <p className="text-[22px] font-bold tracking-tight text-[#111111] tabular-nums leading-none">
                {formatMoney(quickViewProduct.price * quantity, settings.currencySymbol)}
              </p>
            </div>
          </div>

          {/* Full-Width Black Pill CTA Button */}
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => {
              const sizeLabel =
                hasMultipleColors && activeOption?.name
                  ? `${selectedSize} · ${activeOption.name}`
                  : selectedSize;
              addToCart(quickViewProduct.id, sizeLabel, quantity);
              setQuickViewProduct(null);
            }}
            className="mt-6 w-full h-[52px] rounded-full bg-[#111111] text-white text-sm font-semibold inline-flex items-center justify-center gap-2.5 hover:bg-[#262626] disabled:opacity-45 transition-colors cursor-pointer shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={2} />
            <span>{outOfStock ? 'Indisponível' : 'Adicionar ao Saco'}</span>
          </button>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#777777]">
            <span>Pagamento apenas na entrega</span>
            <span className="tabular-nums">
              {outOfStock ? 'Sem stock' : `${quickViewProduct.stock} unidades disponíveis`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
