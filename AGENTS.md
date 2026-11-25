# Instrucciones de trabajo

- Usa `main` como base y crea una rama por cambio. Revisa los cambios de Claude individualmente. Conserva su rama como referencia.
- Presenta el diff y los resultados de las pruebas antes de publicar una rama o abrir un Pull Request. Push, merge, visibilidad, despliegues, migraciones y cambios de producción requieren aprobación expresa.
- Mantén HTML, CSS y JavaScript nativos y Supabase. Reutiliza `motor.js`, contenidos, módulos, recompensas y seguimiento. La fase actual limita los nuevos módulos al diagnóstico, mapa de habilidades e informe. La validación de hosting y correo puede avanzar en paralelo.
- Usa datos sintéticos en pruebas y ejemplos. Mantén fuera de Git los datos personales, escolares y familiares, credenciales, copias privadas y resultados de inspección que contengan datos individuales. Escapa datos dinámicos según su contexto y valida archivos importados antes de tocar el estado. Mantén datos personales fuera del audio externo.
- Protege la compatibilidad con estados existentes. Los cambios de persistencia requieren evidencia de recuperación, aislamiento entre perfiles y resolución de concurrencia antes de llegar a producción.

## Ejecución y pruebas

Usa Node 24 y npm. En Linux limpio, instala las dependencias de sistema de Chromium según el resultado del instalador de Playwright.

```sh
npm ci
npx playwright install chromium --only-shell
npm test
```

Para ver la aplicación, sirve el directorio con `python3 -m http.server 3000 --bind 127.0.0.1` y abre `http://localhost:3000`. En desarrollo usa un origen separado y una sesión sin código real. Las pruebas de navegador sirven los archivos localmente e interceptan las solicitudes de nube. El código fuente puede servirse como `index.html`, `motor.js`, `family.js`, `diagnostic-bank.js` y `diagnostic.js`. Para distribución estática, usa el artefacto de `npm run build` y el procedimiento de HANDOFF.

## Criterios antes de revisión

- Conserva las 41 pruebas de base de Fase 1.5 y las dos integraciones de servidor y añade regresiones para los cambios que lo requieran.
- Confirma que se pueden leer datos anteriores, que los fallos de importación no alteran el progreso y que el diff carece de datos personales introducidos y cambios ajenos.
- Ejecuta `git diff --check`. Registra versión probada, resultados, decisiones y pendientes en [HANDOFF.md](HANDOFF.md).
- Consulta [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) para arquitectura y operaciones y [ROADMAP.md](ROADMAP.md) para prioridades y criterios por fase.
