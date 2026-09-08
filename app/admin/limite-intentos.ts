import "server-only";
import { headers } from "next/headers";

/**
 * Límite de intentos del PIN de /admin, por IP. Vive dentro de `validarPin`
 * —no en un middleware—, así que **no corre en ninguna petición pública**:
 * solo se ejecuta cuando alguien envía el formulario del PIN.
 *
 * El estado es un `Map` en memoria: en Vercel no se comparte entre instancias
 * ni sobrevive a un reinicio, así que es best-effort. Aun así sube el coste de
 * una fuerza bruta de minutos a semanas, y a un admin que se equivoca dos o
 * tres veces no le molesta (los primeros fallos no tienen espera).
 */

/** Si no hay intentos en este rato, se olvida el historial de esa IP. */
const RESET_INACTIVIDAD_MS = 15 * 60_000;

/** A partir de este tamaño se barren las entradas viejas al registrar un fallo. */
const TOPE_ENTRADAS = 2_000;

type Registro = { fallos: number; ultimoIntento: number };
const registros = new Map<string, Registro>();

/** Segundos de espera obligatoria según los fallos seguidos de esa IP. */
function esperaSegundos(fallos: number): number {
  if (fallos < 5) return 0;
  if (fallos === 5) return 30;
  if (fallos < 10) return 60;
  if (fallos < 20) return 300;
  return 900;
}

async function ipCliente(): Promise<string> {
  const cabeceras = await headers();
  const reenviada = cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim();
  // En el .exe portable (http en localhost) no hay estas cabeceras: todas las
  // pruebas comparten la clave "local", que para un único usuario está bien.
  return reenviada || cabeceras.get("x-real-ip") || "local";
}

/**
 * Si la IP puede intentar ahora. Cuando está en espera, devuelve los segundos
 * que faltan para el próximo intento.
 */
export async function revisarLimiteIntentos(): Promise<
  { permitido: true } | { permitido: false; esperaSegundos: number }
> {
  const ip = await ipCliente();
  const registro = registros.get(ip);
  if (!registro) return { permitido: true };

  if (Date.now() - registro.ultimoIntento > RESET_INACTIVIDAD_MS) {
    registros.delete(ip);
    return { permitido: true };
  }

  const espera = esperaSegundos(registro.fallos);
  const transcurrido = (Date.now() - registro.ultimoIntento) / 1000;
  if (transcurrido < espera) {
    return { permitido: false, esperaSegundos: Math.ceil(espera - transcurrido) };
  }
  return { permitido: true };
}

/** Suma un fallo a la IP actual. */
export async function registrarFalloPin(): Promise<void> {
  const ip = await ipCliente();

  if (registros.size > TOPE_ENTRADAS) {
    const limite = Date.now() - RESET_INACTIVIDAD_MS;
    for (const [clave, valor] of registros) {
      if (valor.ultimoIntento < limite) registros.delete(clave);
    }
  }

  const registro = registros.get(ip) ?? { fallos: 0, ultimoIntento: 0 };
  registro.fallos += 1;
  registro.ultimoIntento = Date.now();
  registros.set(ip, registro);
}

/** Borra el historial de la IP actual: se acertó el PIN. */
export async function limpiarFallosPin(): Promise<void> {
  registros.delete(await ipCliente());
}
