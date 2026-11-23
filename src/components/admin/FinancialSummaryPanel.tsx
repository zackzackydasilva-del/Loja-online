import React, { useState } from 'react';
import { FileText, Plus, Receipt, Trash2, Wallet } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus, StoreCost, StoreCostCategory, StoreOrder } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { formatLocalIsoDate } from '../../utils/weeklyAnalytics';
import { OrderInvoiceModal } from './OrderInvoiceModal';

const COST_CATEGORIES: StoreCostCategory[] = [
  'Mercadoria',
  'Logística',
  'Marketing',
  'Operacional',
  'Outro',
];

interface FinancialSummaryPanelProps {
  compact?: boolean;
  filteredOrders?: StoreOrder[];
  filteredCosts?: StoreCost[];
  periodLabel?: string;
}

export const FinancialSummaryPanel: React.FC<FinancialSummaryPanelProps> = ({
  compact = false,
  filteredOrders,
  filteredCosts,
  periodLabel,
}) => {
  const { orders, costs, settings, addCost, deleteCost, updateOrderStatus } = useStore();
  const activeOrders = filteredOrders ?? orders;
  const activeCosts = filteredCosts ?? costs;

  const [costFormOpen, setCostFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<StoreCostCategory>('Mercadoria');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => formatLocalIsoDate());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);

  const paidOrders = activeOrders.filter((o) => o.status === 'Entregue');
  const pendingOrders = activeOrders.filter((o) => o.status !== 'Entregue');
  const invoiceOrder: StoreOrder | null =
    orders.find((o) => o.id === invoiceOrderId) || null;

  const grossRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCosts = activeCosts.reduce((sum, c) => sum + c.amount, 0);
  const netRevenue = grossRevenue - totalCosts;
  const averagePerSale = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;
  const netMarginPercent =
    grossRevenue > 0 ? Math.round((netRevenue / grossRevenue) * 100) : 0;

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const parsedAmount = Number(amount);
    if (!title.trim()) {
      setErrorMsg('Informe a descrição do custo.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setErrorMsg('Informe um valor válido em Kz.');
      return;
    }
    setSaving(true);
    try {
      await addCost({
        title: title.trim(),
        category,
        amount: parsedAmount,
        date: date || formatLocalIsoDate(),
      });
      setTitle('');
      setAmount('');
      setDate(formatLocalIsoDate());
      setCostFormOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao registar custo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCost = async (costId: string) => {
    setErrorMsg('');
    try {
      await deleteCost(costId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao eliminar custo.');
    }
  };

  return (
    <section className="space-y-4">
      {/* 3 Bento Financial Cards: Bruto / Custos / Líquido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1C1C1E] text-white rounded-[22px] p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/65">Faturamento Bruto (Pago)</p>
            <Wallet className="w-4 h-4 text-white/60" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums whitespace-nowrap">
            {formatMoney(grossRevenue, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-white/60 tabular-nums">
            {paidOrders.length} entregue(s) · {pendingOrders.length} pendente(s) · Média{' '}
            {formatMoney(averagePerSale, settings.currencySymbol)}
          </p>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-black/5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#72726E]">Custos Registados</p>
            <button
              type="button"
              onClick={() => setCostFormOpen((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C1C1E] text-white text-[11px] font-medium hover:bg-[#323235] cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>Registar Custo</span>
            </button>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#1C1C1E] whitespace-nowrap">
            {formatMoney(totalCosts, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-[#72726E] tabular-nums">
            {activeCosts.length} custo(s) lançados{periodLabel ? ` · ${periodLabel}` : ' na gestão'}
          </p>
        </div>

        <div className="bg-[#F6F6F4] rounded-[22px] p-5 border border-black/5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#555552]">Faturamento Líquido</p>
            <Receipt className="w-4 h-4 text-[#555552]" />
          </div>
          <p
            className={`text-2xl sm:text-3xl font-semibold font-mono tabular-nums whitespace-nowrap ${
              netRevenue > 0
                ? 'text-emerald-700'
                : netRevenue < 0
                ? 'text-red-700'
                : 'text-[#1C1C1E]'
            }`}
          >
            {formatMoney(netRevenue, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-[#72726E] tabular-nums">
            Bruto − Custos {grossRevenue > 0 ? `(${netMarginPercent}% margem)` : ''}
          </p>
        </div>
      </div>

      {/* Inline Cost Form */}
      {costFormOpen && (
        <form
          onSubmit={handleAddCost}
          className="bg-white rounded-[22px] p-5 border border-black/10 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1C1C1E]">Registar Novo Custo</h3>
            <button
              type="button"
              onClick={() => setCostFormOpen(false)}
              className="text-xs text-[#72726E] hover:text-[#1C1C1E] cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-medium text-[#555552] mb-1">
                Descrição do Custo
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Compra de stock, embalagem ou entrega"
                className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-[#555552] mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StoreCostCategory)}
                className="w-full border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
              >
                {COST_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-[#555552] mb-1">
                Valor ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full font-mono tabular-nums border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-[#555552] mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-black/15 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-xl">{errorMsg}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'A guardar...' : 'Guardar Custo'}
            </button>
          </div>
        </form>
      )}

      {/* Breakdown: Faturamento por Cada Venda (apenas Entregues/Pagas) + Custos Registados */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Per-Sale Revenue */}
        <div className="lg:col-span-7 bg-white rounded-[24px] p-5 border border-black/5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#1C1C1E]">
              Faturamento por Cada Venda ({paidOrders.length})
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-[#72726E] whitespace-nowrap">
              Bruto Pago: {formatMoney(grossRevenue, settings.currencySymbol)}
            </span>
          </div>

          {paidOrders.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-xs text-[#8A8A85]">
                Sem vendas pagas (Entregues). Encomendas pendentes não contabilizam como pagas.
              </p>
              {pendingOrders.length > 0 && (
                <p className="text-[11px] text-amber-700">
                  {pendingOrders.length} encomenda(s) pendente(s) aguarda(m) confirmação de entrega.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-black/5 max-h-72 overflow-y-auto pr-1">
              {(compact ? paidOrders.slice(0, 8) : paidOrders).map((order) => {
                const units = order.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <div
                    key={order.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setInvoiceOrderId(order.id)}
                        className="font-medium text-[#1C1C1E] hover:underline inline-flex items-center gap-1 truncate cursor-pointer"
                      >
                        <span className="font-mono">#{order.id}</span> · {order.customerName}
                        <FileText className="w-3 h-3 text-[#72726E] shrink-0" />
                      </button>
                      <p className="text-[11px] text-[#72726E]">
                        {order.createdAt} · {units} artigo(s) · {order.paymentMethod} · Entregue (Pago)
                      </p>
                    </div>
                    <span className="font-mono font-semibold tabular-nums text-[#1C1C1E] whitespace-nowrap shrink-0">
                      {formatMoney(order.total, settings.currencySymbol)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recorded Costs List */}
        <div className="lg:col-span-5 bg-white rounded-[24px] p-5 border border-black/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1C1C1E]">
              Custos Registados ({activeCosts.length})
            </h3>
            {!costFormOpen && (
              <button
                type="button"
                onClick={() => setCostFormOpen(true)}
                className="text-xs font-medium text-[#1C1C1E] hover:underline cursor-pointer"
              >
                + Adicionar
              </button>
            )}
          </div>

          {activeCosts.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-[#8A8A85]">
                Sem custos registados para este período. Adicione os seus custos para apurar o faturamento líquido.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/5 max-h-72 overflow-y-auto pr-1">
              {activeCosts.map((cost) => (
                <div
                  key={cost.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#1C1C1E] truncate">{cost.title}</p>
                    <p className="text-[11px] text-[#72726E]">
                      {cost.category} · {cost.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-semibold tabular-nums text-[#1C1C1E] whitespace-nowrap">
                      −{formatMoney(cost.amount, settings.currencySymbol)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCost(cost.id)}
                      aria-label={`Eliminar custo ${cost.title}`}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <OrderInvoiceModal
        order={invoiceOrder}
        onClose={() => setInvoiceOrderId(null)}
        onChangeStatus={(orderId: string, nextStatus: OrderStatus) =>
          updateOrderStatus(orderId, nextStatus)
        }
      />
    </section>
  );
};

