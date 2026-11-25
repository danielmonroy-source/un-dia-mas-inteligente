-- Aplicar únicamente en un entorno aprobado. El corte es individual y explícito.
alter table public.tt_progreso add column tt_corte timestamptz;
alter table public.tt_acceso_dispositivos add column creado timestamptz not null default now();
create unique index tt_un_perfil_por_dispositivo on public.tt_acceso_dispositivos(dispositivo);

create function public.tt_padre_reciente()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
    where u.id=auth.uid() and not u.is_anonymous and u.email_confirmed_at is not null
      and s.id::text=auth.jwt()->>'session_id' and s.created_at>=now()-interval '10 minutes');
$$;

create function public.tt_familia_vincular(p_codigo text)
returns uuid language plpgsql security definer set search_path='' as $$
declare perfil_id uuid;
begin
  perform 1 from public.tt_progreso where codigo=p_codigo for update;
  if not found or not public.tt_padre_reciente() or not public.tt_permitido(p_codigo)
     or exists(select 1 from public.tt_familia where codigo=p_codigo and user_id<>auth.uid()) then
    raise exception 'sin permiso' using errcode='42501';
  end if;
  insert into public.tt_familia(user_id,codigo) values(auth.uid(),p_codigo) on conflict do nothing;
  insert into public.tt_acceso_perfiles(codigo) values(p_codigo)
    on conflict(codigo) do update set codigo=excluded.codigo returning id into perfil_id;
  return perfil_id;
end;
$$;

create function public.tt_familia_perfiles()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nombre',coalesce(nullif(s.datos->>'nombre',''),'Perfil de estudio'),
    'huella',encode(sha256(convert_to(p.codigo,'UTF8')),'hex')) order by p.id),'[]')
  from public.tt_acceso_perfiles p join public.tt_familia f using(codigo)
  join public.tt_progreso s using(codigo)
  where f.user_id=auth.uid() and public.tt_padre_reciente();
$$;

