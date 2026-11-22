import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  addCostInStore,
  addGoalInStore,
  addTaskInStore,
  checkSupabaseTablesStatus,
  createManualOrderInStore,
  createOrderInStore,
  createProductInStore,
  deleteCostInStore,
  deleteProductInStore,
  deleteTaskInStore,
  getAdminBundle,
  getAdminPasswordHash,
  getPublicStoreData,
  isSupabaseConfigured,
  resetDemoDataInStore,
  saveAdminPasswordHash,
  subscribeNewsletterInStore,
  toggleGoalInStore,
  updateOrderStatusInStore,
  updateProductInStore,
  updateSettingsInStore,
  updateTaskInStore,
} from './src/server/storeRepository.ts';
import type { OrderStatus, ProductColorVariant, StoreCostCategory } from './src/types/store.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const ADMIN_ACCESS_EMAIL = (process.env.ADMIN_ACCESS_EMAIL || 'Dozaelizandro@gmail.com')
  .trim()
  .toLowerCase();

app.use(express.json({ limit: '12mb' }));

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function signAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      exp: Date.now() + 8 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  if (!timingSafeTextEqual(sig, expectedSig)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sessão de gestão necessária.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Sessão expirada ou inválida.' });
    return;
  }
  next();
}

// Public Health & Storefront Routes
app.get('/api/health', async (_req, res) => {
  const status = await checkSupabaseTablesStatus();
  res.json({
    ok: true,
    supabaseConfigured: status.configured,
    tablesReady: status.tablesReady,
    productCount: status.productCount,
  });
});

app.get('/api/store', async (_req, res) => {
  try {
    const data = await getPublicStoreData();
    res.json(data);
  } catch (err) {
    console.error('GET /api/store failed:', err);
    res.status(500).json({ error: 'Não foi possível carregar o catálogo.' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (
      typeof body.customerName !== 'string' ||
      typeof body.customerEmail !== 'string' ||
      typeof body.customerPhone !== 'string' ||
      typeof body.shippingAddress !== 'string' ||
      typeof body.city !== 'string' ||
      typeof body.postalCode !== 'string' ||
      !Array.isArray(body.items)
    ) {
      res.status(400).json({ error: 'Dados da encomenda inválidos.' });
      return;
    }

    const allowedPayments = ['Multicaixa Express', 'Cartão', 'Contra-Reembolso'];
    const paymentMethod = allowedPayments.includes(body.paymentMethod)
      ? body.paymentMethod
      : 'Multicaixa Express';

    const order = await createOrderInStore({
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      shippingAddress: body.shippingAddress,
      city: body.city,
      postalCode: body.postalCode,
      paymentMethod,
      items: body.items,
      discountApplied: Boolean(body.discountApplied),
    });

    res.status(201).json(order);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao registar encomenda.';
    res.status(400).json({ error: message });
  }
});

app.post('/api/newsletter', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const normalizedEmail = email.toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    res.status(400).json({ error: 'Email inválido.' });
    return;
  }

  if (req.body?.source === 'profile' && timingSafeTextEqual(normalizedEmail, ADMIN_ACCESS_EMAIL)) {
    res.json({ ok: true, adminToken: signAdminToken() });
    return;
  }

  try {
    await subscribeNewsletterInStore(normalizedEmail);
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/newsletter failed:', err);
    res.status(500).json({ error: 'Erro ao subscrever newsletter.' });
  }
});

// Admin Auth Routes
app.get('/api/admin/auth/status', async (_req, res) => {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    res.json({ configured: true, mode: 'login', managedByEnv: true });
    return;
  }
  const storedHash = await getAdminPasswordHash();
  res.json({
    configured: Boolean(storedHash),
    mode: storedHash ? 'login' : 'setup',
    managedByEnv: false,
  });
});

app.post('/api/admin/auth/setup', async (req, res) => {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    res.status(409).json({ error: 'A palavra-passe já está definida no servidor.' });
    return;
  }
  const existing = await getAdminPasswordHash();
  if (existing) {
    res.status(409).json({ error: 'O acesso de gestão já foi configurado.' });
    return;
  }
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
  if (password.length < 4) {
    res.status(400).json({ error: 'Escolha uma palavra-passe com pelo menos 4 caracteres.' });
    return;
  }
  await saveAdminPasswordHash(hashPassword(password));
  res.json({ token: signAdminToken() });
});

