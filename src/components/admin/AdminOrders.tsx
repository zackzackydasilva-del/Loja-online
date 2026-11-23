import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileText, Package, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus, StoreOrder } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { OrderInvoiceModal } from './OrderInvoiceModal';

interface AdminOrdersProps {
  searchFilter: string;
  onNewOrder: () => void;
  latestCreatedOrder?: StoreOrder | null;
}

const STATUS_TABS: ('Todas' | 'Pendente' | 'Entregue')[] = [
  'Todas',
  'Pendente',
  'Entregue',
];

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  searchFilter,
  onNewOrder,
  latestCreatedOrder,
}) => {
  const { orders, updateOrderStatus, deleteOrder, settings } = useStore();
  const [statusFilter, setStatusFilter] = useState<'Todas' | 'Pendente' | 'Entregue'>('Todas');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteOrder = async (orderId: string) => {
    setDeletingId(orderId);
    setDeleteError('');
    try {
      await deleteOrder(orderId);
      if (selectedOrderId === orderId) setSelectedOrderId(null);
      if (invoiceOrderId === orderId) setInvoiceOrderId(null);
      setConfirmDeleteId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao eliminar encomenda.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (latestCreatedOrder) {
      setSelectedOrderId(latestCreatedOrder.id);
    }
  }, [latestCreatedOrder]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const invoiceOrder = useMemo(
    () => orders.find((o) => o.id === invoiceOrderId) || null,
    [orders, invoiceOrderId]
  );

  const filtered = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return orders.filter((order) => {
      const matchStatus =
        statusFilter === 'Todas' ||
        (statusFilter === 'Entregue'
          ? order.status === 'Entregue'
          : order.status !== 'Entregue');
      const matchQuery =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.city.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [orders, statusFilter, searchFilter]);

  const paidOrdersCount = orders.filter((o) => o.status === 'Entregue').length;
  const pendingOrdersCount = orders.length - paidOrdersCount;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-white/80 p-1.5 rounded-2xl border border-black/5">
          {STATUS_TABS.map((tab) => {
            const count =
              tab === 'Todas'
                ? orders.length
                : tab === 'Entregue'
                ? paidOrdersCount
                : pendingOrdersCount;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-[#1C1C1E] text-white'
                    : 'text-[#555552] hover:text-[#1C1C1E]'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <p className="text-xs text-[#555552] tabular-nums">
            {filtered.length} encomenda(s) · Clique no nome para ver a factura
          </p>
          <button
            type="button"
            onClick={onNewOrder}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Encomenda</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-8 bg-white rounded-[24px] border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/6 text-[11px] font-semibold text-[#72726E]">
                  <th className="py-3.5 px-5">Pedido</th>
                  <th className="py-3.5 px-4">Cliente (Ver Factura)</th>
                  <th className="py-3.5 px-4">Destino</th>
                  <th className="py-3.5 px-4">Estado / Pagamento</th>
                  <th className="py-3.5 px-4 text-right">Valor</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 text-[13px]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 px-6 text-center space-y-3">
                      <p className="text-sm text-[#72726E]">
                        {orders.length === 0
                          ? 'Sem encomendas registadas.'
                          : 'Sem encomendas com este filtro.'}
                      </p>
                      {orders.length === 0 && (
                        <button
                          type="button"
                          onClick={onNewOrder}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Registar Encomenda Manual</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const isPaid = order.status === 'Entregue';
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#F3F2EE]' : 'hover:bg-[#F8F8F6]'
                        }`}
                      >
                        <td className="py-3.5 px-5 font-mono text-xs font-medium text-[#1C1C1E]">
                          #{order.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderId(order.id);
                              setInvoiceOrderId(order.id);
                            }}
                            title="Clique para abrir a factura completa"
                            className="font-medium text-[#1C1C1E] hover:underline inline-flex items-center gap-1.5 text-left cursor-pointer group"
                          >
                            <span>{order.customerName}</span>
                            <FileText className="w-3.5 h-3.5 text-[#72726E] group-hover:text-[#1C1C1E]" />
                          </button>
                          <p className="text-[11px] text-[#72726E]">{order.createdAt}</p>
                        </td>
                        <td className="py-3.5 px-4 text-[#555552]">{order.city}</td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                isPaid ? 'text-emerald-700' : 'text-[#555552]'
                              }`}
                            >
                              {isPaid ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-700" />
                              )}
                              <span>{isPaid ? 'Entregue' : order.status}</span>
                            </span>
                            <p
                              className={`text-[10px] font-medium ${
                                isPaid ? 'text-emerald-700' : 'text-[#8A8A85]'
                              }`}
                            >
                              {isPaid ? 'Pago' : 'Não pago'}
                            </p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <p
                            className={`font-mono font-semibold tabular-nums ${
                              isPaid ? 'text-[#1C1C1E]' : 'text-[#72726E]'
                            }`}
                          >
                            {formatMoney(order.total, settings.currencySymbol)}
                          </p>
                          {!isPaid && (
                            <p className="text-[10px] text-[#8A8A85] tabular-nums">
                              0 {settings.currencySymbol} pago
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div
                            className="inline-flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {confirmDeleteId === order.id ? (
                              <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                                <button
                                  type="button"
                                  disabled={deletingId === order.id}
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-medium hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                                >
                                  {deletingId === order.id ? 'A apagar...' : 'Confirmar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  aria-label="Cancelar eliminação"
                                  className="p-1 text-[#555552] hover:text-[#1C1C1E] cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="inline-flex items-center rounded-full bg-[#F2F1EE] p-0.5 border border-black/8">
                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(order.id, 'Pendente')}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                                      !isPaid
                                        ? 'bg-[#1C1C1E] text-white'
                                        : 'text-[#555552] hover:text-[#1C1C1E]'
                                    }`}
                                  >
                                    Pendente
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(order.id, 'Entregue')}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                                      isPaid
                                        ? 'bg-emerald-700 text-white'
                                        : 'text-[#555552] hover:text-[#1C1C1E]'
                                    }`}
                                  >
                                    Entregue
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(order.id)}
                                  title="Eliminar encomenda"
                                  aria-label={`Eliminar encomenda ${order.id}`}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#72726E] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="xl:col-span-4 bg-[#1C1C1E] text-white rounded-[24px] p-6 space-y-5">
          {selectedOrder ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-mono text-white/60">#{selectedOrder.id}</p>
                  <button
                    type="button"
                    onClick={() => setInvoiceOrderId(selectedOrder.id)}
                    className="text-lg font-semibold mt-0.5 text-left hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{selectedOrder.customerName}</span>
                    <FileText className="w-4 h-4 text-white/70" />
                  </button>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg shrink-0 ${
                    selectedOrder.status === 'Entregue'
                      ? 'bg-emerald-600/25 text-emerald-300'
                      : 'bg-[#28282B] text-white'
                  }`}
                >
                  {selectedOrder.status === 'Entregue' ? 'Entregue · Pago' : 'Pendente · Não pago'}
                </span>
              </div>

              <div className="space-y-1 text-xs text-white/75">
                <p>
                  {selectedOrder.customerEmail.endsWith('@registo.local')
                    ? 'Email não informado (registo manual)'
                    : selectedOrder.customerEmail}
                </p>
                <p>{selectedOrder.customerPhone}</p>
                <p>
                  {selectedOrder.shippingAddress}, {selectedOrder.postalCode} {selectedOrder.city}
                </p>
                <p>Pagamento: {selectedOrder.paymentMethod}</p>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <p className="text-xs font-semibold text-white/80">Artigos da Encomenda</p>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs gap-2">
                    <span className="text-white/80">
                      {item.quantity}x {item.name} ({item.size})
                    </span>
                    <span className="font-mono tabular-nums shrink-0 whitespace-nowrap">
                      {formatMoney(item.unitPrice * item.quantity, settings.currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10 space-y-1">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-sm">Total da Encomenda</span>
                  <span className="text-lg font-mono tabular-nums whitespace-nowrap">
                    {formatMoney(selectedOrder.total, settings.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-white/65">
                  <span>Contabilizado como pago</span>
                  <span className="font-mono tabular-nums whitespace-nowrap">
                    {formatMoney(
                      selectedOrder.status === 'Entregue' ? selectedOrder.total : 0,
                      settings.currencySymbol
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-[11px] text-white/60">Alterar Estado</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'Pendente')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      selectedOrder.status !== 'Entregue'
                        ? 'bg-white text-[#1C1C1E]'
                        : 'bg-[#28282B] text-white/80 hover:bg-[#323236]'
                    }`}
                  >
                    Pendente (Não pago)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'Entregue')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      selectedOrder.status === 'Entregue'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#28282B] text-white/80 hover:bg-[#323236]'
                    }`}
                  >
                    Entregue (Pago)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setInvoiceOrderId(selectedOrder.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Abrir Factura (Imprimir / PDF)</span>
                </button>

                {deleteError && <p className="text-xs text-red-300">{deleteError}</p>}

                {confirmDeleteId === selectedOrder.id ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={deletingId === selectedOrder.id}
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium cursor-pointer disabled:opacity-60"
                    >
                      {deletingId === selectedOrder.id ? 'A eliminar...' : 'Confirmar Eliminação'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="py-2 px-3 rounded-xl bg-[#28282B] hover:bg-[#323236] text-white/80 text-xs font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(selectedOrder.id)}
                    className="w-full py-2 px-4 rounded-xl border border-red-400/30 text-red-300 hover:bg-red-500/15 text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Encomenda</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="py-10 text-center space-y-2">
              <Package className="w-8 h-8 text-white/40 mx-auto" />
              <p className="text-sm font-medium">Selecione uma encomenda</p>
              <p className="text-xs text-white/60">
                Clique no nome do cliente para ver a factura completa ou altere o estado entre Pendente e Entregue.
              </p>
            </div>
          )}
        </aside>
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
