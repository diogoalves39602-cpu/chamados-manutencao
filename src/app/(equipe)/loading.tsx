// Esqueleto exibido enquanto a página da equipe carrega.
export default function Carregando() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-56 rounded-lg bg-stone-200" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-stone-200/80" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-stone-200/70" />
        ))}
      </div>
    </div>
  );
}
