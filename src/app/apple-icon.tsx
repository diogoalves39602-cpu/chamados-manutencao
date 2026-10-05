import { desenharIcone } from "@/lib/icone-app";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iPhone: "Adicionar à Tela de Início". O iOS arredonda os cantos sozinho.
export default function IconeApple() {
  return desenharIcone(180, false);
}
