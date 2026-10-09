import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WD = ["D", "S", "T", "Q", "Q", "S", "S"];

type Props = {
  value: string;
  onChange: (iso: string) => void;
  /** Modo de vários dias: datas marcadas (ISO). Trava no mês de `value`. */
  selected?: string[];
};

/** Calendário compacto pt-BR: navega meses/anos infinitos, passado ou futuro. */
export function MonthCalendar({ value, onChange, selected }: Props) {
  const multi = selected !== undefined;
  const parts = value.split("-").map(Number);
  const selY = parts[0] ?? new Date().getFullYear();
  const selM = (parts[1] ?? 1) - 1;

  const [view, setView] = useState({ y: selY, m: selM });
  useEffect(() => setView({ y: selY, m: selM }), [selY, selM]);

  const first = new Date(view.y, view.m, 1);
  const offset = first.getDay();
  const total = new Date(view.y, view.m + 1, 0).getDate();
  const todayIso = (() => {
    const t = new Date();
    return isoOf(t.getFullYear(), t.getMonth(), t.getDate());
  })();

  const cells: { iso: string; day: number; muted: boolean }[] = [];
  for (let i = 0; i < offset; i += 1) {
    const d = new Date(view.y, view.m, i - offset + 1);
    cells.push({ iso: isoOf(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), muted: true });
  }
  for (let d = 1; d <= total; d += 1) {
    cells.push({ iso: isoOf(view.y, view.m, d), day: d, muted: false });
  }
  while (cells.length % 7 !== 0) {
    const d = new Date(view.y, view.m, total + (cells.length - offset - total) + 1);
    cells.push({ iso: isoOf(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), muted: true });
  }

  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const nav =
    "grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <div className="rounded-2xl bg-card p-3">
      <div className="mb-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
        <div className={`flex items-center ${multi ? "invisible" : ""}`}>
          <button type="button" aria-label="Ano anterior" onClick={() => shift(-12)} className={nav}>
            «
          </button>
          <button type="button" aria-label="Mês anterior" onClick={() => shift(-1)} className={nav}>
            ‹
          </button>
        </div>
        <p className="truncate text-center text-sm font-semibold text-foreground">
          {first.toLocaleDateString("pt-BR", { month: "long" })}/{view.y}
        </p>
        <div className={`flex items-center ${multi ? "invisible" : ""}`}>
          <button type="button" aria-label="Próximo mês" onClick={() => shift(1)} className={nav}>
            ›
          </button>
          <button type="button" aria-label="Próximo ano" onClick={() => shift(12)} className={nav}>
            »
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
        {WD.map((w, i) => (
          <span key={`${w}-${i}`}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const isSel = multi ? selected.includes(c.iso) : c.iso === value;
          const isToday = c.iso === todayIso;
          const disabled = multi && c.muted;
          return (
            <button
              key={c.iso}
              type="button"
              disabled={disabled}
              aria-pressed={multi ? isSel : undefined}
              onClick={() => onChange(c.iso)}
              className={`grid h-9 place-items-center rounded-full text-sm tabular-nums transition-colors ${
                disabled
                  ? "invisible"
                  : isSel
                    ? "bg-primary font-bold text-primary-foreground"
                    : c.muted
                      ? "text-muted-foreground/40 hover:bg-accent/50"
                      : isToday
                        ? "font-bold text-primary hover:bg-accent"
                        : "text-foreground hover:bg-accent"
              }`}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