app.post('/api/admin/auth/login', async (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();

  if (envPasscode) {
    if (!timingSafeTextEqual(password, envPasscode)) {
      res.status(401).json({ error: 'Palavra-passe incorreta.' });
      return;
    }
    res.json({ token: signAdminToken() });
    return;
  }

  const storedHash = await getAdminPasswordHash();
  if (!storedHash) {
    res.status(409).json({ error: 'Configure primeiro a palavra-passe de gestão.' });
    return;
  }
  if (!verifyPassword(password, storedHash)) {
    res.status(401).json({ error: 'Palavra-passe incorreta.' });
    return;
  }
  res.json({ token: signAdminToken() });
});

app.post('/api/admin/auth/change-password', requireAdminAuth, async (req, res) => {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    res.status(409).json({
      error: 'A palavra-passe está gerida pela variável ADMIN_PASSCODE no painel Secrets.',
    });
    return;
  }

  const currentPassword =
    typeof req.body?.currentPassword === 'string' ? req.body.currentPassword.trim() : '';
  const newPassword =
    typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';

  if (newPassword.length < 4) {
    res.status(400).json({ error: 'A nova palavra-passe deve ter pelo menos 4 caracteres.' });
    return;
  }

  const storedHash = await getAdminPasswordHash();
  if (storedHash && !verifyPassword(currentPassword, storedHash)) {
    res.status(401).json({ error: 'A palavra-passe atual está incorreta.' });
    return;
  }

  await saveAdminPasswordHash(hashPassword(newPassword));
  res.json({ ok: true, token: signAdminToken() });
});

// Protected Management Routes
app.get('/api/admin/dashboard', requireAdminAuth, async (_req, res) => {
  try {
    const bundle = await getAdminBundle();
    res.json(bundle);
  } catch (err) {
    console.error('GET /api/admin/dashboard failed:', err);
    res.status(500).json({ error: 'Falha ao carregar dados de gestão.' });
  }
});

app.post('/api/admin/orders', requireAdminAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    if (typeof body.customerName !== 'string' || !body.customerName.trim() || !Array.isArray(body.items)) {
      res.status(400).json({ error: 'Informe o nome do cliente e pelo menos um artigo.' });
      return;
    }

    const allowedPayments = ['Multicaixa Express', 'Cartão', 'Contra-Reembolso'] as const;
    const paymentMethod = allowedPayments.includes(body.paymentMethod)
      ? body.paymentMethod
      : 'Multicaixa Express';

    const allowedStatuses: OrderStatus[] = ['Pendente', 'Em Preparação', 'Em Trânsito', 'Entregue'];
    const status: OrderStatus = allowedStatuses.includes(body.status) ? body.status : 'Pendente';

    const order = await createManualOrderInStore({
      customerName: body.customerName,
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail : '',
      customerPhone: typeof body.customerPhone === 'string' ? body.customerPhone : '',
      shippingAddress: typeof body.shippingAddress === 'string' ? body.shippingAddress : '',
      city: typeof body.city === 'string' ? body.city : '',
      postalCode: typeof body.postalCode === 'string' ? body.postalCode : '',
      paymentMethod,
      status,
      items: body.items,
      discountApplied: Boolean(body.discountApplied),
    });

    res.status(201).json(order);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao registar encomenda manual.';
    res.status(400).json({ error: message });
  }
});

app.patch('/api/admin/orders/:id/status', requireAdminAuth, async (req, res) => {
  const status = req.body?.status as OrderStatus;
  const allowed: OrderStatus[] = ['Pendente', 'Em Preparação', 'Em Trânsito', 'Entregue'];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: 'Estado inválido.' });
    return;
  }
  await updateOrderStatusInStore(req.params.id, status);
  res.json({ ok: true });
});

function isSafeAssetUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('https://')) {
    return true;
  }
  return /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed);
}

