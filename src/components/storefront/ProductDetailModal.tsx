import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Product, ProductColorVariant } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { reportVisitorStage } from '../../utils/storeTracker';
import { SafeImage } from '../SafeImage';
import { StorefrontBottomBanner } from './StorefrontBottomBanner';

interface OtherProductCardProps {
  product: Product;
  currencySymbol: string;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (productId: string, size: string) => void;
}

const OtherProductCard: React.FC<OtherProductCardProps> = ({
  product,
  currencySymbol,
  isWishlisted,
  onToggleWishlist,
  onOpenProduct,
  onAddToCart,
}) => {
  const sizes = product.sizes.length > 0 ? product.sizes : ['Único'];
  const [chosenSize, setChosenSize] = useState<string>(sizes[0]);
  const [justAdded, setJustAdded] = useState(false);
  const outOfStock = product.stock <= 0;

  useEffect(() => {
    setChosenSize(sizes[0]);
  }, [product.id]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    onAddToCart(product.id, chosenSize);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <article
      onClick={() => onOpenProduct(product)}
      className="group cursor-pointer rounded-[22px] bg-[#F3F3F3] p-3 sm:p-4 pb-4 sm:pb-5 flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
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

      <div className="w-full aspect-[3/4] rounded-[16px] overflow-hidden bg-white p-1.5 sm:p-2 mb-3 flex items-center justify-center">
        <SafeImage
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="mt-auto space-y-2.5 text-center px-1">
        <h3 className="text-[13px] sm:text-[15px] font-medium text-[#111111] leading-snug line-clamp-2 min-h-[2.4em] flex items-center justify-center">
          {product.name}
        </h3>

        <div className="flex items-center justify-center gap-2 tabular-nums">
          <span className="text-xs sm:text-sm font-mono font-semibold text-[#111111]">
            {formatMoney(product.price, currencySymbol)}
          </span>
          {product.originalPrice && (
            <span className="text-[11px] font-mono text-[#888888] line-through">
              {formatMoney(product.originalPrice, currencySymbol)}
            </span>
          )}
        </div>

        {/* Inline quick size pills when product has multiple sizes */}
        {sizes.length > 1 && (
          <div
            className="flex flex-wrap items-center justify-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {sizes.slice(0, 5).map((sz) => {
              const active = chosenSize === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setChosenSize(sz)}
                  className={`min-w-[26px] h-6 px-2 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-white text-[#333333] border-black/15 hover:border-[#111111]'
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          disabled={outOfStock}
          onClick={handleQuickAdd}
          className="w-full py-2 px-3 rounded-full bg-[#111111] text-white text-[11px] sm:text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-[#2B2B2B] disabled:opacity-40 transition-colors cursor-pointer"
        >
          {justAdded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Adicionado</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>{outOfStock ? 'Indisponível' : 'Adicionar ao Saco'}</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};

export const ProductDetailModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    wishlist,
    toggleWishlist,
    settings,
    cart,
    products,
    isCartOpen,
    setIsCartOpen,
    setSelectedCategory,
  } = useStore();

  const pageContainerRef = useRef<HTMLDivElement | null>(null);
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

  const otherProducts = useMemo(() => {
    if (!quickViewProduct) return [];
    return products.filter((p) => p.id !== quickViewProduct.id);
  }, [products, quickViewProduct]);

  useEffect(() => {
    if (quickViewProduct) {
      setSelectedSize(quickViewProduct.sizes[0] || 'Único');
      setQuantity(1);
      setActiveColorIdx(0);
      setShowSizeGuide(false);
      setCopiedShare(false);

      pageContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

      const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
      const priceMap = new Map(products.map((p) => [p.id, p.price]));
      const cartTotal = cart.reduce((s, i) => s + (priceMap.get(i.productId) || 0) * i.quantity, 0);
      reportVisitorStage({
        stage: 'produto',
        productId: quickViewProduct.id,
        productName: quickViewProduct.name,
        cartCount,
        cartTotal,
      });
    }
  }, [quickViewProduct]);

  useEffect(() => {
    if (!quickViewProduct) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCartOpen) {
        setQuickViewProduct(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [quickViewProduct, isCartOpen, setQuickViewProduct]);

  if (!quickViewProduct) return null;

  const isWishlisted = wishlist.includes(quickViewProduct.id);
  const outOfStock = quickViewProduct.stock <= 0;
  const sizes = quickViewProduct.sizes.length > 0 ? quickViewProduct.sizes : ['Único'];
  const activeOption = colorOptions[activeColorIdx] || colorOptions[0];
  const hasMultipleColors = colorOptions.length > 1;
  const totalBagCount = cart.reduce((s, i) => s + i.quantity, 0);

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
      ref={pageContainerRef}
      className="fixed inset-0 z-40 bg-white overflow-y-auto font-sans text-[#111111]"
    >
      {/* Top Sticky Product Page Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-black/8">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setQuickViewProduct(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3F3F3] hover:bg-[#E7E7E7] text-xs font-semibold text-[#111111] transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
            <span>Voltar à Loja</span>
          </button>

          <span className="text-xs sm:text-sm font-medium text-[#666666] truncate">
            {settings.storeName} · {quickViewProduct.category}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Partilhar produto"
              className="w-9 h-9 rounded-full bg-[#F3F3F3] hover:bg-[#E7E7E7] text-[#111111] flex items-center justify-center transition-colors cursor-pointer"
            >
              {copiedShare ? (
                <Check className="w-4 h-4 text-emerald-700" strokeWidth={2.2} />
              ) : (
                <Share2 className="w-4 h-4" strokeWidth={1.9} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label="Abrir saco de compras"
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-[#2A2A2A] transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" strokeWidth={2} />
              <span className="tabular-nums">{totalBagCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Product Content */}
      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-8 sm:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-12 items-start">
          {/* Left Product Gallery Canvas */}
          <div className="md:col-span-6 lg:col-span-7 relative rounded-[24px] sm:rounded-[30px] bg-[#F6F6F6] h-[360px] sm:h-[460px] lg:h-[580px] flex items-center justify-center overflow-hidden">
            {copiedShare && (
              <span className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded-full bg-[#111111] text-white text-[11px] font-medium shadow-sm">
                Link copiado
              </span>
            )}

            <div className="w-full h-full px-14 pt-6 pb-8 flex items-center justify-center">
              <SafeImage
                src={activeOption?.image || quickViewProduct.image}
                alt={`${quickViewProduct.name}${activeOption ? ` - ${activeOption.name}` : ''}`}
                className="w-full h-full object-contain object-center transition-all duration-300"
              />
            </div>

            {/* Right Vertical Color Photo Options */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 max-h-[280px] overflow-y-auto py-1">
              {colorOptions.map((option, idx) => {
                const active = activeColorIdx === idx;
                return (
                  <button
                    key={`${option.name}-${idx}`}
                    type="button"
                    onClick={() => setActiveColorIdx(idx)}
                    title={option.name}
                    aria-label={`Cor ${option.name}`}
                    className={`group/thumb relative w-11 h-12 sm:w-12 sm:h-14 rounded-xl overflow-hidden bg-white p-0.5 transition-all cursor-pointer shrink-0 ${
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

          {/* Right Product Details & Add to Bag */}
          <div className="md:col-span-6 lg:col-span-5 bg-white pt-1 md:pt-2">
            {/* Highlight Badges */}
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
                <h1 className="font-sans text-[22px] sm:text-[26px] lg:text-[28px] font-bold tracking-[-0.02em] text-[#111111] leading-snug">
                  {quickViewProduct.name}
                </h1>
                <p className="text-xs sm:text-[13px] text-[#7A7A7A] mt-1 leading-snug">
                  {quickViewProduct.category}
                  {quickViewProduct.material ? ` · ${quickViewProduct.material}` : ''}
                  {hasMultipleColors && activeOption ? ` · Cor: ${activeOption.name}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => toggleWishlist(quickViewProduct.id)}
                aria-label={isWishlisted ? 'Remover dos favoritos' : 'Guardar nos favoritos'}
                className="w-10 h-10 rounded-full bg-[#F3F3F3] flex items-center justify-center text-[#111111] hover:bg-[#E7E7E7] transition-colors cursor-pointer shrink-0"
              >
                <Heart
                  className={`w-5 h-5 ${isWishlisted ? 'fill-[#111111] text-[#111111]' : 'text-[#111111]'}`}
                  strokeWidth={1.8}
                />
              </button>
            </div>

            {quickViewProduct.description && (
              <p className="mt-4 text-xs sm:text-sm text-[#555555] leading-relaxed">
                {quickViewProduct.description}
              </p>
            )}

            {/* Size Selector + Size Guide */}
            <div className="mt-6">
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
                      className={`min-w-[44px] h-11 px-3.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
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
                    Medidas & Referência ({quickViewProduct.sku})
                  </p>
                  <p className="font-mono text-[10px] text-[#666666]">
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
                    {formatMoney(
                      (quickViewProduct.originalPrice || 0) * quantity,
                      settings.currencySymbol
                    )}
                  </p>
                )}
                <p className="text-[24px] font-bold tracking-tight text-[#111111] tabular-nums leading-none">
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
      </main>

      {/* Bottom Banner below the product details */}
      <StorefrontBottomBanner
        compact
        onShopNow={(cat) => {
          setQuickViewProduct(null);
          if (cat) setSelectedCategory(cat);
          window.requestAnimationFrame(() => {
            const el = document.getElementById('catalog');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }}
      />

      {/* Other Products Customers Can Also Add to the Bag */}
      {otherProducts.length > 0 && (
        <section
          aria-label="Outros produtos que pode adicionar ao saco"
          className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-14 sm:pb-20 space-y-5"
        >
          <div className="flex items-end justify-between gap-4 border-t border-black/8 pt-8">
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight text-[#111111]">
                Também pode adicionar ao saco
              </h2>
              <p className="text-xs sm:text-sm text-[#666666] mt-0.5">
                Escolha o tamanho e adicione outros produtos diretamente ao seu saco
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuickViewProduct(null)}
              className="text-xs sm:text-sm font-medium text-[#111111] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver toda a loja
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {otherProducts.map((other) => (
              <OtherProductCard
                key={other.id}
                product={other}
                currencySymbol={settings.currencySymbol}
                isWishlisted={wishlist.includes(other.id)}
                onToggleWishlist={toggleWishlist}
                onOpenProduct={(p) => setQuickViewProduct(p)}
                onAddToCart={(productId, size) => addToCart(productId, size, 1)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
