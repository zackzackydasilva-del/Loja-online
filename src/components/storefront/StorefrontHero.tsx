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
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Rounded Dark Spotlight Card */}
        <div className="relative rounded-[22px] sm:rounded-[28px] overflow-hidden bg-[radial-gradient(circle_at_76%_42%,#3B3B40_0%,#151518_56%,#09090B_100%)] text-white grid grid-cols-12 items-stretch min-h-[195px] sm:min-h-[290px] lg:min-h-[370px] xl:min-h-[410px] shadow-[0_14px_34px_-18px_rgba(0,0,0,0.35)]">
          {/* Left Copy & Slide Thumbnails */}
          <div
            className={`${
              hasVisualSlides
                ? 'col-span-7 sm:col-span-7 p-5 sm:p-8 lg:p-12 xl:p-14'
                : 'col-span-12 p-6 sm:p-9 lg:p-12 xl:p-14'
            } flex flex-col justify-between z-10`}
          >
            <div>
              <h1
                className={`text-[18px] sm:text-3xl lg:text-[42px] xl:text-[46px] font-semibold tracking-tight uppercase leading-[1.08] text-white ${
                  hasVisualSlides ? 'max-w-lg' : 'max-w-2xl'
                }`}
              >
                {cfg.heroTitle}
              </h1>
              <p
                className={`text-[11px] sm:text-sm lg:text-[15px] text-white/75 leading-snug lg:leading-relaxed line-clamp-2 sm:line-clamp-3 mt-1.5 sm:mt-3 ${
                  hasVisualSlides ? 'max-w-md' : 'max-w-xl'
                }`}
              >
                {cfg.heroSubtitle}
              </p>

              {/* Mini Rounded Preview Thumbnails (only when custom banner images exist) */}
              {hasVisualSlides && (
                <div className="flex items-center gap-2 sm:gap-2.5 mt-3.5 sm:mt-6">
                  {visualSlides.slice(0, 3).map((slide, idx) => {
                    const isSelected = safeSlideIdx === idx;
                    return (
                      <button
                        key={`${slide.index}-${idx}`}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        aria-label={`Ver look ${idx + 1}`}
                        className={`w-10 h-11 sm:w-13 sm:h-14 lg:w-14 lg:h-16 rounded-lg sm:rounded-xl overflow-hidden bg-white/10 border transition-all cursor-pointer shrink-0 ${
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
            <div className="pt-4 sm:pt-7">
              <button
                type="button"
                onClick={() => onShopNow('Todos')}
                className="inline-flex items-center gap-1.5 px-4 sm:px-6 lg:px-7 py-2 sm:py-2.5 lg:py-3 rounded-full bg-white text-[#111111] text-[11px] sm:text-xs lg:text-[13px] font-semibold hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                <span>{cfg.heroPrimaryCta}</span>
                <ChevronsRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* Right Spotlight Portrait (only when at least one banner image is set) */}
          {hasVisualSlides && currentSlide && (
            <div className="col-span-5 sm:col-span-5 relative min-h-[215px] sm:min-h-[300px] lg:min-h-[370px] xl:min-h-[410px] overflow-hidden">
              <SafeImage
                src={currentSlide.image}
                alt={currentSlide.caption}
                className="w-full h-full object-cover object-top transition-opacity duration-300"
              />
              <div className="absolute inset-y-0 left-0 w-10 sm:w-16 lg:w-20 bg-gradient-to-r from-[#141417] via-[#141417]/50 to-transparent pointer-events-none" />
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
