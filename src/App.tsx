import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Product, ProductCategory, StoreOrder } from './types/store';
import { getCategoryParamFromLocation } from './utils/categoryLinks';
import { StorefrontHeader } from './components/storefront/StorefrontHeader';
import { StorefrontHero } from './components/storefront/StorefrontHero';
import { ProductGrid } from './components/storefront/ProductGrid';
import { StorefrontBottomBanner } from './components/storefront/StorefrontBottomBanner';
import { StorefrontFooter } from './components/storefront/StorefrontFooter';
import { StorefrontBottomNav } from './components/storefront/StorefrontBottomNav';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { CartDrawer } from './components/storefront/CartDrawer';
import { ProfileNewsletterModal } from './components/storefront/ProfileNewsletterModal';
import { StorefrontPopupModal } from './components/storefront/StorefrontPopupModal';
import { WhatsAppSupportButton } from './components/storefront/WhatsAppSupportButton';
import { AdminLayout, AdminTab } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminProducts } from './components/admin/AdminProducts';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { AdminCustomers } from './components/admin/AdminCustomers';
import { AdminSettings } from './components/admin/AdminSettings';
import { ProductFormModal } from './components/admin/ProductFormModal';
import { ManualOrderModal } from './components/admin/ManualOrderModal';
import { AdminAuthGate } from './components/admin/AdminAuthGate';
import {
  reportVisitorStage,
  startStoreVisitorTracker,
  stopStoreVisitorTracker,
} from './utils/storeTracker';

const LazyAdminRealtimeAnalytics = lazy(() =>
  import('./components/admin/AdminRealtimeAnalytics').then((m) => ({
    default: m.AdminRealtimeAnalytics,
  }))
);

