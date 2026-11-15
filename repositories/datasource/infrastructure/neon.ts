import { neon } from "@neondatabase/serverless";
import { conexionLocal } from "./base-local";

/**
 * Única puerta a la base de datos, igual que `excel.ts` lo es a los .xlsx: que
 * la conexión se construya en un solo sitio evita que cada módulo elija su
 * propia cadena (con pooler o sin él) y termine con comportamientos distintos.
 *
 * Se usa el driver HTTP de Neon en vez de un pool de conexiones porque el sitio
 * corre en funciones serverless: no hay proceso largo que mantenga vivo un
 * pool, y cada consulta es una petición HTTP independiente.
 *
 * Sin "server-only" por el mismo motivo que `excel.ts`: los scripts de
 * mantenimiento (`scripts/`) necesitan hablar con la misma base con la misma
 * configuración, y ese guard —pensado para el bundle del cliente— los haría
 * fallar en Node.
 */
export function conexionSql(opciones: { directa?: boolean } = {}) {
  // El ejecutable portable trae su propia copia de la base y no usa la red.
  if (process.env.BASE_LOCAL_DIR) return conexionLocal(process.env.BASE_LOCAL_DIR);

  // La cadena sin pooler solo se pide explícitamente (migraciones y carga
  // inicial); la aplicación siempre usa la del pooler.
  const cadena = opciones.directa
    ? (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)
    : process.env.DATABASE_URL;

  if (!cadena) {
    throw new Error(
      "Falta DATABASE_URL. Configúrala en .env (local y portable) y en las variables de entorno del despliegue."
    );
  }
  return neon(cadena);
}
