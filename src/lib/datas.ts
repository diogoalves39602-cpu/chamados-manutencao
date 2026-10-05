// Toda exibição de data/hora usa o fuso de São Paulo, independentemente do
// fuso do servidor (Vercel/Netlify rodam em UTC) ou do celular.
export const FUSO = "America/Sao_Paulo";

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** dd/mm/aaaa hh:mm */
export function formatarDataHora(valor: string | Date | null | undefined) {
  if (!valor) return "—";
  return formatoDataHora.format(typeof valor === "string" ? new Date(valor) : valor).replace(",", "");
}
