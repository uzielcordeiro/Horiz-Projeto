import { describe, expect, it } from "vitest";
import { formatMoneyInput, moneyGhostSuffix } from "@/lib/money-input";

describe("casas decimais enquanto digita", () => {
  it("10 mostra ,00 faltando", () => expect(moneyGhostSuffix("10")).toBe(",00"));
  it("10,5 mostra 0 faltando", () => expect(moneyGhostSuffix("10,5")).toBe("0"));
  it("9,67 está completo", () => expect(moneyGhostSuffix("9,67")).toBe(""));
  it("vazio não mostra nada", () => expect(moneyGhostSuffix("")).toBe(""));
  it("valor grande ganha ponto", () => expect(formatMoneyInput("50000")).toBe("50.000"));
  it("valor pequeno só vírgula", () => expect(formatMoneyInput("10,5")).toBe("10,5"));
});
