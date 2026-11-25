#!/usr/bin/env bash
set -euo pipefail
repo="$(git rev-parse --show-toplevel)"
target="$(mktemp -d /tmp/udmi-supabase.XXXXXX)"
(
  cd "$target"
  npx --yes supabase@3.4.0 init >&2
)
mkdir -p "$target/supabase/migrations"
cp "$repo/tests/fixtures/supabase-base.sql" "$target/supabase/migrations/20260101000000_base.sql"
cp "$repo/supabase/fase0-respaldos.sql" "$target/supabase/migrations/20260101000100_respaldos.sql"
cp "$repo/supabase/fase1-intentos.sql" "$target/supabase/migrations/20260101000200_intentos.sql"
git -C "$repo" show c6cd53f:supabase/fase-cuenta.sql > "$target/supabase/migrations/20260101000300_cuenta.sql"
cp "$repo/supabase/fase2-estabilidad.sql" "$target/supabase/migrations/20260101000400_estabilidad.sql"
cp "$repo/supabase/fase2-acceso-aislado.sql" "$target/supabase/migrations/20260101000500_acceso.sql"
cp "$repo/supabase/fase15-familia.sql" "$target/supabase/migrations/20260101000600_familia.sql"
printf '\ngrant select,insert,update,delete on public.tt_familia to service_role;\n' >> "$target/supabase/migrations/20260101000300_cuenta.sql"
sed -i 's/"enable_anonymous_sign_ins": false/"enable_anonymous_sign_ins": true/' "$target/supabase/config.jsonc"
printf '%s\n' "$target"
