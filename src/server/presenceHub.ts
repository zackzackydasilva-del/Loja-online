import type http from 'node:http';
import crypto from 'node:crypto';
import type { Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  LiveVisitorSession,
  OrderNotificationRecord,
  StoreAnalyticsEvent,
  StoreOrder,
  VisitorStage,
} from '../types/store.ts';
import {
  getPersistedRealtimeSnapshot,
  recordAnalyticsEventInStore,
  removePresenceInStore,
  upsertPresenceInStore,
} from './storeRepository.ts';

export interface PresenceUpdateInput {
  sessionId: string;
  visitorLabel?: string;
  stage?: VisitorStage;
  productId?: string;
  productName?: string;
  cartCount?: number;
  cartTotal?: number;
  cartItemsSummary?: string[];
  customerName?: string;
  customerEmail?: string;
  city?: string;
  device?: string;
  completedOrderId?: string;
  eventId?: string;
  details?: string;
}

const VALID_STAGES: VisitorStage[] = ['loja', 'produto', 'saco', 'checkout', 'comprou'];
const STALE_TIMEOUT_MS = 95_000;

const activeSessions = new Map<string, LiveVisitorSession>();
const recentEvents: StoreAnalyticsEvent[] = [];
const seenEventIds = new Set<string>();
const adminWsClients = new Set<WebSocket>();
const sseAdminClients = new Set<Response>();
const visitorSockets = new Map<string, Set<WebSocket>>();

let sweeperStarted = false;

function rememberEvent(evt: StoreAnalyticsEvent): boolean {
  if (seenEventIds.has(evt.id)) return false;
  seenEventIds.add(evt.id);
  if (seenEventIds.size > 3000) {
    const oldest = seenEventIds.values().next().value;
    if (oldest) seenEventIds.delete(oldest);
  }
  recentEvents.unshift(evt);
  if (recentEvents.length > 1500) {
    recentEvents.length = 1500;
  }
  return true;
}

function broadcastToAdmins(message: { type: string; payload: unknown }) {
  const serialized = JSON.stringify(message);
  for (const ws of adminWsClients) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(serialized);
      } catch {
        // Ignore broken sockets
      }
    }
  }
  const sseChunk = `data: ${serialized}\n\n`;
  for (const res of sseAdminClients) {
    try {
      res.write(sseChunk);
    } catch {
      sseAdminClients.delete(res);
    }
  }
}

export function broadcastOrderNotification(record: OrderNotificationRecord): void {
  broadcastToAdmins({ type: 'order:notification', payload: record });
}

function sanitizeText(val: unknown, max = 120): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function buildDefaultLabel(sessionId: string): string {
  const suffix = sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'LIVE';
  return `Visitante #${suffix}`;
}

