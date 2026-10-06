import { formatarDataHora } from "@/lib/datas";

// Modelos de mensagem para o solicitante (editáveis antes de enviar).
const comPonto = (t: string) => (/[.!?]$/.test(t) ? t : `${t}.`);
export type DadosModelo = { numero: string; nome: string; local: string; prazo: string; link: string; motivo?: string };

export const MODELOS_MENSAGEM: { id: string; rotulo: string; texto: (d: DadosModelo) => string }[] = [
  {
    id: "recebido",
    rotulo: "Recebemos",
    texto: (d) =>
      `Olá, ${d.nome}! Recebemos seu chamado ${d.numero} (${d.local}). O prazo de atendimento é até ${d.prazo}. Acompanhe em ${d.link}`,
  },
  {
    id: "a-caminho",
    rotulo: "Técnico a caminho",
    texto: (d) => `Olá, ${d.nome}! Um técnico da manutenção está a caminho para atender o chamado ${d.numero} (${d.local}).`,
  },
  {
    id: "informacoes",
    rotulo: "Preciso de informações",
    texto: (d) => `Olá, ${d.nome}! Sobre o chamado ${d.numero} (${d.local}), precisamos de mais informações: `,
  },
  {
    id: "concluido",
    rotulo: "Concluído",
    texto: (d) =>
      `Olá, ${d.nome}! Seu chamado ${d.numero} (${d.local}) foi concluído. Se o problema continuar, é só abrir um novo chamado em ${d.link}`,
  },
  {
    id: "reprovado",
    rotulo: "Reprovado",
    texto: (d) =>
      `Olá, ${d.nome}! Seu chamado ${d.numero} (${d.local}) foi reprovado pela equipe de manutenção.${d.motivo ? ` Motivo: ${comPonto(d.motivo)}` : ""} Se precisar, abra um novo chamado em ${d.link}`,
  },
];

/** Texto avisando o solicitante de que o chamado foi reprovado. */
export const textoReprovado = (d: DadosModelo) => MODELOS_MENSAGEM.find((m) => m.id === "reprovado")!.texto(d);

export function dadosModelo(
  c: { numero: string; solicitante_nome: string; local: string; prazo_limite: string; motivo_cancelamento?: string | null },
  link: string,
): DadosModelo {
  return {
    numero: c.numero,
    nome: c.solicitante_nome.split(" ")[0],
    local: c.local,
    prazo: formatarDataHora(c.prazo_limite),
    link,
    motivo: c.motivo_cancelamento?.trim() || undefined,
  };
}
