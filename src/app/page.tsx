import Link from "next/link";

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Chamados de Manutenção</h1>
        <p className="mt-1 text-sm text-zinc-600">Todo chamado é atendido em até 2 horas, 24h por dia.</p>
      </div>
      <Link
        href="/abrir-chamado"
        className="flex min-h-14 items-center justify-center rounded-xl bg-blue-700 px-4 text-base font-semibold text-white hover:bg-blue-800"
      >
        Abrir um chamado
      </Link>
      <Link
        href="/login"
        className="flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
      >
        Área da equipe de manutenção
      </Link>
    </main>
  );
}
