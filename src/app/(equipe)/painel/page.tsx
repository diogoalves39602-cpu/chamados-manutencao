import type { Metadata } from "next";
import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { CabecalhoPagina } from "@/components/ui";
import { exigirEquipe } from "@/lib/auth/sessao";
import {
  FILTROS_PRAZO,
  FILTROS_STATUS,
  lerFiltros,
  listarCategorias,
  listarChamados,
  listarTecnicos,
  PERIODOS_PAINEL,
} from "@/lib/chamados/consultas";
import { ROTULO_PERIODO } from "@/lib/datas";
import { Fila } from "./fila";
import { FiltrosPainel } from "./filtros-painel";

export const metadata: Metadata = { title: "Painel" };

export default async function Painel({ searchParams }: PageProps<"/painel">) {
  const perfil = await exigirEquipe();
  const filtros = lerFiltros(await searchParams);
  const agora = new Date();
  const [{ chamados, limitado }, tecnicos, categorias] = await Promise.all([
    listarChamados(filtros, agora),
    listarTecnicos(),
    listarCategorias(),
  ]);

  const opcoesFiltro = [
    {
      nome: "status",
      rotulo: "Status",
      padrao: "ativos",
      opcoes: Object.entries(FILTROS_STATUS).map(([valor, rotulo]) => ({ valor, rotulo })),
    },
    {
      nome: "prazo",
      rotulo: "Situação do prazo",
      padrao: "todos",
      opcoes: Object.entries(FILTROS_PRAZO).map(([valor, rotulo]) => ({ valor, rotulo })),
    },
    {
      nome: "categoria",
      rotulo: "Categoria",
      padrao: "",
      opcoes: [{ valor: "", rotulo: "Todas" }, ...categorias.map((c) => ({ valor: String(c.id), rotulo: c.nome }))],
    },
    {
      nome: "tecnico",
      rotulo: "Técnico",
      padrao: "",
      opcoes: [
        { valor: "", rotulo: "Todos" },
        ...tecnicos.map((t) => ({ valor: t.id, rotulo: t.ativo ? t.nome : `${t.nome} (inativo)` })),
      ],
    },
    {
      nome: "periodo",
      rotulo: "Período (abertura)",
      padrao: "todos",
      opcoes: PERIODOS_PAINEL.map((p) => ({ valor: p, rotulo: ROTULO_PERIODO[p] })),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoPagina
        icone={ClipboardList}
        titulo={filtros.status === "ativos" ? "Fila de chamados" : FILTROS_STATUS[filtros.status]}
        subtitulo={
          filtros.status === "ativos"
            ? "Ordenada pelo prazo mais próximo. Atualiza sozinha quando chega chamado."
            : "Histórico de chamados, do mais recente para o mais antigo."
        }
      />
      <Suspense>
        <FiltrosPainel filtros={opcoesFiltro} />
      </Suspense>
      <Fila
        chamados={chamados}
        agoraServidor={agora.getTime()}
        limitado={limitado}
        meuId={perfil.id}
        apenasFila={filtros.status === "ativos"}
      />
    </div>
  );
}
