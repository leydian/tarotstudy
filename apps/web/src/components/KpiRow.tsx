import type { ReactNode } from 'react';

type KpiItem = {
  label: string;
  value: ReactNode;
};

type KpiRowProps = {
  items: KpiItem[];
};

export function KpiRow({ items }: KpiRowProps) {
  return (
    <section className="kpi-row">
      {items.map((item) => (
        <article className="kpi-card" key={item.label}>
          <p className="sub">{item.label}</p>
          <h3>{item.value}</h3>
        </article>
      ))}
    </section>
  );
}