const AppContent: React.FC = () => {
  const {
    activeAppView,
    selectedCategory,
    setSelectedCategory,
    setSearchQuery,
    adminToken,
    cart,
    products,
    settings,
    isStoreLoaded,
    isCartOpen,
    quickViewProduct,
    activePopup,
    openPopup,
  } = useStore();
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [adminSearch, setAdminSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [latestCreatedOrder, setLatestCreatedOrder] = useState<StoreOrder | null>(null);

  const [storeSearchOpen, setStoreSearchOpen] = useState(false);
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const pendingDeepLinkScrollRef = useRef<boolean>(
    Boolean(getCategoryParamFromLocation()) ||
      (typeof window !== 'undefined' &&
        (window.location.hash === '#catalog-grid' || window.location.hash === '#catalog'))
  );

  // Scroll straight to the target category grid when opened via a shared category link
  useEffect(() => {
    if (activeAppView !== 'storefront' || !isStoreLoaded || !pendingDeepLinkScrollRef.current) {
      return;
    }
    pendingDeepLinkScrollRef.current = false;
    const timer = window.setTimeout(() => {
      const targetEl =
        document.getElementById('catalog-grid') || document.getElementById('catalog');
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeAppView, isStoreLoaded, selectedCategory]);

  // Show Entry Popup banner ONLY to storefront visitors when enabled
  useEffect(() => {
    const ep = settings.storefrontConfig.entryPopup;
    if (
      activeAppView !== 'storefront' ||
      !isStoreLoaded ||
      !ep?.enabled ||
      isCartOpen ||
      quickViewProduct ||
      activePopup
    ) {
      return;
    }

    const sig = JSON.stringify([
      ep.badge || '',
      ep.title || '',
      ep.subtitle || '',
      ep.image || '',
      ep.ctaText || '',
      ep.productId || '',
      ep.buttonUrl || '',
    ]);

    try {
      if (sessionStorage.getItem('lunora_entry_popup_seen_sig') === sig) {
        return;
      }
    } catch {
      // Ignore storage error
    }

    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem('lunora_entry_popup_seen_sig', sig);
      } catch {
        // Ignore storage error
      }
      openPopup('entry');
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    activeAppView,
    isStoreLoaded,
    settings.storefrontConfig.entryPopup,
    isCartOpen,
    quickViewProduct,
    activePopup,
    openPopup,
  ]);

  // Non-blocking immediate real-time visitor tracking on storefront mount
  useEffect(() => {
    if (activeAppView !== 'storefront') {
      stopStoreVisitorTracker();
      return;
    }

    let cancelled = false;
    const rafId = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
      const priceMap = new Map(products.map((p) => [p.id, p.price]));
      const cartTotal = cart.reduce((s, i) => s + (priceMap.get(i.productId) || 0) * i.quantity, 0);
      startStoreVisitorTracker({
        stage: 'loja',
        cartCount,
        cartTotal,
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [activeAppView]);

  // Keep visitor browsing stage synced when closing product modal / bag drawer
  useEffect(() => {
    if (activeAppView !== 'storefront' || isCartOpen || quickViewProduct) return;
    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
    const priceMap = new Map(products.map((p) => [p.id, p.price]));
    const cartTotal = cart.reduce((s, i) => s + (priceMap.get(i.productId) || 0) * i.quantity, 0);
    reportVisitorStage({
      stage: 'loja',
      cartCount,
      cartTotal,
    });
  }, [activeAppView, isCartOpen, quickViewProduct, cart, products]);

  const navigateStoreSection = (sectionId: string, category?: ProductCategory | 'Todos') => {
    setWishlistOnly(false);
    if (category) {
      setSelectedCategory(category);
      if (typeof window !== 'undefined') {
        if (category === 'Todos' && getCategoryParamFromLocation()) {
          window.history.replaceState(null, '', window.location.pathname);
        } else if (category !== 'Todos') {
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}?categoria=${encodeURIComponent(category)}#catalog-grid`
          );
        }
      }
    }
    requestAnimationFrame(() => {
      if (sectionId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const resolvedId =
        sectionId === 'catalog' && category && category !== 'Todos'
          ? 'catalog-grid'
          : sectionId;
      const el =
        document.getElementById(resolvedId) || document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  if (activeAppView === 'admin') {
    if (!adminToken) {
      return <AdminAuthGate />;
    }

    return (
      <>
        <AdminLayout
          activeTab={adminTab}
          onSelectTab={setAdminTab}
          onOpenNewProduct={() => {
            setEditingProduct(null);
            setProductModalOpen(true);
          }}
          adminSearch={adminSearch}
          onAdminSearchChange={setAdminSearch}
        >
          {adminTab === 'dashboard' && (
            <AdminDashboard
              onNavigateTab={setAdminTab}
              onNewOrder={() => setOrderModalOpen(true)}
            />
          )}
          {adminTab === 'orders' && (
            <AdminOrders
              searchFilter={adminSearch}
              onNewOrder={() => setOrderModalOpen(true)}
              latestCreatedOrder={latestCreatedOrder}
            />
          )}
          {adminTab === 'products' && (
            <AdminProducts
              searchFilter={adminSearch}
              onEditProduct={(p) => {
                setEditingProduct(p);
                setProductModalOpen(true);
              }}
              onNewProduct={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
            />
          )}
          {adminTab === 'analytics' && <AdminAnalytics />}
          {adminTab === 'realtime' && (
            <Suspense
              fallback={
                <div className="bg-white rounded-[24px] p-10 text-center text-xs text-[#72726E] border border-black/5">
                  A carregar analítico em tempo real...
                </div>
              }
            >
              <LazyAdminRealtimeAnalytics />
            </Suspense>
          )}
          {adminTab === 'customers' && <AdminCustomers searchFilter={adminSearch} />}
          {adminTab === 'settings' && <AdminSettings />}
        </AdminLayout>

        <ProductFormModal
          isOpen={productModalOpen}
          editingProduct={editingProduct}
          onClose={() => {
            setProductModalOpen(false);
            setEditingProduct(null);
          }}
        />

        <ManualOrderModal
          isOpen={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          onCreated={(created) => {
            setLatestCreatedOrder(created);
            setAdminTab('orders');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111111]">
      <StorefrontHeader
        onNavigateSection={navigateStoreSection}
        searchOpen={storeSearchOpen}
        onToggleSearch={() => setStoreSearchOpen((v) => !v)}
        onOpenProfile={() => setProfileModalOpen(true)}
        wishlistOnly={wishlistOnly}
        onToggleWishlist={() => {
          setStoreSearchOpen(false);
          setWishlistOnly((v) => !v);
          requestAnimationFrame(() => {
            const el = document.getElementById('catalog');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }}
      />

      <main className="flex-1">
        <StorefrontHero onShopNow={(cat) => navigateStoreSection('catalog', cat)} />
        <ProductGrid
          wishlistOnly={wishlistOnly}
          onResetView={() => setWishlistOnly(false)}
        />
        <StorefrontBottomBanner onShopNow={(cat) => navigateStoreSection('catalog', cat)} />
      </main>

      <StorefrontFooter onNavigateCategory={(cat) => navigateStoreSection('catalog', cat)} />

      <StorefrontBottomNav
        activeTab={
          profileModalOpen
            ? 'profile'
            : wishlistOnly
            ? 'wishlist'
            : storeSearchOpen
            ? 'search'
            : 'home'
        }
        onHome={() => {
          setProfileModalOpen(false);
          setStoreSearchOpen(false);
          setSearchQuery('');
          navigateStoreSection('top', 'Todos');
        }}
        onSearch={() => {
          setProfileModalOpen(false);
          setWishlistOnly(false);
          const nextOpen = !storeSearchOpen;
          setStoreSearchOpen(nextOpen);
          if (nextOpen) {
            requestAnimationFrame(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
          }
        }}
        onToggleWishlist={() => {
          setProfileModalOpen(false);
          setStoreSearchOpen(false);
          setWishlistOnly((v) => !v);
          requestAnimationFrame(() => {
            const el = document.getElementById('catalog');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }}
        onProfile={() => setProfileModalOpen(true)}
      />

      <ProductDetailModal />
      <CartDrawer />
      <StorefrontPopupModal />
      <ProfileNewsletterModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
      <WhatsAppSupportButton />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
