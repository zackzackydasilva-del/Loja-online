import React, { useEffect, useState } from 'react';
import { ChevronsRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SafeImage } from '../SafeImage';
import { ProductCategory } from '../../types/store';
import { DEFAULT_STOREFRONT_CONFIG } from '../../data/seedData';

interface StorefrontBottomBannerProps {
  onShopNow: (category?: ProductCategory | 'Todos') => void;
  compact?: boolean;
}

export const StorefrontBottomBanner: React.FC<StorefrontBottomBannerProps> = ({
  onShopNow,
  compact = false,
}) => {
  const { settings } = useStore();
  const cfg = settings.storefrontConfig;
  const fallbackBanner = DEFAULT_STOREFRONT_CONFIG.bottomBanner!;
  const bottomBanner = cfg.bottomBanner || fallbackBanner;
  const slides = Array.isArray(bottomBanner.slides) ? bottomBanner.slides : [];
  const visualSlides = slides.filter((s) => Boolean(s.image && s.image.trim()));
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (visualSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % visualSlides.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [visualSlides.length, activeSlide]);

  const safeSlideIdx = activeSlide < visualSlides.length ? activeSlide : 0;
  const currentSlide = visualSlides[safeSlideIdx];
  const hasVisualSlides = visualSlides.length > 0;

  return (
    <section
      aria-label="Banner de destaque após produtos"
      className={compact ? 'bg-white pt-2 pb-6 sm:pb-8' : 'bg-white pt-2 pb-10 sm:pb-14'}
    >
      <div className="max-w-[1360px] lg:max-w-[820px] xl:max-w-[880px] mx-auto px-4 sm:px-6 lg:px-8">
        {hasVisualSlides && currentSlide ? (
          <div className="relative rounded-[22px] sm:rounded-[28px] overflow-hidden bg-[#09090B] text-white shadow-[0_14px_34px_-18px_rgba(0,0,0,0.4)]">
            {/* Complete full-bleed image filling the entire banner with zero empty space */}
            <SafeImage
              src={currentSlide.image}
              alt={currentSlide.caption || bottomBanner.title}
              className="w-full h-auto block transition-opacity duration-300"
            />

            {/* Dark effects strictly on the outer borders/edges only */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_54px_14px_rgba(9,9,11,0.9)] sm:shadow-[inset_0_0_88px_22px_rgba(9,9,11,0.92)]" />
            <div className="absolute inset-x-0 top-0 h-8 sm:h-12 lg:h-14 bg-gradient-to-b from-[#09090B]/85 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-10 sm:h-14 lg:h-16 bg-gradient-to-t from-[#09090B]/90 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 left-0 w-8 sm:w-14 lg:w-16 bg-gradient-to-r from-[#09090B]/85 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-8 sm:w-14 lg:w-16 bg-gradient-to-l from-[#09090B]/85 to-transparent pointer-events-none" />

            {/* Overlay Copy, Thumbnails & White CTA */}
            <div className="absolute inset-0 z-10 p-4 sm:p-8 lg:p-9 flex flex-col justify-between pointer-events-none">
              <div className="max-w-[72%] sm:max-w-lg">
                <h2 className="text-[16px] sm:text-3xl lg:text-[32px] xl:text-[36px] font-semibold tracking-tight uppercase leading-[1.08] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {bottomBanner.title || fallbackBanner.title}
                </h2>
                <p className="text-[10px] sm:text-sm lg:text-[14px] text-white/90 leading-snug lg:leading-relaxed line-clamp-2 sm:line-clamp-3 mt-1 sm:mt-2.5 max-w-md drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                  {bottomBanner.subtitle || fallbackBanner.subtitle}
                </p>

                {visualSlides.length > 1 && (
                  <div className="flex items-center gap-2 sm:gap-2.5 mt-3 sm:mt-4 pointer-events-auto">
                    {visualSlides.slice(0, 3).map((slide, idx) => {
                      const isSelected = safeSlideIdx === idx;
                      return (
                        <button
                          key={`${slide.index}-${idx}`}
                          type="button"
                          onClick={() => setActiveSlide(idx)}
                          aria-label={`Ver imagem ${idx + 1}`}
                          className={`w-9 h-10 sm:w-12 sm:h-13 lg:w-13 lg:h-14 rounded-lg sm:rounded-xl overflow-hidden bg-black/40 border transition-all cursor-pointer shrink-0 ${
                            isSelected
                              ? 'border-white ring-1 ring-white/50 opacity-100 scale-[1.03]'
                              : 'border-white/25 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <SafeImage
                            src={slide.image}
                            alt={slide.caption}
                            className="w-full h-full object-cover object-top"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => onShopNow(bottomBanner.targetCategory || 'Todos')}
                  className="inline-flex items-center gap-1.5 px-4 sm:px-6 lg:px-6 py-2 sm:py-2.5 lg:py-2.5 rounded-full bg-white text-[#111111] text-[11px] sm:text-xs lg:text-[13px] font-semibold hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-md"
                >
                  <span>{bottomBanner.ctaText || fallbackBanner.ctaText}</span>
                  <ChevronsRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty dark card before images are uploaded from Gestão */
          <div className="relative rounded-[22px] sm:rounded-[28px] overflow-hidden bg-[radial-gradient(circle_at_74%_44%,#2C2C32_0%,#141417_54%,#09090B_100%)] text-white p-6 sm:p-9 lg:p-9 xl:p-10 min-h-[210px] sm:min-h-[280px] lg:min-h-[270px] xl:min-h-[290px] flex flex-col justify-between shadow-[0_14px_34px_-18px_rgba(0,0,0,0.4)]">
            <div className="max-w-2xl">
              <h2 className="text-[18px] sm:text-3xl lg:text-[34px] xl:text-[38px] font-semibold tracking-tight uppercase leading-[1.08] text-white">
                {bottomBanner.title || fallbackBanner.title}
              </h2>
              <p className="text-[11px] sm:text-sm lg:text-[14px] text-white/75 leading-snug lg:leading-relaxed line-clamp-2 sm:line-clamp-3 mt-1.5 sm:mt-3 max-w-xl">
                {bottomBanner.subtitle || fallbackBanner.subtitle}
              </p>
            </div>

            <div className="pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => onShopNow(bottomBanner.targetCategory || 'Todos')}
                className="inline-flex items-center gap-1.5 px-4 sm:px-6 lg:px-6 py-2 sm:py-2.5 lg:py-2.5 rounded-full bg-white text-[#111111] text-[11px] sm:text-xs lg:text-[13px] font-semibold hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                <span>{bottomBanner.ctaText || fallbackBanner.ctaText}</span>
                <ChevronsRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}

        {/* Centered Slide Indicator Dots (▬ • •) */}
        {visualSlides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-3.5 pb-1">
            {visualSlides.map((slide, idx) => {
              const active = safeSlideIdx === idx;
              return (
                <button
                  key={`${slide.index}-${idx}`}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Slide inferior ${idx + 1}`}
                  className={`h-1 rounded-full transition-all cursor-pointer ${
                    active ? 'w-5 bg-[#111111]' : 'w-1.5 bg-black/20 hover:bg-black/40'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
