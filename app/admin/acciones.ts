"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_ADMIN, DURACION_ACCESO_MINUTOS } from "@/constants/admin";
import type { ResultadoCargue } from "@/types/momento4";
import type { ResultadoCargueParticipacion } from "@/types/participacion";
import type { ResultadoCargueAportes } from "@/types/aportes";
import { eliminarAportes, guardarDocumentoAportes } from "@/repositories/aportesRepository";
import {
  eliminarRegistrosMomento4,
  guardarDocumentoMomento4,
} from "@/repositories/momento4Repository";
import {
  eliminarRegistrosParticipacion,
  guardarDocumentoParticipacion,
} from "@/repositories/participacionRepository";
import { TRANSFORMACIONES_MOMENTO4 } from "@/lib/reglas/momento4";
import { publicarSeccion } from "@/repositories/seccionesRepository";
import { getMetricasUso } from "@/repositories/metricasRepository";
import type { MetricasUso } from "@/types/metricas";
import { RUTA_POR_SECCION, SECCION_PARTICIPACION, SECCION_TRANSFORMACIONES } from "@/constants/secciones";
import { crearTokenSesion, tieneAccesoAdmin } from "./sesion";
import {
  limpiarFallosPin,
  registrarFalloPin,
  revisarLimiteIntentos,
} from "./limite-intentos";

/**
 * Comprueba el PIN contra ADMIN_PIN y, si coincide, abre el acceso escribiendo
 * la cookie de sesión. Vive en el servidor a propósito: el PIN nunca se envía
 * al navegador, así que no puede leerse inspeccionando la página.
 *
 * Devuelve `{ ok, motivo? }` en vez de un booleano para poder decirle a quien
 * intenta por qué falló (PIN incorrecto vs. demasiados intentos, con la espera).
 */
export async function validarPin(pin: string): Promise<{ ok: boolean; motivo?: string }> {
  const esperado = process.env.ADMIN_PIN;

  // Sin ADMIN_PIN configurado no entra nadie. Falla cerrado a propósito: un
  // despliegue al que se le olvidó la variable debe dejar la puerta trabada,
  // no abierta.
  if (!esperado) return { ok: false };

  // Límite de intentos por IP (ver limite-intentos.ts): tras varios fallos
  // seguidos hay que esperar antes de volver a probar. Se revisa antes de
  // comparar nada.
  const limite = await revisarLimiteIntentos();
  if (!limite.permitido) {
    return {
      ok: false,
      motivo: `Demasiados intentos. Espera ${limite.esperaSegundos} s antes de volver a probar.`,
    };
  }

  // Comparación en tiempo constante: `!==` corta en la primera letra distinta y
  // filtra, por el tiempo de respuesta, cuántas coinciden. Longitudes distintas
  // se descartan antes, sin comparar.
  const recibido = Buffer.from(pin.trim());
  const referencia = Buffer.from(esperado);
  const coincide =
    recibido.length === referencia.length && timingSafeEqual(recibido, referencia);

  if (!coincide) {
    await registrarFalloPin();
    return { ok: false, motivo: "PIN incorrecto." };
  }

  await limpiarFallosPin();

  // `secure` solo cuando la petición llega por https (Vercel): así la cookie no
  // viaja en claro en producción, pero el .exe portable —servido por http en
  // localhost— sigue pudiendo guardarla.
  const porHttps = (await headers()).get("x-forwarded-proto") === "https";

  const galletas = await cookies();
  galletas.set(COOKIE_ADMIN, crearTokenSesion(DURACION_ACCESO_MINUTOS), {
    httpOnly: true,
    sameSite: "lax",
    secure: porHttps,
    path: "/admin",
    maxAge: DURACION_ACCESO_MINUTOS * 60,
  });
  return { ok: true };
}

/**
 * Métricas de uso para el tablero, con el rango que se pida.
 *
 * Va por una server action y no por una ruta de API porque estos números solo
 * los puede ver quien administra: aquí la sesión se comprueba igual que en el
 * resto de acciones. El registro de actividad sí es público, pero solo escribe.
 */
export async function obtenerMetricasUso(dias: number): Promise<MetricasUso | null> {
  if (!(await tieneAccesoAdmin())) return null;
  return getMetricasUso(dias);
}

/**
 * Borra los registros del Momento 4: los de una transformación, o los de todas
 * si se pasa null. Solo se borran filas — las tablas y su estructura se quedan,
 * para que el siguiente cargue funcione sin volver a migrar.
 */