export async function processPresenceUpdateAsync(
  input: PresenceUpdateInput
): Promise<LiveVisitorSession | null> {
  const sessionId = sanitizeText(input.sessionId, 80);
  if (!sessionId) return null;

  const nowIso = new Date().toISOString();
  const prev = activeSessions.get(sessionId);
  const stage: VisitorStage =
    input.stage && VALID_STAGES.includes(input.stage)
      ? input.stage
      : prev?.stage || 'loja';

  const customerName = sanitizeText(input.customerName, 80) ?? prev?.customerName;
  const rawLabel = sanitizeText(input.visitorLabel, 60);
  const visitorLabel =
    customerName ||
    (rawLabel && !rawLabel.startsWith('Visitante #') ? rawLabel : prev?.visitorLabel) ||
    rawLabel ||
    buildDefaultLabel(sessionId);

  const session: LiveVisitorSession = {
    sessionId,
    visitorLabel,
    stage,
    productId:
      stage === 'produto'
        ? sanitizeText(input.productId, 80) ?? prev?.productId
        : undefined,
    productName:
      stage === 'produto'
        ? sanitizeText(input.productName, 140) ?? prev?.productName
        : undefined,
    cartCount: Math.max(0, Math.floor(Number(input.cartCount ?? prev?.cartCount ?? 0) || 0)),
    cartTotal: Math.max(0, +(Number(input.cartTotal ?? prev?.cartTotal ?? 0) || 0).toFixed(2)),
    cartItemsSummary: Array.isArray(input.cartItemsSummary)
      ? input.cartItemsSummary.map((s) => String(s).slice(0, 80)).slice(0, 12)
      : prev?.cartItemsSummary ?? [],
    customerName,
    customerEmail: sanitizeText(input.customerEmail, 120) ?? prev?.customerEmail,
    city: sanitizeText(input.city, 80) ?? prev?.city,
    device: sanitizeText(input.device, 40) || prev?.device || 'Web',
    startedAt: prev?.startedAt || nowIso,
    lastSeenAt: nowIso,
    completedOrderId:
      stage === 'comprou'
        ? sanitizeText(input.completedOrderId, 60) ?? prev?.completedOrderId
        : prev?.completedOrderId,
  };

  activeSessions.set(sessionId, session);
  broadcastToAdmins({ type: 'presence:upsert', payload: session });

  const dbWrites: Promise<void>[] = [upsertPresenceInStore(session)];

  const stageChanged =
    !prev ||
    prev.stage !== session.stage ||
    (session.stage === 'produto' && prev.productId !== session.productId) ||
    (session.stage === 'comprou' && prev.completedOrderId !== session.completedOrderId);

  if (stageChanged || input.eventId) {
    const evtId =
      sanitizeText(input.eventId, 100) ||
      `evt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const details =
      sanitizeText(input.details, 220) ||
      (session.stage === 'produto' && session.productName
        ? `A ver produto: ${session.productName}`
        : session.stage === 'saco'
        ? `Abriu o saco (${session.cartCount} artigo(s))`
        : session.stage === 'checkout'
        ? `Entrou no check-out (${session.cartCount} artigo(s))`
        : session.stage === 'comprou'
        ? `Compra concluída${session.completedOrderId ? ` #${session.completedOrderId}` : ''}`
        : 'Entrou na loja online');

    const analyticsEvt: StoreAnalyticsEvent = {
      id: evtId,
      sessionId,
      visitorLabel: session.visitorLabel,
      eventType: session.stage,
      productId: session.productId,
      productName: session.productName,
      orderId: session.completedOrderId,
      customerName: session.customerName,
      customerEmail: session.customerEmail,
      city: session.city,
      cartCount: session.cartCount,
      cartTotal: session.cartTotal,
      details,
      device: session.device,
      createdAt: nowIso,
    };

    if (rememberEvent(analyticsEvt)) {
      broadcastToAdmins({ type: 'analytics:event', payload: analyticsEvt });
      dbWrites.push(recordAnalyticsEventInStore(analyticsEvt));
    }
  }

  await Promise.allSettled(dbWrites);
  return session;
}

export function processPresenceUpdate(input: PresenceUpdateInput): void {
  void processPresenceUpdateAsync(input);
}

export async function processPresenceLeaveAsync(sessionIdInput: string): Promise<void> {
  const sessionId = sanitizeText(sessionIdInput, 80);
  if (!sessionId) return;
  const existing = activeSessions.get(sessionId);
  if (!existing) {
    await removePresenceInStore(sessionId);
    return;
  }

  activeSessions.delete(sessionId);
  broadcastToAdmins({ type: 'presence:remove', payload: { sessionId } });

  const dbWrites: Promise<void>[] = [removePresenceInStore(sessionId)];

  const leaveEvt: StoreAnalyticsEvent = {
    id: `evt-leave-${sessionId}-${Date.now()}`,
    sessionId,
    visitorLabel: existing.visitorLabel,
    eventType: 'saida',
    productId: existing.productId,
    productName: existing.productName,
    customerName: existing.customerName,
    customerEmail: existing.customerEmail,
    city: existing.city,
    cartCount: existing.cartCount,
    cartTotal: existing.cartTotal,
    details:
      existing.stage === 'checkout'
        ? 'Saiu durante o check-out'
        : existing.stage === 'comprou'
        ? 'Saiu após concluir compra'
        : 'Saiu da loja',
    device: existing.device,
    createdAt: new Date().toISOString(),
  };

  if (rememberEvent(leaveEvt)) {
    broadcastToAdmins({ type: 'analytics:event', payload: leaveEvt });
    dbWrites.push(recordAnalyticsEventInStore(leaveEvt));
  }

  await Promise.allSettled(dbWrites);
}

export function processPresenceLeave(sessionIdInput: string) {
  void processPresenceLeaveAsync(sessionIdInput);
}

export async function recordOrderCompletionAnalyticsAsync(
  order: StoreOrder,
  sessionId?: string
): Promise<void> {
  const sid = sanitizeText(sessionId, 80) || `order-${order.id}`;
  const nowIso = new Date().toISOString();
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const summary = order.items.map((i) => `${i.quantity}x ${i.name}`);

  if (sessionId && activeSessions.has(sid)) {
    await processPresenceUpdateAsync({
      sessionId: sid,
      visitorLabel: order.customerName,
      stage: 'comprou',
      cartCount: totalQty,
      cartTotal: order.total,
      cartItemsSummary: summary,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      city: order.city,
      completedOrderId: order.id,
      eventId: `evt-order-${order.id}`,
      details: `Comprou #${order.id} · ${summary.slice(0, 3).join(', ')}`,
    });
    return;
  }

  const orderEvt: StoreAnalyticsEvent = {
    id: `evt-order-${order.id}`,
    sessionId: sid,
    visitorLabel: order.customerName,
    eventType: 'comprou',
    orderId: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    city: order.city,
    cartCount: totalQty,
    cartTotal: order.total,
    details: `Comprou #${order.id} · ${summary.slice(0, 3).join(', ')}`,
    device: 'Loja Online',
    createdAt: nowIso,
  };

  if (rememberEvent(orderEvt)) {
    broadcastToAdmins({ type: 'analytics:event', payload: orderEvt });
    await recordAnalyticsEventInStore(orderEvt);
  }
}

