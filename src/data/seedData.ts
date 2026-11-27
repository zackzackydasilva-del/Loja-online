import type {
  Product,
  StoreOrder,
  StoreGoal,
  StoreTask,
  StoreCampaign,
  WeeklySalesPoint,
  StoreSettings,
  StorefrontConfig,
} from '../types/store.ts';

export const DEFAULT_PRODUCT_CATEGORIES: string[] = [
  'Mulher',
  'Homem',
  'Vestidos',
  'Tops',
  'Calçado',
  'Malas',
  'Acessórios',
];

export const ASSETS = {
  heroWoman: '/src/assets/images/hero_editorial_woman_1795267588559.jpg',
  dressesEditorial: '/src/assets/images/cat_dresses_collection_1795267588727.jpg',
  boutiqueRack: '/src/assets/images/promo_rack_arrivals_1795267588554.jpg',
  prodTop: '/src/assets/images/prod_ribbed_top_1795267587583.jpg',
  prodTrousers: '/src/assets/images/prod_wide_trousers_1795267589095.jpg',
  prodBag: '/src/assets/images/prod_leather_bag_1795267589232.jpg',
  prodHeels: '/src/assets/images/prod_strappy_heels_1795267588953.jpg',
  prodSunglasses: '/src/assets/images/prod_sunglasses_1795267588459.jpg',
  prodDress: '/src/assets/images/prod_silk_dress_1795267589847.jpg',
  prodSuedeJacket: '/src/assets/images/prod_suede_jacket_1795267588801.jpg',
  avatarDirector: '/src/assets/images/avatar_director_1795267587943.jpg',
};

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_ORDERS: StoreOrder[] = [];

export const INITIAL_GOALS: StoreGoal[] = [];

export const INITIAL_TASKS: StoreTask[] = [];

export const INITIAL_CAMPAIGNS: StoreCampaign[] = [];

