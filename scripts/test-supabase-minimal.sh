#!/usr/bin/env bash
# Mantiene la base, los tokens y los puertos de prueba fuera de producción.
set -euo pipefail
repo="$(git rev-parse --show-toplevel)"
tag="udmi-test-$$"
secret="$(node -p "require('node:crypto').randomBytes(32).toString('hex')")"
dbpass="$(node -p "require('node:crypto').randomBytes(16).toString('hex')")"
cleanup() {
  docker rm -f "$tag-auth" "$tag-rest" "$tag-db" >/dev/null 2>&1 || true
  docker network rm "$tag" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create "$tag" >/dev/null
docker run -d --name "$tag-db" --network "$tag" --network-alias db \
  -e POSTGRES_PASSWORD="$dbpass" postgres:17-alpine >/dev/null
sql() { docker exec -i "$tag-db" psql -U postgres -v ON_ERROR_STOP=1 -q; }
for i in $(seq 1 60); do
  docker exec "$tag-db" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break
  sleep 1
done
sql <<SQL
create schema auth;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login password '$dbpass' noinherit;
grant anon,authenticated,service_role to authenticator;
create function auth.jwt() returns jsonb language sql stable
  as 'select nullif(current_setting(''request.jwt.claims'',true),'''')::jsonb';
create function auth.uid() returns uuid language sql stable
  as 'select nullif(auth.jwt()->>''sub'','''')::uuid';
grant usage on schema auth to anon,authenticated,service_role;
SQL
docker run -d --name "$tag-auth" --network "$tag" -p 127.0.0.1:54351:9999 \
  -e GOTRUE_API_HOST=0.0.0.0 -e GOTRUE_API_PORT=9999 \
  -e API_EXTERNAL_URL=http://127.0.0.1:54351 -e GOTRUE_SITE_URL=http://127.0.0.1:54351 \
  -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_NAMESPACE=auth \
  -e GOTRUE_DB_DATABASE_URL="postgres://postgres:$dbpass@db:5432/postgres?sslmode=disable&search_path=auth" \
  -e GOTRUE_JWT_SECRET="$secret" -e GOTRUE_JWT_ADMIN_ROLES=service_role -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated \
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED=true \
  public.ecr.aws/supabase/gotrue:v2.198.0 >/dev/null
for i in $(seq 1 60); do
  curl -fsS http://127.0.0.1:54351/health >/dev/null 2>&1 && break
  sleep 1
done
if ! curl -fsS http://127.0.0.1:54351/health >/dev/null; then
  docker logs "$tag-auth" >&2
  exit 1
fi
sql < "$repo/tests/fixtures/supabase-base.sql"
sql < "$repo/supabase/fase0-respaldos.sql"
sql < "$repo/supabase/fase1-intentos.sql"
git -C "$repo" show c6cd53f:supabase/fase-cuenta.sql | sql
printf 'grant select,insert,update,delete on public.tt_familia to service_role;\n' | sql
sql < "$repo/supabase/fase2-estabilidad.sql"
sql < "$repo/supabase/fase2-acceso-aislado.sql"
sql < "$repo/supabase/fase15-familia.sql"
sql < "$repo/supabase/fase2-diagnostico.sql"
docker run -d --name "$tag-rest" --network "$tag" -p 127.0.0.1:54352:3000 \
  -e PGRST_DB_URI="postgres://authenticator:$dbpass@db:5432/postgres?sslmode=disable" \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$secret" \
  public.ecr.aws/supabase/postgrest:v16.6 >/dev/null
for i in $(seq 1 60); do
  curl -fsS http://127.0.0.1:54352/ >/dev/null 2>&1 && break
  sleep 1
done
jwt() {
  node --input-type=module -e '
    import {createHmac} from "node:crypto";
    const [secret,role]=process.argv.slice(1);
    const part=obj=>Buffer.from(JSON.stringify(obj)).toString("base64url");
    const body=part({alg:"HS256",typ:"JWT"})+"."+part({role,exp:Math.floor(Date.now()/1000)+3600});
    process.stdout.write(body+"."+createHmac("sha256",secret).update(body).digest("base64url"));
  ' "$secret" "$1"
}
AUTH_URL=http://127.0.0.1:54351 REST_URL=http://127.0.0.1:54352 \
  ANON_KEY="$(jwt anon)" SERVICE_ROLE_KEY="$(jwt service_role)" \
  node --test "$repo/tests/supabase.integration.mjs" || { docker logs --tail 6 "$tag-auth" > /tmp/udmi-auth-diagnostic.log 2>&1; exit 1; }
