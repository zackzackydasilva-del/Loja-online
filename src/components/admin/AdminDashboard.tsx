import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Bell,
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  MoreHorizontal,
  Package,
  Pin,
  Plus,
  Share2,
  ShoppingBag,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { StoreTask } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { AdminTab } from './AdminLayout';
import { FinancialSummaryPanel } from './FinancialSummaryPanel';

interface AdminDashboardProps {
  onNavigateTab: (tab: AdminTab) => void;
  onNewOrder?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab, onNewOrder }) => {
  const {
    products,
    orders,
    goals,
    tasks,
    campaigns,
    weeklySales,
    settings,
    toggleGoal,
    addGoal,
    addTask,
    updateTask,
    deleteTask,
  } = useStore();

  const [selectedDayIdx, setSelectedDayIdx] = useState(5);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<StoreTask['category']>('pedido');
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [campaignLayout, setCampaignLayout] = useState<'grid' | 'list'>('grid');
  const [campaignSort, setCampaignSort] = useState<'recent' | 'progress'>('recent');
  const [shareCopied, setShareCopied] = useState(false);

  const paidOrders = useMemo(
    () => orders.filter((o) => o.status === 'Entregue'),
    [orders]
  );
  const deliveredCount = paidOrders.length;
  const pendingCount = orders.filter((o) => o.status !== 'Entregue').length;
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);

  const monthlyTarget = Math.max(500000, settings.freeShippingThreshold * 10);
  const monthlyProgressPercent =
    totalRevenue > 0 ? Math.min(140, Math.round((totalRevenue / monthlyTarget) * 100)) : 0;

  const productCategoryById = useMemo(
    () => new Map(products.map((p) => [p.id, p.category])),
    [products]
  );

  const { apparelRatio, footwearRatio, accessoriesRatio } = useMemo(() => {
    if (paidOrders.length === 0 || totalRevenue <= 0) {
      return { apparelRatio: 0, footwearRatio: 0, accessoriesRatio: 0 };
    }
    let apparel = 0;
    let footwear = 0;
    let accessories = 0;
    paidOrders.forEach((order) => {
      order.items.forEach((item) => {
        const cat = productCategoryById.get(item.productId);
        const line = item.unitPrice * item.quantity;
        if (cat === 'Calçado') footwear += line;
        else if (cat === 'Malas' || cat === 'Acessórios') accessories += line;
        else apparel += line;
      });
    });
    return {
      apparelRatio: Math.min(1, apparel / monthlyTarget),
      footwearRatio: Math.min(1, footwear / monthlyTarget),
      accessoriesRatio: Math.min(1, accessories / monthlyTarget),
    };
  }, [paidOrders, productCategoryById, totalRevenue, monthlyTarget]);

  const completedGoals = goals.filter((g) => g.completed).length;

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [tasks]);

  const sortedCampaigns = useMemo(() => {
    if (campaignSort === 'progress') {
      return [...campaigns].sort(
        (a, b) => b.completedSteps / b.totalSteps - a.completedSteps / a.totalSteps
      );
    }
    return campaigns;
  }, [campaigns, campaignSort]);

  const safeWeekly = weeklySales.length
    ? weeklySales
    : [{ day: 'S', fullDay: 'Segunda', apparel: 0, accessories: 0, deltaPercent: 0 }];

  const maxSales = Math.max(
    ...safeWeekly.map((d) => Math.max(d.apparel, d.accessories)),
    1000
  );
  const chartW = 280;
  const chartH = 110;
  const xStep = safeWeekly.length > 1 ? chartW / (safeWeekly.length - 1) : chartW;

  const buildSmoothPath = (values: number[]) => {
    const pts = values.map((v, idx) => ({
      x: idx * xStep,
      y: chartH - (v / maxSales) * (chartH - 18) - 8,
    }));
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const apparelPath = buildSmoothPath(safeWeekly.map((d) => d.apparel));
  const accessoriesPath = buildSmoothPath(safeWeekly.map((d) => d.accessories));
  const safeDayIdx = Math.min(selectedDayIdx, safeWeekly.length - 1);
  const selectedDay = safeWeekly[safeDayIdx] || safeWeekly[0];
  const selectedX = safeDayIdx * xStep;
  const selectedY = chartH - (selectedDay.apparel / maxSales) * (chartH - 18) - 8;

  const handleDownloadCsv = () => {
    const header = `ID Encomenda,Cliente,Cidade,Pagamento,Estado,Data,Total ${settings.currencySymbol}\n`;
    const rows = orders
      .map(
        (o) =>
          `${o.id},"${o.customerName}","${o.city}",${o.paymentMethod},${o.status},${o.createdAt},${o.total.toFixed(2)}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (settings.storeName || 'loja').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${slug}-relatorio-vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareSummary = () => {
    const summary = `${settings.storeName} · ${orders.length} encomendas · Receita ${formatMoney(
      totalRevenue,
      settings.currencySymbol
    )}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary).catch(() => {});
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2400);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    addGoal(newGoalTitle);
    setNewGoalTitle('');
    setNewGoalOpen(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask(newTaskTitle, 'Hoje', newTaskCategory);
    setNewTaskTitle('');
    setNewTaskOpen(false);
  };

  const taskIcon = (category: StoreTask['category']) => {
    if (category === 'pedido') return <ShoppingBag className="w-4 h-4 text-[#1C1C1E]" />;
    if (category === 'stock') return <Package className="w-4 h-4 text-[#1C1C1E]" />;
    return <Tag className="w-4 h-4 text-[#1C1C1E]" />;
  };

  return (
    <div className="space-y-6">
      {/* Row 1: 3 Primary Bento Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Dark Charcoal General Info */}
        <section className="lg:col-span-4 bg-[#1C1C1E] text-white rounded-[24px] p-6 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Informação Geral</h2>
            <button
              type="button"
              onClick={handleShareSummary}
              title="Copiar resumo"
              className="text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">
                {orders.length}
              </span>
              <span className="text-[11px] leading-tight text-white/65">
                Encomendas<br />registadas
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">
                {pendingCount}
              </span>
              <span className="text-[11px] leading-tight text-white/65">
                Pendentes<br />por pagar
              </span>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateTab('products')}
              className="bg-[#28282B] hover:bg-[#323236] transition-colors rounded-2xl p-3 text-center cursor-pointer"
            >
              <p className="text-xl font-semibold tabular-nums mb-0.5">{products.length}</p>
              <p className="text-[11px] text-white/70">Produtos</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="bg-[#28282B] hover:bg-[#323236] transition-colors rounded-2xl p-3 text-center cursor-pointer"
            >
              <p className="text-xl font-semibold tabular-nums mb-0.5">{pendingCount}</p>
              <p className="text-[11px] text-white/70">Pendentes</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="bg-[#28282B] hover:bg-[#323236] transition-colors rounded-2xl p-3 text-center cursor-pointer"
            >
              <p className="text-xl font-semibold tabular-nums mb-0.5">{deliveredCount}</p>
              <p className="text-[11px] text-white/70">Entregues</p>
            </button>
          </div>
        </section>

        {/* Card 2: Weekly Sales Progress Spline Chart */}
        <section className="lg:col-span-4 bg-[#F6F6F4] rounded-[24px] p-6 border border-black/5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-[#1C1C1E]">Vendas Semanais</h2>
              <TrendingUp className="w-4 h-4 text-[#1C1C1E]" />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#555552]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#1C1C1E] inline-block" />
                Vestuário
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#9D9C97] inline-block" />
                Acessórios
              </span>
              <span className="ml-auto font-mono tabular-nums font-semibold text-[#1C1C1E] whitespace-nowrap shrink-0">
                {formatMoney(selectedDay.apparel, settings.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Interactive SVG Dual Spline */}
          <div className="relative pt-5">
            <svg viewBox={`-6 -10 ${chartW + 12} ${chartH + 20}`} className="w-full h-32 overflow-visible">
              <line
                x1={selectedX}
                y1={selectedY}
                x2={selectedX}
                y2={chartH}
                stroke="#1C1C1E"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.3"
              />
              <path
                d={accessoriesPath}
                fill="none"
                stroke="#B3B1AA"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d={apparelPath}
                fill="none"
                stroke="#1C1C1E"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <g transform={`translate(${selectedX}, ${selectedY})`}>
                <circle r="4.5" fill="#1C1C1E" stroke="#F6F6F4" strokeWidth="2" />
                <g transform="translate(-22, -28)">
                  <rect width="44" height="20" rx="6" fill="#1C1C1E" />
                  <text
                    x="22"
                    y="13.5"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {selectedDay.deltaPercent > 0 ? `+${selectedDay.deltaPercent}%` : `${selectedDay.deltaPercent}%`}
                  </text>
                </g>
              </g>
            </svg>

            <div className="grid grid-cols-7 gap-1 pt-1">
              {safeWeekly.map((point, idx) => {
                const active = idx === safeDayIdx;
                return (
                  <button
                    key={point.fullDay}
                    type="button"
                    onClick={() => setSelectedDayIdx(idx)}
                    title={`${point.fullDay}: ${formatMoney(point.apparel, settings.currencySymbol)}`}
                    className={`h-7 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1C1C1E] text-white'
                        : 'text-[#6A6A66] hover:bg-black/5 hover:text-[#1C1C1E]'
                    }`}
                  >
                    {point.day}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Card 3: Monthly Target Concentric Rings + Export CSV */}
        <section className="lg:col-span-4 bg-white rounded-[24px] p-6 border border-black/5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#1C1C1E]">Meta Mensal</h2>
              <p className="text-[11px] text-[#6A6A66] mt-0.5 tabular-nums">
                {paidOrders.length === 0 ? (
                  'Sem vendas pagas (Entregues) neste período'
                ) : (
                  <>
                    <span className="font-semibold text-[#1C1C1E]">
                      {formatMoney(totalRevenue, settings.currencySymbol)}
                    </span>{' '}
                    de {formatMoney(monthlyTarget, settings.currencySymbol)}
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('analytics')}
              className="text-xs font-medium text-[#555552] hover:text-[#1C1C1E] cursor-pointer shrink-0"
            >
              Detalhes
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2.5 text-xs text-[#3B3B39]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1C1C1E]" />
                <span>Vestuário</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7A7A75]" />
                <span>Calçado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C6C5BF]" />
                <span>Acessórios</span>
              </div>
            </div>

            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#EAEAE6" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#1C1C1E"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={
                    2 * Math.PI * 42 * (1 - Math.min(1, apparelRatio || monthlyProgressPercent / 100))
                  }
                />
                <circle cx="50" cy="50" r="32" fill="none" stroke="#EAEAE6" strokeWidth="5.5" />
                <circle
                  cx="50"
                  cy="50"
                  r="32"
                  fill="none"
                  stroke="#7A7A75"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={2 * Math.PI * 32 * (1 - footwearRatio)}
                />
                <circle cx="50" cy="50" r="22" fill="none" stroke="#EAEAE6" strokeWidth="5" />
                <circle
                  cx="50"
                  cy="50"
                  r="22"
                  fill="none"
                  stroke="#B5B4AE"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 * (1 - accessoriesRatio)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-semibold text-[#1C1C1E] tabular-nums">
                  {monthlyProgressPercent}%
                </span>
                <span className="text-[9px] text-[#72726E]">objetivo</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleShareSummary}
              aria-label="Partilhar relatório"
              className="w-10 h-10 rounded-full bg-[#1C1C1E] text-white flex items-center justify-center hover:bg-[#323235] transition-colors shrink-0 cursor-pointer"
            >
              {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex-1 h-10 rounded-full border border-black/15 text-xs font-medium text-[#1C1C1E] hover:bg-[#F5F5F3] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Descarregar Relatório</span>
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* Row 1.5: Faturamento Bruto, por Venda, Custos & Líquido */}
      <FinancialSummaryPanel compact />

      {/* Row 2: Monthly Goals + Tasks in Process */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Month Goals */}
        <section className="lg:col-span-4 bg-white rounded-[24px] p-6 border border-black/5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1C1C1E]">Objetivos do Mês</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tabular-nums text-[#555552] bg-[#F2F1EE] px-2 py-1 rounded-full">
                {completedGoals}/{goals.length}
              </span>
              <button
                type="button"
                onClick={() => setNewGoalOpen((v) => !v)}
                aria-label="Adicionar objetivo"
                className="w-7 h-7 rounded-full border border-black/12 flex items-center justify-center text-[#1C1C1E] hover:bg-[#F2F1EE] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {newGoalOpen && (
            <form onSubmit={handleCreateGoal} className="flex gap-2">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Novo objetivo da loja..."
                className="flex-1 text-xs border border-black/15 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1C1C1E]"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#1C1C1E] text-white text-xs font-medium rounded-xl cursor-pointer"
              >
                Guardar
              </button>
            </form>
          )}

          {goals.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-6 text-center">
              <p className="text-xs text-[#8A8A85]">
                Sem objetivos registados. Clique em + para criar um objetivo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => toggleGoal(goal.id)}
                  className="w-full flex items-center gap-3 text-left group cursor-pointer"
                >
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                      goal.completed
                        ? 'bg-[#1C1C1E] border-[#1C1C1E] text-white'
                        : 'border-black/25 bg-white group-hover:border-[#1C1C1E]'
                    }`}
                  >
                    {goal.completed && <Check className="w-3 h-3" strokeWidth={2.5} />}
                  </span>
                  <span
                    className={`text-[13px] transition-colors ${
                      goal.completed ? 'text-[#1C1C1E] font-medium' : 'text-[#6A6A66]'
                    }`}
                  >
                    {goal.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Tasks in Process */}
        <section className="lg:col-span-8 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between px-1 gap-2">
            <h2 className="text-base font-semibold text-[#1C1C1E]">
              Tarefas em Curso <span className="tabular-nums">({sortedTasks.length})</span>
            </h2>
            <div className="flex items-center gap-3">
              {onNewOrder && (
                <button
                  type="button"
                  onClick={onNewOrder}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1C1C1E] text-white text-[11px] font-medium hover:bg-[#323235] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nova Encomenda</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-medium text-[#555552] hover:text-[#1C1C1E] cursor-pointer"
              >
                Ver encomendas &gt;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            {sortedTasks.slice(0, 2).map((task) => (
              <div
                key={task.id}
                className="relative bg-white rounded-[22px] p-5 border border-black/5 flex flex-col justify-between gap-4 shadow-[0_6px_20px_-10px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-[#F2F1EE] flex items-center justify-center">
                      {taskIcon(task.category)}
                    </span>
                    {task.pinned && <Pin className="w-3.5 h-3.5 text-[#1C1C1E]" />}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id)
                      }
                      aria-label="Opções da tarefa"
                      className="p-1.5 rounded-lg hover:bg-black/5 text-[#555552] cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {openMenuTaskId === task.id && (
                      <div className="absolute right-0 top-8 z-20 w-40 bg-[#1C1C1E] text-white rounded-2xl p-1.5 shadow-xl text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            updateTask(task.id, { pinned: !task.pinned });
                            setOpenMenuTaskId(null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer"
                        >
                          <span>{task.pinned ? 'Desafixar' : 'Fixar tarefa'}</span>
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setEditingTaskText(task.title);
                            setOpenMenuTaskId(null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer"
                        >
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteTask(task.id);
                            setOpenMenuTaskId(null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-red-300 cursor-pointer"
                        >
                          <span>Eliminar</span>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {editingTaskId === task.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateTask(task.id, { title: editingTaskText });
                      setEditingTaskId(null);
                    }}
                    className="space-y-2"
                  >
                    <input
                      type="text"
                      value={editingTaskText}
                      onChange={(e) => setEditingTaskText(e.target.value)}
                      className="w-full text-xs border border-black/15 rounded-lg px-2.5 py-1.5 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="text-[11px] font-medium bg-[#1C1C1E] text-white px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      Guardar
                    </button>
                  </form>
                ) : (
                  <p className="text-[14px] font-medium text-[#1C1C1E] leading-snug">
                    {task.title}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-[#8A8A85]">{task.dueDate}</span>
                  <button
                    type="button"
                    onClick={() => updateTask(task.id, { notify: !task.notify })}
                    aria-label="Alternar lembrete"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                      task.notify
                        ? 'bg-[#1C1C1E] text-white'
                        : 'bg-[#F2F1EE] text-[#555552] hover:bg-[#E5E4E0]'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Dashed Add Task Box */}
            <div
              className={`rounded-[22px] border border-dashed border-black/20 p-5 flex flex-col items-center justify-center min-h-[170px] bg-white/30 ${
                sortedTasks.length === 0 ? 'sm:col-span-3' : ''
              }`}
            >
              {newTaskOpen ? (
                <form onSubmit={handleCreateTask} className="w-full max-w-sm space-y-2.5">
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Descrever tarefa..."
                    className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as StoreTask['category'])}
                      className="flex-1 bg-white border border-black/15 rounded-xl px-2 py-1.5 text-[11px]"
                    >
                      <option value="pedido">Pedido</option>
                      <option value="stock">Stock</option>
                      <option value="campanha">Campanha</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#1C1C1E] text-white text-[11px] font-medium rounded-xl cursor-pointer"
                    >
                      Criar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setNewTaskOpen(true)}
                  className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-sm font-medium text-[#3B3B39] hover:text-[#1C1C1E] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Adicionar tarefa</span>
                  </span>
                  {sortedTasks.length === 0 && (
                    <span className="text-[11px] font-normal text-[#8A8A85]">
                      Sem tarefas em curso neste momento.
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Row 3: Last Campaigns / Store Projects */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-[#1C1C1E]">
            Últimos Lançamentos & Operações
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <select
                value={campaignSort}
                onChange={(e) => setCampaignSort(e.target.value as 'recent' | 'progress')}
                aria-label="Ordenar operações"
                className="appearance-none bg-transparent pr-5 text-xs font-medium text-[#555552] hover:text-[#1C1C1E] focus:outline-none cursor-pointer"
              >
                <option value="recent">Ordenar: Recentes</option>
                <option value="progress">Ordenar: Progresso</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#555552] pointer-events-none -ml-4" />
            </div>

            <div className="flex items-center gap-1 bg-white/70 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setCampaignLayout('grid')}
                aria-label="Vista em grelha"
                className={`p-1.5 rounded-md cursor-pointer ${
                  campaignLayout === 'grid' ? 'bg-[#1C1C1E] text-white' : 'text-[#555552]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCampaignLayout('list')}
                aria-label="Vista em lista"
                className={`p-1.5 rounded-md cursor-pointer ${
                  campaignLayout === 'list' ? 'bg-[#1C1C1E] text-white' : 'text-[#555552]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {sortedCampaigns.length === 0 ? (
          <div className="bg-white rounded-[22px] p-6 border border-black/5 text-center">
            <p className="text-xs text-[#8A8A85]">
              Sem lançamentos ou operações registadas. As novas encomendas e operações aparecerão aqui.
            </p>
          </div>
        ) : (
          <div
            className={
              campaignLayout === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
                : 'flex flex-col gap-3'
            }
          >
            {sortedCampaigns.map((camp) => {
              const ratio = camp.totalSteps > 0 ? camp.completedSteps / camp.totalSteps : 0;
              const r = 16;
              const circ = 2 * Math.PI * r;
              return (
                <article
                  key={camp.id}
                  onClick={() => onNavigateTab('orders')}
                  className="bg-[#1C1C1E] text-white rounded-[22px] p-5 flex items-start justify-between gap-4 hover:bg-[#252528] transition-colors cursor-pointer"
                >
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="text-[15px] font-medium text-white truncate">{camp.title}</h3>
                    <p className="text-xs text-white/65">{camp.status}</p>
                    <p className="text-[11px] text-white/55 line-clamp-2 leading-relaxed">
                      {camp.summary}
                    </p>
                  </div>

                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2.5" />
                      <circle
                        cx="20"
                        cy="20"
                        r={r}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - ratio)}
                      />
                    </svg>
                    <span className="absolute text-[10px] font-mono tabular-nums text-white">
                      {camp.completedSteps}/{camp.totalSteps}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
