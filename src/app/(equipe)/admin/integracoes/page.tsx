import type { Metadata } from "next";
import { Plug } from "lucide-react";
import { Botao, CabecalhoPagina, Cartao } from "@/components/ui";
import { ROTULO_ORIGEM } from "@/lib/chamados/rotulos";
import { formatarDataHora } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { urlBase } from "@/lib/url";
import { revogarToken } from "./actions";
import { FormNovoToken } from "./form-novo-token";

export const metadata: Metadata = { title: "Integrações" };

export default async function PaginaIntegracoes() {
  const supabase = await criarClienteServidor();
  const { data: tokens } = await supabase
    .from("tokens_integracao")
    .select("id, nome, origem, prefixo, ativo, criado_em, ultimo_uso_em, revogado_em")
    .order("ativo", { ascending: false })
    .order("criado_em", { ascending: false });
  const url = `${await urlBase()}/api/chamados/webhook`;

  const exemplo = JSON.stringify(
    {
      solicitante_nome: "Maria Souza",
      solicitante_setor: "RH",
      solicitante_contato: "11 99999-0000",
      local: "Bloco B, sala 204",
      categoria: "Elétrica",
      descricao: "Tomada soltando faísca",
    },
    null,
    2,
  );

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        icone={Plug}
        titulo="Integrações"
        subtitulo="Automações do Base do Feishu ou do Lark (e ferramentas como n8n) abrem chamados por este endpoint. Cada canal tem seu próprio token, que define a origem gravada no chamado."
      />

      <Cartao className="flex flex-col gap-3">
        <h2 className="font-semibold">Endpoint</h2>
        <code className="break-all rounded-lg bg-stone-100 px-3 py-2 font-mono text-sm">POST {url}</code>
        <p className="text-sm text-stone-700">
          Headers: <code className="font-mono">Authorization: Bearer &lt;token&gt;</code> e{" "}
          <code className="font-mono">Content-Type: application/json</code>. Corpo:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-stone-900 p-3 font-mono text-xs text-stone-100">{exemplo}</pre>
        <p className="text-xs text-stone-500">
          Também aceita os nomes curtos <code>nome</code>, <code>setor</code>, <code>contato</code>,{" "}
          <code>problema</code> e <code>foto_url</code>. Categoria desconhecida vira “Outros”. Resposta 201 traz{" "}
          <code>numero</code> e <code>prazo_limite</code>.
        </p>
      </Cartao>

      <Cartao>
        <h2 className="mb-4 font-semibold">Novo token</h2>
        <FormNovoToken />
      </Cartao>

      <Cartao className="p-0 sm:p-0">
        <h2 className="border-b border-stone-200 px-4 py-3 font-semibold sm:px-6">Tokens</h2>
        {!tokens?.length ? <p className="px-4 py-4 text-sm text-stone-500 sm:px-6">Nenhum token criado.</p> : null}
        <ul className="divide-y divide-stone-200">
          {tokens?.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${t.ativo ? "" : "text-stone-400 line-through"}`}>
                  {t.nome} <span className="text-xs font-normal text-stone-500">· {ROTULO_ORIGEM[t.origem]}</span>
                </p>
                <p className="font-mono text-xs text-stone-500">{t.prefixo}…</p>
                <p className="text-xs text-stone-500">
                  Criado {formatarDataHora(t.criado_em)} · Último uso {formatarDataHora(t.ultimo_uso_em)}
                  {t.revogado_em ? ` · Revogado ${formatarDataHora(t.revogado_em)}` : ""}
                </p>
              </div>
              {t.ativo ? (
                <form action={revogarToken}>
                  <input type="hidden" name="id" value={t.id} />
                  <Botao type="submit" variante="perigo">
                    Revogar
                  </Botao>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
