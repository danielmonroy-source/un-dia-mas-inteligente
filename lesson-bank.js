/* Lecciones v1. Los identificadores son distintos de los del diagnóstico. */
(function(root){
'use strict';
const lessons=[];
const question=(prompt,answer,explain,attrs={})=>({prompt,answer,explain,...attrs});
const select=(prompt,answer,b,c,explain,body)=>question(prompt,answer,explain,{options:[b,answer,c],body,format:'rec'});
const sequence=(prompt,answer,tokens,explain)=>question(prompt,answer,explain,{tokens});
const passage=(body,prompt,answer,explain,attrs={})=>question(prompt,answer,explain,{body,...attrs});
function lesson(id,skill,area,title,strategy,example,home,prereq,tasks){
  lessons.push({id,skill,area,title,strategy,example,home,prereq,tasks})
}
const ins=(id,skill,title,strategy,example,home,prereq,tasks)=>
  lesson(id,skill,'Instrucciones',title,strategy,example,home,prereq,tasks);
const shapes={'Círculo azul':'🔵','Triángulo verde':'▲','Cuadrado naranja':'🟧','Estrella amarilla':'⭐'};
const pieces=Object.keys(shapes);
const icons=q=>({...q,icons:shapes});

ins('encontrar-accion','ins-1','Encuentra la acción',
  'Busca el verbo. Dice qué debes hacer. «Solamente» indica qué puedes elegir y deja las demás opciones fuera.',
  'Si dice «marca solamente la luna», la acción es marcar y la luna es lo único que debes marcar.',
  'Pidan una acción corta con objetos de casa. Antes de hacerla, subrayen el verbo.',
  [],[
    icons(sequence('Toca el círculo azul.','Círculo azul',pieces,'La acción era tocar el círculo azul.')),
    select('«Solamente rodea el triángulo». ¿Qué palabra indica la acción?','rodea','solamente','triángulo','El verbo «rodea» indica la acción.'),
    icons(sequence('Toca solamente el cuadrado naranja.','Cuadrado naranja',pieces,'«Solamente» deja fuera todas las demás figuras.')),
    question('En clase dicen «guarda el cuaderno». Escribe solo la palabra que indica qué hacer.','guarda','«Guarda» es el verbo de la indicación.'),
    icons(sequence('Marca solamente la estrella amarilla.','Estrella amarilla',pieces,'La consigna limita la elección a la estrella.')),
    question('Lee «subraya el nombre». Escribe la acción.','subraya','La acción es subrayar.'),
    question('«Separa los lápices». Escribe la palabra que indica la acción.','separa','El verbo es «separa».')
  ]);
ins('orden-dos','ins-23','Primero, después y antes',
  '«Primero» va al inicio. «Después» va más tarde. En «A antes que B», A se hace primero, aunque el texto mencione ambas cosas.',
  '«Antes de guardar el cuaderno, ciérralo». Orden: 1. cerrar el cuaderno; 2. guardarlo.',
  'Ordenen dos acciones antes de preparar los útiles e intercambien el orden en otra consigna.',
  ['encontrar-accion'],[
    icons(sequence('Toca la estrella amarilla y después el círculo azul.','Estrella amarilla|Círculo azul',pieces,'La estrella inicia la secuencia.')),
    sequence('Primero abre la mochila. Después mete el libro.','Abre la mochila|Mete el libro',['Mete el libro','Abre la mochila','Cierra la mochila'],'Primero abres; luego guardas el libro.'),
    icons(sequence('Antes del cuadrado naranja, toca el triángulo verde.','Triángulo verde|Cuadrado naranja',pieces,'El triángulo debe ir antes del cuadrado.')),
    sequence('Antes de servir el agua, coloca el vaso.','Coloca el vaso|Sirve el agua',['Sirve el agua','Lava el plato','Coloca el vaso'],'El vaso debe estar colocado antes de llenarlo.'),
    sequence('Revisa: «Primero el libro y después el lápiz». Marca lo que vas a tomar, en orden.','Libro|Lápiz',['Lápiz','Libro','Goma'],'La goma no aparece en la lista y el libro va primero.'),
    icons(sequence('Primero toca el círculo azul. Después el cuadrado naranja.','Círculo azul|Cuadrado naranja',pieces,'El círculo va antes del cuadrado.')),
    sequence('La tierra está seca. Antes de regar, toca la tierra.','Toca la tierra|Riega',['Riega','Toca la tierra','Recoge la regadera'],'Primero se comprueba la tierra.')
  ]);
ins('orden-tres','ins-23','Tres pasos y una revisión',
  'Divide la consigna en tres partes. «Finalmente» indica la última. Antes de terminar compara lo que hiciste con la lista.',
  'Primero toma lápiz, después abre la libreta y finalmente escribe. La última acción usa los materiales de las dos anteriores.',
  'Paren antes de terminar una tarea de tres pasos y revisen juntos el orden.',
  ['orden-dos'],[
    sequence('Primero cuaderno, después regla, finalmente tijeras.','Cuaderno|Regla|Tijeras',['Tijeras','Cuaderno','Regla','Lápiz'],'Las tijeras son el último paso.'),
    icons(sequence('Primero toca el círculo azul. Después toca el triángulo verde. Finalmente toca el cuadrado naranja.','Círculo azul|Triángulo verde|Cuadrado naranja',pieces,'Revisa las tres figuras y el lugar de cada una.')),
    sequence('Primero abre la caja; después pon una ficha; finalmente cierra la caja.','Abre|Pon una ficha|Cierra',['Cierra','Pon una ficha','Abre'],'Abrir permite poner la ficha; cerrar va al final.'),
    sequence('Para leer: primero busca el libro, después abre la página y finalmente lee el título.','Busca|Abre|Lee',['Abre','Lee','Busca','Subraya'],'Se necesita encontrar el libro y la página antes de leer el título.'),
    icons(sequence('Estrella amarilla primero, cuadrado naranja después, círculo azul al final. Revisa los tres pasos.','Estrella amarilla|Cuadrado naranja|Círculo azul',pieces,'Las marcas van en el orden que indica el texto.')),
    sequence('Pon agua, después agrega jabón y finalmente agita.','Agua|Jabón|Agita',['Agita','Agua','Jabón'],'Revisa que agitar sea el último paso.'),
    sequence('Primero levanta la hoja, después mira el dibujo y finalmente baja la hoja.','Levanta|Mira|Baja',['Baja','Mira','Levanta'],'Bajar la hoja cierra la secuencia.')
  ]);
ins('condiciones','ins-cond','Si, excepto y solamente',
  '«Si» presenta una condición. Comprueba si ocurre antes de actuar. «Excepto» significa dejar algo fuera; «solamente» limita lo que sí entra.',
  '«Guarda todos los lápices excepto el rojo». Guardas los demás. El rojo queda fuera.',
  'Jueguen a separar objetos con una condición sencilla. Antes de actuar, el niño puede explicar la regla.',
  ['orden-dos'],[
    select('«Si llueve, lleva paraguas». Hoy llueve. ¿Qué haces?','Llevo paraguas','Llevo una regadera','Ignoro el aviso','Se cumple la condición de lluvia.'),
    icons(sequence('Toca las figuras, excepto el triángulo y la estrella. Empieza por el círculo.','Círculo azul|Cuadrado naranja',pieces,'El triángulo y la estrella quedan fuera.')),
    question('«Puedes usar todos los colores excepto el azul». Escribe el color que queda fuera.','azul','«Excepto el azul» deja fuera ese color.'),
    question('Hay una pieza roja y una verde. «Si la pieza es verde, ponla en la caja». ¿Cuál pones?','verde','Solo la verde cumple la condición.'),
    question('«Si tienes sed, toma agua. Si tienes frío, toma un suéter». Tienes frío. ¿Qué tomas?','suéter','La condición que ocurre es el frío.',{accept:['sueter','un suéter','un sueter']}),
    question('«Trae los libros excepto el de ciencias». ¿Cuál queda fuera?','ciencias','El libro de ciencias queda fuera.',{accept:['el de ciencias']}),
    question('«Si ves un círculo, marca A. Si ves un triángulo, marca B». Ves un círculo. ¿Qué letra marcas?','A','Un círculo activa la primera condición.')
  ]);
ins('reformular','ins-decir','Di qué harás y revisa',
  'Explica con palabras propias qué harás sin perder acción, objeto ni orden. Al final, compara cada parte con la consigna.',
  '«Encierra dos palabras». En mis palabras: «Tengo que poner un círculo alrededor de dos palabras, no de todo el texto».',
  'Después de una indicación cotidiana, pidan que explique lo que va a hacer y revise al terminar.',
  ['orden-tres'],[
    select('«Escribe dos títulos». ¿Cuál reformulación conserva lo pedido?','Voy a escribir dos títulos.','Voy a leer dos títulos.','Voy a escribir una historia.','La acción es escribir y la cantidad es dos títulos.'),
    question('«Primero dibuja una casa y después ponle una puerta». Escribe qué harás primero.','dibujar una casa','El primer paso debe conservar acción y objeto.',{accept:['dibujo una casa','dibujar la casa']}),
    question('Reformula «Pon tres fichas junto al libro y guarda las demás».',null,'Tu explicación debe conservar cantidad, lugar y qué haces con las otras fichas.',{open:true}),
    sequence('La consigna dice: primero coloca una regla, luego un lápiz. Ordena tu revisión.','Regla colocada|Lápiz colocado',['Lápiz colocado','Regla colocada','Borrador colocado'],'Comprobar cada paso ayuda a notar si falta alguno.'),
    question('En tus palabras, explica «Separa los colores excepto el amarillo y cuenta los que separaste».',null,'Busca si tu explicación conserva excepción y conteo.',{open:true}),
    question('«Trae dos cuadernos». ¿Cuántos necesitas para cumplir?','2','Revisar la cantidad también es parte de la consigna.'),
    question('«Subraya tres palabras». Subrayaste dos. ¿Cuántas te faltan?','1','Al comparar tres con dos, falta una palabra.')
  ]);

const read=(id,skill,title,strategy,example,home,prereq,tasks)=>
  lesson(id,skill,'Lectura',title,strategy,example,home,prereq,tasks);
read('oracion-y-datos','lec-info','Encuentra quién, dónde y qué hizo',
  'Lee la oración completa. Busca la acción y las palabras que dicen quién o dónde. Vuelve al texto para comprobar el dato.',
  '«Ana llevó una regadera al huerto». Ana es la persona, llevó indica la acción y el huerto es el lugar.',
  'Lean un aviso. Pidan señalar la palabra que dice quién participa y el lugar.',
  ['entender-oraciones'],[
    select('¿Quién llevó los lápices?','Beto','Clara','Luz','La primera palabra identifica a quien realizó la acción.','Beto llevó los lápices al salón. Luz esperaba en el patio.'),
    passage('Mara regó las flores en el huerto. Su hermano acomodó libros en el salón.','¿Dónde regó Mara?','huerto','La primera oración dice quién regó y dónde.'),
    passage('Tomás dejó su cuaderno debajo de la banca del patio.','¿Quién dejó el cuaderno?','Tomás','Tomás realiza la acción «dejó».'),
    passage('En la biblioteca, Sara prepara carteles. En el patio, Hugo reúne las cajas.','¿Dónde reunió Hugo las cajas?','patio','El lugar se menciona al inicio de la segunda oración.'),
    passage('El mercado abre a las ocho. La biblioteca abre a las nueve.','¿Qué lugar abre a las nueve?','biblioteca','La segunda oración menciona la biblioteca.'),
    passage('Dani llevó agua al jardín. Luz llevó papel al salón.','¿Quién llevó papel?','Luz','La segunda oración dice que Luz llevó papel.'),
    passage('El equipo dejó los mapas en la biblioteca para que todos los consultaran.','¿Dónde dejaron los mapas?','biblioteca','El dato de lugar aparece después de «en la».')
  ]);
read('secuencia-y-evidencia','lec-orden','Ordena hechos y señala la evidencia',
  'Busca marcas como primero, luego y al final. Regresa al renglón que respalda el orden. Una evidencia es una parte del texto que te permite comprobar la respuesta.',
  '«Primero preparó la tierra. Luego sembró». La palabra luego indica que sembrar ocurrió después de preparar la tierra.',
  'Ordenen dos hechos de un cuento y vuelvan al renglón donde el texto señala cuál ocurrió antes.',
  ['oracion-y-datos'],[
    select('¿Qué pasó primero?','Lavó las frambuesas','Mezcló las frutas','Sirvió el plato','El texto usa «primero» para lavar.','Primero lavó las frambuesas. Luego las mezcló con otras frutas y sirvió el plato.'),
    passage('Antes de ir al parque, Rosa ató sus agujetas. En el parque compró agua.','¿Qué hizo antes de ir al parque?','ató sus agujetas','La frase «antes de ir» ubica la primera acción.'),
    passage('Primero Luis hizo el dibujo. Después escribió el título. Al final lo pegó.','¿Qué hizo inmediatamente después de dibujar?','escribió el título','La segunda oración ubica el paso entre dibujar y pegar.'),
    passage('El equipo puso las semillas en un vaso. Dos días después vio raíces. Luego llevó el vaso al huerto.','¿Qué apareció antes de llevar el vaso al huerto?','raíces','El texto dice que vieron raíces antes de salir al huerto.'),
    select('¿Qué frase respalda que la selección ocurrió antes de sembrar?','Primero escogieron las semillas.','Luego regaron el terreno.','Era un día soleado.','La frase que contiene «primero» y el hecho de escoger ubica la evidencia.','Primero escogieron las semillas. Después las sembraron. Luego regaron el terreno. Era un día soleado.'),
    passage('Pía guardó su botella después de tomar agua.','¿Qué ocurrió primero?','tomar agua','El orden se lee a partir de «después de».',{accept:['tomó agua']}),
    passage('El lunes se leyeron los cuentos. El martes se dibujaron portadas.','¿Qué ocurrió el martes?','se dibujaron portadas','El texto separa el orden por días.',{accept:['dibujaron portadas']})
  ]);
read('idea-principal','lec-idea-p','Tema, idea principal y detalles',
  'El tema responde «¿de qué trata?». La idea principal explica qué dice el texto sobre ese tema. Los detalles ayudan a entenderla, pero un detalle solo suele quedarse corto.',
  'En un texto sobre cuidar plantas, «riegan y cubren la tierra para conservar agua» explica la idea. «La cubeta era azul» dice un detalle.',
  'Lean un aviso breve. Pregunten qué dice principalmente y qué dato podría quedar fuera.',
  ['oracion-y-datos'],[
    select('¿De qué trata este texto?','El huerto del salón','El color de una cubeta','La hora del recreo','El tema es el huerto. El color solo describe un objeto.','El salón sembró verduras en su huerto. Usó una cubeta azul y organizó turnos para regar.'),
    select('¿Qué idea abarca el texto?','El grupo organizó turnos para cuidar el huerto.','La cubeta era azul.','Las plantas se regaron una sola vez.','El turno y el riego explican cómo se cuidó el huerto. La cubeta es un detalle.','El grupo puso turnos para regar. Cada persona llevó agua cuando le tocó. Una cubeta azul servía para alcanzar las plantas del fondo.'),
    passage('Un equipo limpió la cancha. Recogió envolturas y colocó un bote. Al día siguiente, más personas pudieron jugar allí.','Completa la idea: «El equipo limpió la ___ para que se pudiera jugar».','cancha','La idea reúne la limpieza con su propósito.'),
    passage('Las hojas secas cubren la tierra del huerto. Esa cubierta conserva la humedad y protege el suelo del sol.','¿Qué conserva la cubierta de hojas? Escribe la palabra que aporta evidencia para explicar por qué sirve.','humedad','La evidencia es «conserva la humedad». La idea incluye la función de la cubierta.'),
    passage('En la biblioteca, el grupo reparó libros dañados y organizó préstamos. Guardó unos cuentos en una caja verde. Más estudiantes pudieron leerlos.','Escribe una idea principal que explique qué hizo el grupo y para qué.',null,'La reparación y los préstamos apuntan a que más estudiantes puedan leer. La caja es un detalle.',{open:true}),
    passage('En la escuela separaron el papel de la basura. Así pudieron llevarlo a reciclar y reutilizar algunas hojas.','Completa: «Separar el ___ permite reciclarlo y reutilizar hojas».','papel','La idea principal une la acción con lo que permite hacer.'),
    passage('El agua de lluvia se juntó en recipientes para regar durante los días secos.','Completa la idea: «Guardar agua de lluvia ayuda a ___ cuando no llueve».','regar','El uso del agua en un día seco es la idea central.')
  ]);
read('inferencia-causa','lec-infer','Une pistas y encuentra la causa',
  'Una causa explica por qué ocurre algo. Una consecuencia dice qué pasó por esa razón. Para inferir, combina una pista del texto con algo que ya conoces.',
  'La fruta quedó al sol y se calentó. Estar al sol fue la causa. Que la fruta se calentara fue la consecuencia.',
  'Pregunten qué pista les hizo pensar que una acción provocó un resultado.',
  ['oracion-y-datos'],[
    select('¿Cuál fue la causa?','La lluvia','El piso mojado','La puerta abierta','La lluvia explica el piso mojado.','Llovió durante el recreo y por eso el piso del patio quedó mojado.'),
    select('¿Por qué podemos inferir que la mochila está mojada?','Quedó bajo la lluvia.','Es azul.','Está junto a una pared.','La lluvia puede mojar lo que quedó fuera.','Lea dejó la mochila sin cubrir. Regresó cuando terminó el aguacero.'),
    passage('El viento sopló con fuerza y cerró de golpe la ventana.','Escribe qué produjo el cierre.','viento','El viento fue la causa; el cierre, la consecuencia.',{accept:['el viento']}),
    passage('Al grupo se le acabaron las bolsas porque juntó más botellas de las esperadas.','Escribe qué se acabó como consecuencia.','bolsas','El grupo necesitó más espacio, así que se acabaron las bolsas.',{accept:['las bolsas']}),
    select('¿Qué inferencia se apoya en el texto?','Alguien cuidó la planta mientras la clase no estuvo.','La planta puede caminar.','El salón cambió de lugar.','La tierra húmeda es una pista de que alguien regó.','Antes de salir, la tierra estaba seca. Cuando regresaron, la tierra estaba húmeda y la regadera estaba junto a la planta.'),
    passage('La fila avanzó despacio porque solo había una puerta abierta.','¿Qué había abierto y explica la demora?','una puerta','Una sola puerta redujo el paso.',{accept:['una sola puerta']}),
    passage('Se secó el pincel porque lo dejaron al sol.','¿Qué se secó?','pincel','El pincel es la consecuencia observada.',{accept:['el pincel']})
  ]);
read('resumen','lec-resumir','Resume con tus palabras',
  'Nombra el tema y conserva lo más importante. Usa una o dos oraciones propias. Quita detalles que no cambian la idea.',
  'Si un texto explica cómo una clase ahorró agua, basta contar la acción principal y su efecto. El color de sus vasos puede quedar fuera.',
  'Hagan resúmenes orales. Comprueben juntos si contienen tema, acción principal y efecto, sin exigir las mismas palabras.',
  ['tema-y-detalles'],[
    select('¿Qué opción conserva la idea en menos palabras?','El grupo limpió el patio para poder usarlo.','La escoba tenía un mango largo.','La escuela tenía muchas ventanas.','El resumen conserva la acción y su propósito.','El grupo barrió y recogió hojas para que el patio se pudiera usar. La escoba tenía un mango largo.'),
    passage('Los vecinos arreglaron el espacio de lectura. Limpiaron las mesas y devolvieron los libros a los estantes. Al final todos pudieron usarlo.','Completa el resumen: «Los vecinos arreglaron el espacio para que todos pudieran ___».','usarlo','La frase reúne el arreglo y su propósito.'),
    passage('Una clase reutilizó hojas para tomar apuntes y guardó el resto para reciclar.','Resume el texto en una oración con tus palabras.',null,'Comprueba si mencionaste que reutilizaron hojas y reciclaron el resto.',{open:true}),
    passage('El grupo juntó agua de lluvia y la usó en días secos para regar.','Resume por qué sirvió guardar agua.',null,'Incluye qué hicieron y para qué sirvió.',{open:true}),
    passage('Una biblioteca prestó libros en una plaza para que más niños pudieran leer. Después recogió los libros para volver otro día.','Cuenta lo más importante en una oración.',null,'Conviene conservar el préstamo y su propósito.',{open:true}),
    passage('Guardaron hojas secas para cubrir el suelo y conservar agua.','Completa el resumen: «Cubrieron la tierra para conservar ___».','agua','La frase conserva el propósito.'),
    passage('La clase reparó una caja para guardar libros y volver a prestarlos.','¿Qué materiales querían seguir prestando?','libros','El préstamo de libros forma parte de la idea principal.')
  ]);
const place=(prompt,answer,explain,blocks)=>question(prompt,String(answer),explain,{blocks});
const exchange=(blocks,from,to)=>question('Cambia las piezas indicadas. ¿Cuántas '+['unidades','decenas','centenas','unidades de millar'][to]+' quedan?',
  String(blocks[to]+(to>from?1:10)),'El canje conserva la cantidad. Solo cambia cómo se agrupa.',{blocks,canje:[from,to]});
lesson('agrupar-diez','vp-ud','Valor posicional','Agrupar de diez en diez',
  'Cada ficha vale uno. Diez fichas juntas se pueden cambiar por una barra. Una barra vale diez.',
  'Si tienes 16 fichas, cambia diez por una barra. Quedan una barra y seis fichas: 16.',
  'Junten tapas en grupos de diez y escriban el total.',[],[
    place('¿Cuántas fichas sueltas ves?',4,'Cada ficha vale uno.',[4,0,0,0]),
    place('Cuenta el total de una barra y tres fichas.',13,'Una barra vale diez y tres fichas valen tres.',[3,1,0,0]),
    exchange([15,0,0,0],0,1),
    place('Escribe cuántas fichas hay en total.',34,'Tres barras valen treinta y cuatro fichas valen cuatro.',[4,3,0,0]),
    question('Para un juego guardaron cinco bolsas de diez canicas y siete sueltas. ¿Cuántas hay?',57,'Cinco grupos de diez más siete son 57.'),
    place('¿Cuánto vale todo lo que ves?',62,'Seis decenas y dos unidades forman 62.',[2,6,0,0]),
    question('Hay cuatro cajas de diez tizas y nueve tizas sueltas. Escribe el total.',49,'Cuatro decenas más nueve unidades son 49.')
  ]);
lesson('centenas','vp-c','Valor posicional','De las barras a las placas',
  'Diez barras de diez forman una centena. En 243, el 2 significa dos centenas, el 4 cuatro decenas y el 3 tres unidades.',
  'Dos placas, cuatro barras y tres fichas representan 200 + 40 + 3. El total es 243.',
  'Dibujen paquetes de cien, de diez y unidades sueltas para un número.', ['agrupar-diez'],[
    place('¿Cuánto valen dos placas juntas?',200,'Cada placa vale cien.',[0,0,2,0]),
    exchange([2,10,1,0],1,2),
    place('¿Cuánto vale la cifra de las centenas?',300,'El 3 está en las centenas y representa 300.',[2,5,3,0]),
    place('Escribe el número que representan las piezas.',243,'200 + 40 + 3 = 243.',[3,4,2,0]),
    question('La biblioteca recibe seis cajas de cien tarjetas y cuatro sueltas. ¿Cuántas recibe?',604,'El 0 indica que no sobran decenas. 600 + 4 = 604.'),
    place('Escribe el número que representan dos placas, ninguna barra y ocho fichas.',208,'El cero guarda el lugar de las decenas.',[8,0,2,0]),
    question('Armaron tres paquetes de cien hojas y ocho de diez. Escribe el total.',380,'Son 300 + 80. El cero indica que no hay hojas sueltas.')
  ]);
lesson('componer','vp-desc','Valor posicional','Construir números y usar el cero',
  'Lee cada lugar por separado. Si una posición está vacía, escribe cero para conservar el lugar de las otras cifras.',
  'En 604 hay seis centenas, cero decenas y cuatro unidades. En 64, el seis vale sesenta. Su posición cambia su valor.',
  'Escriban tres números con los mismos dígitos cambiando el cero de lugar.', ['centenas'],[
    place('Escribe el total que forman las piezas.',380,'Tres centenas y ocho decenas suman 380.',[0,8,3,0]),
    place('Escribe el número con estas centenas y unidades.',604,'El cero ocupa el lugar de las decenas.',[4,0,6,0]),
    question('Escribe 720 como suma de centenas y decenas. Usa el signo +.','700+20','Se escribe 700 + 20. También puedes indicar las cero unidades.',{expanded:true,accept:['700+20+0']}),
    question('Descompón 407 como suma de centenas y unidades. Usa el signo +.','400+7','El 4 representa 400 y no hay decenas.',{expanded:true,accept:['400+0+7']}),
    question('Un almacén tiene 500 folletos y 30 más. ¿Qué número debes anotar?',530,'500 + 30 = 530.'),
    question('Descompón 410 como suma de centenas y decenas. Usa el signo +.','400+10','400 + 10 = 410.',{expanded:true,accept:['400+10+0']}),
    question('Un registro tiene 9 paquetes de cien entradas y tres sueltas. Anota el total.',903,'El cero marca que no sobran decenas.')
  ]);
lesson('millares','vp-um','Valor posicional','Llegar a los millares',
  'Diez centenas forman una unidad de millar. Lee el número de izquierda a derecha y conserva los lugares vacíos con ceros.',
  '1005 tiene un millar, cero centenas, cero decenas y cinco unidades.',
  'Busquen números de cuatro cifras en un calendario o libro y expliquen el lugar de cada cero.', ['centenas'],[
    place('¿Cuánto vale un bloque de millar?',1000,'Un millar contiene mil unidades.',[0,0,0,1]),
    exchange([0,0,10,1],2,3),
    place('Escribe el número que ves.',1005,'Un millar y cinco unidades se escriben 1005.',[5,0,0,1]),
    place('Escribe el total.',2040,'Dos millares y cuatro decenas se escriben 2040.',[0,4,0,2]),
    question('Llegaron tres cajas de mil piezas, dos cajas de cien y nueve piezas sueltas. ¿Cuántas llegaron?',3209,'3000 + 200 + 9. Las decenas quedan en cero.'),
    question('Escribe cuatro millares y seis unidades.',4006,'Centenas y decenas están vacías.'),
    question('En un inventario hay dos paquetes de mil hojas y siete de diez. Anota el total.',2070,'2000 + 70 = 2070.')
  ]);
lesson('comparar','vp-comp','Valor posicional','Comparar desde el lugar más grande',
  'Alinea los números por la derecha. Mira el lugar de mayor valor donde sean diferentes.',
  '381 y 398 tienen las mismas centenas. 398 es mayor porque tiene nueve decenas, frente a ocho.',
  'Comparen páginas de libros y pidan una explicación con decenas o centenas.', ['centenas'],[
    select('¿Cuál es mayor?','390','309','300','Compara primero las centenas y después las decenas.'),
    question('Escribe el mayor entre 409 y 490.',490,'Las centenas son iguales. Nueve decenas superan a cero decenas.'),
    sequence('Ordena de menor a mayor: 603, 630 y 306.','306|603|630',['630','306','603'],'Primero comparamos centenas y luego decenas.'),
    question('Escribe el menor entre 504 y 540.',504,'Cero decenas es menor que cuatro decenas.'),
    question('Dos equipos reunieron 698 y 708 fichas. Escribe la cantidad mayor.',708,'Siete centenas superan a seis.'),
    question('Escribe el número mayor entre 305, 350 y 503.',503,'503 tiene cinco centenas.'),
    question('Hay 470 libros y 407 cajas pequeñas. ¿Cuál es la cantidad menor?',407,'Mismas centenas; 407 tiene menos decenas.')
  ]);
lesson('canjear','op-resta','Valor posicional','Agrupar y desagrupar al operar',
  'En una suma puedes agrupar diez unidades. En una resta puedes desagrupar una decena en diez unidades.',
  'En 32 − 7, abre una de las tres decenas. Ahora hay dos decenas y doce unidades. Quita siete de las unidades: quedan 25.',
  'Practiquen abrir y cerrar paquetes de diez con fichas reales.', ['agrupar-diez'],[
    place('¿Cuántas unidades vale una decena?',10,'Una decena vale diez unidades.',[0,1,0,0]),
    exchange([2,3,0,0],1,0),
    exchange([12,2,0,0],0,1),
    exchange([1,4,0,0],1,0),
    question('Dispones de 41 fichas en barras y sueltas. Si quitas 8, ¿cuántas quedan?',33,'Cambia una decena por diez unidades. 11 − 8 deja 3 unidades y 3 decenas.'),
    question('Suma 26 + 17. Cambia diez unidades si lo necesitas.',43,'6 + 7 = 13, así que agregamos una decena.'),
    question('Había 52 semillas. Se usaron 6. ¿Cuántas quedan?',46,'Desagrupa una decena. 12 − 6 = 6; quedan cuatro decenas.')
  ]);

read('entender-oraciones','lec-oracion','¿Quién hace qué?',
  'Busca quién aparece en la oración y qué hace. Luego añade detalles como el lugar o el momento.',
  'En «Después del recreo, Mara guardó la pelota», Mara hace la acción y guardar es lo que hizo. El recreo indica cuándo.',
  'Lean una oración de un cuento y señalen juntos quién hace la acción.',[],[
    passage('La tortuga entró al agua.','¿Quién entró?','tortuga','La tortuga es quien se mueve.',{accept:['la tortuga']}),
    passage('Al amanecer, un colibrí visitó las flores.','¿Qué visitó el colibrí?','flores','Visitó las flores; al amanecer dice cuándo.',{accept:['las flores']}),
    passage('En la cancha, Omar abrió el portón.','¿Qué abrió Omar?','portón','El portón recibe la acción.',{accept:['el portón']}),
    passage('Mientras sonaba la campana, Alba buscó el tablero.','¿Quién buscó el tablero?','Alba','La campana sonaba; Alba buscaba.'),
    passage('En una nota se lee: «La brigada recogerá hojas el viernes».','¿Qué día debe prepararse la brigada?','viernes','El viernes indica cuándo será la acción.',{accept:['el viernes']}),
    passage('A la salida, Sol devolvió un libro.','¿Qué devolvió?','libro','Devolver es la acción y el libro es lo devuelto.',{accept:['un libro','el libro']}),
    passage('El sábado, un grupo pintará el mural.','Escribe el día de la actividad.','sábado','El sábado indica el momento.',{accept:['el sábado']})
  ]);
read('tema-y-detalles','lec-idea-t','Separa la idea de sus detalles',
  'El tema dice de qué habla el texto. La idea dice qué es lo más importante que cuenta sobre el tema. Un detalle aclara solo una parte.',
  'Un cartel puede tratar del agua. Si explica cómo ahorrar agua, esa es la idea. El color del balde es solo un detalle.',
  'Lean un cartel y escojan una palabra para el tema y una frase para la idea.', ['idea-principal'],[
    select('¿Cuál es el tema?','El uso de luz en casa','El color del apagador','Las mochilas','El texto habla de cuidar la luz.','En casa apagan la luz cuando salen de una habitación. También abren las cortinas para aprovechar el sol.'),
    passage('La clase usó un bote amarillo para juntar materiales reciclables. Después los clasificó para volver a usarlos.','¿Qué color se menciona como detalle?','amarillo','El color describe el bote. La idea se relaciona con reutilizar materiales.'),
    select('¿Qué idea reúne los ejemplos?','Moverse en el recreo puede ser divertido.','El aro es pequeño.','El patio está mojado.','Saltar y jugar son ejemplos de actividades con movimiento.','En el recreo saltan la cuerda, corren y juegan con aros. El aro más pequeño se guarda al final.'),
    passage('Cuidaron un árbol del patio con turnos de riego y protegieron sus ramas. Había un listón rojo en el tronco.','¿Qué detalle podría quitarse sin perder la idea? Escribe el objeto rojo.','listón','El listón no explica el cuidado.',{accept:['el listón','listón rojo','el listón rojo']}),
    passage('La biblioteca hizo una fila para prestar libros. Clasificó los títulos para encontrarlos más rápido. En la entrada había una maceta.','Escribe la idea principal y señala un detalle secundario.',null,'La organización facilita el préstamo. La maceta es secundaria.',{open:true}),
    passage('Un grupo puso señales para cuidar un sendero. Había letreros verdes y una banca.','Completa: «Las señales ayudan a cuidar el ___».','sendero','El sendero es lo que se quiere proteger.'),
    passage('Un anuncio recomienda cerrar la llave y juntar el agua de lluvia. El dibujo tiene un borde azul.','Nombra el tema con una palabra.','agua','Cerrar la llave y juntar la lluvia son acciones sobre el agua.',{accept:['el agua']})
  ]);
// Variantes deterministas, con valores y lugares vacíos distintos de los ejemplos.
for(const [id,values] of Object.entries({
  'agrupar-diez':[76,86],centenas:[407,560],componer:[902,670],millares:[3025,6008]
})){
  const l=lessons.find(item=>item.id===id);
  for(const value of values){
    const digits=[...String(value).padStart(4,'0')].reverse().map(Number);
    l.tasks.push(place('Anota la cantidad total que representan las piezas.',value,
      digits.map((n,i)=>n*10**i).filter(Boolean).reverse().join(' + ')+' = '+value+'.',digits));
  }
}
/* Matemáticas 3.5. Los parámetros de cada ítem quedan fijos para reanudar por UUID. */
const math=(prompt,answer,explain,extra={})=>question(prompt,answer===null?null:String(answer),explain,{scope:'math',...extra});
const visual=(type,a,b,edit=false)=>({type,a,b,edit});
const errors=(...pairs)=>Object.fromEntries(pairs);
const multiply=(id,skill,title,strategy,example,home,prereq,tasks)=>
  lesson(id,skill,'Multiplicación',title,strategy,example,home,prereq,tasks);
const problem=(id,skill,title,strategy,example,home,prereq,tasks)=>
  lesson(id,skill,'Problemas',title,strategy,example,home,prereq,tasks);
const quantities=[[2,3],[4,2],[3,5],[4,3],[2,6],[3,4],[5,2],[4,5],[5,3]];
const settings=[
  ['platos','galletas'],['canastas','peras'],['cajas','fichas'],['equipos','jugadores'],
  ['filas','sillas'],['paquetes','lápices'],['bolsas','canicas'],['cajas','cuadernos'],['bandejas','panes']
];
const groupTasks=builder=>quantities.map(([a,b],i)=>builder(a,b,i,...settings[i]));
const labels={group:'concepto',sum:'concepto',array:'concepto',factor:'concepto',strategy:'calculo',
  memory:'recuperacion',operation:'operacion',question:'pregunta',data:'datos',model:'representacion',
  check:'comprobacion',result:'resolucion',steps:'dos-pasos'};
const hint={
  'grupos-por-elementos':'Distingue cuántos grupos hay de cuántos objetos tiene cada uno.',
  'dato-irrelevante':'Lee la pregunta y señala solo las cantidades que ayudan a contestarla.',
  'dato-necesario':'Localiza qué cantidades necesitas y si alguna todavía falta.',
  'operacion':'Decide si reúnes, comparas, buscas lo que falta o repites grupos iguales.',
  'unidad':'Escribe qué se contó después del número.',
  'resultado-intermedio':'Ese resultado contesta una parte. Vuelve a leer la última pregunta.',
  'comprobacion':'Representa de otra forma las cantidades que se dieron al principio.',
  'calculo':'Revisa cada paso con un dibujo o una operación equivalente.',
  'pregunta':'Relee la última oración e identifica qué cantidad se quiere descubrir.',
  'representacion':'Relaciona cada parte del dibujo con una cantidad del enunciado.'
};
function tagged(type,q){
  return {...q,evidence:q.evidence||labels[type],hint:hint[q.fallback],difficulty:q.difficulty||1};
}
const list=(type,items)=>items.map(q=>tagged(type,q));
function atomic(prompt,answer,explain,fallback,attrs={}){
  return math(prompt,answer,explain,{fallback,...attrs})
}
function contextual(a,b,containers,items){
  return `Hay ${a} ${containers} con ${b} ${items} en cada grupo.`;
}
multiply('grupos-iguales','mul-concepto','Construye grupos iguales',
  'Un grupo tiene objetos juntos. Los grupos son iguales cuando cada uno contiene la misma cantidad.',
  'Tres canastas con dos peras en cada una forman tres grupos iguales. Si una tiene una pera, ya son desiguales.',
  'Repartan tapas entre platos y comprueben que todos tengan la misma cantidad.',[],
  list('group',groupTasks((a,b,i,containers,items)=>{
    if(i===0)return atomic('Hay una canasta con dos peras y otra con tres. ¿Son grupos iguales o desiguales?',
      'desiguales','Una tiene dos y la otra tres. Sus cantidades son diferentes.','grupos-por-elementos',{accept:['desigual','no']});
    if(i===2||i===3||i===5)return atomic(`Construye ${a} grupos con ${b} fichas en cada uno.`,`${a}|${b}`,
      `${a} grupos tienen ${b} fichas cada uno. En total hay ${a*b}.`,'grupos-por-elementos',
      {model:visual('groups',1,1,true),build:true});
    return atomic(`¿Cuántos objetos hay en cada grupo? Mira los ${containers} con ${items}.`,b,
      `Cada grupo contiene ${b}; juntos tienen ${a*b}.`,'grupos-por-elementos',
      {model:visual('groups',a,b),errors:a===b?{}:errors([a,'grupos-por-elementos'])});
  })));
multiply('suma-repetida','mul-concepto','De grupos a sumas y multiplicaciones',
  'Escribe un sumando por grupo. Cada sumando indica cuántos objetos hay en ese grupo.',
  'Cuatro platos con tres frutas se escriben 3 + 3 + 3 + 3. La multiplicación que describe esos platos es 4 × 3.',
  'Hagan grupos de lápices y escriban tanto la suma como la multiplicación.',['grupos-iguales'],
  list('sum',groupTasks((a,b,i,containers,items)=>{
    const sum=Array(a).fill(b).join('+');
    const repeated=i%2===0;
    return atomic(`${contextual(a,b,containers,items)} Escribe ${repeated?'la suma repetida con +':'la multiplicación con ×'}.`,
      repeated?sum:`${a}×${b}`,`${sum} = ${a} × ${b} = ${a*b}.`,'representacion',
      {expression:true,model:i<3?visual('line',a,b):undefined,errors:errors([`${b}×${a}`,'grupos-por-elementos'])});
  })));
multiply('arreglos','mul-concepto','Filas, columnas y giros',
  'Una fila va de lado a lado. Una columna va de arriba a abajo. En un arreglo cada fila tiene la misma cantidad.',
  'Girar dos filas de cuatro fichas da cuatro filas de dos. En ambos casos hay ocho fichas, aunque las filas representan agrupaciones distintas.',
  'Giren un arreglo de tapas y comparen qué cambió y qué quedó igual.',['suma-repetida'],
  list('array',groupTasks((a,b,i)=>{
    if(i<3||i===5)return atomic(`Construye un arreglo de ${a} filas y ${b} columnas.`,`${a}|${b}`,
      `La cuadrícula tiene ${a} filas de ${b} fichas.`,'grupos-por-elementos',{model:visual('array',1,1,true),build:true});
    if(i===4||i===6||i===7)return atomic(`Un piso tiene ${a} filas y ${b} columnas. Dibuja el arreglo después de intercambiar filas y columnas.`,`${b}|${a}`,
      `Al girar quedan ${b} filas de ${a}. Se conservan las ${a*b} losetas.`,
      'grupos-por-elementos',{model:visual('array',a,b,true),build:true});
    return atomic(`Un piso tiene ${a} filas de ${b} losetas. Al girarlo, ¿cuántas fichas habrá en cada fila?`,a,
      `Ahora cada fila tiene ${a} losetas y hay ${b} filas. El total sigue siendo ${a*b}.`,'grupos-por-elementos',
      {model:i===3?visual('array',a,b):undefined,errors:errors([b,'grupos-por-elementos'])});
  })));
multiply('factores','mul-concepto','Qué cuenta cada factor',
  'El primer factor indica cuántos grupos contamos. El segundo indica cuántos objetos hay en cada grupo. El producto es el total.',
  'Si hay 12 pelotas repartidas en 3 cajas iguales, el arreglo muestra 4 en cada caja. Entonces 3 × 4 = 12.',
  'Cubran una fila de un arreglo y encuentren cuántas fichas faltan.',['arreglos'],
  list('factor',groupTasks((a,b,i,containers,items)=>{
    const askGroups=i%3===0;
    return atomic(`Hay ${a*b} ${items}. ${askGroups?`Hay ${b} por grupo.`:`Hay ${a} grupos iguales.`} ¿Cuántos ${askGroups?'grupos hay':'objetos hay por grupo'}?`,
      askGroups?a:b,`Los factores son ${a} y ${b}. El producto es ${a*b}.`,'grupos-por-elementos',
      {model:i===2?visual('array',a,b):undefined});
  })));
const calculation=[
  [2,7,'Suma 7 + 7.'],[5,4,'Cuenta de cinco en cinco cuatro veces.'],[10,3,'Tres decenas forman 30.'],
  [4,6,'Dobla 6 para obtener 12; dobla 12 para obtener 24.'],[6,4,'Usa 5 × 4 y añade un grupo de 4.'],
  [0,8,'Con cero grupos no hay objetos.'],[1,9,'Un grupo conserva los 9 objetos.'],
  [4,8,'Obtén 16 con el primer doble y 32 con el segundo.'],[7,5,'Suma 5 × 5 y 2 × 5.']
];
multiply('estrategias-producto','mul-concepto','Calcula con productos conocidos',
  'Usa dobles para ×2 y dos dobles para ×4. Cuenta por cincos o decenas. Puedes separar un arreglo en dos partes útiles.',
  'Para 6 × 5, usa 5 × 5 = 25 y agrega un grupo de cinco. Para 0 grupos hay cero objetos. Con un grupo quedan los objetos de ese grupo.',
  'Busquen dos maneras de obtener el total de cuatro grupos de seis.',['factores'],
  list('strategy',calculation.map(([a,b,method],i)=>atomic(`Calcula ${a} × ${b}. ${i<3?'Usa la representación.':''}`.trim(),a*b,
    method,'calculo',{difficulty:2,model:i<3?visual('line',a,b):undefined,partial:'Busca un producto pequeño que ya conozcas.'}))));
multiply('recordar-productos','mul-2510','Recuerda un producto sin prisa',
  'Mira la multiplicación y deja que aparezca el resultado. Si necesitas calcular, usa una estrategia conocida. También puedes practicar con las tablas de Inicio.',
  'Para 2 × 6 puedes recordar 12 o sumar 6 + 6. Las dos son útiles. Con práctica podrás comprobar qué resultados recuerdas.',
  'Digan un producto conocido en voz alta. Si hace falta, compruébenlo con tapas.',['estrategias-producto'],
  list('memory',[[2,8],[5,6],[10,6],[5,7],[10,4],[2,9],[5,9],[10,7],[2,4]].map(([a,b],i)=>
    atomic(`¿Cuánto es ${a} × ${b}?`,a*b,`Puedes comprobarlo con ${a} grupos de ${b}.`,'calculo',
      i===0?{options:[String(a*b),String(a+b),String(a*b+b)],format:'rec'}:{}))));
multiply('decidir-multiplicar','prob-oper','¿Es una situación para multiplicar?',
  'Busca grupos iguales y el total que se pregunta. Si hay cantidades diferentes que deseas reunir, suma cada cantidad.',
  'Tres platos de dos fresas se modelan con 3 × 2. Un plato de tres y otro de cinco se modelan con 3 + 5.',
  'Pongan frutas en platos iguales y desiguales, y comparen las operaciones.',['factores'],
  list('operation',groupTasks((a,b,i,containers,items)=>{
    if(i%2===0)return atomic(`Dos grupos de ${items} se guardan en ${containers}. Uno tiene ${a} y otro ${b}. Escribe la operación que reúne ambos.`,
      `${a}+${b}`,`Los grupos tienen tamaños diferentes. ${a} + ${b} reúne todos los objetos.`,'operacion',
      {expression:true,accept:[`${b}+${a}`],errors:errors([`${a}×${b}`,'operacion'])});
    return atomic(`${contextual(a,b,containers,items)} Escribe la operación para encontrar el total.`,`${a}×${b}`,
      `Aquí se repite el mismo tamaño ${a} veces.`,'operacion',{expression:true,errors:errors([`${a}+${b}`,'operacion'],[`${b}×${a}`,'grupos-por-elementos'])});
  })));
problem('entender-pregunta','prob-datos','Encuentra qué se pregunta',
  'Lee la pregunta y di qué cantidad hace falta encontrar. Luego distingue esa cantidad de los datos que ya conoces.',
  'Si una caja tiene 8 lápices y alguien saca 3, «¿qué queda?» pregunta por los lápices que siguen en la caja.',
  'Antes de resolver una compra, digan en voz alta qué cantidad buscan.',['encontrar-accion'],
  list('question',groupTasks((a,b,i,containers,items)=>atomic(`Hay ${a+b} ${items}. Se separan ${b}. ¿Cuántos quedan? Elige qué quiere saber la pregunta.`,
    'Lo que queda','El dato que buscamos es lo que sigue junto después de separar una parte.','pregunta',
    i<3?{options:['Lo que se separó','Lo que queda','La cantidad inicial'],format:'rec'}:
      {prompt:`Hay ${a+b} ${items} en ${containers}. Se separan ${b}. ¿Se pregunta por lo que queda o por lo que se separó? Escribe «queda» o «separó».`,
       accept:['queda'],errors:errors(['separó','pregunta'])}))));
problem('elegir-datos','prob-datos','Encuentra los datos que sirven',
  'Pregunta qué representa cada cantidad. Un dato sirve si lo necesitas para contestar. Si falta un dato, puedes nombrarlo.',
  'Si hay cuatro cajas iguales y se quiere saber cuántos lápices hay en total, falta saber cuántos lápices hay en cada caja.',
  'Inventen una compra con un dato de color y otro de precio. Pregunten cuál sirve para calcular.',['entender-pregunta'],
  list('data',groupTasks((a,b,i,containers,items)=>{
    if(i%3===0)return atomic(`Hay ${a} ${containers} con la misma cantidad de ${items}. ¿Qué falta saber para encontrar el total? Empieza con «cantidad…».`,
      'cantidad por grupo','Ya sabemos el número de grupos. Falta saber cuántos objetos contienen por separado.','dato-necesario',
      {accept:['cantidad en cada grupo','objetos por grupo'],errors:errors([a,'dato-necesario'])});
    return atomic(`Un salón prestó ${a} ${items} primero y ${b} después. Hay ${a+b+4} estudiantes. ¿Qué dos datos necesitas para calcular cuántos ${items} prestaron? Separa los dos datos con +.`,
      `${a}+${b}`,`Se suman los préstamos. Saber cuántos estudiantes hay no cambia cuántos objetos se prestaron.`,'dato-necesario',
      {expression:true,accept:[`${b}+${a}`],irrelevant:a+b+4});
  })));
problem('dibujar-problema','prob-oper','Representa las cantidades',
  'Un dibujo puede mostrar grupos. Una barra sirve para ver partes de un total. Una recta muestra saltos. Una tabla organiza dos cantidades que se relacionan.',
  'Si hay 6 fichas y quieres llegar a 10, dibuja una barra con 6 y marca el espacio que falta hasta 10.',
  'Dibujen dos barras para comparar cantidades y expliquen qué representa el hueco.',['elegir-datos'],
  list('model',groupTasks((a,b,i,containers,items)=>atomic(`Tienes ${a} ${items}. Quieres reunir ${a+b}. ¿Cuánto falta? Usa el esquema.`,b,
    `El tramo que falta es ${a+b} − ${a} = ${b}.`,'representacion',
    {model:visual(['bar','gap','table'][i%3],a,b),errors:errors([a+b,'resultado-intermedio'])}))));
problem('elegir-operacion','prob-oper','Elige la operación por la relación',
  'Decide si quieres reunir, comparar, completar o contar grupos iguales. Palabras como «más» también aparecen en comparaciones.',
  'Hay siete pelotas azules y tres rojas. Para saber cuántas azules hay de más, calculas 7 − 3.',
  'Comparen precios ficticios en pesos. Pregunten cuánto falta o en qué se diferencian.',['dibujar-problema'],
  list('operation',groupTasks((a,b,i,containers,items)=>{
    const mode=i%3;
    const statements=[
      [`Hay ${a+b} ${items} en una mesa y ${a} en otra. ¿Cuántos más tiene la primera?`,`${a+b}−${a}`, 'Se comparan dos cantidades.'],
      [`Llegaron ${a} ${items} en la mañana y ${b} en la tarde. ¿Cuántos llegaron en todo el día?`,`${a}+${b}`, 'Se reúnen dos cantidades.'],
      [`${contextual(a,b,containers,items)} ¿Cuántos ${items} hay en total?`,`${a}×${b}`, 'Se cuenta el total de grupos iguales.']
    ];
    const [prompt,answer,explain]=i===4?
      [`Una libreta cuesta ${a+b} pesos. Tienes ${a} pesos. ¿Cuánto dinero te falta?`,`${a+b}−${a}`,'Se busca la parte que falta para completar el precio.']:
      statements[mode];
    return atomic(prompt+' Escribe la operación que usarías.',answer,explain,'operacion',
      {expression:true,...(mode===1&&i!==4?{accept:[`${b}+${a}`]}:{})});
  })));
problem('resolver-y-comprobar','prob-sentido','Comprueba y responde con unidades',
  'Comprueba mediante la operación inversa, un dibujo o una estimación. Termina diciendo qué cuenta tu respuesta.',
  'Si de 12 peras quedan 8, se usaron 4 peras. Comprueba que 8 + 4 vuelve a dar 12.',
  'Hagan una cuenta en pesos y compruébenla sumando lo gastado y lo que quedó.',['elegir-operacion'],
  list('check',groupTasks((a,b,i,containers,items)=>{
    if(i<3||i===5)return atomic(`Había ${a+b} ${items}. Quedan ${a}. Alguien dice que se usaron ${b}. Escribe la suma que comprueba su respuesta.`,
      `${a}+${b}`,`Lo que queda más lo que se usó reconstruye el total: ${a+b}.`,'comprobacion',
      {expression:true,accept:[`${b}+${a}`],difficulty:2});
    return {...atomic(`Había ${a+b} ${items} y se usaron ${a}. ¿Cuántos quedan? Escribe número y unidad.`,`${b} ${items}`,
      `Quedan ${b} ${items}. Comprueba que ${a} + ${b} = ${a+b}.`,'calculo',{unit:items,errors:errors([`${a+b} ${items}`,'resultado-intermedio']),difficulty:2}),evidence:'resolucion'};
  })));
problem('problema-dos-pasos','prob-sentido','Divide un problema en dos preguntas',
  'Busca primero un resultado que puedas calcular. Luego lee la pregunta final y utiliza ese resultado para resolverla.',
  'Hay 3 bolsas de 4 semillas y se plantan 5. Primero 3 × 4 = 12; luego 12 − 5 = 7 semillas.',
  'Al preparar una merienda, calculen cuántas porciones hay y cuántas quedan tras servir.',['resolver-y-comprobar','decidir-multiplicar'],
  list('steps',groupTasks((a,b,i,containers,items)=>{
    const total=a*b,removed=2+i%3,answer=total-removed;
    return atomic(`${contextual(a,b,containers,items)} Entregan ${removed} ${items}. ${i===2?'¿Cuántos había antes de entregar?':'¿Cuántos quedan? Anota número y unidad.'}`,
      i===2?total:`${answer} ${items}`,`Primero hay ${a} × ${b} = ${total}; quedan ${total} − ${removed} = ${answer} ${items}.`,'calculo',
      {difficulty:3,...(i===2?{}:{unit:items,errors:errors([`${total} ${items}`,'resultado-intermedio'])})});
  })));

lessons.forEach(l=>l.tasks.forEach((q,i)=>{q.id=l.id+'-'+i}));
const mathTopics={
  'grupos-iguales':['op-suma','ins-1'],'suma-repetida':['op-suma'],'arreglos':['mul-concepto'],
  factores:['mul-concepto'],'estrategias-producto':['vp-ud','op-suma'],'recordar-productos':['mul-2510','mul-346','mul-789'],
  'decidir-multiplicar':['prob-oper','mul-concepto'],'entender-pregunta':['ins-1','lec-info'],
  'elegir-datos':['lec-info','comp-logica'],'dibujar-problema':['vp-ud','comp-frac'],
  'elegir-operacion':['op-suma','op-resta','mul-concepto'],'resolver-y-comprobar':['op-resta','comp-dinero'],
  'problema-dos-pasos':['ins-23','op-suma','op-resta']
};
const api={lessons,mathTopics,hint,byId:Object.fromEntries(lessons.map(l=>[l.id,l]))};
root.LessonBank=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
