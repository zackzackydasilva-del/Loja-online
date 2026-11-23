import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatMoney } from '../../utils/currency';
import {
  computeCurrentWeekStats,
  filterCostsByDateFilter,
  filterOrdersByDateFilter,
  formatLocalIsoDate,
  parseLocalIsoDate,
  resolvePeriodBounds,
  shiftIsoDate,
  StatsDateFilter,
  StatsPeriodPreset,
} from '../../utils/weeklyAnalytics';
import { FinancialSummaryPanel } from './FinancialSummaryPanel';

export const AdminAnalytics: React.FC = () => {
  const { orders, products, costs, settings } = useStore();
  const todayIso = useMemo(() => formatLocalIsoDate(), []);

  const [preset, setPreset] = useState<StatsPeriodPreset>('all');
  const [specificDate, setSpecificDate] = useState<string>(todayIso);
  const [startDate, setStartDate] = useState<string>(() => shiftIsoDate(todayIso, -6));
  const [endDate, setEndDate] = useState<string>(todayIso);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const dateFilter: StatsDateFilter = useMemo(
    () => ({
      preset,
      specificDate,
      startDate,
      endDate,
    }),
    [preset, specificDate, startDate, endDate]
  );

  const periodBounds = useMemo(() => resolvePeriodBounds(dateFilter), [dateFilter]);

  const filteredOrders = useMemo(
    () => filterOrdersByDateFilter(orders, dateFilter),
    [orders, dateFilter]
  );

  const filteredCosts = useMemo(
    () => filterCostsByDateFilter(costs, dateFilter),
    [costs, dateFilter]
  );

  const weekReferenceDate = useMemo(() => {
    const base =
      preset === 'day' || preset === 'yesterday'
        ? parseLocalIsoDate(preset === 'yesterday' ? shiftIsoDate(todayIso, -1) : specificDate)
        : new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [preset, specificDate, todayIso, weekOffset]);

  const weeklyStats = useMemo(
    () => computeCurrentWeekStats(orders, products, weekReferenceDate),
    [orders, products, weekReferenceDate]
  );
  const weeklyOrderCount = weeklyStats.reduce((s, d) => s + d.orderCount, 0);
  const weeklyRevenueTotal = weeklyStats.reduce((s, d) => s + d.dailyRevenue, 0);
  const weekRangeLabel =
    weeklyStats.length >= 7
      ? `${weeklyStats[0].shortDate} – ${weeklyStats[6].shortDate}`
      : 'Seg – Dom';

  const paidOrders = filteredOrders.filter((o) => o.status === 'Entregue');
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const totalCosts = filteredCosts.reduce((s, c) => s + c.amount, 0);
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

  const handleSelectPreset = (next: StatsPeriodPreset) => {
    setPreset(next);
    setWeekOffset(0);
  };

  return (
    <div className="space-y-5">
      {/* Previous Days & Period Filter Bar */}
      <section className="bg-white rounded-[22px] p-4 sm:p-5 border border-black/5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1C1C1E]" />
            <h2 className="text-sm font-semibold text-[#1C1C1E]">
              Filtrar por Dia ou Período
            </h2>
            <span className="text-xs text-[#72726E] font-mono">({periodBounds.label})</span>
          </div>

          {preset !== 'all' && (
            <button
              type="button"
              onClick={() => handleSelectPreset('all')}
              className="text-xs font-medium text-[#555552] hover:text-[#1C1C1E] underline cursor-pointer"
            >
              Limpar filtro
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'Todo o Histórico' },
              { id: 'today', label: 'Hoje' },
              { id: 'yesterday', label: 'Ontem' },
              { id: 'last7', label: 'Últimos 7 dias' },
              { id: 'last30', label: 'Últimos 30 dias' },
              { id: 'day', label: 'Dia Específico' },
              { id: 'custom', label: 'Intervalo Personalizado' },
            ] as { id: StatsPeriodPreset; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectPreset(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                preset === item.id
                  ? 'bg-[#1C1C1E] text-white'
                  : 'bg-[#F2F1EE] text-[#444440] hover:bg-[#E7E5DF]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {preset === 'day' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setSpecificDate((d) => shiftIsoDate(d, -1));
                setWeekOffset(0);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/15 text-xs font-medium text-[#1C1C1E] hover:bg-[#F5F5F3] cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Dia Anterior</span>
            </button>

            <input
              type="date"
              value={specificDate}
              max={todayIso}
              onChange={(e) => {
                setSpecificDate(e.target.value || todayIso);
                setWeekOffset(0);
              }}
              aria-label="Selecionar dia específico"
              className="border border-black/15 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#1C1C1E]"
            />

            <button
              type="button"
              disabled={specificDate >= todayIso}
              onClick={() => {
                setSpecificDate((d) => {
                  const next = shiftIsoDate(d, 1);
                  return next > todayIso ? todayIso : next;
                });
                setWeekOffset(0);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/15 text-xs font-medium text-[#1C1C1E] hover:bg-[#F5F5F3] disabled:opacity-40 cursor-pointer"
            >
              <span>Dia Seguinte</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <label className="flex items-center gap-2">
              <span className="text-[#555552] font-medium">De:</span>
              <input
                type="date"
                value={startDate}
                max={todayIso}
                onChange={(e) => setStartDate(e.target.value || todayIso)}
                className="border border-black/15 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#1C1C1E]"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[#555552] font-medium">Até:</span>
              <input
                type="date"
                value={endDate}
                max={todayIso}
                onChange={(e) => setEndDate(e.target.value || todayIso)}
                className="border border-black/15 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#1C1C1E]"
              />
            </label>
          </div>
        )}
      </section>

      {/* 4 Overview KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C1C1E] text-white rounded-[22px] p-5">
          <p className="text-xs text-white/65 mb-2">Faturamento Líquido</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums whitespace-nowrap">
            {formatMoney(netRevenue, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-white/55 mt-1 truncate">{periodBounds.label}</p>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-black/5">
          <p className="text-xs text-[#72726E] mb-2">Ticket Médio por Venda</p>
          <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#1C1C1E] whitespace-nowrap">
            {formatMoney(averageTicket, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-[#72726E] mt-1 tabular-nums">
            {filteredOrders.length} encomenda(s) · {paidOrders.length} paga(s)
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
      <FinancialSummaryPanel
        filteredOrders={filteredOrders}
        filteredCosts={filteredCosts}
        periodLabel={periodBounds.label}
      />

      {/* Category Breakdown & Weekly Comparison (Browse Previous Weeks too) */}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#1C1C1E]">
                Faturação Diária da Semana
              </h3>
              <span className="text-[11px] text-[#72726E] tabular-nums">
                {weekRangeLabel} · {weeklyOrderCount} encomenda(s)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w - 1)}
                aria-label="Semana anterior"
                className="w-7 h-7 rounded-full border border-black/15 flex items-center justify-center text-[#1C1C1E] hover:bg-[#F5F5F3] cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-2.5 py-1 rounded-full bg-[#F2F1EE] hover:bg-[#E7E5DF] text-[11px] font-medium text-[#1C1C1E] cursor-pointer"
              >
                Semana Atual
              </button>
              <button
                type="button"
                disabled={weekOffset >= 0 && preset !== 'day' && preset !== 'yesterday'}
                onClick={() => setWeekOffset((w) => w + 1)}
                aria-label="Semana seguinte"
                className="w-7 h-7 rounded-full border border-black/15 flex items-center justify-center text-[#1C1C1E] hover:bg-[#F5F5F3] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
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
