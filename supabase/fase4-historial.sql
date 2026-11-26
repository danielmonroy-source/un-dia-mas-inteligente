-- Aplicar primero en un entorno aislado. La migración de cada perfil ocurre al guardar.
begin;
create table public.tt_historial_lecciones (
  codigo text not null references public.tt_progreso(codigo) on update cascade on delete cascade,
  recorrido uuid not null,
  datos jsonb not null,
  primary key (codigo,recorrido)
);
alter table public.tt_historial_lecciones enable row level security;
revoke all on public.tt_historial_lecciones from public,anon,authenticated;

create function public.tt_historial_completo(p_codigo text,p_datos jsonb)
returns jsonb language sql stable set search_path='' as $$
  select case when h.runs is null then p_datos else p_datos||jsonb_build_object('lessons',
    jsonb_build_object('v',1,'runs',coalesce(p_datos->'lessons'->'runs','{}'::jsonb)||h.runs)) end
  from (select jsonb_object_agg(datos->>'id',datos) as runs
    from public.tt_historial_lecciones where codigo=p_codigo) h;
$$;

create function public.tt_validar_historial(p_datos jsonb)
returns void language plpgsql set search_path='' as $$
declare r record;
begin
  if p_datos is null or jsonb_typeof(p_datos)<>'object'
     or octet_length((p_datos-'lessons')::text)>200000
     or coalesce(octet_length((p_datos->'lessons')::text),0)>4000000 then
    raise exception 'datos invalidos' using errcode='22023';
  end if;
  if not p_datos ? 'lessons' then return; end if;
  if p_datos->'lessons'->>'v' is distinct from '1'
     or jsonb_typeof(p_datos->'lessons'->'runs') is distinct from 'object'
     or p_datos->'lessons' is distinct from jsonb_build_object('v',1,'runs',p_datos->'lessons'->'runs') then
    raise exception 'lecciones inválidas' using errcode='22023';
  end if;
  for r in select key,value from jsonb_each(p_datos->'lessons'->'runs') loop
    if r.key !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
       or r.value->>'id' is distinct from r.key
       or jsonb_typeof(r.value->'events') is distinct from 'object' then
      raise exception 'recorrido inválido' using errcode='22023';
    end if;
    if exists (select 1 from jsonb_each(r.value->'events') e
      where e.key !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or e.value->>'id' is distinct from e.key) then
      raise exception 'evento inválido' using errcode='22023';
    end if;
  end loop;
end;
$$;
revoke execute on function public.tt_historial_completo(text,jsonb),
  public.tt_validar_historial(jsonb) from public,anon,authenticated;


