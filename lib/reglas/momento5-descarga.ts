import type { HojaDescarga } from "@/types/descargas";
import type { FormularioEnviadoMomento5, ResultadosMomento5 } from "@/types/momento5";
import { nombreFormularioDe, ordenAplicacion } from "./momento5";

/** Nombre de la hoja de cada formulario: Excel admite 31 caracteres. */
const HOJA_DE_FORMULARIO: Record<string, string> = {
  validacion: "Validación Estratégica",
  acuerdos: "Acuerdos del Equipo",
  percepcion: "Percepción Transf. Digital",
  consolidacion: "Consolidación del MEDIT",
  matriz: "Matriz Colaborativa MEDIT",
};

export const HOJA_EXCLUIDOS = "Envíos excluidos";

/**
 * El Excel de la sección Resultados del Momento 5: una hoja por formulario, en
 * el orden en que se aplicaron, con las columnas tal como las exportó Forms y
 * sin los envíos que el análisis depuró («Qué se depuró» en la página). La
 * última hoja dice cuáles se quitaron y por qué, para que el archivo cuadre con
 * las cifras de la página sin esconder nada.
 *
 * Cada exportación se reconoce por el nombre de su archivo, comparado con los
 * nombres de los formularios igual que las notas de depuración
 * (`nombreFormularioDe`): Forms nombra los archivos a su manera, a veces en
 * mayúsculas y con el rango de IDs, «ACUERDOS ESTRATÉGICOS DEL EQUIPO(1-9)».
 */
export function hojasDescargaMomento5(
  meta: ResultadosMomento5["meta"],
  enviados: FormularioEnviadoMomento5[]
): HojaDescarga[] {
  const hojas: HojaDescarga[] = [];
  const excluidas: (string | number | null)[][] = [];

  for (const f of ordenAplicacion(meta.formularios)) {
    const enviado = enviados.find((e) => nombreFormularioDe(e.archivo, meta.formularios) === f.nombre);
    if (!enviado) continue;
    const exclusiones = meta.exclusiones.filter(
      (x) => x.id_respuesta !== null && nombreFormularioDe(x.formulario, meta.formularios) === f.nombre
    );
    const ids = new Set(exclusiones.map((x) => String(x.id_respuesta)));
    const filas =
      enviado.columnaId < 0 ? enviado.filas : enviado.filas.filter((fila) => !ids.has(String(fila[enviado.columnaId])));
    hojas.push({
      nombre: HOJA_DE_FORMULARIO[f.id] ?? f.nombre.slice(0, 31),
      titulo: f.nombre,
      columnasFechaHora: enviado.columnasFechaHora,
      notas: [
        exclusiones.length
          ? `${exclusiones.length === 1 ? "Se excluyó el envío" : "Se excluyeron los envíos"} ${exclusiones.map((x) => `ID ${x.id_respuesta}`).join(", ")} (ver la hoja «${HOJA_EXCLUIDOS}»).`
          : "No se excluyó ningún envío de este formulario.",
      ],
      filas: [enviado.encabezados, ...filas],
    });
    excluidas.push(...exclusiones.map((x) => [f.nombre, x.id_respuesta, x.motivo]));
  }

  // Las exclusiones sin ID (si el análisis las registrara) también se listan: el motivo es lo que importa.
  excluidas.push(...meta.exclusiones.filter((x) => x.id_respuesta === null).map((x) => [nombreFormularioDe(x.formulario, meta.formularios), null, x.motivo]));

  hojas.push({
    nombre: HOJA_EXCLUIDOS,
    titulo: HOJA_EXCLUIDOS,
    filas: [["Formulario", "ID", "Motivo"], ...excluidas],
  });
  return hojas;
}
