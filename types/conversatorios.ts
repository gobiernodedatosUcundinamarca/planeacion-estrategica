export interface GrupoConversatorio {
  nombre: string;
  planteamientos: string[];
}
export interface SolicitudConversatorio {
  referencia: string;
  titulo: string;
  ambito: string;
  descripcion: string;
}
export interface DiapositivaConversatorio {
  numero: number;
  titulo: string;
  descripcion: string;
  grupos: GrupoConversatorio[];
  solicitudes: SolicitudConversatorio[];
  notas: string[];
  pie: string;
}
export interface DocumentoConversatorio {
  archivo: string;
  unidad: string;
  general: boolean;
  sha256: string;
  diapositivas: DiapositivaConversatorio[];
}
