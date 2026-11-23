import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  bootstrapSupabaseSchemaIfMissing,
  executeSupabaseSql,
  extractProjectRefFromJwt,
  getLastBootstrapDiagnostic,
} from './supabaseBootstrap.ts';
import type {
  OrderItemSummary,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductCategory,
  ProductColorVariant,
  StockMovement,
  StoreCampaign,
  StoreCost,
  StoreCostCategory,
  StoreCustomer,
  StorefrontConfig,
  StoreGoal,
  StoreOrder,
  StoreSettings,
  StoreTask,
  WeeklySalesPoint,
} from '../types/store.ts';
import {
  DEFAULT_STOREFRONT_CONFIG,
  INITIAL_SETTINGS,
  WEEKLY_SALES_DATA,
} from '../data/seedData.ts';
import { computeCurrentWeekStats } from '../utils/weeklyAnalytics.ts';

const CATEGORIES_SEED: { slug: string; name: ProductCategory; sort_order: number }[] = [
  { slug: 'mulher', name: 'Mulher', sort_order: 1 },
  { slug: 'homem', name: 'Homem', sort_order: 2 },
  { slug: 'vestidos', name: 'Vestidos', sort_order: 3 },
  { slug: 'tops', name: 'Tops', sort_order: 4 },
  { slug: 'calcado', name: 'Calçado', sort_order: 5 },
  { slug: 'malas', name: 'Malas', sort_order: 6 },
  { slug: 'acessorios', name: 'Acessórios', sort_order: 7 },
  { slug: 'saldos', name: 'Saldos', sort_order: 8 },
];

const LEGACY_DEMO_PRODUCT_IDS = [
  'prod-1',
  'prod-2',
  'prod-3',
  'prod-4',
  'prod-5',
  'prod-6',
  'prod-7',
  'prod-8',
];
const LEGACY_DEMO_ORDER_IDS = ['LUN-2044', 'LUN-2045', 'LUN-2046', 'LUN-2047', 'LUN-2048'];
const LEGACY_DEMO_GOAL_IDS = ['goal-1', 'goal-2', 'goal-3', 'goal-4'];
const LEGACY_DEMO_TASK_IDS = ['task-1', 'task-2'];
const LEGACY_DEMO_CAMPAIGN_IDS = ['camp-1', 'camp-2', 'camp-3'];
const LEGACY_DEMO_CUSTOMER_EMAILS = [
  'ines.vasconcelos@email.pt',
  'diogo.ferreira@email.pt',
  'mariana.almeida@email.pt',
  'sofia.m@email.pt',
  'beatriz.monteiro@email.pt',
];

function mergeStorefrontConfig(raw: unknown): StorefrontConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Partial<StorefrontConfig>) : {};
  return {
    ...DEFAULT_STOREFRONT_CONFIG,
    ...obj,
    navLabels: {
      ...DEFAULT_STOREFRONT_CONFIG.navLabels,
      ...(obj.navLabels || {}),
    },
    heroSlides:
      Array.isArray(obj.heroSlides) && obj.heroSlides.length > 0
        ? obj.heroSlides
        : DEFAULT_STOREFRONT_CONFIG.heroSlides,
    heroTrustBadges:
      Array.isArray(obj.heroTrustBadges) && obj.heroTrustBadges.length > 0
        ? obj.heroTrustBadges
        : DEFAULT_STOREFRONT_CONFIG.heroTrustBadges,
    categoryStripItems:
      Array.isArray(obj.categoryStripItems) && obj.categoryStripItems.length > 0
        ? obj.categoryStripItems
        : DEFAULT_STOREFRONT_CONFIG.categoryStripItems,
    editorialCards:
      Array.isArray(obj.editorialCards) && obj.editorialCards.length > 0
        ? obj.editorialCards
        : DEFAULT_STOREFRONT_CONFIG.editorialCards,
    promoBanners:
      Array.isArray(obj.promoBanners) && obj.promoBanners.length > 0
        ? obj.promoBanners
        : DEFAULT_STOREFRONT_CONFIG.promoBanners,
    guarantees:
      Array.isArray(obj.guarantees) && obj.guarantees.length > 0
        ? obj.guarantees
        : DEFAULT_STOREFRONT_CONFIG.guarantees,
    newsletter: {
      ...DEFAULT_STOREFRONT_CONFIG.newsletter,
      ...(obj.newsletter || {}),
    },
    footer: {
      ...DEFAULT_STOREFRONT_CONFIG.footer,
      ...(obj.footer || {}),
      supportLinks:
        Array.isArray(obj.footer?.supportLinks) && obj.footer.supportLinks.length > 0
          ? obj.footer.supportLinks
          : DEFAULT_STOREFRONT_CONFIG.footer.supportLinks,
      atelierLinks:
        Array.isArray(obj.footer?.atelierLinks) && obj.footer.atelierLinks.length > 0
          ? obj.footer.atelierLinks
          : DEFAULT_STOREFRONT_CONFIG.footer.atelierLinks,
    },
  };
}

function mergeStorefrontConfigPatch(
  base: StorefrontConfig,
  patch: Partial<StorefrontConfig>
): StorefrontConfig {
  return mergeStorefrontConfig({
    ...base,
    ...patch,
    navLabels: {
      ...base.navLabels,
      ...(patch.navLabels || {}),
    },
    newsletter: {
      ...base.newsletter,
      ...(patch.newsletter || {}),
    },
    footer: {
      ...base.footer,
      ...(patch.footer || {}),
      supportLinks:
        Array.isArray(patch.footer?.supportLinks) && patch.footer.supportLinks.length > 0
          ? patch.footer.supportLinks
          : base.footer.supportLinks,
      atelierLinks:
        Array.isArray(patch.footer?.atelierLinks) && patch.footer.atelierLinks.length > 0
          ? patch.footer.atelierLinks
          : base.footer.atelierLinks,
    },
  });
}

const STOREFRONT_CONFIG_META_ID = '__lunora_storefront_config__';

function isMissingStorefrontColError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return (
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    String(err.message || '').toLowerCase().includes('storefront_config')
  );
}

function extractIntegrationsAndConfig(rawIntegrations: unknown): {
  integrations: StoreSettings['integrations'];
  embeddedConfig: Partial<StorefrontConfig> | null;
} {
  if (!Array.isArray(rawIntegrations)) {
    return { integrations: [], embeddedConfig: null };
  }
  const integrations: StoreSettings['integrations'] = [];
  let embeddedConfig: Partial<StorefrontConfig> | null = null;
  for (const item of rawIntegrations) {
    if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      if (rec.id === STOREFRONT_CONFIG_META_ID) {
        if (rec.config && typeof rec.config === 'object') {
          embeddedConfig = rec.config as Partial<StorefrontConfig>;
        }
        continue;
      }
      integrations.push(item as StoreSettings['integrations'][number]);
    }
  }
  return { integrations, embeddedConfig };
}

function packIntegrationsWithConfig(
  visibleIntegrations: StoreSettings['integrations'],
  config: StorefrontConfig | null
): unknown[] {
  const clean = visibleIntegrations.filter((i) => i && i.id !== STOREFRONT_CONFIG_META_ID);
  if (!config) return clean;
  return [
    ...clean,
    {
      id: STOREFRONT_CONFIG_META_ID,
      name: 'storefront_config',
      role: 'system',
      connected: false,
      config,
    },
  ];
}

function resolveStorefrontFromRow(row: Record<string, unknown> | null): StorefrontConfig | null {
  if (!row) return null;
  if (
    'storefront_config' in row &&
    row.storefront_config &&
    typeof row.storefront_config === 'object' &&
    Object.keys(row.storefront_config as Record<string, unknown>).length > 0
  ) {
    return mergeStorefrontConfig(row.storefront_config);
  }
  const { embeddedConfig } = extractIntegrationsAndConfig(row.integrations);
  if (embeddedConfig && Object.keys(embeddedConfig).length > 0) {
    return mergeStorefrontConfig(embeddedConfig);
  }
  return null;
}

interface MemoryStore {
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
  newsletterEmails: string[];
  adminPasswordHash: string | null;
}

const memoryStore: MemoryStore = {
  products: [],
  customers: [],
  orders: [],
  stockMovements: [],
  goals: [],
  tasks: [],
  campaigns: [],
  weeklySales: structuredClone(WEEKLY_SALES_DATA),
  costs: [],
  settings: structuredClone(INITIAL_SETTINGS),
  newsletterEmails: [],
  adminPasswordHash: null,
};

let cachedClient: SupabaseClient | null = null;
let seededChecked = false;

