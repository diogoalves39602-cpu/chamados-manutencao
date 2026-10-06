import { formatarDuracao } from "@/lib/chamados/rotulos";
import { formatarPct, pctDentro, type Grupo } from "@/lib/indicadores-calculo";

// Gráficos em HTML/CSS (sem biblioteca): leves no celular e renderizados no servidor.
// Cores validadas para daltonismo (azul × laranja, ΔE CVD 24,7). Ver README › Indicadores.
export const COR = {
  dentro: "#2a78d6",
  fora: "#eb6834",
  pendente: "#c3c2b7",
  barra: "#2a78d6",
  grade: "#e1e0d9",
} as const;

const num = (n: number) => n.toLocaleString("pt-BR");

function Legenda({ itens }: { itens: { cor: string; rotulo: string }[] }) {
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

function rotuloDia(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** Colunas empilhadas por dia: no prazo × fora do prazo × ainda em aberto. */
export function GraficoDiario({ dias }: { dias: Grupo[] }) {
  const maximo = Math.max(1, ...dias.map((d) => d.dentro + d.fora + d.abertos + d.em_andamento));
  const passo = Math.max(1, Math.ceil(dias.length / 8)); // ~8 rótulos no eixo
  const segmentos = (d: Grupo) => [
    { valor: d.dentro, cor: COR.dentro, rotulo: "No prazo" },
    { valor: d.fora, cor: COR.fora, rotulo: "Fora do prazo" },
    { valor: d.abertos + d.em_andamento, cor: COR.pendente, rotulo: "Em aberto" },
  ];

  return (
    <figure className="flex flex-col gap-3">
      <Legenda
        itens={[
          { cor: COR.dentro, rotulo: "Finalizados no prazo" },
          { cor: COR.fora, rotulo: "Finalizados fora do prazo" },
          { cor: COR.pendente, rotulo: "Ainda em aberto" },
        ]}
      />
      <div className="relative">
        <div className="absolute inset-x-0 top-0 border-t" style={{ borderColor: COR.grade }} aria-hidden />
        <span className="absolute -top-2 right-0 bg-white pl-1 text-[10px] tabular-nums text-stone-400">{num(maximo)}</span>
        <div className="flex h-44 items-end gap-[2px] border-b" style={{ borderColor: COR.pendente }}>
          {dias.map((d) => {
            const total = d.dentro + d.fora + d.abertos + d.em_andamento;
            return (
              <div
                key={d.chave}
                tabIndex={0}
                className="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end outline-none"
                aria-label={`${rotuloDia(d.chave)}: ${d.dentro} no prazo, ${d.fora} fora, ${d.abertos + d.em_andamento} em aberto`}
              >
                <div
                  className="flex w-full max-w-6 flex-col-reverse gap-[2px] overflow-hidden rounded-t group-hover:opacity-80 group-focus:opacity-80"
                  style={{ height: `${(total / maximo) * 100}%` }}
                >
                  {segmentos(d).map((s) =>
                    s.valor > 0 ? <div key={s.rotulo} style={{ background: s.cor, flexGrow: s.valor }} /> : null,
                  )}
                </div>
                {/* Tooltip (hover no computador, toque/foco no celular) */}
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden w-40 rounded-lg border border-stone-200 bg-white p-2 text-xs shadow-lg group-hover:block group-focus:block">
                  <p className="font-semibold text-stone-900">{rotuloDia(d.chave)} · {num(d.total)} chamados</p>
                  {segmentos(d).map((s) => (
                    <p key={s.rotulo} className="flex items-center justify-between gap-2 text-stone-600">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm" style={{ background: s.cor }} aria-hidden />
                        {s.rotulo}
                      </span>
                      <span className="tabular-nums text-stone-900">{num(s.valor)}</span>
                    </p>
                  ))}
                  {d.cancelados ? <p className="text-stone-500">Reprovados: {num(d.cancelados)}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-[2px] text-[10px] tabular-nums text-stone-500">
          {dias.map((d, i) => (
            <span key={d.chave} className="flex-1 text-center">
              {i % passo === 0 || i === dias.length - 1 ? rotuloDia(d.chave) : ""}
            </span>
          ))}
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-marca-700">Ver em tabela</summary>
        <div className="mt-2 max-h-72 overflow-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="sticky top-0 bg-white text-stone-500">
              <tr>
                <th className="py-1">Dia</th>
                <th>Total</th>
                <th>No prazo</th>
                <th>Fora</th>
                <th>Em aberto</th>
                <th>% no prazo</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => (
                <tr key={d.chave} className="border-t border-stone-100">
                  <td className="py-1">{rotuloDia(d.chave)}</td>
                  <td>{num(d.total)}</td>
                  <td>{num(d.dentro)}</td>
                  <td>{num(d.fora)}</td>
                  <td>{num(d.abertos + d.em_andamento)}</td>
                  <td>{formatarPct(pctDentro(d))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Barras horizontais: total de chamados por item, com % no prazo e tempo médio ao lado. */
export function Ranking({ grupos, vazio = "Sem dados no período." }: { grupos: Grupo[]; vazio?: string }) {
  if (grupos.length === 0) return <p className="text-sm text-stone-500">{vazio}</p>;
  const maximo = Math.max(1, ...grupos.map((g) => g.total));
  return (
    <ul className="flex flex-col gap-3">
      {grupos.map((g) => (
        <li key={g.chave} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-stone-900">{g.chave}</span>
            <span className="shrink-0 text-xs text-stone-500">
              {formatarPct(pctDentro(g))} no prazo · {formatarDuracao(g.tempo_medio_total)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 flex-1">
              <div
                className="h-full rounded-r"
                style={{ width: `${Math.max(2, (g.total / maximo) * 100)}%`, background: COR.barra }}
                title={`${g.total} chamados · ${g.finalizados} finalizados · ${g.dentro} no prazo · ${g.fora} fora`}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm tabular-nums text-stone-900">{num(g.total)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
