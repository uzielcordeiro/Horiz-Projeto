import { describe, expect, it } from "vitest";
import { dailyRepetitionCount, occurrencesUntil, type Recurrence } from "../lib/recurrence";

describe("daily repetition", () => {
  it("accepts only positive whole numbers, not words, empty values or decimals", () => {
    expect(dailyRepetitionCount("1")).toBe(1);
    expect(dailyRepetitionCount("2")).toBe(2);
    expect(dailyRepetitionCount("3")).toBe(3);
    for (const input of ["", "0", "-1", "três", "3.5", "3,5", "1e2", "Infinity"]) {
      expect(dailyRepetitionCount(input)).toBeNull();
    }
  });

  it.each(["entradas", "saidas", "diarios", "economias", "cartao"] as const)(
    "%s: R$ 100 in three daily repetitions creates exactly R$ 300, then stops",
    (kind) => {
      const recurrence: Recurrence = {
        id: "daily-three", kind, name: "Teste", label: "Teste", amount: 100,
        freq: "daily", daysOfMonth: [], daysOfWeek: [], startDate: "2026-10-08",
        installments: dailyRepetitionCount("3"), skipped: [],
      };
      const occurrences = occurrencesUntil(recurrence, "2026-11-30");
      expect(occurrences.map((item) => item.date)).toEqual(["2026-10-08", "2026-10-09", "2026-10-10"]);
      expect(occurrences.map((item) => item.amount)).toEqual([100, 100, 100]);
      expect(occurrences.reduce((total, item) => total + item.amount, 0)).toBe(300);
    },
  );
});
describe("diárias com dias escolhidos", () => {
  it("cai exatamente nos dias marcados do mês", () => {
    const rec: Recurrence = {
      id: "x", kind: "entradas", name: "d", label: "d", amount: 100, freq: "daily",
      daysOfMonth: [31, 8, 15], daysOfWeek: [], startDate: "2026-10-08", installments: 3, skipped: [],
    };
    expect(occurrencesUntil(rec, "2027-12-31").map((o) => o.date)).toEqual(["2026-10-08", "2026-10-15", "2026-10-31"]);
  });
});
