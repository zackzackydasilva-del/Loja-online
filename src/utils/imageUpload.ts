export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 960,
  quality = 0.76
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um ficheiro de imagem válido (PNG, JPG ou WebP).');
  }
  if (file.type === 'image/svg+xml') {
    throw new Error('Ficheiros SVG não são permitidos por segurança. Use PNG, JPG ou WebP.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      el.src = objectUrl;
    });

    const renderScaled = (targetMaxWidth: number, targetQuality: number): string => {
      const scale = img.naturalWidth > targetMaxWidth ? targetMaxWidth / img.naturalWidth : 1;
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Erro ao processar imagem no navegador.');
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', targetQuality);
    };

    let dataUrl = renderScaled(maxWidth, quality);
    if (dataUrl.length > 420_000) {
      dataUrl = renderScaled(Math.min(maxWidth, 760), 0.68);
    }
    if (dataUrl.length > 360_000) {
      dataUrl = renderScaled(Math.min(maxWidth, 680), 0.56);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