function sanitizeColorVariants(raw: unknown): ProductColorVariant[] {
  if (!Array.isArray(raw)) return [];
  const result: ProductColorVariant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as { name?: unknown; image?: unknown };
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    const image = typeof obj.image === 'string' ? obj.image.trim() : '';
    if (name && image && isSafeAssetUrl(image)) {
      result.push({ name, image });
    }
  }
  return result;
}

app.post('/api/admin/products', requireAdminAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const price = Number(body.price);
    const stock = Number(body.stock);
    const image = typeof body.image === 'string' ? body.image.trim() : '';

    if (!name || !sku || !category || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
      res.status(400).json({ error: 'Preencha nome, SKU, categoria, preço (> 0) e stock (>= 0) válidos.' });
      return;
    }

    if (!isSafeAssetUrl(image)) {
      res.status(400).json({ error: 'Endereço de imagem inválido. Utilize uma predefinição ou URL https://.' });
      return;
    }

    const originalPrice =
      body.originalPrice !== undefined && body.originalPrice !== null && Number(body.originalPrice) > price
        ? Number(body.originalPrice)
        : undefined;

    const colorVariants = sanitizeColorVariants(body.colorVariants);
    const fallbackColors =
      Array.isArray(body.colors) && body.colors.length ? body.colors.map(String) : ['Neutro'];

    const created = await createProductInStore({
      name,
      sku,
      category: category as any,
      price,
      originalPrice,
      stock: Math.floor(stock),
      sizes: Array.isArray(body.sizes) && body.sizes.length ? body.sizes.map(String) : ['Único'],
      colors: colorVariants.length > 0 ? colorVariants.map((v) => v.name) : fallbackColors,
      colorVariants,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      material: typeof body.material === 'string' ? body.material.trim() : '',
      image,
      featured: Boolean(body.featured ?? true),
      isNew: Boolean(body.isNew),
      onSale: Boolean(originalPrice),
    });
    res.status(201).json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao registar produto.';
    res.status(400).json({ error: message });
  }
});

app.patch('/api/admin/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.sku === 'string' && body.sku.trim()) updates.sku = body.sku.trim();
    if (typeof body.category === 'string' && body.category.trim()) updates.category = body.category.trim();
    if (body.price !== undefined && Number.isFinite(Number(body.price)) && Number(body.price) > 0) {
      updates.price = Number(body.price);
    }
    if (body.originalPrice !== undefined) {
      updates.originalPrice = body.originalPrice ? Number(body.originalPrice) : undefined;
    }
    if (body.stock !== undefined && Number.isFinite(Number(body.stock)) && Number(body.stock) >= 0) {
      updates.stock = Math.floor(Number(body.stock));
    }
    if (Array.isArray(body.sizes)) updates.sizes = body.sizes.map(String);
    if (Array.isArray(body.colorVariants)) {
      const variants = sanitizeColorVariants(body.colorVariants);
      updates.colorVariants = variants;
      if (variants.length > 0) {
        updates.colors = variants.map((v) => v.name);
      } else if (Array.isArray(body.colors) && body.colors.length) {
        updates.colors = body.colors.map(String);
      } else {
        updates.colors = ['Neutro'];
      }
    } else if (Array.isArray(body.colors)) {
      updates.colors = body.colors.map(String);
    }
    if (typeof body.description === 'string') updates.description = body.description.trim();
    if (typeof body.material === 'string') updates.material = body.material.trim();
    if (typeof body.image === 'string' && isSafeAssetUrl(body.image)) updates.image = body.image.trim();
    if (body.isNew !== undefined) updates.isNew = Boolean(body.isNew);
    if (body.onSale !== undefined) updates.onSale = Boolean(body.onSale);

    await updateProductInStore(req.params.id, updates);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar produto.';
    res.status(400).json({ error: message });
  }
});

app.delete('/api/admin/products/:id', requireAdminAuth, async (req, res) => {
  await deleteProductInStore(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/admin/goals/:id', requireAdminAuth, async (req, res) => {
  await toggleGoalInStore(req.params.id, Boolean(req.body?.completed));
  res.json({ ok: true });
});

app.post('/api/admin/goals', requireAdminAuth, async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) {
    res.status(400).json({ error: 'Título obrigatório.' });
    return;
  }
  const goal = await addGoalInStore(title);
  res.status(201).json(goal);
});

