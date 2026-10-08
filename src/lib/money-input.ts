/**
 * Formata o que é digitado num campo de valor no padrão brasileiro:
 * ponto separa milhares, vírgula separa centavos (máx. 2 casas).
 * Ex.: "50000" -> "50.000", "50000,5" -> "50.000,5".
 */
export function formatMoneyInput(raw: string): string {
  const clean = raw.replace(/[^\d,]/g, "");
  const commaIdx = clean.indexOf(",");
  const intRaw = commaIdx === -1 ? clean : clean.slice(0, commaIdx);
  const decRaw = commaIdx === -1 ? null : clean.slice(commaIdx + 1).replace(/,/g, "").slice(0, 2);
  const intDigits = intRaw.replace(/^0+(?=\d)/, "");
  const intFmt = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (decRaw === null) return intFmt;
  return `${intFmt || "0"},${decRaw}`;
}

/** Valor numérico de um texto no padrão brasileiro ("50.000,50" -> 50000.5). */
export function parseMoneyInput(input: string): number {
  return Number(input.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", "."));
}

/**
 * Casas decimais que ainda faltam no que foi digitado, para mostrar clarinho.
 * "" -> "", "10" -> ",00", "10," -> "00", "10,5" -> "0", "10,50" -> "".
 */
export function moneyGhostSuffix(value: string): string {
  if (!value) return "";
  const i = value.indexOf(",");
  if (i === -1) return ",00";
  return "0".repeat(Math.max(0, 2 - (value.length - i - 1)));
}
