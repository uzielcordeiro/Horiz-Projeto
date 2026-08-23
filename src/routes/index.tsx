import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { AddWindow } from "@/components/AddWindow";
import { MonthCalendar } from "@/components/MonthCalendar";
import { HorizonBoard, type HorizonMonth } from "@/components/HorizonBoard";
import { TotalsBoard } from "@/components/TotalsBoard";
import { TagsBoard, type TagRow } from "@/components/TagsBoard";

import {
  WEEKDAYS,
  occurrencesInMonth,
  sumBefore,
  type Occurrence,
  type Recurrence,
} from "@/lib/recurrence";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Saldos — Linha do Tempo Financeira" },
      {
        name: "description",
        content:
          "Agenda financeira dia a dia: entradas, saídas parceladas ou recorrentes, diários, economias, cartão e saldo acumulado.",
      },
      { property: "og:title", content: "Saldos — Linha do Tempo Financeira" },
      {
        property: "og:description",
        content:
          "Agenda financeira dia a dia: entradas, saídas parceladas ou recorrentes, diários, economias, cartão e saldo acumulado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Kind = "entradas" | "saidas" | "diarios" | "economias" | "cartao";

type Entry = {
  id: string;
  amount: number;
  date: string;
  label: string;
  kind: Kind;
  tags?: string[];
};


const STORAGE_KEY = "timeline-entries-v1";
const REC_KEY = "timeline-recurrences-v1";

const KINDS: { key: Kind; title: string; sign: 1 | -1 }[] = [
  { key: "entradas", title: "entradas", sign: 1 },
  { key: "saidas", title: "saídas", sign: -1 },
  { key: "diarios", title: "diários", sign: -1 },
  { key: "economias", title: "economias", sign: -1 },
  { key: "cartao", title: "cartão", sign: -1 },
];

const SUGGESTIONS: Record<Kind, string[]> = {
  entradas: ["Salário", "Freela", "Diária", "Trabalho extra", "Outro"],
  saidas: ["Aluguel", "Água", "Luz", "Internet", "Mercado", "Combustível", "Outro"],
  diarios: ["Alimentação", "Transporte", "Lazer", "Outro"],
  economias: ["Reserva", "Investimento", "Meta", "Outro"],
  cartao: ["Fatura", "Parcela", "Compra", "Outro"],
};

const TAG_SUGGESTIONS = [
  "fixo",
  "variável",
  "extra",
  "serviço extra",
  "casa",
  "carro",
  "saúde",
  "lazer",
  "investimento",
];


const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const monthLabel = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

type Status = "positive" | "warning" | "negative";
const statusOf = (b: number): Status => (b >= 1000 ? "positive" : b >= 0 ? "warning" : "negative");
const saldoCell: Record<Status, string> = {
  positive: "bg-positive/15 text-positive",
  warning: "bg-warning/20 text-warning-foreground",
  negative: "bg-negative/15 text-negative",
};
const dotClass: Record<Status, string> = {
  positive: "bg-positive",
  warning: "bg-warning",
  negative: "bg-negative",
};

function parseAmount(input: string) {
  const n = Number(input.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const signedTotal = (list: Entry[]) =>
  list.reduce((sum, e) => {
    const k = KINDS.find((x) => x.key === e.kind);
    return sum + (k ? k.sign * e.amount : 0);
  }, 0);

const GRID = "grid-cols-[56px_repeat(6,minmax(110px,1fr))]";

type DayItem = {
  key: string;
  kind: Kind;
  title: string;
  sign: 1 | -1;
  amount: number;
  detail: string;
  entryId?: string;
  recurrenceId?: string;
  date: string;
};

type Freq = "unico" | "diario" | "mensal" | "semanal";

function Index() {
  const today = new Date();
  const tableRef = useRef<HTMLElement>(null);
  const tableHeaderRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"saldos" | "horizonte">("saldos");
  const [horizonStart, setHorizonStart] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const [kind, setKind] = useState<Kind>("entradas");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  // data livre do lançamento (passado ou futuro, qualquer ano)
  const [formDate, setFormDate] = useState(() =>
    iso(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  // etiquetas
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showCal, setShowCal] = useState(false);

  // repetição / parcelas (disponível em todas as categorias)
  const [debtName, setDebtName] = useState("");
  const [freq, setFreq] = useState<Freq>("unico");
  const [infinite, setInfinite] = useState(false);
  const [installments, setInstallments] = useState("12");
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);


  // histórico (desfazer) e seleção múltipla
  const [history, setHistory] = useState<{ entries: Entry[]; recurrences: Recurrence[] }[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, DayItem>>({});
  const [confirmAll, setConfirmAll] = useState(false);

  function commit(nextEntries: Entry[], nextRecurrences: Recurrence[]) {
    setHistory((h) => [...h.slice(-19), { entries, recurrences }]);
    setEntries(nextEntries);
    setRecurrences(nextRecurrences);
  }

  function undo() {
    setHistory((h) => {
      const last = h[h.length - 1];
      if (!last) return h;
      setEntries(last.entries);
      setRecurrences(last.recurrences);
      setSelected({});
      return h.slice(0, -1);
    });
  }


  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Entry[];
        setEntries(parsed.map((e) => ({ ...e, kind: e.kind ?? "entradas" })));
      }
      const rawRec = localStorage.getItem(REC_KEY);
      if (rawRec) {
        const parsed = JSON.parse(rawRec) as Recurrence[];
        setRecurrences(parsed.map((r) => ({ ...r, skipped: r.skipped ?? [] })));
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    localStorage.setItem(REC_KEY, JSON.stringify(recurrences));
  }, [entries, recurrences, loaded]);

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

  const rows = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const openingDate = iso(cursor.y, cursor.m, 1);
    const opening =
      signedTotal(sorted.filter((e) => e.date < openingDate)) -
      recurrences.reduce((s, r) => s + sumBefore(r, openingDate), 0);

    const byDate = new Map<string, Occurrence[]>();
    for (const r of recurrences) {
      for (const o of occurrencesInMonth(r, cursor.y, cursor.m)) {
        const list = byDate.get(o.date) ?? [];
        list.push(o);
        byDate.set(o.date, list);
      }
    }

    let running = opening;

    const list = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = iso(cursor.y, cursor.m, day);
      const dayEntries = sorted.filter((e) => e.date === date);
      const dayOccurrences = byDate.get(date) ?? [];

      const items: DayItem[] = [
        ...dayEntries.map((e) => {
          const k = KINDS.find((x) => x.key === e.kind)!;
          return {
            key: e.id,
            kind: e.kind,
            title: k.title,
            sign: k.sign,
            amount: e.amount,
            detail: e.label,
            entryId: e.id,
            date,
          } satisfies DayItem;
        }),
        ...dayOccurrences.map((o) => {
          const k = KINDS.find((x) => x.key === o.kind) ?? KINDS[1]!;
          return {
            key: `${o.recurrenceId}-${o.date}`,
            kind: k.key,
            title: k.title,
            sign: k.sign,
            amount: o.amount,
            detail: `${o.name || o.label}${
              o.total ? ` · ${o.index}/${o.total}` : " · recorrente"
            }`,
            recurrenceId: o.recurrenceId,
            date: o.date,
          } satisfies DayItem;
        }),

      ];

      const totals = {} as Record<Kind, number>;
      for (const k of KINDS) {
        totals[k.key] = items
          .filter((it) => it.kind === k.key)
          .reduce((s, it) => s + it.amount, 0);
      }
      running += items.reduce((s, it) => s + it.sign * it.amount, 0);
      return { day, date, totals, balance: running, items };
    });

    return { list, opening, closing: running };
  }, [entries, recurrences, cursor, daysInMonth]);

  const monthTotals = useMemo(() => {
    const t = {} as Record<Kind, number>;
    for (const k of KINDS) t[k.key] = rows.list.reduce((s, r) => s + r.totals[k.key], 0);
    return t;
  }, [rows]);

  const horizonMonths = useMemo<HorizonMonth[]>(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const out: HorizonMonth[] = [];
    for (let i = 0; i < 12; i += 1) {
      const ref = new Date(horizonStart.y, horizonStart.m + i, 1);
      const y = ref.getFullYear();
      const m = ref.getMonth();
      const first = iso(y, m, 1);
      const total = new Date(y, m + 1, 0).getDate();

      // saldo de abertura do mês
      let running =
        signedTotal(sorted.filter((e) => e.date < first)) -
        recurrences.reduce((s, r) => s + sumBefore(r, first), 0);

      const byDate = new Map<string, number>();
      for (const e of sorted) {
        if (e.date >= first) {
          const k = KINDS.find((x) => x.key === e.kind);
          if (k) byDate.set(e.date, (byDate.get(e.date) ?? 0) + k.sign * e.amount);
        }
      }
      for (const r of recurrences) {
        for (const o of occurrencesInMonth(r, y, m)) {
          const k = KINDS.find((x) => x.key === o.kind);
          if (k) byDate.set(o.date, (byDate.get(o.date) ?? 0) + k.sign * o.amount);
        }
      }

      const days = Array.from({ length: total }, (_, idx) => {
        const day = idx + 1;
        const date = iso(y, m, day);
        running += byDate.get(date) ?? 0;
        return { day, date, balance: running, status: statusOf(running) };
      });

      const label = `${new Date(y, m, 1)
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", "")
        .slice(0, 3)}/${String(y).slice(-2)}`;

      out.push({ y, m, label, days });
    }
    return out;
  }, [entries, recurrences, horizonStart]);


  const closingStatus = statusOf(rows.closing);

  function shiftMonth(delta: number) {
    setSelectedDay(null);
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function goToday() {
    const now = new Date();
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
    setSelectedDay(now.getDate());
    const target = iso(now.getFullYear(), now.getMonth(), now.getDate());
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-day-row="${target}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function shiftDay(delta: number) {
    if (selectedDay == null) return;
    const d = new Date(cursor.y, cursor.m, selectedDay + delta);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelectedDay(d.getDate());
  }

  const selectedRow = selectedDay == null ? null : rows.list[selectedDay - 1] ?? null;


  function resetForm() {
    setAmount("");
    setLabel("");
    setDebtName("");
    setFreq("unico");
    setInfinite(false);
    setInstallments("12");
    setDaysOfMonth([]);
    setDaysOfWeek([]);
    setTags([]);
    setTagInput("");
  }

  function scrollTableToStart() {
    tableRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  function toggle(list: number[], value: number, set: (v: number[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addTag(raw: string) {
    const t = raw.trim().slice(0, 24);
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput("");
  }

  function shiftFormDate(days: number) {
    const p = formDate.split("-").map(Number);
    const d = new Date(p[0] ?? 1970, (p[1] ?? 1) - 1, (p[2] ?? 1) + days);
    setFormDate(iso(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  const formDateParts = useMemo(() => {
    const p = formDate.split("-").map(Number);
    return { y: p[0] ?? today.getFullYear(), m: (p[1] ?? 1) - 1, d: p[2] ?? 1 };
  }, [formDate]);

  function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    const date = formDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Escolha uma data válida.");
      return;
    }
    const { y, m, d } = formDateParts;
    const cleanTags = tags.slice(0, 8);

    if (freq !== "unico") {
      const parcelas = infinite ? null : Math.floor(Number(installments));
      if (!infinite && (!Number.isFinite(parcelas) || (parcelas ?? 0) < 1)) {
        setError("Informe a quantidade de parcelas ou marque 'sem fim'.");
        return;
      }
      const dom = freq === "mensal" ? (daysOfMonth.length ? daysOfMonth : [d]) : [];
      const dow =
        freq === "semanal"
          ? daysOfWeek.length
            ? daysOfWeek
            : [new Date(y, m, d).getDay()]
          : [];
      setError(null);
      commit(entries, [
        ...recurrences,
        {
          id: crypto.randomUUID(),
          kind,
          name: debtName.trim() || label.trim() || KINDS.find((k) => k.key === kind)!.title,
          label: label.trim() || (SUGGESTIONS[kind][0] ?? "Outro"),
          tags: cleanTags,
          amount: value,
          freq: freq === "mensal" ? "monthly" : freq === "semanal" ? "weekly" : "daily",
          daysOfMonth: dom,
          daysOfWeek: dow,
          startDate: date,
          installments: parcelas,
          endDate: null,
          skipped: [],
        },
      ]);
      resetForm();
      setAdding(false);
      setSelectedDay(null);
      setCursor({ y, m });
      scrollTableToStart();
      return;
    }

    setError(null);
    commit(
      [
        ...entries,
        {
          id: crypto.randomUUID(),
          amount: value,
          date,
          label:
            debtName.trim() || label.trim() || (SUGGESTIONS[kind][0] ?? "Outro"),
          kind,
          tags: cleanTags,
        },
      ],
      recurrences,
    );
    resetForm();
    setAdding(false);
    setSelectedDay(null);
    setCursor({ y, m });
    scrollTableToStart();
  }



  function deleteItems(items: DayItem[]) {
    if (items.length === 0) return;
    const entryIds = new Set(items.filter((i) => i.entryId).map((i) => i.entryId!));
    const skips = items.filter((i) => i.recurrenceId);
    commit(
      entries.filter((e) => !entryIds.has(e.id)),
      recurrences.map((r) => {
        const dates = skips.filter((s) => s.recurrenceId === r.id).map((s) => s.date);
        return dates.length ? { ...r, skipped: [...r.skipped, ...dates] } : r;
      }),
    );
    setSelected({});
  }

  function removeEntry(id: string) {
    commit(
      entries.filter((e) => e.id !== id),
      recurrences,
    );
  }

  function skipOccurrence(recurrenceId: string, date: string) {
    commit(
      entries,
      recurrences.map((r) =>
        r.id === recurrenceId ? { ...r, skipped: [...r.skipped, date] } : r,
      ),
    );
  }

  function endRecurrenceFrom(recurrenceId: string, date: string) {
    const before = new Date(date);
    before.setDate(before.getDate() - 1);
    const end = iso(before.getFullYear(), before.getMonth(), before.getDate());
    commit(
      entries,
      recurrences.flatMap((r) =>
        r.id !== recurrenceId ? [r] : end < r.startDate ? [] : [{ ...r, endDate: end }],
      ),
    );
  }

  function removeRecurrence(recurrenceId: string) {
    commit(
      entries,
      recurrences.filter((r) => r.id !== recurrenceId),
    );
  }

  function deleteAll() {
    commit([], []);
    setSelected({});
    setConfirmAll(false);
  }


  const isToday = (day: number) =>
    cursor.y === today.getFullYear() && cursor.m === today.getMonth() && day === today.getDate();

  const kindTone: Record<Kind, string> = {
    entradas: "text-positive",
    saidas: "text-negative",
    diarios: "text-negative",
    economias: "text-foreground",
    cartao: "text-negative",
  };

  const kindBadge: Record<Kind, string> = {
    entradas: "bg-positive text-positive-foreground",
    saidas: "bg-negative text-negative-foreground",
    diarios: "bg-chart-4 text-primary-foreground",
    economias: "bg-primary text-primary-foreground",
    cartao: "bg-chart-1 text-primary-foreground",
  };

  const chip = (active: boolean) =>
    `h-8 min-w-8 rounded-lg border px-2 text-xs font-medium transition-colors ${
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-input bg-background text-muted-foreground hover:bg-accent"
    }`;

  const actionBtn =
    "h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  const dangerBtn =
    "h-8 rounded-lg border border-negative/40 bg-negative/10 px-2.5 text-xs font-semibold text-negative transition-colors hover:bg-negative/20";

  const monthItems = rows.list.flatMap((r) => r.items);
  const selectedList = Object.values(selected);


  function selectMany(items: DayItem[]) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const it of items) next[it.key] = it;
      return next;
    });
  }


  const navBtn =
    "grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-accent";

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        onAdd={() => {
          setError(null);
          setShowCal(false);
          const sameMonth = cursor.y === today.getFullYear() && cursor.m === today.getMonth();
          const day = selectedDay ?? (sameMonth ? today.getDate() : 1);
          setSelectedDay(day);
          setFormDate(iso(cursor.y, cursor.m, day));
          setAdding(true);
        }}
        onToday={goToday}
        active={view}
        onNavigate={(key) => {
          if (key === "horizonte") {
            setHorizonStart({ y: cursor.y, m: cursor.m });
            setView("horizonte");
          } else {
            setView("saldos");
          }
        }}
      />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:px-8">
            <h1 className="truncate font-display text-xl font-semibold text-foreground sm:text-2xl">
              {view === "horizonte" ? "horizonte" : "saldos"}
            </h1>
            <div className={`flex shrink-0 items-center gap-1 ${view === "horizonte" ? "hidden" : ""}`}>
              <button onClick={() => shiftMonth(-12)} aria-label="Ano anterior" className={navBtn}>
                «
              </button>
              <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior" className={navBtn}>
                ‹
              </button>
              <span className="min-w-44 rounded-full border border-border px-4 py-1.5 text-center text-sm font-medium capitalize text-foreground">
                {monthLabel(cursor.y, cursor.m)}
              </span>
              <button onClick={() => shiftMonth(1)} aria-label="Próximo mês" className={navBtn}>
                ›
              </button>
              <button onClick={() => shiftMonth(12)} aria-label="Próximo ano" className={navBtn}>
                »
              </button>
              <button
                onClick={goToday}
                className="ml-1 h-9 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                hoje
              </button>
            </div>
          </div>
        </header>

      <main className="w-full space-y-6 px-5 py-6 sm:px-8">
        {view === "horizonte" ? (
          <HorizonBoard
            months={horizonMonths}
            todayIso={iso(today.getFullYear(), today.getMonth(), today.getDate())}
            rangeLabel={`${monthLabel(horizonMonths[0]!.y, horizonMonths[0]!.m)} — ${monthLabel(
              horizonMonths[11]!.y,
              horizonMonths[11]!.m,
            )}`}
            onShift={(delta) =>
              setHorizonStart((h) => {
                const d = new Date(h.y, h.m + delta, 1);
                return { y: d.getFullYear(), m: d.getMonth() };
              })
            }
            onPick={(y, m, day) => {
              setError(null);
              setShowCal(false);
              setCursor({ y, m });
              setSelectedDay(day);
              setFormDate(iso(y, m, day));
              setAdding(true);
            }}
          />
        ) : (
          <>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">saldo anterior</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{brl(rows.opening)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">entradas do mês</p>
            <p className="mt-1 text-lg font-semibold text-positive">{brl(monthTotals.entradas)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">saldo final</p>
            <p
              className={`mt-1 flex items-center gap-2 text-lg font-semibold ${
                saldoCell[closingStatus].split(" ")[1]
              }`}
            >
              <span className={`size-2.5 rounded-full ${dotClass[closingStatus]}`} />
              {brl(rows.closing)}
            </p>
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <button
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected({});
            }}
            className={chip(selectMode)}
          >
            {selectMode ? "sair da seleção" : "selecionar"}
          </button>

          {selectMode && (
            <>
              <button onClick={() => selectMany(monthItems)} className={actionBtn}>
                marcar todos do mês
              </button>
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  onClick={() => selectMany(monthItems.filter((i) => i.kind === k.key))}
                  className={actionBtn}
                >
                  marcar {k.title}
                </button>
              ))}
              <button onClick={() => setSelected({})} className={actionBtn}>
                limpar seleção
              </button>
              <button
                onClick={() => deleteItems(selectedList)}
                disabled={selectedList.length === 0}
                className={`${dangerBtn} disabled:opacity-40`}
              >
                apagar selecionados ({selectedList.length})
              </button>
            </>
          )}

          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

          {KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => deleteItems(monthItems.filter((i) => i.kind === k.key))}
              className={actionBtn}
            >
              apagar {k.title} do mês
            </button>
          ))}

          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

          <button onClick={undo} disabled={history.length === 0} className={`${actionBtn} disabled:opacity-40`}>
            ↶ desfazer{history.length ? ` (${history.length})` : ""}
          </button>
          {confirmAll ? (
            <>
              <button onClick={deleteAll} className={dangerBtn}>
                confirmar: apagar tudo
              </button>
              <button onClick={() => setConfirmAll(false)} className={actionBtn}>
                cancelar
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmAll(true)} className={dangerBtn}>
              apagar tudo
            </button>
          )}
        </section>



        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="sticky top-[61px] z-20 overflow-hidden rounded-t-2xl border border-b-0 border-border bg-secondary">
            <div
              ref={tableHeaderRef}
              className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(event) => {
                if (tableRef.current && tableRef.current.scrollLeft !== event.currentTarget.scrollLeft) {
                  tableRef.current.scrollLeft = event.currentTarget.scrollLeft;
                }
              }}
            >
            <div
              className={`grid min-w-[760px] ${GRID} items-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}
            >
              <span>dia</span>
              {KINDS.map((k) => (
                <span key={k.key} className="flex items-center justify-end gap-1.5">
                  <span
                    aria-hidden
                    className={`grid size-4 place-items-center rounded-full text-[9px] font-bold ${kindBadge[k.key]}`}
                  >
                    {k.title.charAt(0).toUpperCase()}
                  </span>
                  {k.title}
                </span>
              ))}
              <span className="text-right">saldos</span>
            </div>
            </div>
          </div>

          <section
            ref={tableRef}
            className="min-w-0 overflow-x-auto rounded-b-2xl border border-border bg-card"
            onScroll={(event) => {
              if (tableHeaderRef.current && tableHeaderRef.current.scrollLeft !== event.currentTarget.scrollLeft) {
                tableHeaderRef.current.scrollLeft = event.currentTarget.scrollLeft;
              }
            }}
          >
          <div className="min-w-[760px]">

            <div className="divide-y divide-border">
              {rows.list.map((row) => {
                const s = statusOf(row.balance);
                const open = selectedDay === row.day;
                return (
                  <div key={row.date} data-day-row={row.date}>
                    <button
                      onClick={() => {
                        setError(null);
                        setShowCal(false);
                        setSelectedDay(row.day);
                        setFormDate(row.date);
                        setAdding(true);
                      }}
                      className={`grid w-full ${GRID} items-center px-3 py-2.5 text-left transition-colors hover:bg-accent/50 ${
                        open ? "bg-accent/60" : ""
                      }`}
                    >
                      <span
                        className={`grid size-8 place-items-center rounded-lg text-sm font-semibold ${
                          isToday(row.day)
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {row.day}
                      </span>
                      {KINDS.map((k) => (
                        <span
                          key={k.key}
                          className={`truncate text-right text-sm tabular-nums ${
                            row.totals[k.key] > 0
                              ? `font-medium ${kindTone[k.key]}`
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {brl(row.totals[k.key])}
                        </span>
                      ))}
                      <span
                        className={`ml-auto rounded-lg px-2.5 py-1 text-right text-sm font-semibold tabular-nums ${saldoCell[s]}`}
                      >
                        {brl(row.balance)}
                      </span>
                    </button>

                  </div>
                );
              })}
            </div>

            <div
              className={`grid ${GRID} items-center border-t border-border bg-secondary px-3 py-3 text-sm font-semibold`}
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">total</span>
              {KINDS.map((k) => (
                <span key={k.key} className={`text-right tabular-nums ${kindTone[k.key]}`}>
                  {brl(monthTotals[k.key])}
                </span>
              ))}
              <span
                className={`ml-auto rounded-lg px-2.5 py-1 text-right tabular-nums ${saldoCell[closingStatus]}`}
              >
                {brl(rows.closing)}
              </span>
            </div>
          </div>
        </section>
        </div>




        {adding && (
          <AddWindow
            subtitle={new Date(formDateParts.y, formDateParts.m, formDateParts.d).toLocaleDateString(
              "pt-BR",
              { day: "2-digit", month: "long", year: "numeric" },
            )}
            onClose={() => {
              setAdding(false);
              setError(null);
              setShowCal(false);
            }}
          >
            <form onSubmit={saveEntry} className="space-y-3">
              {/* valor */}
              <div className="rounded-2xl bg-card p-4">
                <span className="text-xs font-medium text-muted-foreground">
                  {freq !== "unico" ? "valor da parcela" : "valor"}
                </span>
                <input
                  autoFocus
                  inputMode="decimal"
                  maxLength={20}
                  value={amount}
                  onChange={(ev) => setAmount(ev.target.value)}
                  placeholder="0,00"
                  className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3 font-display text-2xl font-bold tabular-nums text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              {/* categoria */}
              <div className="rounded-2xl bg-card p-4">
                <span className="text-xs font-medium text-muted-foreground">categoria</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {KINDS.map((k) => (
                    <button
                      key={k.key}
                      type="button"
                      onClick={() => setKind(k.key)}
                      className={chip(kind === k.key)}
                    >
                      {k.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* identificação */}
              <div className="space-y-3 rounded-2xl bg-card p-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">identificação</span>
                  <input
                    list={`labels-${kind}`}
                    maxLength={40}
                    value={label}
                    onChange={(ev) => setLabel(ev.target.value)}
                    placeholder={SUGGESTIONS[kind][0]}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                  <datalist id={`labels-${kind}`}>
                    {SUGGESTIONS[kind].map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    nome / descrição (opcional)
                  </span>
                  <input
                    maxLength={60}
                    value={debtName}
                    onChange={(ev) => setDebtName(ev.target.value)}
                    placeholder="ex.: gasolina — abastecimento do carro"
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </label>
              </div>

              {/* data */}
              <div className="rounded-2xl bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">data</span>
                  <button
                    type="button"
                    onClick={() => setShowCal((v) => !v)}
                    className="rounded-xl bg-accent px-3 py-1.5 text-sm font-semibold text-foreground"
                  >
                    {new Date(
                      formDateParts.y,
                      formDateParts.m,
                      formDateParts.d,
                    ).toLocaleDateString("pt-BR")}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => shiftFormDate(-1)} className={chip(false)}>
                    -1 dia
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormDate(iso(today.getFullYear(), today.getMonth(), today.getDate()))
                    }
                    className={chip(false)}
                  >
                    hoje
                  </button>
                  <button type="button" onClick={() => shiftFormDate(1)} className={chip(false)}>
                    +1 dia
                  </button>
                  <button type="button" onClick={() => shiftFormDate(7)} className={chip(false)}>
                    +7 dias
                  </button>
                </div>
                {showCal && (
                  <div className="mt-3">
                    <MonthCalendar value={formDate} onChange={setFormDate} />
                  </div>
                )}
              </div>

              {/* repetição */}
              <div className="space-y-3 rounded-2xl bg-card p-4">
                <span className="text-xs font-medium text-muted-foreground">repetição</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFreq("unico")}
                    className={chip(freq === "unico")}
                  >
                    não repete
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreq("diario")}
                    className={chip(freq === "diario")}
                  >
                    diariamente
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreq("mensal")}
                    className={chip(freq === "mensal")}
                  >
                    mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreq("semanal")}
                    className={chip(freq === "semanal")}
                  >
                    semanal
                  </button>
                </div>

                {freq !== "unico" && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">parcelas</span>
                    <div className="flex items-center gap-2">
                      <input
                        inputMode="numeric"
                        disabled={infinite}
                        value={infinite ? "" : installments}
                        onChange={(ev) => setInstallments(ev.target.value)}
                        placeholder="12"
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setInfinite((v) => !v)}
                        className={chip(infinite)}
                      >
                        sem fim
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[12, 48, 360].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setInfinite(false);
                            setInstallments(String(n));
                          }}
                          className={chip(!infinite && installments === String(n))}
                        >
                          {n}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {freq === "mensal" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      dias do mês (pode escolher vários · 31 cai no último dia)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggle(daysOfMonth, d, setDaysOfMonth)}
                          className={chip(daysOfMonth.includes(d))}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {freq === "semanal" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      dias da semana (pode escolher vários)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((w) => (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => toggle(daysOfWeek, w.value, setDaysOfWeek)}
                          className={chip(daysOfWeek.includes(w.value))}
                        >
                          {w.short}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* tags */}
              <div className="space-y-2 rounded-2xl bg-card p-4">
                <span className="text-xs font-medium text-muted-foreground">tags</span>
                <div className="flex items-center gap-2">
                  <input
                    value={tagInput}
                    maxLength={24}
                    onChange={(ev) => setTagInput(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === ",") {
                        ev.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="ex.: extra, fixo, carro"
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                  <button type="button" onClick={() => addTag(tagInput)} className={chip(false)}>
                    ＋
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                        className={chip(true)}
                        title="remover tag"
                      >
                        {t} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="px-1 text-sm text-negative">{error}</p>}

              <button
                type="submit"
                className="h-12 w-full rounded-2xl bg-positive px-5 text-base font-semibold text-positive-foreground transition-opacity hover:opacity-90"
              >
                adicionar {KINDS.find((k) => k.key === kind)!.title}
              </button>
            </form>
          </AddWindow>
        )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          toque em um dia para abrir o painel do dia · no + você lança em qualquer coluna e, em
          saídas, pode nomear a dívida, parcelar (12, 48, 360…) ou deixar recorrente sem fim
        </p>

          </>
        )}
      </main>
      </div>
    </div>
  );
}
