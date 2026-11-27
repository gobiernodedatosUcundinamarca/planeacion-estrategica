import "server-only";
import { preguntasAbiertasMomento5 } from "@/lib/reglas/momento5-abiertas";
import type { FormularioEnviadoMomento5, ResultadosMomento5, VistaMomento5 } from "@/types/momento5";
import type { Actividad2Momento5 } from "@/types/momento5-actividad2";
import type { KahootMomento5 } from "@/types/momento5-kahoot";
import {
  getFormulariosMomento5DataSource,
  getMomento5Actividad2DataSource,
  getMomento5DataSource,
  getMomento5KahootDataSource,
} from "./datasource";

/** Única puerta a los resultados del Momento 5 del CAI de Planeación Estratégica. */
export function getResultadosMomento5(): ResultadosMomento5 {
  return getMomento5DataSource().getResultados();
}

/** Actividad 2: las fichas por mesa y las nubes de Mentimeter, transcritas literalmente. */
export function getActividad2Momento5(): Actividad2Momento5 {
  return getMomento5Actividad2DataSource().getActividad2();
}

/** Reporte del Kahoot de la Actividad 3 (null si no hay reporte en la carpeta). */
export function getKahootMomento5(): KahootMomento5 | null {
  return getMomento5KahootDataSource().getKahoot();
}

/** Los cinco formularios tal como los exportó Forms, sin depurar: solo para la descarga. */
export function getFormulariosEnviadosMomento5(): FormularioEnviadoMomento5[] {
  return getFormulariosMomento5DataSource().getFormularios();
}

/**
 * La agrupación de las respuestas abiertas depende solo del archivo: el origen
 * devuelve el mismo objeto mientras el archivo no cambie, así que se calcula
 * una vez por versión del archivo y no en cada visita.
 */
const vistas = new WeakMap<ResultadosMomento5, VistaMomento5>();

/** Los resultados con sus preguntas abiertas agrupadas por tema. */
export function getVistaMomento5(): VistaMomento5 {
  const datos = getResultadosMomento5();
  let vista = vistas.get(datos);
  if (!vista) {
    vista = { datos, abiertas: preguntasAbiertasMomento5(datos) };
    vistas.set(datos, vista);
  }
  return vista;
}
