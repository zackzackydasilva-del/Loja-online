import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import type {
  Product,
  SaleWebhookDeliveryRecord,
  StoreOrder,
} from '../types/store.ts';
import { formatMoney } from '../utils/currency.ts';
import { broadcastSaleWebhookDelivery } from './presenceHub.ts';
import {
  getOrderNotificationRuntimeContext,
  recordSaleWebhookDeliveryInStore,
} from './storeRepository.ts';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
  'metadata.aws.internal',
]);

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24 IETF protocol
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a >= 224) return true; // multicast & reserved
  return false;
}

function isBlockedIpAddress(rawIp: string): boolean {
  const normalized = rawIp.trim().replace(/^\[|\]$/g, '').split('%')[0].toLowerCase();
  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) {
    return isBlockedIpv4(normalized);
  }
  if (ipVersion === 6) {
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('::ffff:')) {
      const mappedV4 = normalized.slice('::ffff:'.length);
      if (net.isIP(mappedV4) === 4) {
        return isBlockedIpv4(mappedV4);
      }
      return true;
    }
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
      return true; // fe80::/10 link-local
    }
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true; // fc00::/7 unique local
    }
    if (normalized.startsWith('ff')) {
      return true; // ff00::/8 multicast
    }
    return false;
  }
  return true;
}

export function validateWebhookUrlSyntax(rawUrl: string): {
  valid: boolean;
  parsed?: URL;
  error?: string;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Informe um URL de webhook válido.' };
  }
  if (trimmed.length > 500) {
    return { valid: false, error: 'O URL do webhook excede o tamanho máximo permitido.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'URL de webhook inválido. Use o formato https://...' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'O URL do webhook deve começar por https:// ou http://.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: 'O URL do webhook não pode conter credenciais embutidas.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) {
    return { valid: false, error: 'Domínio de webhook inválido.' };
  }

  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return {
      valid: false,
      error: 'Endereços locais ou internos não são permitidos como destino de webhook.',
    };
  }

  if (net.isIP(host) !== 0 && isBlockedIpAddress(host)) {
    return {
      valid: false,
      error: 'Endereços IP privados ou de loopback não são permitidos como destino de webhook.',
    };
  }

  return { valid: true, parsed };
}

async function resolveAndValidateWebhookUrl(rawUrl: string): Promise<{
  ok: boolean;
  parsed?: URL;
  error?: string;
}> {
  const syntax = validateWebhookUrlSyntax(rawUrl);
  if (!syntax.valid || !syntax.parsed) {
    return { ok: false, error: syntax.error || 'URL de webhook inválido.' };
  }

  const host = syntax.parsed.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) === 0) {
    try {
      const records = await dns.lookup(host, { all: true });
      if (!records || records.length === 0) {
        return { ok: false, error: 'Não foi possível resolver o domínio do webhook.' };
      }
      for (const rec of records) {
        if (isBlockedIpAddress(rec.address)) {
          return {
            ok: false,
            error: 'O domínio do webhook aponta para um endereço IP privado bloqueado.',
          };
        }
      }
    } catch {
      return { ok: false, error: 'Falha ao resolver o domínio do webhook via DNS.' };
    }
  }

  return { ok: true, parsed: syntax.parsed };
}

export function buildApprovedSaleTitle(order: StoreOrder): string {
  const parts = order.items.map((item) => `${item.name}, ${item.quantity}`);
  return `Venda aprovada: Pedido de ${parts.join(' | ')}`;
}

