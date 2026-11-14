import { resolve } from 'node:path';
import { conexionSql } from '@/repositories/datasource/infrastructure/neon';
import { leerPrimeraHoja } from '@/repositories/datasource/infrastructure/excel';
import { construirConvocatoria } from '@/repositories/datasource/convocatoria-formato';
import { cargarEntorno } from './entorno';

async function main() {
  cargarEntorno();
  const regionales=leerPrimeraHoja(resolve('data/source-participacion-documental/convocatoria.csv')).slice(1);
  const roles=leerPrimeraHoja(resolve('data/source-participacion-documental/convocatoria-roles.csv')).slice(1);
  const filas=roles.map(r=>{
    const fuente=regionales.find(f=>f[0]===r[0]);
    if (!fuente) throw Error('Unidad sin fuente documental.');
    return {unidad:String(r[0]),rol:String(r[1]),convocados:Number(r[2]),fuente:String(fuente[4]),diapositiva:Number(fuente[5]),sha256:String(fuente[6])};
  });
  const validada=construirConvocatoria(filas);
  if (validada.filas.length!==regionales.length || regionales.some(r=>validada.filas.find(f=>f.unidad===r[0])?.convocados!==Number(r[1]))) throw Error('Los subtotales no coinciden con la convocatoria documental.');
  const sql=conexionSql({directa:true});
  await sql`create table if not exists participacion_convocatoria (
    unidad text not null,rol text not null,convocados integer not null check(convocados>=0),
    fuente text not null,diapositiva integer not null,sha256 text not null,
    primary key(unidad,rol)
  )`;
  await sql`insert into participacion_convocatoria (unidad,rol,convocados,fuente,diapositiva,sha256)
    select unidad,rol,convocados,fuente,diapositiva,sha256
    from jsonb_to_recordset(${JSON.stringify(filas)}::jsonb) as f(unidad text,rol text,convocados integer,fuente text,diapositiva integer,sha256 text)
    on conflict(unidad,rol) do nothing`;
  console.log('Convocatoria por rol preparada. Se conservaron los valores que ya existían en la base.');
}
main().catch(()=>{console.error('No se pudo preparar la convocatoria. Revisa las fuentes y la conexión de destino.');process.exitCode=1;});