app.post('/api/admin/tasks', requireAdminAuth, async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) {
    res.status(400).json({ error: 'Título obrigatório.' });
    return;
  }
  const task = await addTaskInStore(
    title,
    String(req.body?.dueDate || 'Hoje'),
    req.body?.category || 'pedido'
  );
  res.status(201).json(task);
});

app.patch('/api/admin/tasks/:id', requireAdminAuth, async (req, res) => {
  await updateTaskInStore(req.params.id, req.body);
  res.json({ ok: true });
});

app.delete('/api/admin/tasks/:id', requireAdminAuth, async (req, res) => {
  await deleteTaskInStore(req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/costs', requireAdminAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const amount = Number(body.amount);
    const allowedCategories: StoreCostCategory[] = [
      'Mercadoria',
      'Logística',
      'Marketing',
      'Operacional',
      'Outro',
    ];
    const category: StoreCostCategory = allowedCategories.includes(body.category)
      ? body.category
      : 'Operacional';
    const date =
      typeof body.date === 'string' && body.date.trim()
        ? body.date.trim().slice(0, 20)
        : new Date().toISOString().slice(0, 10);

    if (!title || !Number.isFinite(amount) || amount < 0) {
      res.status(400).json({ error: 'Informe uma descrição e um valor de custo válido (>= 0).' });
      return;
    }

    const cost = await addCostInStore({ title, category, amount, date });
    res.status(201).json(cost);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao registar custo.';
    res.status(400).json({ error: message });
  }
});

app.delete('/api/admin/costs/:id', requireAdminAuth, async (req, res) => {
  await deleteCostInStore(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/admin/settings', requireAdminAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (typeof body.storeName === 'string' && body.storeName.trim()) {
      updates.storeName = body.storeName.trim().slice(0, 80);
    }
    if (typeof body.currencySymbol === 'string' && body.currencySymbol.trim()) {
      updates.currencySymbol = body.currencySymbol.trim().slice(0, 10);
    }
    if (
      body.freeShippingThreshold !== undefined &&
      Number.isFinite(Number(body.freeShippingThreshold)) &&
      Number(body.freeShippingThreshold) >= 0
    ) {
      updates.freeShippingThreshold = Number(body.freeShippingThreshold);
    }
    if (typeof body.supportEmail === 'string') {
      updates.supportEmail = body.supportEmail.trim().slice(0, 120);
    }
    if (Array.isArray(body.integrations)) {
      updates.integrations = body.integrations;
    }
    if (body.storefrontConfig && typeof body.storefrontConfig === 'object') {
      const cfg = structuredClone(body.storefrontConfig);
      if (Array.isArray(cfg.heroSlides)) {
        cfg.heroSlides = cfg.heroSlides.filter(
          (s: any) => s && typeof s.image === 'string' && isSafeAssetUrl(s.image)
        );
      }
      if (Array.isArray(cfg.categoryStripItems)) {
        cfg.categoryStripItems = cfg.categoryStripItems.map((c: any) =>
          c && c.image && !isSafeAssetUrl(String(c.image)) ? { ...c, image: '' } : c
        );
      }
      if (Array.isArray(cfg.editorialCards)) {
        cfg.editorialCards = cfg.editorialCards.filter(
          (c: any) => c && typeof c.image === 'string' && isSafeAssetUrl(c.image)
        );
      }
      if (Array.isArray(cfg.promoBanners)) {
        cfg.promoBanners = cfg.promoBanners.filter(
          (b: any) => b && typeof b.image === 'string' && isSafeAssetUrl(b.image)
        );
      }
      if (cfg.newsletter?.image && !isSafeAssetUrl(String(cfg.newsletter.image))) {
        delete cfg.newsletter.image;
      }
      updates.storefrontConfig = cfg;
    }

    await updateSettingsInStore(updates);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao guardar definições.';
    res.status(400).json({ error: message });
  }
});

app.post('/api/admin/reset', requireAdminAuth, async (_req, res) => {
  await resetDemoDataInStore();
  res.json({ ok: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const assetsDir = path.resolve(process.cwd(), 'src', 'assets', 'images');
    if (fs.existsSync(assetsDir)) {
      app.use('/src/assets/images', express.static(assetsDir));
    }
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lunora server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