function resolveSupabaseUrl(rawUrl: string | undefined, key: string | undefined): string | null {
  const cleanUrl = (rawUrl || '').trim().replace(/^[\s"'`<>]+|[\s"'`<>]+$/g, '');

  const jwtRef = extractProjectRefFromJwt(key);

  if (cleanUrl) {
    const dashboardMatch = cleanUrl.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
    if (dashboardMatch?.[1]) {
      return `https://${dashboardMatch[1]}.supabase.co`;
    }

    const dbHostMatch = cleanUrl.match(/(?:^|[@/])db\.([a-z0-9-]+)\.supabase\.co(?:[:/?#]|$)/i);
    if (dbHostMatch?.[1]) {
      return `https://${dbHostMatch[1]}.supabase.co`;
    }

    const supaHostMatch = cleanUrl.match(/([a-z0-9-]+)\.supabase\.co/i);
    if (supaHostMatch?.[1] && !cleanUrl.startsWith('postgres')) {
      return `https://${supaHostMatch[1]}.supabase.co`;
    }

    if (jwtRef) {
      return `https://${jwtRef}.supabase.co`;
    }

    if (cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://')) {
      try {
        const parsed = new URL(cleanUrl);
        return parsed.origin;
      } catch {
        // Fall through
      }
    }
  }

  if (jwtRef) {
    return `https://${jwtRef}.supabase.co`;
  }

  return null;
}

function getCleanedSupabaseEnv() {
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  )
    .trim()
    .replace(/^[\s"'`<>]+|[\s"'`<>]+$/g, '');

  const urlCandidates = [
    process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ];

  let url: string | null = null;
  for (const candidate of urlCandidates) {
    if (!candidate || !candidate.trim()) continue;
    const resolved = resolveSupabaseUrl(candidate, key);
    if (resolved) {
      url = resolved;
      break;
    }
  }
  if (!url) {
    url = resolveSupabaseUrl(undefined, key);
  }

  return { url, key };
}

function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getCleanedSupabaseEnv();
  if (!url || !key) return null;

  if (!cachedClient) {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    });
  }
  return cachedClient;
}

function assertPersistenceAvailable(supabase: SupabaseClient | null) {
  if (!supabase && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
    throw new Error(
      'Base de dados Supabase não conectada neste deployment. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do servidor.'
    );
  }
}

const MEDIA_BUCKET = 'store-media';
let mediaBucketReady = false;

async function ensureMediaBucket(supabase: SupabaseClient): Promise<boolean> {
  if (mediaBucketReady) return true;
  try {
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (!listErr && buckets?.some((b) => b.name === MEDIA_BUCKET)) {
      mediaBucketReady = true;
      return true;
    }
    const { error } = await supabase.storage.createBucket(MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
    });
    if (!error || error.message.toLowerCase().includes('already exists')) {
      mediaBucketReady = true;
      return true;
    }
  } catch {
    // Proceed to direct upload attempt even if bucket listing/creation is restricted
  }
  return false;
}

async function persistImageAsset(
  supabase: SupabaseClient,
  value: string,
  folder = 'products'
): Promise<string> {
  const trimmed = value.trim();
  if (!trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  const match = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
  if (!match) return trimmed;
  try {
    await ensureMediaBucket(supabase);
    const mime = match[1].toLowerCase();
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('gif') ? 'gif' : 'jpg';
    const base64Body = match[2].replace(/\s+/g, '');
    const buffer = Buffer.from(base64Body, 'base64');
    if (buffer.length === 0) return trimmed;

    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
    const filePath = `${folder}/${hash}.${ext}`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(filePath, buffer, {
      contentType: mime,
      upsert: true,
      cacheControl: '31536000',
    });
    if (error) {
      console.warn('Supabase Storage upload warning:', folder, error.message);
      return trimmed;
    }
    mediaBucketReady = true;
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || trimmed;
  } catch (err) {
    console.warn('Supabase Storage upload exception:', err instanceof Error ? err.message : err);
    return trimmed;
  }
}

export async function uploadImageAssetInStore(
  value: string,
  folder: 'products' | 'banners' = 'banners'
): Promise<{ url: string; storedInBucket: boolean }> {
  const trimmed = value.trim();
  const supabase = getSupabaseClient();
  if (!supabase || !trimmed.startsWith('data:image/')) {
    return { url: trimmed, storedInBucket: trimmed.startsWith('http') };
  }
  const uploadedUrl = await persistImageAsset(supabase, trimmed, folder);
  return {
    url: uploadedUrl,
    storedInBucket: uploadedUrl.startsWith('http://') || uploadedUrl.startsWith('https://'),
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

let lastSupabaseError: string | undefined;
let lastSeedStage = 'init';

export async function checkSupabaseTablesStatus(): Promise<{
  configured: boolean;
  tablesReady: boolean;
  productCount: number;
  bootstrapStatus: string;
  seedStage: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      configured: false,
      tablesReady: false,
      productCount: 0,
      bootstrapStatus: 'not_configured',
      seedStage: 'no_client',
    };
  }
  const ready = await ensureSupabaseSeeded(supabase);
  if (!ready) {
    return {
      configured: true,
      tablesReady: false,
      productCount: 0,
      bootstrapStatus: getLastBootstrapDiagnostic(),
      seedStage: lastSeedStage,
    };
  }
  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true });
  return {
    configured: true,
    tablesReady: true,
    productCount: count ?? 0,
    bootstrapStatus: getLastBootstrapDiagnostic(),
    seedStage: lastSeedStage,
  };
}

function parseProductColors(raw: unknown): {
  colors: string[];
  colorVariants: ProductColorVariant[];
} {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { colors: ['Neutro'], colorVariants: [] };
  }
  const variants: ProductColorVariant[] = [];
  const names: string[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && 'image' in item && 'name' in item) {
      const obj = item as { name?: unknown; image?: unknown };
      const name = String(obj.name ?? '').trim();
      const image = String(obj.image ?? '').trim();
      if (name && image) {
        variants.push({ name, image });
        names.push(name);
      }
    } else if (typeof item === 'string' && item.trim()) {
      names.push(item.trim());
    }
  }
  return {
    colors: names.length > 0 ? names : ['Neutro'],
    colorVariants: variants,
  };
}

function mapProductFromRow(row: Record<string, unknown>): Product {
  const { colors, colorVariants } = parseProductColors(row.colors);
  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    category: String(row.category) as ProductCategory,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    rating: Number(row.rating ?? 5.0),
    reviewCount: Number(row.review_count ?? 1),
    stock: Number(row.stock ?? 0),
    sizes: Array.isArray(row.sizes) ? (row.sizes as string[]) : ['Único'],
    colors,
    colorVariants,
    description: String(row.description ?? ''),
    material: String(row.material ?? ''),
    image: String(row.image),
    featured: Boolean(row.featured),
    isNew: Boolean(row.is_new),
    onSale: Boolean(row.on_sale),
  };
}

function mapProductToRow(p: Product) {
  const serializedColors =
    p.colorVariants && p.colorVariants.length > 0 ? p.colorVariants : p.colors;
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    price: p.price,
    original_price: p.originalPrice ?? null,
    rating: p.rating,
    review_count: p.reviewCount,
    stock: p.stock,
    sizes: p.sizes,
    colors: serializedColors,
    description: p.description,
    material: p.material,
    image: p.image,
    featured: Boolean(p.featured),
    is_new: Boolean(p.isNew),
    on_sale: Boolean(p.onSale),
  };
}

function mapOrderFromRow(
  row: Record<string, unknown>,
  relationalItems?: OrderItemSummary[]
): StoreOrder {
  const fallbackItems = Array.isArray(row.items) ? (row.items as OrderItemSummary[]) : [];
  return {
    id: String(row.id),
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    customerName: String(row.customer_name),
    customerEmail: String(row.customer_email),
    customerPhone: String(row.customer_phone),
    shippingAddress: String(row.shipping_address),
    city: String(row.city),
    postalCode: String(row.postal_code),
    paymentMethod: String(row.payment_method) as StoreOrder['paymentMethod'],
    items: relationalItems && relationalItems.length > 0 ? relationalItems : fallbackItems,
    total: Number(row.total),
    status: String(row.status) as OrderStatus,
    createdAt: String(row.created_at),
    progressStep: Number(row.progress_step ?? 1),
    totalSteps: Number(row.total_steps ?? 3),
  };
}

let inFlightSeedPromise: Promise<boolean> | null = null;
let lastSeedFailureAt = 0;
let hasStorefrontConfigCol = true;
let hasStoreCostsTable = true;

