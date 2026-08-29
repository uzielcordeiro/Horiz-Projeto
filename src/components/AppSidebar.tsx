import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

type Item = { key: string; label: string; icon: string; soon?: boolean };

const NAV: Item[] = [
  { key: "saldos", label: "saldos", icon: "▦" },
  { key: "totais", label: "totais", icon: "▤" },
  { key: "tags", label: "tags", icon: "◫" },
  { key: "menu", label: "menu", icon: "≡" },
];

export function AppSidebar({
  onAdd,
  onToday,
  onNavigate,
  active = "saldos",
}: {
  onAdd: () => void;
  onToday: () => void;
  onNavigate?: (key: string) => void;
  active?: string;
}) {
  const [open, setOpen] = useState(true);
  const handlers = useRef({ onAdd, onToday, onNavigate });
  handlers.current = { onAdd, onToday, onNavigate };

  useEffect(() => {
    const state = window as typeof window & {
      __pendingSidebarAction?: string | null;
      __pendingSidebarActions?: string[];
      __sidebarHydrated?: boolean;
    };

    const run = (action: string) => {
      if (action === "adicionar") handlers.current.onAdd();
      else if (action === "hoje") handlers.current.onToday();
      else handlers.current.onNavigate?.(action);
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("button[data-sidebar-action]")
        : null;
      if (!target || target.disabled) return;
      const action = target.dataset['sidebarAction'];
      if (!action) return;
      event.preventDefault();
      run(action);
    };

    state.__sidebarHydrated = true;
    const pending = state.__pendingSidebarActions ?? [];
    const legacyAction = state.__pendingSidebarAction;
    if (legacyAction) pending.push(legacyAction);
    state.__pendingSidebarActions = [];
    state.__pendingSidebarAction = null;
    document.addEventListener("pointerdown", handlePointerDown, true);
    for (const action of pending) run(action);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      state.__sidebarHydrated = false;
    };
  }, []);

  const row =
    "flex w-full cursor-pointer touch-manipulation select-none items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-medium transition-colors";

  const activate = (action: () => void) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      action();
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      // Pointer activation already ran on pointerdown. Keep click for keyboard users.
      if (event.detail === 0) action();
    },
  });

  const keyboardActivate = (action: () => void) => ({
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail === 0) action();
    },
  });

  return (
    <aside
      className={`relative z-[60] sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ${
        open ? "w-40" : "w-11"
      }`}
    >
      <div className="flex h-14 items-center gap-2 px-2">
        <button
          type="button"
          {...activate(() => setOpen((v) => !v))}
          aria-label={open ? "recolher menu" : "expandir menu"}
          title={open ? "recolher menu" : "expandir menu"}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-base text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          ☰
        </button>
        {open && (
          <span className="truncate font-display text-sm font-semibold text-foreground">
            linha do tempo
          </span>
        )}
      </div>

      <nav className="mt-2 space-y-1 px-2">
        {NAV.map((item) => (
          <button
            key={item.key}
            type="button"
            data-sidebar-action={item.key}
            disabled={item.soon}
            {...keyboardActivate(() => onNavigate?.(item.key))}
            title={item.soon ? "em breve" : item.label}
            className={`${row} ${
              item.key === active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <span className="w-4 shrink-0 text-center">{item.icon}</span>
            {open && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-6 space-y-1 border-t border-border px-2 pt-4">
        <button
          type="button"
          data-sidebar-action="adicionar"
          {...keyboardActivate(onAdd)}
          title="adicionar"
          className={`${row} text-foreground hover:bg-accent/60`}
        >
          <span className="w-4 shrink-0 text-center text-positive">＋</span>
          {open && <span className="truncate">adicionar</span>}
        </button>
        <button
          type="button"
          data-sidebar-action="hoje"
          {...keyboardActivate(onToday)}
          title="ir pra hoje"
          className={`${row} text-muted-foreground hover:bg-accent/60 hover:text-foreground`}
        >
          <span className="w-4 shrink-0 text-center">◉</span>
          {open && <span className="truncate">ir pra hoje</span>}
        </button>
        <button
          type="button"
          data-sidebar-action="horizonte"
          {...keyboardActivate(() => onNavigate?.("horizonte"))}
          title="horizonte"
          className={`${row} ${
            active === "horizonte"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          }`}
        >
          <span className="w-4 shrink-0 text-center">▩</span>
          {open && <span className="truncate">horizonte</span>}
        </button>
      </div>

    </aside>
  );
}
