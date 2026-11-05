import { NextResponse } from "next/server";
import { generarDescarga } from "@/repositories/descargasRepository";

/**
 * Descarga en Excel de una sección del panel. Público: el control está dentro
 * de `generarDescarga` —sección de la lista cerrada, publicada, límites por
 * visitante y global, copia en memoria y registro de cada petición—.
 *
 * Se responde con `no-store` a propósito: si el CDN de Vercel guardara el
 * archivo, las descargas siguientes no pasarían por aquí, y ni el límite ni el
 * registro las verían.
 */
export const dynamic = "force-dynamic";

/** Margen de sobra: la más pesada se genera en menos de un segundo. */
export const maxDuration = 30;

/** Primera IP de `x-forwarded-for` (la del visitante en Vercel); "local" en el portable. */
function ipVisitante(peticion: Request): string {
  return (
    peticion.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    peticion.headers.get("x-real-ip") ||
    "local"
  );
}

export async function GET(peticion: Request, { params }: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await params;
  const resultado = await generarDescarga(seccion, ipVisitante(peticion));

  if (!resultado.ok) {
    return NextResponse.json(
      { motivo: resultado.motivo },
      {
        status: resultado.estado,
        headers: {
          "Cache-Control": "no-store",
          ...(resultado.reintentarEnSegundos
            ? { "Retry-After": String(resultado.reintentarEnSegundos) }
            : {}),
        },
      }
    );
  }

  return new NextResponse(new Uint8Array(resultado.contenido), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${resultado.archivo}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
