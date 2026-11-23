import React, { useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatMoney } from '../../utils/currency';
import { computeCurrentWeekStats } from '../../utils/weeklyAnalytics';
import { FinancialSummaryPanel } from './FinancialSummaryPanel';

export const AdminAnalytics: React.FC = () => {
  const { orders, products, costs, settings } = useStore();
  const weeklyStats = useMemo(() => computeCurrentWeekStats(orders, products), [orders, products]);
  const weeklyOrderCount = weeklyStats.reduce((s, d) => s + d.orderCount, 0);
  const weeklyRevenueTotal = weeklyStats.reduce((s, d) => s + d.dailyRevenue, 0);

  const paidOrders = orders.filter((o) => o.status === 'Entregue');
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
  const netRevenue = totalRevenue - totalCosts;
  const averageTicket = paidOrders.length ? totalRevenue / paidOrders.length : 0;
  const inventoryValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const totalUnitsInStock = products.reduce((s, p) => s + p.stock, 0);

  const categoryTotals = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.price * Math.max(1, p.stock);
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryTotals);
  const maxCatVal = Math.max(...Object.values(categoryTotals), 1);

  return (
    <div className="space-y-5">
      {/* 4 Overview KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C1C1E] text-white rounded-[22px] p-5">
          <p className="text-xs text-white/65 mb-2">Faturamento Líquido</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums whitespace-nowrap">
            {formatMoney(netRevenue, settings.currencySymbol)}
          </p>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-black/5">
          <p className="text-xs text-[#72726E] mb-2">Ticket Médio por Venda</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#1C1C1E] whitespace-nowrap">
            {formatMoney(averageTicket, settings.currencySymbol)}
          </p>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-black/5">
          <p className="text-xs text-[#72726E] mb-2">Valor em Inventário</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#1C1C1E] whitespace-nowrap">
            {formatMoney(inventoryValue, settings.currencySymbol)}
          </p>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-black/5">
          <p className="text-xs text-[#72726E] mb-2">Unidades em Stock</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#1C1C1E]">
            {totalUnitsInStock}
          </p>
        </div>
      </div>

      {/* Per-Sale Revenue, Gross Revenue, Cost Registration & Net Revenue */}
      <FinancialSummaryPanel />

      {/* Category Breakdown & Weekly Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
          <h3 className="text-base font-semibold text-[#1C1C1E]">Peso por Categoria (Inventário)</h3>
          {categoryEntries.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs text-[#8A8A85]">
                Sem produtos registados para análise por categoria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryEntries.map(([cat, val]) => (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs gap-2">
                    <span className="font-medium text-[#1C1C1E]">{cat}</span>
                    <span className="font-mono tabular-nums text-[#555552] whitespace-nowrap">
                      {formatMoney(val, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="h-2 bg-[#EFECE5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1C1C1E] rounded-full"
                      style={{ width: `${(val / maxCatVal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-black/5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[#1C1C1E]">Faturação Diária da Semana</h3>
            <span className="text-[11px] text-[#72726E] tabular-nums">
              Seg – Dom · {weeklyOrderCount} encomenda(s)
            </span>
          </div>
          <div className="space-y-2.5">
            {weeklyStats.map((day) => (
              <div
                key={day.dateIso}
                className="flex items-center justify-between py-2 border-b border-black/5 last:border-b-0 text-xs gap-3"
              >
                <div className="w-32 shrink-0">
                  <span className="font-medium text-[#1C1C1E]">{day.fullDay}</span>
                  <span className="ml-1.5 text-[11px] text-[#8A8A85] font-mono tabular-nums">
                    {day.shortDate}
                  </span>
                </div>
                <span className="text-[#555552] font-mono tabular-nums">
                  {day.orderCount} enc.
                </span>
                <span className="text-[#72726E] font-mono tabular-nums">
                  {day.deltaPercent > 0 ? `+${day.deltaPercent}%` : `${day.deltaPercent}%`}
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#1C1C1E] whitespace-nowrap">
                  {formatMoney(day.dailyRevenue, settings.currencySymbol)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-black/8 flex items-center justify-between text-xs font-semibold text-[#1C1C1E]">
            <span>Total da Semana ({weeklyOrderCount} encomendas)</span>
            <span className="font-mono tabular-nums whitespace-nowrap">
              {formatMoney(weeklyRevenueTotal, settings.currencySymbol)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
