import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  Radio,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  UserCheck,
  Users,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  LiveVisitorSession,
  OrderStatus,
  StoreAnalyticsEvent,
  StoreOrder,
} from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { formatLocalIsoDate, shiftIsoDate } from '../../utils/weeklyAnalytics';
import { OrderInvoiceModal } from './OrderInvoiceModal';

type EventFilterType = 'all' | 'comprou' | 'checkout' | 'saco' | 'produto' | 'loja' | 'saida';
type LogDatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'day';

function formatRelativeSeconds(isoStr: string, nowMs: number): string {
  const ts = Date.parse(isoStr);
  if (!Number.isFinite(ts)) return 'Agora';
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 10) return 'Agora';
  if (diffSec < 60) return `Há ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  return `Há ${diffHours}h`;
}

function formatTimeClock(isoStr: string): string {
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return String(isoStr).slice(0, 16);
  return dt.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function stageBadge(stage: StoreAnalyticsEvent['eventType']) {
  switch (stage) {
    case 'comprou':
      return {
        label: 'Comprou',
        cls: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      };
    case 'checkout':
      return {
        label: 'No Check-out',
        cls: 'bg-[#1C1C1E] text-white border-[#1C1C1E]',
      };
    case 'saco':
      return {
        label: 'No Saco',
        cls: 'bg-amber-100 text-amber-900 border-amber-200',
      };
    case 'produto':
      return {
        label: 'A Ver Produto',
        cls: 'bg-blue-50 text-blue-900 border-blue-200',
      };
    case 'saida':
      return {
        label: 'Saiu',
        cls: 'bg-[#EFECE5] text-[#555552] border-black/10',
      };
    case 'loja':
    default:
      return {
        label: 'Na Loja',
        cls: 'bg-[#F2F1EE] text-[#1C1C1E] border-black/10',
      };
  }
}

export const AdminRealtimeAnalytics: React.FC = () => {
  const { adminToken, orders, settings, updateOrderStatus } = useStore();

  const [sessions, setSessions] = useState<LiveVisitorSession[]>([]);
  const [events, setEvents] = useState<StoreAnalyticsEvent[]>([]);
  const [connectionMode, setConnectionMode] = useState<'ws' | 'sse' | 'sync'>('sync');
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');

  const [eventFilter, setEventFilter] = useState<EventFilterType>('all');
  const [datePreset, setDatePreset] = useState<LogDatePreset>('all');
  const [specificDay, setSpecificDay] = useState(() => formatLocalIsoDate());
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const modeRef = useRef<'ws' | 'sse' | 'sync'>('sync');
  modeRef.current = connectionMode;

  const invoiceOrder: StoreOrder | null =
    orders.find((o) => o.id === invoiceOrderId) || null;

  const syncServerClock = useCallback((serverTime?: string) => {
    if (!serverTime) return;
    const serverTs = Date.parse(serverTime);
    if (Number.isFinite(serverTs)) {
      setServerOffsetMs(serverTs - Date.now());
    }
  }, []);

  const mergeEvents = useCallback(
    (prev: StoreAnalyticsEvent[], incoming: StoreAnalyticsEvent[]): StoreAnalyticsEvent[] => {
      const map = new Map<string, StoreAnalyticsEvent>();
      for (const e of prev) map.set(e.id, e);
      for (const e of incoming) map.set(e.id, e);
      return Array.from(map.values())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 2000);
    },
    []
  );

  const fetchSnapshot = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/analytics/live', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      syncServerClock(data.serverTime);
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
      if (Array.isArray(data.events)) {
        setEvents((prev) => mergeEvents(prev, data.events));
      }
      setLastUpdatedAt(new Date().toISOString());
    } catch {
      // Ignore network hiccup
    } finally {
      setLoading(false);
    }
  }, [adminToken, syncServerClock, mergeEvents]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!adminToken) return;

    fetchSnapshot();

    let sseStarted = false;
    const startSseFallback = () => {
      if (sseStarted || typeof EventSource === 'undefined') return;
      sseStarted = true;
      try {
        const es = new EventSource(
          `/api/admin/analytics/stream?token=${encodeURIComponent(adminToken)}`
        );
        esRef.current = es;
        es.onopen = () => setConnectionMode('sse');
        es.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data) as { type: string; payload: any };
            if (msg.type === 'snapshot' && msg.payload) {
              syncServerClock(msg.payload.serverTime);
              if (Array.isArray(msg.payload.sessions)) setSessions(msg.payload.sessions);
              if (Array.isArray(msg.payload.events)) {
                setEvents((prev) => mergeEvents(prev, msg.payload.events));
              }
              setLastUpdatedAt(new Date().toISOString());
              setLoading(false);
            } else if (msg.type === 'presence:upsert' && msg.payload) {
              const incoming = msg.payload as LiveVisitorSession;
              setSessions((prev) => {
                const idx = prev.findIndex((s) => s.sessionId === incoming.sessionId);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = incoming;
                  return next;
                }
                return [incoming, ...prev];
              });
              setLastUpdatedAt(new Date().toISOString());
            } else if (msg.type === 'presence:remove' && msg.payload?.sessionId) {
              setSessions((prev) =>
                prev.filter((s) => s.sessionId !== msg.payload.sessionId)
              );
            } else if (msg.type === 'analytics:event' && msg.payload) {
              const evt = msg.payload as StoreAnalyticsEvent;
              setEvents((prev) =>
                prev.some((x) => x.id === evt.id) ? prev : [evt, ...prev].slice(0, 2000)
              );
              setLastUpdatedAt(new Date().toISOString());
            }
          } catch {
            // Ignore malformed SSE payload
          }
        };
        es.onerror = () => {
          setConnectionMode('sync');
        };
      } catch {
        setConnectionMode('sync');
      }
    };

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(
        `${protocol}//${window.location.host}/ws/presence?role=admin&token=${encodeURIComponent(
          adminToken
        )}`
      );
      wsRef.current = socket;
      let wsConnected = false;

      socket.onopen = () => {
        wsConnected = true;
        setConnectionMode('ws');
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as { type: string; payload: any };
          if (msg.type === 'snapshot' && msg.payload) {
            syncServerClock(msg.payload.serverTime);
            if (Array.isArray(msg.payload.sessions)) setSessions(msg.payload.sessions);
            if (Array.isArray(msg.payload.events)) {
              setEvents((prev) => mergeEvents(prev, msg.payload.events));
            }
            setLastUpdatedAt(new Date().toISOString());
            setLoading(false);
          } else if (msg.type === 'presence:upsert' && msg.payload) {
            const incoming = msg.payload as LiveVisitorSession;
            setSessions((prev) => {
              const idx = prev.findIndex((s) => s.sessionId === incoming.sessionId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = incoming;
                return next;
              }
              return [incoming, ...prev];
            });
            setLastUpdatedAt(new Date().toISOString());
          } else if (msg.type === 'presence:remove' && msg.payload?.sessionId) {
            setSessions((prev) =>
              prev.filter((s) => s.sessionId !== msg.payload.sessionId)
            );
          } else if (msg.type === 'analytics:event' && msg.payload) {
            const evt = msg.payload as StoreAnalyticsEvent;
            setEvents((prev) =>
              prev.some((x) => x.id === evt.id) ? prev : [evt, ...prev].slice(0, 2000)
            );
            setLastUpdatedAt(new Date().toISOString());
          }
        } catch {
          // Ignore malformed frame
        }
      };

      socket.onerror = () => {
        if (!wsConnected) {
          startSseFallback();
        }
      };

      socket.onclose = () => {
        if (!wsConnected) {
          startSseFallback();
        } else {
          setConnectionMode('sync');
          startSseFallback();
        }
      };
    } catch {
      startSseFallback();
    }

    let tickCount = 0;
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      tickCount += 1;
      // Poll every 4s in HTTP sync mode (e.g. serverless/Vercel), or every 12s alongside WS/SSE
      if (modeRef.current === 'sync' || tickCount % 3 === 0) {
        fetchSnapshot();
      }
    }, 4_000);

    return () => {
      window.clearInterval(pollTimer);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // Ignore
        }
        wsRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [adminToken, fetchSnapshot, syncServerClock]);

  const adjustedNowMs = nowMs + serverOffsetMs;

  const activeSessions = useMemo(() => {
    const cutoff = adjustedNowMs - 105_000;
    return sessions
      .filter((s) => {
        const ts = Date.parse(s.lastSeenAt);
        return !Number.isFinite(ts) || ts >= cutoff;
      })
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }, [sessions, adjustedNowMs]);

  const checkoutVisitors = useMemo(
    () => activeSessions.filter((s) => s.stage === 'checkout'),
    [activeSessions]
  );

  const browsingVisitors = useMemo(
    () => activeSessions.filter((s) => s.stage !== 'checkout'),
    [activeSessions]
  );

  const checkoutLiveValue = useMemo(
    () => checkoutVisitors.reduce((s, v) => s + (Number(v.cartTotal) || 0), 0),
    [checkoutVisitors]
  );

  const matchesDateFilter = useCallback(
    (isoDateOrTimestamp: string) => {
      const dateIso = String(isoDateOrTimestamp || '').slice(0, 10);
      if (!dateIso || datePreset === 'all') return true;
      const todayIso = formatLocalIsoDate();
      if (datePreset === 'today') return dateIso === todayIso;
      if (datePreset === 'yesterday') return dateIso === shiftIsoDate(todayIso, -1);
      if (datePreset === 'last7') return dateIso >= shiftIsoDate(todayIso, -6);
      if (datePreset === 'day') return dateIso === specificDay;
      return true;
    },
    [datePreset, specificDay]
  );

  const filteredBuyers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      if (!matchesDateFilter(o.createdAt)) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [orders, matchesDateFilter, searchTerm]);

  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return events.filter((ev) => {
      if (eventFilter !== 'all' && ev.eventType !== eventFilter) return false;
      if (!matchesDateFilter(ev.createdAt)) return false;
      if (!q) return true;
      return (
        ev.visitorLabel.toLowerCase().includes(q) ||
        (ev.customerName || '').toLowerCase().includes(q) ||
        (ev.productName || '').toLowerCase().includes(q) ||
        (ev.orderId || '').toLowerCase().includes(q) ||
        (ev.details || '').toLowerCase().includes(q) ||
        (ev.city || '').toLowerCase().includes(q)
      );
    });
  }, [events, eventFilter, matchesDateFilter, searchTerm]);

  const buyersRevenueTotal = useMemo(
    () => filteredBuyers.reduce((sum, o) => sum + o.total, 0),
    [filteredBuyers]
  );

  return (
    <div className="space-y-5">
      {/* Live Status & Filter Bar */}
      <div className="bg-white rounded-[22px] p-4 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1C1E] text-white text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>
              {connectionMode === 'ws'
                ? 'Tempo Real · WebSocket Ativo'
                : connectionMode === 'sse'
                ? 'Tempo Real · Fluxo Direto Ativo'
                : 'Tempo Real · Sincronização Ativa'}
            </span>
          </span>
          {lastUpdatedAt && (
            <span className="text-[11px] text-[#72726E] font-mono tabular-nums hidden sm:inline">
              Atualizado às {new Date(lastUpdatedAt).toLocaleTimeString('pt-PT')}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#72726E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar cliente, produto ou #ID..."
              className="pl-8 pr-3 py-1.5 bg-[#F6F6F4] border border-black/10 rounded-full text-xs focus:outline-none focus:border-[#1C1C1E] w-52"
            />
          </div>

          <button
            type="button"
            onClick={fetchSnapshot}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 text-xs font-medium text-[#1C1C1E] hover:bg-[#F5F5F3] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 4 Real-Time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C1C1E] text-white rounded-[22px] p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/65">Online Agora na Loja</p>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-semibold font-mono tabular-nums">
            {activeSessions.length}
          </p>
          <p className="text-[11px] text-white/60 tabular-nums">
            {browsingVisitors.length} a navegar · {checkoutVisitors.length} no check-out
          </p>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-black/5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#72726E]">Na Loja / Catálogo</p>
            <Users className="w-4 h-4 text-[#555552]" />
          </div>
          <p className="text-3xl font-semibold font-mono tabular-nums text-[#1C1C1E]">
            {browsingVisitors.length}
          </p>
          <p className="text-[11px] text-[#72726E] tabular-nums">
            {browsingVisitors.filter((s) => s.stage === 'produto').length} a ver produto ·{' '}
            {browsingVisitors.filter((s) => s.stage === 'saco').length} no saco
          </p>
        </div>

        <div className="bg-[#F6F6F4] rounded-[22px] p-5 border border-black/8 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#1C1C1E]">No Check-out Agora</p>
            <CreditCard className="w-4 h-4 text-[#1C1C1E]" />
          </div>
          <p className="text-3xl font-semibold font-mono tabular-nums text-[#1C1C1E]">
            {checkoutVisitors.length}
          </p>
          <p className="text-[11px] text-[#555552] font-mono tabular-nums">
            Em curso: {formatMoney(checkoutLiveValue, settings.currencySymbol)}
          </p>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-black/5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#72726E]">Quem Comprou</p>
            <UserCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-semibold font-mono tabular-nums text-[#1C1C1E]">
            {filteredBuyers.length}
          </p>
          <p className="text-[11px] text-[#72726E] font-mono tabular-nums">
            Total: {formatMoney(buyersRevenueTotal, settings.currencySymbol)}
          </p>
        </div>
      </div>

      {/* Live Visitors Split: Check-out Agora vs Na Loja Agora */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Who is in Checkout Right Now */}
        <section className="lg:col-span-5 bg-[#1C1C1E] text-white rounded-[24px] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">No Check-out Agora</h2>
              <p className="text-[11px] text-white/60">
                Clientes prestes a concluir a encomenda neste instante
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-xs font-mono tabular-nums">
              {checkoutVisitors.length}
            </span>
          </div>

          {checkoutVisitors.length === 0 ? (
            <div className="rounded-2xl bg-white/6 p-6 text-center space-y-1">
              <ShoppingCart className="w-6 h-6 text-white/40 mx-auto mb-1" />
              <p className="text-xs font-medium text-white/85">
                Nenhum visitante no check-out neste momento.
              </p>
              <p className="text-[11px] text-white/50">
                Assim que um cliente avançar do saco para finalizar compra, aparecerá aqui ao vivo.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {checkoutVisitors.map((visitor) => (
                <div
                  key={visitor.sessionId}
                  className="rounded-2xl bg-[#27272A] border border-white/10 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {visitor.customerName || visitor.visitorLabel}
                      </p>
                      <p className="text-[11px] text-white/60 truncate">
                        {visitor.city ? `${visitor.city} · ` : ''}
                        {visitor.customerEmail ? `${visitor.customerEmail} · ` : ''}
                        {visitor.device}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-emerald-300 whitespace-nowrap">
                      {formatMoney(visitor.cartTotal, settings.currencySymbol)}
                    </span>
                  </div>

                  {visitor.cartItemsSummary && visitor.cartItemsSummary.length > 0 && (
                    <p className="text-[11px] text-white/75 truncate">
                      {visitor.cartItemsSummary.join(', ')}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-white/55 pt-1 border-t border-white/10">
                    <span>{visitor.cartCount} artigo(s) no check-out</span>
                    <span className="font-mono tabular-nums">
                      Ativo {formatRelativeSeconds(visitor.lastSeenAt, adjustedNowMs)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Who is Browsing the Store Right Now */}
        <section className="lg:col-span-7 bg-white rounded-[24px] p-5 sm:p-6 border border-black/5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#1C1C1E]">Na Loja em Tempo Real</h2>
              <p className="text-[11px] text-[#72726E]">
                Visitantes ativos a explorar o catálogo, produtos ou saco de compras
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#F2F1EE] text-[#1C1C1E] text-xs font-mono tabular-nums">
              {browsingVisitors.length} ativo(s)
            </span>
          </div>

          {browsingVisitors.length === 0 ? (
            <div className="rounded-2xl bg-[#F6F6F4] p-6 text-center space-y-1">
              <Eye className="w-6 h-6 text-[#8A8A85] mx-auto mb-1" />
              <p className="text-xs font-medium text-[#1C1C1E]">
                Sem visitantes em navegação neste instante.
              </p>
              <p className="text-[11px] text-[#72726E]">
                Cada visitante que abrir a loja aparece aqui automaticamente em tempo real.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/6 max-h-80 overflow-y-auto pr-1">
              {browsingVisitors.map((visitor) => {
                const badge = stageBadge(visitor.stage);
                return (
                  <div
                    key={visitor.sessionId}
                    className="py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#1C1C1E]">
                          {visitor.customerName || visitor.visitorLabel}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#666662] truncate">
                        {visitor.productName
                          ? `A ver: ${visitor.productName}`
                          : visitor.stage === 'saco'
                          ? `No saco (${visitor.cartCount} artigo(s))`
                          : visitor.stage === 'comprou'
                          ? `Compra concluída${visitor.completedOrderId ? ` #${visitor.completedOrderId}` : ''}`
                          : 'A explorar a coleção da loja'}{' '}
                        · {visitor.device}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {visitor.cartCount > 0 && (
                        <p className="font-mono font-semibold tabular-nums text-[#1C1C1E]">
                          {visitor.cartCount} un. ·{' '}
                          {formatMoney(visitor.cartTotal, settings.currencySymbol)}
                        </p>
                      )}
                      <p className="text-[10px] text-[#8A8A85] font-mono tabular-nums">
                        {formatRelativeSeconds(visitor.lastSeenAt, adjustedNowMs)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Period Filters shared by Quem Comprou & Registo Completo */}
      <div className="bg-white rounded-[22px] p-4 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'Todo o Histórico' },
              { id: 'today', label: 'Hoje' },
              { id: 'yesterday', label: 'Ontem' },
              { id: 'last7', label: 'Últimos 7 dias' },
              { id: 'day', label: 'Dia Específico' },
            ] as { id: LogDatePreset; label: string }[]
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDatePreset(preset.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                datePreset === preset.id
                  ? 'bg-[#1C1C1E] text-white'
                  : 'bg-[#F2F1EE] text-[#444440] hover:bg-[#E7E5DF]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {datePreset === 'day' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={specificDay}
              max={formatLocalIsoDate()}
              onChange={(e) => setSpecificDay(e.target.value || formatLocalIsoDate())}
              className="border border-black/15 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>
        )}
      </div>

      {/* Who Bought (Quem Comprou) + Full Activity Log (Registo Completo) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Quem Comprou */}
        <section className="lg:col-span-6 bg-white rounded-[24px] p-5 sm:p-6 border border-black/5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <h2 className="text-base font-semibold text-[#1C1C1E]">
                Quem Comprou ({filteredBuyers.length})
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold tabular-nums text-[#1C1C1E]">
              {formatMoney(buyersRevenueTotal, settings.currencySymbol)}
            </span>
          </div>

          {filteredBuyers.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#8A8A85]">
              Sem compras registadas para este filtro.
            </div>
          ) : (
            <div className="divide-y divide-black/6 max-h-[420px] overflow-y-auto pr-1">
              {filteredBuyers.map((order) => {
                const units = order.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <div
                    key={order.id}
                    className="py-3 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#1C1C1E]">{order.customerName}</span>
                        <span className="font-mono text-[11px] text-[#666662]">#{order.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            order.status === 'Entregue'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-[#F2F1EE] text-[#444440]'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#666662] truncate">
                        {order.customerEmail} · {order.customerPhone} · {order.city}
                      </p>
                      <p className="text-[11px] text-[#444440] truncate">
                        {units} artigo(s): {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      <p className="text-[10px] text-[#8A8A85] font-mono tabular-nums">
                        {order.createdAt} · {order.paymentMethod}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-mono font-semibold tabular-nums text-[#1C1C1E] whitespace-nowrap">
                        {formatMoney(order.total, settings.currencySymbol)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setInvoiceOrderId(order.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F1EE] hover:bg-[#1C1C1E] hover:text-white text-[10px] font-medium text-[#1C1C1E] transition-colors cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Fatura</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Registo Completo */}
        <section className="lg:col-span-6 bg-white rounded-[24px] p-5 sm:p-6 border border-black/5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1C1C1E]" />
              <div>
                <h2 className="text-base font-semibold text-[#1C1C1E]">
                  Registo Completo ({filteredEvents.length})
                </h2>
                <p className="text-[10px] text-emerald-700 font-medium">
                  Arquivo permanente guardado · Nunca apagado
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'comprou', label: 'Compras' },
                  { id: 'checkout', label: 'Check-out' },
                  { id: 'saco', label: 'Saco' },
                  { id: 'produto', label: 'Produtos' },
                  { id: 'loja', label: 'Loja' },
                  { id: 'saida', label: 'Saídas' },
                ] as { id: EventFilterType; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEventFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    eventFilter === tab.id
                      ? 'bg-[#1C1C1E] text-white'
                      : 'bg-[#F2F1EE] text-[#555552] hover:bg-[#E7E5DF]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <ShoppingBag className="w-6 h-6 text-[#8A8A85] mx-auto" />
              <p className="text-xs text-[#8A8A85]">
                Ainda não existem eventos neste filtro. As ações dos visitantes na loja ficam guardadas aqui em tempo real.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/6 max-h-[420px] overflow-y-auto pr-1">
              {filteredEvents.map((ev) => {
                const badge = stageBadge(ev.eventType);
                return (
                  <div
                    key={ev.id}
                    className="py-2.5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                        <span className="font-semibold text-[#1C1C1E] truncate">
                          {ev.customerName || ev.visitorLabel}
                        </span>
                        {ev.city && (
                          <span className="text-[11px] text-[#72726E]">· {ev.city}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#444440] truncate">
                        {ev.details || ev.productName || 'Atividade na loja'}
                      </p>
                      <p className="text-[10px] text-[#8A8A85] font-mono tabular-nums">
                        {formatTimeClock(ev.createdAt)}
                        {ev.device ? ` · ${ev.device}` : ''}
                      </p>
                    </div>

                    {ev.cartTotal > 0 && (
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-[#1C1C1E] whitespace-nowrap shrink-0">
                        {formatMoney(ev.cartTotal, settings.currencySymbol)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <OrderInvoiceModal
        order={invoiceOrder}
        onClose={() => setInvoiceOrderId(null)}
        onChangeStatus={(orderId: string, nextStatus: OrderStatus) =>
          updateOrderStatus(orderId, nextStatus)
        }
      />
    </div>
  );
};
