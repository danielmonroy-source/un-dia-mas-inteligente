# Traspaso de Fase 3

Rama local `feat/phase-3-guided-lessons` desde `38b177c`, entrega aprobada de Fase 2. Para el estado de esa fase se puede consultar `git show 38b177c:HANDOFF.md`. El código conserva HTML, CSS, JavaScript, Supabase y el reto histórico. Preview en Vercel, validación de correo real y transición de acceso y dominio continúan en paralelo.

## Cómo continuar

- Sirve el directorio local usando [AGENTS.md](AGENTS.md). En Inicio abre **Lecciones guiadas**. Los estudiantes pueden pausar y volver desde «Continuar». Abre **Mapa de aprendizaje** desde el panel parental para ver la sugerencia según la habilidad o el prerrequisito, asignar una microlección y consultar evidencias y fechas. Usar solo datos sintéticos en desarrollo.
- El catálogo está en [lesson-bank.js](lesson-bank.js). El ciclo de ejecución y el resumen están en [lessons.js](lessons.js). Las 18 microlecciones reutilizan identificadores históricos del motor y tienen ítems propios. Véanse los ajustes, ejemplos y el diseño posterior en [PEDAGOGIA_FASE_3.md](PEDAGOGIA_FASE_3.md).
- Cada recorrido usa un UUID y cada acción comprobada es un evento con UUID y vínculo a su predecesor. La unión conserva ramales concurrentes. Para reanudar se usa el ramal más largo con desempate estable por UUID. Los intentos fuertes del motor se reconstruyen por UUID y se conservan las claves históricas. Ayudas, exposición y pendientes de revisión quedan en el recorrido. Solo se proyecta evidencia evaluable de trabajo independiente, aplicación y repaso; el estado de dominio de las claves de lección exige aplicación.
- El primer repaso tras aplicar está previsto a tres días. Los intervalos posteriores son siete, catorce, treinta y sesenta días tras recordar sin ayuda en fecha. Las dificultades vuelven a abrir enseñanza o repaso al día siguiente. Los eventos guardados y la cola sobreviven a pausas y cambios de dispositivo. Una selección a medio introducir se puede rehacer. Los puntos y medallas siguen en sus recorridos previos.
- La escritura para dispositivos de estudio requiere [supabase/fase3-lecciones.sql](supabase/fase3-lecciones.sql) después de la migración de diagnóstico. El script actualiza la RPC CAS existente y preserva eventos por UUID. El dispositivo de estudio carece de permiso de escritura para las asignaciones. Un backend anterior deja el avance de lecciones en el dispositivo aunque la RPC informe éxito. Para una preview usa el orden de [PREVIEW_VERCEL.md](PREVIEW_VERCEL.md). No aplicar fixtures sintéticos ni migraciones al proyecto productivo.
- Antes de un piloto largo, medir el tamaño del JSON consolidado frente al límite existente de 200 000 bytes de la RPC de estudio. Ampliar los ítems de transferencia y revisar con docentes la duración, claridad de distractores, ayudas y adecuación a tercero. Las respuestas abiertas conservan una marca pendiente y una pauta para conversar; el texto escrito no se conserva. Se usa voz local cuando está disponible.

## Verificación y decisión siguiente

Las pruebas nuevas abarcan banco, ayudas, equivalencias, reanudación, prerrequisitos, retención, reconciliación e interfaz. La validación de enseñanza con estudiantes sigue pendiente. La siguiente fase de código propuesta es multiplicación y razonamiento matemático sobre el mismo ciclo. El reto adaptativo completo se prepara después de ampliar y observar la aplicación y el repaso.

Resultado local de Fase 3. **59/59 pruebas** de aplicación y lógica, incluidas las 50 anteriores, y **2/2 integraciones de Supabase local** con GoTrue, PostgREST y PostgreSQL. Chromium comprobó pausa, reanudación, fichas, ayudas, actividad equivalente, asignación local familiar, unión entre dispositivos y aislamiento usando una nube simulada. El servidor real comprobó una escritura CAS, conservación incremental de UUID de lecciones, rechazo de una estructura inválida y bloqueo de asignaciones desde estudio. La integración de recuperación familiar anterior se conservó. El build estático con configuración sintética produjo ambos scripts de lecciones con huellas de contenido.

## Continuidad de Fase 3.5

Rama `feat/phase-3-5-math-reasoning` desde `f039bdc`. El banco amplía las lecciones a 31 en total, con 117 ítems matemáticos nuevos. Las llaves históricas de Motor, la autenticación, los roles y las reglas de sincronización se conservan. El registro por UUID añade tipo de evidencia y error observable a los ítems de matemáticas. La aplicación usa el mismo contrato SQL de Fase 3. La preview y el correo externo siguen como trabajo paralelo.

