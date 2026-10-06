import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { urlAutorizacao } from "@/lib/solicitante/oauth";
import { configPlataforma, ehPlataforma } from "@/lib/solicitante/plataformas";
import { assinar, COOKIE_OAUTH } from "@/lib/solicitante/sessao";

// GET /auth/feishu/entrar?voltar=/abrir-chamado → tela de autorização do Feishu (ou Lark).
export async function GET(request: NextRequest, ctx: RouteContext<"/auth/[plataforma]/entrar">) {
  const { plataforma } = await ctx.params;
  const cfg = ehPlataforma(plataforma) ? configPlataforma(plataforma) : null;
  if (!cfg) return NextResponse.json({ erro: "Login por esta plataforma não está configurado." }, { status: 404 });

  const voltar = destinoSeguro(request.nextUrl.searchParams.get("voltar"));
  const base = appUrl() ?? request.nextUrl.origin;
  const state = randomBytes(24).toString("base64url");

  const resposta = NextResponse.redirect(urlAutorizacao(cfg, `${base}/auth/${cfg.plataforma}/retorno`, state));
  // state + destino, assinados, para validar o retorno (proteção contra CSRF).
  resposta.cookies.set(COOKIE_OAUTH, assinar({ state, voltar, plataforma: cfg.plataforma, exp: Date.now() + 10 * 60_000 }), {
    httpOnly: true,
    secure: base.startsWith("https://"),
    sameSite: "lax",
    path: "/auth",
    maxAge: 600,
  });
  return resposta;
}

/** Só caminhos internos conhecidos (evita redirecionamento aberto). */
function destinoSeguro(v: string | null) {
  return v === "/acompanhar" || v?.startsWith("/acompanhar?") ? v : "/abrir-chamado";
}
