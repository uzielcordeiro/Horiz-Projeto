import type { ReactNode } from "react";

type Props = {
  title: string;
  weekday: string;
  filter: string;
  filterOptions: { key: string; title: string }[];
  onFilter: (value: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onAdd: () => void;
  adding: boolean;
  children: ReactNode;
};

const iconBtn =
  "grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export function DayPanel({
  title,
  weekday,
  filter,
  filterOptions,
  onFilter,
  onClose,
  onPrev,
  onNext,
  onAdd,
  adding,
  children,
}: Props) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 max-h-[80vh] overflow-y-auto rounded-t-2xl border border-border bg-card shadow-lg lg:sticky lg:top-20 lg:z-0 lg:max-h-[calc(100vh-6rem)] lg:w-[340px] lg:shrink-0 lg:rounded-2xl lg:shadow-none">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
        <button onClick={onClose} aria-label="Fechar painel do dia" className={iconBtn}>
          ×
        </button>
        <button onClick={onPrev} aria-label="Dia anterior" className={iconBtn}>
          ‹
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-foreground">
          {title}
          <span className="ml-1 font-normal text-muted-foreground">{weekday}</span>
        </span>
        <button onClick={onNext} aria-label="Próximo dia" className={iconBtn}>
          ›
        </button>
        <button
          onClick={onAdd}
          aria-label="Adicionar movimentação"
          className={`grid size-8 shrink-0 place-items-center rounded-full text-lg font-semibold transition-opacity hover:opacity-90 ${
            adding
              ? "bg-secondary text-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          +
        </button>
      </div>

      <div className="border-b border-border px-3 py-2">
        <select
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          className="h-9 w-full rounded-xl border border-input bg-background px-2 text-sm capitalize text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          <option value="todos">todas as movimentações</option>
          {filterOptions.map((o) => (
            <option key={o.key} value={o.key}>
              {o.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 p-3">{children}</div>
    </aside>
  );
}
