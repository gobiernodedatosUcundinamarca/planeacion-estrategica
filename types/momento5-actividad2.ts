/**
 * Actividad 2 del Momento 5 (17 de noviembre de 2026): cuatro instrumentos
 * trabajados por mesas (Mesa N = Equipo N del Momento 5) y en Mentimeter.
 * Las fichas llegaron en .pptx, .pdf, .txt e imágenes, y se transcribieron
 * literalmente a `data/source-momento5-actividad2/actividad2.xlsx`
 * (docs/decisions/0005). Las preguntas y los enunciados vienen en los datos,
 * como encabezados de columna, para mostrarlos tal como se vieron.
 */

export type InstrumentoActividad2Id = "pregunta-inicial" | "reto1" | "reto2" | "aprendizajes";

export interface InstrumentoActividad2 {
  id: InstrumentoActividad2Id;
  /** «Instrumento 1», «Instrumento 2»… */
  instrumento: string;
  /** Nombre del instrumento, sin el número: «Pregunta inicial». */
  nombre: string;
  /** «Mentimeter» o «Ficha por mesa». */
  medio: string;
  fecha: string;
}

/** Una respuesta de la ficha del Reto 1: el enunciado tal como lo trae la ficha y lo que escribió la mesa. */
export interface RespuestaFicha {
  pregunta: string;
  texto: string | null;
}

export interface MesaActividad2 {
  mesa: number;
  /** Nombre de la transformación tal como la nombra la ficha («UC Inteligente»…). */
  transformacion: string;
  nombreEquipo: string | null;
  integrantes: string | null;
  /** Solo si la mesa respondió «¿Qué resultado de la transformación seleccionamos?». */
  resultado: RespuestaFicha;
  /** «¿Qué cambio esperamos observar?», «¿En quién o en qué se manifiesta?» y «¿Cómo sabremos que ocurrió?», en ese orden. */
  respuestas: RespuestaFicha[];
  /** «Mensaje de cierre para tus colegas:». */
  cierre: RespuestaFicha;
  archivo: string;
}

export interface IndicadorActividad2 {
  mesa: number;
  orden: number;
  indicador: string;
  formula: string | null;
  desagregacion: string | null;
  medio: string | null;
  periodicidad: string | null;
  responsable: string | null;
  /** Texto de la mesa que acompaña al indicador sin ser uno de sus campos. */
  adicional: string | null;
  /** De qué parte de la ficha sale (la tabla o una respuesta). */
  origen: string | null;
}

/** Un elemento de un registro del Reto 2, con su rótulo tal como lo trae la ficha. */
export interface ElementoReto2 {
  elemento: string;
  texto: string | null;
}

export interface RegistroReto2 {
  registro: number;
  mesaQueRegistra: number;
  mesaRevisada: number | null;
  transformacion: string | null;
  /** Encabezado de la ficha: «Transformación: UC Inteligente · Mesa 2 revisa a Mesa 1». */
  encabezado: string | null;
  /** Nombre de quien lo registró, cuando el archivo lo dice. */
  registradoPor: string | null;
  elementos: ElementoReto2[];
  archivo: string;
}

export interface FraseNube {
  frase: string;
  /** Tamaño en la imagen de Mentimeter: 3 la más grande, 2 mediana, 1 pequeña. No es un conteo. */
  tamano: number;
}

export interface NubeActividad2 {
  instrumento: InstrumentoActividad2Id;
  pregunta: string;
  frases: FraseNube[];
  /** Frases transcritas que no se muestran, con el motivo. */
  omitidas: { frase: string; motivo: string }[];
}

/** Un archivo recibido y cómo se usó: deja a la vista qué versión se publica y quién guardó cada una. */
export interface ArchivoActividad2 {
  archivo: string;
  carpeta: string;
  mesa: number | null;
  guardadoPor: string | null;
  /** «aaaa-mm-dd hh:mm», hora de Colombia, según las propiedades del archivo. */
  guardadoEl: string | null;
  uso: string;
  nota: string | null;
}

export interface Actividad2Momento5 {
  instrumentos: InstrumentoActividad2[];
  /** Enunciados de un instrumento que no son preguntas de la ficha («Pregunta base: …»). */
  enunciados: { instrumento: InstrumentoActividad2Id; enunciado: string }[];
  /** Encabezados de la tabla «Indicadores propuestos», tal como los trae la ficha. */
  encabezadosIndicadores: {
    indicador: string;
    formula: string;
    desagregacion: string;
    medio: string;
    periodicidad: string;
    responsable: string;
  };
  mesas: MesaActividad2[];
  indicadores: IndicadorActividad2[];
  reto2: RegistroReto2[];
  nubes: NubeActividad2[];
  archivos: ArchivoActividad2[];
}
