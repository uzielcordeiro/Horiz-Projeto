import { describe, expect, it } from "vitest";
import { compactBrl } from "@/lib/money-format";

describe("compactBrl", () => {
  it("10 mil vira 10K", () => expect(compactBrl(10000)).toBe("R$ 10K"));
  it("20 mil vira 20K", () => expect(compactBrl(20000)).toBe("R$ 20K"));
  it("1 milhão vira 1Mi", () => expect(compactBrl(1_000_000)).toBe("R$ 1Mi"));
  it("1 bilhão vira 1Bi", () => expect(compactBrl(1_000_000_000)).toBe("R$ 1Bi"));
  it("negativos mantêm o sinal", () => expect(compactBrl(-1_000_000_000)).toBe("-R$ 1Bi"));
  it("1,5 milhão vira 1,5Mi", () => expect(compactBrl(1_500_000)).toBe("R$ 1,5Mi"));
  it("1 trilhão vira 1Tri", () => expect(compactBrl(1e12)).toBe("R$ 1Tri"));
  it("4 trilhões viram 4Tri", () => expect(compactBrl(4e12)).toBe("R$ 4Tri"));
  it("600 trilhões viram 600Tri", () => expect(compactBrl(6e14)).toBe("R$ 600Tri"));
  it("1 quatrilhão vira 1Qa", () => expect(compactBrl(1e15)).toBe("R$ 1Qa"));
  it("720 quatrilhões viram 720Qa", () => expect(compactBrl(7.2e17)).toBe("R$ 720Qa"));
  it("1 quintilhão vira 1Qi", () => expect(compactBrl(1e18)).toBe("R$ 1Qi"));
  it("1 sextilhão vira 1Sx", () => expect(compactBrl(1e21)).toBe("R$ 1Sx"));
  it("1 septilhão vira 1Sp", () => expect(compactBrl(1e24)).toBe("R$ 1Sp"));
  it("1 octilhão vira 1Oc", () => expect(compactBrl(1e27)).toBe("R$ 1Oc"));
  it("1 nonilhão vira 1No", () => expect(compactBrl(1e30)).toBe("R$ 1No"));
  it("1 decilhão vira 1De", () => expect(compactBrl(1e33)).toBe("R$ 1De"));
  it("negativo de trilhão mantém o sinal", () => expect(compactBrl(-6e12)).toBe("-R$ 6Tri"));
  it("negativo de quintilhão mantém o sinal", () => expect(compactBrl(-2.5e18)).toBe("-R$ 2,5Qi"));
  it("sem símbolo funciona em qualquer escala", () =>
    expect(compactBrl(3e21, false)).toBe("3Sx"));
});
