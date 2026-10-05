import { desenharIcone } from "@/lib/icone-app";

// /icon/32 (aba do navegador), /icon/192 e /icon/512 (manifest / instalação no celular).
const TAMANHOS = [32, 192, 512];

export function generateImageMetadata() {
  return TAMANHOS.map((t) => ({ id: String(t), size: { width: t, height: t }, contentType: "image/png" }));
}

export default async function Icone({ id }: { id: Promise<string | number> }) {
  const tamanho = Number(await id);
  // Ícones grandes sem cantos arredondados: o Android aplica a própria máscara.
  return desenharIcone(tamanho, tamanho <= 32);
}
