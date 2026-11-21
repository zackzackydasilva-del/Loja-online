import React, { useState } from 'react';
import { ArrowRight, Play, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SafeImage } from '../SafeImage';
import { ProductCategory } from '../../types/store';

interface StorefrontHeroProps {
  onShopNow: (category?: ProductCategory | 'Todos') => void;
}

export const StorefrontHero: React.FC<StorefrontHeroProps> = ({ onShopNow }) => {
  const { settings } = useStore();
  const cfg = settings.storefrontConfig;
  const slides = cfg.heroSlides;
  const [activeSlide, setActiveSlide] = useState(0);
  const [lookbookNotice, setLookbookNotice] = useState(false);

  const safeSlideIdx = activeSlide < slides.length ? activeSlide : 0;
  const currentSlide = slides[safeSlideIdx];
  const badges = cfg.heroTrustBadges;

  return (
    <section id="top" className="relative bg-[#F5F2EC] border-b border-[#141413]/8">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[580px]">
        {/* Left Editorial Content */}
        <div className="lg:col-span-6 px-6 md:px-10 py-14 lg:py-20 flex flex-col justify-between gap-10">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-[#66635C] mb-4">
              {cfg.heroEyebrow}
            </p>
            <h1 className="font-serif text-[clamp(2.5rem,4.4vw,4rem)] leading-[1.06] font-medium text-[#141413] tracking-[-0.015em] max-w-lg mb-5">
              {cfg.heroTitle}
            </h1>
            <p className="text-[15px] leading-relaxed text-[#58544D] max-w-md mb-8">
              {cfg.heroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onShopNow('Todos')}
                className="inline-flex items-center gap-3 px-6 py-3.5 bg-[#141413] text-[#F8F6F2] text-sm font-medium rounded-lg hover:bg-[#2B2B29] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{cfg.heroPrimaryCta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSlide((prev) => (prev + 1) % slides.length);
                  setLookbookNotice(true);
                  setTimeout(() => setLookbookNotice(false), 3200);
                }}
                className="inline-flex items-center gap-2.5 px-5 py-3.5 bg-white/80 text-[#141413] border border-[#141413]/12 text-sm font-medium rounded-lg hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="w-6 h-6 rounded-full border border-[#141413]/20 flex items-center justify-center">
                  <Play className="w-3 h-3 fill-[#141413]" />
                </span>
                <span>{cfg.heroSecondaryCta}</span>
              </button>
            </div>

            {lookbookNotice && currentSlide && (
              <p className="mt-3 text-xs text-[#58544D] transition-opacity">
                A apresentar: {currentSlide.caption}
              </p>
            )}
          </div>

          {/* 3-Column Trust Row */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#141413]/10">
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-[#141413] mt-0.5 shrink-0" strokeWidth={1.6} />
              <div>
                <p className="text-xs font-semibold text-[#141413]">
                  {badges[0]?.title || 'Envio Gratuito'}
                </p>
                <p className="text-[11px] text-[#66635C]">
                  {badges[0]?.subtitle || `Acima de ${settings.freeShippingThreshold} ${settings.currencySymbol}`}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <RotateCcw className="w-4 h-4 text-[#141413] mt-0.5 shrink-0" strokeWidth={1.6} />
              <div>
                <p className="text-xs font-semibold text-[#141413]">
                  {badges[1]?.title || 'Trocas Fáceis'}
                </p>
                <p className="text-[11px] text-[#66635C]">
                  {badges[1]?.subtitle || 'Prazo de 30 dias'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#141413] mt-0.5 shrink-0" strokeWidth={1.6} />
              <div>
                <p className="text-xs font-semibold text-[#141413]">
                  {badges[2]?.title || 'Pagamento Seguro'}
                </p>
                <p className="text-[11px] text-[#66635C]">
                  {badges[2]?.subtitle || '100% protegido'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Editorial Portrait Split */}
        <div className="lg:col-span-6 relative min-h-[420px] lg:min-h-[580px] overflow-hidden bg-[#E9E4DB]">
          {currentSlide && (
            <SafeImage
              src={currentSlide.image}
              alt={currentSlide.caption}
              className="w-full h-full object-cover object-top transition-opacity duration-300"
            />
          )}

          {/* Vertical Editorial Index Indicator */}
          {slides.length > 1 && (
            <div className="hidden sm:flex flex-col items-center gap-3 absolute right-5 top-1/2 -translate-y-1/2 bg-[#F8F6F2]/85 backdrop-blur-sm px-2 py-3 rounded-full border border-[#141413]/10">
              {slides.map((slide, idx) => (
                <button
                  key={`${slide.index}-${idx}`}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                    safeSlideIdx === idx ? 'text-[#141413] font-semibold' : 'text-[#8A857C] hover:text-[#141413]'
                  }`}
                >
                  {slide.index || `0${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
