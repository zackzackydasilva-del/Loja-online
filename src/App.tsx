import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Product, ProductCategory, StoreOrder } from './types/store';
import { StorefrontHeader } from './components/storefront/StorefrontHeader';
import { StorefrontHero } from './components/storefront/StorefrontHero';
import { CategoryStrip } from './components/storefront/CategoryStrip';
import { CollectionBento } from './components/storefront/CollectionBento';
import { ProductGrid } from './components/storefront/ProductGrid';
import { TrustAndNewsletter } from './components/storefront/TrustAndNewsletter';
import { StorefrontFooter } from './components/storefront/StorefrontFooter';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { CartDrawer } from './components/storefront/CartDrawer';
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
  const { activeAppView, setSelectedCategory, adminToken } = useStore();
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [adminSearch, setAdminSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [latestCreatedOrder, setLatestCreatedOrder] = useState<StoreOrder | null>(null);

  const navigateStoreSection = (sectionId: string, category?: ProductCategory | 'Todos') => {
    if (category) {
      setSelectedCategory(category);
    }
    requestAnimationFrame(() => {
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
    <div className="min-h-screen flex flex-col bg-[#F8F6F2] text-[#141413]">
      <StorefrontHeader onNavigateSection={navigateStoreSection} />

      <main className="flex-1">
        <StorefrontHero onShopNow={(cat) => navigateStoreSection('catalog', cat)} />
        <CategoryStrip onSelectCategory={(cat) => navigateStoreSection('catalog', cat)} />
        <CollectionBento onExploreCategory={(cat) => navigateStoreSection('catalog', cat)} />
        <ProductGrid />
        <TrustAndNewsletter />
      </main>

      <StorefrontFooter onNavigateCategory={(cat) => navigateStoreSection('catalog', cat)} />

      <ProductDetailModal />
      <CartDrawer />
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
