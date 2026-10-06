import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { COOKIE_SESSAO } from "@/lib/solicitante/sessao";

// POST /auth/sair → encerra a identificação do solicitante neste aparelho
// ("Não é você?"). Não afeta o login da equipe.
export async function POST(request: NextRequest) {
  const base = appUrl() ?? request.nextUrl.origin;
  const resposta = NextResponse.redirect(new URL("/abrir-chamado", base), { status: 303 });
  resposta.cookies.delete(COOKIE_SESSAO);
  return resposta;
}
