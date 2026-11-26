# Contexto técnico y operativo

Un Día Más Inteligente es una aplicación de práctica para primaria. El frontend estático usa HTML, CSS y JavaScript sin compilación. La arquitectura acordada conserva Supabase y las actividades existentes. La rama base es `main`. Las decisiones sobre autenticación, hosting y transición a privado requieren aprobación antes de aplicarse.

## Aplicación

| Componente | Responsabilidad |
| --- | --- |
| `index.html` | Interfaz, bancos de contenido, generadores, validación de respuestas, reglas de participación, reto diario, panel parental y sincronización. |
| `motor.js` | Catálogo de 36 habilidades del plan y ocho complementarias, evidencias por conocimiento, estados, prerrequisitos y repaso espaciado. Migración de hechos y vocabulario y unión de resúmenes. |
| `diagnostic-bank.js` y `diagnostic.js` | Banco de cinco sesiones, elección adaptativa acotada, estimaciones y recomendaciones familiares. El historial de práctica permanece en Motor y el diagnóstico en un registro con UUID. |
| `lesson-bank.js` y `lessons.js` | Banco de microlecciones y ciclos por UUID. El motor consume la evidencia evaluable, y el mapa familiar muestra exposición, ayudas, aplicación y repaso. |
| `supabase/` | Fase 0 de respaldos y concurrencia y Fase T1 de intentos. Presuponen el esquema original de `tt_progreso`. |
| `tests/` | Pruebas de motor y unión con Node y de interfaz con Chromium y nube simulada. |

La práctica incluye tablas del 1 al 10, sumas y restas con y sin reagrupación, lectura (28 historias), inglés (traducción, escucha y frases), ortografía, lógica, reloj, dinero, fracciones, ciencia (20 temas) y cultura general (22 lecturas y preguntas rápidas). Los ejercicios combinan bancos escritos y generación por reglas. El reto diario configurable incluye de inicio tabla, cuentas, inglés y lectura. Guarda la primera calificación por actividad, calcula el promedio al completarlas y otorga un bono diario. La familia puede asignar lecturas y temas, ajustar dificultad y reabrir actividades.

El seguimiento distingue participación (puntos, rachas, rondas, medallas) de rendimiento en ronda y de evidencias de aprendizaje. El motor registra formato, primer intento, ayuda, error y tiempo cuando existen. La secuencia de repaso nominal es 1, 3, 7, 14, 30 y 60 días. El dominio exige evidencia en días distintos, retención y aplicación cuando la habilidad lo requiere. Actualmente el motor observa y resume. La selección del reto aún usa las reglas históricas del juego. La dirección de producto y las fases constan en [ROADMAP.md](ROADMAP.md).

Cada origen conserva un registro local por perfil con estado, versión de nube, cola y última copia local. En la primera apertura se puede migrar el contenido legado de `tablas-turbo-v2` o `tablas-turbo-v1`. La conciliación y sus límites se describen en [HANDOFF.md](HANDOFF.md). Supabase recibe el estado en `tt_progreso`, copias en `tt_respaldos` e intentos en `tt_intentos`. El cliente guarda primero en local, intenta subir después y combina estados ante conflicto. El código de jugador sigue actuando como credencial para rutas heredadas cuando el perfil admite ese acceso. El pin del panel es un control local.

## Publicación y transición a repositorio privado

GitHub Pages permite publicar desde repositorios privados con GitHub Pro, Team, Enterprise Cloud o Enterprise Server, según tipo de cuenta y plan. En GitHub Free un repositorio privado puede perder Pages al convertirlo. Incluso en un plan compatible hay que verificar visibilidad del sitio, Pages y el dominio. Un repositorio privado no protege por sí mismo la URL de la aplicación ni su API. Para esta cuenta personal, confirma la suscripción en **GitHub → Settings → Billing and licensing** y el origen actual en **repositorio → Settings → Pages**.

