// Reduz a foto no próprio celular antes do envio: lado maior de 1600px, JPEG 0,75.
// Uma foto de 4–8 MB vira ~200–500 KB (economiza os 1 GB do storage gratuito).
export async function comprimirFoto(arquivo: File, ladoMaximo = 1600, qualidade = 0.75): Promise<File> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
  if (!blob) throw new Error("Falha ao comprimir");
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}
