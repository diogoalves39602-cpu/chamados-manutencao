import { NextResponse, type NextRequest } from "next/server";
import { obterSessao } from "@/lib/auth/sessao";
import { SELECT_CHAMADO } from "@/lib/chamados/consultas";
import type { ChamadoCompleto } from "@/lib/chamados/tipos";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { lerFiltrosDashboard, obterIndicadores } from "@/lib/indicadores";
import { gerarPlanilha } from "@/lib/planilha";
import { criarClienteServidor } from "@/lib/supabase/server";

// GET /api/exportar?periodo=7d&categoria=…&tecnico=…&turno=…  → .xlsx com o filtro do dashboard (só administradores).
export const maxDuration = 30;

const PAGINA = 1000; // limite de linhas por consulta do PostgREST
const MAXIMO = 50_000;

export async function GET(request: NextRequest) {
  const { perfil } = await obterSessao();
  if (!perfil?.ativo || perfil.deve_trocar_senha) {
    return NextResponse.json({ erro: "Acesso restrito à equipe." }, { status: 401 });
  }
  if (perfil.papel !== "admin") {
    return NextResponse.json({ erro: "Exportação restrita a administradores." }, { status: 403 });
  }

  const filtros = lerFiltrosDashboard(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await criarClienteServidor();

  const chamados: ChamadoCompleto[] = [];
  for (let de = 0; de < MAXIMO; de += PAGINA) {
    let q = supabase
      .from("chamados")
      .select(SELECT_CHAMADO)
      .gte("aberto_em", filtros.periodo.inicio.toISOString())
      .lt("aberto_em", filtros.periodo.fim.toISOString())
      .order("aberto_em")
      .order("id")
      .range(de, de + PAGINA - 1);
    if (filtros.categoria) q = q.eq("categoria_id", filtros.categoria);
    if (filtros.tecnico) q = q.eq("recebido_por", filtros.tecnico);
    if (filtros.turno) q = q.eq("turno", filtros.turno);
    const { data, error } = await q;
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
    chamados.push(...(data as unknown as ChamadoCompleto[]));
    if (data.length < PAGINA) break;
  }

  const ind = await obterIndicadores(filtros);

  const descricaoFiltros: string[] = [];
  if (filtros.categoria) {
    const { data } = await supabase.from("categorias").select("nome").eq("id", filtros.categoria).single();
    descricaoFiltros.push(`Categoria: ${data?.nome ?? filtros.categoria}`);
  }
  if (filtros.tecnico) {
    const { data } = await supabase.from("perfis").select("nome").eq("id", filtros.tecnico).single();
    descricaoFiltros.push(`Técnico: ${data?.nome ?? "—"}`);
  }
  if (filtros.turno) descricaoFiltros.push(`Turno: ${filtros.turno}`);

  const ultimoDia = new Date(filtros.periodo.fim.getTime() - 1);
  const arquivo = gerarPlanilha({
    chamados,
    ...ind,
    cabecalho: [
      `Período (data de abertura): ${formatarData(filtros.periodo.inicio)} a ${formatarData(ultimoDia)}`,
      `Filtros: ${descricaoFiltros.length ? descricaoFiltros.join("; ") : "nenhum"}`,
      `Gerado em ${formatarDataHora(new Date())} por ${perfil.nome} (horário de Brasília)`,
    ],
  });

  const nome = `chamados_${filtros.periodo.de}_a_${filtros.periodo.ate}.xlsx`;
  return new NextResponse(new Uint8Array(arquivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