| Alternativa | Qué conserva | Dependencias |
| --- | --- | --- |
| Pages con plan compatible | Puede preservar el URL y el origen actual, incluido su almacenamiento del navegador. | Confirmar plan y estado de publicación, corregir el despliegue y proteger datos en Supabase. |
| Vercel con repositorio privado | Publicación estática, vistas previas y reversiones por versión. | Verificar plan e integración con el repositorio privado. El URL nuevo tiene otro almacenamiento local. Desactivar la publicación automática durante la preparación. |
| Cloudflare Pages, Netlify u otro hosting estático HTTPS | Permite publicar solo archivos de ejecución desde un artefacto aprobado o una integración privada. | Confirmar plan, permisos y dominio. El cambio de origen requiere una transferencia explícita. |

Vercel es la opción preferente de Fase 1. Se conserva Pages hasta verificar el nuevo origen con datos sintéticos, comprobar la transferencia y acordar una ventana de convivencia y reversión. El estado actual del artefacto y el procedimiento están en [HANDOFF.md](HANDOFF.md). Ningún host puede leer el `localStorage` de otro origen. Un dominio propio, adoptado posteriormente, permitiría cambiar de proveedor conservando el origen de ahí en adelante.

Fuentes: [GitHub Pages y planes](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) · [cambio de visibilidad en GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility) · [integración Git de Vercel](https://vercel.com/docs/git)

## Inspección de Supabase de solo lectura

En **Supabase Dashboard → proyecto correspondiente al endpoint configurado en el frontend → SQL Editor → New query**, pega el bloque de inventario y pulsa **Run**. Solo lee catálogos PostgreSQL. Compara los nombres, firmas, roles efectivos, políticas, restricciones, triggers y señales de bloqueo y autorización con los SQL versionados y con `c6cd53f` y `56c65c7`. Los hashes sirven para comparar definiciones entre entornos; un indicador textual aislado no demuestra que la autorización sea correcta. Si se necesitan los cuerpos exactos, consulta `pg_get_functiondef(oid)` para las RPC `tt_*` y `qual` / `with_check` en `pg_policies` para sus tablas, revisándolos en el entorno privado antes de compartir extractos. Consulta **Authentication → Sign In / Providers** para conocer proveedores y **Authentication → URL Configuration** para redirecciones. En **Database → Backups** comprueba disponibilidad, fecha, retención y PITR según plan. La copia de la aplicación y el respaldo del proveedor son mecanismos distintos.

Si `migration_catalog` es verdadero, ejecuta aparte `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;` y contrasta con los archivos. SQL aplicado manualmente puede existir en el esquema sin asiento en ese historial. Comparte solo el resumen necesario. No consultes filas de progreso, intentos, respaldos, vínculos familiares ni usuarios de Auth.

```sql
WITH app_tables AS (
  SELECT c.oid, n.nspname AS schema_name, c.relname AS name, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND left(c.relname,3)='tt_' AND c.relkind IN ('r','p','v','m','f')
), app_functions AS (
  SELECT p.oid, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args,
         p.prosecdef AS security_definer, p.proconfig AS config, pg_get_userbyid(p.proowner) AS owner,
         md5(pg_get_functiondef(p.oid)) AS definition_hash,
         p.prosrc ~* 'for[[:space:]]+update' AS locks_row,
         p.prosrc ~* 'auth[.]uid|tt_permitido' AS checks_identity
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND left(p.proname,3)='tt_' AND p.prokind='f'
), roles(name) AS (VALUES ('anon'),('authenticated'))
SELECT jsonb_build_object(
  'tables', (SELECT jsonb_agg(to_jsonb(t)-'oid' ORDER BY name) FROM app_tables t),
  'columns', (SELECT jsonb_agg(jsonb_build_object('table',t.name,'name',a.attname,
    'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) ORDER BY t.name,a.attnum)
    FROM app_tables t JOIN pg_attribute a ON a.attrelid=t.oid WHERE a.attnum>0 AND NOT a.attisdropped),
  'table_privileges', (SELECT jsonb_agg(jsonb_build_object('table',t.name,'role',r.name,
    'schema_usage',has_schema_privilege(r.name,'public','USAGE'),
    'privileges',ARRAY(SELECT perm FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) perm
      WHERE has_table_privilege(r.name,t.oid,perm)),
    'column_select',has_any_column_privilege(r.name,t.oid,'SELECT'),
    'column_insert',has_any_column_privilege(r.name,t.oid,'INSERT'),
    'column_update',has_any_column_privilege(r.name,t.oid,'UPDATE')))
    FROM app_tables t CROSS JOIN roles r),
  'policies', (SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,
    'command',cmd,'mode',permissive,'using_hash',md5(qual),'check_hash',md5(with_check)))
    FROM pg_policies WHERE schemaname='public' AND left(tablename,3)='tt_'),
  'functions', (SELECT jsonb_agg((to_jsonb(f)-'oid')||jsonb_build_object(
    'anon_execute',has_function_privilege('anon',f.oid,'EXECUTE'),
    'authenticated_execute',has_function_privilege('authenticated',f.oid,'EXECUTE')) ORDER BY name,args)
    FROM app_functions f),
  'triggers', (SELECT jsonb_agg(jsonb_build_object('table',t.name,'name',g.tgname,'enabled',g.tgenabled,
    'function',g.tgfoid::regprocedure::text,'definition_hash',md5(pg_get_triggerdef(g.oid))))
    FROM app_tables t JOIN pg_trigger g ON g.tgrelid=t.oid WHERE NOT g.tgisinternal),
  'constraints', (SELECT jsonb_agg(jsonb_build_object('table',t.name,'name',c.conname,'type',c.contype,
    'definition_hash',md5(pg_get_constraintdef(c.oid)))) FROM app_tables t JOIN pg_constraint c ON c.conrelid=t.oid),
  'indexes', (SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',indexname))
    FROM pg_indexes WHERE schemaname='public' AND left(tablename,3)='tt_'),
  'auth_catalog', jsonb_build_object('users',to_regclass('auth.users') IS NOT NULL,
    'sessions',to_regclass('auth.sessions') IS NOT NULL,'uid',to_regprocedure('auth.uid()') IS NOT NULL),
  'extensions', (SELECT jsonb_agg(extname ORDER BY extname) FROM pg_extension
    WHERE extname IN ('pgcrypto','pg_cron','pgaudit')),
  'migration_catalog', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
) AS inventory;
```

## Propuesta de identidad y autorización

Recomendación: usar Supabase Auth para el adulto, con correo y OTP/enlace o contraseña según preferencia y entrega de correo, y una sesión familiar persistente en dispositivos de confianza. El adulto inicia una vez y selecciona un perfil de estudio. La pantalla de estudio puede abrir directamente ese perfil. Diseñar una autorización limitada al estudio para dispositivos infantiles o compartidos. En el mismo dispositivo, abrir operaciones parentales solo tras una comprobación reciente del adulto, exigida por el servidor.

- Asociar el identificador estable del alumno a una familia mediante un vínculo del lado servidor con `auth.uid()`. Separar progreso, cola y caché local por perfil. Partir de RLS y RPC con permisos mínimos y validación explícita de pertenencia y rol. Una sesión con facultades de adulto en un navegador de estudio requiere un ámbito restringido o una comprobación adicional de servidor.
- Dar de alta otro dispositivo con la cuenta familiar o un emparejamiento limitado y revocable autorizado por el adulto. La recuperación corresponde al correo adulto. Ofrecer cierre de sesión y revocación de sesiones o dispositivos. Considerar el tiempo de vigencia de JWT y comprobar la vigencia de sesión para acciones sensibles si se exige revocación inmediata.
- Migrar el acceso por etapas con identificadores estables: asociar el perfil anterior al adulto autenticado tras comprobar el acceso, copiar y verificar en un entorno aislado, probar dos dispositivos y una restauración, habilitar convivencia acotada y revocar enlaces anteriores solo tras confirmación. Revisar primero el diseño de cuenta por correo que ya aparece en el catálogo real.

| Opción | Experiencia y mantenimiento |
| --- | --- |
| Auth del adulto con sesión persistente y autorización parental reciente | Menos fricción diaria y recuperación estándar. Requiere configurar correo, redirecciones y políticas, y valorar las cuotas de Auth o correo. |
| Auth del adulto más sesión limitada por dispositivo | Separa mejor estudio y administración. Requiere implementar y mantener emparejamiento, alcance y revocación de dispositivos. |
| Usuario y contraseña personalizados de la rama Claude | Puede reutilizar un flujo sencillo. Añade mantenimiento de credenciales y recuperación, y su diseño entrega un código reutilizable al cliente. |
| Solo código heredado | Conserva acceso inmediato durante una transición. La posesión del enlace concede el permiso y revocarlo exige cambiar la clave compartida. |

Fuentes: [sesiones de Supabase Auth](https://supabase.com/docs/guides/auth/sessions) · [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Plan de respaldo, recuperación y actualización

1. **Inventario y autorización.** Identificar la revisión servida, origen utilizado por cada dispositivo, permisos reales, versión del backend y alcance del respaldo del proveedor. Acordar una ventana con el adulto y un custodio de copias. Preservar los dispositivos y el origen viejo hasta validar recuperación.
2. **Captura local.** En cada dispositivo con posible progreso, conservar por separado el estado principal y legado, cola, metadatos de última sincronización y copia local. Registrar hora, origen y perfil bajo un identificador privado. Conservar los registros pendientes antes de sincronizar. El JSON de la app es un respaldo complementario para historial, preferencias, puntos, recompensas y dominio que ya estén en el estado.
3. **Captura del servidor.** Con autorización específica, tomar una instantánea consistente y privada del ámbito educativo: esquema, progreso con versiones, intentos por UUID, copias, vínculos familiares y reglas de acceso. Verificar un respaldo del proveedor como contingencia separada. El proyecto aloja otras tablas, por lo que una restauración global podría revertir información ajena al tutor. Usar un destino aislado y limitar cualquier futuro procedimiento de restauración a los datos del tutor.
4. **Protección y conciliación.** Cifrar las copias, guardar fuera del repositorio, restringir acceso y registrar timestamp UTC, revisión, origen, versión y sumas de comprobación. La exportación JSON actual excluye PIN y hash, código, base/última sincronización, cola pendiente, última copia local, versiones en la nube, intentos brutos y vínculos/sesiones de Auth. Puede contener datos personales y educativos. Nunca adjuntarla públicamente.
5. **Ensayo sintético.** Restaurar en un entorno separado sin acceso a producción, con distintos perfiles y dos dispositivos. Comparar progreso, boleta, recompensas, estados del motor, notas, preferencias, copias e intentos pendientes. Conciliar intentos por UUID y probar solapamientos y conflictos. Conservar cortes antes y después, y comprobar que un archivo antiguo no borra progreso reciente.
6. **Restauración auténtica, previa aprobación.** Capturar primero el estado vivo y el del dispositivo. Comparar ambos con el respaldo. Preparar un plan por perfil y por actividad, conservar las operaciones posteriores al corte y resolver ambigüedades con el adulto. Aplicar contra la versión esperada del servidor, dentro de una operación controlada, y abortar si cambió desde la lectura. Evitar usar la importación actual como mecanismo de fusión: reemplaza el estado principal en el dispositivo. Verificar otra vez conteos, integridad y acceso en dos dispositivos antes de cerrar.
7. **Publicación y rollback.** Publicar solo el artefacto revisado, comprobar su hash y abrir en los dispositivos habituales con el adulto. Mantener disponible la versión anterior y conservar progreso nuevo por separado. Revertir primero el frontend cuando sea suficiente. La reversión de datos exige un plan específico y confirmación.

## Historial y privacidad

En el historial hay valores de personalización, comentarios y fixtures con fechas y cifras cuyo origen requiere confirmación. El código público referencia una clave diseñada para cliente y contiene un PIN inicial histórico de interfaz. Mantén la referencia al commit y los nombres de archivos en el registro privado de incidentes sin copiar valores personales. Cotejar si hay credenciales reales con una revisión de secretos, rotarlas de inmediato tras autorización si se confirma exposición y revisar artefactos, forks y cachés. La privatización limita acceso futuro; el historial ya distribuido puede persistir. Una reescritura requeriría aprobación, coordinación de clones y atención a referencias y copias de GitHub; la rama de Claude se conserva según la decisión aprobada.
