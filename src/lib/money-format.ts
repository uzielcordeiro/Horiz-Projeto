export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const UNITS: [number, string][] = [
  [1e33, "De"],
  [1e30, "No"],
  [1e27, "Oc"],
  [1e24, "Sp"],
  [1e21, "Sx"],
  [1e18, "Qi"],
  [1e15, "Qa"],
  [1e12, "Tri"],
  [1e9, "Bi"],
  [1e6, "Mi"],
  [1e3, "K"],
];

/** Short form: 10000 -> "R$ 10K", 1500000 -> "R$ 1,5Mi", -1e9 -> "-R$ 1Bi". */
export function compactBrl(v: number, withSymbol = true): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const prefix = withSymbol ? "R$ " : "";
  for (const [size, label] of UNITS) {
    if (abs >= size) {
      const n = Math.floor((abs / size) * 10) / 10;
      return `${sign}${prefix}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${label}`;
    }
  }
  return `${sign}${prefix}${Math.floor(abs).toLocaleString("pt-BR")}`;
}
