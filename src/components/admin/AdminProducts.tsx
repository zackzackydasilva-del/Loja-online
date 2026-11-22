import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Edit2, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types/store';
import { formatMoney } from '../../utils/currency';
import { SafeImage } from '../SafeImage';

interface AdminProductsProps {
  searchFilter: string;
  onEditProduct: (product: Product) => void;
  onNewProduct: () => void;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({
  searchFilter,
  onEditProduct,
  onNewProduct,
}) => {
  const { products, stockMovements, updateProduct, deleteProduct, settings } = useStore();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, searchFilter]);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#555552] tabular-nums">
          {filtered.length} artigo(s) ativos no catálogo sincronizado com a loja
        </p>
        <button
          type="button"
          onClick={onNewProduct}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar Peça</span>
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/6 text-[11px] font-semibold text-[#72726E]">
                <th className="py-3.5 px-5">Produto</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4 text-right">Preço</th>
                <th className="py-3.5 px-4 text-right">Stock</th>
                <th className="py-3.5 px-5 text-right">Gerir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-[13px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 px-6 text-center space-y-3">
                    <p className="text-sm text-[#72726E]">
                      {products.length === 0
                        ? 'Nenhum produto registado no catálogo.'
                        : 'Nenhum artigo encontrado para este filtro.'}
                    </p>
                    {products.length === 0 && (
                      <button
                        type="button"
                        onClick={onNewProduct}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Primeira Peça</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const lowStock = product.stock <= 6;
                  return (
                    <tr key={product.id} className="hover:bg-[#F8F8F6] transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-12 rounded-xl overflow-hidden bg-[#F1EEE8] shrink-0">
                            <SafeImage
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#1C1C1E] truncate max-w-[24ch]">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-[#72726E]">
                              {product.sizes.join(' / ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#555552]">{product.sku}</td>
                      <td className="py-3 px-4 text-[#555552]">{product.category}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                        {formatMoney(product.price, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={`text-xs font-mono tabular-nums font-semibold ${
                              lowStock ? 'text-amber-700' : 'text-[#1C1C1E]'
                            }`}
                          >
                            {product.stock} un.
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateProduct(product.id, { stock: product.stock + 5 })
                            }
                            title="Repor +5 unidades"
                            className="px-2 py-1 text-[10px] font-medium bg-[#F2F1EE] hover:bg-[#E5E4DF] rounded-lg cursor-pointer"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right">
                        {pendingDeleteId === product.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={deletingId === product.id}
                              onClick={async () => {
                                setDeletingId(product.id);
                                try {
                                  await deleteProduct(product.id);
                                } finally {
                                  setDeletingId(null);
                                  setPendingDeleteId(null);
                                }
                              }}
                              className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-medium hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                            >
                              {deletingId === product.id ? 'A eliminar...' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="px-2 py-1 rounded-full bg-[#F2F1EE] text-[#555552] text-[11px] font-medium hover:bg-[#E5E4DF] cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEditProduct(product)}
                              aria-label={`Editar ${product.name}`}
                              className="p-2 rounded-xl hover:bg-[#F2F1EE] text-[#1C1C1E] cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(product.id)}
                              aria-label={`Eliminar ${product.name}`}
                              className="p-2 rounded-xl hover:bg-red-50 text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movements Ledger Linked to Products & Orders */}
      {stockMovements.length > 0 && (
        <div className="bg-white rounded-[24px] p-5 border border-black/5 space-y-3">
          <h3 className="text-sm font-semibold text-[#1C1C1E]">
            Movimentos Recentes de Inventário
          </h3>
          <div className="divide-y divide-black/5">
            {stockMovements.slice(0, 6).map((mov) => {
              const prod = productById.get(mov.productId);
              const isPositive = mov.delta >= 0;
              return (
                <div
                  key={mov.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F2F1EE] text-[#1C1C1E]'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-[#1C1C1E] truncate">
                        {prod ? prod.name : mov.productId}
                      </p>
                      <p className="text-[11px] text-[#72726E]">{mov.reason}</p>
                    </div>
                  </div>
                  <span
                    className={`font-mono font-semibold tabular-nums shrink-0 ${
                      isPositive ? 'text-emerald-700' : 'text-[#1C1C1E]'
                    }`}
                  >
                    {isPositive ? `+${mov.delta}` : mov.delta} un.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
