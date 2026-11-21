import React, { useId, useState } from 'react';
import { ImagePlus, Link as LinkIcon } from 'lucide-react';
import { ASSETS } from '../../data/seedData';
import { compressImageFileToDataUrl } from '../../utils/imageUpload';
import { SafeImage } from '../SafeImage';

export const STUDIO_IMAGE_PRESETS = [
  { label: 'Editorial Blazer (Hero)', url: ASSETS.heroWoman },
  { label: 'Vestidos Editorial / Newsletter', url: ASSETS.dressesEditorial },
  { label: 'Cabide de Boutique / Novidades', url: ASSETS.boutiqueRack },
  { label: 'Top Canelado Preto', url: ASSETS.prodTop },
  { label: 'Calças Linho Areia', url: ASSETS.prodTrousers },
  { label: 'Mala Pele Cognac', url: ASSETS.prodBag },
  { label: 'Sandálias Tiras', url: ASSETS.prodHeels },
  { label: 'Óculos Tartaruga', url: ASSETS.prodSunglasses },
  { label: 'Vestido Plissado Seda', url: ASSETS.prodDress },
  { label: 'Sobretudo Camurça Homem', url: ASSETS.prodSuedeJacket },
];

interface ImageFieldProps {
  label?: string;
  recommendedSize?: string;
  value: string;
  onChange: (nextUrl: string) => void;
  allowEmpty?: boolean;
  compact?: boolean;
}

export const ImageField: React.FC<ImageFieldProps> = ({
  label = 'Imagem',
  recommendedSize,
  value,
  onChange,
  allowEmpty = false,
  compact = false,
}) => {
  const fileInputId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const isPreset = STUDIO_IMAGE_PRESETS.some((p) => p.url === value);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao carregar imagem.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {(label || recommendedSize) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {label && <label className="block text-xs font-medium text-[#555552]">{label}</label>}
          {recommendedSize && (
            <span className="text-[11px] font-mono text-[#72726E]">{recommendedSize}</span>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`${
            compact ? 'w-14 h-14' : 'w-16 h-16'
          } rounded-xl overflow-hidden bg-[#F1EEE8] border border-black/10 shrink-0`}
        >
          <SafeImage src={value} alt={label} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={isPreset ? value : ''}
              onChange={(e) => {
                if (e.target.value) onChange(e.target.value);
              }}
              className="flex-1 min-w-[160px] border border-black/15 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-[#1C1C1E]"
            >
              <option value="">
                {value
                  ? value.startsWith('data:')
                    ? 'Imagem carregada do dispositivo'
                    : 'Imagem personalizada (URL)'
                  : allowEmpty
                  ? 'Sem imagem'
                  : 'Selecionar fotografia de estúdio...'}
              </option>
              {STUDIO_IMAGE_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.url}>
                  {preset.label}
                </option>
              ))}
            </select>

            <label
              htmlFor={fileInputId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2F1EE] hover:bg-[#E5E4DF] text-xs font-medium text-[#1C1C1E] cursor-pointer whitespace-nowrap shrink-0 transition-colors"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              <span>{uploading ? 'A processar...' : 'Carregar Foto'}</span>
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="relative flex items-center">
            <LinkIcon className="w-3.5 h-3.5 text-[#8A8A85] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={value.startsWith('data:') ? '' : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={
                value.startsWith('data:')
                  ? 'Imagem local guardada — cole um link https:// se preferir substituir'
                  : 'Ou cole um endereço https://...'
              }
              className="w-full border border-black/12 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#1C1C1E]"
            />
          </div>

          {uploadError && <p className="text-[11px] text-red-700">{uploadError}</p>}
        </div>
      </div>
    </div>
  );
};