async function ensureSupabaseSeeded(supabase: SupabaseClient): Promise<boolean> {
  if (seededChecked) return true;
  if (lastSeedFailureAt && Date.now() - lastSeedFailureAt < 10_000) {
    return false;
  }
  if (inFlightSeedPromise) {
    return inFlightSeedPromise;
  }

  inFlightSeedPromise = (async () => {
    lastSupabaseError = undefined;
    lastSeedStage = 'checking_products';
    try {
      let [prodCheck, settingsCheck] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }).limit(1),
        supabase.from('store_settings').select('id, currency_symbol, support_email').limit(1),
      ]);

      const { url, key } = getCleanedSupabaseEnv();
      const urlRefMatch = url?.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
      const projectRef = urlRefMatch?.[1] || extractProjectRefFromJwt(key);

      let schemaError = prodCheck.error || settingsCheck.error;

      if (schemaError) {
        lastSeedStage = `schema_probe_error:${schemaError.code || 'ERR'}`;
        if (projectRef) {
          lastSeedStage = 'running_bootstrap';
          const created = await bootstrapSupabaseSchemaIfMissing(projectRef);
          if (created) {
            await new Promise((r) => setTimeout(r, 1500));
            [prodCheck, settingsCheck] = await Promise.all([
              supabase.from('products').select('id', { count: 'exact' }).limit(1),
              supabase.from('store_settings').select('id, currency_symbol, support_email').limit(1),
            ]);
            schemaError = prodCheck.error || settingsCheck.error;
          }
        } else {
          lastSeedStage = `missing_project_ref:url_prefix=${url ? url.slice(0, 8) : 'none'}:key_jwt=${key.startsWith('eyJ')}`;
        }
      }

      if (schemaError) {
        lastSupabaseError = schemaError.message;
        if (lastSeedStage === 'running_bootstrap') {
          lastSeedStage = `select_still_failing:${schemaError.code || 'ERR'}`;
        }
        lastSeedFailureAt = Date.now();
        console.error('Supabase schema check failed:', schemaError.code || '', schemaError.message);
        return false;
      }

      // Check or migrate optional storefront_config column & store_costs table without blocking core tables
      let cfgProbe = await supabase.from('store_settings').select('storefront_config').limit(1);
      if (cfgProbe.error) {
        const isMissingCol =
          cfgProbe.error.code === '42703' ||
          cfgProbe.error.code === 'PGRST204' ||
          cfgProbe.error.message.toLowerCase().includes('storefront_config');
        if (isMissingCol && projectRef) {
          const altered = await executeSupabaseSql(
            projectRef,
            "ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS storefront_config jsonb NOT NULL DEFAULT '{}'::jsonb; ALTER TABLE public.store_settings ALTER COLUMN free_shipping_threshold TYPE numeric(12, 2);"
          );
          if (altered) {
            for (let attempt = 0; attempt < 3; attempt++) {
              await new Promise((r) => setTimeout(r, 1000));
              cfgProbe = await supabase.from('store_settings').select('storefront_config').limit(1);
              if (!cfgProbe.error) break;
            }
          }
        }
        hasStorefrontConfigCol = cfgProbe.error ? !isMissingCol : true;
      } else {
        hasStorefrontConfigCol = true;
      }

      let costsProbe = await supabase.from('store_costs').select('id').limit(1);
      if (costsProbe.error) {
        if (projectRef) {
          const createdCosts = await executeSupabaseSql(
            projectRef,
            "CREATE TABLE IF NOT EXISTS public.store_costs (id text primary key, title text not null, category text not null default 'Operacional', amount numeric(12, 2) not null check (amount >= 0), cost_date text not null, created_at timestamptz not null default now()); CREATE INDEX IF NOT EXISTS idx_store_costs_date ON public.store_costs(cost_date); ALTER TABLE public.store_costs disable row level security;"
          );
          if (createdCosts) {
            for (let attempt = 0; attempt < 3; attempt++) {
              await new Promise((r) => setTimeout(r, 1000));
              costsProbe = await supabase.from('store_costs').select('id').limit(1);
              if (!costsProbe.error) break;
            }
          }
        }
        hasStoreCostsTable = !costsProbe.error;
      } else {
        hasStoreCostsTable = true;
      }

      if (
        projectRef &&
        (process.env.SUPABASE_DB_PASSWORD ||
          process.env.SUPABASE_DB_URL ||
          process.env.DATABASE_URL ||
          process.env.POSTGRES_URL)
      ) {
        await executeSupabaseSql(
          projectRef,
          `
          ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.order_items DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.stock_movements DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.goals DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.campaigns DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.weekly_sales DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.store_settings DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.newsletter_subscribers DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS public.store_costs DISABLE ROW LEVEL SECURITY;
          GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
          GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
          `.trim()
        ).catch(() => false);
      }

      // Best-effort secondary seed/cleanup steps — never block reading products or settings if non-fatal
      try {
        const catRes = await supabase.from('categories').upsert(CATEGORIES_SEED, { onConflict: 'slug' });
        if (catRes.error) {
          console.warn('Supabase categories seed warning:', catRes.error.message);
        }

        const [{ data: legacyProdCheck }, { data: legacyOrderCheck }, { data: legacyGoalCheck }] =
          await Promise.all([
            supabase.from('products').select('id').in('id', LEGACY_DEMO_PRODUCT_IDS).limit(1),
            supabase.from('orders').select('id').in('id', LEGACY_DEMO_ORDER_IDS).limit(1),
            supabase.from('goals').select('id').in('id', LEGACY_DEMO_GOAL_IDS).limit(1),
          ]);

        if (
          (legacyProdCheck && legacyProdCheck.length > 0) ||
          (legacyOrderCheck && legacyOrderCheck.length > 0) ||
          (legacyGoalCheck && legacyGoalCheck.length > 0)
        ) {
          await supabase.from('stock_movements').delete().in('product_id', LEGACY_DEMO_PRODUCT_IDS);
          await supabase.from('order_items').delete().in('order_id', LEGACY_DEMO_ORDER_IDS);
          await supabase.from('tasks').delete().in('id', LEGACY_DEMO_TASK_IDS);
          await supabase.from('orders').delete().in('id', LEGACY_DEMO_ORDER_IDS);
          await supabase.from('products').delete().in('id', LEGACY_DEMO_PRODUCT_IDS);
          await supabase.from('customers').delete().in('email', LEGACY_DEMO_CUSTOMER_EMAILS);
          await supabase.from('goals').delete().in('id', LEGACY_DEMO_GOAL_IDS);
          await supabase.from('campaigns').delete().in('id', LEGACY_DEMO_CAMPAIGN_IDS);
          await supabase.from('newsletter_subscribers').delete().in('email', LEGACY_DEMO_CUSTOMER_EMAILS);
        }

        const { data: existingWeekly } = await supabase
          .from('weekly_sales')
          .select('day_index, apparel');
        const { count: realOrdersCount } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true });
        const hasDemoSales =
          (realOrdersCount ?? 0) === 0 &&
          existingWeekly?.some((w) => w.day_index === 0 && Number(w.apparel) === 1420);

        if (!existingWeekly || existingWeekly.length === 0 || hasDemoSales) {
          await supabase.from('weekly_sales').upsert(
            WEEKLY_SALES_DATA.map((w, idx) => ({
              day_index: idx,
              day: w.day,
              full_day: w.fullDay,
              apparel: w.apparel,
              accessories: w.accessories,
              delta_percent: w.deltaPercent,
            }))
          );
        }

        if (!settingsCheck.data || settingsCheck.data.length === 0) {
          const baseSettings: Record<string, unknown> = {
            id: 1,
            store_name: INITIAL_SETTINGS.storeName,
            currency_symbol: INITIAL_SETTINGS.currencySymbol,
            free_shipping_threshold: INITIAL_SETTINGS.freeShippingThreshold,
            support_email: INITIAL_SETTINGS.supportEmail,
            integrations: INITIAL_SETTINGS.integrations,
          };
          if (hasStorefrontConfigCol) {
            baseSettings.storefront_config = INITIAL_SETTINGS.storefrontConfig;
          }
          await supabase.from('store_settings').upsert(baseSettings);
        } else if (
          settingsCheck.data[0]?.currency_symbol === '€' &&
          settingsCheck.data[0]?.support_email === 'atelier@lunorafashion.pt'
        ) {
          const patch: Record<string, unknown> = {
            currency_symbol: 'Kz',
            free_shipping_threshold: 50000,
            support_email: 'atelier@lunorafashion.ao',
          };
          await supabase.from('store_settings').update(patch).eq('id', 1);
        }
      } catch (seedWarn) {
        console.warn('Supabase non-fatal seed warning:', seedWarn);
      }

      lastSeedStage = 'ready';
      seededChecked = true;
      return true;
    } catch (err) {
      lastSeedStage = 'exception';
      lastSeedFailureAt = Date.now();
      console.error('Supabase initialization error:', err);
      return false;
    } finally {
      inFlightSeedPromise = null;
    }
  })();

  return inFlightSeedPromise;
}

