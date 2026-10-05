import { ImageResponse } from "next/og";

// Ícone do app (chave de manutenção branca sobre vermelho), desenhado em PNG
// para a aba do navegador, a tela inicial do celular e o manifest (PWA).
const CHAVE =
  "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";

export function desenharIcone(tamanho: number, arredondado = true) {
  const icone = Math.round(tamanho * 0.58);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #991b1b 0%, #b91c1c 55%, #dc2626 100%)",
          borderRadius: arredondado ? tamanho * 0.22 : 0,
        }}
      >
        <svg width={icone} height={icone} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d={CHAVE} />
        </svg>
      </div>
    ),
    { width: tamanho, height: tamanho },
  );
}
