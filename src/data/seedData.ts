import {
  Product,
  StoreOrder,
  StoreGoal,
  StoreTask,
  StoreCampaign,
  WeeklySalesPoint,
  StoreSettings,
  StorefrontConfig,
} from '../types/store';

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
      image: ASSETS.heroWoman,
      caption: 'Alfaiataria em Linho Natural · Look 01',
    },
    {
      index: '02',
      image: ASSETS.dressesEditorial,
      caption: 'Silhueta Midi em Seda · Look 02',
    },
    {
      index: '03',
      image: ASSETS.boutiqueRack,
      caption: 'Curadoria de Atelier · Look 03',
    },
  ],
  heroTrustBadges: [
    { title: 'Envio Gratuito', subtitle: 'Acima de 50 000 Kz' },
    { title: 'Trocas Fáceis', subtitle: 'Prazo de 30 dias' },
    { title: 'Pagamento Seguro', subtitle: '100% protegido' },
  ],
  categoryStripItems: [
    { label: 'Mulher', category: 'Mulher', image: ASSETS.heroWoman },
    { label: 'Homem', category: 'Homem', image: ASSETS.prodSuedeJacket },
    { label: 'Vestidos', category: 'Vestidos', image: ASSETS.prodDress },
    { label: 'Tops', category: 'Tops', image: ASSETS.prodTop },
    { label: 'Calçado', category: 'Calçado', image: ASSETS.prodHeels },
    { label: 'Malas', category: 'Malas', image: ASSETS.prodBag },
    { label: 'Acessórios', category: 'Acessórios', image: ASSETS.prodSunglasses },
    { label: 'Saldos', category: 'Saldos', image: '', isSale: true },
  ],
  collectionsEyebrow: 'Por Categoria',
  collectionsTitle: 'Encontre o Seu Estilo Perfeito',
  collectionsActionText: 'Ver Todas as Categorias',
  editorialCards: [
    { title: 'Coleção Mulher', category: 'Mulher', image: ASSETS.heroWoman },
    { title: 'Coleção Homem', category: 'Homem', image: ASSETS.prodSuedeJacket },
    { title: 'Vestidos', category: 'Vestidos', image: ASSETS.dressesEditorial },
    { title: 'Acessórios & Pele', category: 'Malas', image: ASSETS.prodBag },
  ],
  promoBanners: [
    {
      eyebrow: 'Oferta Limitada',
      title: 'Saldos da Estação\nAté 50% Desconto',
      ctaText: 'Ver Saldos',
      targetCategory: 'Saldos',
      image: ASSETS.prodTrousers,
    },
    {
      eyebrow: 'Recém-Chegados',
      title: 'Novas Peças\nAcabadas de Chegar',
      ctaText: 'Explorar Novidades',
      targetCategory: 'Vestidos',
      image: ASSETS.boutiqueRack,
    },
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
    image: ASSETS.dressesEditorial,
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
