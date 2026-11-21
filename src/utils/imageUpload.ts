export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 1280,
  quality = 0.82
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

    const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
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

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length > 3_200_000) {
      return canvas.toDataURL('image/jpeg', 0.68);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
