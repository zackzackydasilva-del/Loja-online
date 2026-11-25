import nodemailer from 'nodemailer';
import type {
  OrderNotificationItemDetail,
  OrderNotificationRecord,
  Product,
  StoreOrder,
} from '../types/store.ts';
import { formatMoney } from '../utils/currency.ts';
import { broadcastOrderNotification } from './presenceHub.ts';
import {
  getOrderNotificationRuntimeContext,
  recordOrderNotificationInStore,
} from './storeRepository.ts';

const DEFAULT_RECIPIENT_EMAIL = 'pintozacarias806@gmail.com';

export interface EmailTransportStatus {
  configured: boolean;
  provider: 'resend' | 'smtp' | 'none';
  defaultRecipient: string;
}

export function isValidEmailAddress(email: string): boolean {
  const clean = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) && clean.length <= 160;
}

export function getEmailTransportStatus(): EmailTransportStatus {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const envRecipient = process.env.ORDER_NOTIFICATION_EMAIL?.trim();

  const defaultRecipient =
    envRecipient && isValidEmailAddress(envRecipient) ? envRecipient : DEFAULT_RECIPIENT_EMAIL;

  if (resendKey) {
    return { configured: true, provider: 'resend', defaultRecipient };
  }
  if (smtpUser && smtpPass) {
    return { configured: true, provider: 'smtp', defaultRecipient };
  }
  return { configured: false, provider: 'none', defaultRecipient };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildOrderNotificationTitle(order: StoreOrder): string {
  const parts = order.items.map((item) => `${item.name}, ${item.quantity}`);
  return `Pedido de ${parts.join(' | ')}`;
}

function enrichOrderItems(
  order: StoreOrder,
  products: Product[]
): OrderNotificationItemDetail[] {
  const productMap = new Map(products.map((p) => [p.id, p]));
  return order.items.map((item) => {
    const prod = productMap.get(item.productId);
    const desc = prod?.description?.trim() || 'Sem descrição registada no catálogo.';
    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      size: item.size,
      unitPrice: item.unitPrice,
      sku: prod?.sku,
      category: prod?.category,
      material: prod?.material?.trim() || undefined,
      description: desc,
    };
  });
}

