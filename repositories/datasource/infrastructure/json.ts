import { readFileSync } from "node:fs";

/**
 * Única puerta a los archivos .json de `data/source-*` (ver docs/decisions/0003),
 * igual que `excel.ts` lo es a los .xlsx: que la lectura esté en un solo sitio
 * garantiza que el BOM y la codificación se traten igual en todo el proyecto.
 *
 * Como `excel.ts`, no declara "server-only" para que los scripts de
 * mantenimiento puedan leer el archivo igual que el sitio; los orígenes que lo
 * consumen sí lo declaran.
 */
export function leerJson(ruta: string): unknown {
  // Un BOM al inicio (frecuente si el archivo pasa por un editor de Windows) rompe JSON.parse.
  return JSON.parse(readFileSync(ruta, "utf8").replace(/^﻿/, ""));
}
