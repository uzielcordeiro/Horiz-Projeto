import { useLayoutEffect, useRef, useState } from "react";
import { brl, compactBrl } from "@/lib/money-format";

/**
 * Shows the full BRL value; switches to the short form (10K, 1Mi, 1Bi)
 * only when the full value does not fit in its box. The box is the closest
 * ancestor marked with data-fit, or the direct parent.
 */
export function FitMoney({ value, symbol = true }: { value: number; symbol?: boolean }) {
  const fullText = symbol
    ? brl(value)
    : Math.trunc(value).toLocaleString("pt-BR");
  const shortText = compactBrl(value, symbol);
  const boxRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fits, setFits] = useState(true);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = measureRef.current;
    const container = (box?.parentElement?.closest("[data-fit]") ?? box?.parentElement) as
      | HTMLElement
      | null;
    if (!box || !measure || !container) return;
    const check = () => {
      if (container.clientWidth === 0) return setFits(true);
      const cs = getComputedStyle(container);
      const inner =
        container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const range = document.createRange();
      range.selectNodeContents(container);
      const content = range.getBoundingClientRect().width;
      const others = Math.max(0, content - Math.max(box.offsetWidth, measure.offsetWidth));
      setFits(measure.offsetWidth <= inner - others + 0.5);
    };
    check();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(container);
    return () => ro.disconnect();
  }, [fullText, fits]);

  return (
    <span ref={boxRef} title={fits ? undefined : fullText} className="relative inline-block whitespace-nowrap">
      {fits ? fullText : shortText}
      <span ref={measureRef} aria-hidden className="invisible absolute left-0 top-0 whitespace-nowrap">
        {fullText}
      </span>
    </span>
  );
}
