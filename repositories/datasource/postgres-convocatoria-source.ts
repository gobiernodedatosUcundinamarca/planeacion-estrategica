import 'server-only';
import { conexionSql } from './infrastructure/neon';
import { construirConvocatoria } from './convocatoria-formato';
import type { ConvocatoriaDocumentalDataSource } from '@/types/convocatoria-documental';

/** La fuente documental permite leer despliegues que aún no tengan la tabla. */
export class PostgresConvocatoriaDataSource implements ConvocatoriaDocumentalDataSource {
  constructor(private referencia:ConvocatoriaDocumentalDataSource) {}
  async obtener() {
    const sql=conexionSql();
    const [tabla]=await sql`select to_regclass('public.participacion_convocatoria') as nombre`;
    if (!tabla.nombre) return this.referencia.obtener();
    const filas=await sql`select unidad,rol,convocados,fuente,diapositiva,sha256 from participacion_convocatoria order by unidad,rol`;
    // Una tabla existente pero vacía o inválida es un error: no se sustituyen
    // correcciones de la base por una copia documental silenciosamente.
    return construirConvocatoria(filas);
  }
}
