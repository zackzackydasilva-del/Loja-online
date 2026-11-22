export type ProductCategory =
  | 'Mulher'
  | 'Homem'
  | 'Vestidos'
  | 'Tops'
  | 'Calçado'
  | 'Malas'
  | 'Acessórios'
  | 'Saldos';

export type OrderStatus = 'Pendente' | 'Em Preparação' | 'Em Trânsito' | 'Entregue';

export type PaymentMethod = 'Multicaixa Express' | 'Cartão' | 'Contra-Reembolso';

export interface ProductColorVariant {
  name: string;
  image: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  sizes: string[];
  colors: string[];
  colorVariants?: ProductColorVariant[];
  description: string;
  material: string;
  image: string;
  featured?: boolean;
  isNew?: boolean;
  onSale?: boolean;
}

export interface CartItem {
  productId: string;
  size: string;
  quantity: number;
}

export interface OrderItemSummary {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export interface StoreCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  shippingAddress: string;
  city: string;
  postalCode: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  orderId?: string;
  delta: number;
  reason: string;
  createdAt: string;
}

export interface StoreOrder {
  id: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  postalCode: string;
  paymentMethod: PaymentMethod;
  items: OrderItemSummary[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  progressStep: number;
  totalSteps: number;
}

export interface StoreGoal {
  id: string;
  title: string;
  completed: boolean;
}

export interface StoreTask {
  id: string;
  title: string;
  dueDate: string;
  category: 'stock' | 'pedido' | 'campanha' | 'logistica';
  orderId?: string;
  productId?: string;
  pinned: boolean;
  notify: boolean;
}

export interface StoreCampaign {
  id: string;
  title: string;
  status: 'Em Curso' | 'Concluído';
  summary: string;
  category?: ProductCategory;
  completedSteps: number;
  totalSteps: number;
}

export interface WeeklySalesPoint {
  day: string;
  fullDay: string;
  apparel: number;
  accessories: number;
  deltaPercent: number;
}

export type StoreCostCategory =
  | 'Mercadoria'
  | 'Logística'
  | 'Marketing'
  | 'Operacional'
  | 'Outro';

export interface StoreCost {
  id: string;
  title: string;
  category: StoreCostCategory;
  amount: number;
  date: string;
}

export interface HeroSlideConfig {
  index: string;
  image: string;
  caption: string;
}

export interface TrustBadgeConfig {
  title: string;
  subtitle: string;
}

export interface CategoryStripItemConfig {
  label: string;
  category: ProductCategory;
  image: string;
  isSale?: boolean;
}

export interface EditorialCardConfig {
  title: string;
  category: ProductCategory;
  image: string;
}

export interface PromoBannerConfig {
  eyebrow: string;
  title: string;
  ctaText: string;
  targetCategory: ProductCategory | 'Todos';
  image: string;
}

export interface StorefrontConfig {
  topNoticeText?: string;
  headerWordmark: string;
  navLabels: {
    collections: string;
    apparel: string;
    accessories: string;
    sale: string;
    admin: string;
  };
  adminGreeting: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  heroSlides: HeroSlideConfig[];
  heroTrustBadges: TrustBadgeConfig[];
  categoryStripItems: CategoryStripItemConfig[];
  collectionsEyebrow: string;
  collectionsTitle: string;
  collectionsActionText: string;
  editorialCards: EditorialCardConfig[];
  promoBanners: PromoBannerConfig[];
  catalogEyebrow: string;
  catalogTitle: string;
  guarantees: TrustBadgeConfig[];
  newsletter: {
    image: string;
    eyebrow: string;
    title: string;
    description: string;
    promoCode: string;
    buttonText: string;
  };
  footer: {
    tagline: string;
    supportTitle: string;
    supportLinks: string[];
    atelierTitle: string;
    atelierLinks: string[];
    newsletterTitle: string;
    newsletterDescription: string;
    copyrightText: string;
    locationText: string;
  };
}

export interface StoreSettings {
  storeName: string;
  currencySymbol: string;
  freeShippingThreshold: number;
  supportEmail: string;
  integrations: {
    id: string;
    name: string;
    role: string;
    connected: boolean;
  }[];
  storefrontConfig: StorefrontConfig;
}
