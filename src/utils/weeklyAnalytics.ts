import { Product, StoreCost, StoreOrder } from '../types/store';

export interface WeeklyDayStats {
  dayIndex: number; // 0 = Segunda ... 6 = Domingo
  day: string; // 'S', 'T', 'Q', 'Q', 'S', 'S', 'D'
  fullDay: string; // 'Segunda' ... 'Domingo'
  dateIso: string; // 'YYYY-MM-DD'
  shortDate: string; // 'DD/MM'
  orderCount: number;
  deliveredCount: number;
  pendingCount: number;
  dailyRevenue: number; // Paid ('Entregue') revenue for this day
  pendingValue: number; // Non-delivered order value for this day
  apparel: number;
  accessories: number;
  deltaPercent: number;
}

export type StatsPeriodPreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'day'
  | 'custom';

export interface StatsDateFilter {
  preset: StatsPeriodPreset;
  specificDate?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

const WEEKDAY_META: { day: string; fullDay: string }[] = [
  { day: 'S', fullDay: 'Segunda' },
  { day: 'T', fullDay: 'Terça' },
  { day: 'Q', fullDay: 'Quarta' },
  { day: 'Q', fullDay: 'Quinta' },
  { day: 'S', fullDay: 'Sexta' },
  { day: 'S', fullDay: 'Sábado' },
  { day: 'D', fullDay: 'Domingo' },
];

export function formatLocalIsoDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalIsoDate(iso: string): Date {
  const clean = String(iso || '').trim().slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

export function shiftIsoDate(iso: string, deltaDays: number): string {
  const dt = parseLocalIsoDate(iso);
  dt.setDate(dt.getDate() + deltaDays);
  return formatLocalIsoDate(dt);
}

export function resolvePeriodBounds(
  filter: StatsDateFilter,
  now = new Date()
): { startIso: string | null; endIso: string | null; label: string } {
  const todayIso = formatLocalIsoDate(now);
  switch (filter.preset) {
    case 'today':
      return { startIso: todayIso, endIso: todayIso, label: `Hoje (${todayIso})` };
    case 'yesterday': {
      const y = shiftIsoDate(todayIso, -1);
      return { startIso: y, endIso: y, label: `Ontem (${y})` };
    }
    case 'last7': {
      const start = shiftIsoDate(todayIso, -6);
      return { startIso: start, endIso: todayIso, label: `Últimos 7 dias (${start} a ${todayIso})` };
    }
    case 'last30': {
      const start = shiftIsoDate(todayIso, -29);
      return { startIso: start, endIso: todayIso, label: `Últimos 30 dias (${start} a ${todayIso})` };
    }
    case 'day': {
      const target = (filter.specificDate || todayIso).slice(0, 10);
      return { startIso: target, endIso: target, label: `Dia ${target}` };
    }
    case 'custom': {
      const s = filter.startDate ? filter.startDate.slice(0, 10) : null;
      const e = filter.endDate ? filter.endDate.slice(0, 10) : null;
      const startIso = s && e && s > e ? e : s;
      const endIso = s && e && s > e ? s : e;
      return {
        startIso,
        endIso,
        label:
          startIso && endIso
            ? `${startIso} a ${endIso}`
            : startIso
            ? `Desde ${startIso}`
            : endIso
            ? `Até ${endIso}`
            : 'Período personalizado',
      };
    }
    case 'all':
    default:
      return { startIso: null, endIso: null, label: 'Todo o histórico' };
  }
}

export function isIsoDateWithinBounds(
  dateStr: string,
  startIso: string | null,
  endIso: string | null
): boolean {
  const clean = String(dateStr || '').trim().slice(0, 10);
  if (!clean) return !startIso && !endIso;
  if (startIso && clean < startIso) return false;
  if (endIso && clean > endIso) return false;
  return true;
}

export function filterOrdersByDateFilter(
  orders: StoreOrder[],
  filter: StatsDateFilter,
  now = new Date()
): StoreOrder[] {
  const { startIso, endIso } = resolvePeriodBounds(filter, now);
  if (!startIso && !endIso) return orders;
  return orders.filter((o) => isIsoDateWithinBounds(o.createdAt, startIso, endIso));
}

export function filterCostsByDateFilter(
  costs: StoreCost[],
  filter: StatsDateFilter,
  now = new Date()
): StoreCost[] {
  const { startIso, endIso } = resolvePeriodBounds(filter, now);
  if (!startIso && !endIso) return costs;
  return costs.filter((c) => isIsoDateWithinBounds(c.date, startIso, endIso));
}

export function getTodayWeekdayIndex(referenceDate = new Date()): number {
  return (referenceDate.getDay() + 6) % 7; // 0 = Monday ... 6 = Sunday
}

export function computeCurrentWeekStats(
  orders: StoreOrder[],
  products: Product[],
  referenceDate = new Date()
): WeeklyDayStats[] {
  const todayIdx = getTodayWeekdayIndex(referenceDate);
  const monday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - todayIdx
  );

  const productCatMap = new Map(products.map((p) => [p.id, p.category]));

  const days: WeeklyDayStats[] = WEEKDAY_META.map((meta, idx) => {
    const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    const dateIso = formatLocalIsoDate(dt);
    const shortDate = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    return {
      dayIndex: idx,
      day: meta.day,
      fullDay: meta.fullDay,
      dateIso,
      shortDate,
      orderCount: 0,
      deliveredCount: 0,
      pendingCount: 0,
      dailyRevenue: 0,
      pendingValue: 0,
      apparel: 0,
      accessories: 0,
      deltaPercent: 0,
    };
  });

  const dayByIso = new Map(days.map((d) => [d.dateIso, d]));

  for (const order of orders) {
    const rawDate = String(order.createdAt || '').trim().slice(0, 10);
    const bucket = dayByIso.get(rawDate);
    if (!bucket) continue;

    bucket.orderCount += 1;

    if (order.status === 'Entregue') {
      bucket.deliveredCount += 1;
      bucket.dailyRevenue += Number(order.total) || 0;

      let orderAccessories = 0;
      let orderApparel = 0;
      for (const item of order.items) {
        const cat = item.productId ? productCatMap.get(item.productId) : undefined;
        const lineTotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
        if (cat === 'Malas' || cat === 'Acessórios') {
          orderAccessories += lineTotal;
        } else {
          orderApparel += lineTotal;
        }
      }

      const itemsSum = orderApparel + orderAccessories;
      if (itemsSum > 0) {
        const ratio = (Number(order.total) || 0) / itemsSum;
        bucket.apparel += orderApparel * ratio;
        bucket.accessories += orderAccessories * ratio;
      } else {
        bucket.apparel += Number(order.total) || 0;
      }
    } else {
      bucket.pendingCount += 1;
      bucket.pendingValue += Number(order.total) || 0;
    }
  }

  for (let i = 0; i < days.length; i++) {
    days[i].dailyRevenue = +days[i].dailyRevenue.toFixed(2);
    days[i].pendingValue = +days[i].pendingValue.toFixed(2);
    days[i].apparel = +days[i].apparel.toFixed(2);
    days[i].accessories = +days[i].accessories.toFixed(2);

    const prevRev = i > 0 ? days[i - 1].dailyRevenue : 0;
    const currRev = days[i].dailyRevenue;
    if (prevRev > 0) {
      days[i].deltaPercent = Math.round(((currRev - prevRev) / prevRev) * 100);
    } else if (currRev > 0) {
      days[i].deltaPercent = 100;
    } else {
      days[i].deltaPercent = 0;
    }
  }

  return days;
}
