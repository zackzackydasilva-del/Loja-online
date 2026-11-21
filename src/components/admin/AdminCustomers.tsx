import React, { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus, StoreOrder } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { OrderInvoiceModal } from './OrderInvoiceModal';

interface AdminCustomersProps {
  searchFilter: string;
}

export const AdminCustomers: React.FC<AdminCustomersProps> = ({ searchFilter }) => {
  const { customers: dbCustomers, orders, newsletterEmails, settings, updateOrderStatus } = useStore();
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);

  const invoiceOrder: StoreOrder | null =
    orders.find((o) => o.id === invoiceOrderId) || null;

  const customers = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        email: string;
        phone: string;
        city: string;
        orderCount: number;
        pendingCount: number;
        totalSpent: number;
        lastOrderDate: string;
        latestOrderId?: string;
        newsletter: boolean;
      }
    >();

    const newsletterSet = new Set(newsletterEmails.map((e) => e.toLowerCase()));

    dbCustomers.forEach((c) => {
      const key = c.email.toLowerCase();
      map.set(key, {
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        orderCount: 0,
        pendingCount: 0,
        totalSpent: 0,
        lastOrderDate: '—',
        latestOrderId: undefined,
        newsletter: newsletterSet.has(key),
      });
    });

    orders.forEach((order) => {
      const key = order.customerEmail.toLowerCase();
      const paidAmount = order.status === 'Entregue' ? order.total : 0;
      const isPending = order.status !== 'Entregue';
      const existing = map.get(key);
      if (existing) {
        existing.orderCount += 1;
        if (isPending) existing.pendingCount += 1;
        existing.totalSpent += paidAmount;
        if (!existing.latestOrderId) {
          existing.latestOrderId = order.id;
        }
        if (existing.lastOrderDate === '—' || order.createdAt > existing.lastOrderDate) {
          existing.lastOrderDate = order.createdAt;
          existing.latestOrderId = order.id;
        }
      } else {
        map.set(key, {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
          city: order.city,
          orderCount: 1,
          pendingCount: isPending ? 1 : 0,
          totalSpent: paidAmount,
          lastOrderDate: order.createdAt,
          latestOrderId: order.id,
          newsletter: newsletterSet.has(key),
        });
      }
    });

    const list = Array.from(map.values());
    const q = searchFilter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
    );
  }, [dbCustomers, orders, newsletterEmails, searchFilter]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1C1C1E] text-white rounded-[22px] p-5">
          <p className="text-xs text-white/65 mb-1">Clientes Registados</p>
          <p className="text-3xl font-semibold font-mono tabular-nums">{customers.length}</p>
        </div>
        <div className="bg-white rounded-[22px] p-5 border border-black/5">
          <p className="text-xs text-[#72726E] mb-1">Subscritores Newsletter</p>
          <p className="text-3xl font-semibold font-mono tabular-nums">{newsletterEmails.length}</p>
        </div>
        <div className="bg-white rounded-[22px] p-5 border border-black/5">
          <p className="text-xs text-[#72726E] mb-1">Total de Pedidos</p>
          <p className="text-3xl font-semibold font-mono tabular-nums">{orders.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/6 text-[11px] font-semibold text-[#72726E]">
                <th className="py-3.5 px-5">Cliente</th>
                <th className="py-3.5 px-4">Contacto</th>
                <th className="py-3.5 px-4">Cidade</th>
                <th className="py-3.5 px-4 text-right">Encomendas</th>
                <th className="py-3.5 px-5 text-right">Total Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-[13px]">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-sm text-[#72726E]">
                    Sem clientes registados.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.email} className="hover:bg-[#F8F8F6] transition-colors">
                    <td className="py-3.5 px-5">
                      {customer.latestOrderId ? (
                        <button
                          type="button"
                          onClick={() => setInvoiceOrderId(customer.latestOrderId!)}
                          className="font-medium text-[#1C1C1E] hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left"
                        >
                          <span>{customer.name}</span>
                          <FileText className="w-3.5 h-3.5 text-[#72726E]" />
                        </button>
                      ) : (
                        <p className="font-medium text-[#1C1C1E]">{customer.name}</p>
                      )}
                      <p className="text-[11px] text-[#72726E]">
                        Última compra: {customer.lastOrderDate}
                        {customer.pendingCount > 0 ? ` · ${customer.pendingCount} pendente(s)` : ''}
                        {customer.newsletter ? ' · Newsletter' : ''}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-[#1C1C1E]">
                        {customer.email.endsWith('@registo.local')
                          ? 'Não informado (manual)'
                          : customer.email}
                      </p>
                      <p className="text-[11px] text-[#72726E]">{customer.phone}</p>
                    </td>
                    <td className="py-3.5 px-4 text-[#555552]">{customer.city}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {customer.orderCount}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                      {formatMoney(customer.totalSpent, settings.currencySymbol)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