create or replace function public.tt_escribir_interno(p_codigo text,p_datos jsonb,p_base timestamptz,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actual timestamptz; guardada timestamptz; previo jsonb; reinicio boolean;
begin
  if p_id is null or p_base is null then
    raise exception 'datos invalidos' using errcode='22023';
  end if;
  select actualizado,datos into actual,previo from public.tt_progreso where codigo=p_codigo for update;
  if not found then
    raise exception 'sin permiso' using errcode='42501';
  end if;
  select version into guardada from public.tt_escrituras where codigo=p_codigo and id=p_id and base=p_base;
  if found then return jsonb_build_object('ok',true,'actualizado',guardada); end if;
  if actual is distinct from p_base then return jsonb_build_object('ok',false,'conflicto',true); end if;
  perform public.tt_validar_historial(p_datos);
  reinicio:=p_datos ? 'resetAt' and (p_datos->'resetAt') is distinct from (previo->'resetAt');
  guardada:=greatest(clock_timestamp(),actual+interval '1 microsecond');
  update public.tt_progreso set datos=p_datos-'lessons',actualizado=guardada where codigo=p_codigo;
  if reinicio then
    delete from public.tt_historial_lecciones where codigo=p_codigo;
  end if;
  -- Conserva primero los UUID previamente confirmados.
  insert into public.tt_historial_lecciones as h(codigo,recorrido,datos)
    select p_codigo,r.key::uuid,r.value from jsonb_each(coalesce(previo->'lessons'->'runs','{}')) r
    where not reinicio
    on conflict(codigo,recorrido) do update set datos=jsonb_set(h.datos,'{events}',
      (excluded.datos->'events')||(h.datos->'events'));
  insert into public.tt_historial_lecciones as h(codigo,recorrido,datos)
    select p_codigo,r.key::uuid,r.value from jsonb_each(coalesce(p_datos->'lessons'->'runs','{}')) r
    on conflict (codigo,recorrido) do update set datos=jsonb_set(h.datos,'{events}',
      (excluded.datos->'events')||(h.datos->'events'))
    where not (h.datos->'events') @> (excluded.datos->'events');
  insert into public.tt_escrituras(codigo,id,base,version) values(p_codigo,p_id,p_base,guardada);
  return jsonb_build_object('ok',true,'actualizado',guardada);
end;
$$;

create or replace function public.tt_fase2_guardar_estudio(p_perfil uuid,p_datos jsonb,p_base timestamptz,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare codigo_perfil text; anterior jsonb; actual timestamptz; avance jsonb; dias jsonb;
begin
  select p.codigo into codigo_perfil
    from public.tt_acceso_perfiles p join public.tt_acceso_dispositivos d on d.perfil=p.id
    where p.id=p_perfil and d.dispositivo=auth.uid()
      and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    for share of d;
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  select datos,actualizado into anterior,actual from public.tt_progreso where codigo=codigo_perfil for update;
  if exists (select 1 from public.tt_escrituras e where e.codigo=codigo_perfil and e.id=p_id and e.base=p_base) then
    return public.tt_escribir_interno(codigo_perfil,anterior,p_base,p_id);
  end if;
  if actual is distinct from p_base then return jsonb_build_object('ok',false,'conflicto',true); end if;
  perform public.tt_validar_historial(p_datos);
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into avance
    from jsonb_each(p_datos)
    where key=any(array['pts','best','streak','last','days','facts','med','miss','sr','daily','rd',
      'rdLog','rk','enIdx','enDone','enLearned','retoDays','ku','cal','cie','cult','gx','ts','diag','lessons']);
  if avance ? 'pts' and (jsonb_typeof(avance->'pts') is distinct from 'number'
    or (avance->>'pts')::numeric<coalesce((anterior->>'pts')::numeric,0)) then
    raise exception 'el modo de estudio no puede restablecer puntos' using errcode='42501';
  end if;
  if avance ? 'daily' then
    if jsonb_typeof(avance->'daily') is distinct from 'object' or exists (
      select 1 from jsonb_each(avance->'daily') e
      where e.key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or jsonb_typeof(e.value)<>'object'
    ) then raise exception 'reto inválido' using errcode='22023'; end if;
    select coalesce(jsonb_object_agg(e.key,(e.value-'cfg'-'redo'-'prevCal')||
      jsonb_strip_nulls(jsonb_build_object(
        'cfg',coalesce(anterior->'daily'->e.key->'cfg',anterior->'retoCfg'),
        'redo',anterior->'daily'->e.key->'redo',
        'prevCal',anterior->'daily'->e.key->'prevCal'))),'{}') into dias
    from jsonb_each(avance->'daily') e;
    avance:=jsonb_set(avance,'{daily}',coalesce(anterior->'daily','{}')||dias);
  end if;
  if avance ? 'diag' then
    if jsonb_typeof(avance->'diag') is distinct from 'object' or avance->'diag'->>'v' is distinct from '1'
        or jsonb_typeof(avance->'diag'->'answers') is distinct from 'object'
        or jsonb_typeof(avance->'diag'->'drafts') is distinct from 'object' then
      raise exception 'diagnóstico inválido' using errcode='22023';
    end if;
    avance:=jsonb_set(avance,'{diag,answers}',(avance->'diag'->'answers')||
      coalesce(anterior->'diag'->'answers','{}'::jsonb));
    if (select count(*) from jsonb_object_keys(avance->'diag'->'answers'))>250 then
      raise exception 'demasiadas respuestas diagnósticas' using errcode='22023';
    end if;
  end if;
  return public.tt_escribir_interno(codigo_perfil,(anterior-'lessons')||avance,p_base,p_id);
end;
$$;

create or replace function public.tt_fase2_estudio(p_perfil uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare progreso jsonb;
begin
  select jsonb_build_object('datos',public.tt_historial_completo(s.codigo,s.datos)-'pin'-'pinH'-'pinDef','actualizado',s.actualizado,'historialSeparado',true) into progreso
  from public.tt_acceso_perfiles p join public.tt_progreso s on s.codigo=p.codigo
  join public.tt_acceso_dispositivos d on d.perfil=p.id
  where p.id=p_perfil and d.dispositivo=auth.uid()
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false);
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return progreso;
end;
$$;

create or replace function public.tt_fase2_copia(p_perfil uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare codigo_perfil text;
begin
  select p.codigo into codigo_perfil from public.tt_acceso_perfiles p
  where p.id=p_perfil and public.tt_fase2_padre(p.codigo);
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return jsonb_build_object(
    'formato',1,'perfil',p_perfil,'fecha',statement_timestamp(),
    'progreso',(select jsonb_build_object('datos',public.tt_historial_completo(codigo,datos)-'pin'-'pinH'-'pinDef','version',actualizado)
      from public.tt_progreso where codigo=codigo_perfil),
    'intentos',(select coalesce(jsonb_agg(to_jsonb(i)-'codigo' order by i.ts,i.id),'[]')
      from public.tt_intentos i where i.codigo=codigo_perfil),
    'copias',(select coalesce(jsonb_agg((to_jsonb(r)-'codigo'-'datos')||jsonb_build_object(
      'datos',r.datos-'pin'-'pinH'-'pinDef') order by r.id),'[]')
      from public.tt_respaldos r where r.codigo=codigo_perfil),
    'escrituras',(select coalesce(jsonb_agg(to_jsonb(e)-'codigo' order by e.version),'[]')
      from public.tt_escrituras e where e.codigo=codigo_perfil)
  );
end;
$$;

create or replace function public.tt_familia_leer(p_perfil uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  select jsonb_build_object('datos',public.tt_historial_completo(s.codigo,s.datos)-'pin'-'pinH'-'pinDef','actualizado',s.actualizado,'historialSeparado',true)
    into result from public.tt_acceso_perfiles p join public.tt_progreso s using(codigo)
    where p.id=p_perfil and public.tt_fase2_padre(p.codigo);
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return result;
end;
$$;

create or replace function public.tt_respaldar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.datos is distinct from new.datos or old.actualizado is distinct from new.actualizado then
    if old.datos->'resetAt' is distinct from new.datos->'resetAt'
       or coalesce((new.datos->>'pts')::numeric,0) < coalesce((old.datos->>'pts')::numeric,0)
       or not exists (select 1 from public.tt_respaldos r where r.codigo = old.codigo and r.creado > now() - interval '1 hour') then
      insert into public.tt_respaldos(codigo, datos, actualizado, motivo)
      values (old.codigo, public.tt_historial_completo(old.codigo,old.datos), old.actualizado,
              case when old.datos->'resetAt' is distinct from new.datos->'resetAt' or coalesce((new.datos->>'pts')::numeric,0) < coalesce((old.datos->>'pts')::numeric,0) then 'antes de bajar puntos o borrar' else 'auto' end);
    end if;
    delete from public.tt_respaldos r where r.codigo = old.codigo and r.creado < now() - interval '60 days' and r.motivo = 'auto';
  end if;
  return new;
end $$;

create or replace function public.tt_cargar(p_codigo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.tt_progreso where codigo = p_codigo) then return null; end if;
  if not public.tt_permitido(p_codigo) then return jsonb_build_object('login', true); end if;
  return (select jsonb_build_object('datos', public.tt_historial_completo(codigo,datos), 'actualizado', actualizado,'historialSeparado',true) from public.tt_progreso where codigo = p_codigo);
end $$;

create or replace function public.tt_respaldo_crear(p_codigo text, p_motivo text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.tt_permitido(p_codigo) then raise exception 'sin permiso'; end if;
  insert into public.tt_respaldos(codigo, datos, actualizado, motivo)
  select codigo, public.tt_historial_completo(codigo,datos), actualizado, left(coalesce(p_motivo, 'manual'), 60) from public.tt_progreso where codigo = p_codigo;
  return found;
end $$;

create or replace function public.tt_guardar_legado_interno(p_codigo text,p_datos jsonb)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare actual timestamptz;
begin
  select actualizado into actual from public.tt_progreso where codigo=p_codigo for update;
  if not found or not public.tt_permitido(p_codigo) then
    raise exception 'sin permiso' using errcode='42501';
  end if;
  return (public.tt_escribir_interno(p_codigo,p_datos,actual,gen_random_uuid())->>'actualizado')::timestamptz;
end;
$$;

create or replace function public.tt_guardar2_legado_interno(p_codigo text,p_datos jsonb,p_base timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actual timestamptz;
begin
  select actualizado into actual from public.tt_progreso where codigo=p_codigo for update;
  if not found or not public.tt_permitido(p_codigo) then
    raise exception 'sin permiso' using errcode='42501';
  end if;
  if p_base is not null and actual > p_base + interval '1 millisecond' then
    return jsonb_build_object('ok',false,'conflicto',true,'actualizado',actual);
  end if;
  return public.tt_escribir_interno(p_codigo,p_datos,actual,gen_random_uuid());
end;
$$;

commit;