function buildEmailBodies(
  storeName: string,
  currencySymbol: string,
  title: string,
  order: StoreOrder,
  detailedItems: OrderNotificationItemDetail[]
): { text: string; html: string } {
  const textLines: string[] = [
    title,
    `Loja: ${storeName}`,
    `Encomenda: #${order.id}`,
    `Data: ${new Date().toLocaleString('pt-PT')}`,
    `Total: ${formatMoney(order.total, currencySymbol)}`,
    `Pagamento: ${order.paymentMethod}`,
    '',
    '--- Dados do Cliente ---',
    `Nome: ${order.customerName}`,
    `Telefone: ${order.customerPhone}`,
    `Email: ${order.customerEmail}`,
    `Morada: ${order.shippingAddress}`,
    `Cidade: ${order.city}${order.postalCode ? ` (${order.postalCode})` : ''}`,
    '',
    '--- Produtos e Descrições ---',
  ];

  detailedItems.forEach((item, index) => {
    const lineTotal = item.unitPrice * item.quantity;
    textLines.push(
      `${index + 1}. ${item.name} — Quantidade: ${item.quantity} — Tamanho: ${item.size} — Subtotal: ${formatMoney(lineTotal, currencySymbol)}`
    );
    if (item.category || item.sku) {
      textLines.push(
        `   Categoria: ${item.category || '—'}${item.sku ? ` | SKU: ${item.sku}` : ''}`
      );
    }
    if (item.material) {
      textLines.push(`   Material: ${item.material}`);
    }
    textLines.push(`   Descrição: ${item.description}`);
    textLines.push('');
  });

  const itemRowsHtml = detailedItems
    .map((item) => {
      const lineTotal = item.unitPrice * item.quantity;
      const metaBits = [
        item.category ? `Categoria: ${escapeHtml(item.category)}` : '',
        item.sku ? `SKU: ${escapeHtml(item.sku)}` : '',
        item.material ? `Material: ${escapeHtml(item.material)}` : '',
      ].filter(Boolean);

      return `
        <div style="border:1px solid #e6e4de;border-radius:14px;padding:14px 16px;margin-bottom:12px;background:#faf9f6;">
          <div style="font-size:15px;font-weight:700;color:#111111;margin-bottom:4px;">
            ${escapeHtml(item.name)} — ${escapeHtml(String(item.quantity))} un.
          </div>
          <div style="font-size:12px;color:#555552;margin-bottom:8px;">
            Tamanho: <strong>${escapeHtml(item.size)}</strong> · Preço unit.: <strong>${escapeHtml(formatMoney(item.unitPrice, currencySymbol))}</strong> · Subtotal: <strong>${escapeHtml(formatMoney(lineTotal, currencySymbol))}</strong>
          </div>
          ${
            metaBits.length > 0
              ? `<div style="font-size:11px;color:#72726e;margin-bottom:8px;">${metaBits.join(' · ')}</div>`
              : ''
          }
          <div style="font-size:13px;color:#222220;line-height:1.5;background:#ffffff;border:1px solid #eceae4;border-radius:10px;padding:10px 12px;">
            <strong>Descrição do produto:</strong><br/>
            ${escapeHtml(item.description).replace(/\n/g, '<br/>')}
          </div>
        </div>
      `;
    })
    .join('');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f3ef;padding:24px;color:#111111;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e3dc;">
        <div style="background:#111111;color:#ffffff;padding:22px 24px;">
          <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#cfccc4;margin-bottom:6px;">
            ${escapeHtml(storeName)} · Notificação de Novo Pedido
          </div>
          <div style="font-size:20px;font-weight:700;line-height:1.3;">
            ${escapeHtml(title)}
          </div>
        </div>

        <div style="padding:22px 24px;">
          <div style="background:#f5f4f0;border-radius:14px;padding:14px 16px;margin-bottom:18px;font-size:13px;line-height:1.6;">
            <div><strong>Encomenda:</strong> #${escapeHtml(order.id)}</div>
            <div><strong>Total:</strong> ${escapeHtml(formatMoney(order.total, currencySymbol))} (${escapeHtml(order.paymentMethod)})</div>
            <div><strong>Cliente:</strong> ${escapeHtml(order.customerName)} · ${escapeHtml(order.customerPhone)}</div>
            <div><strong>Email do cliente:</strong> ${escapeHtml(order.customerEmail)}</div>
            <div><strong>Morada de entrega:</strong> ${escapeHtml(order.shippingAddress)}, ${escapeHtml(order.city)}${order.postalCode ? ` (${escapeHtml(order.postalCode)})` : ''}</div>
          </div>

          <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b6a65;margin-bottom:10px;">
            Produtos Encomendados e Descrições
          </div>
          ${itemRowsHtml}
        </div>
      </div>
    </div>
  `.trim();

  return { text: textLines.join('\n'), html };
}

async function deliverEmailViaProvider(params: {
  recipientEmail: string;
  storeName: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{
  status: 'sent' | 'failed' | 'unconfigured';
  provider: 'resend' | 'smtp' | 'none';
  errorMessage?: string;
}> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const from =
        process.env.RESEND_FROM?.trim() || `${params.storeName} <onboarding@resend.dev>`;
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [params.recipientEmail],
          subject: params.subject,
          text: params.text,
          html: params.html,
        }),
      });
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        return {
          status: 'failed',
          provider: 'resend',
          errorMessage: `Resend (${response.status}): ${bodyText.slice(0, 180) || 'Falha no envio.'}`,
        };
      }
      return { status: 'sent', provider: 'resend' };
    } catch (err) {
      return {
        status: 'failed',
        provider: 'resend',
        errorMessage: err instanceof Error ? err.message : 'Erro ao enviar via Resend.',
      };
    }
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpUser && smtpPass) {
    try {
      const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
      const port = Number(process.env.SMTP_PORT?.trim() || '465') || 465;
      const secure = port === 465;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 4500,
        greetingTimeout: 4500,
        socketTimeout: 5000,
      });

      const fromAddress =
        process.env.SMTP_FROM?.trim() || `"${params.storeName}" <${smtpUser}>`;

      await transporter.sendMail({
        from: fromAddress,
        to: params.recipientEmail,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });

      return { status: 'sent', provider: 'smtp' };
    } catch (err) {
      return {
        status: 'failed',
        provider: 'smtp',
        errorMessage: err instanceof Error ? err.message : 'Erro ao enviar via SMTP.',
      };
    }
  }

  return {
    status: 'unconfigured',
    provider: 'none',
    errorMessage:
      'Para entregar na caixa Gmail, adicione SMTP_USER e SMTP_PASS (Senha de Aplicação Gmail) ou RESEND_API_KEY nas Secrets do servidor.',
  };
}

export async function notifyNewOrderAsync(
  order: StoreOrder,
  options?: { force?: boolean; recipientOverride?: string; productsOverride?: Product[] }
): Promise<OrderNotificationRecord> {
  const ctx = await getOrderNotificationRuntimeContext();
  const transport = getEmailTransportStatus();
  const configuredRecipient = ctx.orderNotification.recipientEmail?.trim();
  const recipientEmail =
    options?.recipientOverride && isValidEmailAddress(options.recipientOverride)
      ? options.recipientOverride.trim()
      : configuredRecipient && isValidEmailAddress(configuredRecipient)
      ? configuredRecipient
      : transport.defaultRecipient;

  const detailedItems = enrichOrderItems(order, options?.productsOverride || ctx.products);
  const title = buildOrderNotificationTitle(order);
  const createdAt = new Date().toISOString();

  let emailStatus: OrderNotificationRecord['emailStatus'] = 'disabled';
  let provider: OrderNotificationRecord['provider'] = 'none';
  let errorMessage: string | undefined;

  if (ctx.orderNotification.enabled || options?.force) {
    const { text, html } = buildEmailBodies(
      ctx.storeName,
      ctx.currencySymbol,
      title,
      order,
      detailedItems
    );

    const delivery = await Promise.race([
      deliverEmailViaProvider({
        recipientEmail,
        storeName: ctx.storeName,
        subject: title,
        text,
        html,
      }),
      new Promise<{
        status: 'failed';
        provider: 'none';
        errorMessage: string;
      }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              status: 'failed',
              provider: 'none',
              errorMessage: 'Tempo limite excedido ao contactar servidor de email.',
            }),
          5500
        )
      ),
    ]);

    emailStatus = delivery.status;
    provider = delivery.provider;
    errorMessage = delivery.errorMessage;
  }

  const record: OrderNotificationRecord = {
    id: `notif-${order.id}-${Date.now()}`,
    orderId: order.id,
    title,
    recipientEmail,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    city: order.city,
    paymentMethod: order.paymentMethod,
    total: order.total,
    currencySymbol: ctx.currencySymbol,
    items: detailedItems,
    emailStatus,
    provider,
    errorMessage,
    createdAt,
  };

  broadcastOrderNotification(record);
  await recordOrderNotificationInStore(record);
  return record;
}

export async function sendTestOrderNotificationAsync(
  recipientOverride?: string
): Promise<OrderNotificationRecord> {
  const ctx = await getOrderNotificationRuntimeContext();
  const sampleProduct = ctx.products[0];

  const sampleOrder: StoreOrder = {
    id: `TESTE-${Date.now().toString().slice(-4)}`,
    customerName: 'Cliente Teste da Loja',
    customerEmail: 'cliente.teste@exemplo.ao',
    customerPhone: '+244 923 000 000',
    shippingAddress: 'Talatona, Rua Principal',
    city: 'Luanda',
    postalCode: '—',
    paymentMethod: 'Contra-Reembolso',
    items: [
      {
        productId: sampleProduct?.id || 'teste-1',
        name: sampleProduct?.name || 'Peça de Demonstração Lunora',
        size: sampleProduct?.sizes?.[0] || 'M',
        quantity: 2,
        unitPrice: sampleProduct?.price || 25000,
      },
    ],
    total: (sampleProduct?.price || 25000) * 2,
    status: 'Pendente',
    createdAt: new Date().toISOString().slice(0, 10),
    progressStep: 1,
    totalSteps: 3,
  };

  return notifyNewOrderAsync(sampleOrder, {
    force: true,
    recipientOverride,
    productsOverride: sampleProduct
      ? ctx.products
      : [
          {
            id: 'teste-1',
            sku: 'LUN-TEST',
            name: 'Peça de Demonstração Lunora',
            category: 'Vestidos',
            price: 25000,
            rating: 5,
            reviewCount: 1,
            stock: 5,
            sizes: ['M'],
            colors: ['Neutro'],
            description:
              'Exemplo de descrição completa do produto incluída automaticamente na notificação por email.',
            material: 'Linho & Algodão',
            image: '',
          },
        ],
  });
}
