import { readFile, writeFile, mkdir, copyFile, open, unlink } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { randomBytes } from 'node:crypto';
import { validarEstado } from '@/lib/editorial/modelo';
import { verificadorValido } from '@/lib/editorial/seguridad';

async function main() {
  const args = process.argv.slice(2);
  const opcion = (nombre: string) => args[args.indexOf(nombre) + 1];
  if (!args.includes('--origen') || !args.includes('--privado')) throw Error('Indica --origen <carpeta editorial local> y --privado <carpeta fuera del repositorio>');
  const origen = resolve(opcion('--origen'));
  const privado = resolve(opcion('--privado'));
  const distancia = relative(process.cwd(), privado);
  if (!distancia || (!distancia.startsWith('..') && !isAbsolute(distancia))) throw Error('La carpeta privada debe estar fuera del repositorio');
  // Comparte el bloqueo del editor local: la copia no puede mezclar revisiones.
  const bloqueo = join(origen, 'edicion.lock');
  const archivoBloqueo = await open(bloqueo, 'wx');
  try {
  const estado = validarEstado(JSON.parse((await readFile(join(origen, 'textos.json'), 'utf8')).replace(/^\uFEFF/, '')));
  const acceso = JSON.parse(await readFile(join(origen, 'acceso.json'), 'utf8'));
  const verificador = `scrypt:${acceso.salt}:${acceso.hash}`;
  if (!verificadorValido(verificador)) throw Error('El verificador local no tiene el formato esperado');
  const respaldo = join(privado, 'respaldos', new Date().toISOString().replace(/[:.]/g, '-'));
  await mkdir(respaldo, { recursive: true });
  for (const archivo of ['textos.json', 'acceso.json', 'historial.jsonl']) {
    try { await copyFile(join(origen, archivo), join(respaldo, archivo)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  // Solo contenido destinado a la página pública; nunca acceso ni historial privado.
  await writeFile(resolve('editorial/contenido-inicial.json'), JSON.stringify(estado, null, 2) + '\n');
  try {
    await writeFile(join(privado, '.env'), [
      'EDITORIAL_STORAGE=postgres',
      `EDITORIAL_PASSWORD_SCRYPT=${verificador}`,
      `EDITORIAL_SESSION_SECRET=${randomBytes(32).toString('hex')}`,
      '# Completar con los orígenes HTTPS oficiales exactos, separados por comas.',
      'EDITORIAL_ALLOWED_ORIGINS=', '',
    ].join('\n'), { flag: 'wx', mode: 0o600 });
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  console.log(`Respaldo privado creado. ${Object.keys(estado.textos).length} textos validados para publicar. Credenciales fuera del repositorio; no se modificó el origen.`);
  } finally {
    await archivoBloqueo.close();
    await unlink(bloqueo);
  }
}
main().catch(() => { console.error('No se pudo preparar el paquete editorial. Comprueba rutas y datos del catálogo; no publiques archivos privados.'); process.exitCode = 1; });
