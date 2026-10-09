import { describe, expect, it } from "vitest";
import { occurrencesInMonth, occurrencesUntil, sumBefore, weeklyRepetitionCount, weeklyRepetitionLimit, type Recurrence } from "../lib/recurrence";

const weekly = (changes: Partial<Recurrence> = {}): Recurrence => ({
  id: "weekly", kind: "entradas", name: "Teste", label: "Teste", amount: 100,
  freq: "weekly", daysOfMonth: [], daysOfWeek: [4], startDate: "2026-10-08",
  installments: 2, skipped: [], weeklyWithinStartMonth: true, ...changes,
});

describe("weekly repetition within the start month", () => {
  it("counts the initial date and allows four or five dates when they fit", () => {
    expect(weeklyRepetitionLimit("2026-10-08")).toBe(4);
    expect(weeklyRepetitionLimit("2026-10-01")).toBe(5);
    expect(weeklyRepetitionLimit("2026-02-01")).toBe(4);
    expect(weeklyRepetitionLimit("2028-02-01")).toBe(5);
    expect(weeklyRepetitionLimit("2026-10-31")).toBe(1);
  });

  it("requires a positive whole count that fits in the month", () => {
    expect(weeklyRepetitionCount("2", "2026-10-08")).toBe(2);
    expect(weeklyRepetitionCount("5", "2026-10-01")).toBe(5);
    for (const input of ["", "0", "-1", "2.5", "2,5", "duas", "5", "Infinity"]) {
      expect(weeklyRepetitionCount(input, "2026-10-08")).toBeNull();
    }
  });

  it.each(["entradas", "saidas", "diarios", "economias", "cartao"] as const)(
    "%s: creates full amounts on the exact dates and recalculates after editing", (kind) => {
      const rec = weekly({ kind });
      expect(occurrencesUntil(rec, "2027-12-31").map(o => [o.date, o.amount])).toEqual([
        ["2026-10-08", 100], ["2026-10-15", 100],
      ]);
      expect(sumBefore(rec, "2026-11-01")).toBe(200);
      const edited = { ...rec, installments: 4, amount: 150 };
      expect(occurrencesInMonth(edited, 2026, 9).map(o => o.date)).toEqual([
        "2026-10-08", "2026-10-15", "2026-10-22", "2026-10-29",
      ]);
      expect(sumBefore(edited, "2026-11-01")).toBe(600);
      expect(occurrencesInMonth(edited, 2026, 10)).toEqual([]);
    },
  );

  it("caps defensive generation at month end and honors skipped and ended dates", () => {
    expect(occurrencesUntil(weekly({ installments: 12 }), "2027-01-31")).toHaveLength(4);
    expect(occurrencesUntil(weekly({ installments: 4, skipped: ["2026-10-15"], endDate: "2026-10-22" }), "2026-12-31").map(o => o.date)).toEqual(["2026-10-08", "2026-10-22"]);
    expect(occurrencesUntil(weekly({ installments: null }), "2026-12-31")).toEqual([]);
  });

  it("preserves unmarked saved weekly recurrences", () => {
    const legacy = weekly({ installments: 5 });
    delete legacy.weeklyWithinStartMonth;
    expect(occurrencesUntil(legacy, "2026-12-31").at(-1)?.date).toBe("2026-11-05");
  });
});