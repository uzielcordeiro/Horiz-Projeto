import { describe, it, expect } from "vitest";
import { forecastBudgets, parseWeeks } from "./forecast";
describe("semanal com semanas", () => {
  it("aceita número e por extenso", () => {
    expect(parseWeeks("3")).toBe(3);
    expect(parseWeeks("duas semanas")).toBe(2);
    expect(parseWeeks("três")).toBe(3);
    expect(parseWeeks("")).toBeNull();
  });
  it("R$100 em 2 semanas = R$200 no mês", () => {
    expect(forecastBudgets([{ amount: 100, period: "semanal", weeks: 2 }]).monthly).toBe(200);
  });
});
