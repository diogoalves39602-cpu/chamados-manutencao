import type { MetadataRoute } from "next";

// Permite "instalar" o sistema no celular (ícone na tela inicial, abre em tela cheia).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chamados de Manutenção",
    short_name: "Chamados",
    description: "Abertura e acompanhamento de chamados de manutenção com prazo de 2 horas.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f4f3",
    theme_color: "#b91c1c",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Abrir chamado", url: "/abrir-chamado" },
      { name: "Indicadores", url: "/dashboard" },
    ],
  };
}
