import { NextResponse } from "next/server";
import { getClasificacionDocumental } from "@/repositories/momento4Repository";
import { estaSeccionPublicada } from "@/repositories/seccionesRepository";
import { SECCION_TRANSFORMACIONES } from "@/constants/secciones";
import { esMetodoClasificacion } from "@/lib/reglas/fuentes-clasificacion";
import { compactarClasificacion } from "@/lib/reglas/navegacion-comentarios";
import { responderDatos,versionarDatos } from '@/lib/datos-versionados';

export const dynamic = "force-dynamic";

export async function GET(peticion: Request) {
  const metodo = new URL(peticion.url).searchParams.get("metodo") ?? "aportes-plan";
  if (!esMetodoClasificacion(metodo)) return NextResponse.json({ error: "Fuente de clasificación no válida." }, { status: 400 });
  try {
    if (!await estaSeccionPublicada(SECCION_TRANSFORMACIONES)) return NextResponse.json({ error: "Sección no disponible." }, { status: 404 });
    const resultado = await getClasificacionDocumental(metodo);
    return responderDatos(peticion,versionarDatos(compactarClasificacion(resultado)));
  } catch {
    return NextResponse.json({ error: "No se pudo consultar la clasificación documental." }, { status: 503 });
  }
}