create function public.tt_familia_autorizar(p_perfil uuid,p_dispositivo uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare codigo_perfil text;
begin
  select codigo into codigo_perfil from public.tt_acceso_perfiles where id=p_perfil;
  if not found or not public.tt_padre_reciente() then raise exception 'sin permiso' using errcode='42501'; end if;
  return public.tt_fase2_autorizar(codigo_perfil,p_dispositivo);
end;
$$;

create function public.tt_familia_dispositivos(p_perfil uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare devices jsonb;
begin
  if not exists(select 1 from public.tt_acceso_perfiles p where p.id=p_perfil and public.tt_fase2_padre(p.codigo))
    then raise exception 'sin permiso' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',dispositivo,'creado',creado) order by creado),'[]')
    into devices from public.tt_acceso_dispositivos where perfil=p_perfil;
  return devices;
end;
$$;

create function public.tt_estudio_perfil()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',d.perfil,'huella',encode(sha256(convert_to(p.codigo,'UTF8')),'hex'))
    from public.tt_acceso_dispositivos d join auth.users u on u.id=d.dispositivo
    join public.tt_acceso_perfiles p on p.id=d.perfil
    where d.dispositivo=auth.uid() and u.is_anonymous;
$$;

create function public.tt_familia_leer(p_perfil uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  select jsonb_build_object('datos',s.datos-'pin'-'pinH'-'pinDef','actualizado',s.actualizado)
    into result from public.tt_acceso_perfiles p join public.tt_progreso s using(codigo)
    where p.id=p_perfil and public.tt_fase2_padre(p.codigo);
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return result;
end;
$$;

create function public.tt_familia_guardar(p_perfil uuid,p_datos jsonb,p_base timestamptz,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare codigo_perfil text; previo jsonb;
begin
  select p.codigo,s.datos into codigo_perfil,previo
    from public.tt_acceso_perfiles p join public.tt_progreso s using(codigo)
    where p.id=p_perfil and public.tt_fase2_padre(p.codigo) for update of s;
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return public.tt_escribir_interno(codigo_perfil,p_datos-'pin'-'pinH'-'pinDef'||jsonb_strip_nulls(
    jsonb_build_object('pin',previo->'pin','pinH',previo->'pinH','pinDef',previo->'pinDef')),p_base,p_id);
end;
$$;

create function public.tt_familia_intentos(p_perfil uuid,p_intentos jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare codigo_perfil text;
begin
  select codigo into codigo_perfil from public.tt_acceso_perfiles
    where id=p_perfil and public.tt_fase2_padre(codigo);
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return public.tt_intentos_agregar(codigo_perfil,p_intentos);
end;
$$;

create function public.tt_familia_restaurar(p_perfil uuid,p_base timestamptz,p_id uuid,p_datos jsonb,
  p_intentos jsonb,p_copias jsonb,p_escrituras jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare codigo_perfil text; actual timestamptz; previo jsonb; receipt timestamptz; result jsonb;
begin
  select p.codigo,s.actualizado,s.datos into codigo_perfil,actual,previo
  from public.tt_acceso_perfiles p join public.tt_progreso s using(codigo)
  where p.id=p_perfil and public.tt_fase2_padre(p.codigo) for update of s;
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  select version into receipt from public.tt_escrituras where codigo=codigo_perfil and id=p_id;
  if found then return jsonb_build_object('ok',true,'actualizado',receipt); end if;
  if p_base is distinct from actual then return jsonb_build_object('conflicto',true); end if;
  if jsonb_typeof(p_intentos) is distinct from 'array' or jsonb_typeof(p_copias) is distinct from 'array'
     or jsonb_typeof(p_escrituras) is distinct from 'array'
     or octet_length(p_intentos::text)+octet_length(p_copias::text)+octet_length(p_escrituras::text)>10000000
     then raise exception 'copia no válida' using errcode='22023'; end if;
  if jsonb_typeof(p_datos->'pts') is distinct from 'number' or (p_datos->>'pts')::numeric<
     coalesce((previo->>'pts')::numeric,0)
    then raise exception 'la copia no puede reducir el progreso confirmado' using errcode='22023'; end if;
  result:=public.tt_escribir_interno(codigo_perfil,p_datos-'pin'-'pinH'-'pinDef'||jsonb_strip_nulls(
    jsonb_build_object('pin',previo->'pin','pinH',previo->'pinH','pinDef',previo->'pinDef')),p_base,p_id);
  -- Una copia se aplica al mismo perfil. Los identificadores ya presentes se conservan.
  insert into public.tt_intentos(id,codigo,k,ts,origen,fmt,ok,primero,pista,ms,err,extra,creado)
    select i.id,codigo_perfil,i.k,i.ts,i.origen,i.fmt,i.ok,
    coalesce(i.primero,false),coalesce(i.pista,false),i.ms,i.err,i.extra,coalesce(i.creado,now())
    from jsonb_to_recordset(p_intentos) i(id uuid,k text,ts timestamptz,origen text,fmt text,ok boolean,
    primero boolean,pista boolean,ms integer,err text,extra jsonb,creado timestamptz)
    on conflict(id) do nothing;
  insert into public.tt_respaldos(codigo,datos,actualizado,creado,motivo)
    select codigo_perfil,r.datos,r.actualizado,r.creado,r.motivo
    from jsonb_to_recordset(p_copias) r(datos jsonb,actualizado timestamptz,creado timestamptz,motivo text)
    where not exists(select 1 from public.tt_respaldos b where b.codigo=codigo_perfil
      and b.creado=r.creado and b.motivo=r.motivo and b.datos=r.datos);
  insert into public.tt_escrituras(codigo,id,base,version)
    select codigo_perfil,e.id,e.base,e.version
    from jsonb_to_recordset(p_escrituras) e(id uuid,base timestamptz,version timestamptz)
    where e.version<=p_base and e.base<e.version
    on conflict(codigo,id) do nothing;
  return result;
end;
$$;

-- Acción para el operador autorizado después del piloto. No se invoca desde la interfaz.
create function public.tt_familia_cortar(p_perfil uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.tt_progreso s set tt_corte=coalesce(s.tt_corte,clock_timestamp()),solo_cuenta=true
    from public.tt_acceso_perfiles p where p.codigo=s.codigo and p.id=p_perfil
    and public.tt_fase2_padre(s.codigo);
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
end;
$$;

alter function public.tt_guardar(text,jsonb) rename to tt_guardar_legado_interno;
alter function public.tt_guardar2(text,jsonb,timestamptz) rename to tt_guardar2_legado_interno;
revoke execute on function public.tt_guardar_legado_interno(text,jsonb),
  public.tt_guardar2_legado_interno(text,jsonb,timestamptz) from public,anon,authenticated;

create function public.tt_guardar(p_codigo text,p_datos jsonb)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare corte timestamptz;
begin
  select tt_corte into corte from public.tt_progreso where codigo=p_codigo for update;
  if corte is not null then raise exception 'actualiza la aplicación' using errcode='42501'; end if;
  return public.tt_guardar_legado_interno(p_codigo,p_datos);
end;
$$;
create function public.tt_guardar2(p_codigo text,p_datos jsonb,p_base timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare corte timestamptz;
begin
  select tt_corte into corte from public.tt_progreso where codigo=p_codigo for update;
  if corte is not null then raise exception 'actualiza la aplicación' using errcode='42501'; end if;
  return public.tt_guardar2_legado_interno(p_codigo,p_datos,p_base);
end;
$$;

revoke execute on function public.tt_guardar(text,jsonb),public.tt_guardar2(text,jsonb,timestamptz)
  from public,anon,authenticated;
grant execute on function public.tt_guardar(text,jsonb),public.tt_guardar2(text,jsonb,timestamptz) to anon,authenticated;
revoke execute on function public.tt_padre_reciente() from public,anon,authenticated;
revoke execute on function public.tt_familia_vincular(text),public.tt_familia_perfiles(),
  public.tt_familia_autorizar(uuid,uuid),public.tt_familia_dispositivos(uuid),public.tt_estudio_perfil(),
  public.tt_familia_leer(uuid),public.tt_familia_guardar(uuid,jsonb,timestamptz,uuid),
  public.tt_familia_intentos(uuid,jsonb),public.tt_familia_restaurar(uuid,timestamptz,uuid,jsonb,jsonb,jsonb,jsonb),
  public.tt_familia_cortar(uuid) from public,anon,authenticated;
grant execute on function public.tt_familia_vincular(text),public.tt_familia_perfiles(),
  public.tt_familia_autorizar(uuid,uuid),public.tt_familia_dispositivos(uuid),public.tt_estudio_perfil(),
  public.tt_familia_leer(uuid),public.tt_familia_guardar(uuid,jsonb,timestamptz,uuid),
  public.tt_familia_intentos(uuid,jsonb),public.tt_familia_restaurar(uuid,timestamptz,uuid,jsonb,jsonb,jsonb,jsonb),
  public.tt_familia_cortar(uuid) to authenticated;

create function public.tt_familia_respaldo(p_perfil uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare codigo_perfil text;
begin
  select codigo into codigo_perfil from public.tt_acceso_perfiles
    where id=p_perfil and public.tt_fase2_padre(codigo);
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return public.tt_respaldo_crear(codigo_perfil,'copia familiar');
end;
$$;
revoke execute on function public.tt_familia_respaldo(uuid) from public,anon,authenticated;
grant execute on function public.tt_familia_respaldo(uuid) to authenticated;

-- Las interfaces antiguas pueden continuar durante la transición, con las
-- mismas comprobaciones de vínculo y sin posibilidad de reabrir un corte.
create or replace function public.tt_vincular(p_codigo text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform public.tt_familia_vincular(p_codigo);
  return true;
end;
$$;
create or replace function public.tt_solo_cuenta(p_codigo text,p_on boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not public.tt_fase2_padre(p_codigo) then raise exception 'sin permiso' using errcode='42501'; end if;
  update public.tt_progreso set solo_cuenta=coalesce(p_on,false)
    where codigo=p_codigo and (tt_corte is null or p_on is true);
  if not found then raise exception 'acceso anterior retirado' using errcode='42501'; end if;
  return coalesce(p_on,false);
end;
$$;

create function public.tt_familia_recibo(p_perfil uuid,p_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare codigo_perfil text;
begin
  select p.codigo into codigo_perfil from public.tt_acceso_perfiles p where p.id=p_perfil
    and (public.tt_fase2_padre(p.codigo) or exists(
      select 1 from public.tt_acceso_dispositivos d join auth.users u on u.id=d.dispositivo
      where d.perfil=p.id and d.dispositivo=auth.uid() and u.is_anonymous));
  if not found then raise exception 'sin permiso' using errcode='42501'; end if;
  return exists(select 1 from public.tt_escrituras where codigo=codigo_perfil and id=p_id);
end;
$$;
revoke execute on function public.tt_familia_recibo(uuid,uuid) from public,anon,authenticated;
grant execute on function public.tt_familia_recibo(uuid,uuid) to authenticated;