export async function getPublicStoreData(): Promise<{
  products: Product[];
  settings: Pick<
    StoreSettings,
    'storeName' | 'currencySymbol' | 'freeShippingThreshold' | 'supportEmail' | 'storefrontConfig'
  >;
  persistence: 'supabase' | 'memory';
}> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    const settingsCols = hasStorefrontConfigCol
      ? 'store_name, currency_symbol, free_shipping_threshold, support_email, integrations, storefront_config'
      : 'store_name, currency_symbol, free_shipping_threshold, support_email, integrations';
    let [prodRes, setRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('store_settings').select(settingsCols).eq('id', 1).maybeSingle(),
    ]);

    if (setRes.error && hasStorefrontConfigCol && isMissingStorefrontColError(setRes.error)) {
      hasStorefrontConfigCol = false;
      setRes = await supabase
        .from('store_settings')
        .select('store_name, currency_symbol, free_shipping_threshold, support_email, integrations')
        .eq('id', 1)
        .maybeSingle();
    }

    if (!prodRes.error && prodRes.data) {
      const settingsRow = setRes.data as Record<string, unknown> | null;
      const rowStorefrontConfig = resolveStorefrontFromRow(settingsRow);
      const resolvedSettings = settingsRow
        ? {
            storeName: String(settingsRow.store_name),
            currencySymbol: String(settingsRow.currency_symbol),
            freeShippingThreshold: Number(settingsRow.free_shipping_threshold),
            supportEmail: String(settingsRow.support_email),
            storefrontConfig: rowStorefrontConfig || memoryStore.settings.storefrontConfig,
          }
        : {
            storeName: memoryStore.settings.storeName,
            currencySymbol: memoryStore.settings.currencySymbol,
            freeShippingThreshold: memoryStore.settings.freeShippingThreshold,
            supportEmail: memoryStore.settings.supportEmail,
            storefrontConfig: memoryStore.settings.storefrontConfig,
          };

      if (settingsRow) {
        const { integrations: cleanInt } = extractIntegrationsAndConfig(settingsRow.integrations);
        memoryStore.settings = {
          ...resolvedSettings,
          integrations: Array.isArray(settingsRow.integrations)
            ? cleanInt
            : memoryStore.settings.integrations,
        };
      }

      return {
        products: prodRes.data.map((r) => mapProductFromRow(r as Record<string, unknown>)),
        settings: resolvedSettings,
        persistence: 'supabase',
      };
    }
  }

  return {
    products: memoryStore.products,
    settings: {
      storeName: memoryStore.settings.storeName,
      currencySymbol: memoryStore.settings.currencySymbol,
      freeShippingThreshold: memoryStore.settings.freeShippingThreshold,
      supportEmail: memoryStore.settings.supportEmail,
      storefrontConfig: memoryStore.settings.storefrontConfig,
    },
    persistence: 'memory',
  };
}

export async function getAdminBundle() {
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    const [prodRes, ordRes, itemRes, custRes, movRes, goalRes, taskRes, campRes, salesRes, setRes, newsRes, costRes] =
      await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('id', { ascending: false }),
        supabase.from('order_items').select('*'),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(40),
        supabase.from('goals').select('*').order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('campaigns').select('*').order('id', { ascending: true }),
        supabase.from('weekly_sales').select('*').order('day_index', { ascending: true }),
        supabase.from('store_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('newsletter_subscribers').select('email'),
        hasStoreCostsTable
          ? supabase.from('store_costs').select('*').order('created_at', { ascending: false })
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (!prodRes.error && !ordRes.error) {
      const itemsByOrder = new Map<string, OrderItemSummary[]>();
      (itemRes.data ?? []).forEach((row) => {
        const orderId = String(row.order_id);
        const list = itemsByOrder.get(orderId) ?? [];
        list.push({
          productId: row.product_id ? String(row.product_id) : '',
          name: String(row.product_name),
          size: String(row.size),
          quantity: Number(row.quantity),
          unitPrice: Number(row.unit_price),
        });
        itemsByOrder.set(orderId, list);
      });

      const mappedProducts = (prodRes.data ?? []).map((r) =>
        mapProductFromRow(r as Record<string, unknown>)
      );
      const mappedOrders = (ordRes.data ?? []).map((r) =>
        mapOrderFromRow(r as Record<string, unknown>, itemsByOrder.get(String(r.id)))
      );
      const computedWeekly = computeCurrentWeekStats(mappedOrders, mappedProducts).map((d) => ({
        day: d.day,
        fullDay: d.fullDay,
        apparel: d.apparel,
        accessories: d.accessories,
        deltaPercent: d.deltaPercent,
      }));

      return {
        products: mappedProducts,
        customers: (custRes.data ?? []).map((c) => ({
          id: String(c.id),
          name: String(c.name),
          email: String(c.email),
          phone: String(c.phone),
          shippingAddress: String(c.shipping_address),
          city: String(c.city),
          postalCode: String(c.postal_code),
        })),
        orders: mappedOrders,
        stockMovements: (movRes.data ?? []).map((m) => ({
          id: String(m.id),
          productId: String(m.product_id),
          orderId: m.order_id ? String(m.order_id) : undefined,
          delta: Number(m.delta),
          reason: String(m.reason),
          createdAt: String(m.created_at),
        })),
        goals: (goalRes.data ?? []).map((g) => ({
          id: String(g.id),
          title: String(g.title),
          completed: Boolean(g.completed),
        })),
        tasks: (taskRes.data ?? []).map((t) => ({
          id: String(t.id),
          title: String(t.title),
          dueDate: String(t.due_date),
          category: String(t.category) as StoreTask['category'],
          orderId: t.order_id ? String(t.order_id) : undefined,
          productId: t.product_id ? String(t.product_id) : undefined,
          pinned: Boolean(t.pinned),
          notify: Boolean(t.notify),
        })),
        campaigns: (campRes.data ?? []).map((c) => ({
          id: String(c.id),
          title: String(c.title),
          status: String(c.status) as StoreCampaign['status'],
          summary: String(c.summary),
          category: c.category ? (String(c.category) as ProductCategory) : undefined,
          completedSteps: Number(c.completed_steps),
          totalSteps: Number(c.total_steps),
        })),
        weeklySales: computedWeekly.length
          ? computedWeekly
          : (salesRes.data ?? []).map((w) => ({
              day: String(w.day),
              fullDay: String(w.full_day),
              apparel: Number(w.apparel),
              accessories: Number(w.accessories),
              deltaPercent: Number(w.delta_percent),
            })),
        costs:
          hasStoreCostsTable && costRes.data
            ? (costRes.data as Record<string, unknown>[]).map((c) => ({
                id: String(c.id),
                title: String(c.title),
                category: String(c.category) as StoreCostCategory,
                amount: Number(c.amount),
                date: String(c.cost_date),
              }))
            : memoryStore.costs,
        settings: setRes.data
          ? (() => {
              const row = setRes.data as Record<string, unknown>;
              const { integrations: cleanIntegrations } = extractIntegrationsAndConfig(row.integrations);
              const resolvedSf = resolveStorefrontFromRow(row) || memoryStore.settings.storefrontConfig;
              return {
                storeName: String(row.store_name),
                currencySymbol: String(row.currency_symbol),
                freeShippingThreshold: Number(row.free_shipping_threshold),
                supportEmail: String(row.support_email),
                integrations: Array.isArray(row.integrations)
                  ? cleanIntegrations
                  : memoryStore.settings.integrations,
                storefrontConfig: resolvedSf,
              };
            })()
          : memoryStore.settings,
        newsletterEmails: (newsRes.data ?? []).map((n) => String(n.email)),
        persistence: 'supabase' as const,
      };
    }
  }

  return {
    products: memoryStore.products,
    customers: memoryStore.customers,
    orders: memoryStore.orders,
    stockMovements: memoryStore.stockMovements,
    goals: memoryStore.goals,
    tasks: memoryStore.tasks,
    campaigns: memoryStore.campaigns,
    weeklySales: memoryStore.weeklySales,
    costs: memoryStore.costs,
    settings: memoryStore.settings,
    newsletterEmails: memoryStore.newsletterEmails,
    persistence: 'memory' as const,
  };
}

