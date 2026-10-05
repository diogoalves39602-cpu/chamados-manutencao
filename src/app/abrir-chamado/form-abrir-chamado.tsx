"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Alerta, Botao, Campo, Cartao, Selecao } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { abrirChamado, type EstadoAbrir } from "./actions";
import { comprimirFoto } from "./comprimir";

const CHAVE_LOCAL = "chamados:solicitante";
const CAMPOS_LEMBRADOS = ["solicitante_nome", "solicitante_setor", "solicitante_contato"] as const;

export function FormAbrirChamado({ categorias }: { categorias: { id: number; nome: string }[] }) {
  const [estado, acao, pendente] = useActionState(abrirChamado, {} as EstadoAbrir);
  const [erroFoto, setErroFoto] = useState<string>();
  const [preparando, setPreparando] = useState(false);
  const [previa, setPrevia] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);

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
      <Cartao className="flex flex-col gap-4 text-center">
        <p className="text-sm font-medium text-green-700">Chamado registrado!</p>
        <p className="text-4xl font-bold tracking-tight text-zinc-900">{estado.sucesso.numero}</p>
        <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
          <p>Aberto em {formatarDataHora(estado.sucesso.aberto_em)}</p>
          <p className="mt-1 text-base font-semibold text-zinc-900">
            Prazo limite: {formatarDataHora(estado.sucesso.prazo_limite)}
          </p>
        </div>
        <p className="text-sm text-zinc-600">
          Anote o número para acompanhar com a equipe de manutenção. A equipe já foi avisada.
        </p>
        <Botao type="button" variante="secundario" onClick={() => window.location.reload()}>
          Abrir outro chamado
        </Botao>
      </Cartao>
    );
  }

  const ocupado = pendente || preparando;

  return (
    <Cartao>
      <form ref={formRef} onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {estado.erro ? <Alerta>{estado.erro}</Alerta> : null}

        {/* Honeypot anti-robô: invisível para pessoas. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">Não preencha</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <Campo id="solicitante_nome" name="solicitante_nome" rotulo="Seu nome" autoComplete="name" required maxLength={120} erro={estado.erros?.solicitante_nome} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="solicitante_setor" name="solicitante_setor" rotulo="Setor" required maxLength={80} erro={estado.erros?.solicitante_setor} />
          <Campo
            id="solicitante_contato"
            name="solicitante_contato"
            rotulo="Telefone ou e-mail"
            autoComplete="tel"
            required
            maxLength={120}
            erro={estado.erros?.solicitante_contato}
          />
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
        <div className="flex flex-col gap-1">
          <Selecao id="categoria_id" name="categoria_id" rotulo="Categoria" required defaultValue="">
            <option value="" disabled>
              Selecione…
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
          {estado.erros?.categoria_id ? <p className="text-xs text-red-600">{estado.erros.categoria_id}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="descricao" className="text-sm font-medium text-zinc-800">
            Descreva o problema
          </label>
          <textarea
            id="descricao"
            name="descricao"
            rows={4}
            required
            maxLength={4000}
            aria-invalid={estado.erros?.descricao ? true : undefined}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 aria-invalid:border-red-500"
          />
          {estado.erros?.descricao ? <p className="text-xs text-red-600">{estado.erros.descricao}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="foto" className="text-sm font-medium text-zinc-800">
            Foto (opcional)
          </label>
          <input
            id="foto"
            name="foto"
            type="file"
            accept="image/*"
            className="text-sm text-zinc-700 file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:text-sm file:font-semibold file:text-zinc-800"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPrevia(f ? URL.createObjectURL(f) : undefined);
            }}
          />
          {previa ? (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:), sem otimização
            <img src={previa} alt="Prévia da foto" className="max-h-48 w-fit rounded-lg border border-zinc-200 object-contain" />
          ) : null}
          {erroFoto || estado.erros?.foto ? <p className="text-xs text-red-600">{erroFoto ?? estado.erros?.foto}</p> : null}
        </div>

        <Botao type="submit" disabled={ocupado} className="min-h-12 text-base">
          {preparando ? "Preparando foto…" : pendente ? "Enviando…" : "Enviar chamado"}
        </Botao>
      </form>
    </Cartao>
  );
}
