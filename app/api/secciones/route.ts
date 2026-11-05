import { NextResponse } from "next/server";
import { estaSeccionPublicada } from "@/repositories/seccionesRepository";
import { RUTA_POR_SECCION } from "@/constants/secciones";

/**
 * Qué secciones condicionales están publicadas. Lo consulta el menú lateral,
 * que es un componente de cliente y vive en el layout compartido por todo el
 * panel: si el layout leyera la base directamente, las páginas del panel
 * —hoy estáticas— pasarían todas a renderizarse en cada visita.
 *
 * Es solo para pintar o no un enlace. El control de acceso real lo hace cada
 * página en el servidor, así que este endpoint no expone nada: dice si una
 * sección está publicada, que es justamente lo que cualquiera vería al entrar.
 *
 * Recorre `RUTA_POR_SECCION`: una sección publicable nueva aparece aquí sola.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const secciones = Object.keys(RUTA_POR_SECCION);
  const estados = await Promise.all(secciones.map((seccion) => estaSeccionPublicada(seccion)));
  return NextResponse.json(Object.fromEntries(secciones.map((s, i) => [s, estados[i]])));
}
