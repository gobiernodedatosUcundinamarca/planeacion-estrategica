import "server-only";
import type { NotaMetodologica } from "@/types/nota-metodologica";
import { getNotaMetodologicaDataSource } from "./datasource";

/** Única puerta a los datos de la sección «Nota metodológica: muestreo». */
export function getNotaMetodologica(): NotaMetodologica {
  return getNotaMetodologicaDataSource().getNotaMetodologica();
}
