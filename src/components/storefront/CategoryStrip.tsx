import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory } from '../../types/store';
import { SafeImage } from '../SafeImage';

interface CategoryStripProps {
  onSelectCategory: (cat: ProductCategory | 'Todos') => void;
}

export const CategoryStrip: React.FC<CategoryStripProps> = ({ onSelectCategory }) => {
  const { selectedCategory, settings } = useStore();
  const items = settings.storefrontConfig.categoryStripItems;

  return (
    <section className="relative z-10 -mt-10 pb-8 px-6 md:px-10">
      <div className="max-w-[1160px] mx-auto bg-white rounded-2xl border border-[#141413]/8 shadow-[0_12px_36px_-12px_rgba(20,20,19,0.08)] px-6 py-6">
        <div className="grid grid-cols-4 sm:flex sm:flex-wrap sm:justify-center gap-4 sm:gap-6 items-start justify-items-center">
          {items.map((item, idx) => {
            const isActive = selectedCategory === item.category;
            return (
              <button
                key={`${item.category}-${idx}`}
                type="button"
                onClick={() => onSelectCategory(item.category)}
                className="group flex flex-col items-center gap-2.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#141413]"
              >
                <div
                  className={`w-16 h-16 md:w-[74px] md:h-[74px] rounded-full overflow-hidden transition-transform duration-200 group-hover:-translate-y-0.5 ${
                    item.isSale
                      ? 'bg-[#141413] text-[#F8F6F2] flex items-center justify-center'
                      : 'bg-[#F1EEE8]'
                  } ${
                    isActive
                      ? 'ring-2 ring-[#141413] ring-offset-2 ring-offset-white'
                      : 'ring-1 ring-[#141413]/10'
                  }`}
                >
                  {item.isSale ? (
                    <span className="text-xs font-semibold tracking-[0.14em] uppercase">
                      {item.label}
                    </span>
                  ) : (
                    <SafeImage
                      src={item.image || ''}
                      alt={item.label}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-[#141413] font-semibold' : 'text-[#524F49] group-hover:text-[#141413]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