function buildWebhookPayload(params: {
  order: StoreOrder;
  products: Product[];
  storeName: string;
  currencySymbol: string;
  targetHost: string;
  deliveryId: string;
  approvedAt: string;
  isTest?: boolean;
}) {
  const { order, products, storeName, currencySymbol, targetHost, deliveryId, approvedAt, isTest } =
    params;
  const productMap = new Map(products.map((p) => [p.id, p]));
  const title = buildApprovedSaleTitle(order);

  const enrichedItems = order.items.map((item) => {
    const prod = productMap.get(item.productId);
    const unitPrice = Number(item.unitPrice) || 0;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    return {
      productId: item.productId,
      sku: prod?.sku || '',
      name: item.name,
      category: prod?.category || '',
      material: prod?.material?.trim() || '',
      description: prod?.description?.trim() || 'Sem descrição registada no catálogo.',
      size: item.size || 'Único',
      quantity,
      unitPrice,
      subtotal: +(unitPrice * quantity).toFixed(2),
    };
  });

  const itemSummaryLines = enrichedItems.map(
    (item, index) =>
      `${index + 1}. ${item.name} (${item.quantity}x · Tam. ${item.size}) — ${formatMoney(
        item.subtotal,
        currencySymbol
      )}\n   Descrição: ${item.description}`
  );

  const summaryText = [
    `${title}${isTest ? ' [TESTE]' : ''}`,
    `Loja: ${storeName}`,
    `Encomenda: #${order.id} · Estado: ${order.status}`,
    `Total: ${formatMoney(order.total, currencySymbol)} (${order.paymentMethod})`,
    `Cliente: ${order.customerName} (${order.customerPhone})`,
    `Entrega: ${order.shippingAddress}, ${order.city}`,
    '',
    'Produtos:',
    ...itemSummaryLines,
  ].join('\n');

  const lowerHost = targetHost.toLowerCase();
  if (lowerHost === 'discord.com' || lowerHost.endsWith('.discord.com') || lowerHost === 'discordapp.com' || lowerHost.endsWith('.discordapp.com')) {
    return {
      content: `**${title}**${isTest ? ' _(Teste)_' : ''}`,
      embeds: [
        {
          title: `${storeName} · Encomenda #${order.id}`,
          description: summaryText.slice(0, 3900),
          color: 0x10b981,
          timestamp: approvedAt,
        },
      ],
    };
  }

  if (lowerHost === 'hooks.slack.com') {
    return {
      text: summaryText,
      event: 'sale.approved',
      deliveryId,
      orderId: order.id,
    };
  }

  return {
    event: 'sale.approved',
    deliveryId,
    isTest: Boolean(isTest),
    title,
    approvedAt,
    text: summaryText,
    store: {
      name: storeName,
      currency: currencySymbol,
    },
    order: {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      total: order.total,
      formattedTotal: formatMoney(order.total, currencySymbol),
      paymentMethod: order.paymentMethod,
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        city: order.city,
        postalCode: order.postalCode,
      },
      items: enrichedItems,
    },
  };
}

