# Rediseño de la experiencia de aprendizaje

## Auditoría del recorrido anterior

Recorrido en Chromium móvil, 390 × 844, sobre una compilación de la aplicación anterior con datos sintéticos. Se revisaron la vista inicial, el reto, los accesos a los módulos, una actividad de instrucción, la navegación de sesiones y la entrada familiar. Es observación experta y técnica. Falta observar uso autónomo con un estudiante para confirmar comprensión, esfuerzo y duración.

| Superficie | Experiencia observada | Decisión propuesta |
| --- | --- | --- |
| Inicio y navegación | El título se parte en cuatro líneas. Nivel, racha y recompensas ocupan la primera pantalla. El reto ocupa el espacio anterior a los tres accesos pedagógicos. | Dar acceso inmediato a tres intenciones del alumno. Recompensas y detalles del reto pueden consultarse en un segundo nivel. |
| Mi práctica de hoy | Abre una tarjeta en el inicio y después lleva a una lección general. La distinción entre recordar, aprender y volver a comprobar depende del texto. | Una consigna de recuperación activa sin opciones al inicio, una pista manipulable si hace falta y una siguiente fecha visible. Dificultad y fecha responden al primer intento y las ayudas. |
| Lecciones guiadas | Lista extensa de títulos. La primera actividad muestra cuatro figuras, secuencia, comprobación y acciones secundarias sin jerarquía visual clara. Parte de la explicación se lee en párrafos separados del objeto. | Secuencia breve en un mismo marco. Mostrar un ejemplo junto a su representación, manipular objetos con un botón por cesta, retirar el soporte y comprobar transferencia. |
| Aventura de habilidades | El acceso presenta cinco sesiones con duración y nombres escolares. El recorrido se orienta a diagnóstico mediante consignas y respuestas. | Mantener los diagnósticos históricos en un flujo separado. En la aventura, cada acción mueve la misión y produce una consecuencia. |
| Reto diario | Cuatro bloques visibles por defecto. Matemáticas, inglés y lectura tienen tareas largas que aparecen juntas. El bono y la terminación se destacan frente a la finalidad de cada actividad. | Tras la aprobación, ofrecer un solo siguiente paso y poder cortar al terminar cada actividad. Conservar el reto original como vía de acceso mientras se valida la nueva rutina. |
| Experiencia móvil | Las pantallas tienen acciones grandes, pero el inicio exige desplazamiento y algunos controles secundarios compiten con la actividad. | Encabezado compacto, progreso, zona de interacción y acciones en flujo normal. Mantener foco, tamaños táctiles y un modo de movimiento reducido. |
| Para papás | La entrada familiar está debajo del área infantil y las preferencias, informes y copias comparten una navegación larga. | Acceso secundario de adulto. Proponer tres secciones para progreso y evidencia, personalización y cuenta y recuperación. Mantener el panel original hasta validar la propuesta y los permisos. |

## Cuatro perspectivas

- **Pedagogía.** Abrir una lección con una explicación apoyada por una representación. Separar el acierto con opciones de la respuesta construida y de la transferencia. Explicar una relación específica después de un error. La práctica de recuperar un producto y la tarea de entender grupos iguales tienen propósitos separados.
- **Aprendizaje y atención.** Consigna breve junto al objeto, una decisión principal por pantalla, texto consultable cuando es parte de la tarea y pausas que conservan el punto de trabajo. Progreso por pasos, sin cronómetro ni descuentos por error.
- **UX/UI.** Usar las referencias conceptuales de Duolingo para continuidad, Khan Academy Kids para representaciones infantiles y Brilliant para manipulación progresiva. La interfaz tiene composición propia, con contraste entre superficies violeta, menta y crema, tipografía de sistema y componentes con foco visible. Las fichas y cestas tienen significado matemático. El movimiento muestra que se agregó una ficha y se desactiva con la preferencia del sistema.
- **Ingeniería.** Mantener las vistas antiguas y los formatos persistentes. Los prototipos se sirven en `/prototipos/` solo en la compilación aislada de Preview. Tienen almacenamiento separado y ninguna conexión de red iniciada por la aplicación. La reconciliación con progreso real queda fuera de este ensayo.

## Inventario y prioridades de contenido

La revisión estructural generó una fila por cada uno de los 351 ítems de los bancos de diagnóstico y lecciones. Incluye consigna, respuesta, opciones, contexto, formato y explicación. Marcó 80 ítems con opciones y 18 con un enunciado que coincide literalmente con otro. La coincidencia puede corresponder a variantes legítimas con un dibujo o un audio diferente. También señaló un cruce de consigna de diagnóstico y enseñanza, «¿Dónde regó Mara?», que conviene sustituir en la comprobación de transferencia. Que una respuesta exista entre las opciones solo valida la estructura.

En esta primera entrega se inspeccionaron manualmente ejemplos de instrucciones, lectura, valor posicional, grupos y datos irrelevantes. La revisión pedagógica individual completa de los bancos y la de los ejercicios heredados y sus generadores permanecen pendientes. Priorizar consignas que revelan el procedimiento, distractores débiles, respuestas correctas por reconocimiento y reutilización de ejercicios entre diagnóstico y transferencia. Usar un identificador estable y registrar para cada ítem si se conserva, se corrige o se reemplaza antes de extender el diseño.

## Navegación y prototipos

**Inicio → Recordar / Aprender / Aplicar → una actividad → cierre o pausa.** El Reto diario y Para papás siguen accesibles desde la versión anterior. La ampliación propuesta agrega un acceso de segundo nivel al reto y otro para adultos.

- **Recordar.** Recuperar un resultado escribiéndolo antes de pedir el dibujo. Un primer acierto independiente sube un nivel y programa el próximo repaso a tres días. Un error o una pista recomienda un nivel menor y repaso al día siguiente. Hay seis ejemplos curados de la misma habilidad. Este piloto ilustra la lógica en un navegador y carece todavía de personalización multidisciplinaria.
- **Aprender.** Pasar de contar una cesta a construir tres grupos, ver la suma repetida, resolver una situación con libros, transferir a equipos y explicar por qué sirven grupos iguales. El dibujo se retira para el cálculo independiente. Siete pasos sin cronómetro. Se conserva la construcción al pausar o recargar.
- **Aplicar.** Leer un encargo del huerto, distinguir materiales útiles de un detalle irrelevante, repartir fichas directamente en cestas y preparar vasos según el resultado. El alumno recibe una explicación ligada a lo que hizo.

## Criterios de aprobación

Primero, que en pantalla móvil se entienda qué hacer sin ayuda verbal, que un error lleve a una pista entendible y que se pueda pausar y volver. Después, observar si el estudiante explica la estrategia y la aplica a otro ejemplo. Recoger esta evidencia antes de rediseñar el reto, el panel adulto o todos los bancos. La prueba del navegador verifica interacciones y disposición. La observación real del aprendizaje sigue pendiente.
