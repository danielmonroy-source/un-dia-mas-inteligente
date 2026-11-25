# Traspaso de Fase 1.5

Rama local `feat/phase-1-5-family-recovery` basada en el commit aprobado `9652028`. Los detalles de sincronización anteriores permanecen en ese commit. Conserva `main`, las ramas previas y los módulos educativos. Esta sesión trabajó en local y con backend sintético desechable. No hubo push, merge, despliegue, migración de producción ni cambio de visibilidad.

## Acceso familiar

- `family.js` mantiene separadas la sesión de estudio en almacenamiento local y la sesión de adulto por pestaña. Esta última se renueva mediante el OTP del correo y tiene vigencia administrativa breve. La prueba valida JWT emitidos por GoTrue. La entrega de correo se sustituyó en el entorno local por un OTP real generado mediante la API de administración; SMTP y recepción desde Vercel quedan por validar.
- En la cuenta familiar se vincula un perfil existente con su código, se consulta y revoca la autorización por dispositivo y se recupera el acceso mediante el mismo correo. Un navegador protegido entra directamente al reto con su perfil. Si la sesión no se puede renovar, muestra un mensaje de ayuda y conserva su estado local. Las operaciones en la nube validan rol, sesión, pertenencia y versión en el servidor.
- La cola del cliente anterior solo se incorpora automáticamente si coincide la huella del código y se trata de un perfil aún vacío en ese origen. El servidor conserva el perfil y sus relaciones. La fase incluye un corte individual que desautoriza ambas RPC de escritura previas al compare-and-swap exacto y bloquea la reapertura con la RPC antigua. No se ejecuta desde la interfaz ni se aplicó fuera del ensayo local.

## Recuperación

- La exportación portable devuelve el avance confirmado sin secretos. La copia operativa cifrada usa AES-GCM y PBKDF2 con sal aleatoria. Incluye instantánea de servidor, historial bruto, copias, comprobantes y estado local con cola. La cuenta familiar pide una frase de copia que se guarda por separado del archivo.
- La restauración concilia con el estado vivo, requiere la versión exacta de previsualización y un adulto autorizado, y conserva las filas de intentos por UUID y las copias previas. El comprobante repite sin volver a sumar. El dispositivo de origen consulta ese comprobante antes de reenviar una cola ya transferida. Conservar una sola captura estable por dispositivo en el corte. Las capturas offline solapadas que se tomaron con bases divergentes requieren revisión para evitar sumar el mismo incremento dos veces.
- El escenario local usa perfiles sintéticos, dos navegadores de origen y otro origen para la cuenta recuperada. Incluye avances distintos, una cola desconectada, progreso posterior a la copia, restauración repetida, reapertura del dispositivo original y autorización de estudio en el origen nuevo. La restauración alcanzó 120 puntos sintéticos con un solo bono y cuatro UUID únicos, incluido el intento legado y el que se registró sin conexión. Después de invalidar otra sesión se conservó localmente un quinto intento y 5 puntos adicionales, que se sincronizaron tras la reautorización. El servidor conserva los vínculos de acceso en el mismo proyecto. La copia no traslada sesiones de Auth ni repuebla las identidades de un proyecto perdido. En una migración entre proyectos esas relaciones requieren un procedimiento administrativo adicional. Sin captura, los datos locales borrados antes de sincronizar quedan fuera de recuperación.

## Verificación y preparación de preview

- Resultado final de aplicación y lógica: **41/41**. `npm test` cubre las 39 pruebas previas y dos regresiones nuevas de cifrado y recibos. El backend de esas pruebas de aplicación es simulado. `bash scripts/test-supabase-minimal.sh` pasó **2/2** integraciones con GoTrue, PostgREST y PostgreSQL reales, incluido Chromium y dos orígenes en el ensayo integral. Usar `PLAYWRIGHT_BROWSERS_PATH` si Chromium está instalado en una ruta no estándar.
- El build genera únicamente HTML, JavaScript con huella y `version.json`. Preview requiere variables propias y rechaza el origen de producción registrado. No se creó proyecto externo. El procedimiento exacto para Vercel, Supabase, GitHub Pages, corte y reversión está en [PREVIEW_VERCEL.md](PREVIEW_VERCEL.md).
- Para una revisión local usa `git diff 9652028..HEAD`. Antes de desplegar se debe confirmar que Vercel apunta al proyecto sintético, que el correo de prueba llega, que la URL se abre desde cada dispositivo y que el SHA servido coincide.

## Cierre y fase pedagógica

La siguiente decisión del titular es autorizar un canal de distribución del diff y una preview restringida con backend sintético. GitHub Pages debe seguir disponible durante el ensayo. La visibilidad, el corte, las migraciones reales y cualquier costo requieren una decisión separada. Se posponen la reconstrucción de la aplicación, la gestión de múltiples titulares de un perfil, las capturas offline solapadas automáticas y la restauración de identidades en un proyecto distinto.

[Diseño funcional de Fase 2](PEDAGOGIA_FASE_2.md) cubre diagnóstico en cinco sesiones, instrucciones, lectura, valor posicional, concepto de multiplicación y razonamiento. El horizonte del reto es 20 a 30 minutos con pausa y ajuste. Todavía no se añadieron actividades ni se cambiaron las reglas pedagógicas.
