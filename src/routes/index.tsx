import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { AddWindow } from "@/components/AddWindow";
import { MonthCalendar } from "@/components/MonthCalendar";
import { HorizonBoard, type HorizonMonth } from "@/components/HorizonBoard";
import { TotalsBoard } from "@/components/TotalsBoard";
import { TagsBoard, type TagRow } from "@/components/TagsBoard";
import { DailyForecastBoard, type ForecastItem } from "@/components/DailyForecastBoard";

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
  /** Economias criadas pelo Horizonte funcionam como transferência do saldo. */
  horizonTransfer?: boolean;
};


const STORAGE_KEY = "timeline-entries-v1";
const REC_KEY = "timeline-recurrences-v1";
const FORECAST_KEY = "timeline-forecast-v1";
const FORECAST_DIVISOR_KEY = "timeline-forecast-divisor-v1";
const FORECAST_ID = "forecast-auto";

const KINDS: { key: Kind; title: string; sign: 1 | -1 | 0 }[] = [
  { key: "entradas", title: "entradas", sign: 1 },
  { key: "saidas", title: "saídas", sign: -1 },
  { key: "diarios", title: "diários", sign: -1 },
  // economias é independente: não entra no saldo (sign 0)
  { key: "economias", title: "economias", sign: 0 },
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
const horizonStatusOf = (b: number): "surplus" | Status =>
  b > 2000 ? "surplus" : statusOf(b);
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

const kindTone: Record<Kind, string> = {
  entradas: "text-positive",
  saidas: "text-negative",
  diarios: "text-negative",
  economias: "text-foreground",
  cartao: "text-negative",
};

function parseAmount(input: string) {
  const n = Number(input.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

// campo de valor: aceita apenas números, vírgula e ponto
const sanitizeAmountInput = (v: string) => v.replace(/[^\d.,]/g, "");

const balanceSign = (kind: Kind, horizonTransfer?: boolean): 1 | -1 | 0 => {
  if (kind === "economias" && horizonTransfer) return -1;
  return KINDS.find((item) => item.key === kind)?.sign ?? 0;
};

const signedTotal = (list: Entry[]) =>
  list.reduce((sum, e) => {
    return sum + balanceSign(e.kind, e.horizonTransfer) * e.amount;
  }, 0);

const GRID = "grid-cols-[56px_repeat(6,minmax(110px,1fr))]";

type DayItem = {
  key: string;
  kind: Kind;
  title: string;
  sign: 1 | -1 | 0;
  amount: number;
  detail: string;
  entryId?: string;
  recurrenceId?: string;
  date: string;
  horizonTransfer?: boolean;
};

type Freq = "unico" | "diario" | "mensal" | "semanal";

function DayItemDeleteRow({
  item,
  onDeleteEntry,
  onSkip,
  onEndFrom,
  onRemoveRecurrence,
  onEditAmount,
  onEditFull,
}: {
  item: DayItem;
  onDeleteEntry: () => void;
  onSkip: () => void;
  onEndFrom: () => void;
  onRemoveRecurrence: () => void;
  onEditAmount: (value: number) => void;
  onEditFull: () => void;
}) {

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const isRecurrence = Boolean(item.recurrenceId);

  const startEdit = () => {
    setOpen(false);
    setDraft(
      item.amount.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
    setEditing(true);
  };

  const confirmEdit = () => {
    const value = parseAmount(draft);
    if (!Number.isFinite(value) || value <= 0) return;
    onEditAmount(value);
    setEditing(false);
  };

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {item.detail}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {item.title}
          </span>
        </span>
        <span
          className={`shrink-0 text-sm font-semibold tabular-nums ${kindTone[item.kind]}`}
        >
          {brl(item.amount)}
        </span>
        <button
          type="button"
          onClick={() => (editing ? setEditing(false) : startEdit())}
          className="h-8 shrink-0 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          {editing ? "cancelar" : "valor"}
        </button>
        <button
          type="button"
          onClick={onEditFull}
          className="h-8 shrink-0 rounded-lg border border-primary/40 bg-primary/10 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          editar
        </button>

        {isRecurrence ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-8 shrink-0 rounded-lg border border-negative/40 bg-negative/10 px-2.5 text-xs font-semibold text-negative transition-colors hover:bg-negative/20"
          >
            {open ? "cancelar" : "apagar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDeleteEntry}
            className="h-8 shrink-0 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            apagar
          </button>
        )}
      </div>
      {editing && (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            inputMode="decimal"
            maxLength={20}
            value={draft}
            onChange={(ev) => setDraft(sanitizeAmountInput(ev.target.value))}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") {
                ev.preventDefault();
                confirmEdit();
              }
            }}
            placeholder="0,00"
            className="h-9 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="button"
            onClick={confirmEdit}
            className="h-9 shrink-0 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition-all hover:brightness-110"
          >
            salvar
          </button>
        </div>
      )}
      {editing && isRecurrence && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          o novo valor vale para todas as parcelas desta recorrência
        </p>
      )}
      {open && isRecurrence && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">apagar lançamento:</span>
          <button
            type="button"
            onClick={() => {
              onSkip();
              setOpen(false);
            }}
            className="h-7 rounded-lg border border-input bg-background px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            só esta
          </button>
          <button
            type="button"
            onClick={() => {
              onEndFrom();
              setOpen(false);
            }}
            className="h-7 rounded-lg border border-negative/40 bg-negative/10 px-2 text-xs font-semibold text-negative transition-colors hover:bg-negative/20"
          >
            desta data em diante
          </button>
          <button
            type="button"
            onClick={() => {
              onRemoveRecurrence();
              setOpen(false);
            }}
            className="h-7 rounded-lg border border-negative/40 bg-negative/10 px-2 text-xs font-semibold text-negative transition-colors hover:bg-negative/20"
          >
            dívida inteira
          </button>
        </div>
      )}
    </div>
  );
}

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
  const [view, setView] = useState<"saldos" | "horizonte" | "totais" | "tags" | "menu" | "diario">("saldos");
  const [horizonStart, setHorizonStart] = useState({ y: today.getFullYear(), m: today.getMonth() });

  // previsão gasto diário (menu)
  const [forecastItems, setForecastItems] = useState<ForecastItem[]>([]);
  const [forecastDivisor, setForecastDivisor] = useState(30);

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
  // edição completa de um lançamento já existente (mantém tudo, muda só o que você alterar)
  const [editTarget, setEditTarget] = useState<{ type: "entry" | "rec"; id: string } | null>(null);
  const [formOrigin, setFormOrigin] = useState<"standard" | "horizon">("standard");
  const [selected, setSelected] = useState<Record<string, DayItem>>({});
  const [confirmAll, setConfirmAll] = useState<"mes" | "ano" | "tudo" | null>(null);

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
      const rawForecast = localStorage.getItem(FORECAST_KEY);
      if (rawForecast) setForecastItems(JSON.parse(rawForecast) as ForecastItem[]);
      const rawDivisor = localStorage.getItem(FORECAST_DIVISOR_KEY);
      if (rawDivisor) {
        const d = Number(rawDivisor);
        if (Number.isFinite(d) && d > 0) setForecastDivisor(d);
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
    localStorage.setItem(FORECAST_KEY, JSON.stringify(forecastItems));
    localStorage.setItem(FORECAST_DIVISOR_KEY, String(forecastDivisor));
  }, [entries, recurrences, forecastItems, forecastDivisor, loaded]);

  // sincroniza a previsão gasto diário como saída diária automática no calendário
  useEffect(() => {
    if (!loaded) return;
    const monthly = forecastItems.reduce(
      (s, i) => s + (i.period === "semanal" ? i.amount * (30 / 7) : i.amount),
      0,
    );
    const perDay =
      forecastItems.length > 0 && forecastDivisor > 0
        ? Math.round((monthly / forecastDivisor) * 100) / 100
        : 0;

    setRecurrences((prev) => {
      const existing = prev.find((r) => r.id === FORECAST_ID);
      if (perDay > 0) {
        if (!existing) {
          const first = iso(today.getFullYear(), today.getMonth(), 1);
          return [
            ...prev,
            {
              id: FORECAST_ID,
              kind: "diarios",
              name: "previsão gasto diário",
              label: "gasto diário",
              tags: ["previsão"],
              amount: perDay,
              freq: "daily",
              daysOfMonth: [],
              daysOfWeek: [],
              startDate: first,
              installments: null,
              endDate: null,
              skipped: [],
            } satisfies Recurrence,
          ];
        }
        if (Math.abs(existing.amount - perDay) < 0.001 && existing.kind === "diarios") return prev;
        return prev.map((r) =>
          r.id === FORECAST_ID ? { ...r, amount: perDay, kind: "diarios" } : r,
        );
      }
      return existing ? prev.filter((r) => r.id !== FORECAST_ID) : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastItems, forecastDivisor, loaded]);

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

  const rows = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const openingDate = iso(cursor.y, cursor.m, 1);
    const opening =
      signedTotal(sorted.filter((e) => e.date < openingDate)) +
      recurrences.reduce((s, r) => {
        const sign = balanceSign(r.kind as Kind, r.horizonTransfer);
        return s + sign * sumBefore(r, openingDate);
      }, 0);

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
            sign: balanceSign(e.kind, e.horizonTransfer),
            amount: e.amount,
            detail: e.label,
            entryId: e.id,
            date,
            horizonTransfer: e.horizonTransfer === true,
          } satisfies DayItem;
        }),
        ...dayOccurrences.map((o) => {
          const k = KINDS.find((x) => x.key === o.kind) ?? KINDS[1]!;
          return {
            key: `${o.recurrenceId}-${o.date}`,
            kind: k.key,
            title: k.title,
            sign: balanceSign(k.key, o.horizonTransfer),
            amount: o.amount,
            detail: `${o.name || o.label}${
              o.total ? ` · ${o.index}/${o.total}` : " · recorrente"
            }`,
            recurrenceId: o.recurrenceId,
            date: o.date,
            horizonTransfer: o.horizonTransfer === true,
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

  /** dados da aba totais: dias com diários lançados e dias restantes do mês */
  const totalsData = useMemo(() => {
    const diaryDays = rows.list.filter((r) => r.totals.diarios > 0).length;
    const sameMonth = cursor.y === today.getFullYear() && cursor.m === today.getMonth();
    const remainingDays = sameMonth ? daysInMonth - today.getDate() + 1 : daysInMonth;
    return { totals: monthTotals, diaryDays, remainingDays };
  }, [rows, monthTotals, cursor, daysInMonth]);

  /** tags do mês com total somado */
  const tagRows = useMemo<TagRow[]>(() => {
    const map = new Map<string, { total: number; count: number }>();
    const push = (tags: string[] | undefined, amount: number) => {
      for (const t of tags ?? []) {
        const cur = map.get(t) ?? { total: 0, count: 0 };
        map.set(t, { total: cur.total + amount, count: cur.count + 1 });
      }
    };
    const first = iso(cursor.y, cursor.m, 1);
    const last = iso(cursor.y, cursor.m, daysInMonth);
    for (const e of entries) {
      if (e.date >= first && e.date <= last) push(e.tags, e.amount);
    }
    for (const r of recurrences) {
      for (const o of occurrencesInMonth(r, cursor.y, cursor.m)) push(o.tags, o.amount);
    }
    return Array.from(map, ([tag, v]) => ({ tag, total: v.total, count: v.count }));
  }, [entries, recurrences, cursor, daysInMonth]);


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
        signedTotal(sorted.filter((e) => e.date < first)) +
        recurrences.reduce((s, r) => {
          const k = KINDS.find((x) => x.key === r.kind);
          if (!k) return s;
          return s + balanceSign(r.kind as Kind, r.horizonTransfer) * sumBefore(r, first);
        }, 0);

      const byDate = new Map<string, number>();
      for (const e of sorted) {
        if (e.date >= first) {
          const k = KINDS.find((x) => x.key === e.kind);
          if (k) {
            byDate.set(
              e.date,
              (byDate.get(e.date) ?? 0) + balanceSign(e.kind, e.horizonTransfer) * e.amount,
            );
          }
        }
      }
      for (const r of recurrences) {
        for (const o of occurrencesInMonth(r, y, m)) {
          const k = KINDS.find((x) => x.key === o.kind);
          if (k) {
            byDate.set(
              o.date,
              (byDate.get(o.date) ?? 0) +
                balanceSign(o.kind as Kind, o.horizonTransfer) * o.amount,
            );
          }
        }
      }

      const days = Array.from({ length: total }, (_, idx) => {
        const day = idx + 1;
        const date = iso(y, m, day);
        running += byDate.get(date) ?? 0;
        return { day, date, balance: running, status: horizonStatusOf(running) };
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
    setAdding(false);
    setError(null);
    setShowCal(false);
    setView("saldos");
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
    setSelectedDay(now.getDate());
    const target = iso(now.getFullYear(), now.getMonth(), now.getDate());
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-day-row="${target}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
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
    setEditTarget(null);
    setFormOrigin("standard");
  }

  const fmtAmount = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /** abre o formulário já preenchido com tudo que o lançamento tem hoje */
  function startFullEdit(item: DayItem) {
    setError(null);
    setShowCal(false);
    if (item.recurrenceId) {
      const r = recurrences.find((x) => x.id === item.recurrenceId);
      if (!r) return;
      setKind(r.kind as Kind);
      setAmount(fmtAmount(r.amount));
      setLabel(r.label);
      setDebtName(r.name);
      setTags(r.tags ?? []);
      setFormDate(r.startDate);
      setFreq(r.freq === "monthly" ? "mensal" : r.freq === "weekly" ? "semanal" : "diario");
      setInfinite(r.installments == null);
      setInstallments(String(r.installments ?? 12));
      setDaysOfMonth(r.daysOfMonth ?? []);
      setDaysOfWeek(r.daysOfWeek ?? []);
      setEditTarget({ type: "rec", id: r.id });
      return;
    }
    if (item.entryId) {
      const en = entries.find((x) => x.id === item.entryId);
      if (!en) return;
      setKind(en.kind);
      setAmount(fmtAmount(en.amount));
      setLabel(en.label);
      setDebtName(en.label);
      setTags(en.tags ?? []);
      setFormDate(en.date);
      setFreq("unico");
      setInfinite(false);
      setInstallments("12");
      setDaysOfMonth([]);
      setDaysOfWeek([]);
      setEditTarget({ type: "entry", id: en.id });
    }
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

    // edição de um lançamento existente: preserva tudo, aplica só o que mudou
    if (editTarget) {
      const cleanLabel = label.trim() || (SUGGESTIONS[kind][0] ?? "Outro");
      const recName =
        debtName.trim() || label.trim() || KINDS.find((k) => k.key === kind)!.title;
      const isRec = freq !== "unico";
      let parcelas: number | null = null;
      let dom: number[] = [];
      let dow: number[] = [];
      if (isRec) {
        parcelas = infinite ? null : Math.floor(Number(installments));
        if (!infinite && (!Number.isFinite(parcelas) || (parcelas ?? 0) < 1)) {
          setError("Informe a quantidade de parcelas ou marque 'sem fim'.");
          return;
        }
        dom = freq === "mensal" ? (daysOfMonth.length ? daysOfMonth : [d]) : [];
        dow =
          freq === "semanal"
            ? daysOfWeek.length
              ? daysOfWeek
              : [new Date(y, m, d).getDay()]
            : [];
      }
      const mappedFreq =
        freq === "mensal" ? "monthly" : freq === "semanal" ? "weekly" : "daily";
      setError(null);

      if (editTarget.type === "entry") {
        if (isRec) {
          commit(entries.filter((en) => en.id !== editTarget.id), [
            ...recurrences,
            {
              id: crypto.randomUUID(),
              kind,
              name: recName,
              label: cleanLabel,
              tags: cleanTags,
              amount: value,
              freq: mappedFreq,
              daysOfMonth: dom,
              daysOfWeek: dow,
              startDate: date,
              installments: parcelas,
              endDate: null,
              skipped: [],
            },
          ]);
        } else {
          commit(
            entries.map((en) =>
              en.id === editTarget.id
                ? {
                    ...en,
                    amount: value,
                    date,
                    label: debtName.trim() || cleanLabel,
                    kind,
                    tags: cleanTags,
                  }
                : en,
            ),
            recurrences,
          );
        }
      } else if (isRec) {
        commit(
          entries,
          recurrences.map((r) =>
            r.id === editTarget.id
              ? {
                  ...r,
                  kind,
                  name: recName,
                  label: cleanLabel,
                  tags: cleanTags,
                  amount: value,
                  freq: mappedFreq,
                  daysOfMonth: dom,
                  daysOfWeek: dow,
                  startDate: date,
                  installments: parcelas,
                }
              : r,
          ),
        );
      } else {
        commit(
          [
            ...entries,
            {
              id: crypto.randomUUID(),
              amount: value,
              date,
              label: debtName.trim() || cleanLabel,
              kind,
              tags: cleanTags,
            },
          ],
          recurrences.filter((r) => r.id !== editTarget.id),
        );
      }

      resetForm();
      setAdding(false);
      setSelectedDay(null);
      setCursor({ y, m });
      scrollTableToStart();
      return;
    }

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
    // caminho inverso: apagou a saída da previsão no calendário → limpa a previsão
    if (skips.some((s) => s.recurrenceId === FORECAST_ID)) {
      commit(
        entries.filter((e) => !entryIds.has(e.id)),
        recurrences.filter((r) => r.id !== FORECAST_ID),
      );
      setForecastItems([]);
      setSelected({});
      return;
    }
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

  /** edita o valor de um lançamento avulso */
  function updateEntryAmount(id: string, value: number) {
    commit(
      entries.map((e) => (e.id === id ? { ...e, amount: value } : e)),
      recurrences,
    );
  }

  /** edita o valor de uma parcela/recorrência (vale para todas as ocorrências) */
  function updateRecurrenceAmount(recurrenceId: string, value: number) {
    commit(
      entries,
      recurrences.map((r) => (r.id === recurrenceId ? { ...r, amount: value } : r)),
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
    // caminho inverso: apagou a saída automática no calendário → limpa a previsão
    if (recurrenceId === FORECAST_ID) setForecastItems([]);
  }

  function deleteAll() {
    commit([], []);
    setForecastItems([]);
    setSelected({});
    setConfirmAll(null);
  }

  /** apaga tudo dentro de um intervalo de datas (mês ou ano) */
  function clearRange(startIso: string, endIso: string, months: { y: number; m: number }[]) {
    const skipByRec = new Map<string, string[]>();
    for (const r of recurrences) {
      const dates: string[] = [];
      for (const mo of months) {
        for (const o of occurrencesInMonth(r, mo.y, mo.m)) {
          if (o.date >= startIso && o.date <= endIso) dates.push(o.date);
        }
      }
      if (dates.length) skipByRec.set(r.id, dates);
    }
    commit(
      entries.filter((e) => e.date < startIso || e.date > endIso),
      recurrences.map((r) => {
        const dates = skipByRec.get(r.id);
        return dates ? { ...r, skipped: [...r.skipped, ...dates] } : r;
      }),
    );
    setSelected({});
    setConfirmAll(null);
  }

  function clearMonth() {
    const last = new Date(cursor.y, cursor.m + 1, 0).getDate();
    clearRange(iso(cursor.y, cursor.m, 1), iso(cursor.y, cursor.m, last), [
      { y: cursor.y, m: cursor.m },
    ]);
  }

  function clearMonthForDate(y: number, m: number) {
    const last = new Date(y, m + 1, 0).getDate();
    clearRange(iso(y, m, 1), iso(y, m, last), [{ y, m }]);
  }

  function clearYear() {
    clearRange(
      iso(cursor.y, 0, 1),
      iso(cursor.y, 11, 31),
      Array.from({ length: 12 }, (_, m) => ({ y: cursor.y, m })),
    );
  }



  const isToday = (day: number) =>
    cursor.y === today.getFullYear() && cursor.m === today.getMonth() && day === today.getDate();

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
          setKind("entradas");
          setEditTarget(null);
          setAdding(true);
        }}
        onToday={goToday}
        active={view === "diario" ? "menu" : view}
        onNavigate={(key) => {
          setAdding(false);
          setError(null);
          setShowCal(false);
          if (key === "horizonte") {
            setHorizonStart({ y: cursor.y, m: cursor.m });
            setView("horizonte");
          } else if (key === "menu") {
            setView("diario");
          } else if (key === "totais" || key === "tags") {
            setView(key);

          } else {
            setView("saldos");
          }
        }}
      />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:px-8">
            <h1 className="truncate font-display text-xl font-semibold text-foreground sm:text-2xl">
              {view === "diario" ? "previsão gasto diário" : view}
            </h1>
            <div className={`flex shrink-0 items-center gap-1 ${view === "horizonte" || view === "menu" || view === "diario" ? "hidden" : ""}`}>
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
        {view === "horizonte" && !adding ? (
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
              setKind("entradas");
              setEditTarget(null);
              setAdding(true);
            }}
          />
        ) : view === "totais" && !adding ? (
          <TotalsBoard data={totalsData} />
        ) : (view === "diario" || view === "menu") && !adding ? (
          <DailyForecastBoard
            items={forecastItems}
            divisor={forecastDivisor}
            onDivisorChange={setForecastDivisor}
            onSave={(item) =>
              setForecastItems((prev) => {
                const exists = prev.some((p) => p.id === item.id);
                return exists ? prev.map((p) => (p.id === item.id ? item : p)) : [...prev, item];
              })
            }
            onDelete={(id) => setForecastItems((prev) => prev.filter((p) => p.id !== id))}
            onBack={() => setView("saldos")}
          />
        ) : view === "tags" && !adding ? (
          <TagsBoard
            rows={tagRows}
            onAdd={() => {
              setError(null);
              setShowCal(false);
              const sameMonth = cursor.y === today.getFullYear() && cursor.m === today.getMonth();
              const day = sameMonth ? today.getDate() : 1;
              setFormDate(iso(cursor.y, cursor.m, day));
              setKind("entradas");
              setEditTarget(null);
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
          {confirmAll === "tudo" ? (
            <>
              <button onClick={deleteAll} className={dangerBtn}>
                confirmar: resetar tudo (sistema)
              </button>
              <button onClick={() => setConfirmAll(null)} className={actionBtn}>
                cancelar
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmAll("tudo")} className={dangerBtn}>
              resetar tudo (sistema)
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
              className={`grid min-w-[760px] ${GRID} items-stretch px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}
            >
              <span className="flex items-center">dia</span>
              {KINDS.map((k) => (
                <span
                  key={k.key}
                  className="flex items-center justify-end gap-1.5 border-l border-border/70 px-2"
                >
                  <span
                    aria-hidden
                    className={`grid size-4 place-items-center rounded-full text-[9px] font-bold ${kindBadge[k.key]}`}
                  >
                    {k.title.charAt(0).toUpperCase()}
                  </span>
                  {k.title}
                </span>
              ))}
              <span className="flex items-center justify-end border-l border-border/70 px-2">
                saldos
              </span>
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
                      onClick={(ev) => {
                        setError(null);
                        setShowCal(false);
                        setSelectedDay(row.day);
                        setFormDate(row.date);
                        const clickedKind = (ev.target as HTMLElement)
                          .closest("[data-kind]")
                          ?.getAttribute("data-kind") as Kind | null;
                        setKind(clickedKind ?? "entradas");
                        setEditTarget(null);
                        setAdding(true);
                      }}
                      className={`grid w-full ${GRID} items-stretch px-3 py-2.5 text-left transition-colors hover:bg-accent/50 ${
                        open ? "bg-accent/60" : ""
                      } ${isToday(row.day) ? "border-b-2 border-foreground" : ""}`}
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
                          data-kind={k.key}
                          className={`flex items-center justify-end truncate border-l border-border/70 px-2 text-sm tabular-nums ${
                            row.totals[k.key] > 0
                              ? `font-medium ${kindTone[k.key]}`
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {brl(row.totals[k.key])}
                        </span>
                      ))}
                      <span className="flex items-center justify-end border-l border-border/70 px-2">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-right text-sm font-semibold tabular-nums ${saldoCell[s]}`}
                        >
                          {brl(row.balance)}
                        </span>
                      </span>
                    </button>

                  </div>
                );
              })}
            </div>

            <div
              className={`grid ${GRID} items-stretch border-t border-border bg-secondary px-3 py-3 text-sm font-semibold`}
            >
              <span className="flex items-center text-xs uppercase tracking-wide text-muted-foreground">
                total
              </span>
              {KINDS.map((k) => (
                <span
                  key={k.key}
                  className={`flex items-center justify-end border-l border-border/70 px-2 tabular-nums ${kindTone[k.key]}`}
                >
                  {brl(monthTotals[k.key])}
                </span>
              ))}
              <span className="flex items-center justify-end border-l border-border/70 px-2">
                <span
                  className={`rounded-lg px-2.5 py-1 text-right tabular-nums ${saldoCell[closingStatus]}`}
                >
                  {brl(rows.closing)}
                </span>
              </span>
            </div>

          </div>
        </section>
        </div>




        {adding && (() => {
          const windowDayRow =
            formDateParts.y === cursor.y && formDateParts.m === cursor.m
              ? rows.list[formDateParts.d - 1] ?? null
              : null;
          const windowDayItems = (windowDayRow?.items ?? []).filter(
            (it) => it.recurrenceId !== FORECAST_ID,
          );
          const monthPrefix = iso(formDateParts.y, formDateParts.m, 1).slice(0, 7);
          const monthHasItems =
            entries.some((e) => e.date.startsWith(monthPrefix)) ||
            recurrences.some((r) => occurrencesInMonth(r, formDateParts.y, formDateParts.m).length > 0);
          return (
          <AddWindow
            subtitle={new Date(formDateParts.y, formDateParts.m, formDateParts.d).toLocaleDateString(
              "pt-BR",
              { day: "2-digit", month: "long", year: "numeric" },
            )}
            onDeleteDay={() => deleteItems(windowDayItems)}
            onDeleteMonth={() => clearMonthForDate(formDateParts.y, formDateParts.m)}
            deleteDayDisabled={windowDayItems.length === 0}
            deleteMonthDisabled={!monthHasItems}
            onClose={() => {
              setAdding(false);
              setError(null);
              setShowCal(false);
              setEditTarget(null);
            }}

          >
            {(() => {
              const dayItems = windowDayItems;
              if (dayItems.length === 0) return null;
              return (
                <div className="mb-3 rounded-2xl bg-card p-4">
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      lançamentos deste dia
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteItems(dayItems)}
                      className={dangerBtn}
                    >
                      apagar todos
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {dayItems.map((it) => (
                      <DayItemDeleteRow
                        key={it.key}
                        item={it}
                        onDeleteEntry={() => deleteItems([it])}
                        onSkip={() =>
                          it.recurrenceId && skipOccurrence(it.recurrenceId, it.date)
                        }
                        onEndFrom={() =>
                          it.recurrenceId && endRecurrenceFrom(it.recurrenceId, it.date)
                        }
                        onRemoveRecurrence={() =>
                          it.recurrenceId && removeRecurrence(it.recurrenceId)
                        }
                        onEditAmount={(value) => {
                          if (it.recurrenceId) updateRecurrenceAmount(it.recurrenceId, value);
                          else if (it.entryId) updateEntryAmount(it.entryId, value);
                        }}
                        onEditFull={() => startFullEdit(it)}
                      />

                    ))}
                  </div>
                </div>
              );
            })()}
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
                  onChange={(ev) => setAmount(sanitizeAmountInput(ev.target.value))}
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
                {editTarget ? "salvar alterações" : `adicionar ${KINDS.find((k) => k.key === kind)!.title}`}
              </button>
            </form>
          </AddWindow>
          );
        })()}
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
