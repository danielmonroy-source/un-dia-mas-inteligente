-- Cuenta de papás: entrar con correo en lugar de depender del enlace con código.
-- Solo agrega cosas; no cambia ni borra el avance de Adolfo. Se puede correr más de una vez.
-- Mientras no actives "Proteger" en la app, el enlace con código sigue funcionando igual que hoy.

-- Qué cuentas de papás pueden ver a qué jugador.
create table if not exists public.tt_familia (
  user_id uuid not null references auth.users(id) on delete cascade,
  codigo text not null references public.tt_progreso(codigo) on delete cascade,
  creado timestamptz not null default now(),
  primary key (user_id, codigo)
);
alter table public.tt_familia enable row level security;
revoke all on public.tt_familia from anon, authenticated;

-- Cuando está en true, el código solo ya no basta: hay que iniciar sesión con una cuenta vinculada.
alter table public.tt_progreso add column if not exists solo_cuenta boolean not null default false;

-- ¿Quien llama puede usar este jugador?
create or replace function public.tt_permitido(p_codigo text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tt_progreso p
    where p.codigo = p_codigo
      and (not p.solo_cuenta
           or exists (select 1 from public.tt_familia f where f.codigo = p.codigo and f.user_id = (select auth.uid()))))
$$;
revoke execute on function public.tt_permitido(text) from public, anon, authenticated;

-- Las funciones de siempre, ahora revisando el permiso.
create or replace function public.tt_cargar(p_codigo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.tt_progreso where codigo = p_codigo) then return null; end if;
  if not public.tt_permitido(p_codigo) then return jsonb_build_object('login', true); end if;
  return (select jsonb_build_object('datos', datos, 'actualizado', actualizado) from public.tt_progreso where codigo = p_codigo);
end $$;

create or replace function public.tt_guardar(p_codigo text, p_datos jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
begin
  if not public.tt_permitido(p_codigo) then raise exception 'sin permiso'; end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' or octet_length(p_datos::text) > 200000 then
    raise exception 'datos invalidos';
  end if;
  update public.tt_progreso set datos = p_datos, actualizado = now() where codigo = p_codigo;
  if not found then raise exception 'codigo no registrado'; end if;
  return now();
end $$;

create or replace function public.tt_guardar2(p_codigo text, p_datos jsonb, p_base timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cur timestamptz;
begin
  if not public.tt_permitido(p_codigo) then raise exception 'sin permiso'; end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' or octet_length(p_datos::text) > 200000 then
    raise exception 'datos invalidos';
  end if;
  select actualizado into cur from public.tt_progreso where codigo = p_codigo for update;
  if not found then raise exception 'codigo no registrado'; end if;
  if p_base is not null and cur is not null and cur > p_base + interval '1 millisecond' then
    return jsonb_build_object('ok', false, 'conflicto', true, 'actualizado', cur);
  end if;
  update public.tt_progreso set datos = p_datos, actualizado = now() where codigo = p_codigo;
  return jsonb_build_object('ok', true, 'actualizado', now());
end $$;

create or replace function public.tt_respaldos_listar(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'creado', creado, 'motivo', motivo, 'pts', datos->'pts') order by creado desc), '[]'::jsonb)
  from (select * from public.tt_respaldos where codigo = p_codigo and public.tt_permitido(p_codigo) order by creado desc limit 30) r
$$;

create or replace function public.tt_respaldo_cargar(p_codigo text, p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select datos from public.tt_respaldos where codigo = p_codigo and id = p_id and public.tt_permitido(p_codigo)
$$;

create or replace function public.tt_respaldo_crear(p_codigo text, p_motivo text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.tt_permitido(p_codigo) then raise exception 'sin permiso'; end if;
  insert into public.tt_respaldos(codigo, datos, actualizado, motivo)
  select codigo, datos, actualizado, left(coalesce(p_motivo, 'manual'), 60) from public.tt_progreso where codigo = p_codigo;
  return found;
end $$;

create or replace function public.tt_intentos_agregar(p_codigo text, p_intentos jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.tt_permitido(p_codigo) then raise exception 'sin permiso'; end if;
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

create or replace function public.tt_intentos_cargar(p_codigo text, p_desde timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(i) - 'codigo' order by i.ts), '[]'::jsonb)
  from (select * from public.tt_intentos where codigo = p_codigo and ts >= p_desde and public.tt_permitido(p_codigo) order by ts limit 5000) i
$$;

-- Solo con sesión iniciada: vincular la cuenta con un jugador (hace falta saber su código, y que no esté protegido o ya estar vinculado).
create or replace function public.tt_vincular(p_codigo text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'sin sesion'; end if;
  if not public.tt_permitido(p_codigo) then raise exception 'sin permiso'; end if;
  insert into public.tt_familia(user_id, codigo) values (uid, p_codigo) on conflict do nothing;
  return true;
end $$;

-- Jugadores vinculados a la cuenta que inició sesión.
create or replace function public.tt_mis_jugadores()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('codigo', p.codigo, 'nombre', p.nombre, 'solo_cuenta', p.solo_cuenta) order by f.creado), '[]'::jsonb)
  from public.tt_familia f join public.tt_progreso p on p.codigo = f.codigo
  where f.user_id = (select auth.uid())
$$;

-- Proteger (o volver a abrir) el acceso con solo el código. Solo una cuenta vinculada puede hacerlo.
create or replace function public.tt_solo_cuenta(p_codigo text, p_on boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.tt_familia where codigo = p_codigo and user_id = (select auth.uid())) then raise exception 'sin permiso'; end if;
  update public.tt_progreso set solo_cuenta = coalesce(p_on, false) where codigo = p_codigo;
  return coalesce(p_on, false);
end $$;

revoke execute on function public.tt_vincular(text), public.tt_mis_jugadores(), public.tt_solo_cuenta(text, boolean) from public, anon;
grant execute on function public.tt_vincular(text), public.tt_mis_jugadores(), public.tt_solo_cuenta(text, boolean) to authenticated;
grant execute on function public.tt_cargar(text), public.tt_guardar(text, jsonb), public.tt_guardar2(text, jsonb, timestamptz),
  public.tt_respaldos_listar(text), public.tt_respaldo_cargar(text, bigint), public.tt_respaldo_crear(text, text),
  public.tt_intentos_agregar(text, jsonb), public.tt_intentos_cargar(text, timestamptz) to anon, authenticated;
