import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TotalsBoard } from "@/components/TotalsBoard";
import { dailyBudgetAmount } from "@/lib/recurrence";

afterEach(cleanup);

describe("Totais daily forecast", () => {
  it.each([
    [2026, 9, 31],
    [2026, 10, 30],
    [2026, 1, 28],
    [2028, 1, 29],
    [2032, 1, 29],
    [2036, 1, 29],
  ])("uses the month length and Menu daily amount for %i/%i", (year, month, days) => {
    const forecastPerDay = dailyBudgetAmount(500, 70, year, month);
    const { container } = render(<TotalsBoard data={{
      totals: { entradas: 0, saidas: 0, diarios: 4193.54, economias: 0, cartao: 0 },
      diaryDays: days,
      daysInMonth: new Date(year, month + 1, 0).getDate(),
      forecastPerDay,
      savedTotal: 0,
    }} />);
    expect(screen.getByText(`× ${days} dias`)).toBeInTheDocument();
    const forecast = container.querySelector("section > div:last-child");
    expect(forecast?.textContent).toContain(forecastPerDay.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
    expect(forecast?.textContent).not.toContain("4.193,54");
    const movements = container.querySelector("section > div:nth-child(2)");
    expect(movements?.textContent).toContain("4.193,54");
    expect(forecastPerDay).toBe(Math.floor((50000 * 7 + 7000 * days) / (days * 7)) / 100);
  });
});

describe("Totais poupança phrase", () => {
  const renderWith = (entradas: number, economias: number) =>
    render(
      <TotalsBoard
        data={{
          totals: { entradas, saidas: 0, diarios: 0, economias, cartao: 0 },
          diaryDays: 0,
          daysInMonth: 31,
          forecastPerDay: 0,
          savedTotal: 0,
        }}
      />,
    );

  it.each<[number, number, string]>([
    [10000, 500, "poupando 5% do seu salário"],
    [10000, 470, "poupando 5% do seu salário"],
    [10000, 300, "poupando 3% do seu salário"],
    [1200, 100, "poupando 8% do seu salário"],
  ])("shows %i/%i as %s", (entradas, economias, expected) => {
    renderWith(entradas, economias);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("drops the old wording and the saved total", () => {
    const { container } = renderWith(10000, 500);
    expect(container.textContent).not.toContain("das entradas");
    expect(container.textContent).not.toContain("total poupado");
  });
});