import { describe, expect, it } from "vitest";

import { monthItemLabel } from "@/lib/month-item-label";

describe("Compact month list labels", () => {
  it("marks a launch that does not repeat as 1/1", () => {
    expect(monthItemLabel("Salário", false)).toBe("Salário · 1/1");
  });

  it("keeps the installment text of a recurrence", () => {
    expect(monthItemLabel("Aluguel · 3/12", true)).toBe("Aluguel · 3/12");
  });

  it("never shows the old single-time phrase", () => {
    expect(monthItemLabel("Freela", false)).not.toContain("uma única vez");
  });
});
