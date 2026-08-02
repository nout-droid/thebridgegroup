"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface FreelancerRow {
  id: string;
  name: string;
  role: string;
  skills: string[];
  projectId: string;
  projectName: string;
}

export function FreelancerSearch({
  rows,
  labels,
}: {
  rows: FreelancerRow[];
  labels: { placeholder: string; role: string; project: string; empty: string };
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.role, row.projectName, ...row.skills].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={labels.placeholder}
        className="max-w-sm"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3">Naam</th>
              <th className="py-2 pr-3">{labels.role}</th>
              <th className="py-2 pr-3">Skills</th>
              <th className="py-2">{labels.project}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{row.name}</td>
                <td className="py-2 pr-3 text-muted-foreground">{row.role || "—"}</td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {row.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="py-2 text-muted-foreground">{row.projectName}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-4 text-sm text-muted-foreground">{labels.empty}</p>}
      </div>
    </div>
  );
}
