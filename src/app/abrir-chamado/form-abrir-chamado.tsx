"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { BadgeCheck, CircleCheckBig, ImagePlus, Search, Send, X } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { AreaTexto, Alerta, Botao, Campo, Cartao } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { PLATAFORMAS, type Plataforma } from "@/lib/solicitante/plataformas";
import { abrirChamado, type EstadoAbrir } from "./actions";
import { comprimirFoto } from "./comprimir";

const CHAVE_LOCAL = "chamados:solicitante";
const CAMPOS_LEMBRADOS = ["solicitante_nome", "solicitante_setor", "solicitante_contato"] as const;

function TituloSecao({ numero, children }: { numero: number; children: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-marca-700 text-xs text-white">{numero}</span>
      {children}
    </h2>
  );
}

export function FormAbrirChamado({
  categorias,
  identidade,
}: {
  categorias: { id: number; nome: string }[];
  identidade?: { nome: string; plataforma: Plataforma; contato: string };
}) {
  const [estado, acao, pendente] = useActionState(abrirChamado, {} as EstadoAbrir);
  const [erroFoto, setErroFoto] = useState<string>();
  const [preparando, setPreparando] = useState(false);
  const [previa, setPrevia] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  // Preenche nome/setor/contato usados da última vez neste aparelho.
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_LOCAL) ?? "{}") as Record<string, string>;
      for (const campo of CAMPOS_LEMBRADOS) {
        const input = formRef.current?.elements.namedItem(campo) as HTMLInputElement | null;
        if (input && !input.value && salvo[campo]) input.value = salvo[campo];
      }
    } catch {
      // armazenamento indisponível (aba anônima): segue sem preencher
    }
  }, [estado.sucesso]);

  useEffect(() => () => (previa ? URL.revokeObjectURL(previa) : undefined), [previa]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setErroFoto(undefined);

    const foto = dados.get("foto");
    if (foto instanceof File && foto.size > 0) {
      setPreparando(true);
      try {
        dados.set("foto", await comprimirFoto(foto));
      } catch {
        setPreparando(false);
        setErroFoto("Não foi possível ler esta imagem. Tire outra foto ou envie sem foto.");
        return;
      }
      setPreparando(false);
    }

    try {
      localStorage.setItem(
        CHAVE_LOCAL,
        JSON.stringify(Object.fromEntries(CAMPOS_LEMBRADOS.map((c) => [c, String(dados.get(c) ?? "")]))),
      );
    } catch {
      // ignora
    }
    startTransition(() => acao(dados));
  }

  if (estado.sucesso) {
    return (
      <Cartao className="flex animate-entrar flex-col items-center gap-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CircleCheckBig className="h-9 w-9" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-stone-600">Chamado registrado com sucesso</p>
          <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-stone-900">{estado.sucesso.numero}</p>
        </div>
        <div className="w-full rounded-xl bg-marca-50 p-4 text-sm text-stone-700">
          <p>Aberto em {formatarDataHora(estado.sucesso.aberto_em)}</p>
          <p className="mt-1 text-base font-semibold text-marca-800">
            Prazo limite: {formatarDataHora(estado.sucesso.prazo_limite)}
          </p>
        </div>
        <p className="text-sm text-stone-600">
          A equipe já foi avisada. Anote o número para acompanhar o andamento.
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Link
            href={`/acompanhar?numero=${estado.sucesso.numero}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-marca-700 px-4 text-sm font-semibold text-white hover:bg-marca-800"
          >
            <Search className="h-4 w-4" aria-hidden />
            Acompanhar este chamado
          </Link>
          <Botao type="button" variante="secundario" className="flex-1" onClick={() => window.location.reload()}>
            Abrir outro chamado
          </Botao>
        </div>
      </Cartao>
    );
  }

  const ocupado = pendente || preparando;

  return (
    <Cartao className="animate-entrar">
      {identidade ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
            <BadgeCheck className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-emerald-950">{identidade.nome}</p>
            <p className="text-xs text-emerald-800">Identificado pela conta do {PLATAFORMAS[identidade.plataforma].nome}</p>
          </div>
          <form action="/auth/sair" method="post">
            <button type="submit" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
              Não é você?
            </button>
          </form>
        </div>
      ) : null}
      <form ref={formRef} onSubmit={enviar} className="flex flex-col gap-6" noValidate>
        {estado.erro ? <Alerta>{estado.erro}</Alerta> : null}

        {/* Honeypot anti-robô: invisível para pessoas. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">Não preencha</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <fieldset className="flex flex-col gap-4">
          <legend className="contents">
            <TituloSecao numero={1}>Seus dados</TituloSecao>
          </legend>
          {identidade ? null : (
            <Campo id="solicitante_nome" name="solicitante_nome" rotulo="Seu nome" autoComplete="name" required maxLength={120} erro={estado.erros?.solicitante_nome} />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="solicitante_setor" name="solicitante_setor" rotulo="Setor" required maxLength={80} erro={estado.erros?.solicitante_setor} />
            <Campo
              id="solicitante_contato"
              name="solicitante_contato"
              rotulo="Telefone ou e-mail"
              autoComplete="tel"
              required
              maxLength={120}
              defaultValue={identidade?.contato || undefined}
              ajuda={identidade ? "Para a equipe falar com você durante o atendimento." : undefined}
              erro={estado.erros?.solicitante_contato}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="contents">
            <TituloSecao numero={2}>O problema</TituloSecao>
          </legend>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-800">Categoria</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Categoria">
              {categorias.map((c) => (
                <label key={c.id} className="cursor-pointer">
                  <input type="radio" name="categoria_id" value={c.id} className="peer sr-only" required />
                  <span className="flex min-h-14 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-marca-300 peer-checked:border-marca-700 peer-checked:bg-marca-700 peer-checked:text-white peer-checked:shadow-md peer-focus-visible:ring-4 peer-focus-visible:ring-marca-200">
                    <IconeCategoria nome={c.nome} className="h-5 w-5 shrink-0" />
                    <span className="leading-tight">{c.nome}</span>
                  </span>
                </label>
              ))}
            </div>
            {estado.erros?.categoria_id ? <p className="text-xs font-medium text-red-600">{estado.erros.categoria_id}</p> : null}
          </div>
          <Campo
            id="local"
            name="local"
            rotulo="Local do problema"
            placeholder="Ex.: Bloco B, 2º andar, sala 204"
            required
            maxLength={160}
            erro={estado.erros?.local}
          />
          <AreaTexto
            id="descricao"
            name="descricao"
            rotulo="Descreva o problema"
            placeholder="O que está acontecendo? Desde quando?"
            rows={4}
            required
            maxLength={4000}
            erro={estado.erros?.descricao}
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-stone-800">Foto (opcional)</span>
            <input
              ref={fotoRef}
              id="foto"
              name="foto"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPrevia(f ? URL.createObjectURL(f) : undefined);
              }}
            />
            {previa ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:), sem otimização */}
                <img src={previa} alt="Prévia da foto" className="max-h-56 rounded-xl border border-stone-200 object-contain" />
                <button
                  type="button"
                  aria-label="Remover foto"
                  className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-stone-900 text-white shadow"
                  onClick={() => {
                    if (fotoRef.current) fotoRef.current.value = "";
                    setPrevia(undefined);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="foto"
                className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-sm text-stone-600 transition-colors hover:border-marca-300 hover:bg-marca-50 hover:text-marca-800"
              >
                <ImagePlus className="h-6 w-6" aria-hidden />
                Tirar foto ou escolher da galeria
              </label>
            )}
            {erroFoto || estado.erros?.foto ? <p className="text-xs font-medium text-red-600">{erroFoto ?? estado.erros?.foto}</p> : null}
          </div>
        </fieldset>

        <Botao type="submit" disabled={ocupado} icone={Send} className="min-h-12 text-base">
          {preparando ? "Preparando foto…" : pendente ? "Enviando…" : "Enviar chamado"}
        </Botao>
      </form>
    </Cartao>
  );
}
