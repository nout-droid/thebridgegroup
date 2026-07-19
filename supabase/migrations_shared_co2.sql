-- CO2-indicatie ook zichtbaar voor de klant op de share-pagina. Voer dit één keer uit in
-- de Supabase SQL Editor.

create or replace function public.get_shared_co2(p_share_token uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'flight_count', coalesce((
      select count(*) from public.crew_members cm
      where cm.project_id = p.id and cm.needs_flight = true
    ), 0),
    'total_km', coalesce((
      select sum(c.estimated_km) from public.categories c
      where c.project_id = p.id and c.estimated_km is not null
    ), 0),
    'quote_kg', coalesce((
      select sum(q.co2_kg)
      from public.quotes q
      join public.categories c on c.id = q.category_id
      where c.project_id = p.id and q.co2_kg is not null
    ), 0)
  )
  from public.projects p
  where p.share_token = p_share_token;
$$;

grant execute on function public.get_shared_co2(uuid) to anon;
