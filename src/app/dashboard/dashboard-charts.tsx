"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DashboardChartsLabels {
  financialOverview: string;
  costPerProject: string;
  noCostData: string;
  categoryStatus: string;
  noCategoryData: string;
  upcomingEvents: string;
  noUpcomingEvents: string;
  more: string;
  client: string;
}

interface BarDatum {
  name: string;
  cost: number;
}

interface PieDatum {
  status: string;
  label: string;
  count: number;
}

interface UpcomingDatum {
  id: string;
  name: string;
  clientName: string | null;
  dateLabel: string;
}

// Grijstinten (--chart-1..4) uit globals.css, met de merkgroene --primary als accent voor de
// laatste/"belangrijkste" slice — zelfde zwart/wit/groen-palet als de rest van de app i.p.v.
// een generieke chart-kleurenset.
const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--primary)"];

function euro(value: number) {
  return `€ ${value.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`;
}

export function DashboardCharts({
  barData,
  barExtra,
  pieData,
  upcoming,
  labels,
}: {
  barData: BarDatum[];
  barExtra: number;
  pieData: PieDatum[];
  upcoming: UpcomingDatum[];
  labels: DashboardChartsLabels;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight">
        {labels.financialOverview}
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels.costPerProject}</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <p className="text-sm text-muted-foreground">{labels.noCostData}</p>
            ) : (
              <>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={56}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        tickFormatter={(value) => euro(Number(value))}
                        width={64}
                      />
                      <Tooltip
                        formatter={(value) => euro(Number(value))}
                        contentStyle={{
                          background: "var(--popover)",
                          borderColor: "var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="cost" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {barExtra > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    +{barExtra} {labels.more}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels.categoryStatus}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">{labels.noCategoryData}</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-56 w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="label"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="var(--card)"
                        strokeWidth={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          borderColor: "var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-1.5 text-sm sm:w-1/2">
                  {pieData.map((entry, index) => (
                    <li key={entry.status} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="inline-block size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        {entry.label}
                      </span>
                      <span className="font-medium text-foreground">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{labels.upcomingEvents}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.noUpcomingEvents}</p>
          ) : (
            <ol className="space-y-1">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/projects/${item.id}`}
                    className="flex items-center gap-3 border-l-2 border-primary/60 py-1.5 pl-3 transition-colors hover:border-primary hover:text-primary"
                  >
                    <span className="min-w-20 text-xs font-medium uppercase tracking-wide text-primary">
                      {item.dateLabel}
                    </span>
                    <span className="truncate text-sm">
                      <span className="font-medium">{item.name}</span>
                      {item.clientName && (
                        <span className="text-muted-foreground"> — {labels.client} {item.clientName}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
