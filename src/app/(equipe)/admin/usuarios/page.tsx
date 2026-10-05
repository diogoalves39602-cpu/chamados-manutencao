import type { Metadata } from "next";
import { Cartao } from "@/components/ui";
import { exigirAdmin } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormNovoUsuario } from "./form-novo-usuario";
import { LinhaUsuario } from "./linha-usuario";
import { gerarSenha } from "./senha";

export const metadata: Metadata = { title: "Usuários da equipe" };

export default async function PaginaUsuarios() {
  const eu = await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data: usuarios, error } = await supabase
    .from("perfis")
    .select("id, login, nome, papel, ativo, deve_trocar_senha, criado_em")
    .order("ativo", { ascending: false })
    .order("nome");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Usuários da equipe</h1>
        <p className="text-sm text-zinc-600">
          Crie o acesso com uma senha inicial. No primeiro login a pessoa é obrigada a trocá-la.
        </p>
      </div>

      <Cartao>
        <h2 className="mb-4 text-base font-semibold">Novo usuário</h2>
        <FormNovoUsuario senhaInicial={gerarSenha()} />
      </Cartao>

      <Cartao className="p-0 sm:p-0">
        <h2 className="border-b border-zinc-200 px-4 py-3 text-base font-semibold sm:px-6">
          Equipe ({usuarios?.length ?? 0})
        </h2>
        {error ? <p className="p-4 text-sm text-red-700">Erro ao carregar usuários: {error.message}</p> : null}
        <ul className="divide-y divide-zinc-200">
          {usuarios?.map((u) => <LinhaUsuario key={u.id} usuario={u} ehVoce={u.id === eu.id} />)}
        </ul>
      </Cartao>
    </div>
  );
}
