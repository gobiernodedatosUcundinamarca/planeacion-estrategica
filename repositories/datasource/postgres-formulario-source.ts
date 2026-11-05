import "server-only";
import type { DocumentoFormulario, ResultadoCargueFormulario } from "@/types/formularios";
import type { FormularioDataSource } from "./types";
import { conexionSql } from "./infrastructure/neon";
import type { DefinicionFormulario } from "./formularios-definicion";
import {
  actualizarFormulario,
  consultarDocumentoFormulario,
  consultarRespuestasFormulario,
  eliminarFormulario,
  guardarFormulario,
} from "./formulario-almacen";

/**
 * Un formulario de Forms guardado en Postgres (Neon). Fachada delgada, igual
 * que las demás `postgres-*-source.ts`: la lógica vive en
 * `formulario-almacen.ts`, y cada formulario solo aporta su definición y cómo
 * se ve una respuesta suya.
 */
export class PostgresFormularioDataSource<C extends string, R>
  implements FormularioDataSource<R>
{
  constructor(
    private readonly definicion: DefinicionFormulario<C>,
    private readonly aRespuesta: (registro: {
      id: number;
      fechaRespuesta: string | null;
      valores: Record<C, string | null>;
    }) => R
  ) {}

  getDocumento(): Promise<DocumentoFormulario | null> {
    return consultarDocumentoFormulario(conexionSql(), this.definicion);
  }

  async getRespuestas(): Promise<R[]> {
    const registros = await consultarRespuestasFormulario(conexionSql(), this.definicion);
    return registros.map(this.aRespuesta);
  }

  guardar(nombreOriginal: string, contenido: Buffer): Promise<ResultadoCargueFormulario> {
    return guardarFormulario(conexionSql(), this.definicion, nombreOriginal, contenido);
  }

  actualizar(nombreOriginal: string, contenido: Buffer): Promise<ResultadoCargueFormulario> {
    return actualizarFormulario(conexionSql(), this.definicion, nombreOriginal, contenido);
  }

  eliminar(): Promise<number> {
    return eliminarFormulario(conexionSql(), this.definicion);
  }
}
