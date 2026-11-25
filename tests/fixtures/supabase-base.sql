-- Solo para instancias desechables. Aproxima el esquema educativo legado observado.
create table public.tt_progreso (
  codigo text primary key,
  nombre text,
  datos jsonb not null default '{}',
  actualizado timestamptz not null default now()
);
alter table public.tt_progreso enable row level security;
revoke all on public.tt_progreso from public,anon,authenticated;
grant select,insert,update,delete on public.tt_progreso to service_role;
