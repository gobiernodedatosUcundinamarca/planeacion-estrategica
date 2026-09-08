import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE_ADMIN } from "@/constants/admin";

/**
 * La sesión de /admin se lleva en una cookie **firmada**, no en un valor fijo.
 * Antes la cookie era el literal `"true"`: cualquiera podía ponerla a mano
 * (`Cookie: admin-validado=true`) y entrar sin el PIN. Ahora el valor es
 * `expiración.HMAC-SHA256(expiración)` y forjarlo exige conocer la clave.
 *
 * La clave de firma es el propio `ADMIN_PIN`: así no hace falta una variable de
 * entorno nueva en Vercel ni en el portable, y rotar el PIN invalida de paso
 * todas las sesiones abiertas. Sin `ADMIN_PIN` no se puede firmar ni verificar:
 * la puerta queda trabada (falla cerrado, igual que `validarPin`).
 *
 * Vive aparte de `acciones.ts` porque aquel archivo es "use server": todo lo
 * que exporta se publica como acción invocable desde el navegador, y esta
 * comprobación no debe serlo. `crearTokenSesion` sí la usa `validarPin`, pero
 * no es una acción por sí misma.
 */

function claveFirma(): string | null {
  return process.env.ADMIN_PIN || null;
}

function firmar(cargaUtil: string, clave: string): string {
  return createHmac("sha256", clave).update(cargaUtil).digest("base64url");
}

/** Valor de cookie para una sesión que vence dentro de `minutos`. */
export function crearTokenSesion(minutos: number): string {
  const clave = claveFirma();
  if (!clave) throw new Error("ADMIN_PIN no configurado");
  const expira = String(Date.now() + minutos * 60_000);
  return `${expira}.${firmar(expira, clave)}`;
}

/**
 * Si la sesión de /admin es válida: la cookie trae una firma HMAC correcta y no
 * ha vencido. La comparación de firmas es en tiempo constante para no filtrar
 * información por el tiempo de respuesta.
 */
export async function tieneAccesoAdmin(): Promise<boolean> {
  const clave = claveFirma();
  if (!clave) return false;

  const valor = (await cookies()).get(COOKIE_ADMIN)?.value;
  if (!valor) return false;

  const separador = valor.lastIndexOf(".");
  if (separador <= 0) return false;

  const cargaUtil = valor.slice(0, separador);
  const firmaRecibida = valor.slice(separador + 1);

  const expira = Number(cargaUtil);
  if (!Number.isFinite(expira) || Date.now() > expira) return false;

  const esperada = Buffer.from(firmar(cargaUtil, clave));
  const recibida = Buffer.from(firmaRecibida);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}
