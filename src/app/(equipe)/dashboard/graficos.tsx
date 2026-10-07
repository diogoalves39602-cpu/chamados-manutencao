import { formatarDuracao } from "@/lib/chamados/rotulos";
import { formatarPct, pctDentro, type Grupo } from "@/lib/indicadores-calculo";

// Gráficos em HTML/CSS (sem biblioteca): leves no celular e renderizados no servidor.
// As 5 partes de status (encerrados embaixo/à esquerda, pendentes em cima/à direita) usam
// uma ordem validada com o validador de paleta (modo claro): separação para daltonismo
// e para visão normal acima do mínimo entre vizinhos. O amarelo tem contraste < 3:1,
// por isso toda barra tem dica com os números e há a visão em tabela.
export const COR = {
  dentro: "#2a78d6",
  fora: "#eb6834",
  reprovado: "#4a3aa7",
  emAberto: "#eda100",
  atrasado: "#e34948",
  barra: "#2a78d6",
  base: "#c3c2b7", // linha de base do eixo
  grade: "#e1e0d9",
} as const;

const num = (n: number) => n.toLocaleString("pt-BR");

export const SERIES = [
  { chave: "dentro", rotulo: "Finalizados no prazo", curto: "No prazo", cor: COR.dentro, valor: (g: Grupo) => g.dentro },
  { chave: "fora", rotulo: "Finalizados fora do prazo", curto: "Fora do prazo", cor: COR.fora, valor: (g: Grupo) => g.fora },
  { chave: "reprovados", rotulo: "Reprovados", curto: "Reprovados", cor: COR.reprovado, valor: (g: Grupo) => g.cancelados },
  {
    chave: "aberto",
    rotulo: "Em aberto (no prazo)",
    curto: "Em aberto",
    cor: COR.emAberto,
    valor: (g: Grupo) => Math.max(0, g.abertos + g.em_andamento - g.atrasados),
  },
  { chave: "atrasados", rotulo: "Atrasados (em aberto)", curto: "Atrasados", cor: COR.atrasado, valor: (g: Grupo) => g.atrasados },
] as const;