export async function createOrderInStore(input: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  postalCode: string;
  paymentMethod: PaymentMethod;
  items: { productId: string; size: string; quantity: number }[];
  discountApplied: boolean;
}): Promise<StoreOrder> {
  const publicData = await getPublicStoreData();
  const productMap = new Map(publicData.products.map((p) => [p.id, p]));

  const verifiedItems: OrderItemSummary[] = [];
  for (const line of input.items) {
    const prod = productMap.get(line.productId);
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    if (!prod) {
      throw new Error('Produto não encontrado no catálogo.');
    }
    if (prod.stock < qty) {
      throw new Error(`Stock insuficiente para ${prod.name}.`);
    }
    verifiedItems.push({
      productId: prod.id,
      name: prod.name,
      size: String(line.size || prod.sizes[0] || 'Único').slice(0, 20),
      quantity: qty,
      unitPrice: prod.price,
    });
  }

  if (verifiedItems.length === 0) {
    throw new Error('O saco de compras está vazio.');
  }

  const subtotal = verifiedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = input.discountApplied ? +(subtotal * 0.9).toFixed(2) : +subtotal.toFixed(2);
  const orderId = `LUN-${Math.floor(2050 + (Date.now() % 7900))}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  const normalizedEmail = input.customerEmail.trim().toLowerCase();

  const newOrder: StoreOrder = {
    id: orderId,
    customerName: input.customerName.trim(),
    customerEmail: normalizedEmail,
    customerPhone: input.customerPhone.trim(),
    shippingAddress: input.shippingAddress.trim(),
    city: input.city.trim(),
    postalCode: input.postalCode.trim(),
    paymentMethod: input.paymentMethod,
    items: verifiedItems,
    total,
    status: 'Pendente',
    createdAt,
    progressStep: 1,
    totalSteps: 3,
  };

  const taskId = `task-${Date.now()}`;
  const taskTitle = `Preparar encomenda #${orderId} (${newOrder.customerName})`;

  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    // 1. Upsert relational customer record
    const customerId = `cust-${Date.now()}`;
    const { data: existingCust } = await supabase
      .from('customers')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    const resolvedCustomerId = existingCust?.id ? String(existingCust.id) : customerId;
    await supabase.from('customers').upsert(
      {
        id: resolvedCustomerId,
        name: newOrder.customerName,
        email: normalizedEmail,
        phone: newOrder.customerPhone,
        shipping_address: newOrder.shippingAddress,
        city: newOrder.city,
        postal_code: newOrder.postalCode,
      },
      { onConflict: 'email' }
    );

    // 2. Insert order linked to customer_id
    const { error: orderErr } = await supabase.from('orders').insert({
      id: newOrder.id,
      customer_id: resolvedCustomerId,
      customer_name: newOrder.customerName,
      customer_email: newOrder.customerEmail,
      customer_phone: newOrder.customerPhone,
      shipping_address: newOrder.shippingAddress,
      city: newOrder.city,
      postal_code: newOrder.postalCode,
      payment_method: newOrder.paymentMethod,
      items: newOrder.items,
      total: newOrder.total,
      status: newOrder.status,
      created_at: newOrder.createdAt,
      progress_step: newOrder.progressStep,
      total_steps: newOrder.totalSteps,
    });
    if (orderErr) throw new Error('Falha ao gravar encomenda na base de dados.');

    // 3. Insert relational order_items rows
    await supabase.from('order_items').insert(
      verifiedItems.map((item, idx) => ({
        id: `oi-${orderId}-${idx + 1}`,
        order_id: orderId,
        product_id: item.productId,
        product_name: item.name,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))
    );

    // 4. Decrement product stock & record stock_movements
    for (const item of verifiedItems) {
      const prod = productMap.get(item.productId)!;
      await supabase
        .from('products')
        .update({ stock: Math.max(0, prod.stock - item.quantity) })
        .eq('id', prod.id);

      await supabase.from('stock_movements').insert({
        id: `mov-${orderId}-${item.productId}`,
        product_id: item.productId,
        order_id: orderId,
        delta: -item.quantity,
        reason: `Venda na loja (#${orderId})`,
      });
    }

    // 5. Create linked operational task
    await supabase.from('tasks').insert({
      id: taskId,
      title: taskTitle,
      due_date: 'Hoje',
      category: 'pedido',
      order_id: orderId,
      pinned: true,
      notify: true,
    });

    // Note: New checkout orders start as 'Pendente' (unpaid) and only add to weekly_sales when marked 'Entregue'.

    return { ...newOrder, customerId: resolvedCustomerId };
  }

  // Memory fallback
  let cust = memoryStore.customers.find((c) => c.email.toLowerCase() === normalizedEmail);
  if (!cust) {
    cust = {
      id: `cust-${Date.now()}`,
      name: newOrder.customerName,
      email: normalizedEmail,
      phone: newOrder.customerPhone,
      shippingAddress: newOrder.shippingAddress,
      city: newOrder.city,
      postalCode: newOrder.postalCode,
    };
    memoryStore.customers = [cust, ...memoryStore.customers];
  }
  newOrder.customerId = cust.id;
  memoryStore.orders = [newOrder, ...memoryStore.orders];
  memoryStore.products = memoryStore.products.map((prod) => {
    const orderedQty = verifiedItems
      .filter((i) => i.productId === prod.id)
      .reduce((s, i) => s + i.quantity, 0);
    return orderedQty ? { ...prod, stock: Math.max(0, prod.stock - orderedQty) } : prod;
  });
  verifiedItems.forEach((item) => {
    memoryStore.stockMovements.unshift({
      id: `mov-${orderId}-${item.productId}`,
      productId: item.productId,
      orderId,
      delta: -item.quantity,
      reason: `Venda na loja (#${orderId})`,
      createdAt: new Date().toISOString(),
    });
  });
  memoryStore.tasks = [
    {
      id: taskId,
      title: taskTitle,
      dueDate: 'Hoje',
      category: 'pedido',
      orderId,
      pinned: true,
      notify: true,
    },
    ...memoryStore.tasks,
  ];
  return newOrder;
}

export interface ManualOrderLineInput {
  productId?: string;
  name?: string;
  size?: string;
  quantity: number;
  unitPrice?: number;
}

export async function createManualOrderInStore(input: {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  city?: string;
  postalCode?: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  items: ManualOrderLineInput[];
  discountApplied: boolean;
}): Promise<StoreOrder> {
  const customerName = input.customerName.trim();
  if (!customerName) {
    throw new Error('Informe o nome do cliente.');
  }

  const publicData = await getPublicStoreData();
  const productMap = new Map(publicData.products.map((p) => [p.id, p]));

  const verifiedItems: OrderItemSummary[] = [];
  const stockDeductions: { prod: Product; quantity: number }[] = [];

  for (const line of input.items) {
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const trimmedProductId = typeof line.productId === 'string' ? line.productId.trim() : '';

    if (trimmedProductId) {
      const prod = productMap.get(trimmedProductId);
      if (!prod) {
        throw new Error('Produto selecionado não encontrado no catálogo.');
      }
      const alreadyQueued = stockDeductions
        .filter((d) => d.prod.id === prod.id)
        .reduce((s, d) => s + d.quantity, 0);
      if (prod.stock < alreadyQueued + qty) {
        throw new Error(`Stock insuficiente para ${prod.name}. Disponível: ${prod.stock} un.`);
      }
      const unitPrice =
        line.unitPrice !== undefined && Number.isFinite(Number(line.unitPrice)) && Number(line.unitPrice) >= 0
          ? Number(line.unitPrice)
          : prod.price;
      verifiedItems.push({
        productId: prod.id,
        name: prod.name,
        size: String(line.size || prod.sizes[0] || 'Único').slice(0, 20),
        quantity: qty,
        unitPrice,
      });
      stockDeductions.push({ prod, quantity: qty });
    } else {
      const customName = typeof line.name === 'string' ? line.name.trim() : '';
      const unitPrice = Number(line.unitPrice);
      if (!customName) {
        throw new Error('Preencha o nome do artigo personalizado ou selecione um produto.');
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error('Informe um preço válido para o artigo.');
      }
      verifiedItems.push({
        productId: '',
        name: customName.slice(0, 120),
        size: String(line.size || 'Único').slice(0, 20),
        quantity: qty,
        unitPrice,
      });
    }
  }

  if (verifiedItems.length === 0) {
    throw new Error('Adicione pelo menos um artigo à encomenda.');
  }

  const subtotal = verifiedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = input.discountApplied ? +(subtotal * 0.9).toFixed(2) : +subtotal.toFixed(2);
  const orderId = `LUN-${Math.floor(2050 + (Date.now() % 7900))}`;
  const createdAt = new Date().toISOString().slice(0, 10);

  const rawEmail = (input.customerEmail || '').trim().toLowerCase();
  const normalizedEmail =
    rawEmail && rawEmail.includes('@') ? rawEmail : `balcao-${Date.now()}@registo.local`;

  const stepMap: Record<OrderStatus, number> = {
    Pendente: 1,
    'Em Preparação': 1,
    'Em Trânsito': 2,
    Entregue: 3,
  };
  const status = input.status;
  const progressStep = stepMap[status] ?? 1;

  const newOrder: StoreOrder = {
    id: orderId,
    customerName,
    customerEmail: normalizedEmail,
    customerPhone: (input.customerPhone || '').trim() || '—',
    shippingAddress: (input.shippingAddress || '').trim() || 'Registo manual em loja',
    city: (input.city || '').trim() || 'Luanda',
    postalCode: (input.postalCode || '').trim() || '—',
    paymentMethod: input.paymentMethod,
    items: verifiedItems,
    total,
    status,
    createdAt,
    progressStep,
    totalSteps: 3,
  };

  const taskId = `task-${Date.now()}`;
  const taskTitle = `Encomenda manual #${orderId} (${newOrder.customerName})`;
  const activeTask = status !== 'Entregue';

  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    const customerId = `cust-${Date.now()}`;
    const { data: existingCust } = await supabase
      .from('customers')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    const resolvedCustomerId = existingCust?.id ? String(existingCust.id) : customerId;
    await supabase.from('customers').upsert(
      {
        id: resolvedCustomerId,
        name: newOrder.customerName,
        email: normalizedEmail,
        phone: newOrder.customerPhone,
        shipping_address: newOrder.shippingAddress,
        city: newOrder.city,
        postal_code: newOrder.postalCode,
      },
      { onConflict: 'email' }
    );

    const { error: orderErr } = await supabase.from('orders').insert({
      id: newOrder.id,
      customer_id: resolvedCustomerId,
      customer_name: newOrder.customerName,
      customer_email: newOrder.customerEmail,
      customer_phone: newOrder.customerPhone,
      shipping_address: newOrder.shippingAddress,
      city: newOrder.city,
      postal_code: newOrder.postalCode,
      payment_method: newOrder.paymentMethod,
      items: newOrder.items,
      total: newOrder.total,
      status: newOrder.status,
      created_at: newOrder.createdAt,
      progress_step: newOrder.progressStep,
      total_steps: newOrder.totalSteps,
    });
    if (orderErr) throw new Error('Falha ao gravar encomenda na base de dados.');

    await supabase.from('order_items').insert(
      verifiedItems.map((item, idx) => ({
        id: `oi-${orderId}-${idx + 1}`,
        order_id: orderId,
        product_id: item.productId ? item.productId : null,
        product_name: item.name,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))
    );

    // Aggregate stock deductions per productId cleanly
    const aggregatedDeductions = new Map<string, { prod: Product; quantity: number }>();
    for (const d of stockDeductions) {
      const existing = aggregatedDeductions.get(d.prod.id);
      if (existing) existing.quantity += d.quantity;
      else aggregatedDeductions.set(d.prod.id, { prod: d.prod, quantity: d.quantity });
    }

    for (const { prod, quantity } of aggregatedDeductions.values()) {
      await supabase
        .from('products')
        .update({ stock: Math.max(0, prod.stock - quantity) })
        .eq('id', prod.id);

      await supabase.from('stock_movements').insert({
        id: `mov-${orderId}-${prod.id}`,
        product_id: prod.id,
        order_id: orderId,
        delta: -quantity,
        reason: `Encomenda manual (#${orderId})`,
      });
    }

    await supabase.from('tasks').insert({
      id: taskId,
      title: taskTitle,
      due_date: 'Hoje',
      category: 'pedido',
      order_id: orderId,
      pinned: activeTask,
      notify: activeTask,
    });

    if (status === 'Entregue') {
      const { data: sunday } = await supabase
        .from('weekly_sales')
        .select('apparel')
        .eq('day_index', 6)
        .maybeSingle();
      if (sunday) {
        await supabase
          .from('weekly_sales')
          .update({ apparel: Math.round(Number(sunday.apparel) + total) })
          .eq('day_index', 6);
      }
    }

    return { ...newOrder, customerId: resolvedCustomerId };
  }

  let cust = memoryStore.customers.find((c) => c.email.toLowerCase() === normalizedEmail);
  if (!cust) {
    cust = {
      id: `cust-${Date.now()}`,
      name: newOrder.customerName,
      email: normalizedEmail,
      phone: newOrder.customerPhone,
      shippingAddress: newOrder.shippingAddress,
      city: newOrder.city,
      postalCode: newOrder.postalCode,
    };
    memoryStore.customers = [cust, ...memoryStore.customers];
  }
  newOrder.customerId = cust.id;
  memoryStore.orders = [newOrder, ...memoryStore.orders];
  memoryStore.products = memoryStore.products.map((prod) => {
    const orderedQty = stockDeductions
      .filter((i) => i.prod.id === prod.id)
      .reduce((s, i) => s + i.quantity, 0);
    return orderedQty ? { ...prod, stock: Math.max(0, prod.stock - orderedQty) } : prod;
  });
  stockDeductions.forEach((item, idx) => {
    memoryStore.stockMovements.unshift({
      id: `mov-${orderId}-${item.prod.id}-${idx}`,
      productId: item.prod.id,
      orderId,
      delta: -item.quantity,
      reason: `Encomenda manual (#${orderId})`,
      createdAt: new Date().toISOString(),
    });
  });
  memoryStore.tasks = [
    {
      id: taskId,
      title: taskTitle,
      dueDate: 'Hoje',
      category: 'pedido',
      orderId,
      pinned: activeTask,
      notify: activeTask,
    },
    ...memoryStore.tasks,
  ];
  if (status === 'Entregue') {
    const lastIdx = memoryStore.weeklySales.length - 1;
    if (lastIdx >= 0) {
      memoryStore.weeklySales[lastIdx] = {
        ...memoryStore.weeklySales[lastIdx],
        apparel: Math.round(memoryStore.weeklySales[lastIdx].apparel + total),
      };
    }
  }
  return newOrder;
}

