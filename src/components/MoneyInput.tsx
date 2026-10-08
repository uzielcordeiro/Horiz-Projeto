import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { formatMoneyInput, moneyGhostSuffix } from "@/lib/money-input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  wrapperClassName?: string;
};

/**
 * Campo de valor no padrão brasileiro: formata enquanto digita e mostra,
 * mais clarinho, as casas decimais que faltam ("10" -> "10" + ",00").
 * Ao sair do campo, completa as casas de verdade.
 */
export function MoneyInput({ value, onValueChange, className, wrapperClassName, onBlur, ...rest }: Props) {
  const ghost = moneyGhostSuffix(value);
  return (
    <span className={cn("relative block", wrapperClassName)}>
      <input
        {...rest}
        inputMode="decimal"
        value={value}
        onChange={(e) => onValueChange(formatMoneyInput(e.target.value))}
        onBlur={(e) => {
          if (ghost) onValueChange(value + ghost);
          onBlur?.(e);
        }}
        className={className}
      />
      {ghost && (
        <span
          aria-hidden
          className={cn(
            className,
            "pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre border-transparent bg-transparent shadow-none ring-0",
          )}
        >
          <span className="invisible">{value}</span>
          <span className="text-muted-foreground/60">{ghost}</span>
        </span>
      )}
    </span>
  );
}
