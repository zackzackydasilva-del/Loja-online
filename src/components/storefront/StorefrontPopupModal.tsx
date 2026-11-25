import React, { useMemo } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatMoney } from '../../utils/currency';
import { getProductParamFromLocation, resolveCategoryFromParam } from '../../utils/categoryLinks';
import { SafeImage } from '../SafeImage';

export const StorefrontPopupModal: React.FC = () => {
  const {
    activePopup,
    closePopup,
    settings,
    products,
    setQuickViewProduct,
    setIsCartOpen,
    setSelectedCategory,
    setSearchQuery,
  } = useStore();

  const popup = useMemo(() => {
    const cfg = settings.storefrontConfig;
    if (activePopup === 'entry') return cfg.entryPopup || null;
    if (activePopup === 'postCheckout') return cfg.postCheckoutPopup || null;
    return null;
  }, [activePopup, settings.storefrontConfig]);

  const linkedProduct = useMemo(() => {
    if (!popup) return undefined;
    if (popup.productId) {
      const byId = products.find((p) => p.id === popup.productId);
      if (byId) return byId;
    }
    const urlProdId = getProductParamFromLocation(popup.buttonUrl);
    if (urlProdId) {
      return products.find(
        (p) => p.id === urlProdId || p.sku.toLowerCase() === urlProdId.toLowerCase()
      );
    }
    return undefined;
  }, [popup, products]);

  const trimmedUrl = popup?.buttonUrl?.trim() || '';

  const targetCategory = useMemo(() => {
    if (!trimmedUrl || linkedProduct) return null;
    try {
      const parsed = new URL(
        trimmedUrl,
        typeof window !== 'undefined' ? window.location.origin : 'https://lunora.local'
      );
      const rawCat = parsed.searchParams.get('categoria') || parsed.searchParams.get('category');
      if (!rawCat) return null;
      return resolveCategoryFromParam(
        rawCat,
        settings.storefrontConfig.categoryStripItems,
        products.map((p) => p.category)
      );
    } catch {
      return null;
    }
  }, [trimmedUrl, linkedProduct, settings.storefrontConfig.categoryStripItems, products]);

  const isExternalLink = useMemo(() => {
    if (!trimmedUrl || linkedProduct || targetCategory) return false;
    if (typeof window === 'undefined') return trimmedUrl.startsWith('http');
    try {
      const parsed = new URL(trimmedUrl, window.location.origin);
      return parsed.origin !== window.location.origin;
    } catch {
      return false;
    }
  }, [trimmedUrl, linkedProduct, targetCategory]);

  if (!activePopup || !popup || !popup.enabled) return null;

  const hasBannerImage = Boolean(popup.image && popup.image.trim());
  const ctaLabel =
    popup.ctaText?.trim() || (linkedProduct ? 'Ver Produto' : 'Explorar Coleção');

  const handleInAppNavigate = () => {
    closePopup();
    setIsCartOpen(false);
    if (linkedProduct) {
      setQuickViewProduct(linkedProduct);
      return;
    }
    if (targetCategory) {
      setSearchQuery('');
      setSelectedCategory(targetCategory);
    }
    window.setTimeout(() => {
      const el =
        document.getElementById('catalog-grid') || document.getElementById('catalog');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closePopup}
      role="dialog"
      aria-modal="true"
      aria-label={popup.title || 'Notificação da Loja'}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-[26px] overflow-hidden shadow-2xl border border-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closePopup}
          aria-label="Fechar popup"
          className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {hasBannerImage ? (
          <div className="w-full bg-[#111111] overflow-hidden">
            <SafeImage
              src={popup.image}
              alt={popup.title || 'Destaque'}
              className="w-full max-h-[300px] object-cover object-center block"
            />
          </div>
        ) : (
          <div className="w-full bg-[#111111] px-6 pt-7 pb-5 text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/80" />
            <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-white/85">
              {popup.badge || settings.storeName}
            </span>
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            {hasBannerImage && popup.badge && (
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#111111] text-white text-[10px] font-semibold uppercase tracking-wider">
                {popup.badge}
              </span>
            )}
            <h3 className="font-serif text-2xl font-medium text-[#111111] leading-snug">
              {popup.title || 'Novidade na Loja'}
            </h3>
            {popup.subtitle && (
              <p className="text-xs sm:text-sm text-[#555552] leading-relaxed">
                {popup.subtitle}
              </p>
            )}
          </div>

          {linkedProduct && (
            <div
              onClick={handleInAppNavigate}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#F5F4F0] border border-black/6 cursor-pointer hover:bg-[#ECEAE3] transition-colors"
            >
              <div className="w-12 h-14 rounded-xl overflow-hidden bg-white shrink-0">
                <SafeImage
                  src={linkedProduct.image}
                  alt={linkedProduct.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-[#72726E]">{linkedProduct.category}</p>
                <p className="text-xs font-semibold text-[#111111] truncate">
                  {linkedProduct.name}
                </p>
                <p className="text-xs font-mono font-semibold text-[#111111] tabular-nums">
                  {formatMoney(linkedProduct.price, settings.currencySymbol)}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {!linkedProduct && !targetCategory && trimmedUrl ? (
              <a
                href={trimmedUrl}
                target={isExternalLink ? '_blank' : undefined}
                rel={isExternalLink ? 'noopener noreferrer' : undefined}
                onClick={() => {
                  closePopup();
                  setIsCartOpen(false);
                }}
                className="flex-1 py-3 px-5 rounded-full bg-[#111111] text-white text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-[#2B2B2B] transition-colors"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleInAppNavigate}
                className="flex-1 py-3 px-5 rounded-full bg-[#111111] text-white text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-[#2B2B2B] transition-colors cursor-pointer"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={closePopup}
              className="py-3 px-4 rounded-full bg-[#EFEFEF] text-[#333333] text-xs font-medium hover:bg-[#E2E2E2] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
