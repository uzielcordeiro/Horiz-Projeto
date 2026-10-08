import { describe, expect, it } from "vitest";
import { forecastMonthAmounts } from "@/lib/recurrence";

describe("ajuste de dia da previsão (outubro/2026, R$ 500)", () => {
  it("sem ajustes, todo dia vale 16,12", () => {
    expect(forecastMonthAmounts(500, 0, {}, 2026, 9).every((v) => v === 16.12)).toBe(true);
  });
  it("apagar dia 6 recalcula do dia 6 ao 31 e não mexe nos dias 1-5", () => {
    const v = forecastMonthAmounts(500, 0, { "2026-10-06": null }, 2026, 9);
    expect(v.slice(0, 5)).toEqual([16.12, 16.12, 16.12, 16.12, 16.12]);
    expect(v[5]).toBe(15.5);
    expect(v[30]).toBe(15.5);
  });
  it("gastar 100 no dia 7 recalcula do dia 8 em diante", () => {
    const v = forecastMonthAmounts(500, 0, { "2026-10-07": 100 }, 2026, 9);
    expect(v[6]).toBe(100);
    expect(v[7]).toBe(12.62);
  });
});