export async function eliminarRegistros(
  idTransformacion: string | null
): Promise<{ ok: boolean; eliminadas: number; motivo: string }> {
  // Igual que el cargue: la sesión se comprueba aquí porque una server action
  // es un endpoint público. Sin esto, cualquiera podría vaciar la base.
  if (!(await tieneAccesoAdmin())) {
    return {
      ok: false,
      eliminadas: 0,
      motivo: "La sesión venció. Vuelve a ingresar el PIN para borrar registros.",
    };
  }
  if (idTransformacion && !TRANSFORMACIONES_MOMENTO4.some((t) => t.id === idTransformacion)) {
    return { ok: false, eliminadas: 0, motivo: "Esa transformación no existe." };
  }

  try {
    const eliminadas = await eliminarRegistrosMomento4(idTransformacion);
    revalidatePath("/admin");
    revalidatePath(RUTA_POR_SECCION[SECCION_TRANSFORMACIONES]);
    return {
      ok: true,
      eliminadas,
      motivo: idTransformacion
        ? `Se borraron ${eliminadas} respuesta(s) de esa transformación.`
        : `Se borraron ${eliminadas} respuesta(s) de las cinco transformaciones.`,
    };
  } catch (error) {
    // El detalle de Postgres (nombres de columnas, fragmentos de consulta) se
    // deja en el log del servidor, no en la respuesta al navegador.
    console.error("eliminarRegistros (Momento 4) falló:", error);
    return {
      ok: false,
      eliminadas: 0,
      motivo: "No se pudo borrar. Revisa la conexión con la base e inténtalo de nuevo.",
    };
  }
}

/**
 * Publica o retira una sección del sitio. Devuelve el estado que quedó
 * guardado, para que la pantalla refleje lo que hay en la base y no lo que
 * creía tener antes de pulsar.
 */
export async function cambiarPublicacionSeccion(
  seccion: string,
  publicada: boolean
): Promise<{ ok: boolean; publicada: boolean; motivo?: string }> {
  // Igual que el cargue: una server action se puede invocar sin pasar por la
  // pantalla del PIN, así que la sesión se comprueba aquí también.
  if (!(await tieneAccesoAdmin())) {
    return {
      ok: false,
      publicada,
      motivo: "La sesión venció. Vuelve a ingresar el PIN para cambiar la publicación.",
    };
  }
  if (!(seccion in RUTA_POR_SECCION)) {
    return { ok: false, publicada, motivo: "Esa sección no existe." };
  }

  try {
    const estado = await publicarSeccion(seccion, publicada);
    // La ruta de la sección y el layout del panel: la primera deja de responder
    // 404 (o vuelve a hacerlo) y el segundo pinta el menú lateral, del que hay
    // que quitar o devolver el enlace.
    revalidatePath(RUTA_POR_SECCION[seccion]);
    revalidatePath("/", "layout");
    return { ok: true, publicada: estado };
  } catch (error) {
    console.error("cambiarPublicacionSeccion falló:", error);
    return {
      ok: false,
      publicada,
      motivo: "No se pudo guardar el cambio. Revisa la conexión con la base e inténtalo de nuevo.",
    };
  }
}

/**
 * Carga el documento de UNA transformación del Momento 4. Se sube de a uno y
 * con la casilla de destino explícita porque el nombre del archivo varía entre
 * exports: lo único que se valida del archivo es que cumpla el formato.
 */
export async function subirDocumentoMomento4(datos: FormData): Promise<ResultadoCargue> {
  const transformacion = String(datos.get("transformacion") ?? "");
  const archivo = datos.get("documento");
  const nombre = archivo instanceof File ? archivo.name : "—";

  const fallo = (motivo: string): ResultadoCargue => ({
    archivo: nombre,
    aceptado: false,
    motivo,
    transformacion: transformacion || null,
    etiqueta: null,
    respuestas: null,
    descartadas: null,
    descartadasPorFecha: null,
    reemplazo: null,
  });

  // Una server action es un endpoint público: se puede invocar sin pasar por la
  // pantalla del PIN, así que la sesión se comprueba aquí también. Sin esto, el
  // PIN protegería la vista pero no la escritura en disco.
  if (!(await tieneAccesoAdmin())) {
    return fallo("La sesión venció. Vuelve a ingresar el PIN para cargar documentos.");
  }
  if (!(archivo instanceof File)) {
    return fallo("No se recibió ningún archivo.");
  }

  const contenido = Buffer.from(await archivo.arrayBuffer());
  const resultado = await guardarDocumentoMomento4(transformacion, archivo.name, contenido);

  // Solo si algo cambió en disco: revalidar sin necesidad haría recargar la
  // página por gusto tras un cargue rechazado.
  if (resultado.aceptado) revalidatePath("/admin");

  return resultado;
}

/**
 * Carga una tanda de asistencia nueva de Participación. A diferencia del
 * Momento 4 no hay casilla de destino: cada archivo se suma a las tandas
 * anteriores, así que solo hace falta el archivo.
 */
