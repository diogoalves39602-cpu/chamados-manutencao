import { LogIn, ShieldCheck } from "lucide-react";
import { Alerta, Cartao } from "@/components/ui";
import { PLATAFORMAS, type Plataforma } from "@/lib/solicitante/plataformas";

const MENSAGENS: Record<string, string> = {
  negado: "Você não autorizou o acesso. Para abrir o chamado, toque em entrar e autorize.",
  expirado: "O login demorou demais ou foi interrompido. Tente de novo.",
  erro: "Não foi possível confirmar sua conta. Tente de novo em instantes.",
  indisponivel: "Login indisponível no momento.",
};

/** Cartão "Entre com sua conta do Feishu/Lark" (formulário e acompanhamento). */
export function LoginPlataforma({
  plataformas,
  voltar,
  motivo,
  titulo = "Entre com sua conta para continuar",
  texto = "Usamos sua conta da empresa para identificar quem abriu o chamado. Não precisa criar senha.",
}: {
  plataformas: Plataforma[];
  voltar: string;
  motivo?: string;
  titulo?: string;
  texto?: string;
}) {
  return (
    <Cartao className="flex animate-entrar flex-col items-center gap-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-marca-50 text-marca-700">
        <ShieldCheck className="h-7 w-7" aria-hidden />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-stone-900">{titulo}</h2>
        <p className="mt-1 text-sm text-stone-600">{texto}</p>
      </div>
      {motivo && MENSAGENS[motivo] ? (
        <div className="w-full text-left">
          <Alerta tipo="aviso">{MENSAGENS[motivo]}</Alerta>
        </div>
      ) : null}
      <div className="flex w-full flex-col gap-2">
        {plataformas.map((p) => (
          <a
            key={p}
            href={`/auth/${p}/entrar?voltar=${encodeURIComponent(voltar)}`}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold shadow-sm transition-colors ${
              p === plataformas[0]
                ? "bg-marca-700 text-white hover:bg-marca-800"
                : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
            }`}
          >
            <LogIn className="h-5 w-5" aria-hidden />
            Entrar com {PLATAFORMAS[p].nome}
          </a>
        ))}
      </div>
    </Cartao>
  );
}
