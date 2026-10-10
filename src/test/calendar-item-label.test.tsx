import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CalendarItemLabel } from "@/components/CalendarItemLabel";

afterEach(cleanup);

describe("Calendar launch tags", () => {
  it.each(["entradas", "saidas", "cartao"])("shows only tag names below the %s label", (kind) => {
    const { container } = render(
      <CalendarItemLabel label="Salário · 1/12" kind={kind} tags={["salário", "fixo"]} />,
    );
    expect(screen.getByText("Salário · 1/12")).toBeInTheDocument();
    const tags = screen.getByText("tag: salário, fixo");
    expect(tags).toHaveClass("text-xs");
    expect(tags.textContent).not.toContain("1/12");
    expect(container.firstElementChild?.lastElementChild).toBe(tags);
  });

  it.each([undefined, []])("adds no line when tags are absent (%s)", (tags) => {
    const { container } = render(<CalendarItemLabel label="Freela · 1/1" kind="entradas" tags={tags} />);
    expect(container.firstElementChild?.children).toHaveLength(1);
    expect(container.textContent).toBe("Freela · 1/1");
  });

  it.each(["diarios", "economias"])("keeps %s unchanged", (kind) => {
    render(<CalendarItemLabel label="Reserva" kind={kind} tags={["fixo"]} />);
    expect(screen.queryByText("tag: fixo")).not.toBeInTheDocument();
  });
});