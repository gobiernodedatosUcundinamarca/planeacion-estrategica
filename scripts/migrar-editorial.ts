import { conexionSql } from '@/repositories/datasource/infrastructure/neon';
import { crearAlmacenEditorial } from '@/repositories/datasource/infrastructure/editorial/postgres';
import { validarEstado } from '@/lib/editorial/modelo';
import contenido from '@/editorial/contenido-inicial.json';
import { cargarEntorno } from './entorno';

async function main() {
  cargarEntorno();
  const estado = validarEstado(contenido);
  if (!process.argv.includes('--aplicar') && !process.argv.includes('--verificar')) {
    console.log(`Plan: crear tres tablas editoriales e importar ${Object.keys(estado.textos).length} textos. Sin conexión ni cambios. Usa --aplicar para ejecutar o --verificar para consultar.`);
    return;
  }
  const url = new URL(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '');
  const local = ['localhost', '127.0.0.1', 'db.localtest.me', '[::1]'].includes(url.hostname);
  if (!local && process.argv.includes('--aplicar') && !process.argv.includes('--permitir-remoto')) {
    throw Error('El destino es remoto; requiere --permitir-remoto además de --aplicar');
  }
  const sql = conexionSql({ directa: true });
  const almacen = crearAlmacenEditorial((texto, parametros = []) => sql.query(texto, parametros), process.env.EDITORIAL_SCHEMA ?? 'editorial');
  if (process.argv.includes('--aplicar')) {
    await almacen.inicializar();
    await almacen.importarInicial(estado);
  }
  const actual = await almacen.leer();
  console.log(`Editor verificado: revisión ${actual.revision}, ${Object.keys(actual.textos).length} textos. No se modifican tablas de encuestas ni de participación.`);
}
main().catch(error => {
  const mensaje = error instanceof Error && error.message.startsWith('IMPORTACION_RECHAZADA')
    ? 'El destino contiene otras ediciones: se conservó su contenido.' : 'Revisa configuración, destino y permisos antes de reintentar.';
  console.error(`Migración editorial detenida. ${mensaje}`);
  process.exitCode = 1;
});
