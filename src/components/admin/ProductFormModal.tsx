import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ASSETS } from '../../data/seedData';
import { useStore } from '../../context/StoreContext';
import { Product, ProductCategory } from '../../types/store';
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
      setIsNew(true);
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

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

    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      category,
      price: parsedPrice,
      originalPrice: parsedOrig && parsedOrig > parsedPrice ? parsedOrig : undefined,
      onSale: Boolean(parsedOrig && parsedOrig > parsedPrice),
      stock: parsedStock,
      sizes: sizes.length ? sizes : ['Único'],
      colors: ['Neutro'],
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
              placeholder="Ex: Casaco Trench Areia"
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
              label="Fotografia do Produto"
              recommendedSize="900 × 1200 px (vertical 3:4)"
              value={image}
              onChange={setImage}
            />
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
