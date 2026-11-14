import type { RegistroParticipacion } from '@/types/participacion';
import type { ConvocatoriaDocumental } from '@/types/convocatoria-documental';
import { etiquetaRol, unidadRegionalDe, estandarizarUnidadRegional, SIN_ESPECIFICAR } from '@/lib/reglas/participacion';
import { normalizar } from '@/lib/reglas/momento4';
export const formato = (n: number) => n.toLocaleString('es-CO');
export const porcentaje = (a: number, b: number) => (b ? a / b * 100 : 0).toLocaleString('es-CO', { maximumFractionDigits: 1 });
/** Compatibilidad con títulos editados antes de separar el conteo de su etiqueta. */
export const etiquetaJornadasSinConteo=(texto:string)=>texto.replace(/^\s*\d+[.,\d]*\s+(?=jornadas\b)/i,'').trim();
export function rolDeConvocatoria(rol: string | null) {
    const nombre = normalizar(etiquetaRol(rol));
    if (nombre === 'TRABAJADOR' || nombre === 'PLANTA' || nombre.startsWith('ADMINISTRATIVO')) return 'ADMINISTRATIVOS';
    return nombre;
}
/** Agrupa las modalidades administrativas sin modificar el rol de origen. */
export function grupoDeInteres(rol: string | null) {
    return rolDeConvocatoria(rol) === 'ADMINISTRATIVOS' ? 'Administrativos' : etiquetaRol(rol);
}
export function compararRoles(registros: RegistroParticipacion[], convocatorias: ConvocatoriaDocumental['filas']) {
    const grupos = new Map<string, {nombre:string;convocados:number|null;asistentes:number}>();
    for (const unidad of convocatorias) for (const rol of unidad.roles) {
        const nombre = rolDeConvocatoria(rol.rol);
        const grupo = grupos.get(nombre) ?? {nombre:grupoDeInteres(rol.rol),convocados:0,asistentes:0};
        grupo.convocados! += rol.convocados;
        grupos.set(nombre,grupo);
    }
    for (const registro of registros) {
        const clave = rolDeConvocatoria(registro.rol);
        const grupo = grupos.get(clave) ?? {nombre:grupoDeInteres(registro.rol),convocados:null,asistentes:0};
        grupo.asistentes++;
        grupos.set(clave,grupo);
    }
    return [...grupos.values()].map(grupo => ({...grupo,
        porcentajeAsistencia:grupo.convocados ? grupo.asistentes / grupo.convocados * 100 : null,
        porcentajeParticipacion:registros.length ? grupo.asistentes / registros.length * 100 : 0,
    }));
}
// Se ejecuta desde la página de servidor. El cliente recibe solo el resumen;
// el explorador conserva la única copia serializada del conjunto de registros.
export function crearNarrativa(registros: RegistroParticipacion[], documento: ConvocatoriaDocumental) {
// La convocatoria procede de los documentos; la asistencia siempre se calcula
// con los mismos registros de PostgreSQL que alimentan el explorador.
const filasActuales = documento.filas.map(fila => ({...fila,asistentes:registros.filter(r => estandarizarUnidadRegional(r.lugarDesarrollo) === estandarizarUnidadRegional(fila.unidad)).length}));
const unidadesAdicionales = [...new Set(registros.map(r => estandarizarUnidadRegional(r.lugarDesarrollo) || r.lugarDesarrollo?.trim() || SIN_ESPECIFICAR))]
    .filter(unidad => !documento.filas.some(f => estandarizarUnidadRegional(f.unidad) === unidad));
const comparacionPorUnidad = filasActuales.map(fila => ({unidad:fila.unidad,roles:compararRoles(registros.filter(r => estandarizarUnidadRegional(r.lugarDesarrollo) === estandarizarUnidadRegional(fila.unidad)),[fila])}));
const comparacionRoles = compararRoles(registros.filter(r => documento.filas.some(f => estandarizarUnidadRegional(r.lugarDesarrollo) === estandarizarUnidadRegional(f.unidad))),documento.filas);
documento = {...documento,filas:filasActuales};
const asistentes = documento.filas.reduce((s,r)=>s+r.asistentes,0);
const roles = new Map<string, number>(), fechas = new Map<string, number>();
for (const r of registros) {
    const rol = grupoDeInteres(r.rol);
    roles.set(rol, (roles.get(rol) || 0) + 1);
    if (r.fechaInicio)
        fechas.set(r.fechaInicio, (fechas.get(r.fechaInicio) || 0) + 1);
}
const contar = (valores: string[]) => [...valores.reduce((mapa, valor) => mapa.set(valor, (mapa.get(valor) || 0) + 1), new Map<string, number>())]
    .map(([nombre, total]) => ({nombre, total})).sort((a, b) => b.total - a.total);
const jornadas = [...fechas].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, total]) => {
    const filas = registros.filter(r => r.fechaInicio === fecha);
    return {
        fecha, total,
        grupos: contar(filas.map(r => grupoDeInteres(r.rol))),
        lugares: contar(filas.map(r => estandarizarUnidadRegional(r.lugarDesarrollo) || r.lugarDesarrollo?.trim() || SIN_ESPECIFICAR)),
        origenes: contar(filas.map(unidadRegionalDe)),
    };
});
const rolPrincipal = [...roles].sort((a, b) => b[1] - a[1])[0] ?? [SIN_ESPECIFICAR,0] as [string,number];
// El lugar del encuentro no es necesariamente la unidad de origen del asistente.
const porLugar = new Map<string, RegistroParticipacion[]>();
for (const registro of registros) {
    const lugar = estandarizarUnidadRegional(registro.lugarDesarrollo) || registro.lugarDesarrollo?.trim() || SIN_ESPECIFICAR;
    const filas = porLugar.get(lugar) ?? [];
    filas.push(registro);
    porLugar.set(lugar, filas);
}
const jornadasRegionales = [...porLugar].map(([unidad, filas]) => ({
    unidad,
    total: filas.length,
    fechas: contar(filas.map(r => r.fechaInicio || 'Sin fecha registrada')).sort((a,b) => a.nombre.localeCompare(b.nombre)),
    grupos: contar(filas.map(r => grupoDeInteres(r.rol))),
    lugares: [{nombre:unidad,total:filas.length}],
    origenes: contar(filas.map(unidadRegionalDe)),
    comparacionRoles: compararRoles(filas,documento.filas.filter(f => estandarizarUnidadRegional(f.unidad) === unidad)),
})).sort((a,b) => a.fechas[0].nombre.localeCompare(b.fechas[0].nombre) || a.unidad.localeCompare(b.unidad));
const resumen = { registros: registros.length, unidades: new Set(registros.map(unidadRegionalDe).filter(u => u !== SIN_ESPECIFICAR)).size, jornadas: jornadas.length, diferenciaCortes: registros.length - asistentes };
return {jornadas,jornadasRegionales,rolPrincipal,resumen,documento,comparacionRoles,comparacionPorUnidad,unidadesAdicionales};
}
export type DatosNarrativos = ReturnType<typeof crearNarrativa>;
export const capitulos = [{ id: 'apertura', nombre: 'Participación' }, { id: 'atlas', nombre: 'Convocatoria y asistencia' }, { id: 'pulso', nombre: 'Jornadas' }, { id: 'seguimiento', nombre: 'Consulta de registros' }, { id: 'fuentes', nombre: 'Resumen y fuentes' }];
