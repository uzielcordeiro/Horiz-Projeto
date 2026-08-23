import { useMemo, useState } from "react";

export type TagRow = { tag: string; total: number; count: number };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function TagsBoard({ rows, onAdd }: { rows: TagRow[]; onAdd: () => void }) {
  const [filter, setFilter] = useState("");

  const list = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q ? rows.filter((r) => r.tag.toLowerCase().includes(q)) : rows;
    return [...filtered].sort((a, b) => b.total - a.total);
  }, [rows, filter]);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <label className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-muted-foreground">
            ⌕
          </span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filtrar tags"
            className="h-10 w-full min-w-0 rounded-xl border border-transparent bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </label>
        <button
          type="button"
          onClick={onAdd}
          aria-label="criar tag em um lançamento"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          ⊕
        </button>
      </div>

      {list.length === 0 ? (
        <div className="grid place-items-center gap-6 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <span className="grid size-20 place-items-center rounded-full border border-border text-2xl text-muted-foreground">
            ⊕
          </span>
          <p className="text-base text-muted-foreground">
            {rows.length === 0
              ? "sem tags por aqui. toque no botão acima para criar."
              : "nenhuma tag encontrada com esse filtro."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="divide-y divide-border">
            {list.map((r) => (
              <div key={r.tag} className="flex items-center gap-3 px-4 py-4">
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  #{r.tag}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {r.count} lançamento{r.count > 1 ? "s" : ""}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {brl(r.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
