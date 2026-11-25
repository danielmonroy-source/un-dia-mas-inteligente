-- Fase T1: registro de cada respuesta (intentos).
-- Solo agrega una tabla y dos funciones; no cambia ni borra los datos del jugador. Se puede correr más de una vez.
-- Registra el código del jugador y evidencias educativas seudonimizadas.
create table if not exists public.tt_intentos (
  id uuid primary key,
  codigo text not null,
  k text not null,               -- conocimiento, por ejemplo 'mul:4x7', 'en:dog', 'sr:suma-con', 'lec:info'
  ts timestamptz not null,       -- cuándo contestó (hora del dispositivo)
  origen text,                   -- reto, libre o diagnóstico
  fmt text,                      -- seq (en orden), rec (elegir), rcl (recordar), mix, apl (aplicar)
  ok boolean not null,
  primero boolean not null,
  pista boolean not null default false,
  ms integer,                    -- milisegundos para contestar
  err text,                      -- tipo de error
  extra jsonb,                   -- respuesta dada y detalles del ejercicio
  creado timestamptz not null default now()
);
create index if not exists tt_intentos_codigo_ts on public.tt_intentos (codigo, ts desc);
alter table public.tt_intentos enable row level security;
revoke all on public.tt_intentos from anon, authenticated;

-- Agregar intentos (hasta 500 por llamada). Los repetidos se ignoran, así que reintentar es seguro.
create or replace function public.tt_intentos_agregar(p_codigo text, p_intentos jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not exists (select 1 from public.tt_progreso where codigo = p_codigo) then raise exception 'codigo no registrado'; end if;
  if p_intentos is null or jsonb_typeof(p_intentos) <> 'array' or jsonb_array_length(p_intentos) > 500 then raise exception 'intentos invalidos'; end if;
  insert into public.tt_intentos (id, codigo, k, ts, origen, fmt, ok, primero, pista, ms, err, extra)
  select x.id, p_codigo, left(x.k, 120), x.ts, left(x.origen, 20), left(x.fmt, 10), x.ok, coalesce(x.primero, false), coalesce(x.pista, false),
         least(greatest(x.ms, 0), 3600000), left(x.err, 40),
         case when octet_length(coalesce(x.extra::text, '')) <= 2000 then x.extra end
  from jsonb_to_recordset(p_intentos) as x(id uuid, k text, ts timestamptz, origen text, fmt text, ok boolean, primero boolean, pista boolean, ms integer, err text, extra jsonb)
  where x.id is not null and x.k is not null and x.ts is not null and x.ok is not null
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Leer intentos desde una fecha (para el panel de papás y para rehacer el resumen si hiciera falta).
create or replace function public.tt_intentos_cargar(p_codigo text, p_desde timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(i) - 'codigo' order by i.ts), '[]'::jsonb)
  from (select * from public.tt_intentos where codigo = p_codigo and ts >= p_desde order by ts limit 5000) i
$$;

revoke execute on function public.tt_intentos_agregar(text,jsonb), public.tt_intentos_cargar(text,timestamptz) from public;
grant execute on function public.tt_intentos_agregar(text,jsonb), public.tt_intentos_cargar(text,timestamptz) to anon, authenticated;