export async function subirDocumentoParticipacion(
  datos: FormData
): Promise<ResultadoCargueParticipacion> {
  const archivo = datos.get("documento");
  const nombre = archivo instanceof File ? archivo.name : "—";
  const modoRecibido = String(datos.get("modo") ?? "");

  const fallo = (motivo: string): ResultadoCargueParticipacion => ({
    archivo: nombre,
    aceptado: false,
    motivo,
    filas: null,
    columnasReconocidas: null,
  });

  if (!(await tieneAccesoAdmin())) {
    return fallo("La sesión venció. Vuelve a ingresar el PIN para cargar tandas de asistencia.");
  }
  if (!(archivo instanceof File)) {
    return fallo("No se recibió ningún archivo.");
  }
  // El modo se valida en vez de confiar en lo que llegue: "reemplazar" borra
  // todo lo cargado, y una server action se puede invocar sin pasar por la
  // pantalla. Ante cualquier valor inesperado se anexa, que es lo que no
  // destruye nada.
  if (modoRecibido !== "anexar" && modoRecibido !== "reemplazar") {
    return fallo("No se indicó si el archivo se anexa o reemplaza lo ya cargado.");
  }

  const contenido = Buffer.from(await archivo.arrayBuffer());
  const resultado = await guardarDocumentoParticipacion(archivo.name, contenido, modoRecibido);

  if (resultado.aceptado) {
    revalidatePath("/admin");
    revalidatePath(RUTA_POR_SECCION[SECCION_PARTICIPACION]);
  }

  return resultado;
}

/**
 * Carga el Excel del formulario general del Plan. Reemplaza los aportes
 * anteriores: el export de Forms es acumulativo y sumarlos los duplicaría.
 */
export async function subirDocumentoAportes(datos: FormData): Promise<ResultadoCargueAportes> {
  const archivo = datos.get("documento");
  const nombre = archivo instanceof File ? archivo.name : "—";

  const fallo = (motivo: string): ResultadoCargueAportes => ({
    archivo: nombre,
    aceptado: false,
    motivo,
    respuestas: null,
    sinAporte: null,
    descartadasPorFecha: null,
  });

  if (!(await tieneAccesoAdmin())) {
    return fallo("La sesión venció. Vuelve a ingresar el PIN para cargar documentos.");
  }
  if (!(archivo instanceof File)) {
    return fallo("No se recibió ningún archivo.");
  }

  const contenido = Buffer.from(await archivo.arrayBuffer());
  const resultado = await guardarDocumentoAportes(archivo.name, contenido);

  if (resultado.aceptado) {
    revalidatePath("/admin");
    revalidatePath(RUTA_POR_SECCION[SECCION_TRANSFORMACIONES]);
  }

  return resultado;
}

/** Borra los aportes generales cargados. */
export async function eliminarRegistrosAportes(): Promise<{
  ok: boolean;
  eliminados: number;
  motivo: string;
}> {
  if (!(await tieneAccesoAdmin())) {
    return {
      ok: false,
      eliminados: 0,
      motivo: "La sesión venció. Vuelve a ingresar el PIN para borrar registros.",
    };
  }

  try {
    const eliminados = await eliminarAportes();
    revalidatePath("/admin");
    revalidatePath(RUTA_POR_SECCION[SECCION_TRANSFORMACIONES]);
    return { ok: true, eliminados, motivo: `Se borraron ${eliminados} aporte(s).` };
  } catch (error) {
    console.error("eliminarRegistrosAportes falló:", error);
    return {
      ok: false,
      eliminados: 0,
      motivo: "No se pudo borrar. Revisa la conexión con la base e inténtalo de nuevo.",
    };
  }
}

/** Borra una tanda de asistencia de Participación, o todas si se pasa null. */
export async function eliminarTandaParticipacion(
  documentoId: number | null
): Promise<{ ok: boolean; eliminados: number; motivo: string }> {
  if (!(await tieneAccesoAdmin())) {
    return {
      ok: false,
      eliminados: 0,
      motivo: "La sesión venció. Vuelve a ingresar el PIN para borrar registros.",
    };
  }

  try {
    const eliminados = await eliminarRegistrosParticipacion(documentoId);
    revalidatePath("/admin");
    revalidatePath(RUTA_POR_SECCION[SECCION_PARTICIPACION]);
    return {
      ok: true,
      eliminados,
      motivo: documentoId
        ? `Se borraron ${eliminados} registro(s) de esa tanda.`
        : `Se borraron ${eliminados} registro(s) de todas las tandas.`,
    };
  } catch (error) {
    console.error("eliminarTandaParticipacion falló:", error);
    return {
      ok: false,
      eliminados: 0,
      motivo: "No se pudo borrar. Revisa la conexión con la base e inténtalo de nuevo.",
    };
  }
}
