import { NextResponse } from "next/server";
import { ZONA_HORARIA } from "@/constants/admin";
import { generarExcelParticipacion } from "@/repositories/participacionRepository";
import { tieneAccesoAdmin } from "../../sesion";

/**
 * Descarga de la asistencia de Participación en .xlsx. Es un route handler y no
 * una server action porque lo que devuelve es un archivo: el navegador lo baja
 * con su propio gestor de descargas, sin pasar el contenido por JavaScript.
 *
 * El archivo trae la cédula, así que la sesión se comprueba aquí mismo: que el
 * botón solo aparezca dentro de /admin no protege nada, porque esta URL se
 * puede pedir directamente.
 */
export const dynamic = "force-dynamic";

export async function GET(peticion: Request) {
  if (!(await tieneAccesoAdmin())) {
    // Sesión vencida o inexistente: de vuelta a /admin, que pide el PIN, en vez
    // de un error sin explicación.
    return NextResponse.redirect(new URL("/admin", peticion.url), 303);
  }

  let contenido: Buffer;
  try {
    contenido = await generarExcelParticipacion();
  } catch (fallo) {
    return new NextResponse(
      `No se pudo generar el Excel de Participación: ${fallo instanceof Error ? fallo.message : "error desconocido"}. Vuelve a /admin e inténtalo de nuevo.`,
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  // "en-CA" da la fecha como aaaa-mm-dd, que ordena bien en una carpeta.
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date());

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="participacion-${hoy}.xlsx"`,
      // Datos personales: ni el navegador ni un proxy intermedio deben guardar copia.
      "Cache-Control": "no-store",
    },
  });
}