La simulación de dos dispositivos y sus límites están en [PEDAGOGIA_FASE_3_5.md](PEDAGOGIA_FASE_3_5.md). El navegador avisa cerca del límite y preserva la revisión local que la nube no puede recibir. Antes de operar un piloto largo se necesita separar el registro de eventos creciente del documento consolidado y verificar copias y recuperación con el volumen previsto. Los resultados de uso sintético no demuestran eficacia ni calibran duración con estudiantes. Consulta `Lecciones.inventory()` para desarrollar la selección de Fase 4.

Verificación local. Se conservaron las 59 pruebas previas y se añadieron seis de lógica y dos de Chromium con nube simulada. El ensayo de capacidad confirmó un aviso visible y la persistencia de la revisión rechazada al recargar. Las dos integraciones reales con Supabase local siguen disponibles y verificaron, entre otras cosas, el límite de 200 000 bytes más un byte y la inmutabilidad de la última revisión aceptada. Los cambios quedaron en una rama local para revisión.

## Fase 4 · Selector adaptativo local

Rama `feat/phase-4-adaptive-selector` desde `0852f2c`. **Mi práctica de hoy** ofrece una actividad por vez. El selector reanuda una lección, propone un repaso vencido, toma en cuenta asignaciones familiares y prerrequisitos, comprueba evidencia mixta si queda un ítem disponible, o propone enseñar o ampliar según el diagnóstico. La etapa de una lección activa determina si corresponde explicar, practicar, comprobar o aplicar. El selector se calcula de nuevo al abrirlo y al pulsar la propuesta. El progreso usa los registros por perfil existentes. El reto diario anterior sigue disponible.

El mapa familiar resume respuestas independientes, aplicaciones y retención en repaso durante los últimos siete días. Los conteos describen evidencia registrada, y deduplican por UUID. Esta iteración usa el catálogo actual. Sigue pendiente observar su uso con estudiantes, calibrar una sesión compuesta y verificar capacidad y recuperación antes de un piloto largo. El plan de 60 días y la publicación requieren sus propios pasos de revisión.

Verificación local. Pasaron 72 pruebas de aplicación y lógica, incluidas las 67 anteriores, y dos integraciones con Supabase local real. También se verificó el build estático con configuración sintética.

## Historial y recuperación

Rama `feat/lesson-history-recovery` desde `a5a62a3`. La migración [fase4-historial.sql](supabase/fase4-historial.sql) separa los recorridos de lección por perfil y UUID. En el primer guardado posterior a la migración mueve las lecciones existentes dentro de la misma transacción que confirma la versión. La fila principal mantiene el límite de 200 000 bytes. La escritura de lecciones admite hasta 4 MB y fusiona los eventos conservando la primera versión confirmada de cada UUID. La tabla tiene RLS y carece de acceso directo para sesiones de estudio o familia. Las rutas de lectura con permiso y la copia operativa vuelven a reunir las partes.

El navegador comprueba si el servidor anuncia la nueva capacidad antes de reintentar una revisión grande que ya estaba pendiente. Conserva el mismo identificador de escritura, de modo que la repetición tras un corte de red pueda usar el recibo original. Un servidor anterior conserva la advertencia y la revisión local. El almacenamiento de navegación sigue guardando el perfil y las colas existentes.

Para ensayar, aplicar el SQL después de Fase 3 siguiendo [PREVIEW_VERCEL.md](PREVIEW_VERCEL.md). Antes de un corte real, exportar copias operativas cifradas, verificar por perfil que los UUID y eventos leídos coinciden antes y después, y comprobar que un dispositivo antiguo mantiene sus controles de acceso. Si se necesita revertir SQL, exportar el estado reunido y preservar la tabla de historial antes de restaurar funciones. Un lector anterior vería solo la fila principal y un estado reunido grande puede exceder el límite anterior, por lo que una reversión de funciones requiere un ensayo separado.

Límites pendientes. El cliente aún intercambia el historial completo al sincronizar. El estado principal continúa creciendo con retos y boletas. Las copias operativas grandes conservan sus límites anteriores de transporte y restauración, y una colección de muchos respaldos puede agotarlos. La migración se prueba con datos sintéticos y debe pasar por una preview desechable antes de autorización de producción.

Verificación local. Pasaron 73 pruebas de aplicación y lógica y dos integraciones en Supabase local. Con 180 días sintéticos, el estado reunido mide 351 095 bytes, el documento principal 99 273 y los recorridos separados 251 809. Se verificaron migración de un recorrido previamente incrustado, recibos de escritura, concurrencia, permisos, copia familiar y restauración de una copia anterior con conservación de un evento posterior.


## Preview con Supabase compartido

Rama `feat/shared-supabase-preview`. La inspección de catálogos del proyecto actual confirmó un esquema educativo anterior a las últimas migraciones. La opción gratuita elegida es Vercel Preview en modo local y Supabase desechable local para Auth, migraciones y recuperación. Consulta [SUPABASE_COMPARTIDO.md](SUPABASE_COMPARTIDO.md) para el estado de compatibilidad y el plan de respaldo y reversión, y [PREVIEW_VERCEL.md](PREVIEW_VERCEL.md) para configurar la publicación de prueba.
