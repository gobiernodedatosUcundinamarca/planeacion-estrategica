'use client';
import { TextoEditorial } from './texto-editorial';
import { idEtiquetaFiltro } from '@/lib/editorial/etiquetas-filtros';

/** Edita el enunciado, sin modificar las claves o valores usados por el filtro. */
export function EtiquetaFiltroEditable({ambito,texto}:{ambito:string;texto:string}) {
  return <TextoEditorial id={idEtiquetaFiltro(ambito,texto)} original={texto}/>;
}
