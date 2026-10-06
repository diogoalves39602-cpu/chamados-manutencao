import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Ícone do app (logo J&T Express) em PNG para a aba do navegador, a tela inicial
// do celular e o manifest (PWA). Gerado no build a partir de public/logo.png.
let logo: string | undefined;
function logoDataUrl() {
  logo ??= `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "logo.png")).toString("base64")}`;
  return logo;
}

export function desenharIcone(tamanho: number, arredondado = true) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#e60012",
          borderRadius: arredondado ? tamanho * 0.22 : 0,
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img> */}
        <img src={logoDataUrl()} width={tamanho} height={tamanho} alt="" />
      </div>
    ),
    { width: tamanho, height: tamanho },
  );
}