export async function notifyApprovedSaleWebhookAsync(
  order: StoreOrder,
  options?: {
    force?: boolean;
    urlOverride?: string;
    secretOverride?: string;
    isTest?: boolean;
    productsOverride?: Product[];
  }
): Promise<SaleWebhookDeliveryRecord> {
  const ctx = await getOrderNotificationRuntimeContext();
  const targetUrl = (options?.urlOverride ?? ctx.saleWebhook.url ?? '').trim();
  const enabled = options?.force ? true : Boolean(ctx.saleWebhook.enabled);
  const secret =
    options?.secretOverride !== undefined && options.secretOverride.trim()
      ? options.secretOverride.trim()
      : ctx.saleWebhook.secret.trim();

  const title = buildApprovedSaleTitle(order);
  const createdAt = new Date().toISOString();
  const deliveryId = `wh-${order.id}-${Date.now()}`;

  let targetHost = 'não configurado';
  try {
    if (targetUrl) {
      targetHost = new URL(targetUrl).host;
    }
  } catch {
    targetHost = targetUrl.slice(0, 80);
  }

  let status: SaleWebhookDeliveryRecord['status'] = 'disabled';
  let httpStatus: number | undefined;
  let errorMessage: string | undefined;

  if (!enabled) {
    return {
      id: deliveryId,
      orderId: order.id,
      event: 'sale.approved',
      title,
      targetHost,
      status: 'disabled',
      total: order.total,
      currencySymbol: ctx.currencySymbol,
      customerName: order.customerName,
      createdAt,
      isTest: options?.isTest,
    };
  }

  if (!targetUrl) {
    status = 'unconfigured';
    errorMessage = 'URL do webhook não configurado.';
  } else {
    const verification = await resolveAndValidateWebhookUrl(targetUrl);
    if (!verification.ok || !verification.parsed) {
      status = 'blocked';
      errorMessage = verification.error || 'URL de webhook bloqueado por segurança.';
    } else {
      targetHost = verification.parsed.host;
      const payload = buildWebhookPayload({
        order,
        products: options?.productsOverride || ctx.products,
        storeName: ctx.storeName,
        currencySymbol: ctx.currencySymbol,
        targetHost: verification.parsed.hostname,
        deliveryId,
        approvedAt: createdAt,
        isTest: options?.isTest,
      });
      const bodyJson = JSON.stringify(payload);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Lunora-Webhook/1.0',
        'X-Lunora-Event': 'sale.approved',
        'X-Lunora-Delivery': deliveryId,
      };
      if (secret) {
        const signature = crypto.createHmac('sha256', secret).update(bodyJson).digest('hex');
        headers['X-Lunora-Signature'] = `sha256=${signature}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(verification.parsed.toString(), {
          method: 'POST',
          headers,
          body: bodyJson,
          redirect: 'manual',
          signal: controller.signal,
        });
        httpStatus = response.status;
        if (response.status >= 300 && response.status < 400) {
          status = 'blocked';
          errorMessage = `Redirecionamento HTTP (${response.status}) bloqueado por segurança.`;
        } else if (response.ok) {
          status = 'sent';
        } else {
          const respText = await response.text().catch(() => '');
          status = 'failed';
          errorMessage = `HTTP ${response.status}${respText ? `: ${respText.slice(0, 140)}` : ''}`;
        }
      } catch (err) {
        status = 'failed';
        if (err instanceof Error && err.name === 'AbortError') {
          errorMessage = 'Tempo limite de 5 segundos excedido ao contactar o webhook.';
        } else {
          errorMessage = err instanceof Error ? err.message : 'Falha de ligação ao webhook.';
        }
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  const record: SaleWebhookDeliveryRecord = {
    id: deliveryId,
    orderId: order.id,
    event: 'sale.approved',
    title,
    targetHost,
    status,
    httpStatus,
    errorMessage,
    total: order.total,
    currencySymbol: ctx.currencySymbol,
    customerName: order.customerName,
    createdAt,
    isTest: options?.isTest,
  };

  broadcastSaleWebhookDelivery(record);
  await recordSaleWebhookDeliveryInStore(record);
  return record;
}

export async function sendTestSaleWebhookAsync(options?: {
  urlOverride?: string;
  secretOverride?: string;
}): Promise<SaleWebhookDeliveryRecord> {
  const ctx = await getOrderNotificationRuntimeContext();
  const sampleProduct = ctx.products[0];

  const sampleOrder: StoreOrder = {
    id: `APROV-TESTE-${Date.now().toString().slice(-4)}`,
    customerName: 'Cliente Teste Aprovado',
    customerEmail: 'cliente.teste@exemplo.ao',
    customerPhone: '+244 923 000 000',
    shippingAddress: 'Talatona, Rua Principal',
    city: 'Luanda',
    postalCode: '—',
    paymentMethod: 'Multicaixa Express',
    items: [
      {
        productId: sampleProduct?.id || 'teste-1',
        name: sampleProduct?.name || 'Vestido Lunora Seda',
        size: sampleProduct?.sizes?.[0] || 'M',
        quantity: 2,
        unitPrice: sampleProduct?.price || 32000,
      },
    ],
    total: (sampleProduct?.price || 32000) * 2,
    status: 'Entregue',
    createdAt: new Date().toISOString().slice(0, 10),
    progressStep: 3,
    totalSteps: 3,
  };

  return notifyApprovedSaleWebhookAsync(sampleOrder, {
    force: true,
    isTest: true,
    urlOverride: options?.urlOverride,
    secretOverride: options?.secretOverride,
    productsOverride: sampleProduct
      ? ctx.products
      : [
          {
            id: 'teste-1',
            sku: 'LUN-TEST',
            name: 'Vestido Lunora Seda',
            category: 'Vestidos',
            price: 32000,
            rating: 5,
            reviewCount: 1,
            stock: 5,
            sizes: ['M'],
            colors: ['Neutro'],
            description:
              'Exemplo de descrição completa incluída no payload JSON do Webhook após aprovação do pedido.',
            material: 'Seda & Linho',
            image: '',
          },
        ],
  });
}
