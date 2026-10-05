import "server-only";
import { formatarDataHora } from "@/lib/datas";
import { formatarDuracao, ROTULO_ORIGEM, ROTULO_STATUS } from "@/lib/chamados/rotulos";
import type { Tables } from "@/lib/supabase/database.types";
import { md, type Cartao } from "./bot";

export type ChamadoNotificavel = Tables<"chamados"> & { categoria: string; responsavel: string | null };

function campo(rotulo: string, valor: string) {
  return { is_short: true, text: { tag: "lark_md", content: `**${rotulo}**\n${md(valor)}` } };
}

function botao(url: string | undefined) {
  if (!url) return [];
  return [
    {
      tag: "action",
      actions: [{ tag: "button", text: { tag: "plain_text", content: "Abrir no painel" }, type: "primary", url }],
    },
  ];
}

export function cartaoNovoChamado(c: ChamadoNotificavel, urlPainel?: string): Cartao {
  return {
    config: { wide_screen_mode: true },
    header: { template: "blue", title: { tag: "plain_text", content: `Novo chamado ${c.numero} · ${c.categoria}` } },
    elements: [
      {
        tag: "div",
        fields: [
          campo("Local", c.local),
          campo("Solicitante", `${c.solicitante_nome} (${c.solicitante_setor})`),
          campo("Contato", c.solicitante_contato),
          campo("Origem", ROTULO_ORIGEM[c.origem]),
          campo("Aberto em", formatarDataHora(c.aberto_em)),
          campo("Prazo limite", formatarDataHora(c.prazo_limite)),
        ],
      },
      { tag: "div", text: { tag: "lark_md", content: md(c.descricao.slice(0, 800)) } },
      ...botao(urlPainel),
    ],
  };
}

export function cartaoAlertaPrazo(c: ChamadoNotificavel, urlPainel?: string, agora = Date.now()): Cartao {
  const restante = Math.round((new Date(c.prazo_limite).getTime() - agora) / 60000);
  const estourado = restante <= 0;
  return {
    config: { wide_screen_mode: true },
    header: {
      template: estourado ? "red" : "orange",
      title: {
        tag: "plain_text",
        content: estourado
          ? `Prazo estourado: ${c.numero} (há ${formatarDuracao(-restante)})`
          : `Faltam ${formatarDuracao(restante)} para o prazo de ${c.numero}`,
      },
    },
    elements: [
      {
        tag: "div",
        fields: [
          campo("Local", c.local),
          campo("Categoria", c.categoria),
          campo("Status", ROTULO_STATUS[c.status]),
          campo("Responsável", c.responsavel ?? "Ninguém assumiu ainda"),
          campo("Prazo limite", formatarDataHora(c.prazo_limite)),
          campo("Solicitante", c.solicitante_nome),
        ],
      },
      ...botao(urlPainel),
    ],
  };
}

export function cartaoTeste(nomeDestino: string): Cartao {
  return {
    config: { wide_screen_mode: true },
    header: { template: "green", title: { tag: "plain_text", content: "Teste do sistema de chamados" } },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `Destino **${md(nomeDestino)}** configurado. Enviado em ${formatarDataHora(new Date())} (horário de Brasília).`,
        },
      },
    ],
  };
}
