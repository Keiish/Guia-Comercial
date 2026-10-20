// Reduz a imagem no navegador antes de guardar, para caber no localStorage (cerca de 5 MB no total).
export async function reduzirImagem(arquivo: File, max = 256): Promise<string> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Use PNG, JPG, SVG ou WebP.");
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // SVG sem tamanho declarado chega com 0 × 0
    const w = img.naturalWidth || max;
    const h = img.naturalHeight || max;
    const k = Math.min(1, max / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * k);
    canvas.height = Math.round(h * k);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.85);
  } catch {
    throw new Error("Não deu para ler essa imagem.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
