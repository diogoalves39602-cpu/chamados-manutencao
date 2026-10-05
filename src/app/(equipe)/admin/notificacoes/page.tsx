import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { Botao, CabecalhoPagina, Cartao } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/server";
import { alternarDestino, excluirDestino } from "./actions";
import { BotaoTeste, FormNovoDestino } from "./formularios";

export const metadata: Metadata = { title: "Notificações" };

export default async function PaginaNotificacoes() {
  const supabase = await criarClienteServidor();
  const [{ data: destinos }, { data: config }] = await Promise.all([
    supabase
      .from("destinos_notificacao")
      .select("id, nome, plataforma, webhook_url, secret_assinatura, ativo")
      .order("criado_em"),
    supabase.from("configuracoes").select("alerta_minutos_antes").single(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        icone={Bell}
        titulo="Notificações no Feishu e no Lark"
        subtitulo={
          <>
            Cada mensagem vai para <strong>todos os destinos ativos</strong>: novo chamado e alerta quando faltarem{" "}
            {config?.alerta_minutos_antes ?? 30} minutos para estourar o prazo. Funciona 24h, inclusive de madrugada.
          </>
        }
      />

      <Cartao>
        <h2 className="mb-4 font-semibold">Novo destino (bot customizado de grupo)</h2>
        <FormNovoDestino />
      </Cartao>

      <Cartao className="p-0 sm:p-0">
        <h2 className="border-b border-stone-200 px-4 py-3 font-semibold sm:px-6">Destinos</h2>
        {!destinos?.length ? (
          <p className="px-4 py-4 text-sm text-stone-500 sm:px-6">Nenhum destino cadastrado: nenhuma mensagem será enviada.</p>
        ) : null}
        <ul className="divide-y divide-stone-200">
          {destinos?.map((d) => (
            <li key={d.id} className="flex flex-col gap-3 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`flex-1 font-medium ${d.ativo ? "" : "text-stone-400"}`}>{d.nome}</p>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                  {d.plataforma === "feishu" ? "Feishu" : "Lark"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    d.secret_assinatura ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {d.secret_assinatura ? "Com assinatura" : "Sem assinatura"}
                </span>
                {!d.ativo ? <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold">Pausado</span> : null}
              </div>
              <p className="break-all font-mono text-xs text-stone-500">
                {d.webhook_url.replace(/hook\/(.{6}).*$/, "hook/$1…")}
              </p>
              <div className="flex flex-wrap gap-2">
                <BotaoTeste id={d.id} />
                <form action={alternarDestino}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="ativo" value={d.ativo ? "false" : "true"} />
                  <Botao type="submit" variante="secundario">
                    {d.ativo ? "Pausar" : "Reativar"}
                  </Botao>
                </form>
                <form action={excluirDestino}>
                  <input type="hidden" name="id" value={d.id} />
                  <Botao type="submit" variante="perigo">
                    Excluir
                  </Botao>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
