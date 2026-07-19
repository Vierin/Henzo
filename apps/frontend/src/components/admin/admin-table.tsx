type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

type AdminTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
};

export function AdminTable<T extends { id?: string }>({
  columns,
  rows,
  emptyMessage = 'No data',
}: AdminTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/40">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-4 py-3 font-medium text-muted-foreground"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={(row as { id?: string }).id ?? i}
              className="border-b border-border/50 last:border-0"
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-foreground">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
