import 'server-only';
import * as local from './datasource/infrastructure/editorial/local';
import { crearAlmacenEditorial } from './datasource/infrastructure/editorial/postgres';
import { conexionSql } from './datasource/infrastructure/neon';
import { configuracionEditorial } from '@/lib/editorial/configuracion';
import { comprobarClave, comprobarSesion, crearSesion } from '@/lib/editorial/seguridad';

function configuracion() {
  const config = configuracionEditorial();
  if (!config) throw Error('EDITORIAL_NO_CONFIGURADO');
  return config;
}
function almacen() {
  const sql = conexionSql();
  return crearAlmacenEditorial((texto, parametros = []) => sql.query(texto, parametros), process.env.EDITORIAL_SCHEMA ?? 'editorial');
}
export async function leerTextosEditoriales() { return configuracion().modo === 'local' ? local.leer() : almacen().leer(); }
export async function guardarTextoEditorial(id: string, valor: string | null, revision: number) {
  return configuracion().modo === 'local' ? local.guardar(id, valor, revision) : almacen().guardar(id, valor, revision);
}
export async function validarClave(clave: string) {
  const config = configuracion();
  return config.modo === 'local' ? local.validarClave(clave) : comprobarClave(clave, config.verificador);
}
export async function token() {
  const config = configuracion();
  return config.modo === 'local' ? local.token() : crearSesion(config.secreto, config.verificador);
}
export async function sesion(token: string) {
  const config = configuracion();
  return config.modo === 'local' ? local.sesion(token) : comprobarSesion(token, config.secreto, config.verificador);
}
let intentosLocales = { n: 0, inicio: 0 };
export async function reservarIntento() {
  if (configuracion().modo === 'postgres') return almacen().reservarIntento();
  if (Date.now() - intentosLocales.inicio >= 900000) intentosLocales = { n: 0, inicio: Date.now() };
  return ++intentosLocales.n <= 5;
}
export async function limpiarIntentos() {
  if (configuracion().modo === 'postgres') await almacen().limpiarIntentos();
  else intentosLocales = { n: 0, inicio: 0 };
}
