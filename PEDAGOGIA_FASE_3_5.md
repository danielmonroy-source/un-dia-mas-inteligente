# Matemáticas conceptuales · Fase 3.5

Una respuesta numérica permite observar el cálculo. Interpretar factores, seleccionar datos y justificar una comprobación necesitan tareas propias. El orden de los factores se expresa como grupos × objetos por grupo. Al girar un arreglo se conserva el total y cambia qué se agrupa. Una elección entre opciones se registra como reconocimiento. Las tablas sin representación ni pistas ofrecen una observación de recuperación, aunque el alumno podría calcular mentalmente. La aplicación no deduce la estrategia ni usa el tiempo para adivinarla.

Los problemas con información insuficiente admiten identificar el dato que falta. Un resultado sin unidad puede ser numéricamente correcto y quedar incompleto. Al pasar a dos pasos se comprueba antes la elección de operaciones y la revisión del resultado. Los errores descritos corresponden a respuestas observables, nunca a causas psicológicas.

## Progresión y actividades

| Multiplicación | Problemas |
| --- | --- |
| Construir y comparar grupos iguales | Encontrar qué se pregunta |
| Pasar de grupos a sumas y productos | Seleccionar datos y encontrar los que faltan |
| Construir y girar filas y columnas | Representar cantidades con partes, rectas o tablas |
| Interpretar factores y encontrar uno que falta | Elegir la operación según la relación |
| Calcular con dobles, cincos, decenas, descomposición, cero y uno | Comprobar con la operación inversa y responder con unidad |
| Observar productos recuperados sin pista y acceder a las tablas existentes | Dividir y resolver un problema de dos pasos |
| Decidir cuándo multiplicar y cuándo reunir cantidades diferentes | |

El banco agrega 13 lecciones de nueve actividades cada una. Los ítems tienen identificadores estables, ejercicios equivalentes y variantes de repaso. Se combinan consignas redactadas a mano con combinaciones acotadas de cantidades y situaciones. En las construcciones se ajustan las cantidades y se comprueba su relación. La cuadrícula se puede girar en el ítem de interpretación. Las otras representaciones incluyen recipientes con fichas, rectas de saltos, barras y tablas de cantidades. Las pruebas comprueban productos, totales de dos pasos, unidades y varios distractores. Las reglas textuales aceptan alternativas explícitas y pueden dejar fuera formulaciones válidas imprevistas.

## Dos recorridos completos

**Grupos iguales.** Comparar una canasta de dos peras con otra de tres. Leer la regla de igualdad y ver el ejemplo de tres canastas con dos peras. Construir tres grupos de cinco fichas. En práctica independiente construir cuatro grupos de tres. Si se invierten las cantidades, recibir la indicación de distinguir grupos de fichas por grupo y usar otro ítem al reintentar. En aplicación interpretar el número por fila en una situación de sillas. Reflexionar sobre cómo comprobar que los grupos sean iguales y guardar el repaso.

**Comprobar un problema.** En activación reconstruir el total con dos datos. Leer la estrategia de comprobar mediante una operación inversa y ver el caso de doce peras. En práctica guiada y en un problema posterior decidir qué suma confirma lo que se usó. Aplicar en otra situación escribiendo número y unidad. Una respuesta que solo da el número correcto queda marcada como unidad omitida. Reflexionar sobre cómo se comprobó y programar el repaso.

## Evidencia y recomendaciones

La respuesta se guarda por UUID con etapa, nivel de ayuda, formato, resultado y, en matemáticas, tipo de evidencia y error observable. Las categorías incluyen comprensión conceptual, cálculo, recuperación observada sin pista, pregunta, datos, representación, operación, comprobación, resolución con unidad y dos pasos. El panel familiar informa avances de cada tipo, errores, ayudas y repasos. El error activa una orientación específica y permite cambiar a un ejercicio equivalente; la demostración completa no registra un acierto independiente.

Si el diagnóstico tiene evidencia de dificultad en consignas o lectura, el recorrido de problemas recomienda comprensión primero. Entre las nuevas microlecciones se pide evidencia de aplicación del prerrequisito. Dos pasos depende de comprobar resultados y distinguir cuándo corresponde multiplicar. Los identificadores del catálogo de Motor siguen vigentes, con claves de lección separadas de las tablas históricas. Las respuestas de reconocimiento y con pistas quedan en el historial sin acreditar dominio. Para las tablas, «sin pista» significa que no usó la ayuda de la interfaz. Las pruebas no observan qué estrategia mental siguió.

## Capacidad y tutor de Fase 4

Ejecutar `node tests/history-size.mjs` para simular 50 respuestas diagnósticas, un reto al día dividido entre dos dispositivos, 12 intentos de reto diarios, tres oportunidades de lección por semana y un turno adicional de repaso. El cálculo aplica la unión real del frontend y estima bytes UTF-8 del JSON con el espaciado de PostgreSQL.

| Día | Estado total | Lecciones | Retos diarios | Boletas | Motor | Intentos acumulados |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 9 772 B | — | — | — | — | 50 |
| 60 | 147 879 B | 104 654 B | 21 060 B | 4 740 B | 6 544 B | 863 |
| 90 | 217 220 B | 158 831 B | 31 590 B | 7 110 B | 8 298 B | 1 270 |
| 180 | 351 095 B | 251 809 B | 63 180 B | 14 220 B | 8 964 B | 2 415 |

El diagnóstico ocupa 9 638 B en este ensayo. El aviso llega el día 75 y el límite se cruza el día 83. Los diarios, las boletas y los eventos de lecciones crecen con el uso. Los intentos sincronizados se conservan por separado, pero una cola totalmente desconectada puede sumar 544 188 B al día 180. Las copias locales incluyen estado y revisiones adicionales. Estas cifras dependen de la actividad simulada y no garantizan 60 días para cualquier perfil. El servidor aislado comprobó 200 000 bytes exactos, rechazo con un byte extra y preservación del estado anterior. El navegador avisa a partir de 180 000 bytes. Ante un exceso, conserva estado y revisión pendiente, deja visible el aviso e intenta enviar por separado los intentos de la cola. Hasta que exista una solución persistente, el estado consolidado de ese dispositivo queda sin sincronizar.

Antes de un piloto largo, diseñar una migración reversible del registro creciente de lecciones a eventos por UUID fuera del documento consolidado, con resúmenes pequeños en la fila principal. Verificar restauración, concurrencia y autorización con dos dispositivos. Conservar las evidencias y revisar la retención de copias en un entorno aprobado.

El catálogo consultable en `Lecciones.inventory()` expone habilidad, prerrequisitos, objetivo, duración prevista, evidencia, dificultad, disponibilidad de alternativas, aplicación, repaso y revisión parental. Fase 4 debe priorizar prerrequisitos sin evidencia, enseñanza ante dificultades, práctica guiada, aplicación independiente y repasos vencidos según el historial. La selección debe intercalar una explicación cuando corresponda, reservar ítems inéditos para comprobar y permitir pausas. El reto previo sirve de referencia durante la validación del nuevo selector. Esta fase no cambia el reto diario.
