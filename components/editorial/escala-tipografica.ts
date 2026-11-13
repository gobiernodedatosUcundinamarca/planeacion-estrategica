export const CLAVE_TAMANOS = 'planeacion-tamanos-generales-v3';
export const CLAVE_TAMANOS_ANTERIOR = 'planeacion-tamanos-generales-v2';
export const ESCALA_MINIMA = 25;
export const ESCALA_MAXIMA = 250;

export const CATEGORIAS = [
  { id: 'titulos', nombre: 'Títulos', referenciaAnterior: 48, selector: 'main h1,main h1 .texto-editorial,main h1 em' },
  { id: 'subtitulos', nombre: 'Subtítulos y encabezados', referenciaAnterior: 28, selector: 'main h2,main h3,main h4,main h5,main h6,main [data-slot=card-title],.ventana-respuestas h2,.ventana-respuestas h3' },
  { id: 'textos', nombre: 'Textos generales', referenciaAnterior: 16, selector: 'main p,main li,main td,main dd,.ventana-respuestas p,.detalle-jornada-tooltip p,.detalle-jornada-tooltip li' },
  { id: 'notas', nombre: 'Etiquetas y notas', referenciaAnterior: 14, selector: 'main label,main small,main caption,main th,main .pie-fuente,main .leyenda,main .leyenda-jornadas,main .unidad-jornada,main time,main .folio,main .respuestas-originales header>span,.ventana-respuestas label,.ventana-conteo,.ventana-lista li header>span' },
  { id: 'controles', nombre: 'Botones y menús', referenciaAnterior: 15, selector: '#app-frame button:not(.control-edicion):not(.lapiz-editorial),#app-frame select,#app-frame input,#app-frame summary,#app-frame nav a,#app-frame nav a span,[data-slot=select-item]' },
] as const;

export type Categoria = typeof CATEGORIAS[number]['id'];
export type Ajustes = Partial<Record<Categoria, number>>;

export function esEscalaValida(valor: number) {
  return Number.isInteger(valor) && valor >= ESCALA_MINIMA && valor <= ESCALA_MAXIMA;
}

export function interpretarAjustes(actuales: string | null, anteriores: string | null): Ajustes {
  try {
    const datos = JSON.parse(actuales ?? anteriores ?? '{}');
    const ajustes: Ajustes = {};
    for (const categoria of CATEGORIAS) {
      const valor = datos?.[categoria.id];
      if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) continue;
      // Los valores antiguos eran referencias nominales, no el tamaño real del diseño.
      const escala = actuales === null ? Math.round(valor / categoria.referenciaAnterior * 100) : valor;
      if (esEscalaValida(escala) && escala !== 100) ajustes[categoria.id] = escala;
    }
    return ajustes;
  } catch {
    return {};
  }
}
