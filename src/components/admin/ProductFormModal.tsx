import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { ASSETS } from '../../data/seedData';
import { useStore } from '../../context/StoreContext';
import { Product, ProductCategory, ProductColorVariant } from '../../types/store';
import { ImageField } from './ImageField';

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  onClose: () => void;
}

const CATEGORIES: ProductCategory[] = [
  'Mulher',
  'Homem',
  'Vestidos',
  'Tops',
  'Calçado',
  'Malas',
  'Acessórios',
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  editingProduct,
  onClose,
}) => {
  const { addProduct, updateProduct, settings } = useStore();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Mulher');
  const [price, setPrice] = useState('25000');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('15');
  const [sizesInput, setSizesInput] = useState('XS, S, M, L');
  const [material, setMaterial] = useState('100% Linho Europeu');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(ASSETS.prodBag);
  const [colorVariants, setColorVariants] = useState<ProductColorVariant[]>([]);
  const [isNew, setIsNew] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setErrorMsg('');
    if (editingProduct) {
      setName(editingProduct.name);
      setSku(editingProduct.sku);
      setCategory(editingProduct.category);
      setPrice(String(editingProduct.price));
      setOriginalPrice(editingProduct.originalPrice ? String(editingProduct.originalPrice) : '');
      setStock(String(editingProduct.stock));
      setSizesInput(editingProduct.sizes.join(', '));
      setMaterial(editingProduct.material);
      setDescription(editingProduct.description);
      setImage(editingProduct.image);
      setColorVariants(
        Array.isArray(editingProduct.colorVariants) ? editingProduct.colorVariants : []
      );
      setIsNew(Boolean(editingProduct.isNew));
    } else {
      setName('');
      setSku(`LUN-${Math.floor(100 + Math.random() * 900)}`);
      setCategory('Mulher');
      setPrice('25000');
      setOriginalPrice('');
      setStock('12');
      setSizesInput('XS, S, M, L');
      setMaterial('100% Algodão Orgânico');
      setDescription('Peça editorial desenhada com corte fluido e acabamento artesanal.');
      setImage(ASSETS.boutiqueRack);
      setColorVariants([]);
      setIsNew(true);
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleAddColorVariant = () => {
    const nextIndex = colorVariants.length + 1;
    setColorVariants((prev) => [
      ...prev,
      {
        name: `Cor ${nextIndex}`,
        image: image || ASSETS.prodTrousers,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const parsedPrice = Math.max(1, parseFloat(price) || 0);
    const parsedOrig = originalPrice ? parseFloat(originalPrice) : undefined;
    const parsedStock = Math.max(0, parseInt(stock, 10) || 0);
    const sizes = sizesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const cleanedVariants = colorVariants
      .map((v) => ({ name: v.name.trim(), image: v.image.trim() }))
      .filter((v) => v.name && v.image);

    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      category,
      price: parsedPrice,
      originalPrice: parsedOrig && parsedOrig > parsedPrice ? parsedOrig : undefined,
      onSale: Boolean(parsedOrig && parsedOrig > parsedPrice),
      stock: parsedStock,
      sizes: sizes.length ? sizes : ['Único'],
      colors:
        cleanedVariants.length > 0 ? cleanedVariants.map((v) => v.name) : ['Neutro'],
      colorVariants: cleanedVariants,
      material: material.trim(),
      description: description.trim(),
      image: image.trim(),
      isNew,
      featured: true,
    };

    setSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await addProduct(payload);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao registar produto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-[24px] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#1C1C1E]">
            {editingProduct ? 'Editar Produto' : 'Novo Produto na Loja'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#555552] mb-1">Nome da Peça</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Calça Alfaiataria Linho"
              className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#555552] mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="w-full border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#555552] mb-1">SKU</label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full font-mono border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#555552] mb-1">
              Preço ({settings.currencySymbol})
            </label>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full tabular-nums border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#555552] mb-1">
              Preço Anterior ({settings.currencySymbol} opcional)
            </label>
            <input
              type="number"
              step="1"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="Para ativar Saldos"
              className="w-full tabular-nums border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#555552] mb-1">Stock Disponível</label>
            <input
              type="number"
              min="0"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full tabular-nums border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#555552] mb-1">
              Tamanhos (separados por vírgula)
            </label>
            <input
              type="text"
              value={sizesInput}
              onChange={(e) => setSizesInput(e.target.value)}
              className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>

          <div className="sm:col-span-2">
            <ImageField
              label="Fotografia Principal do Produto"
              recommendedSize="900 × 1200 px (vertical 3:4)"
              value={image}
              onChange={setImage}
            />
          </div>

          {/* Multi-Color Photo Variants */}
          <div className="sm:col-span-2 border-t border-black/8 pt-3.5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#1C1C1E]">
                  Fotos por Cor (Opções Laterais no Produto)
                </p>
                <p className="text-[11px] text-[#72726E] mt-0.5">
                  Adicione várias fotos das diferentes cores da peça (ex: Preto, Bege, Azul) para aparecerem na lateral ao clicar no produto.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddColorVariant}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1C1C1E] text-white text-[11px] font-medium hover:bg-[#323235] cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Cor</span>
              </button>
            </div>

            {colorVariants.length > 0 && (
              <div className="space-y-3">
                {colorVariants.map((variant, idx) => (
                  <div key={idx} className="rounded-2xl bg-[#F6F6F4] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-semibold text-[#1C1C1E]">
                        Cor {String(idx + 1).padStart(2, '0')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setColorVariants((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-red-700 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#555552] mb-1">
                        Nome da Cor
                      </label>
                      <input
                        type="text"
                        required
                        value={variant.name}
                        onChange={(e) => {
                          const next = [...colorVariants];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setColorVariants(next);
                        }}
                        placeholder="Ex: Preto, Azul Escuro, Bege..."
                        className="w-full bg-white border border-black/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>

                    <ImageField
                      label="Fotografia desta Cor"
                      recommendedSize="900 × 1200 px (vertical 3:4)"
                      value={variant.image}
                      onChange={(url) => {
                        const next = [...colorVariants];
                        next[idx] = { ...next[idx], image: url };
                        setColorVariants(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#555552] mb-1">Composição</label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#555552] mb-1">Descrição</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-black/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>

          <label className="sm:col-span-2 inline-flex items-center gap-2 text-xs text-[#1C1C1E] cursor-pointer">
            <input
              type="checkbox"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
              className="rounded"
            />
            <span>Assinalar como Novidade na loja online</span>
          </label>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-xl">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#555552] hover:text-[#1C1C1E] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-[#1C1C1E] text-white text-xs font-medium rounded-full hover:bg-[#323235] disabled:opacity-60 cursor-pointer"
          >
            {submitting
              ? 'A guardar...'
              : editingProduct
              ? 'Guardar Alterações'
              : 'Publicar na Loja'}
          </button>
        </div>
      </form>
    </div>
  );
};
