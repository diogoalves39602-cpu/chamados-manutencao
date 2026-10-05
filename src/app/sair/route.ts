import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

// POST: botão "Sair". GET: usado pelos layouts quando o perfil foi desativado.
async function sair(request: NextRequest) {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut({ scope: "local" });

  const motivo = request.nextUrl.searchParams.get("motivo") === "inativo" ? "inativo" : "saiu";
  const url = new URL("/login", request.url);
  url.searchParams.set("motivo", motivo);
  return NextResponse.redirect(url, { status: 303 });
}

export const GET = sair;
export const POST = sair;
