"use client";

import { useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AVISO_ANONIMATO, slugDeRuta } from "@/lib/reglas/descargas";
import { NAVEGACION } from "@/constants/navegacion";

/**
 * La opción de descargar las respuestas de la sección en Excel, al final de
 * cada página.
 *
 * Se pide con `fetch` y no con un enlace directo para poder decir en la misma
 * página por qué no se descargó (límite alcanzado, sección retirada): con un
 * enlace, un error dejaría a la persona en una pantalla de texto suelto fuera
 * del sitio.
 */
export function DescargaExcel({ ruta }: { ruta: string }) {
  // El nombre y el identificador salen del menú: una sección nueva no necesita
  // repetirlos aquí.
  const seccion = slugDeRuta(ruta);
  const titulo = NAVEGACION.find((item) => item.href === ruta)?.etiqueta ?? ruta;
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setDescargando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/descargas/${seccion}`);
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json().catch(() => null)) as { motivo?: string } | null;
        setError(cuerpo?.motivo ?? "No se pudo descargar el archivo. Inténtalo de nuevo más tarde.");
        return;
      }
      const archivo =
        respuesta.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `${seccion}.xlsx`;
      const url = URL.createObjectURL(await respuesta.blob());
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = archivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      // Se libera después: WebKit cancela la descarga si la URL se revoca en el mismo turno.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("No se pudo descargar el archivo: revisa la conexión e inténtalo de nuevo.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheet className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold text-foreground">Descargar los datos de esta sección</p>
            <p className="text-xs text-muted-foreground">
              Excel con las respuestas de «{titulo}». {AVISO_ANONIMATO}
            </p>
          </div>
          <Button type="button" onClick={descargar} disabled={descargando} className="shrink-0">
            {descargando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {descargando ? "Generando…" : "Descargar Excel"}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
