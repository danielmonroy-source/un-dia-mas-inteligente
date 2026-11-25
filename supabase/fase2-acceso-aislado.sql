-- Prototipo para Supabase aislado. No modifica las rutas heredadas.
-- El adulto vinculado crea el perfil en una sesión reciente y autoriza el UID
-- anónimo de Auth del dispositivo. El dispositivo no recibe el código heredado.
create table public.tt_acceso_perfiles (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique references public.tt_progreso(codigo) on update cascade on delete cascade
);
create table public.tt_acceso_dispositivos (
  perfil uuid not null references public.tt_acceso_perfiles(id) on delete cascade,
  dispositivo uuid not null references auth.users(id) on delete cascade,
  primary key(perfil,dispositivo)
);
alter table public.tt_acceso_perfiles enable row level security;
alter table public.tt_acceso_dispositivos enable row level security;
revoke all on public.tt_acceso_perfiles,public.tt_acceso_dispositivos from public,anon,authenticated;

create function public.tt_fase2_padre(p_codigo text)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
    and exists (select 1 from public.tt_familia f where f.codigo=p_codigo and f.user_id=auth.uid())
    and exists (select 1 from auth.sessions s where s.user_id=auth.uid()
      and s.id::text=auth.jwt()->>'session_id' and s.created_at>=now()-interval '10 minutes');
$$;

create function public.tt_fase2_autorizar(p_codigo text,p_dispositivo uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare perfil_id uuid;
begin
  if not public.tt_fase2_padre(p_codigo) or not exists (
    select 1 from auth.users u where u.id=p_dispositivo and u.is_anonymous
  ) then raise exception 'sin permiso' using errcode='42501'; end if;
  insert into public.tt_acceso_perfiles(codigo) values(p_codigo)
    on conflict(codigo) do update set codigo=excluded.codigo returning id into perfil_id;
  insert into public.tt_acceso_dispositivos values(perfil_id,p_dispositivo) on conflict do nothing;
  return perfil_id;
end;
$$;

create function public.tt_fase2_revocar(p_perfil uuid,p_dispositivo uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists (select 1 from public.tt_acceso_perfiles p
    where p.id=p_perfil and public.tt_fase2_padre(p.codigo)) then
    raise exception 'sin permiso' using errcode='42501';
  end if;
  delete from public.tt_acceso_dispositivos where perfil=p_perfil and dispositivo=p_dispositivo;
end;
$$;

create function public.tt_fase2_estudio(p_perfil uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare progreso jsonb;
begin
  select jsonb_build_object('datos',s.datos-'pin'-'pinH'-'pinDef','actualizado',s.actualizado) into progreso
  from public.tt_acceso_perfiles p join public.tt_progreso s on s.codigo=p.codigo
  join public.tt_acceso_dispositivos d on d.perfil=p.id
  where p.id=p_perfil and d.dispositivo=auth.uid()
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false);
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return progreso;
end;
$$;
revoke execute on function public.tt_fase2_padre(text),public.tt_fase2_autorizar(text,uuid),
  public.tt_fase2_revocar(uuid,uuid),public.tt_fase2_estudio(uuid) from public,anon,authenticated;
grant execute on function public.tt_fase2_autorizar(text,uuid),public.tt_fase2_revocar(uuid,uuid),
  public.tt_fase2_estudio(uuid) to authenticated;

-- Copia operativa a una sola lectura MVCC. Guardar cifrada fuera del repositorio.
create function public.tt_fase2_copia(p_perfil uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare codigo_perfil text;
begin
  select p.codigo into codigo_perfil from public.tt_acceso_perfiles p
  where p.id=p_perfil and public.tt_fase2_padre(p.codigo);
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return jsonb_build_object(
    'formato',1,'perfil',p_perfil,'fecha',statement_timestamp(),
    'progreso',(select jsonb_build_object('datos',datos-'pin'-'pinH'-'pinDef','version',actualizado)
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
revoke execute on function public.tt_fase2_copia(uuid) from public,anon,authenticated;
grant execute on function public.tt_fase2_copia(uuid) to authenticated;

-- El rol de estudio puede modificar únicamente evidencias y actividad educativa.
create function public.tt_fase2_guardar_estudio(p_perfil uuid,p_datos jsonb,p_base timestamptz,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare codigo_perfil text; anterior jsonb; actual timestamptz; avance jsonb; dias jsonb;
begin
  if p_datos is null or jsonb_typeof(p_datos)<>'object' or octet_length(p_datos::text)>200000 then
    raise exception 'datos invalidos' using errcode='22023';
  end if;
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
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into avance
    from jsonb_each(p_datos)
    where key=any(array['pts','best','streak','last','days','facts','med','miss','sr','daily','rd',
      'rdLog','rk','enIdx','enDone','enLearned','retoDays','ku','cal','cie','cult','gx','ts']);
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
  return public.tt_escribir_interno(codigo_perfil,anterior||avance,p_base,p_id);
end;
$$;
revoke execute on function public.tt_fase2_guardar_estudio(uuid,jsonb,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.tt_fase2_guardar_estudio(uuid,jsonb,timestamptz,uuid) to authenticated;

create function public.tt_fase2_intentos(p_perfil uuid,p_intentos jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare codigo_perfil text; inserted integer;
begin
  select p.codigo into codigo_perfil
    from public.tt_acceso_perfiles p join public.tt_acceso_dispositivos d on d.perfil=p.id
    where p.id=p_perfil and d.dispositivo=auth.uid()
      and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    for share of d;
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  if p_intentos is null or jsonb_typeof(p_intentos)<>'array'
     or jsonb_array_length(p_intentos)>200 or octet_length(p_intentos::text)>200000 then
    raise exception 'intentos invalidos' using errcode='22023';
  end if;
  insert into public.tt_intentos(id,codigo,k,ts,origen,fmt,ok,primero,pista,ms,err,extra)
  select i.id,codigo_perfil,left(i.k,120),i.ts,left(i.origen,20),left(i.fmt,10),i.ok,
    coalesce(i.primero,false),coalesce(i.pista,false),
    case when i.ms is not null then least(greatest(i.ms,0),3600000) end,left(i.err,40),
    case when octet_length(i.extra::text)<=2000 then i.extra end
  from jsonb_to_recordset(p_intentos) as i(id uuid,k text,ts timestamptz,origen text,fmt text,
    ok boolean,primero boolean,pista boolean,ms integer,err text,extra jsonb)
  on conflict(id) do nothing;
  get diagnostics inserted=row_count;
  return inserted;
end;
$$;
revoke execute on function public.tt_fase2_intentos(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.tt_fase2_intentos(uuid,jsonb) to authenticated;
