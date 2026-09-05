import { useEffect, useState, type ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteLabel?: string;
  children: ReactNode;
};

export function AddWindow({
  title = "adicionar",
  subtitle,
  onClose,
  onDelete,
  deleteDisabled = false,
  deleteLabel = "apagar lançamentos deste dia",
  children,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

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
          {onDelete && (
            <button
              type="button"
              disabled={deleteDisabled}
              aria-label={confirming ? "confirmar exclusão" : deleteLabel}
              title={deleteDisabled ? "nada para apagar neste dia" : deleteLabel}
              onClick={() => {
                if (deleteDisabled) return;
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                setConfirming(false);
                onDelete();
              }}
              className={`grid h-9 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-all ${
                confirming ? "w-auto px-3" : "w-9"
              } ${
                deleteDisabled
                  ? "cursor-not-allowed border-border text-muted-foreground/50"
                  : confirming
                    ? "border-negative bg-negative text-negative-foreground shadow-md"
                    : "border-negative/40 bg-negative/10 text-negative hover:bg-negative hover:text-negative-foreground"
              }`}
            >
              {confirming ? "confirmar" : <span aria-hidden className="text-base">🗑</span>}
            </button>
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
