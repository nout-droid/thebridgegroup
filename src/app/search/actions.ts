"use server";

import { createClient } from "@/lib/supabase/server";

export interface GlobalSearchResult {
  type: "project" | "supplier" | "freelancer" | "venue" | "lead";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

// RLS op elke onderliggende tabel scoped al naar het eigen team (zie full_schema.sql) —
// deze query heeft dus geen aparte getTeamOwnerId-check nodig, net als elders in de app.
export async function globalSearch(query: string): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const like = `%${q}%`;

  const [{ data: projects }, { data: suppliers }, { data: freelancers }, { data: venues }, { data: leads }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, client_name")
        .or(`name.ilike.${like},client_name.ilike.${like}`)
        .limit(5),
      supabase.from("suppliers").select("id, name, specialties").ilike("name", like).limit(5),
      supabase.from("freelancers").select("id, name, role").ilike("name", like).limit(5),
      supabase.from("venues").select("id, name, address").ilike("name", like).limit(5),
      supabase
        .from("sales_leads")
        .select("id, company_name, contact_name")
        .or(`company_name.ilike.${like},contact_name.ilike.${like}`)
        .limit(5),
    ]);

  const results: GlobalSearchResult[] = [];

  for (const p of projects ?? []) {
    results.push({ type: "project", id: p.id, title: p.name, subtitle: p.client_name, href: `/projects/${p.id}` });
  }
  for (const s of suppliers ?? []) {
    results.push({ type: "supplier", id: s.id, title: s.name, subtitle: s.specialties, href: `/suppliers` });
  }
  for (const f of freelancers ?? []) {
    results.push({ type: "freelancer", id: f.id, title: f.name, subtitle: f.role, href: `/freelancers` });
  }
  for (const v of venues ?? []) {
    results.push({ type: "venue", id: v.id, title: v.name, subtitle: v.address ?? "", href: `/venues` });
  }
  for (const l of leads ?? []) {
    results.push({
      type: "lead",
      id: l.id,
      title: l.company_name,
      subtitle: l.contact_name,
      href: `/crm?q=${encodeURIComponent(l.company_name)}`,
    });
  }

  return results;
}