export function Legenda({ itens = SERIES.map((s) => ({ cor: s.cor, rotulo: s.rotulo })) }: { itens?: { cor: string; rotulo: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
      {itens.map((i) => (
        <li key={i.rotulo} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.cor }} aria-hidden />
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}

/** Caixa de dica com a composição do grupo (hover no computador, toque/foco no celular). */
function Dica({
  titulo,
  g,
  lado = "cima",
  alinhar = "esquerda",
}: {
  titulo: string;
  g: Grupo;
  lado?: "cima" | "baixo";
  alinhar?: "esquerda" | "direita";
}) {
  return (
    <div
      className={`pointer-events-none absolute z-20 hidden w-56 rounded-lg border border-stone-200 bg-white p-2.5 text-xs shadow-lg group-hover:block group-focus:block ${
        lado === "cima" ? "bottom-full mb-1" : "top-full mt-1"
      } ${alinhar === "direita" ? "right-0" : "left-0"}`}
    >
      <p className="mb-1 font-semibold text-stone-900">
        {titulo} · {num(g.total)} chamado{g.total === 1 ? "" : "s"}
      </p>
      {SERIES.map((s) => (
        <p key={s.chave} className="flex items-center justify-between gap-2 text-stone-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.cor }} aria-hidden />
            {s.rotulo}
          </span>
          <span className="tabular-nums text-stone-900">{num(s.valor(g))}</span>
        </p>
      ))}
      {g.finalizados > 0 ? (
        <p className="mt-1 border-t border-stone-100 pt-1 text-stone-600">
          {formatarPct(pctDentro(g))} no prazo · tempo médio {formatarDuracao(g.tempo_medio_total)}
        </p>
      ) : null}
    </div>
  );
}

/** Pedaços coloridos de uma barra empilhada (vertical ou horizontal). */
function Segmentos({ g, direcao }: { g: Grupo; direcao: "coluna" | "linha" }) {
  return (
    <>
      {SERIES.map((s) => {
        const v = s.valor(g);
        return v > 0 ? <div key={s.chave} style={{ background: s.cor, flexGrow: v, flexBasis: 0 }} className={direcao === "linha" ? "h-full" : "w-full"} /> : null;
      })}
    </>
  );
}

/** Marcas do eixo em números inteiros "redondos" (no máximo 5): 5 → 0, 2, 4, 6. */
export function marcas(maximo: number) {
  const passo = Math.max(1, Math.ceil(Math.max(1, maximo) / 4));
  const topo = Math.ceil(Math.max(1, maximo) / passo) * passo;
  return Array.from({ length: topo / passo + 1 }, (_, i) => i * passo);
}

function rotuloDia(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** Colunas empilhadas por dia de abertura, com todos os status e o total em cima. */
export function GraficoDiario({ dias }: { dias: Grupo[] }) {
  const maximo = Math.max(1, ...dias.map((d) => d.total));
  const eixo = marcas(maximo);
  const passo = Math.max(1, Math.ceil(dias.length / 10)); // ~10 rótulos no eixo
  const mostrarTotais = dias.length <= 31;

  return (
    <figure className="flex flex-col gap-3">
      <Legenda />
      <div className="flex gap-2">
        {/* Eixo Y */}
        <div className="relative h-52 w-6 shrink-0 text-right text-[10px] tabular-nums text-stone-400" aria-hidden>
          {eixo.map((m) => (
            <span key={m} className="absolute right-0 -translate-y-1/2" style={{ bottom: `calc(${(m / eixo.at(-1)!) * 100}% - 0.5em)` }}>
              {num(m)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-52 border-b" style={{ borderColor: COR.base }}>
            {eixo.slice(1).map((m) => (
              <div
                key={m}
                className="absolute inset-x-0 border-t border-dashed"
                style={{ bottom: `${(m / eixo.at(-1)!) * 100}%`, borderColor: COR.grade }}
                aria-hidden
              />
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {dias.map((d, i) => (
                <div
                  key={d.chave}
                  tabIndex={0}
                  className="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end outline-none"
                  aria-label={`${rotuloDia(d.chave)}: ${SERIES.map((s) => `${s.valor(d)} ${s.rotulo.toLowerCase()}`).join(", ")}`}
                >
                  {mostrarTotais && d.total > 0 ? (
                    <span
                      className="absolute inset-x-0 text-center text-[10px] font-semibold tabular-nums text-stone-700"
                      style={{ bottom: `calc(${(d.total / eixo.at(-1)!) * 100}% + 2px)` }}
                    >
                      {num(d.total)}
                    </span>
                  ) : null}
                  <div
                    className="flex w-full max-w-8 flex-col-reverse gap-[2px] overflow-hidden rounded-t group-hover:opacity-80 group-focus:opacity-80"
                    style={{ height: `${(d.total / eixo.at(-1)!) * 100}%` }}
                  >
                    <Segmentos g={d} direcao="coluna" />
                  </div>
                  <Dica titulo={rotuloDia(d.chave)} g={d} alinhar={i > dias.length / 2 ? "direita" : "esquerda"} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex gap-[2px] text-[10px] tabular-nums text-stone-500">
            {dias.map((d, i) => (
              <span key={d.chave} className="flex-1 text-center">
                {i % passo === 0 || i === dias.length - 1 ? rotuloDia(d.chave) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <TabelaGrupos grupos={dias} rotulo={(g) => rotuloDia(g.chave)} titulo="Dia" />
    </figure>
  );
}

/**
 * Barras horizontais empilhadas: uma linha por grupo (categoria, técnico, turno…),
 * comprimento = total, cores = composição por status. Ao lado: % no prazo e tempo.
 */
export function Composicao({
  grupos,
  rotulo = (g) => g.chave,
  vazio = "Sem chamados no período.",
}: {
  grupos: Grupo[];
  rotulo?: (g: Grupo) => string;
  vazio?: string;
}) {
  if (grupos.length === 0) return <p className="text-sm text-stone-500">{vazio}</p>;
  const maximo = Math.max(1, ...grupos.map((g) => g.total));
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {grupos.map((g, i) => (
          <li key={g.chave} tabIndex={0} className="group relative flex flex-col gap-1 outline-none">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-stone-900">{rotulo(g)}</span>
              <span className="shrink-0 text-xs text-stone-500">
                {g.finalizados > 0 ? `${formatarPct(pctDentro(g))} no prazo · ${formatarDuracao(g.tempo_medio_total)}` : "sem finalizados"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3.5 flex-1">
                <div
                  className="flex h-full gap-[2px] overflow-hidden rounded-r group-hover:opacity-80 group-focus:opacity-80"
                  style={{ width: `${Math.max(2, (g.total / maximo) * 100)}%` }}
                >
                  <Segmentos g={g} direcao="linha" />
                </div>
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-stone-900">{num(g.total)}</span>
            </div>
            <Dica titulo={rotulo(g)} g={g} lado={i < 2 ? "baixo" : "cima"} />
          </li>
        ))}
      </ul>
      <TabelaGrupos grupos={grupos} rotulo={rotulo} titulo="Grupo" />
    </div>
  );
}

/** Colunas por hora do dia (00–23h, Brasília): mostra os horários de pico. */
export function GraficoHoras({ horas }: { horas: Grupo[] }) {
  const maximo = Math.max(1, ...horas.map((h) => h.total));
  const eixo = marcas(maximo);
  const total = horas.reduce((t, h) => t + h.total, 0);
  const picos = horas.filter((h) => h.total > 0 && h.total === maximo);
  const faixa = (h: Grupo) => `${Number(h.chave)}h às ${Number(h.chave) + 1}h`;

  return (
    <figure className="flex flex-col gap-3">
      <p className="text-xs text-stone-600">
        {total > 0 ? (
          <>
            {picos.length === 1 ? "Horário" : "Horários"} com mais chamados:{" "}
            <strong className="text-stone-900">
              {picos.slice(0, 3).map(faixa).join(", ")}
              {picos.length > 3 ? ` e mais ${picos.length - 3}` : ""}
            </strong>{" "}
            ({num(maximo)} chamado{maximo === 1 ? "" : "s"} {picos.length === 1 ? "" : "em cada"})
          </>
        ) : (
          "Sem chamados no período."
        )}
      </p>
      <div className="flex gap-2">
        <div className="relative h-36 w-6 shrink-0 text-right text-[10px] tabular-nums text-stone-400" aria-hidden>
          {eixo.map((m) => (
            <span key={m} className="absolute right-0 -translate-y-1/2" style={{ bottom: `calc(${(m / eixo.at(-1)!) * 100}% - 0.5em)` }}>
              {num(m)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-36 border-b" style={{ borderColor: COR.base }}>
            {eixo.slice(1).map((m) => (
              <div
                key={m}
                className="absolute inset-x-0 border-t border-dashed"
                style={{ bottom: `${(m / eixo.at(-1)!) * 100}%`, borderColor: COR.grade }}
                aria-hidden
              />
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {horas.map((h, i) => (
                <div
                  key={h.chave}
                  tabIndex={0}
                  className="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end outline-none"
                  aria-label={`${Number(h.chave)}h: ${h.total} chamados`}
                >
                  <div
                    className="w-full max-w-6 rounded-t group-hover:opacity-80 group-focus:opacity-80"
                    style={{ height: `${(h.total / eixo.at(-1)!) * 100}%`, background: COR.barra }}
                  />
                  <Dica titulo={`${Number(h.chave)}h–${Number(h.chave) + 1}h`} g={h} alinhar={i > 12 ? "direita" : "esquerda"} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex gap-[2px] text-[10px] tabular-nums text-stone-500">
            {horas.map((h, i) => (
              <span key={h.chave} className="flex-1 text-center">
                {i % 3 === 0 ? `${Number(h.chave)}h` : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

/** "Ver em tabela": os números exatos por trás do gráfico (acessível e para conferência). */
function TabelaGrupos({ grupos, rotulo, titulo }: { grupos: Grupo[]; rotulo: (g: Grupo) => string; titulo: string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-marca-700">Ver em tabela</summary>
      <div className="mt-2 max-h-72 overflow-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <thead className="sticky top-0 bg-white text-stone-500">
            <tr>
              <th className="py-1 pr-2">{titulo}</th>
              <th className="pr-2">Total</th>
              {SERIES.map((s) => (
                <th key={s.chave} className="pr-2">
                  {s.curto}
                </th>
              ))}
              <th className="pr-2">% no prazo</th>
              <th className="pr-2">Tempo médio</th>
              <th>Até assumir</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <tr key={g.chave} className="border-t border-stone-100">
                <td className="py-1 pr-2">{rotulo(g)}</td>
                <td className="pr-2 font-semibold">{num(g.total)}</td>
                {SERIES.map((s) => (
                  <td key={s.chave} className="pr-2">
                    {num(s.valor(g))}
                  </td>
                ))}
                <td className="pr-2">{formatarPct(pctDentro(g))}</td>
                <td className="pr-2">{formatarDuracao(g.tempo_medio_total)}</td>
                <td>{formatarDuracao(g.tempo_medio_assumir)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
