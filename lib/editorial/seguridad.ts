import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derivar = promisify(scrypt);
export const DURACION_SESION = 7200;
export const verificadorValido = (valor: string) => /^scrypt:(?:[a-f0-9]{2}){16,32}:[a-f0-9]{128}$/.test(valor);

export async function crearVerificador(clave: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derivar(clave, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function comprobarClave(clave: string, verificador: string) {
  if (!verificadorValido(verificador) || clave.length > 200) return false;
  const [, salt, hash] = verificador.split(':');
  const actual = await derivar(clave, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

function firmar(carga: string, secreto: string, verificador: string) {
  // Rotar el verificador o la clave de sesión invalida las sesiones anteriores.
  return createHmac('sha256', secreto).update(`editorial-v1:${verificador}:${carga}`).digest('hex');
}

export function crearSesion(secreto: string, verificador: string, ahora = Date.now()) {
  const carga = `${ahora + DURACION_SESION * 1000}.${randomBytes(16).toString('hex')}`;
  return `${carga}.${firmar(carga, secreto, verificador)}`;
}

export function comprobarSesion(token: string, secreto: string, verificador: string, ahora = Date.now()) {
  const partes = /^(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);
  if (!partes || Number(partes[1]) <= ahora || Number(partes[1]) > ahora + DURACION_SESION * 1000) return false;
  return timingSafeEqual(Buffer.from(partes[3], 'hex'),
    Buffer.from(firmar(`${partes[1]}.${partes[2]}`, secreto, verificador), 'hex'));
}