export async function updateOrderStatusInStore(orderId: string, status: OrderStatus) {
  const stepMap: Record<OrderStatus, number> = {
    Pendente: 1,
    'Em Preparação': 1,
    'Em Trânsito': 2,
    Entregue: 3,
  };
  const progressStep = stepMap[status] ?? 1;

  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('status, total')
      .eq('id', orderId)
      .maybeSingle();

    const prevStatus = existingOrder ? String(existingOrder.status) : null;
    const orderTotal = existingOrder ? Number(existingOrder.total) || 0 : 0;
    const wasPaid = prevStatus === 'Entregue';
    const isPaid = status === 'Entregue';

    await supabase
      .from('orders')
      .update({ status, progress_step: progressStep })
      .eq('id', orderId);

    if (wasPaid !== isPaid && orderTotal > 0) {
      const { data: sunday } = await supabase
        .from('weekly_sales')
        .select('apparel')
        .eq('day_index', 6)
        .maybeSingle();
      if (sunday) {
        const delta = isPaid ? orderTotal : -orderTotal;
        await supabase
          .from('weekly_sales')
          .update({ apparel: Math.max(0, Math.round(Number(sunday.apparel) + delta)) })
          .eq('day_index', 6);
      }
    }

    await supabase
      .from('tasks')
      .update({ notify: !isPaid, pinned: !isPaid })
      .eq('order_id', orderId);
    return;
  }

  const target = memoryStore.orders.find((o) => o.id === orderId);
  const wasPaid = target?.status === 'Entregue';
  const isPaid = status === 'Entregue';

  memoryStore.orders = memoryStore.orders.map((o) =>
    o.id === orderId ? { ...o, status, progressStep } : o
  );

  if (target && wasPaid !== isPaid && target.total > 0) {
    const lastIdx = memoryStore.weeklySales.length - 1;
    if (lastIdx >= 0) {
      const delta = isPaid ? target.total : -target.total;
      memoryStore.weeklySales[lastIdx] = {
        ...memoryStore.weeklySales[lastIdx],
        apparel: Math.max(0, Math.round(memoryStore.weeklySales[lastIdx].apparel + delta)),
      };
    }
  }

  memoryStore.tasks = memoryStore.tasks.map((t) =>
    t.orderId === orderId ? { ...t, notify: !isPaid, pinned: !isPaid } : t
  );
}

export async function deleteOrderInStore(orderId: string) {
  const supabase = getSupabaseClient();
  assertPersistenceAvailable(supabase);
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);

    const [{ data: existingOrder }, { data: orderItems }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, status, items, customer_id, customer_email')
        .eq('id', orderId)
        .maybeSingle(),
      supabase.from('order_items').select('product_id, quantity').eq('order_id', orderId),
    ]);

    if (!existingOrder) {
      throw new Error('Encomenda não encontrada.');
    }

    // Restore product stock when deleting an order that hasn't been delivered
    if (String(existingOrder.status) !== 'Entregue') {
      const qtyByProduct = new Map<string, number>();
      if (Array.isArray(orderItems) && orderItems.length > 0) {
        for (const item of orderItems) {
          const pid = item.product_id ? String(item.product_id) : '';
          const qty = Math.max(0, Number(item.quantity) || 0);
          if (pid && qty > 0) {
            qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + qty);
          }
        }
      } else if (Array.isArray(existingOrder.items)) {
        for (const item of existingOrder.items as OrderItemSummary[]) {
          const pid = item.productId ? String(item.productId) : '';
          const qty = Math.max(0, Number(item.quantity) || 0);
          if (pid && qty > 0) {
            qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + qty);
          }
        }
      }

      for (const [pid, restoreQty] of qtyByProduct.entries()) {
        const { data: prod } = await supabase
          .from('products')
          .select('stock')
          .eq('id', pid)
          .maybeSingle();
        if (prod) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, Number(prod.stock || 0) + restoreQty) })
            .eq('id', pid);
        }
      }
    }

    await supabase.from('stock_movements').delete().eq('order_id', orderId);
    await supabase.from('order_items').delete().eq('order_id', orderId);
    await supabase.from('tasks').delete().eq('order_id', orderId);
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      throw new Error(`Erro ao eliminar encomenda da base de dados (${error.message}).`);
    }

    const custId = existingOrder.customer_id ? String(existingOrder.customer_id) : '';
    const custEmail = String(existingOrder.customer_email || '').toLowerCase();
    if (custId && custEmail.endsWith('@registo.local')) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', custId);
      if ((count ?? 0) === 0) {
        await supabase.from('customers').delete().eq('id', custId);
      }
    }
    return;
  }

  const target = memoryStore.orders.find((o) => o.id === orderId);
  if (!target) {
    throw new Error('Encomenda não encontrada.');
  }
  if (target.status !== 'Entregue') {
    const restoreMap = new Map<string, number>();
    for (const item of target.items) {
      if (item.productId) {
        restoreMap.set(item.productId, (restoreMap.get(item.productId) || 0) + item.quantity);
      }
    }
    memoryStore.products = memoryStore.products.map((p) => {
      const add = restoreMap.get(p.id) || 0;
      return add > 0 ? { ...p, stock: p.stock + add } : p;
    });
  }
  memoryStore.stockMovements = memoryStore.stockMovements.filter((m) => m.orderId !== orderId);
  memoryStore.tasks = memoryStore.tasks.filter((t) => t.orderId !== orderId);
  memoryStore.orders = memoryStore.orders.filter((o) => o.id !== orderId);
  if (target.customerId && target.customerEmail.endsWith('@registo.local')) {
    const hasOther = memoryStore.orders.some((o) => o.customerId === target.customerId);
    if (!hasOther) {
      memoryStore.customers = memoryStore.customers.filter((c) => c.id !== target.customerId);
    }
  }
}

