type Props = {
  label: string;
  kind: string;
  tags?: string[] | undefined;
};

export function CalendarItemLabel({ label, kind, tags }: Props) {
  const showTags = ["entradas", "saidas", "cartao"].includes(kind) && Boolean(tags?.length);

  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
      {showTags && (
        <span className="block break-words text-xs font-normal text-muted-foreground">
          tag: {tags?.join(", ")}
        </span>
      )}
    </span>
  );
}