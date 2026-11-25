-- Ensayo aislado. Requiere las estructuras de respaldo, intentos y cuenta por correo.
create table public.tt_escrituras (
  codigo text not null references public.tt_progreso(codigo) on update cascade on delete cascade,
  id uuid not null,
  base timestamptz not null,
  version timestamptz not null,
  primary key(codigo,id)
);
alter table public.tt_escrituras enable row level security;
revoke all on public.tt_escrituras from public, anon, authenticated;

create function public.tt_escribir_interno(p_codigo text,p_datos jsonb,p_base timestamptz,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actual timestamptz; guardada timestamptz;
begin
  if p_id is null or p_base is null or p_datos is null or jsonb_typeof(p_datos)<>'object'
     or octet_length(p_datos::text)>200000 then
    raise exception 'datos invalidos' using errcode='22023';
  end if;
  select actualizado into actual from public.tt_progreso where codigo=p_codigo for update;
  if not found then
    raise exception 'sin permiso' using errcode='42501';
  end if;
  select version into guardada from public.tt_escrituras where codigo=p_codigo and id=p_id and base=p_base;
  if found then return jsonb_build_object('ok',true,'actualizado',guardada); end if;
  if actual is distinct from p_base then return jsonb_build_object('ok',false,'conflicto',true); end if;
  guardada:=greatest(clock_timestamp(),actual+interval '1 microsecond');
  update public.tt_progreso set datos=p_datos,actualizado=guardada where codigo=p_codigo;
  insert into public.tt_escrituras(codigo,id,base,version) values(p_codigo,p_id,p_base,guardada);
  return jsonb_build_object('ok',true,'actualizado',guardada);
end;
$$;
revoke execute on function public.tt_escribir_interno(text,jsonb,timestamptz,uuid) from public,anon,authenticated;

create function public.tt_guardar3(p_codigo text,p_datos jsonb,p_base timestamptz,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.tt_progreso where codigo=p_codigo for update;
  if not found or not public.tt_permitido(p_codigo) then
    raise exception 'sin permiso' using errcode='42501';
  end if;
  return public.tt_escribir_interno(p_codigo,p_datos,p_base,p_id);
end;
$$;
revoke execute on function public.tt_guardar3(text,jsonb,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.tt_guardar3(text,jsonb,timestamptz,uuid) to anon,authenticated;
