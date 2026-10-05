"use client";

import { useState, useSyncExternalStore } from "react";
import { Botao } from "@/components/ui";
import { alertasAtivados, ativarAlertas, desativarAlertas, notificarSistema, piscarTitulo, tocarSom } from "@/components/alertas";
import { useAgora, useChamadosTempoReal } from "@/components/tempo-real";
import { CartaoChamado } from "./cartao-chamado";
import type { ChamadoCompleto } from "@/lib/chamados/tipos";

type Aviso = { id: string; numero: string; local: string };

// Estado de "alertas ativados" vem do localStorage; useSyncExternalStore evita
// diferenÃ§a entre o HTML do servidor e o do cliente.
const ouvintes = new Set<() => void>();
function assinar(fn: () => void) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
function avisarMudanca() {
  ouvintes.forEach((fn) => fn());
}

export function Fila({
  chamados,
  agoraServidor,
  limitado,
}: {
  chamados: ChamadoCompleto[];
  agoraServidor: number;
  limitado: boolean;
}) {
  const agora = useAgora(agoraServidor);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [novos, setNovos] = useState<Set<string>>(new Set());
  const ativados = useSyncExternalStore(assinar, alertasAtivados, () => false);

  const conectado = useChamadosTempoReal((evento) => {
    if (evento.eventType !== "INSERT") return;
    const c = evento.new;
    const aviso = { id: c.id, numero: c.numero, local: c.local };
    setAvisos((lista) => [aviso, ...lista].slice(0, 3));
    setNovos((s) => new Set(s).add(c.id));
    setTimeout(() => {
      setAvisos((lista) => lista.filter((a) => a.id !== c.id));
      setNovos((s) => {
        const n = new Set(s);
        n.delete(c.id);
        return n;
      });
    }, 15_000);
    tocarSom();
    notificarSistema(`Novo chamado ${c.numero}`, c.local, `/painel/${c.numero}`);
    piscarTitulo(`ðŸ”” Novo chamado ${c.numero}`);
  });

  const atrasados = chamados.filter(
    (c) => (c.status === "aberto" || c.status === "em_andamento") && new Date(c.prazo_limite).getTime() < agora,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-zinc-600">
          <span className={`h-2 w-2 rounded-full ${conectado ? "bg-green-500" : "bg-zinc-400"}`} aria-hidden />
          {conectado ? "Atualizando em tempo real" : "Conectandoâ€¦"}
        </span>
        <span className="text-zinc-600">
          {chamados.length} chamado{chamados.length === 1 ? "" : "s"}
          {atrasados > 0 ? <strong className="ml-1 text-red-700">Â· {atrasados} atrasado{atrasados === 1 ? "" : "s"}</strong> : null}
        </span>
        <div className="ml-auto">
          {ativados ? (
            <Botao
              type="button"
              variante="secundario"
              onClick={() => {
                desativarAlertas();
                avisarMudanca();
              }}
            >
              ðŸ”” Alertas ativados
            </Botao>
          ) : (
            <Botao
              type="button"
              onClick={async () => {
                await ativarAlertas();
                avisarMudanca();
              }}
            >
              ðŸ”• Ativar alertas sonoros
            </Botao>
          )}
        </div>
      </div>

      {avisos.length > 0 ? (
        <div className="sticky top-14 z-10 flex flex-col gap-2" role="status" aria-live="assertive">
          {avisos.map((a) => (
            <a
              key={a.id}
              href={`/painel/${a.numero}`}
              className="rounded-xl bg-blue-700 px-4 py-3 text-white shadow-lg"
            >
              <strong>Novo chamado {a.numero}</strong> Â· {a.local}
            </a>
          ))}
        </div>
      ) : null}

      {chamados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">
          Nenhum chamado com esses filtros.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {chamados.map((c) => (
            <CartaoChamado key={c.id} chamado={c} agora={agora} novo={novos.has(c.id)} />
          ))}
        </ul>
      )}
      {limitado ? <p className="text-center text-xs text-zinc-500">Mostrando os 300 primeiros. Refine os filtros.</p> : null}
    </div>
  );
}
