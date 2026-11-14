import 'server-only';
import { join } from 'node:path';
import { leerPrimeraHoja } from './infrastructure/excel';
import { CacheArchivo } from './infrastructure/cache-archivo';
import type { ConvocatoriaDocumental, ConvocatoriaDocumentalDataSource } from '@/types/convocatoria-documental';
export class ExcelConvocatoriaDataSource implements ConvocatoriaDocumentalDataSource {
  private ruta = join(process.cwd(),'data','source-participacion-documental','convocatoria.csv');
  private rutaRoles = join(process.cwd(),'data','source-participacion-documental','convocatoria-roles.csv');
  private cache = new CacheArchivo([this.ruta,this.rutaRoles], (): ConvocatoriaDocumental => {
    const filas = leerPrimeraHoja(this.ruta).slice(1);
    const roles = leerPrimeraHoja(this.rutaRoles).slice(1);
    if (!filas.length) throw new Error('Falta la fuente documental de convocatoria');
    if (roles.some(r => !filas.some(f => String(f[0]) === String(r[0])))) throw new Error('Unidad sin convocatoria regional');
    return {
      filas: filas.map(r => {
        const convocados=Number(r[1]), asistentes=Number(r[2]);
        if (!Number.isInteger(convocados)||!Number.isInteger(asistentes)||convocados<=0||asistentes<0) throw new Error('Conteos documentales no válidos');
        const porRol = roles.filter(f => String(f[0]) === String(r[0])).map(f => ({rol:String(f[1]),convocados:Number(f[2])}));
        if (new Set(porRol.map(f => f.rol)).size !== porRol.length || porRol.some(f => !f.rol || !Number.isSafeInteger(f.convocados) || f.convocados < 0) || porRol.reduce((s,f) => s + f.convocados,0) !== convocados) throw new Error('La convocatoria por rol no coincide con el total regional');
        return {unidad:String(r[0]),convocados,asistentes,porcentajePublicado:String(r[3]),roles:porRol};
      }),fuente:new Set(filas.map(r => String(r[4]))).size > 1 ? 'Presentaciones resumidas por unidad regional' : String(filas[0][4]).split(/[\\/]/).pop()!,diapositiva:Number(filas[0][5]),sha256:String(filas[0][6]),
    };
  });
  obtener(){return this.cache.obtener()}
}
