// Carga la función nubeMerge desde index.html (bloque NUBE-INICIO … NUBE-FIN) para probarla sin navegador.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const m = html.match(/\/\* NUBE-INICIO[^*]*\*\/([\s\S]*?)\/\* NUBE-FIN \*\//);
if (!m) throw new Error('No se encontró el bloque NUBE en index.html');
export const nubeMerge = new Function(m[1] + '\nreturn nubeMerge;')();
