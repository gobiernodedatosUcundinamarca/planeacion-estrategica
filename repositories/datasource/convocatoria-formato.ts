import type { ConvocatoriaDocumental } from '@/types/convocatoria-documental';

export function construirConvocatoria(entrada:Record<string,unknown>[]):ConvocatoriaDocumental {
  if (!entrada.length) throw Error('No hay convocatoria por rol cargada.');
  const unidades=new Map<string,ConvocatoriaDocumental['filas'][number]>();
  for (const fila of entrada) {
    const unidad=String(fila.unidad??'').trim(),rol=String(fila.rol??'').trim(),convocados=Number(fila.convocados);
    if (!unidad || !rol || fila.convocados === null || !Number.isSafeInteger(convocados) || convocados<0) throw Error('Convocatoria por rol no válida.');
    const grupo=unidades.get(unidad)??{unidad,convocados:0,asistentes:0,porcentajePublicado:'No publicado',roles:[]};
    if (grupo.roles.some(r=>r.rol===rol)) throw Error('Rol duplicado en la convocatoria regional.');
    grupo.roles.push({rol,convocados});grupo.convocados+=convocados;unidades.set(unidad,grupo);
  }
  const diapositiva=Number(entrada[0].diapositiva);
  if (!Number.isSafeInteger(diapositiva) || diapositiva<1) throw Error('Referencia documental no válida.');
  return {filas:[...unidades.values()],fuente:'Convocatoria por rol registrada a partir de las presentaciones regionales',diapositiva,sha256:[...new Set(entrada.map(f=>String(f.sha256??'')))].join(',')};
}
