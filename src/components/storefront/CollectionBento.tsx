import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory } from '../../types/store';
import { SafeImage } from '../SafeImage';

interface CollectionBentoProps {
  onExploreCategory: (cat: ProductCategory | 'Todos') => void;
}

export const CollectionBento: React.FC<CollectionBentoProps> = ({ onExploreCategory }) => {
  const { settings } = useStore();
  const cfg = settings.storefrontConfig;

  return (
    <section id="collections" className="max-w-[1280px] mx-auto px-6 md:px-10 py-12">
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-[#66635C] mb-1.5">
            {cfg.collectionsEyebrow}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-[#141413]">
            {cfg.collectionsTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onExploreCategory('Todos')}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#141413] hover:opacity-70 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>{cfg.collectionsActionText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Editorial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cfg.editorialCards.map((card, idx) => (
          <button
            key={`${card.category}-${idx}`}
            type="button"
            onClick={() => onExploreCategory(card.category)}
            className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-[#E9E4DB] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#141413]"
          >
            <SafeImage
              src={card.image}
              alt={card.title}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <p className="font-serif text-xl font-medium mb-1">{card.title}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 group-hover:translate-x-1 transition-transform">
                <span>Explorar Agora</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 2 Split Promotional Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cfg.promoBanners.map((banner, idx) => (
          <div
            key={`promo-banner-${idx}`}
            className="relative rounded-xl bg-[#EFECE5] overflow-hidden grid grid-cols-12 items-center min-h-[210px] border border-[#141413]/6"
          >
            <div className="col-span-7 p-7 md:p-8">
              <p className="text-[11px] font-medium tracking-[0.14em] text-[#66635C] mb-1.5">
                {banner.eyebrow}
              </p>
              <h3 className="font-serif text-2xl md:text-[26px] leading-tight text-[#141413] mb-4 whitespace-pre-line">
                {banner.title}
              </h3>
              <button
                type="button"
                onClick={() => onExploreCategory(banner.targetCategory || 'Todos')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#141413] text-[#F8F6F2] text-xs font-medium rounded-lg hover:bg-[#2B2B29] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{banner.ctaText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="col-span-5 h-full min-h-[210px]">
              <SafeImage
                src={banner.image}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
