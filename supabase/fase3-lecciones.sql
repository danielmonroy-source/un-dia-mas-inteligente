-- Fase 3. Aplicar después de Fase 2 en un entorno aislado.
create or replace function public.tt_fase2_guardar_estudio(p_perfil uuid,p_datos jsonb,p_base timestamptz,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare codigo_perfil text; anterior jsonb; actual timestamptz; avance jsonb; dias jsonb; unido jsonb; item record; viejo jsonb;
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
  if avance ? 'lessons' then
    if jsonb_typeof(avance->'lessons') is distinct from 'object' or avance->'lessons'->>'v' is distinct from '1'
        or jsonb_typeof(avance->'lessons'->'runs') is distinct from 'object' then
      raise exception 'lecciones inválidas' using errcode='22023';
    end if;
    unido:=coalesce(anterior->'lessons'->'runs','{}'::jsonb);
    for item in select key,value from jsonb_each(avance->'lessons'->'runs') loop
      if item.key !~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$'
          or jsonb_typeof(item.value) is distinct from 'object'
          or item.value->>'id' is distinct from item.key
          or jsonb_typeof(item.value->'events') is distinct from 'object'
          or exists (select 1 from jsonb_each(item.value->'events') e where
            e.key !~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$'
            or jsonb_typeof(e.value) is distinct from 'object' or e.value->>'id' is distinct from e.key) then
        raise exception 'evidencia de lecciones inválida' using errcode='22023';
      end if;
      viejo:=unido->item.key;
      unido:=jsonb_set(unido,array[item.key],case when viejo is null then item.value else
        jsonb_set(viejo,'{events}',(item.value->'events')||(viejo->'events')) end);
    end loop;
    avance:=jsonb_set(avance,'{lessons,runs}',unido);
  end if;
  return public.tt_escribir_interno(codigo_perfil,anterior||avance,p_base,p_id);
end;
$$;
