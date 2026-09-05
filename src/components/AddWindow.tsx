import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onDeleteDay?: () => void;
  onDeleteMonth?: () => void;
  deleteDayDisabled?: boolean;
  deleteMonthDisabled?: boolean;
  children: ReactNode;
};

export function AddWindow({
  title = "adicionar",
  subtitle,
  onClose,
  onDeleteDay,
  onDeleteMonth,
  deleteDayDisabled = false,
  deleteMonthDisabled = false,
  children,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState<"day" | "month" | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(null), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  const hasDelete = Boolean(onDeleteDay || onDeleteMonth);
  const bothDisabled = deleteDayDisabled && deleteMonthDisabled;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85vh] w-[92vw] max-w-[360px] flex-col overflow-hidden rounded-3xl border border-border bg-secondary/70 shadow-2xl"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {hasDelete && (
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                disabled={bothDisabled}
                aria-label={menuOpen ? "fechar opções de apagar" : "apagar"}
                aria-expanded={menuOpen}
                title={bothDisabled ? "nada para apagar" : "apagar"}
                onClick={() => {
                  if (bothDisabled) return;
                  setMenuOpen((v) => !v);
                  setConfirming(null);
                }}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-all ${
                  bothDisabled
                    ? "cursor-not-allowed border-border text-muted-foreground/50"
                    : menuOpen || confirming
                      ? "border-negative bg-negative text-negative-foreground shadow-md"
                      : "border-negative/40 bg-negative/10 text-negative hover:bg-negative hover:text-negative-foreground"
                }`}
              >
                <span aria-hidden className="text-base">🗑</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl"
                  role="menu"
                >
                  <DeleteOption
                    label={confirming === "day" ? "confirmar" : "apagar este dia"}
                    disabled={deleteDayDisabled}
                    confirming={confirming === "day"}
                    tone="negative"
                    onSelect={() => {
                      if (!onDeleteDay) return;
                      if (confirming === "day") {
                        setConfirming(null);
                        setMenuOpen(false);
                        onDeleteDay();
                        return;
                      }
                      setConfirming("day");
                    }}
                  />
                  <DeleteOption
                    label={confirming === "month" ? "confirmar" : "apagar este mês"}
                    disabled={deleteMonthDisabled}
                    confirming={confirming === "month"}
                    tone="warning"
                    onSelect={() => {
                      if (!onDeleteMonth) return;
                      if (confirming === "month") {
                        setConfirming(null);
                        setMenuOpen(false);
                        onDeleteMonth();
                        return;
                      }
                      setConfirming("month");
                    }}
                  />
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 shrink-0 place-items-center rounded-full text-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">{children}</div>
      </div>
    </div>
  );
}

function DeleteOption({
  label,
  disabled,
  confirming,
  tone,
  onSelect,
}: {
  label: string;
  disabled: boolean;
  confirming: boolean;
  tone: "negative" | "warning";
  onSelect: () => void;
}) {
  const base =
    tone === "negative"
      ? "text-negative hover:bg-negative hover:text-negative-foreground"
      : "text-warning-foreground hover:bg-warning hover:text-warning-foreground";
  const active =
    tone === "negative"
      ? "bg-negative text-negative-foreground"
      : "bg-warning text-warning-foreground";

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
        disabled ? "cursor-not-allowed text-muted-foreground/50" : confirming ? active : base
      }`}
    >
      <span>{label}</span>
      {!disabled && (
        <span
          className={`ml-3 size-2 rounded-full ${
            tone === "negative" ? "bg-negative/60" : "bg-warning/60"
          }`}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
