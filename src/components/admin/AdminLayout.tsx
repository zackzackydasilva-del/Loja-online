import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Briefcase,
  Check,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { ASSETS } from '../../data/seedData';
import { useStore } from '../../context/StoreContext';
import { SafeImage } from '../SafeImage';

export type AdminTab = 'dashboard' | 'orders' | 'products' | 'analytics' | 'customers' | 'settings';

interface AdminLayoutProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onOpenNewProduct: () => void;
  adminSearch: string;
  onAdminSearchChange: (val: string) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Encomendas', icon: ShoppingBag },
  { id: 'products', label: 'Catálogo', icon: Package },
  { id: 'analytics', label: 'Estatísticas', icon: BarChart3 },
  { id: 'customers', label: 'Clientes', icon: Users },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewProduct,
  adminSearch,
  onAdminSearchChange,
  children,
}) => {
  const { setActiveAppView, products, orders, settings, addIntegration, logoutAdmin } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelRole, setNewChannelRole] = useState('');

  const alerts = useMemo(() => {
    const lowStock = products
      .filter((p) => p.stock <= 6)
      .map((p) => ({
        id: `stock-${p.id}`,
        title: `Stock reduzido: ${p.name}`,
        meta: `${p.stock} un. restantes`,
        targetTab: 'products' as AdminTab,
      }));
    const pendingOrders = orders
      .filter((o) => o.status === 'Pendente' || o.status === 'Em Preparação')
      .map((o) => ({
        id: `ord-${o.id}`,
        title: `Encomenda #${o.id} (${o.customerName})`,
        meta: o.status,
        targetTab: 'orders' as AdminTab,
      }));
    return [...pendingOrders, ...lowStock];
  }, [products, orders]);

  const pageHeading: Record<AdminTab, string> = {
    dashboard: settings.storefrontConfig?.adminGreeting?.trim() || 'Painel de Gestão',
    orders: 'Gestão de Encomendas',
    products: 'Catálogo & Inventário',
    analytics: 'Estatísticas da Loja',
    customers: 'Diretório de Clientes',
    settings: 'Definições da Loja',
  };

  const brandInitial = (settings.storeName || 'L').trim().charAt(0).toUpperCase() || 'L';

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    addIntegration(newChannelName, newChannelRole);
    setNewChannelName('');
    setNewChannelRole('');
    setChannelModalOpen(false);
  };

  const SidebarContent = (
    <div className="h-full flex flex-col justify-between gap-6">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#1C1C1E] text-white flex items-center justify-center font-serif text-base font-semibold shrink-0">
              {brandInitial}
            </div>
            <span className="text-[17px] font-bold tracking-tight text-[#1C1C1E] truncate">
              {settings.storeName || 'Lunora'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1C1C1E] text-white shadow-xs'
                    : 'text-[#555552] hover:text-[#1C1C1E] hover:bg-black/5'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.id === 'orders' && (
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      isActive ? 'text-white/75' : 'text-[#8A8A85]'
                    }`}
                  >
                    {orders.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Integrations / Channels */}
        <div className="space-y-2 pt-2 border-t border-black/6">
          <p className="px-3 text-[10px] font-semibold tracking-[0.14em] text-[#8A8A85] uppercase">
            Integrações
          </p>
          <div className="space-y-1">
            {settings.integrations.map((int, index) => (
              <button
                key={int.id}
                type="button"
                onClick={() => {
                  onSelectTab('settings');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] text-[#3B3B39] hover:bg-black/5 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5 truncate">
                  {index === 0 ? (
                    <CreditCard className="w-3.5 h-3.5 text-[#555552] shrink-0" />
                  ) : (
                    <Truck className="w-3.5 h-3.5 text-[#555552] shrink-0" />
                  )}
                  <span className="truncate">{int.name}</span>
                </span>
                {int.connected && <Check className="w-3.5 h-3.5 text-[#1C1C1E] shrink-0" />}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setChannelModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium text-[#72726E] hover:text-[#1C1C1E] hover:bg-black/5 transition-colors cursor-pointer"
            >
              <span className="w-4 h-4 rounded-full border border-dashed border-[#8A8A85] flex items-center justify-center">
                <Plus className="w-2.5 h-2.5" />
              </span>
              <span>Adicionar canal</span>
            </button>
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-2 pt-2 border-t border-black/6">
          <p className="px-3 text-[10px] font-semibold tracking-[0.14em] text-[#8A8A85] uppercase">
            Equipas
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelectTab('orders');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[13px] text-[#3B3B39] hover:bg-black/5 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#1C1C1E]" />
              <span>Logística & Envios</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectTab('products');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[13px] text-[#3B3B39] hover:bg-black/5 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-[#72726E]" />
              <span>Curadoria & Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="space-y-2 pt-3 border-t border-black/6">
        <button
          type="button"
          onClick={() => {
            onSelectTab('settings');
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#1C1C1E] text-white'
              : 'text-[#555552] hover:text-[#1C1C1E] hover:bg-black/5'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Definições</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAppView('storefront')}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F2F1EE] text-[#1C1C1E] text-xs font-semibold hover:bg-[#E6E5E0] transition-colors cursor-pointer"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Ver Loja Online</span>
        </button>

        <button
          type="button"
          onClick={logoutAdmin}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium text-[#72726E] hover:text-[#1C1C1E] hover:bg-black/5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Terminar Sessão</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#DFDFDC] p-2 sm:p-5 lg:p-7 text-[#1C1C1E]">
      {/* Translucent Frosted Frame Matching Reference 1 */}
      <div className="max-w-[1440px] mx-auto rounded-[30px] bg-[#ECECE9]/92 border border-white/70 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.14)] p-3 sm:p-5 lg:p-6 flex gap-6 min-h-[calc(100vh-3.5rem)]">
        {/* Desktop Floating Sidebar */}
        <aside className="hidden lg:block w-[236px] shrink-0 bg-white rounded-[26px] p-5 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.06)]">
          {SidebarContent}
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden flex"
            onClick={() => setMobileMenuOpen(false)}
          >
            <aside
              className="w-[260px] bg-white h-full p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {SidebarContent}
            </aside>
          </div>
        )}

        {/* Main Viewport */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Top Bar */}
          <header className="flex flex-wrap items-center justify-between gap-4 px-1 pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs cursor-pointer"
                aria-label="Abrir navegação"
              >
                <Menu className="w-4 h-4" />
              </button>
              <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[#1C1C1E]">
                {pageHeading[activeTab]}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 relative">
              <button
                type="button"
                onClick={onOpenNewProduct}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Produto</span>
              </button>

              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Pesquisar no painel"
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1C1C1E] shadow-xs hover:bg-[#F5F5F3] transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setNotificationsOpen((v) => !v)}
                aria-label="Alertas da loja"
                className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1C1C1E] shadow-xs hover:bg-[#F5F5F3] transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#1C1C1E] text-white text-[10px] font-mono flex items-center justify-center tabular-nums">
                    {alerts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('settings')}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 cursor-pointer"
                title="Perfil de Gestão"
              >
                <SafeImage
                  src={ASSETS.avatarDirector}
                  alt={`${settings.storeName} · Gestão`}
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Notifications Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-30 w-80 bg-white rounded-2xl shadow-xl border border-black/8 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1C1C1E]">Alertas Operacionais</span>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs text-[#72726E] hover:text-[#1C1C1E] cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                  {alerts.length === 0 ? (
                    <p className="text-xs text-[#72726E]">Sem alertas pendentes neste momento.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {alerts.map((alert) => (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => {
                            onSelectTab(alert.targetTab);
                            setNotificationsOpen(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-[#F6F6F4] hover:bg-[#ECECE8] transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-medium text-[#1C1C1E]">{alert.title}</p>
                          <p className="text-[11px] text-[#72726E]">{alert.meta}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Optional Expandable Admin Search */}
          {searchOpen && (
            <div className="bg-white rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-xs border border-black/5">
              <Search className="w-4 h-4 text-[#72726E]" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => onAdminSearchChange(e.target.value)}
                placeholder="Filtrar encomendas, clientes ou produtos por nome/SKU..."
                className="flex-1 text-sm bg-transparent focus:outline-none"
                autoFocus
              />
              {adminSearch && (
                <button
                  type="button"
                  onClick={() => onAdminSearchChange('')}
                  className="text-xs text-[#72726E] hover:text-[#1C1C1E] cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          )}

          <main className="flex-1">{children}</main>
        </div>
      </div>

      {/* Add Integration Modal */}
      {channelModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setChannelModalOpen(false)}
        >
          <form
            onSubmit={handleAddChannel}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-semibold text-[#1C1C1E]">Adicionar Canal de Integração</h3>
            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">Nome do Canal</label>
              <input
                type="text"
                required
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Ex: Instagram Shopping"
                className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555552] mb-1">Função</label>
              <input
                type="text"
                value={newChannelRole}
                onChange={(e) => setNewChannelRole(e.target.value)}
                placeholder="Ex: Catálogo Social"
                className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChannelModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#555552] hover:text-[#1C1C1E] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#1C1C1E] text-white text-xs font-medium rounded-xl cursor-pointer"
              >
                Ligar Canal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
