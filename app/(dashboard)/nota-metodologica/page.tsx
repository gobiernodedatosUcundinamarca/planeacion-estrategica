import "@/components/nota-metodologica/nota-metodologica.css";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { DescargaExcel } from "@/components/layout/descarga-excel";
import { NotaMetodologicaPanel } from "@/components/nota-metodologica/nota-metodologica";
import { getNotaMetodologica } from "@/repositories/notaMetodologicaRepository";
import { TITULO_NOTA_METODOLOGICA } from "@/lib/reglas/nota-metodologica";
import type { NotaMetodologica } from "@/types/nota-metodologica";

export const metadata: Metadata = { title: TITULO_NOTA_METODOLOGICA };

/**
 * Nota metodológica del muestreo de las mesas de diálogo. Lee en vivo el Excel
 * del diseño muestral: las cifras son las mismas que se entregan para
 * verificar la metodología.
 */
export default function NotaMetodologicaPage() {
  let nota: NotaMetodologica | null = null;
  let error: string | null = null;
  try {
    nota = getNotaMetodologica();
  } catch (fallo) {
    error = fallo instanceof Error ? fallo.message : "No se pudo leer el Excel del diseño muestral.";
  }

  return (
    <div className="flex flex-col gap-6">
      {nota ? (
        <NotaMetodologicaPanel nota={nota} />
      ) : (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-foreground">
              <TextoEditorial id="nota-muestreo-error" original={"No se pudo cargar la nota metodológica."} />
            </p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      <DescargaExcel ruta="/nota-metodologica" />
    </div>
  );
}
