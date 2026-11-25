import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { ASSETS, DEFAULT_PRODUCT_CATEGORIES } from '../../data/seedData';
import { useStore } from '../../context/StoreContext';
import {
  Product,
  ProductCategory,
  ProductColorVariant,
  ProductSizeMeasurement,
} from '../../types/store';
import { ImageField } from './ImageField';

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  editingProduct,
  onClose,
}) => {
  const { addProduct, updateProduct, settings } = useStore();

  const availableCategories = React.useMemo(() => {
    const strip = settings.storefrontConfig?.categoryStripItems || [];
    const nonSale = strip
      .filter((c) => !c.isSale && c.category?.trim())
      .map((c) => c.category.trim());
    const base = nonSale.length > 0 ? nonSale : DEFAULT_PRODUCT_CATEGORIES;
    const set = new Set(base);
    if (editingProduct?.category?.trim()) {
      set.add(editingProduct.category.trim());
    }
    return Array.from(set);
  }, [settings.storefrontConfig?.categoryStripItems, editingProduct]);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>(availableCategories[0] || 'Mulher');
  const [price, setPrice] = useState('25000');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('15');
  const [sizesInput, setSizesInput] = useState('XS, S, M, L');
  const [material, setMaterial] = useState('100% Linho Europeu');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(ASSETS.prodBag);
  const [colorVariants, setColorVariants] = useState<ProductColorVariant[]>([]);
  const [sizeMeasurements, setSizeMeasurements] = useState<ProductSizeMeasurement[]>([]);
  const [isNew, setIsNew] = useState(true);
  const [featured, setFeatured] = useState(true);
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
      setSizeMeasurements(
        Array.isArray(editingProduct.sizeMeasurements) ? editingProduct.sizeMeasurements : []
      );
      setIsNew(Boolean(editingProduct.isNew));
      setFeatured(editingProduct.featured !== false);
    } else {
      setName('');
      setSku(`LUN-${Math.floor(100 + Math.random() * 900)}`);
      setCategory(availableCategories[0] || 'Mulher');
      setPrice('25000');
      setOriginalPrice('');
      setStock('12');
      setSizesInput('XS, S, M, L');
      setMaterial('100% Algodão Orgânico');
      setDescription('Peça editorial desenhada com corte fluido e acabamento artesanal.');
      setImage(ASSETS.boutiqueRack);
      setColorVariants([]);
      setSizeMeasurements([]);
      setIsNew(true);
      setFeatured(true);
    }
  }, [editingProduct, isOpen, availableCategories]);

  if (!isOpen) return null;

  const parsedSizes = sizesInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const displaySizes = parsedSizes.length > 0 ? parsedSizes : ['Único'];

  const getMeasurementForSize = (size: string): ProductSizeMeasurement =>
    sizeMeasurements.find((m) => m.size === size) || { size, width: '', height: '', waist: '' };

  const updateSizeMeasurement = (
    size: string,
    field: 'width' | 'height' | 'waist',
    value: string
  ) => {
    setSizeMeasurements((prev) => {
      const idx = prev.findIndex((m) => m.size === size);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      }
      return [...prev, { size, [field]: value }];
    });
  };

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

    const activeSizes = sizes.length ? sizes : ['Único'];
    const cleanedMeasurements = activeSizes
      .map((sz) => {
        const entry = sizeMeasurements.find((m) => m.size === sz);
        if (!entry) return null;
        const width = entry.width?.trim() || '';
        const height = entry.height?.trim() || '';
        const waist = entry.waist?.trim() || '';
        if (!width && !height && !waist) return null;
        return {
          size: sz,
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
          ...(waist ? { waist } : {}),
        };
      })
      .filter((x): x is ProductSizeMeasurement => x !== null);

    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      category,
      price: parsedPrice,
      originalPrice: parsedOrig && parsedOrig > parsedPrice ? parsedOrig : undefined,
      onSale: Boolean(parsedOrig && parsedOrig > parsedPrice),
      stock: parsedStock,
      sizes: activeSizes,
      sizeMeasurements: cleanedMeasurements,
      colors:
        cleanedVariants.length > 0 ? cleanedVariants.map((v) => v.name) : ['Neutro'],
      colorVariants: cleanedVariants,
      material: material.trim(),
      description: description.trim(),
      image: image.trim(),
      isNew,
      featured,
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
              {availableCategories.map((c) => (
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

          {/* Medidas por Tamanho: Largura, Altura e Cintura */}
          <div className="sm:col-span-2 rounded-2xl bg-[#F6F6F4] p-3.5 space-y-2.5 border border-black/6">
            <div>
              <p className="text-xs font-semibold text-[#1C1C1E]">
                Medidas dos Tamanhos (Largura · Altura · Cintura em cm)
              </p>
              <p className="text-[11px] text-[#72726E] mt-0.5">
                Opcional: informe as medidas exatas para cada tamanho aparecer na página do produto.
              </p>
            </div>

            <div className="space-y-2">
              {displaySizes.map((sz) => {
                const m = getMeasurementForSize(sz);
                return (
                  <div
                    key={sz}
                    className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-black/6"
                  >
                    <span className="col-span-3 sm:col-span-2 text-xs font-semibold text-[#1C1C1E] px-2 truncate">
                      Tam. {sz}
                    </span>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={m.width || ''}
                        onChange={(e) => updateSizeMeasurement(sz, 'width', e.target.value)}
                        placeholder="Largura"
                        aria-label={`Largura tamanho ${sz}`}
                        className="w-full border border-black/15 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={m.height || ''}
                        onChange={(e) => updateSizeMeasurement(sz, 'height', e.target.value)}
                        placeholder="Altura"
                        aria-label={`Altura tamanho ${sz}`}
                        className="w-full border border-black/15 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-4">
                      <input
                        type="text"
                        value={m.waist || ''}
                        onChange={(e) => updateSizeMeasurement(sz, 'waist', e.target.value)}
                        placeholder="Cintura"
                        aria-label={`Cintura tamanho ${sz}`}
                        className="w-full border border-black/15 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#1C1C1E]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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

          <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-[#1C1C1E] cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded"
              />
              <span>Mostrar nos Destaques da loja</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-[#1C1C1E] cursor-pointer">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="rounded"
              />
              <span>Assinalar como Novidade</span>
            </label>
          </div>
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
