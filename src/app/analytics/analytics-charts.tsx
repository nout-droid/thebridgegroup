"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface YearBarDatum {
  year: string;
  omzet: number;
  marge: number;
}

function euro(value: number) {
  return `€ ${value.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`;
}

export function YearComparisonChart({
  data,
  omzetLabel,
  margeLabel,
}: {
  data: YearBarDatum[];
  omzetLabel: string;
  margeLabel: string;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value) => euro(Number(value))}
            width={64}
          />
          <Tooltip
            formatter={(value) => euro(Number(value))}
            contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="omzet" name={omzetLabel} fill="var(--primary)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="marge" name={margeLabel} fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
