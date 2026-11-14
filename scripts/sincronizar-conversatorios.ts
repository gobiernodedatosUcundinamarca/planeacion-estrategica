import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { CFB } from 'xlsx';

// Lee exclusivamente archivos confirmados en el repositorio documental.
const origen = process.argv[2];
if (!origen) throw Error('Indica la ruta del repositorio documental actualizado.');
const repo = resolve(origen);
const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 64 * 1024 * 1024, windowsHide: true });
const revision = git('rev-parse', 'HEAD').toString().trim();
const remoto = git('remote', 'get-url', 'origin').toString().trim();
if (!/^https:\/\/github\.com\/Nicolaserd\/Planeacion_estrategica_transformaciones_temas(?:\.git)?$/.test(remoto)) throw Error('El origen no es el repositorio documental previsto.');
const prefijo = 'flujo_bert_jev/informe/presentacionresumida/';
const rutas = git('ls-tree', '-r', '--name-only', 'HEAD', '--', prefijo).toString().trim().split('\n').filter(r => r.startsWith(prefijo) && !r.slice(prefijo.length).includes('/') && r.endsWith('_Resumen.pptx'));
if (!rutas.some(r => r.endsWith('/Presentacion_General_Resumen.pptx'))) throw Error('Falta la presentación general.');
const archivos = rutas.map(ruta => {
  const bytes = git('show', `HEAD:${ruta}`);
  const zip = CFB.read(bytes, { type: 'buffer' }) as { FullPaths: string[] };
  if (!zip.FullPaths.some(p => /ppt\/slides\/slide\d+\.xml$/.test(p))) throw Error('Presentación no válida: ' + ruta);
  return { archivo: ruta.slice(prefijo.length), ruta, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
});
const destino = join(process.cwd(), 'data', 'source-conversatorios');
mkdirSync(join(destino, 'presentaciones'), { recursive: true });
for (const a of archivos) {
  const ruta = join(destino, 'presentaciones', a.archivo);
  if (existsSync(ruta) && createHash('sha256').update(readFileSync(ruta)).digest('hex') === a.sha256) continue;
  writeFileSync(ruta, a.bytes);
}
writeFileSync(join(destino, 'origen.json'), JSON.stringify({ repositorio: remoto, revision, archivos: archivos.map(({ archivo, ruta, sha256 }) => ({ archivo, ruta, sha256 })) }, null, 2) + '\n');
console.log(JSON.stringify({ revision, presentaciones: archivos.length, destino: 'data/source-conversatorios/presentaciones' }));
