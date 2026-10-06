import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ClipboardList, Search, ShieldCheck, Wrench } from "lucide-react";
import { PaginaPublica } from "@/components/pagina-publica";
import { obterSessao } from "@/lib/auth/sessao";
import { solicitanteAtual } from "@/lib/solicitante/atual";
import { criarClienteServidor } from "@/lib/supabase/server";

function Opcao({
  href,
  icone: Icone,
  titulo,
  texto,
  destaque = false,
}: {
  href: string;
  icone: LucideIcon;
  titulo: string;
  texto: string;
  destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 ${
        destaque ? "border-white/25 bg-marca-700 text-white shadow-lg shadow-marca-900/30 ring-1 ring-black/5" : "border-stone-200 bg-white text-stone-900"
      }`}
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
          destaque ? "bg-white/15 text-white" : "bg-marca-50 text-marca-700"
        }`}
      >
        <Icone className="h-6 w-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{titulo}</span>
        <span className={`block text-sm ${destaque ? "text-marca-100" : "text-stone-500"}`}>{texto}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

// Fila atual para o atalho da equipe (RLS: só a equipe enxerga).
async function resumoFila() {
  const supabase = await criarClienteServidor();
  const agora = new Date().toISOString();
  const [{ count: naFila }, { count: atrasados }] = await Promise.all([
    supabase.from("chamados").select("id", { count: "exact", head: true }).in("status", ["aberto", "em_andamento"]),
    supabase
      .from("chamados")
      .select("id", { count: "exact", head: true })
      .in("status", ["aberto", "em_andamento"])
      .lt("prazo_limite", agora),
  ]);
  return { naFila: naFila ?? 0, atrasados: atrasados ?? 0 };
}

function TituloArea({ id, children, sobreFaixa = false }: { id: string; children: string; sobreFaixa?: boolean }) {
  return (
    <h2
      id={id}
      className={`px-1 text-xs font-semibold uppercase tracking-wider ${sobreFaixa ? "text-marca-100" : "text-stone-500"}`}
    >
      {children}
    </h2>
  );
}

// Link único do sistema, com duas áreas:
//  1) colaboradores (sem login): abrir e acompanhar chamados;
//  2) equipe de manutenção e administradores: entrar (ou abrir o painel, se já logado).
export default async function Inicio() {
  const [{ perfil }, solicitante] = await Promise.all([obterSessao(), solicitanteAtual()]);
  const equipe = perfil?.ativo && !perfil.deve_trocar_senha ? perfil : null;
  const fila = equipe ? await resumoFila() : null;
  const primeiroNome = (equipe?.nome ?? solicitante?.nome)?.split(" ")[0];

  return (
    <PaginaPublica
      titulo={primeiroNome ? `Olá, ${primeiroNome}! Como podemos ajudar?` : "Como podemos ajudar?"}
      subtitulo="Problema de manutenção? Abra um chamado: a equipe atende em até 2 horas, 24h por dia."
    >
      <section className="flex animate-entrar flex-col gap-3" aria-labelledby="area-colaborador">
        <TituloArea id="area-colaborador" sobreFaixa>
          Preciso de manutenção
        </TituloArea>
        <Opcao href="/abrir-chamado" icone={Wrench} titulo="Abrir um chamado" texto="Elétrica, hidráulica, ar, TI e mais" destaque />
        <Opcao
          href="/acompanhar"
          icone={Search}
          titulo={solicitante ? "Ver meus chamados" : "Consultar meus chamados"}
          texto={solicitante ? "Todos os chamados que você abriu" : "Pelo Feishu ou pelo telefone/e-mail, sem número"}
        />
      </section>

      <section className="mt-4 flex animate-entrar flex-col gap-3" aria-labelledby="area-equipe">
        <TituloArea id="area-equipe">Equipe de manutenção e administradores</TituloArea>
        {equipe && fila ? (
          <Opcao
            href="/painel"
            icone={ClipboardList}
            titulo="Abrir o painel"
            texto={`${equipe.papel === "admin" ? "Administrador" : "Técnico"} · ${fila.naFila} na fila${
              fila.atrasados ? ` · ${fila.atrasados} atrasado${fila.atrasados === 1 ? "" : "s"}` : ""
            }`}
          />
        ) : (
          <Opcao
            href="/login"
            icone={ShieldCheck}
            titulo="Entrar no sistema"
            texto="Acesso com usuário e senha para técnicos e administradores"
          />
        )}
      </section>
    </PaginaPublica>
  );
}
