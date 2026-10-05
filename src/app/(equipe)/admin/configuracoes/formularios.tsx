"use client";

import { useActionState, useState } from "react";
import { enviarSemReset } from "@/components/envio";
import { Alerta, Botao, Campo } from "@/components/ui";
import { criarCategoria, salvarCategoria, salvarSla, salvarTurnos, type Estado } from "./actions";

function Mensagens({ estado }: { estado: Estado }) {
  if (estado.erro) return <Alerta>{estado.erro}</Alerta>;
  if (estado.ok) return <Alerta tipo="sucesso">{estado.ok}</Alerta>;
  return null;
}

export function FormSla({ sla, alerta }: { sla: number; alerta: number }) {
  const [estado, acao, pendente] = useActionState(salvarSla, {} as Estado);
  return (
    <form onSubmit={enviarSemReset(acao)} className="flex flex-col gap-4">
      <Mensagens estado={estado} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="sla" name="sla_minutos" type="number" min={5} max={10080} rotulo="Prazo de atendimento (minutos)" defaultValue={sla} ajuda="Padrão: 120 (2 horas)." required />
        <Campo id="alerta" name="alerta_minutos_antes" type="number" min={1} max={1440} rotulo="Alertar quantos minutos antes do prazo" defaultValue={alerta} ajuda="Padrão: 30." required />
      </div>
      <Botao type="submit" disabled={pendente} className="w-fit">
        Salvar
      </Botao>
    </form>
  );
}

export function FormCategoria({ categoria }: { categoria: { id: number; nome: string; ativo: boolean; ordem: number } }) {
  const [estado, acao, pendente] = useActionState(salvarCategoria, {} as Estado);
  return (
    <form onSubmit={enviarSemReset(acao)} className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3">
      <input type="hidden" name="id" value={categoria.id} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <Campo id={`cat-${categoria.id}`} name="nome" rotulo="Nome" defaultValue={categoria.nome} required />
        </div>
        <div className="w-20">
          <Campo id={`ord-${categoria.id}`} name="ordem" type="number" min={0} max={999} rotulo="Ordem" defaultValue={categoria.ordem} />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={categoria.ativo} className="h-5 w-5" />
          Ativa
        </label>
        <Botao type="submit" variante="secundario" disabled={pendente}>
          Salvar
        </Botao>
      </div>
      <Mensagens estado={estado} />
    </form>
  );
}

export function FormNovaCategoria() {
  const [estado, acao, pendente] = useActionState(criarCategoria, {} as Estado);
  return (
    <form action={acao} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <Campo id="nova-categoria" name="nome" rotulo="Nova categoria" required />
        </div>
        <Botao type="submit" disabled={pendente}>
          Adicionar
        </Botao>
      </div>
      <Mensagens estado={estado} />
    </form>
  );
}

type Turno = { chave: number; nome: string; inicio: string; fim: string };

export function EditorTurnos({ turnos }: { turnos: Omit<Turno, "chave">[] }) {
  const [estado, acao, pendente] = useActionState(salvarTurnos, {} as Estado);
  const [linhas, setLinhas] = useState<Turno[]>(() => turnos.map((t, i) => ({ ...t, chave: i })));

  return (
    <form onSubmit={enviarSemReset(acao)} className="flex flex-col gap-3">
      <Mensagens estado={estado} />
      {linhas.map((t, i) => (
        <div key={t.chave} className="flex flex-wrap items-end gap-2 rounded-lg border border-stone-200 p-3">
          <div className="min-w-36 flex-1">
            <Campo id={`tn-${t.chave}`} name="nome" rotulo="Nome" defaultValue={t.nome} required />
          </div>
          <div className="w-28">
            <Campo id={`ti-${t.chave}`} name="inicio" type="time" rotulo="Início" defaultValue={t.inicio} required />
          </div>
          <div className="w-28">
            <Campo id={`tf-${t.chave}`} name="fim" type="time" rotulo="Fim" defaultValue={t.fim} required />
          </div>
          <Botao
            type="button"
            variante="secundario"
            aria-label={`Remover turno ${i + 1}`}
            disabled={linhas.length === 1}
            onClick={() => setLinhas((l) => l.filter((x) => x.chave !== t.chave))}
          >
            Remover
          </Botao>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Botao
          type="button"
          variante="secundario"
          onClick={() => setLinhas((l) => [...l, { chave: Math.max(-1, ...l.map((x) => x.chave)) + 1, nome: "", inicio: "00:00", fim: "00:00" }])}
        >
          Adicionar turno
        </Botao>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar turnos"}
        </Botao>
      </div>
    </form>
  );
}
