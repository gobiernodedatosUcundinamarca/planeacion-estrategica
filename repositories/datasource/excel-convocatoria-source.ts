import 'server-only';
import { join } from 'node:path';
import { leerPrimeraHoja } from './infrastructure/excel';
import { CacheArchivo } from './infrastructure/cache-archivo';
import type { ConvocatoriaDocumental, ConvocatoriaDocumentalDataSource } from '@/types/convocatoria-documental';
export class ExcelConvocatoriaDataSource implements ConvocatoriaDocumentalDataSource {
  private ruta = join(process.cwd(),'data','source-participacion-documental','convocatoria.csv');
  private cache = new CacheArchivo([this.ruta], (): ConvocatoriaDocumental => {
    const filas = leerPrimeraHoja(this.ruta).slice(1);
    if (!filas.length) throw new Error('Falta la fuente documental de convocatoria');
    return {
      filas: filas.map(r => {
        const convocados=Number(r[1]), asistentes=Number(r[2]);
        if (!Number.isInteger(convocados)||!Number.isInteger(asistentes)||convocados<=0||asistentes<0) throw new Error('Conteos documentales no válidos');
        return {unidad:String(r[0]),convocados,asistentes,porcentajePublicado:String(r[3])};
      }),fuente:new Set(filas.map(r => String(r[4]))).size > 1 ? 'Presentaciones resumidas por unidad regional' : String(filas[0][4]).split(/[\\/]/).pop()!,diapositiva:Number(filas[0][5]),sha256:String(filas[0][6]),
    };
  });
  obtener(){return this.cache.obtener()}
}
