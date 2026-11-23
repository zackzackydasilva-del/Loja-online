import { Product, StoreOrder } from '../types/store';

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

const WEEKDAY_META: { day: string; fullDay: string }[] = [
  { day: 'S', fullDay: 'Segunda' },
  { day: 'T', fullDay: 'Terça' },
  { day: 'Q', fullDay: 'Quarta' },
  { day: 'Q', fullDay: 'Quinta' },
  { day: 'S', fullDay: 'Sexta' },
  { day: 'S', fullDay: 'Sábado' },
  { day: 'D', fullDay: 'Domingo' },
];

function formatLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
