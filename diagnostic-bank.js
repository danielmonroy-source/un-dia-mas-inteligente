/* Banco v1. Los identificadores publicados se conservan al revisar un ejercicio. */
(function(root){
'use strict';
const sessions=[
  'Instrucciones y lectura','Números y operaciones','Multiplicación y problemas',
  'Escritura y entorno','Inglés y nuevas comprobaciones'
];
const items=[];
function station(session,id,skill,variants,context={}){
  variants.forEach(([prompt,answer,options,explanation,extra],i)=>{
    items.push({id:id+'-'+i,station:id,session,skill,level:i+1,prompt,answer,options,
      format:options?'rec':'rcl',explanation,...context,...extra});
  });
}
const option=(p,a,b,c,e,x)=>[p,a,[a,b,c],e,x];
const recall=(p,a,e,x)=>[p,a,null,e,x];
const order=(p,a,tokens,e,format='apl')=>[p,a,null,e,{tokens,format}];
const textA='El viernes, Mara llevó una botella para regar el huerto de la escuela. Vio la tierra seca. Primero quitó unas hojas viejas y al final regó las plantas. Al día siguiente la tierra seguía húmeda.';
const textB='En el parque, Nico encontró una banca con papeles alrededor. Primero pidió una bolsa a su tía y después recogió los papeles. Al final, otras personas pudieron sentarse en una banca limpia.';
const inText=(body,kind)=>({body,kind});
station(1,'paso','ins-1',[
 option('Toca la estrella.','Estrella','Círculo','Cuadrado','La consigna pide una estrella.'),
 option('Elige la figura que tiene cuatro lados iguales.','Cuadrado','Triángulo','Círculo','Un cuadrado tiene cuatro lados iguales.')
]);
station(1,'dos-pasos','ins-23',[
 order('Toca el círculo y luego la estrella.','Círculo|Estrella',['Estrella','Cuadrado','Círculo'],'Primero va el círculo y luego la estrella.'),
 order('Primero toca la luna; al final, el sol.','Luna|Sol',['Sol','Luna','Nube'],'La luna es el primer paso y el sol es el segundo.')
]);
station(1,'tres-pasos','ins-23',[
 order('Toca círculo, estrella y cuadrado, en ese orden.','Círculo|Estrella|Cuadrado',['Cuadrado','Círculo','Estrella','Triángulo'],'El orden es círculo, estrella y cuadrado.'),
 order('Primero luna, después nube y al final sol.','Luna|Nube|Sol',['Sol','Árbol','Nube','Luna'],'La nube va entre la luna y el sol.')
]);
station(1,'que-pide','ins-decir',[
 option('«¿Dónde dejó Ana su cuaderno?» ¿Qué te piden encontrar?','Un lugar','Una persona','Una cantidad','La palabra dónde pregunta por el lugar.'),
 option('«¿Qué hizo primero Leo?» ¿Qué debes buscar?','Su primera acción','La hora exacta','El nombre de un lugar','Primero indica qué acción ocurrió antes.')
]);
station(1,'oracion','lec-oracion',[
 option('«Luz dejó la mochila debajo de la silla». ¿Dónde está?','Debajo de la silla','Encima de la silla','Junto a la puerta','Debajo indica que está más abajo que la silla.'),
 option('«Beto salió después de guardar los colores». ¿Qué pasó antes de salir?','Guardó los colores','Abrió la mochila','Encendió la luz','Después de guardar indica que guardó primero.')
]);
station(1,'dato-texto','lec-info',[
 option('¿Qué llevó Mara para regar?','Una botella','Una pala','Una cubeta','El texto dice que llevó una botella.',inText(textA,'dato')),
 option('¿Qué le pidió Nico a su tía?','Una bolsa','Una escoba','Un vaso','El texto dice que pidió una bolsa.',inText(textB,'dato'))
]);
station(1,'personaje','lec-info',[
 option('¿Quién regó las plantas?','Mara','La tía','Nico','Mara hizo las tareas del huerto.',inText(textA,'personaje')),
 option('¿Quién encontró la banca?','Nico','Mara','La tía','Nico encontró la banca.',inText(textB,'personaje'))
]);
station(1,'lugar','lec-info',[
 option('¿Dónde regó Mara?','En el huerto de la escuela','En un parque','En su casa','La primera oración señala el huerto de la escuela.',inText(textA,'lugar')),
 option('¿Dónde encontró Nico la banca?','En el parque','En la escuela','En su patio','El texto empieza en el parque.',inText(textB,'lugar'))
]);
station(1,'secuencia','lec-orden',[
 option('¿Qué hizo Mara antes de regar?','Quitó hojas viejas','Pidió una bolsa','Sembró semillas','Primero quitó hojas; después regó.',inText(textA,'secuencia')),
 option('¿Qué hizo Nico inmediatamente después de pedir la bolsa?','Recogió papeles','Encontró la banca','Se sentó a descansar','El texto dice que después recogió los papeles.',inText(textB,'secuencia'))
]);
station(1,'idea','lec-idea-p',[
 option('¿Cuál es la mejor idea principal?','Mara cuidó el huerto regando la tierra seca.','Mara llevó una botella.','La escuela organizó una carrera.','Cuidar el huerto explica lo que hizo Mara. La botella es un detalle.',inText(textA,'idea')),
 option('¿Qué idea explica mejor lo ocurrido?','Nico limpió alrededor de la banca para que se pudiera usar.','Nico consiguió una bolsa.','La banca era nueva.','La limpieza y su efecto explican el texto completo.',inText(textB,'idea'))
]);

station(2,'reconocer-numero','vp-ud',[
 option('Elige el número cuarenta y seis.','46','64','406','Cuatro decenas y seis unidades forman 46.'),
 option('Elige doscientos ocho.','208','280','28','Doscientos ocho tiene dos centenas, cero decenas y ocho unidades.')
]);
station(2,'unidades','vp-ud',[
 recall('Escribe cuántas unidades sueltas ves.','4','Se cuentan cuatro puntos sueltos.',{visual:'● ● ● ●'}),
 recall('En 57, ¿qué cifra está en las unidades?','7','Las unidades están en el extremo derecho.')
]);
station(2,'decenas','vp-ud',[
 option('Cada barra vale diez. ¿Cuántas decenas hay?','3','30','2','Tres barras representan tres decenas.',{visual:'▮ ▮ ▮'}),
 recall('Construye un número con cuatro decenas y tres unidades.','43','40 + 3 = 43.')
]);
station(2,'centenas','vp-c',[
 recall('Cada cuadro vale cien. ¿Cuánto valen juntos?','200','Dos centenas suman 200.',{visual:'■ ■'}),
 recall('Construye un número con 6 centenas, 0 decenas y 4 unidades.','604','600 + 0 + 4 = 604.')
]);
station(2,'millares','vp-um',[
 option('¿Cuál es la cifra de los millares en 2 305?','2','3','5','El 2 está en el cuarto lugar desde la derecha.'),
 recall('Escribe el valor del 3 en 3 071.','3000','El 3 representa tres unidades de millar.')
]);
station(2,'posicion','vp-c',[
 recall('¿Cuánto vale el 5 en 352?','50','El 5 está en el lugar de las decenas, así que vale 50.'),
 recall('¿Cuánto vale el 5 en 507?','500','Cinco centenas valen 500.')
]);
station(2,'descomponer','vp-desc',[
 option('¿Qué suma forma 405?','400 + 5','40 + 5','400 + 50','El cero marca que no hay decenas.'),
 recall('Escribe el número que se forma con 700 + 60 + 2.','762','Las piezas son 7 centenas, 6 decenas y 2 unidades.')
]);
station(2,'comparar','vp-comp',[
 option('¿Qué número es mayor?','309','290','300','309 y 300 tienen tres centenas; 309 tiene nueve unidades más.'),
 option('¿Cuál es menor?','1 098','1 908','1 980','Los millares son iguales. 1 098 tiene cero centenas.')
]);
station(2,'suma-simple','op-suma',[
 recall('Resuelve 23 + 14.','37','Suma 3 + 4 unidades y 2 + 1 decenas.'),
 recall('Resuelve 124 + 253.','377','Suma por posición: 300 + 70 + 7.')
]);
station(2,'suma-canje','op-suma',[
 recall('Resuelve 28 + 17.','45','15 unidades se cambian por una decena y cinco unidades.'),
 recall('Resuelve 146 + 78.','224','Después de sumar 6 + 8, pasa una decena. Vuelve a agrupar las decenas.')
]);
station(2,'resta-simple','op-resta',[
 recall('Resuelve 56 − 21.','35','Resta unidades y decenas por separado.'),
 recall('Resuelve 786 − 241.','545','Resta por posición: 500 + 40 + 5.')
]);
station(2,'resta-canje','op-resta',[
 recall('Resuelve 62 − 27.','35','Cambia una de las seis decenas por diez unidades.'),
 recall('Resuelve 302 − 148.','154','Cambia una centena en decenas, y una decena en unidades.')
]);

station(3,'grupos','mul-concepto',[
 option('¿Cuántos grupos iguales ves?','3 grupos de 2','2 grupos de 3','3 grupos de 3','Cada par entre corchetes forma un grupo.',{visual:'[● ●]   [● ●]   [● ●]'}),
 option('¿Cuál arreglo tiene cuatro grupos iguales de tres?','3 + 3 + 3 + 3','4 + 4 + 4','3 + 3 + 4','Cuenta los cuatro sumandos, todos de valor tres.')
]);
station(3,'suma-repetida','mul-concepto',[
 option('Si el primer número indica cuántos grupos hay, ¿qué representa 4 + 4 + 4?','3 × 4','3 + 4','4 × 4','Hay tres grupos y cada grupo tiene cuatro.'),
 option('Si el primer número cuenta los grupos, ¿qué representa 2 + 2 + 2 + 2 + 2?','5 × 2','5 + 2','2 × 2','Son cinco grupos de dos.')
]);
station(3,'arreglo','mul-concepto',[
 recall('Escribe cuántos puntos hay en el arreglo.','8','Dos filas de cuatro hacen ocho.',{visual:'● ● ● ●\n● ● ● ●',format:'apl'}),
 recall('Escribe cuántos puntos hay en el arreglo.','15','Tres filas de cinco hacen quince.',{visual:'● ● ● ● ●\n● ● ● ● ●\n● ● ● ● ●',format:'apl'})
]);
station(3,'tabla-2510','mul-2510',[
 recall('Escribe el producto de 5 × 3.','15','Tres grupos de cinco hacen quince.'),
 recall('Escribe el producto de 5 × 7.','35','Siete cincos hacen 35.')
]);
station(3,'tabla-346','mul-346',[
 recall('Escribe el producto de 3 × 4.','12','Tres grupos de cuatro suman 12.'),
 recall('Escribe el producto de 6 × 7.','42','Seis grupos de siete suman 42.')
]);
station(3,'tabla-789','mul-789',[
 recall('Escribe el producto de 7 × 4.','28','Cuatro sietes suman 28.'),
 recall('Escribe el producto de 8 × 9.','72','Nueve grupos de ocho suman 72.')
]);
station(3,'datos','prob-datos',[
 option('Hay 5 bolsas con 4 canicas en cada una. Dos bolsas son verdes. ¿Qué datos necesitas para contar todas las canicas?','5 bolsas y 4 por bolsa','2 bolsas verdes y 5 bolsas','4 canicas y el color verde','El color no cambia cuántas hay.'),
 option('Luis tiene 24 estampas; regala 7 y dibuja 2 soles. ¿Qué datos indican cuántas estampas le quedan?','24 y 7','24 y 2','7 y 2','Interesan las estampas que tenía y las que regaló.')
]);
station(3,'operacion','prob-oper',[
 option('Hay 4 platos con 3 galletas cada uno. ¿Cuál cálculo encuentra el total?','4 × 3','4 + 3','4 − 3','Cuatro grupos iguales se pueden multiplicar.'),
 option('Tenías 18 hojas y usaste 6. ¿Qué cálculo encuentra cuántas quedan?','18 − 6','18 + 6','18 × 6','Se separaron seis hojas del grupo inicial.')
]);
station(3,'problema','prob-oper',[
 recall('Hay 3 cajas con 6 lápices cada una. ¿Cuántos lápices hay?','18','Tres grupos de seis hacen 18.',{format:'apl'}),
 recall('En una mesa hay 4 bolsas con 8 fichas en cada una y 3 fichas sueltas. ¿Cuántas hay?','35','Primero 4 × 8 = 32. Después suma las 3 fichas sueltas.',{format:'apl'})
]);
station(3,'comprobar','prob-sentido',[
 option('Cada una de 3 bolsas tiene 4 naranjas. Alguien dice que hay 7. ¿Cómo lo compruebas?','Sumo 4 + 4 + 4 y obtengo 12.','Sumo 3 + 4 y confirmo 7.','Resto 4 − 3 y obtengo 1.','Cuenta cuatro por cada bolsa.',{kind:'comprobación'}),
 option('Tras regalar 6 de 20 fichas, alguien dice que quedan 26. ¿Qué observas?','Quedan menos de 20, así que 26 no puede ser.','26 es mayor, por eso sí puede ser.','No se puede decidir.','Al regalar fichas la cantidad disminuye.',{kind:'comprobación'})
]);

station(4,'ordenar-oracion','esc-ordenar',[
 order('Ordena las palabras para decir que el gato está dormido.','El|gato|duerme',['duerme','gato','El'],'«El gato duerme» expresa la idea completa.','rec'),
 order('Empieza con «La» y ordena las palabras.','La|niña|riega|las|plantas',['plantas','las','La','riega','niña'],'«La niña riega las plantas» tiene sujeto y acción.','rec')
]);
station(4,'mayuscula','esc-mayus',[
 option('¿Qué oración empieza con mayúscula?','Ana juega.','ana juega.','ana Juega.','La primera palabra de una oración inicia con mayúscula.'),
 option('¿Qué nombre propio está escrito correctamente?','México','méxico','méXico','Los nombres propios empiezan con mayúscula.')
]);
station(4,'puntuacion','esc-mayus',[
 option('Elige una oración que termine con punto.','Paco lee un libro.','Paco lee un libro,','Paco lee un libro','El punto cierra una oración afirmativa.'),
 option('Elige la pregunta con los signos que necesita.','¿Dónde está la libreta?','Dónde está la libreta?','¿Dónde está la libreta.','En español la pregunta lleva signo al inicio y al final.')
]);
station(4,'ortografia','esc-orto',[
 option('Completa la palabra de la oración «En la granja hay una ___ que da leche».','vaca','baca','vacá','El animal se escribe «vaca».'),
 option('Completa «Con un vaso ___ doy agua».','le','lé','lle','En esta oración se escribe «le», sin tilde.')
]);
station(4,'comunidad','ent-comunidad',[
 option('¿Cuál ejemplo describe una comunidad?','Personas que conviven y colaboran en un barrio','Una mochila con útiles','Una sola señal de tránsito','Una comunidad reúne personas con actividades y lugares comunes.'),
 option('En muchos estados de México, ¿cómo se llama la unidad de gobierno local que organiza servicios cercanos?','Municipio','Continente','Océano','El municipio organiza servicios cercanos a la comunidad.')
]);
station(4,'municipio','ent-comunidad',[
 option('Varias localidades comparten un gobierno cercano. ¿Cómo se llama ese territorio?','Municipio','País','Continente','Un municipio puede reunir varias localidades.'),
 option('¿Qué lugar tiene un ayuntamiento que atiende servicios cercanos?','Un municipio','Un océano','Un continente','El ayuntamiento corresponde al gobierno municipal.')
]);
station(4,'estado-pais','ent-mexico',[
 option('Puebla es un estado. ¿De qué país forma parte?','México','Perú','Canadá','Puebla es uno de los estados de México.'),
 option('¿Qué orden va de lugar más cercano a territorio más amplio?','Comunidad, municipio, estado, país','País, comunidad, estado, municipio','Estado, municipio, país, comunidad','Una comunidad puede formar parte de un municipio, y este de un estado y un país.')
]);
station(4,'geografia','ent-mexico',[
 option('¿Cómo se llama una gran elevación natural del terreno?','Montaña','Río','Llanura','Una montaña sobresale del terreno que la rodea.'),
 option('¿Cuál pista ayuda a identificar un río en un mapa sencillo?','Una línea azul que sigue un cauce','El dibujo de una casa','La letra inicial de una ciudad','Los mapas suelen usar azul para mostrar el agua.')
]);
station(4,'diversidad','ent-tradiciones',[
 option('Dos comunidades celebran de formas distintas. ¿Qué muestra esto?','Diversidad de tradiciones','Que una debe copiar a la otra','Que todas las fiestas son iguales','Las comunidades pueden tener costumbres diferentes.'),
 option('¿Qué afirmación describe a los pueblos originarios de México?','Son comunidades vivas con historias, lenguas y costumbres diversas.','Solo existieron en el pasado.','Todos hablan una única lengua.','Son pueblos presentes y diversos, con lenguas y formas de vida propias.')
]);
station(4,'originarios','ent-tradiciones',[
 option('¿Cuál ejemplo muestra una lengua originaria viva de México?','Una familia que conversa en náhuatl','Un mapa con los nombres de ríos','Un reloj que marca las doce','El náhuatl sigue hablándose en comunidades de México.'),
 option('¿Cuál idea respeta la diversidad de los pueblos originarios?','Sus comunidades tienen distintas historias y formas de vida.','Todas sus comunidades viven de la misma manera.','Sus lenguas solo aparecen en libros antiguos.','Cada comunidad puede tener su propia historia, lengua y costumbres.')
]);
station(4,'orientacion','esp-dir',[
 option('¿Qué está a la derecha de la casa?','Árbol','Escuela','Casa','Según el dibujo, a la derecha de la casa está el árbol.',{visual:'Escuela — Casa — Árbol'}),
 option('En la fila, ¿qué queda a la izquierda de la tienda?','Parque','Biblioteca','Tienda','El parque está antes de la tienda al leer la fila de izquierda a derecha.',{visual:'Parque — Tienda — Biblioteca'})
]);
station(4,'rutas','esp-rutas',[
 option('Desde la casa camina un paso a la derecha. ¿A dónde llegas?','Parque','Casa','Escuela','La derecha en la fila lleva de la casa al parque.',{visual:'Escuela — Casa — Parque'}),
 option('Empieza en la tienda. Da dos pasos a la izquierda. ¿A dónde llegas?','Parque','Casa','Tienda','Pasas primero por la casa y luego por el parque.',{visual:'Parque — Casa — Tienda'})
]);

station(5,'en-reconocer','en-vocab',[
 option('¿Qué significa «dog»?','Perro','Gato','Pez','«Dog» significa perro.'),
 option('¿Qué significa «book»?','Libro','Mesa','Lápiz','«Book» significa libro.')
]);
station(5,'en-recordar','en-vocab',[
 recall('Escribe en inglés una palabra para «gato».','cat','La palabra es «cat».'),
 recall('Escribe en inglés una palabra para «sol».','sun','La palabra es «sun».')
]);
station(5,'en-escuchar','en-vocab',[
 option('Escucha la palabra y elige su significado.','Agua','Pan','Leche','«Water» significa agua.',{audio:'Water',kind:'escucha'}),
 option('Escucha la palabra y elige su significado.','Mesa','Silla','Puerta','«Table» significa mesa.',{audio:'Table',kind:'escucha'})
]);
station(5,'en-contexto','en-vocab',[
 option('Te dan un regalo. ¿Qué puedes decir?','Thank you','Good night','Excuse me','«Thank you» se usa para agradecer.',{kind:'contexto'}),
 option('Llegas a clase al comenzar el día. ¿Qué saludo encaja?','Good morning','Good night','Goodbye','«Good morning» saluda por la mañana.',{kind:'contexto'})
]);
station(5,'en-frase','en-frases',[
 order('Ordena las fichas para decir «Veo un perro».','I|see|a|dog',['dog','see','I','a'],'«I see a dog» sigue el orden de esa frase.','rec'),
 order('Ordena las fichas para decir «Me gustan los libros».','I|like|books',['books','I','like'],'«I like books» expresa que te gustan los libros.','rec')
]);
station(5,'en-frase-propia','en-frases',[
 recall('Escribe en inglés «Veo un gato».','I see a cat','Ejemplo: «I see a cat».',{format:'apl',accept:['I can see a cat']}),
 recall('Escribe en inglés «Me gustan los perros».','I like dogs','Ejemplo: «I like dogs».',{format:'apl',accept:['I like the dogs']})
]);

const bank={sessions,items};
root.DiagnosticBank=bank;
if(typeof module!=='undefined'&&module.exports)module.exports=bank;
})(typeof globalThis!=='undefined'?globalThis:this);
