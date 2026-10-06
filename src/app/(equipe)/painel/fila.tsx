"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Bell, BellOff, BellRing, Hourglass, Inbox, Search, SearchX, TriangleAlert, UserCheck, X } from "lucide-react";
import { alertasAtivados, ativarAlertas, desativarAlertas, notificarSistema, piscarTitulo, tocarSom } from "@/components/alertas";
import { useAgora, useChamadosTempoReal } from "@/components/tempo-real";
import { Botao, Vazio } from "@/components/ui";
import type { ChamadoCompleto } from "@/lib/chamados/tipos";
import { CartaoChamado } from "./cartao-chamado";

type Aviso = { id: string; numero: string; local: string };

// Estado de "alertas ativados" vem do localStorage; useSyncExternalStore evita
// diferença entre o HTML do servidor e o do cliente.
const ouvintes = new Set<() => void>();
function assinar(fn: () => void) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
function avisarMudanca() {
  ouvintes.forEach((fn) => fn());
}

function semAcento(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function Contador({
  icone: Icone,
  rotulo,
  valor,
  tom,
  ativo,
  onClick,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: number;
  tom: "neutro" | "vermelho" | "amarelo" | "marca";
  ativo?: boolean;
  onClick?: () => void;
}) {
  const tons = {
    neutro: "bg-white text-stone-800 border-stone-200",
    vermelho: valor > 0 ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25" : "bg-white text-stone-800 border-stone-200",
    amarelo: valor > 0 ? "bg-amber-50 text-amber-900 border-amber-300" : "bg-white text-stone-800 border-stone-200",
    marca: "bg-white text-stone-800 border-stone-200",
  };
  const Elemento = onClick ? "button" : "div";
  return (
    <Elemento
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? ativo : undefined}
      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-shadow ${tons[tom]} ${
        ativo ? "ring-2 ring-marca-600 ring-offset-2" : ""
      } ${onClick ? "hover:shadow-md" : ""}`}
    >
      <Icone className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none">{valor}</span>
        <span className="mt-1 block truncate text-xs font-medium opacity-80">{rotulo}</span>
      </span>
    </Elemento>
  );
}

export function Fila({
  chamados,
  agoraServidor,
  limitado,
  meuId,
  ehAdmin,
  apenasFila,
}: {
  chamados: ChamadoCompleto[];
  agoraServidor: number;
  limitado: boolean;
  meuId: string;
  ehAdmin: boolean;
  apenasFila: boolean;
}) {
  const agora = useAgora(agoraServidor);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [novos, setNovos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [soMeus, setSoMeus] = useState(false);
  const ativados = useSyncExternalStore(assinar, alertasAtivados, () => false);

  const conectado = useChamadosTempoReal((evento) => {
    if (evento.eventType !== "INSERT") return;
    const c = evento.new;
    setAvisos((lista) => [{ id: c.id, numero: c.numero, local: c.local }, ...lista].slice(0, 3));
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
    piscarTitulo(`🔔 Novo chamado ${c.numero}`);
  });

  const ativos = chamados.filter((c) => c.status === "aberto" || c.status === "em_andamento");
  const atrasados = ativos.filter((c) => new Date(c.prazo_limite).getTime() < agora).length;
  const pertoDoPrazo = ativos.filter((c) => {
    const resta = new Date(c.prazo_limite).getTime() - agora;
    return resta >= 0 && resta < 60 * 60 * 1000;
  }).length;
  const semResponsavel = ativos.filter((c) => !c.recebido_por).length;
  const meus = chamados.filter((c) => c.recebido_por === meuId).length;

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim());
    return chamados.filter((c) => {
      if (soMeus && c.recebido_por !== meuId) return false;
      if (!termo) return true;
      return semAcento(
        [c.numero, c.local, c.solicitante_nome, c.solicitante_setor, c.categoria?.nome, c.recebido?.nome, c.descricao].join(" "),
      ).includes(termo);
    });
  }, [chamados, busca, soMeus, meuId]);

  return (
    <div className="flex flex-col gap-4">
      {apenasFila ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Contador icone={Inbox} rotulo="Na fila" valor={ativos.length} tom="neutro" />
          <Contador icone={TriangleAlert} rotulo="Atrasados" valor={atrasados} tom="vermelho" />
          <Contador icone={Hourglass} rotulo="Menos de 1h" valor={pertoDoPrazo} tom="amarelo" />
          <Contador icone={UserCheck} rotulo="Sem responsável" valor={semResponsavel} tom="marca" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número, local, pessoa…"
            aria-label="Buscar chamados"
            className="min-h-11 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-9 text-base outline-none focus:border-marca-600 focus:ring-4 focus:ring-marca-100"
          />
          {busca ? (
            <button
              type="button"
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-stone-400 hover:text-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <Botao
          type="button"
          variante={soMeus ? "primario" : "secundario"}
          icone={UserCheck}
          onClick={() => setSoMeus((v) => !v)}
          aria-pressed={soMeus}
        >
          Só os meus ({meus})
        </Botao>
        {ativados ? (
          <Botao
            type="button"
            variante="secundario"
            icone={BellRing}
            onClick={() => {
              desativarAlertas();
              avisarMudanca();
            }}
            title="Desativar alertas sonoros"
          >
            Alertas ligados
          </Botao>
        ) : (
          <Botao
            type="button"
            icone={BellOff}
            onClick={async () => {
              await ativarAlertas();
              avisarMudanca();
            }}
          >
            Ativar alertas sonoros
          </Botao>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-stone-500">
        <span className={`h-2 w-2 rounded-full ${conectado ? "animate-pulse bg-emerald-500" : "bg-stone-300"}`} aria-hidden />
        {conectado ? "Atualizando em tempo real" : "Conectando…"} · {visiveis.length} de {chamados.length} chamado
        {chamados.length === 1 ? "" : "s"}
      </p>

      {avisos.length > 0 ? (
        <div className="sticky top-16 z-10 flex flex-col gap-2" role="status" aria-live="assertive">
          {avisos.map((a) => (
            <Link
              key={a.id}
              href={`/painel/${a.numero}`}
              className="flex animate-entrar items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-white shadow-xl"
            >
              <Bell className="h-5 w-5 shrink-0 text-marca-300" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                <strong>Novo chamado {a.numero}</strong> · {a.local}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {visiveis.length === 0 ? (
        busca || soMeus ? (
          <Vazio icone={SearchX} titulo="Nada encontrado">
            {busca && apenasFila ? (
              <Link href="?status=todos" className="font-semibold text-marca-700 hover:underline">
                Buscar também nos finalizados
              </Link>
            ) : (
              "Tente outro termo ou limpe os filtros."
            )}
          </Vazio>
        ) : (
          <Vazio icone={Inbox} titulo={apenasFila ? "Fila vazia" : "Nenhum chamado"}>
            {apenasFila ? "Nenhum chamado aguardando atendimento. 🎉" : "Nenhum chamado com esses filtros."}
          </Vazio>
        )
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visiveis.map((c) => (
            <CartaoChamado key={c.id} chamado={c} agora={agora} novo={novos.has(c.id)} meu={c.recebido_por === meuId} ehAdmin={ehAdmin} />
          ))}
        </ul>
      )}
      {limitado ? <p className="text-center text-xs text-stone-500">Mostrando os 300 primeiros. Refine os filtros.</p> : null}
    </div>
  );
}