export function recordOrderCompletionAnalytics(order: StoreOrder, sessionId?: string) {
  void recordOrderCompletionAnalyticsAsync(order, sessionId);
}

function pruneStaleSessions() {
  const cutoff = Date.now() - STALE_TIMEOUT_MS;
  for (const [sid, session] of activeSessions.entries()) {
    const seenMs = Date.parse(session.lastSeenAt);
    if (Number.isFinite(seenMs) && seenMs < cutoff) {
      const openSockets = visitorSockets.get(sid);
      const hasOpenWs = openSockets
        ? Array.from(openSockets).some((ws) => ws.readyState === WebSocket.OPEN)
        : false;
      if (!hasOpenWs) {
        processPresenceLeave(sid);
      }
    }
  }
}

export async function recordCheckoutDraftAnalyticsAsync(order: StoreOrder, sessionId?: string) {
  const sid = sanitizeText(sessionId, 80) || `order-${order.id}`;
  const nowIso = new Date().toISOString();
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const summary = order.items.map((i) => `${i.quantity}x ${i.name}`);

  const draftEvt: StoreAnalyticsEvent = {
    id: `evt-checkout-draft-${order.id}`,
    sessionId: sid,
    visitorLabel: order.customerName,
    eventType: 'checkout',
    orderId: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    city: order.city,
    cartCount: totalQty,
    cartTotal: order.total,
    details: `Preencheu check-out · Pendente #${order.id} (${summary.slice(0, 3).join(', ')})`,
    device: 'Loja Online',
    createdAt: nowIso,
  };

  if (rememberEvent(draftEvt)) {
    broadcastToAdmins({ type: 'analytics:event', payload: draftEvt });
    await recordAnalyticsEventInStore(draftEvt);
  }
}

