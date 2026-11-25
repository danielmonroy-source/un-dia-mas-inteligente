-- Usuario y contraseña de la familia: abrir el avance en cualquier dispositivo sin el enlace con código.
-- Solo agrega columnas y funciones; no cambia ni borra el avance de Adolfo. Se puede correr más de una vez.
-- La contraseña se guarda cifrada (bcrypt); nadie puede leerla, ni siquiera desde la app.
create extension if not exists pgcrypto with schema extensions;

alter table public.tt_progreso add column if not exists usuario text;
alter table public.tt_progreso add column if not exists clave text;
alter table public.tt_progreso add column if not exists fallos integer not null default 0;
alter table public.tt_progreso add column if not exists bloqueo timestamptz;
create unique index if not exists tt_progreso_usuario on public.tt_progreso (usuario);

-- Crear el usuario (o cambiar la contraseña). Pide el código del jugador; si ya hay contraseña, también la actual.
create or replace function public.tt_usuario_guardar(p_codigo text, p_usuario text, p_clave text, p_clave_actual text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.tt_progreso; u text := lower(trim(coalesce(p_usuario, '')));
begin
  select * into r from public.tt_progreso where codigo = p_codigo for update;
  if not found then return jsonb_build_object('error', 'codigo'); end if;
  if r.clave is not null and (p_clave_actual is null or extensions.crypt(p_clave_actual, r.clave) <> r.clave) then
    return jsonb_build_object('error', 'clave_actual'); end if;
  if u !~ '^[a-z0-9._-]{3,30}$' then return jsonb_build_object('error', 'usuario'); end if;
  if length(coalesce(p_clave, '')) < 6 or length(p_clave) > 72 then return jsonb_build_object('error', 'clave'); end if;
  if exists (select 1 from public.tt_progreso where usuario = u and codigo <> p_codigo) then return jsonb_build_object('error', 'ocupado'); end if;
  update public.tt_progreso set usuario = u, clave = extensions.crypt(p_clave, extensions.gen_salt('bf', 10)), fallos = 0, bloqueo = null
  where codigo = p_codigo;
  return jsonb_build_object('ok', true, 'usuario', u);
end $$;

-- Qué usuario tiene este jugador (para mostrarlo en Para papás).
create or replace function public.tt_usuario_ver(p_codigo text)
returns text language sql stable security definer set search_path = '' as $$
  select usuario from public.tt_progreso where codigo = p_codigo
$$;

-- Entrar: usuario y contraseña devuelven el código del jugador. Tras 5 fallos seguidos se bloquea 15 minutos.
create or replace function public.tt_entrar(p_usuario text, p_clave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.tt_progreso; u text := lower(trim(coalesce(p_usuario, '')));
begin
  select * into r from public.tt_progreso where usuario = u for update;
  if not found or r.clave is null then perform pg_sleep(0.5); return jsonb_build_object('error', 'datos'); end if;
  if r.bloqueo is not null and r.bloqueo > now() then return jsonb_build_object('error', 'bloqueado'); end if;
  if extensions.crypt(coalesce(p_clave, ''), r.clave) <> r.clave then
    update public.tt_progreso set fallos = case when fallos + 1 >= 5 then 0 else fallos + 1 end,
      bloqueo = case when fallos + 1 >= 5 then now() + interval '15 minutes' else bloqueo end
    where codigo = r.codigo;
    return jsonb_build_object('error', 'datos');
  end if;
  update public.tt_progreso set fallos = 0, bloqueo = null where codigo = r.codigo;
  return jsonb_build_object('codigo', r.codigo, 'nombre', r.nombre);
end $$;

-- Cerrar los enlaces viejos: cambia el código del jugador (los enlaces con ?p= dejan de funcionar).
-- El avance, las copias y las respuestas se quedan; solo cambia la llave. Pide la contraseña.
create or replace function public.tt_cambiar_codigo(p_codigo text, p_clave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.tt_progreso; nuevo text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  select * into r from public.tt_progreso where codigo = p_codigo for update;
  if not found then return jsonb_build_object('error', 'codigo'); end if;
  if r.clave is null or extensions.crypt(coalesce(p_clave, ''), r.clave) <> r.clave then return jsonb_build_object('error', 'clave'); end if;
  update public.tt_progreso set codigo = nuevo where codigo = p_codigo;
  update public.tt_respaldos set codigo = nuevo where codigo = p_codigo;
  update public.tt_intentos set codigo = nuevo where codigo = p_codigo;
  return jsonb_build_object('codigo', nuevo);
end $$;

revoke execute on function public.tt_usuario_guardar(text, text, text, text), public.tt_usuario_ver(text),
  public.tt_entrar(text, text), public.tt_cambiar_codigo(text, text) from public;
grant execute on function public.tt_usuario_guardar(text, text, text, text), public.tt_usuario_ver(text),
  public.tt_entrar(text, text), public.tt_cambiar_codigo(text, text) to anon, authenticated;
