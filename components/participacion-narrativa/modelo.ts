import type { RegistroParticipacion } from '@/types/participacion';
import type { ConvocatoriaDocumental } from '@/types/convocatoria-documental';
import { etiquetaRol, unidadRegionalDe, estandarizarUnidadRegional, SIN_ESPECIFICAR } from '@/lib/reglas/participacion';
export const formato = (n: number) => n.toLocaleString('es-CO');
export const porcentaje = (a: number, b: number) => (b ? a / b * 100 : 0).toLocaleString('es-CO', { maximumFractionDigits: 1 });
// Se ejecuta desde la página de servidor. El cliente recibe solo el resumen;
// el explorador conserva la única copia serializada del conjunto de registros.
export function crearNarrativa(registros: RegistroParticipacion[], documento: ConvocatoriaDocumental) {
const asistentes = documento.filas.reduce((s,r)=>s+r.asistentes,0);
const roles = new Map<string, number>(), fechas = new Map<string, number>();
for (const r of registros) {
    const rol = etiquetaRol(r.rol);
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
        grupos: contar(filas.map(r => {
            const rol = etiquetaRol(r.rol);
            return rol === 'TRABAJADOR' ? 'Administrativos · trabajador' : rol === 'PLANTA' ? 'Administrativos · planta' : rol;
        })),
        lugares: contar(filas.map(r => estandarizarUnidadRegional(r.lugarDesarrollo) || r.lugarDesarrollo?.trim() || SIN_ESPECIFICAR)),
        origenes: contar(filas.map(unidadRegionalDe)),
    };
});
const rolPrincipal = [...roles].sort((a, b) => b[1] - a[1])[0];
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
    grupos: contar(filas.map(r => {
        const rol = etiquetaRol(r.rol);
        return rol === 'TRABAJADOR' ? 'Administrativos · trabajador' : rol === 'PLANTA' ? 'Administrativos · planta' : rol;
    })),
    lugares: [{nombre:unidad,total:filas.length}],
    origenes: contar(filas.map(unidadRegionalDe)),
})).sort((a,b) => a.fechas[0].nombre.localeCompare(b.fechas[0].nombre) || a.unidad.localeCompare(b.unidad));
const resumen = { registros: registros.length, unidades: new Set(registros.map(unidadRegionalDe).filter(u => u !== SIN_ESPECIFICAR)).size, jornadas: jornadas.length, diferenciaCortes: registros.length - asistentes };
return {jornadas,jornadasRegionales,rolPrincipal,resumen,documento};
}
export type DatosNarrativos = ReturnType<typeof crearNarrativa>;
export const capitulos = [{ id: 'apertura', nombre: 'Participación' }, { id: 'atlas', nombre: 'Convocatoria y asistencia' }, { id: 'pulso', nombre: 'Jornadas' }, { id: 'seguimiento', nombre: 'Consulta de registros' }, { id: 'fuentes', nombre: 'Resumen y fuentes' }];
