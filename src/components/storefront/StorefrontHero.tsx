import React, { useEffect, useState } from 'react';
import { ChevronsRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SafeImage } from '../SafeImage';
import { ProductCategory } from '../../types/store';

interface StorefrontHeroProps {
  onShopNow: (category?: ProductCategory | 'Todos') => void;
}

export const StorefrontHero: React.FC<StorefrontHeroProps> = ({ onShopNow }) => {
  const { settings } = useStore();
  const cfg = settings.storefrontConfig;
  const visualSlides = cfg.heroSlides.filter((s) => Boolean(s.image && s.image.trim()));
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
    <section id="top" className="bg-white pt-4 sm:pt-6 lg:pt-7 pb-2">
      <div className="max-w-[1360px] lg:max-w-[820px] xl:max-w-[880px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Rounded Dark Spotlight Card */}
        <div className="relative rounded-[22px] sm:rounded-[28px] overflow-hidden bg-[radial-gradient(circle_at_76%_42%,#3B3B40_0%,#151518_56%,#09090B_100%)] text-white grid grid-cols-12 items-stretch min-h-[195px] sm:min-h-[290px] lg:min-h-[280px] xl:min-h-[300px] shadow-[0_14px_34px_-18px_rgba(0,0,0,0.35)]">
          {/* Left Copy & Slide Thumbnails */}
          <div
            className={`${
              hasVisualSlides
                ? 'col-span-7 sm:col-span-7 p-5 sm:p-8 lg:p-8 xl:p-9'
                : 'col-span-12 p-6 sm:p-9 lg:p-9 xl:p-10'
            } flex flex-col justify-between z-10`}
          >
            <div>
              <h1
                className={`text-[18px] sm:text-3xl lg:text-[32px] xl:text-[36px] font-semibold tracking-tight uppercase leading-[1.08] text-white ${
                  hasVisualSlides ? 'max-w-lg' : 'max-w-2xl'
                }`}
              >
                {cfg.heroTitle}
              </h1>
              <p
                className={`text-[11px] sm:text-sm lg:text-[13px] xl:text-[14px] text-white/75 leading-snug lg:leading-relaxed line-clamp-2 sm:line-clamp-3 mt-1.5 sm:mt-2.5 ${
                  hasVisualSlides ? 'max-w-md' : 'max-w-xl'
                }`}
              >
                {cfg.heroSubtitle}
              </p>

              {/* Mini Rounded Preview Thumbnails (only when custom banner images exist) */}
              {hasVisualSlides && (
                <div className="flex items-center gap-2 sm:gap-2.5 mt-3.5 sm:mt-5">
                  {visualSlides.slice(0, 3).map((slide, idx) => {
                    const isSelected = safeSlideIdx === idx;
                    return (
                      <button
                        key={`${slide.index}-${idx}`}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        aria-label={`Ver look ${idx + 1}`}
                        className={`w-10 h-11 sm:w-13 sm:h-14 lg:w-12 lg:h-13 rounded-lg sm:rounded-xl overflow-hidden bg-white/10 border transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'border-white ring-1 ring-white/40 opacity-100 scale-[1.03]'
                            : 'border-white/15 opacity-70 hover:opacity-100'
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

            {/* White Rounded Primary CTA Button */}
            <div className="pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => onShopNow('Todos')}
                className="inline-flex items-center gap-1.5 px-4 sm:px-6 lg:px-6 py-2 sm:py-2.5 lg:py-2.5 rounded-full bg-white text-[#111111] text-[11px] sm:text-xs lg:text-[13px] font-semibold hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                <span>{cfg.heroPrimaryCta}</span>
                <ChevronsRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* Right Spotlight Portrait (complete uncropped photo with matching edge shadow on PC) */}
          {hasVisualSlides && currentSlide && (
            <div className="col-span-5 sm:col-span-5 relative min-h-[215px] sm:min-h-[300px] lg:min-h-[280px] xl:min-h-[300px] lg:flex lg:items-center lg:justify-end overflow-hidden">
              <div className="relative w-full h-full lg:w-auto lg:h-auto lg:max-h-[300px] xl:max-h-[320px] lg:max-w-full flex items-center justify-end">
                <SafeImage
                  src={currentSlide.image}
                  alt={currentSlide.caption}
                  className="w-full h-full object-cover object-top lg:w-auto lg:h-auto lg:max-h-[300px] xl:max-h-[320px] lg:max-w-full lg:object-contain block transition-opacity duration-300"
                />
                <div className="hidden lg:block absolute inset-0 pointer-events-none shadow-[inset_0_0_54px_16px_rgba(9,9,11,0.9)]" />
                <div className="absolute inset-y-0 left-0 w-10 sm:w-16 lg:w-20 bg-gradient-to-r from-[#141417] via-[#141417]/55 to-transparent pointer-events-none" />
                <div className="hidden lg:block absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#09090B]/90 to-transparent pointer-events-none" />
                <div className="hidden lg:block absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#09090B]/85 to-transparent pointer-events-none" />
                <div className="hidden lg:block absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#09090B]/90 to-transparent pointer-events-none" />
              </div>
            </div>
          )}
        </div>

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
                  aria-label={`Slide ${idx + 1}`}
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
