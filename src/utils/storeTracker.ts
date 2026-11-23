import type { VisitorStage } from '../types/store';

const SESSION_KEY = 'lunora_visitor_sid_v1';
const LABEL_KEY = 'lunora_visitor_lbl_v1';

export interface VisitorPresencePayload {
  stage: VisitorStage;
  productId?: string;
  productName?: string;
  cartCount: number;
  cartTotal: number;
  cartItemsSummary?: string[];
  customerName?: string;
  customerEmail?: string;
  city?: string;
  completedOrderId?: string;
  eventId?: string;
  details?: string;
}

let ws: WebSocket | null = null;
let wsDisabled = false;
let initialized = false;
let heartbeatTimer: number | null = null;
let wsReconnectTimer: number | null = null;
let latestPayload: VisitorPresencePayload = {
  stage: 'loja',
  cartCount: 0,
  cartTotal: 0,
};
let lastHttpSentAt = 0;

let boundPageHideHandler: ((e: PageTransitionEvent) => void) | null = null;
let boundVisibilityHandler: (() => void) | null = null;

function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Web';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone / iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mobile/i.test(ua)) return 'Telemóvel';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Navegador Web';
}

export function getVisitorSessionId(): string {
  try {
    let existing = sessionStorage.getItem(SESSION_KEY);
    if (!existing) {
      existing = `vis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem(SESSION_KEY, existing);
    }
    return existing;
  } catch {
    return `vis-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getVisitorLabel(): string {
  try {
    let label = sessionStorage.getItem(LABEL_KEY);
    if (!label) {
      const sid = getVisitorSessionId();
      label = `Visitante #${sid.slice(-4).toUpperCase()}`;
      sessionStorage.setItem(LABEL_KEY, label);
    }
    return label;
  } catch {
    return 'Visitante';
  }
}

function sendViaHttp(payload: Record<string, unknown>, useBeacon = false) {
  const body = JSON.stringify(payload);
  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/analytics/presence', blob);
      if (ok) return;
    } catch {
      // Fallback to keepalive fetch
    }
  }
  fetch('/api/analytics/presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

function buildMessagePayload(data: VisitorPresencePayload) {
  return {
    sessionId: getVisitorSessionId(),
    visitorLabel: data.customerName?.trim() || getVisitorLabel(),
    stage: data.stage,
    productId: data.productId,
    productName: data.productName,
    cartCount: data.cartCount,
    cartTotal: data.cartTotal,
    cartItemsSummary: data.cartItemsSummary,
    customerName: data.customerName?.trim() || undefined,
    customerEmail: data.customerEmail?.trim() || undefined,
    city: data.city?.trim() || undefined,
    device: detectDeviceLabel(),
    completedOrderId: data.completedOrderId,
    eventId: data.eventId,
    details: data.details,
  };
}

function openVisitorSocket() {
  if (wsDisabled || typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const sid = encodeURIComponent(getVisitorSessionId());
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/ws/presence?role=visitor&sessionId=${sid}`
    );
    let openedAtLeastOnce = false;

    socket.onopen = () => {
      openedAtLeastOnce = true;
      if (wsReconnectTimer !== null) {
        window.clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
      }
      try {
        socket.send(
          JSON.stringify({
            type: 'presence:update',
            payload: buildMessagePayload(latestPayload),
          })
        );
      } catch {
        // Fallback already sent via HTTP
      }
    };

    socket.onerror = () => {
      if (!openedAtLeastOnce) {
        wsDisabled = true;
      }
    };

    socket.onclose = () => {
      if (ws === socket) {
        ws = null;
      }
      if (!openedAtLeastOnce) {
        wsDisabled = true;
        return;
      }
      // If socket dropped after working, silently reconnect in 5s while keeping HTTP active
      if (initialized && wsReconnectTimer === null) {
        wsReconnectTimer = window.setTimeout(() => {
          wsReconnectTimer = null;
          if (initialized) {
            openVisitorSocket();
          }
        }, 5000);
      }
    };

    ws = socket;
  } catch {
    wsDisabled = true;
  }
}

export function startStoreVisitorTracker(initialPayload?: Partial<VisitorPresencePayload>) {
  if (initialPayload) {
    latestPayload = { ...latestPayload, ...initialPayload };
  }
  if (initialized) {
    reportVisitorStage(latestPayload);
    return;
  }
  initialized = true;

  // Immediate HTTP registration + non-blocking WebSocket upgrade
  sendViaHttp(buildMessagePayload(latestPayload));
  lastHttpSentAt = Date.now();
  openVisitorSocket();

  boundPageHideHandler = (e: PageTransitionEvent) => {
    if (e.persisted) return;
    const sid = getVisitorSessionId();
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'presence:leave', payload: { sessionId: sid } }));
      } catch {
        // Ignore
      }
    }
    sendViaHttp({ action: 'leave', sessionId: sid }, true);
  };

  boundVisibilityHandler = () => {
    if (document.visibilityState === 'visible' && initialized) {
      openVisitorSocket();
      sendViaHttp(buildMessagePayload(latestPayload));
      lastHttpSentAt = Date.now();
    }
  };

  window.addEventListener('pagehide', boundPageHideHandler);
  document.addEventListener('visibilitychange', boundVisibilityHandler);

  // Keep presence active every 18s even when user temporarily checks another browser tab
  heartbeatTimer = window.setInterval(() => {
    if (!initialized) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({
            type: 'presence:ping',
            payload: { sessionId: getVisitorSessionId() },
          })
        );
      } catch {
        sendViaHttp(buildMessagePayload(latestPayload));
        lastHttpSentAt = Date.now();
      }
    } else {
      sendViaHttp(buildMessagePayload(latestPayload));
      lastHttpSentAt = Date.now();
    }
  }, 18_000);
}

export function stopStoreVisitorTracker() {
  if (!initialized) return;
  initialized = false;

  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (wsReconnectTimer !== null) {
    window.clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (boundPageHideHandler) {
    window.removeEventListener('pagehide', boundPageHideHandler);
    boundPageHideHandler = null;
  }
  if (boundVisibilityHandler) {
    document.removeEventListener('visibilitychange', boundVisibilityHandler);
    boundVisibilityHandler = null;
  }

  const sid = getVisitorSessionId();
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: 'presence:leave', payload: { sessionId: sid } }));
      ws.close();
    } catch {
      // Ignore
    }
  }
  ws = null;
  sendViaHttp({ action: 'leave', sessionId: sid }, true);
}

export function reportVisitorStage(update: VisitorPresencePayload) {
  const prev = latestPayload;
  latestPayload = update;
  if (!initialized) return;

  const msgPayload = buildMessagePayload(update);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: 'presence:update', payload: msgPayload }));
      return;
    } catch {
      // Fall back to HTTP below
    }
  }

  const significantChange =
    prev.stage !== update.stage ||
    prev.productId !== update.productId ||
    prev.cartCount !== update.cartCount ||
    Boolean(update.eventId) ||
    Date.now() - lastHttpSentAt > 3500;

  if (significantChange) {
    lastHttpSentAt = Date.now();
    sendViaHttp(msgPayload);
  }
}
