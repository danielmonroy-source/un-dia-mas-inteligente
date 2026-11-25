# Traspaso de la fase 0

**Corte:** 25 de noviembre de 2026. **Rama local:** `feat/phase-0-preservation-security`, desde `main` en `84dd2ec`. La rama de Claude se conserva como referencia. El trabajo sigue en el entorno Codex, a la espera de revisión. No se hizo push, merge, cambio de visibilidad, despliegue ni migración.

## Cambios locales

- Las instrucciones y decisiones se distribuyen entre [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) y [ROADMAP.md](ROADMAP.md). Los procedimientos operativos de inspección, acceso y recuperación están en el contexto.
- Se fijó Playwright con lockfile. El flujo es `npm ci`, instalación del navegador y `npm test`.
- Se neutralizaron defaults, comentarios y fixtures de personalización. Se conserva el alias ya guardado en el estado y se presenta como texto. El archivo exportado tiene un nombre sin alias. Inglés solo envía texto del banco o una frase de presentación genérica al sintetizador y sus nuevos intentos de presentación usan una clave genérica. Las claves históricas se conservan.
- Se escapa el texto dinámico en el juego y el panel. Se comprueban formato, forma de campos conocidos y claves reservadas antes de aplicar copias, incluido el flujo de restauración desde la nube. Se admite JSON directo anterior, el sobre v1 y campos adicionales compatibles. El estado persistente conserva su formato anterior.

## Verificación local

- Node 24.22.3, npm 11.19.1 y Playwright 1.62.1. Se ejecutaron `npm ci`, instalación de Chromium headless y `npm test` sobre la rama. Resultado final **32/32**: 29 de base y tres regresiones con datos sintéticos.
- Las regresiones comprueban importaciones inválidas sin mutación ni copia, lectura de un JSON directo antiguo, renderizado literal y audio genérico. Dos regresiones inicialmente abrían el par de frases de saludo; se corrigieron los fixtures para seleccionar el par que contiene la presentación.
- Para revisar todos los cambios locales usa `git diff main...HEAD`.

## Evidencia del despliegue

- **Origen verificado:** Pages desde rama, `gh-pages` en `/`, sitio público. El endpoint de Pages reportó `build_type: legacy` y `status: building`; los registros de Actions marcan el último intento como fallido.
- **Último éxito:** despliegue `8061769627`, commit `e5c557d`, 25 de noviembre a las 15:22:18 UTC. El HTML público coincide con ese commit y con el HTML de `497a057`, incluso con parámetro de caché y en la ruta directa de `index.html`.
- **Último intento:** despliegue `8062693843`, commit `0ab9689` (punta de `gh-pages`), a las 16:05 UTC. Jekyll y carga del artefacto pasaron. `Deploy to GitHub Pages` falló con un HTTP 500 al crear el despliegue. El mensaje indica un error del servidor. No se confirmó si hubo una incidencia general de GitHub.
- **Diferencias:** el sitio sirve la revisión anterior a Fase 0. `gh-pages` tiene Fase 0. `main` añade T1 y la recuperación en navegador nuevo. La rama de Claude termina en `56c65c7` y añade un diseño de acceso distinto al que realmente está en Supabase.

Evidencia: [sitio](https://danielmonroy-source.github.io/un-dia-mas-inteligente/) · [intento fallido](https://github.com/danielmonroy-source/un-dia-mas-inteligente/actions/runs/45650789822/job/139334587014) · [último éxito](https://github.com/danielmonroy-source/un-dia-mas-inteligente/actions/runs/45644258841)

## Supabase observado

Consultas de catálogo de solo lectura. El catálogo inicial de `public` confirmó que el proyecto responde y contiene otras aplicaciones. El análisis detallado se limitó a objetos educativos `tt_*`. Se consultó el historial de migraciones por versión y nombre. No se consultaron filas de progreso, intentos, respaldos, vínculos familiares ni usuarios.

- Existen `tt_progreso`, `tt_respaldos`, `tt_intentos` y `tt_familia`. Las cuatro tienen RLS habilitada y no presentan políticas RLS registradas. Los roles `anon` y `authenticated` carecen de privilegios directos de tabla y columna en ese conjunto.
- Se observaron 13 funciones `tt_*` con `SECURITY DEFINER` y `search_path` vacío. Los cuerpos de las 12 funciones de `c6cd53f` coinciden al normalizar espacios. El trigger habilitado `tt_progreso_respaldo` usa la función de Fase 0. Existen los índices de código y fecha para respaldo e intentos. `tt_guardar2` bloquea la fila y verifica la versión si recibe una base; sigue existiendo `tt_guardar`.
- Ambos roles pueden ejecutar las RPC de progreso, copias e intentos sujetas a `tt_permitido`. Cuando un perfil admite código, basta conocerlo. El modo de solo cuenta exige un vínculo del usuario autenticado. `tt_vincular`, `tt_mis_jugadores` y `tt_solo_cuenta` se conceden a `authenticated`. `tt_permitido` y la función del trigger carecen de EXECUTE directo para ambos roles.
- Existe `solo_cuenta` y hay referencias de Auth para los vínculos. No están las columnas ni RPC de usuario y contraseña del diseño posterior `56c65c7`. El historial administrado contiene `20261121134144` (`tt_tablas_turbo_progreso`); no hay asientos identificados para Fase 0, T1 o cuenta por correo aunque sus objetos existen. Se desconoce cómo se aplicaron.
- Quedan por verificar proveedores de Auth, URLs de retorno, retención y respaldo del proveedor. La existencia de un trigger o de tablas no certifica que una copia sea recuperable. El modo de acceso de perfiles reales quedó fuera de la consulta. El proyecto compartido vuelve especialmente importante ensayar la recuperación en un destino aislado.

## Revisión y continuación

1. Revisar el diff local contra `main` y decidir el plan de Pages o hosting alternativo antes de privatizar.
2. Acordar la ventana y el alcance de capturas, y ensayar respaldo y recuperación completos con datos sintéticos. Resolver escenarios de avance simultáneo y cambio de perfil antes de cualquier actualización real.
3. Aprobar alcance de Auth, recuperación y verificación parental. Usar el esquema existente como evidencia para diseñar la transición, sin integrar automáticamente la rama de Claude.
4. Con aprobación independiente, decidir cuándo publicar el Pull Request, gestionar visibilidad y modificar producción. La siguiente fase educativa depende del cierre de esos pasos.
