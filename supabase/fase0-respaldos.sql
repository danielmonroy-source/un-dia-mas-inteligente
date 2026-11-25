-- Fase 0: respaldos automáticos y guardado que no pisa otros dispositivos.
-- Solo agrega cosas; no cambia ni borra los datos de Adolfo. Se puede correr más de una vez.
create table if not exists public.tt_respaldos (
  id bigint generated always as identity primary key,
  codigo text not null,
  datos jsonb not null,
  actualizado timestamptz,
  creado timestamptz not null default now(),
  motivo text not null default 'auto'
);
create index if not exists tt_respaldos_codigo_creado on public.tt_respaldos (codigo, creado desc);
alter table public.tt_respaldos enable row level security;
revoke all on public.tt_respaldos from anon, authenticated;

-- Antes de cada cambio guarda la versión anterior (una por hora, y siempre antes de que bajen los puntos o se borre).
create or replace function public.tt_respaldar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.datos is distinct from new.datos then
    if coalesce((new.datos->>'pts')::numeric,0) < coalesce((old.datos->>'pts')::numeric,0)
       or not exists (select 1 from public.tt_respaldos r where r.codigo = old.codigo and r.creado > now() - interval '1 hour') then
      insert into public.tt_respaldos(codigo, datos, actualizado, motivo)
      values (old.codigo, old.datos, old.actualizado,
              case when coalesce((new.datos->>'pts')::numeric,0) < coalesce((old.datos->>'pts')::numeric,0) then 'antes de bajar puntos o borrar' else 'auto' end);
    end if;
    delete from public.tt_respaldos r where r.codigo = old.codigo and r.creado < now() - interval '60 days' and r.motivo = 'auto';
  end if;
  return new;
end $$;
revoke execute on function public.tt_respaldar() from public, anon, authenticated;
drop trigger if exists tt_progreso_respaldo on public.tt_progreso;
create trigger tt_progreso_respaldo before update on public.tt_progreso for each row execute function public.tt_respaldar();

-- Guardado con control de versión: si otro dispositivo guardó después, avisa en lugar de sobrescribir.
create or replace function public.tt_guardar2(p_codigo text, p_datos jsonb, p_base timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cur timestamptz;
begin
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

-- Respaldos: solo con el código del jugador.
create or replace function public.tt_respaldos_listar(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'creado', creado, 'motivo', motivo, 'pts', datos->'pts') order by creado desc), '[]'::jsonb)
  from (select * from public.tt_respaldos where codigo = p_codigo order by creado desc limit 30) r
$$;
create or replace function public.tt_respaldo_cargar(p_codigo text, p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select datos from public.tt_respaldos where codigo = p_codigo and id = p_id
$$;
create or replace function public.tt_respaldo_crear(p_codigo text, p_motivo text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tt_respaldos(codigo, datos, actualizado, motivo)
  select codigo, datos, actualizado, left(coalesce(p_motivo,'manual'), 60) from public.tt_progreso where codigo = p_codigo;
  return found;
end $$;
revoke execute on function public.tt_guardar2(text,jsonb,timestamptz), public.tt_respaldos_listar(text), public.tt_respaldo_cargar(text,bigint), public.tt_respaldo_crear(text,text) from public;
grant execute on function public.tt_guardar2(text,jsonb,timestamptz), public.tt_respaldos_listar(text), public.tt_respaldo_cargar(text,bigint), public.tt_respaldo_crear(text,text) to anon, authenticated;

-- Primer respaldo: el avance actual.
insert into public.tt_respaldos(codigo, datos, actualizado, motivo)
select codigo, datos, actualizado, 'inicio fase 0' from public.tt_progreso;
