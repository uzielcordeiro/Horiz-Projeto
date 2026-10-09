import { describe, expect, it } from "vitest";
import { forecastMonthAmounts, dailyBudgetForDay, occurrencesUntil, type Recurrence } from "@/lib/recurrence";
import { cents } from "@/lib/money-format";

const sum = (v: number[]) => v.reduce((s, x) => cents(s + x), 0);

describe("ajuste de dia da previsão (outubro/2026, R$ 500)", () => {
  it("sem ajustes, dias 1-30 valem 16,12 e o dia 31 leva os centavos: fecha 500", () => {
    const v = forecastMonthAmounts(500, 0, {}, 2026, 9);
    expect(v.slice(0, 30).every((x) => x === 16.12)).toBe(true);
    expect(v[30]).toBe(16.4);
    expect(sum(v)).toBe(500);
  });
  it("sem ajustes, o valor por dia no calendário também fecha o mês", () => {
    let t = 0;
    for (let d = 1; d <= 28; d++) t = cents(t + dailyBudgetForDay(1000, 0, 2026, 1, d));
    expect(t).toBe(1000);
  });
  it("apagar dia 6 recalcula do dia 6 em diante e não mexe nos dias 1-5", () => {
    const v = forecastMonthAmounts(500, 0, { "2026-10-06": null }, 2026, 9);
    expect(v.slice(0, 5)).toEqual([16.12, 16.12, 16.12, 16.12, 16.12]);
    expect(v[5]).toBe(15.51);
    expect(sum(v)).toBe(cents(500 - 16.12));
  });
  it("gastar 100 no dia 7 recalcula do dia 8 em diante e fecha 500", () => {
    const v = forecastMonthAmounts(500, 0, { "2026-10-07": 100 }, 2026, 9);
    expect(v[6]).toBe(100);
    expect(v[7]).toBe(12.63);
    expect(sum(v)).toBe(500);
  });
});

describe("repetição diária sem fim", () => {
  it("não para depois de 16 anos", () => {
    const rec = {
      id: "x", kind: "diarios", freq: "daily", startDate: "2026-01-01", amount: 1,
      name: "", label: "", skipped: [], daysOfMonth: [], installments: null,
    } as unknown as Recurrence;
    const occ = occurrencesUntil(rec, "2056-01-01");
    expect(occ.length).toBeGreaterThan(10000);
    expect(occ[occ.length - 1]?.date).toBe("2056-01-01");
  });
});