export const WEEKLY_SALES_DATA: WeeklySalesPoint[] = [
  { day: 'S', fullDay: 'Segunda', apparel: 0, accessories: 0, deltaPercent: 0 },
  { day: 'T', fullDay: 'Terça', apparel: 0, accessories: 0, deltaPercent: 0 },
  { day: 'Q', fullDay: 'Quarta', apparel: 0, accessories: 0, deltaPercent: 0 },
  { day: 'Q', fullDay: 'Quinta', apparel: 0, accessories: 0, deltaPercent: 0 },
  { day: 'S', fullDay: 'Sexta', apparel: 0, accessories: 0, deltaPercent: 0 },
  { day: 'S', fullDay: 'Sábado', apparel: 0, accessories: 0, deltaPercent: 0 },
  { day: 'D', fullDay: 'Domingo', apparel: 0, accessories: 0, deltaPercent: 0 },
];

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  topNoticeText: 'Pagamento feito apenas na entrega · Pague apenas quando receber a sua encomenda',
  headerWordmark: 'LUNORA',
  navLabels: {
    collections: 'Coleções',
    apparel: 'Vestuário',
    accessories: 'Acessórios',
    sale: 'Saldos',
    admin: 'Gestão',
  },
  adminGreeting: 'Painel de Gestão',
  heroEyebrow: 'Nova Coleção · Primavera / Verão',
  heroTitle: 'Eleve o Seu Estilo do Dia a Dia',
  heroSubtitle:
    'Descubra peças intemporais pensadas para o conforto e desenhadas com elegância arquitetónica, feitas para acompanhar o seu ritmo.',
  heroPrimaryCta: 'Comprar Agora',
  heroSecondaryCta: 'Explorar Lookbook',
  heroSlides: [
    {
      index: '01',
      image: '',
      caption: 'Look 01',
    },
    {
      index: '02',
      image: '',
      caption: 'Look 02',
    },
    {
      index: '03',
      image: '',
      caption: 'Look 03',
    },
  ],
  heroTrustBadges: [
    { title: 'Envio Gratuito', subtitle: 'Acima de 50 000 Kz' },
    { title: 'Trocas Fáceis', subtitle: 'Prazo de 30 dias' },
    { title: 'Pagamento Seguro', subtitle: '100% protegido' },
  ],
  categoryStripItems: [
    { label: 'Mulher', category: 'Mulher', image: '' },
    { label: 'Homem', category: 'Homem', image: '' },
    { label: 'Vestidos', category: 'Vestidos', image: '' },
    { label: 'Tops', category: 'Tops', image: '' },
    { label: 'Calçado', category: 'Calçado', image: '' },
    { label: 'Malas', category: 'Malas', image: '' },
    { label: 'Acessórios', category: 'Acessórios', image: '' },
    { label: 'Saldos', category: 'Saldos', image: '', isSale: true },
  ],
  collectionsEyebrow: 'Por Categoria',
  collectionsTitle: 'Encontre o Seu Estilo Perfeito',
  collectionsActionText: 'Ver Todas as Categorias',
  editorialCards: [
    { title: 'Coleção Mulher', category: 'Mulher', image: '' },
    { title: 'Coleção Homem', category: 'Homem', image: '' },
    { title: 'Vestidos', category: 'Vestidos', image: '' },
    { title: 'Acessórios & Pele', category: 'Malas', image: '' },
  ],
  promoBanners: [
    {
      eyebrow: 'Oferta Limitada',
      title: 'Saldos da Estação\nAté 50% Desconto',
      ctaText: 'Ver Saldos',
      targetCategory: 'Saldos',
      image: '',
    },
    {
      eyebrow: 'Recém-Chegados',
      title: 'Novas Peças\nAcabadas de Chegar',
      ctaText: 'Explorar Novidades',
      targetCategory: 'Vestidos',
      image: '',
    },
  ],
  bottomBanner: {
    title: 'Curadoria da Estação',
    subtitle:
      'Explore os novos destaques disponíveis na coleção e receba com pagamento apenas no ato da entrega.',
    ctaText: 'Ver Coleção',
    targetCategory: 'Todos',
    slides: [
      { index: '01', image: '', caption: 'Banner Inferior 01' },
      { index: '02', image: '', caption: 'Banner Inferior 02' },
      { index: '03', image: '', caption: 'Banner Inferior 03' },
    ],
  },
  highlights: [],
  entryPopup: {
    enabled: false,
    badge: 'Bem-vindo à Loja',
    title: 'Descubra as Novidades da Semana',
    subtitle: 'Peças selecionadas com pagamento feito apenas na entrega.',
    image: '',
    images: [],
    ctaText: 'Ver Produto',
    productId: '',
    buttonUrl: '',
  },
  postCheckoutPopup: {
    enabled: false,
    badge: 'Oferta Pós-Compra',
    title: 'Obrigado pela Sua Encomenda!',
    subtitle: 'Aproveite esta sugestão especial selecionada para completar o seu visual.',
    image: '',
    images: [],
    ctaText: 'Ver Produto Recomendado',
    productId: '',
    buttonUrl: '',
  },
  orderNotification: {
    enabled: true,
    recipientEmail: 'pintozacarias806@gmail.com',
    soundEnabled: true,
  },
  saleWebhook: {
    enabled: false,
    url: '',
    secret: '',
    hasSecret: false,
  },
  shippingFee: 0,
  promoDiscountPercent: 10,
  paymentMethods: [
    { id: 'pm-cash', label: 'Contra-Reembolso', enabled: true },
    { id: 'pm-multicaixa', label: 'Multicaixa Express', enabled: true },
    { id: 'pm-card', label: 'Cartão', enabled: true },
  ],
  catalogEyebrow: 'Catálogo',
  catalogTitle: 'As Nossas Escolhas Favoritas',
  guarantees: [
    { title: 'Envio Gratuito', subtitle: 'Em compras acima de 50 000 Kz' },
    { title: 'Devoluções Simples', subtitle: '30 dias para trocar ou devolver' },
    { title: 'Pagamento Seguro', subtitle: 'Encriptação 100% protegida' },
    { title: 'Apoio Dedicado', subtitle: 'Atendimento personalizado 24/7' },
  ],
  newsletter: {
    image: '',
    eyebrow: '10% de Desconto na Primeira Encomenda',
    title: 'Junte-se à Nossa Lista de Estilo',
    description:
      'Subscreva para receber acesso antecipado às novas coleções, ofertas exclusivas e o código de boas-vindas.',
    promoCode: 'LUNORA10',
    buttonText: 'Subscrever',
  },
  footer: {
    tagline:
      'Moda intemporal para cada momento. Desenhada com atenção ao corte, ao tato e à durabilidade.',
    supportTitle: 'Apoio',
    supportLinks: [
      'Envios & Entregas',
      'Trocas e Devoluções',
      'Guia de Tamanhos',
      'Cuidados de Linho & Pele',
      'Perguntas Frequentes',
    ],
    atelierTitle: 'Atelier',
    atelierLinks: [
      'A Nossa História',
      'Sustentabilidade',
      'Materiais Certificados',
      'Boutique Luanda · Talatona',
    ],
    newsletterTitle: 'Fique Ligado',
    newsletterDescription: 'Receba novidades da coleção e 10% na primeira compra.',
    copyrightText: '© 2026 Lunora Fashion Atelier. Todos os direitos reservados.',
    locationText: 'Luanda · Talatona · Entregas em 24–48h',
  },
};

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'Lunora Fashion',
  currencySymbol: 'Kz',
  freeShippingThreshold: 50000,
  supportEmail: 'atelier@lunorafashion.ao',
  integrations: [],
  storefrontConfig: DEFAULT_STOREFRONT_CONFIG,
};
