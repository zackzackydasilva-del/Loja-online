import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  CartItem,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductCategory,
  StockMovement,
  StoreCampaign,
  StoreCost,
  StoreCostCategory,
  StoreCustomer,
  StoreGoal,
  StoreOrder,
  StoreSettings,
  StoreTask,
  WeeklySalesPoint,
} from '../types/store';
import {
  INITIAL_SETTINGS,
  WEEKLY_SALES_DATA,
} from '../data/seedData';
import { getVisitorSessionId } from '../utils/storeTracker';

const CART_STORAGE_KEY = 'lunora_cart_v2';
const WISHLIST_STORAGE_KEY = 'lunora_wishlist_v2';
const ADMIN_TOKEN_STORAGE_KEY = 'lunora_admin_token_v1';
const PUBLIC_STORE_CACHE_KEY = 'lunora_public_store_cache_v1';

interface PublicStoreCacheSnapshot {
  products: Product[];
  settings?: Partial<StoreSettings>;
  savedAt: number;
}

function readCachedPublicStore(): PublicStoreCacheSnapshot | null {
  try {
    const raw = localStorage.getItem(PUBLIC_STORE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicStoreCacheSnapshot;
    if (parsed && Array.isArray(parsed.products)) {
      return parsed;
    }
  } catch {
    // Ignore cache read error
  }
  return null;
}

function writeCachedPublicStore(products: Product[], settings: Partial<StoreSettings>) {
  try {
    const snapshot: PublicStoreCacheSnapshot = {
      products,
      settings,
      savedAt: Date.now(),
    };
    localStorage.setItem(PUBLIC_STORE_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota fallback: store essential product fields without oversized inline base64 strings
    try {
      const compactProducts = products.map((p) => ({
        ...p,
        image: p.image.startsWith('data:') ? '' : p.image,
        colorVariants: undefined,
      }));
      localStorage.setItem(
        PUBLIC_STORE_CACHE_KEY,
        JSON.stringify({ products: compactProducts, savedAt: Date.now() })
      );
    } catch {
      // Ignore storage error completely
    }
  }
}

declare global {
  interface Window {
    __LUNORA_PREFETCH__?: Promise<{
      products?: Product[];
      settings?: Partial<StoreSettings>;
    } | null>;
  }
}

interface CheckoutPayload {
  draftOrderId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  postalCode: string;
  paymentMethod: PaymentMethod;
  discountApplied: boolean;
}

export interface ManualOrderLinePayload {
  productId?: string;
  name?: string;
  size?: string;
  quantity: number;
  unitPrice?: number;
}

export interface ManualOrderPayload {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  city?: string;
  postalCode?: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  items: ManualOrderLinePayload[];
  discountApplied: boolean;
}

interface StoreContextValue {
  products: Product[];
  customers: StoreCustomer[];
  orders: StoreOrder[];
  stockMovements: StockMovement[];
  goals: StoreGoal[];
  tasks: StoreTask[];
  campaigns: StoreCampaign[];
  weeklySales: WeeklySalesPoint[];
  costs: StoreCost[];
  settings: StoreSettings;
  isStoreLoaded: boolean;
  cart: CartItem[];
  wishlist: string[];
  newsletterEmails: string[];
  activeAppView: 'storefront' | 'admin';
  setActiveAppView: (view: 'storefront' | 'admin') => void;
  selectedCategory: ProductCategory | 'Todos';
  setSelectedCategory: (cat: ProductCategory | 'Todos') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (p: Product | null) => void;
  adminToken: string | null;
  adminAuthMode: 'loading' | 'setup' | 'login' | 'authenticated';
  adminManagedByEnv: boolean;
  loginAdmin: (password: string) => Promise<{ ok: boolean; error?: string }>;
  setupAdmin: (password: string) => Promise<{ ok: boolean; error?: string }>;
  changeAdminPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logoutAdmin: () => void;
  addToCart: (productId: string, size: string, quantity?: number) => void;
  updateCartQuantity: (productId: string, size: string, quantity: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  placeOrder: (payload: CheckoutPayload) => Promise<StoreOrder>;
  createManualOrder: (payload: ManualOrderPayload) => Promise<StoreOrder>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewCount'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleGoal: (goalId: string) => Promise<void>;
  addGoal: (title: string) => Promise<void>;
  addTask: (title: string, dueDate: string, category: StoreTask['category']) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<StoreTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addCost: (cost: {
    title: string;
    category: StoreCostCategory;
    amount: number;
    date: string;
  }) => Promise<void>;
  deleteCost: (costId: string) => Promise<void>;
  toggleIntegration: (integrationId: string) => Promise<void>;
  addIntegration: (name: string, role: string) => Promise<void>;
  updateSettings: (
    updates: Partial<StoreSettings> & { categoryRenames?: { from: string; to: string }[] }
  ) => Promise<void>;
  subscribeNewsletter: (email: string) => Promise<boolean>;
  submitProfileEmail: (
    email: string
  ) => Promise<{ status: 'admin' | 'subscribed' | 'error'; error?: string }>;
  resetDemoData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialCache] = useState<PublicStoreCacheSnapshot | null>(() => readCachedPublicStore());
  const [products, setProducts] = useState<Product[]>(() => initialCache?.products ?? []);
  const [isStoreLoaded, setIsStoreLoaded] = useState<boolean>(() => Boolean(initialCache));
  const [customers, setCustomers] = useState<StoreCustomer[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [goals, setGoals] = useState<StoreGoal[]>([]);
  const [tasks, setTasks] = useState<StoreTask[]>([]);
  const [campaigns, setCampaigns] = useState<StoreCampaign[]>([]);
  const [weeklySales, setWeeklySales] = useState<WeeklySalesPoint[]>(WEEKLY_SALES_DATA);
  const [costs, setCosts] = useState<StoreCost[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(() =>
    initialCache?.settings ? { ...INITIAL_SETTINGS, ...initialCache.settings } : INITIAL_SETTINGS
  );
  const [newsletterEmails, setNewsletterEmails] = useState<string[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  const [activeAppView, setActiveAppView] = useState<'storefront' | 'admin'>('storefront');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'Todos'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const [adminToken, setAdminTokenState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [adminAuthMode, setAdminAuthMode] = useState<'loading' | 'setup' | 'login' | 'authenticated'>('loading');
  const [adminManagedByEnv, setAdminManagedByEnv] = useState<boolean>(false);

  const setAdminToken = useCallback((token: string | null) => {
    setAdminTokenState(token);
    try {
      if (token) {
        sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
      } else {
        sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore storage write errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage write errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // Ignore storage write errors
    }
  }, [wishlist]);

  useEffect(() => {
    if (settings.storeName) {
      document.title = `${settings.storeName} — Boutique Online & Gestão`;
    }
    const tagline = settings.storefrontConfig?.footer?.tagline?.trim();
    if (tagline) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', tagline);
      }
    }
  }, [settings.storeName, settings.storefrontConfig?.footer?.tagline]);

  const fetchPublicStore = useCallback(async (usePrefetch = false) => {
    try {
      let data: { products?: Product[]; settings?: Partial<StoreSettings> } | null = null;
      if (usePrefetch && window.__LUNORA_PREFETCH__) {
        const prefetched = await window.__LUNORA_PREFETCH__;
        window.__LUNORA_PREFETCH__ = undefined;
        if (prefetched) {
          data = prefetched;
        }
      }
      if (!data) {
        const res = await fetch('/api/store', { cache: 'no-store' });
        if (!res.ok) return;
        data = await res.json();
      }
      if (data && Array.isArray(data.products)) {
        setProducts(data.products);
        writeCachedPublicStore(data.products, data.settings || {});
      }
      if (data?.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
    } catch {
      // Keep current fallback if offline
    } finally {
      setIsStoreLoaded(true);
    }
  }, []);

  const fetchAdminBundle = useCallback(async (token: string) => {
    const res = await fetch('/api/admin/dashboard', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      setAdminToken(null);
      setAdminAuthMode('login');
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.products)) setProducts(data.products);
    if (Array.isArray(data.customers)) setCustomers(data.customers);
    if (Array.isArray(data.orders)) setOrders(data.orders);
    if (Array.isArray(data.stockMovements)) setStockMovements(data.stockMovements);
    if (Array.isArray(data.goals)) setGoals(data.goals);
    if (Array.isArray(data.tasks)) setTasks(data.tasks);
    if (Array.isArray(data.campaigns)) setCampaigns(data.campaigns);
    if (Array.isArray(data.weeklySales)) setWeeklySales(data.weeklySales);
    if (Array.isArray(data.costs)) setCosts(data.costs);
    if (data.settings) setSettings(data.settings);
    if (Array.isArray(data.newsletterEmails)) setNewsletterEmails(data.newsletterEmails);
  }, [setAdminToken]);

  useEffect(() => {
    if (activeAppView !== 'storefront') return;

    fetchPublicStore(true);

    const syncIfVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchPublicStore(false);
      }
    };

    window.addEventListener('focus', syncIfVisible);
    document.addEventListener('visibilitychange', syncIfVisible);
    const intervalId = window.setInterval(syncIfVisible, 30_000);

    return () => {
      window.removeEventListener('focus', syncIfVisible);
      document.removeEventListener('visibilitychange', syncIfVisible);
      window.clearInterval(intervalId);
    };
  }, [activeAppView, fetchPublicStore]);

  useEffect(() => {
    if (activeAppView !== 'admin') return;

    fetch('/api/admin/auth/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setAdminManagedByEnv(Boolean(data.managedByEnv));
        if (adminToken) {
          setAdminAuthMode('authenticated');
          fetchAdminBundle(adminToken);
        } else {
          setAdminAuthMode(data.mode === 'setup' ? 'setup' : 'login');
        }
      })
      .catch(() => {
        if (adminToken) {
          setAdminAuthMode('authenticated');
          fetchAdminBundle(adminToken);
        } else {
          setAdminAuthMode('login');
        }
      });
  }, [activeAppView, adminToken, fetchAdminBundle]);

  const loginAdmin = async (password: string) => {
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return { ok: false, error: 'Servidor de API indisponível nesta rota.' };
      }
      const data = await res.json();
      if (!res.ok || !data.token) {
        return { ok: false, error: data.error || 'Falha na autenticação.' };
      }
      setAdminToken(data.token);
      setAdminAuthMode('authenticated');
      await fetchAdminBundle(data.token);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de ligação ao servidor.' };
    }
  };

  const setupAdmin = async (password: string) => {
    try {
      const res = await fetch('/api/admin/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return { ok: false, error: 'Servidor de API indisponível nesta rota.' };
      }
      const data = await res.json();
      if (!res.ok || !data.token) {
        return { ok: false, error: data.error || 'Não foi possível configurar o acesso.' };
      }
      setAdminToken(data.token);
      setAdminAuthMode('authenticated');
      await fetchAdminBundle(data.token);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de ligação ao servidor.' };
    }
  };

  const changeAdminPassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await authFetch('/api/admin/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.token) {
        setAdminToken(data.token);
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Não foi possível alterar a palavra-passe.',
      };
    }
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminAuthMode('login');
    setActiveAppView('storefront');
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    if (!adminToken) throw new Error('Sem sessão de gestão ativa.');
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${adminToken}`,
      },
    });
    if (res.status === 401) {
      logoutAdmin();
      throw new Error('Sessão expirada.');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao gravar alterações na base de dados.');
    }
    return res;
  };

  const addToCart = (productId: string, size: string, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId && item.size === size);
      return existing
        ? prev.map((item) =>
            item.productId === productId && item.size === size
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        : [...prev, { productId, size, quantity }];
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (productId: string, size: string, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((i) => !(i.productId === productId && i.size === size))
        : prev.map((i) =>
            i.productId === productId && i.size === size ? { ...i, quantity } : i
          )
    );
  };

  const removeFromCart = (productId: string, size: string) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.size === size)));
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const placeOrder = async (payload: CheckoutPayload): Promise<StoreOrder> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        items: cart,
        sessionId: getVisitorSessionId(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível concluir a encomenda.');
    }
    setCart([]);
    await fetchPublicStore();
    if (adminToken) {
      await fetchAdminBundle(adminToken);
    }
    return data as StoreOrder;
  };

  const createManualOrder = async (payload: ManualOrderPayload): Promise<StoreOrder> => {
    const res = await authFetch('/api/admin/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = (await res.json()) as StoreOrder;
    await fetchPublicStore();
    if (adminToken) {
      await fetchAdminBundle(adminToken);
    }
    return created;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await authFetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  const deleteOrder = async (orderId: string) => {
    await authFetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    });
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (adminToken) {
      await fetchAdminBundle(adminToken);
    } else {
      await fetchPublicStore();
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'rating' | 'reviewCount'>) => {
    const res = await authFetch('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    const created = (await res.json()) as Product;
    if (created && created.id) {
      setProducts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
    }
    if (adminToken) {
      await fetchAdminBundle(adminToken);
    } else {
      await fetchPublicStore();
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    await authFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    if (adminToken) {
      await fetchAdminBundle(adminToken);
    } else {
      await fetchPublicStore();
    }
  };

  const deleteProduct = async (id: string) => {
    await authFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((c) => c.productId !== id));
    if (adminToken) {
      await fetchAdminBundle(adminToken);
    } else {
      await fetchPublicStore();
    }
  };

  const toggleGoal = async (goalId: string) => {
    const current = goals.find((g) => g.id === goalId);
    if (!current) return;
    await authFetch(`/api/admin/goals/${encodeURIComponent(goalId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !current.completed }),
    });
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  const addGoal = async (title: string) => {
    if (!title.trim()) return;
    await authFetch('/api/admin/goals', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim() }),
    });
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  const addTask = async (title: string, dueDate: string, category: StoreTask['category']) => {
    if (!title.trim()) return;
    await authFetch('/api/admin/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim(), dueDate, category }),
    });
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  const updateTask = async (taskId: string, updates: Partial<StoreTask>) => {
    await authFetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  const deleteTask = async (taskId: string) => {
    await authFetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
    });
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  const addCost = async (cost: {
    title: string;
    category: StoreCostCategory;
    amount: number;
    date: string;
  }) => {
    await authFetch('/api/admin/costs', {
      method: 'POST',
      body: JSON.stringify(cost),
    });
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  const deleteCost = async (costId: string) => {
    await authFetch(`/api/admin/costs/${encodeURIComponent(costId)}`, {
      method: 'DELETE',
    });
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  const toggleIntegration = async (integrationId: string) => {
    const updated = settings.integrations.map((int) =>
      int.id === integrationId ? { ...int, connected: !int.connected } : int
    );
    await updateSettings({ integrations: updated });
  };

  const addIntegration = async (name: string, role: string) => {
    if (!name.trim()) return;
    const updated = [
      ...settings.integrations,
      {
        id: `int-${Date.now()}`,
        name: name.trim(),
        role: role.trim() || 'Canal Externo',
        connected: true,
      },
    ];
    await updateSettings({ integrations: updated });
  };

  const updateSettings = async (
    updates: Partial<StoreSettings> & { categoryRenames?: { from: string; to: string }[] }
  ) => {
    const res = await authFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Erro ao guardar definições.');
    }
    if (data?.settings) {
      setSettings((prev) => ({ ...prev, ...data.settings }));
    }
    await fetchPublicStore();
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  const subscribeNewsletter = async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) return false;
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const submitProfileEmail = async (
    email: string
  ): Promise<{ status: 'admin' | 'subscribed' | 'error'; error?: string }> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      return { status: 'error', error: 'Por favor, insira um email válido.' };
    }
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, source: 'profile' }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          status: 'error',
          error: 'Não foi possível contactar o servidor da loja. Tente novamente.',
        };
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { status: 'error', error: data.error || 'Erro ao subscrever newsletter.' };
      }
      if (typeof data.adminToken === 'string' && data.adminToken) {
        setAdminToken(data.adminToken);
        setAdminAuthMode('authenticated');
        await fetchAdminBundle(data.adminToken);
        setActiveAppView('admin');
        return { status: 'admin' };
      }
      return { status: 'subscribed' };
    } catch {
      return { status: 'error', error: 'Erro de ligação ao servidor.' };
    }
  };

  const resetDemoData = async () => {
    await authFetch('/api/admin/reset', { method: 'POST' });
    setCart([]);
    setWishlist([]);
    await fetchPublicStore();
    if (adminToken) await fetchAdminBundle(adminToken);
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        customers,
        orders,
        stockMovements,
        goals,
        tasks,
        campaigns,
        weeklySales,
        costs,
        settings,
        isStoreLoaded,
        cart,
        wishlist,
        newsletterEmails,
        activeAppView,
        setActiveAppView,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        isCartOpen,
        setIsCartOpen,
        quickViewProduct,
        setQuickViewProduct,
        adminToken,
        adminAuthMode,
        adminManagedByEnv,
        loginAdmin,
        setupAdmin,
        changeAdminPassword,
        logoutAdmin,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        toggleWishlist,
        placeOrder,
        createManualOrder,
        updateOrderStatus,
        deleteOrder,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleGoal,
        addGoal,
        addTask,
        updateTask,
        deleteTask,
        addCost,
        deleteCost,
        toggleIntegration,
        addIntegration,
        updateSettings,
        subscribeNewsletter,
        submitProfileEmail,
        resetDemoData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore deve ser usado dentro de StoreProvider');
  }
  return ctx;
};