export async function createProductInStore(
  product: Omit<Product, 'id' | 'rating' | 'reviewCount'>
): Promise<Product> {
  const uniqueSuffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  const created: Product = {
    ...product,
    id: `prod-${Date.now()}-${uniqueSuffix}`,
    rating: 5.0,
    reviewCount: 1,
  };

  const supabase = getSupabaseClient();
  assertPersistenceAvailable(supabase);
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);

    created.image = await persistImageAsset(supabase, created.image, 'products');
    if (created.colorVariants && created.colorVariants.length > 0) {
      created.colorVariants = await Promise.all(
        created.colorVariants.map(async (v) => ({
          ...v,
          image: await persistImageAsset(supabase, v.image, 'products'),
        }))
      );
    }

    const slug = created.category
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    await supabase
      .from('categories')
      .upsert(
        {
          slug,
          name: created.category,
          sort_order: 9,
        },
        { onConflict: 'slug' }
      )
      .then(() => {}, () => {});

    const { data: inserted, error } = await supabase
      .from('products')
      .insert(mapProductToRow(created))
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new Error(`Já existe um produto registado com o SKU ${created.sku}.`);
      }
      throw new Error(`Não foi possível registar o produto na base de dados (${error.message}).`);
    }

    await supabase
      .from('stock_movements')
      .insert({
        id: `mov-reg-${created.id}`,
        product_id: created.id,
        order_id: null,
        delta: created.stock,
        reason: 'Registo de novo produto',
      })
      .then(() => {}, () => {});

    return inserted ? mapProductFromRow(inserted as Record<string, unknown>) : created;
  }

  if (memoryStore.products.some((p) => p.sku.toLowerCase() === created.sku.toLowerCase())) {
    throw new Error(`Já existe um produto registado com o SKU ${created.sku}.`);
  }
  memoryStore.products = [created, ...memoryStore.products];
  memoryStore.stockMovements.unshift({
    id: `mov-reg-${created.id}`,
    productId: created.id,
    delta: created.stock,
    reason: 'Registo de novo produto',
    createdAt: new Date().toISOString(),
  });
  return created;
}

export async function updateProductInStore(id: string, updates: Partial<Product>) {
  const supabase = getSupabaseClient();
  assertPersistenceAvailable(supabase);
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    const { data: existing } = await supabase
      .from('products')
      .select('stock')
      .eq('id', id)
      .maybeSingle();

    if (updates.category) {
      await supabase
        .from('categories')
        .upsert(
          {
            slug: updates.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
            name: updates.category,
            sort_order: 9,
          },
          { onConflict: 'slug' }
        )
        .then(() => {}, () => {});
    }

    const rowUpdates: Record<string, unknown> = {};
    if (updates.sku !== undefined) rowUpdates.sku = updates.sku;
    if (updates.name !== undefined) rowUpdates.name = updates.name;
    if (updates.category !== undefined) rowUpdates.category = updates.category;
    if (updates.price !== undefined) rowUpdates.price = updates.price;
    if ('originalPrice' in updates) {
      rowUpdates.original_price = updates.originalPrice ?? null;
    }
    if (updates.stock !== undefined) rowUpdates.stock = updates.stock;
    if (updates.sizes !== undefined) rowUpdates.sizes = updates.sizes;
    if (updates.colorVariants !== undefined) {
      const persistedVariants = await Promise.all(
        updates.colorVariants.map(async (v) => ({
          ...v,
          image: await persistImageAsset(supabase, v.image, 'products'),
        }))
      );
      if (persistedVariants.length > 0) {
        rowUpdates.colors = persistedVariants;
      } else if (updates.colors !== undefined) {
        rowUpdates.colors = updates.colors.length > 0 ? updates.colors : ['Neutro'];
      }
    } else if (updates.colors !== undefined) {
      rowUpdates.colors = updates.colors;
    }
    if (updates.description !== undefined) rowUpdates.description = updates.description;
    if (updates.material !== undefined) rowUpdates.material = updates.material;
    if (updates.image !== undefined) {
      rowUpdates.image = await persistImageAsset(supabase, updates.image, 'products');
    }
    if (updates.isNew !== undefined) rowUpdates.is_new = updates.isNew;
    if (updates.onSale !== undefined) rowUpdates.on_sale = updates.onSale;

    const { data: updatedRows, error } = await supabase
      .from('products')
      .update(rowUpdates)
      .eq('id', id)
      .select('id');
    if (error) {
      if (error.code === '23505') {
        throw new Error(`Já existe outro produto registado com esse SKU.`);
      }
      throw new Error(`Erro ao atualizar produto na base de dados (${error.message}).`);
    }
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error('Produto não encontrado na base de dados.');
    }

    if (existing && updates.stock !== undefined && updates.stock !== Number(existing.stock)) {
      const delta = updates.stock - Number(existing.stock);
      await supabase
        .from('stock_movements')
        .insert({
          id: `mov-upd-${Date.now()}`,
          product_id: id,
          order_id: null,
          delta,
          reason: delta > 0 ? 'Reposição de stock no painel' : 'Ajuste manual de stock',
        })
        .then(() => {}, () => {});
    }
    return;
  }

  const prev = memoryStore.products.find((p) => p.id === id);
  memoryStore.products = memoryStore.products.map((p) =>
    p.id === id ? { ...p, ...updates } : p
  );
  if (prev && updates.stock !== undefined && updates.stock !== prev.stock) {
    const delta = updates.stock - prev.stock;
    memoryStore.stockMovements.unshift({
      id: `mov-upd-${Date.now()}`,
      productId: id,
      delta,
      reason: delta > 0 ? 'Reposição de stock no painel' : 'Ajuste manual de stock',
      createdAt: new Date().toISOString(),
    });
  }
}

export async function deleteProductInStore(id: string) {
  const supabase = getSupabaseClient();
  assertPersistenceAvailable(supabase);
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      throw new Error(`Erro ao eliminar produto da base de dados (${error.message}).`);
    }
    return;
  }
  memoryStore.products = memoryStore.products.filter((p) => p.id !== id);
}

export async function toggleGoalInStore(id: string, completed: boolean) {
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    await supabase.from('goals').update({ completed }).eq('id', id);
    return;
  }
  memoryStore.goals = memoryStore.goals.map((g) =>
    g.id === id ? { ...g, completed } : g
  );
}

export async function addGoalInStore(title: string): Promise<StoreGoal> {
  const goal: StoreGoal = { id: `goal-${Date.now()}`, title, completed: false };
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    await supabase.from('goals').insert(goal);
    return goal;
  }
  memoryStore.goals = [...memoryStore.goals, goal];
  return goal;
}

export async function addTaskInStore(
  title: string,
  dueDate: string,
  category: StoreTask['category']
): Promise<StoreTask> {
  const task: StoreTask = {
    id: `task-${Date.now()}`,
    title,
    dueDate: dueDate || 'Hoje',
    category,
    pinned: false,
    notify: true,
  };
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    await supabase.from('tasks').insert({
      id: task.id,
      title: task.title,
      due_date: task.dueDate,
      category: task.category,
      pinned: task.pinned,
      notify: task.notify,
    });
    return task;
  }
  memoryStore.tasks = [task, ...memoryStore.tasks];
  return task;
}

export async function updateTaskInStore(id: string, updates: Partial<StoreTask>) {
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    const rowUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) rowUpdates.title = updates.title;
    if (updates.dueDate !== undefined) rowUpdates.due_date = updates.dueDate;
    if (updates.pinned !== undefined) rowUpdates.pinned = updates.pinned;
    if (updates.notify !== undefined) rowUpdates.notify = updates.notify;
    await supabase.from('tasks').update(rowUpdates).eq('id', id);
    return;
  }
  memoryStore.tasks = memoryStore.tasks.map((t) =>
    t.id === id ? { ...t, ...updates } : t
  );
}

export async function deleteTaskInStore(id: string) {
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    await supabase.from('tasks').delete().eq('id', id);
    return;
  }
  memoryStore.tasks = memoryStore.tasks.filter((t) => t.id !== id);
}

