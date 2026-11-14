import type { DiapositivaConversatorio } from '@/types/conversatorios';

/** Contrato de las diapositivas oficiales; no interpreta ni resume sus afirmaciones. */
export function interpretarConversatorio(textos: string[], numero: number): DiapositivaConversatorio | null {
  const inicio = textos.findIndex(t => /^Conversatorio con el Rector\s*[–—-]/i.test(t));
  if (inicio < 0) return null;
  const contenido = textos.slice(inicio + 2, -1);
  const salida: DiapositivaConversatorio = {
    numero, titulo: textos[inicio], descripcion: textos[inicio + 1],
    grupos: [], solicitudes: [], notas: [], pie: textos.at(-1) ?? '',
  };
  if (/lo que dijo cada grupo/i.test(salida.titulo)) {
    for (const texto of contenido) {
      if (texto.startsWith('•')) {
        const grupo = salida.grupos.at(-1);
        if (!grupo) throw Error('Planteamiento sin grupo en la diapositiva ' + numero);
        grupo.planteamientos.push(texto.replace(/^•\s*/, ''));
      } else salida.grupos.push({ nombre: texto, planteamientos: [] });
    }
    if (!salida.grupos.length || salida.grupos.some(g => !g.planteamientos.length)) throw Error('Estructura de grupos no reconocida');
  } else if (/solicitudes estratégicas/i.test(salida.titulo)) {
    for (let i = 0; i < contenido.length;) {
      if (/^\d+$/.test(contenido[i])) {
        if (i + 3 >= contenido.length) throw Error('Solicitud incompleta');
        salida.solicitudes.push({ referencia: contenido[i], titulo: contenido[i + 1], ambito: contenido[i + 2], descripcion: contenido[i + 3] });
        i += 4;
      } else salida.notas.push(contenido[i++]);
    }
    if (!salida.solicitudes.length) throw Error('No se reconocieron las solicitudes');
  } else throw Error('Tipo de diapositiva de conversatorios no reconocido');
  return salida;
}

/** Conserva el contexto del encuentro compartido en el texto, agrupando por actor. */
export const actorConversatorio = (nombre: string) => nombre.split(' · ')[0];