export async function getAuthoritativeRealtimeSnapshot(): Promise<{
  sessions: LiveVisitorSession[];
  events: StoreAnalyticsEvent[];
  serverTime: string;
}> {
  pruneStaleSessions();
  const persisted = await getPersistedRealtimeSnapshot(2000).catch(() => ({
    sessions: [] as LiveVisitorSession[],
    events: [] as StoreAnalyticsEvent[],
  }));

  const sessionMap = new Map<string, LiveVisitorSession>();
  for (const s of persisted.sessions) {
    sessionMap.set(s.sessionId, s);
  }
  for (const [sid, s] of activeSessions.entries()) {
    sessionMap.set(sid, s);
  }

  const eventMap = new Map<string, StoreAnalyticsEvent>();
  for (const e of persisted.events) {
    eventMap.set(e.id, e);
  }
  for (const e of recentEvents) {
    eventMap.set(e.id, e);
  }

  const sessions = Array.from(sessionMap.values()).sort((a, b) =>
    b.lastSeenAt.localeCompare(a.lastSeenAt)
  );
  const events = Array.from(eventMap.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2000);

  return {
    sessions,
    events,
    serverTime: new Date().toISOString(),
  };
}

export function registerSseAdminClient(res: Response) {
  sseAdminClients.add(res);
  void getAuthoritativeRealtimeSnapshot().then((snapshot) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'snapshot', payload: snapshot })}\n\n`);
    }
  });
  return () => {
    sseAdminClients.delete(res);
  };
}

export function attachPresenceWebSocket(
  httpServer: http.Server,
  verifyAdminTokenFn: (token: string) => boolean
) {
  if (!sweeperStarted) {
    sweeperStarted = true;
    const timer = setInterval(pruneStaleSessions, 15_000);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const host = req.headers.host || 'localhost';
      const parsed = new URL(req.url || '/', `http://${host}`);
      if (parsed.pathname !== '/ws/presence') {
        return; // Leave Vite HMR or other upgrade handlers completely untouched
      }

      const role = parsed.searchParams.get('role') || 'visitor';
      if (role === 'admin') {
        const token = parsed.searchParams.get('token') || '';
        if (!verifyAdminTokenFn(token)) {
          socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
          socket.destroy();
          return;
        }
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req, parsed);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage, parsedUrl: URL) => {
    const role = parsedUrl.searchParams.get('role') || 'visitor';

    if (role === 'admin') {
      adminWsClients.add(ws);
      void getAuthoritativeRealtimeSnapshot().then((snapshot) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'snapshot', payload: snapshot }));
        }
      });

      const hb = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', payload: { ts: Date.now() } }));
        }
      }, 25_000);

      ws.on('close', () => {
        clearInterval(hb);
        adminWsClients.delete(ws);
      });
      return;
    }

    // Storefront visitor WebSocket
    let boundSessionId = sanitizeText(parsedUrl.searchParams.get('sessionId'), 80) || '';
    if (boundSessionId) {
      let set = visitorSockets.get(boundSessionId);
      if (!set) {
        set = new Set();
        visitorSockets.set(boundSessionId, set);
      }
      set.add(ws);
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string; payload?: PresenceUpdateInput };
        if (msg.type === 'presence:update' && msg.payload) {
          const sid = sanitizeText(msg.payload.sessionId, 80) || boundSessionId;
          if (sid) {
            if (!boundSessionId) {
              boundSessionId = sid;
              let set = visitorSockets.get(sid);
              if (!set) {
                set = new Set();
                visitorSockets.set(sid, set);
              }
              set.add(ws);
            }
            processPresenceUpdate({ ...msg.payload, sessionId: sid });
          }
        } else if (msg.type === 'presence:ping' && boundSessionId) {
          const existing = activeSessions.get(boundSessionId);
          if (existing) {
            existing.lastSeenAt = new Date().toISOString();
            activeSessions.set(boundSessionId, existing);
            void upsertPresenceInStore(existing);
          }
        } else if (msg.type === 'presence:leave' && boundSessionId) {
          processPresenceLeave(boundSessionId);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (!boundSessionId) return;
      const set = visitorSockets.get(boundSessionId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          visitorSockets.delete(boundSessionId);
        }
      }
      // Do not prematurely remove the session on socket disconnect;
      // HTTP heartbeats or explicit pagehide/leave will update or close the session cleanly.
    });
  });
}
