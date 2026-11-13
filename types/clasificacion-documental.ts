export type EstadoClasificacionDocumental =
  | "con_temas"
  | "sin_tema"
  | "sin_contenido_revisado"
  | "excluido_preparacion"
  | "texto_modificado";

export interface FuenteClasificacionDocumental {
  archivo: string;
  sha256: string;
  hoja: string | null;
  fila: number | null;
  version: string;
  taxonomia: string | null;
  sha256Taxonomia: string | null;
}

export interface TemaDocumental {
  id: string;
  idOriginal?: string;
  codigo: string;
  nombre: string;
  componente: string;
  otrosComponentes: string[];
  criterio: string;
  exclusion: string;
  justificacion: string;
  probabilidad: number | null;
  afinidad?: number | null;
  ambito?: string;
  referencia?: FuenteClasificacionDocumental;
}

export interface ClasificacionDocumental {
  idRespuesta: number;
  estado: EstadoClasificacionDocumental;
  motivo: string | null;
  fuente: FuenteClasificacionDocumental;
  temas: TemaDocumental[];
}

export interface ResultadoClasificacionDocumental {
  disponible: boolean;
  comentarios: ClasificacionDocumental[];
}

/** Catálogos compartidos para no enviar criterios y hashes repetidos por comentario. */
export interface ClasificacionDocumentalCompacta {
  disponible: boolean;
  fuentes: Omit<FuenteClasificacionDocumental, "hoja" | "fila">[];
  temas: Omit<TemaDocumental, "probabilidad" | "afinidad" | "referencia">[];
  comentarios: {
    idRespuesta: number;
    estado: EstadoClasificacionDocumental;
    motivo: string | null;
    fuente: number;
    hoja: string | null;
    fila: number | null;
    temas: { tema: number; probabilidad: number | null; afinidad?: number | null; referencia?: { fuente: number; hoja: string | null; fila: number | null } }[];
  }[];
}

export type MetodoClasificacion = "aportes-plan" | "bert-regional" | "bert-conjunto" | "jev-ejercicio" | "bert-jev-unidad";

export interface ResumenFuentesClasificacion {
  disponibles: { metodo: MetodoClasificacion; comentarios: number }[];
  porComentario: Record<number, MetodoClasificacion[]>;
}
