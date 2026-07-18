type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
};

export function KpiCard({ label, value, hint, href }: KpiCardProps) {
  const card = (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-primary/40">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );

  if (!href) return card;

  return (
    <a href={href} className="block">
      {card}
    </a>
  );
}
