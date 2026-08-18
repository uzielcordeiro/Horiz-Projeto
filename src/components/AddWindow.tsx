import { useEffect, type ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export function AddModal({ title = "adicionar", subtitle, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-secondary/70 shadow-2xl"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
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
