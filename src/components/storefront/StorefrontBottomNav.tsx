import React from 'react';
import { Heart, Home, Search, User } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface StorefrontBottomNavProps {
  activeTab: 'home' | 'search' | 'wishlist' | 'profile';
  onHome: () => void;
  onSearch: () => void;
  onToggleWishlist: () => void;
  onProfile: () => void;
}

export const StorefrontBottomNav: React.FC<StorefrontBottomNavProps> = ({
  activeTab,
  onHome,
  onSearch,
  onToggleWishlist,
  onProfile,
}) => {
  const { wishlist } = useStore();

  return (
    <nav
      aria-label="Navegação inferior"
      className="md:hidden fixed bottom-2.5 inset-x-4 z-40 bg-white/95 backdrop-blur-md rounded-[26px] border border-black/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.08)] h-12 px-7 flex items-center justify-between"
    >
      <button
        type="button"
        onClick={onHome}
        aria-label="Início"
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          activeTab === 'home' ? 'text-[#111111]' : 'text-[#777777] hover:text-[#111111]'
        }`}
      >
        <Home
          className="w-5 h-5"
          strokeWidth={activeTab === 'home' ? 2.2 : 1.7}
          fill={activeTab === 'home' ? 'currentColor' : 'none'}
        />
      </button>

      <button
        type="button"
        onClick={onSearch}
        aria-label="Pesquisar"
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          activeTab === 'search' ? 'text-[#111111]' : 'text-[#777777] hover:text-[#111111]'
        }`}
      >
        <Search className="w-5 h-5" strokeWidth={activeTab === 'search' ? 2.2 : 1.7} />
      </button>

      <button
        type="button"
        onClick={onToggleWishlist}
        aria-label={`Favoritos (${wishlist.length})`}
        className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          activeTab === 'wishlist' ? 'text-[#111111]' : 'text-[#777777] hover:text-[#111111]'
        }`}
      >
        <Heart
          className="w-5 h-5"
          strokeWidth={activeTab === 'wishlist' ? 2.2 : 1.7}
          fill={activeTab === 'wishlist' ? 'currentColor' : 'none'}
        />
        {wishlist.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#111111]" />
        )}
      </button>

      <button
        type="button"
        onClick={onProfile}
        aria-label="Perfil e Newsletter"
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          activeTab === 'profile' ? 'text-[#111111]' : 'text-[#777777] hover:text-[#111111]'
        }`}
      >
        <User
          className="w-5 h-5"
          strokeWidth={activeTab === 'profile' ? 2.2 : 1.7}
          fill={activeTab === 'profile' ? 'currentColor' : 'none'}
        />
      </button>
    </nav>
  );
};
