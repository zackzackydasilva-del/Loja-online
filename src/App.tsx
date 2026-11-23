import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Product, ProductCategory, StoreOrder } from './types/store';
import { StorefrontHeader } from './components/storefront/StorefrontHeader';
import { StorefrontHero } from './components/storefront/StorefrontHero';
import { ProductGrid } from './components/storefront/ProductGrid';
import { StorefrontFooter } from './components/storefront/StorefrontFooter';
import { StorefrontBottomNav } from './components/storefront/StorefrontBottomNav';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { CartDrawer } from './components/storefront/CartDrawer';
import { ProfileNewsletterModal } from './components/storefront/ProfileNewsletterModal';
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

const AppContent: React.FC = () => {
  const { activeAppView, setSelectedCategory, setSearchQuery, adminToken } = useStore();
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [adminSearch, setAdminSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [latestCreatedOrder, setLatestCreatedOrder] = useState<StoreOrder | null>(null);

  const [storeSearchOpen, setStoreSearchOpen] = useState(false);
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const navigateStoreSection = (sectionId: string, category?: ProductCategory | 'Todos') => {
    setWishlistOnly(false);
    if (category) {
      setSelectedCategory(category);
    }
    requestAnimationFrame(() => {
      if (sectionId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const el = document.getElementById(sectionId);
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
      />

      <main className="flex-1">
        <StorefrontHero onShopNow={(cat) => navigateStoreSection('catalog', cat)} />
        <ProductGrid
          wishlistOnly={wishlistOnly}
          onResetView={() => setWishlistOnly(false)}
        />
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
          setStoreSearchOpen((v) => !v);
          requestAnimationFrame(() => {
            const el = document.getElementById('catalog');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
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
