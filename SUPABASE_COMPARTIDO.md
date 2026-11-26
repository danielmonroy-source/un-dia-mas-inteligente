# Preview y transición con un proyecto Supabase compartido

## Estado y alcance

La inspección de solo lectura del proyecto actual encontró RLS en las tablas educativas `tt_progreso`, `tt_intentos`, `tt_respaldos` y `tt_familia`. Existen las rutas heredadas `tt_guardar` y `tt_guardar2`. No aparecieron `tt_guardar3`, las rutas de estudio y recuperación de las fases posteriores, ni la tabla de historial separado. Tampoco existe `udmi_preview`. Las rutas públicas de carga, escritura heredada, intentos y copias ya tienen permiso de ejecución para `anon` y `authenticated`. Sus propias validaciones siguen aplicando. Se consultaron solo catálogos. Esta diferencia impide aplicar directamente `fase4-historial.sql` a la aplicación actual.

| Prueba | Entorno gratuito |
| --- | --- |
| Compilación de Vercel, interfaz, selector adaptativo, pausa, reanudación y almacenamiento del navegador | Vercel Preview con `UDMI_PREVIEW_LOCAL=1` configurada solo para el ambiente Preview. Se pueden probar dos navegadores como sesiones independientes. |
| Correo simulado o local, Auth, sincronización entre dispositivos, migración, revocación, copias y restauración | Supabase local desechable y navegadores sintéticos. Ejecutar `scripts/test-supabase-minimal.sh`. |
| Correo real de Auth y sincronización alojada de dos dispositivos | Quedan pendientes de un aislamiento verificable. La preview local no usa Auth ni sincroniza con la nube. |

## Esquema sintético en el mismo proyecto

Mantener el esquema candidato fuera de los esquemas expuestos por PostgREST. Los encabezados de selección de esquema solo eligen un destino y la clave pública del proyecto se puede reutilizar para llamar al esquema público. Además, Auth y su configuración de correo pertenecen a todo el proyecto. Cambiar la plantilla, habilitar sesiones anónimas o registrar usuarios de prueba en la infraestructura compartida tendría efectos fuera del esquema.

Si se decide ensayar sincronización alojada, preparar primero en local un acceso servidor a servidor con un rol dedicado para `udmi_preview`, sin membresías, sin `BYPASSRLS` y con permisos explícitos sobre objetos sintéticos. El acceso a `public` y `auth` se deberá probar desde ese rol por sus permisos efectivos, incluyendo funciones heredadas otorgadas a `PUBLIC`. Si la única forma de impedirlo requiere cambiar concesiones de los clientes reales, abandonar ese diseño. Ninguna credencial de ese rol debe llegar al navegador. Si se crea un intermediario en Vercel, usar una variable de servidor con alcance Preview, consultas estáticas y una identidad de prueba independiente. Verificar permisos y una sesión sin conexión a producción antes de solicitar aprobación para crear objetos. El esquema por sí solo no valida la integración familiar real. El modo gratuito de esta entrega evita ese intermediario.

## Antes de pedir autorización de migración

1. Inventariar las firmas y definiciones reales de RPC, dependencias, privilegios, RLS, triggers e índices y compararlas con el repositorio. Preparar migraciones incrementales desde el esquema real. Los fixtures de preview crean tablas desde cero y quedan reservados a instancias desechables.
2. Preparar un respaldo lógico consistente y cifrado del conjunto educativo en un destino privado fuera de Git. Un operador con permisos puede ejecutar `pg_dump --format=custom` usando la conexión administrada de PostgreSQL y una lista explícita de tablas educativas. Conservar por separado sus definiciones de funciones, RLS, permisos y triggers, y el control de quién puede leer la copia. No extraer contraseñas ni tokens. El inventario debe identificar posibles dependencias de Auth y cómo preservar los vínculos por UUID al probar en local.
3. Probar en un clon local sintético la actualización desde el esquema antiguo y el frontend nuevo. Comprobar con dos dispositivos los endpoints antiguos, historial integrado y separado, copias, contención de versiones, permisos, revocación y continuidad de perfiles. Ensayar el rollback de frontend con el servidor nuevo.
4. Para revertir SQL, pausar nuevas escrituras del ámbito educativo, tomar una segunda copia y reconciliar los UUID confirmados desde la primera. Mantener el registro separado hasta verificar una lectura que reúna las dos partes. Si el estado supera el límite anterior, conservar las rutas de lectura compatibles y acordar cómo volver a habilitar escrituras. Evitar restaurar una base entera sobre el proyecto compartido, que también contiene otras aplicaciones. Aprobar el plan exacto y su ventana antes del primer cambio.

El respaldo y la reversión requieren credenciales y una ventana aprobadas para el proyecto compartido. En este trabajo no se ejecutan sobre datos reales.
