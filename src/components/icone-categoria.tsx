import { createElement } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { Building2, Cctv, Droplets, Ellipsis, Monitor, Snowflake, Wrench, Zap } from "lucide-react";

// Ícone por nome de categoria (sem acento/maiúsculas). Categorias novas usam a chave.
const ICONES: [RegExp, LucideIcon][] = [
  [/eletric/, Zap],
  [/hidraul|agua|encan/, Droplets],
  [/ar.?condicionado|climatiz|refrigera/, Snowflake],
  [/cftv|camera|seguranca/, Cctv],
  [/^ti$|informatica|computador|rede/, Monitor],
  [/predial|civil|estrutur|alvenaria/, Building2],
  [/outro/, Ellipsis],
];

function escolher(nome: string | null | undefined): LucideIcon {
  const chave = (nome ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  return ICONES.find(([re]) => re.test(chave))?.[1] ?? Wrench;
}

export function IconeCategoria({ nome, ...props }: LucideProps & { nome: string | null | undefined }) {
  return createElement(escolher(nome), { "aria-hidden": true, ...props });
}