export async function updateSettingsInStore(
  updates: Partial<StoreSettings>
): Promise<StoreSettings> {
  if (updates.storefrontConfig !== undefined) {
    memoryStore.settings.storefrontConfig = mergeStorefrontConfig(updates.storefrontConfig);
  }
  const supabase = getSupabaseClient();
  assertPersistenceAvailable(supabase);
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);

    // Read current settings row so updates to integrations and storefrontConfig never overwrite each other
    const { data: currentRowData } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    const currentRow = currentRowData as Record<string, unknown> | null;
    const { integrations: currentIntegrations } = extractIntegrationsAndConfig(
      currentRow?.integrations
    );
    const currentStorefrontConfig =
      resolveStorefrontFromRow(currentRow) || memoryStore.settings.storefrontConfig;

    const nextIntegrations =
      updates.integrations !== undefined
        ? updates.integrations.filter((i) => i && i.id !== STOREFRONT_CONFIG_META_ID)
        : currentIntegrations;

    let nextStorefrontConfig: StorefrontConfig | null = null;
    if (updates.storefrontConfig !== undefined) {
      const merged = mergeStorefrontConfigPatch(currentStorefrontConfig, updates.storefrontConfig);
      merged.heroSlides = await Promise.all(
        merged.heroSlides.map(async (s) => ({
          ...s,
          image: await persistImageAsset(supabase, s.image, 'banners'),
        }))
      );
      merged.categoryStripItems = await Promise.all(
        merged.categoryStripItems.map(async (c) => ({
          ...c,
          image: c.image ? await persistImageAsset(supabase, c.image, 'banners') : '',
        }))
      );
      merged.editorialCards = await Promise.all(
        merged.editorialCards.map(async (c) => ({
          ...c,
          image: await persistImageAsset(supabase, c.image, 'banners'),
        }))
      );
      merged.promoBanners = await Promise.all(
        merged.promoBanners.map(async (b) => ({
          ...b,
          image: await persistImageAsset(supabase, b.image, 'banners'),
        }))
      );
      if (merged.newsletter?.image) {
        merged.newsletter.image = await persistImageAsset(
          supabase,
          merged.newsletter.image,
          'banners'
        );
      }
      memoryStore.settings.storefrontConfig = merged;
      nextStorefrontConfig = merged;
    }

    const rowUpdates: Record<string, unknown> = {};
    if (updates.storeName !== undefined) rowUpdates.store_name = updates.storeName;
    if (updates.currencySymbol !== undefined) rowUpdates.currency_symbol = updates.currencySymbol;
    if (updates.freeShippingThreshold !== undefined) {
      rowUpdates.free_shipping_threshold = updates.freeShippingThreshold;
    }
    if (updates.supportEmail !== undefined) rowUpdates.support_email = updates.supportEmail;

    if (hasStorefrontConfigCol) {
      if (updates.integrations !== undefined) {
        rowUpdates.integrations = nextIntegrations;
      }
      if (nextStorefrontConfig) {
        rowUpdates.storefront_config = nextStorefrontConfig;
      }
    } else {
      const configToEmbed = nextStorefrontConfig || currentStorefrontConfig;
      if (updates.integrations !== undefined || nextStorefrontConfig) {
        rowUpdates.integrations = packIntegrationsWithConfig(nextIntegrations, configToEmbed);
      }
    }

    const mapRowToSettings = (savedRow: Record<string, unknown>): StoreSettings => {
      const { integrations: cleanInt } = extractIntegrationsAndConfig(savedRow.integrations);
      const resolvedSf =
        resolveStorefrontFromRow(savedRow) ||
        nextStorefrontConfig ||
        memoryStore.settings.storefrontConfig;
      const mapped: StoreSettings = {
        storeName: String(savedRow.store_name),
        currencySymbol: String(savedRow.currency_symbol),
        freeShippingThreshold: Number(savedRow.free_shipping_threshold),
        supportEmail: String(savedRow.support_email),
        integrations: cleanInt,
        storefrontConfig: resolvedSf,
      };
      memoryStore.settings = mapped;
      return mapped;
    };

    if (Object.keys(rowUpdates).length > 0) {
      let { data, error } = await supabase
        .from('store_settings')
        .update(rowUpdates)
        .eq('id', 1)
        .select('*');

      if (error && isMissingStorefrontColError(error)) {
        hasStorefrontConfigCol = false;
        delete rowUpdates.storefront_config;
        const configToEmbed = nextStorefrontConfig || currentStorefrontConfig;
        rowUpdates.integrations = packIntegrationsWithConfig(nextIntegrations, configToEmbed);
        const retry = await supabase
          .from('store_settings')
          .update(rowUpdates)
          .eq('id', 1)
          .select('*');
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        throw new Error(`Não foi possível guardar as definições no Supabase (${error.message}).`);
      }

      if (!data || data.length === 0) {
        const upsertPayload: Record<string, unknown> = {
          id: 1,
          store_name: updates.storeName ?? INITIAL_SETTINGS.storeName,
          currency_symbol: updates.currencySymbol ?? INITIAL_SETTINGS.currencySymbol,
          free_shipping_threshold:
            updates.freeShippingThreshold ?? INITIAL_SETTINGS.freeShippingThreshold,
          support_email: updates.supportEmail ?? INITIAL_SETTINGS.supportEmail,
          integrations: rowUpdates.integrations ?? nextIntegrations,
          ...rowUpdates,
        };
        const { data: upserted, error: upsertErr } = await supabase
          .from('store_settings')
          .upsert(upsertPayload, { onConflict: 'id' })
          .select('*');
        if (upsertErr) {
          throw new Error(`Não foi possível guardar as definições no Supabase (${upsertErr.message}).`);
        }
        const savedRow = upserted?.[0] as Record<string, unknown> | undefined;
        if (savedRow) {
          return mapRowToSettings(savedRow);
        }
      } else {
        return mapRowToSettings(data[0] as Record<string, unknown>);
      }
    }
    return memoryStore.settings;
  }
  memoryStore.settings = {
    ...memoryStore.settings,
    ...updates,
    storefrontConfig: updates.storefrontConfig
      ? mergeStorefrontConfig(updates.storefrontConfig)
      : memoryStore.settings.storefrontConfig,
  };
  return memoryStore.settings;
}

export async function subscribeNewsletterInStore(email: string) {
  const clean = email.trim().toLowerCase();
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    const { data: cust } = await supabase
      .from('customers')
      .select('id')
      .eq('email', clean)
      .maybeSingle();
    await supabase.from('newsletter_subscribers').upsert({
      email: clean,
      customer_id: cust?.id ? String(cust.id) : null,
    });
    return;
  }
  if (!memoryStore.newsletterEmails.includes(clean)) {
    memoryStore.newsletterEmails.push(clean);
  }
}

export async function getAdminPasswordHash(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    const { data } = await supabase
      .from('store_settings')
      .select('admin_password_hash')
      .eq('id', 1)
      .maybeSingle();
    if (data?.admin_password_hash) return String(data.admin_password_hash);
  }
  return memoryStore.adminPasswordHash;
}

export async function saveAdminPasswordHash(hash: string): Promise<void> {
  memoryStore.adminPasswordHash = hash;
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    await supabase
      .from('store_settings')
      .update({ admin_password_hash: hash })
      .eq('id', 1);
  }
}

export async function addCostInStore(input: {
  title: string;
  category: StoreCostCategory;
  amount: number;
  date: string;
}): Promise<StoreCost> {
  const cost: StoreCost = {
    id: `cost-${Date.now()}`,
    title: input.title.trim(),
    category: input.category,
    amount: +Math.max(0, Number(input.amount) || 0).toFixed(2),
    date: input.date.trim() || new Date().toISOString().slice(0, 10),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    if (hasStoreCostsTable) {
      const { error } = await supabase.from('store_costs').insert({
        id: cost.id,
        title: cost.title,
        category: cost.category,
        amount: cost.amount,
        cost_date: cost.date,
      });
      if (error) {
        throw new Error('Falha ao registar custo na base de dados.');
      }
      return cost;
    }
  }

  memoryStore.costs = [cost, ...memoryStore.costs];
  return cost;
}

export async function deleteCostInStore(id: string) {
  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    if (hasStoreCostsTable) {
      await supabase.from('store_costs').delete().eq('id', id);
    }
  }
  memoryStore.costs = memoryStore.costs.filter((c) => c.id !== id);
}

export async function resetDemoDataInStore() {
  memoryStore.products = [];
  memoryStore.customers = [];
  memoryStore.orders = [];
  memoryStore.stockMovements = [];
  memoryStore.goals = [];
  memoryStore.tasks = [];
  memoryStore.campaigns = [];
  memoryStore.costs = [];
  memoryStore.newsletterEmails = [];
  memoryStore.weeklySales = structuredClone(WEEKLY_SALES_DATA);

  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase).catch(() => false);
    await supabase.from('stock_movements').delete().neq('id', '');
    await supabase.from('order_items').delete().neq('id', '');
    await supabase.from('tasks').delete().neq('id', '');
    await supabase.from('orders').delete().neq('id', '');
    await supabase.from('products').delete().neq('id', '');
    await supabase.from('customers').delete().neq('id', '');
    await supabase.from('goals').delete().neq('id', '');
    await supabase.from('campaigns').delete().neq('id', '');
    await supabase.from('newsletter_subscribers').delete().neq('email', '');
    if (hasStoreCostsTable) {
      await supabase.from('store_costs').delete().neq('id', '');
    }
    await supabase.from('weekly_sales').upsert(
      WEEKLY_SALES_DATA.map((w, idx) => ({
        day_index: idx,
        day: w.day,
        full_day: w.fullDay,
        apparel: 0,
        accessories: 0,
        delta_percent: 0,
      }))
    );
  }
}
