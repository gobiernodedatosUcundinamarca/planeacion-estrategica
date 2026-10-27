"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { COLUMNAS_APORTES, TITULO_APORTES } from "@/lib/reglas/aportes";
import type { DocumentoAportes, ResultadoCargueAportes } from "@/types/aportes";
import { eliminarRegistrosAportes, subirDocumentoAportes } from "@/app/admin/acciones";

const formatoFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

/**
 * Cargue del formulario general del Plan. Una sola casilla, no cinco: este
 * cuestionario no va sobre ninguna transformación en concreto.
 */
export function CargueAportes({
  documento,
  error,
}: {
  documento: DocumentoAportes | null;
  error: string | null;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, iniciarSubida] = useTransition();
  const [enCurso, setEnCurso] = useState<{
    nombre: string;
    mb: string;
    modo: "reemplazar" | "actualizar";
  } | null>(null);
  const [resultado, setResultado] = useState<ResultadoCargueAportes | null>(null);
  const [borrando, iniciarBorrado] = useTransition();
  // Los dos botones abren el mismo selector de archivo; aquí queda cuál se pulsó.
  const modoPedido = useRef<"reemplazar" | "actualizar">("reemplazar");

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{TITULO_APORTES}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="font-medium text-foreground">No se pudo consultar la base de datos.</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function elegirArchivo(modo: "reemplazar" | "actualizar") {
    modoPedido.current = modo;
    entrada.current?.click();
  }

  function alElegirArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    const modo = modoPedido.current;
    const datos = new FormData();
    datos.set("documento", archivo);
    datos.set("modo", modo);

    setResultado(null);
    setEnCurso({ nombre: archivo.name, mb: (archivo.size / 1024 / 1024).toFixed(1), modo });

    iniciarSubida(async () => {
      try {
        const respuesta = await subirDocumentoAportes(datos);
        setResultado(respuesta);
        if (respuesta.aceptado) router.refresh();
      } catch {
        setResultado({
          archivo: archivo.name,
          aceptado: false,
          motivo:
            "No se pudo completar el cargue: el servidor no respondió correctamente. Revisa la conexión e inténtalo de nuevo.",
          respuestas: null,
          sinAporte: null,
          descartadasPorFecha: null,
        });
      } finally {
        setEnCurso(null);
      }
    });
  }

  function borrar() {
    iniciarBorrado(async () => {
      try {
        const respuesta = await eliminarRegistrosAportes();
        setResultado(null);
        if (respuesta.ok) router.refresh();
      } catch {
        /* el estado se refresca solo; un fallo aquí deja lo que ya había */
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{TITULO_APORTES}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">Documento cargado</span>
          <Badge variant={documento ? "default" : "secondary"}>
            {documento ? `${documento.respuestas} aporte(s)` : "ninguno"}
          </Badge>

          <input
            ref={entrada}
            type="file"
            accept=".xlsx"
            className="hidden"
            aria-label="Subir el formulario general del Plan"
            onChange={alElegirArchivo}
          />
          {/* Actualizar solo tiene sentido si ya hay algo cargado. */}
          {documento ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              disabled={subiendo || borrando}
              onClick={() => elegirArchivo("actualizar")}
              title="Sube el export completo: solo se agregan los aportes nuevos, sin tocar los que ya estaban."
            >
              {subiendo && enCurso?.modo === "actualizar" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
              {subiendo && enCurso?.modo === "actualizar" ? "Procesando…" : "Actualizar"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className={documento ? undefined : "ml-auto"}
            disabled={subiendo || borrando}
            onClick={() => elegirArchivo("reemplazar")}
            title="Deja el archivo como único contenido."
          >
            {subiendo && enCurso?.modo === "reemplazar" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-3.5" aria-hidden />
            )}
            {subiendo && enCurso?.modo === "reemplazar"
              ? "Procesando…"
              : documento
                ? "Reemplazar"
                : "Subir"}
          </Button>

          {documento ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={subiendo || borrando}
              onClick={borrar}
            >
              {borrando ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
              Borrar
            </Button>
          ) : null}
        </div>

        {documento ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileSpreadsheet className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{documento.archivo}</span>
            <span className="shrink-0">· {formatoFecha.format(new Date(documento.actualizado))}</span>
          </p>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Todavía no se ha cargado ningún aporte general.
          </p>
        )}

        {resultado ? (
          <div
            role="status"
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
              resultado.aceptado
                ? "border-primary/30 bg-primary/5"
                : "border-destructive/30 bg-destructive/5"
            )}
          >
            {resultado.aceptado ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="font-medium text-foreground">{resultado.archivo}</p>
              <p className="text-muted-foreground">{resultado.motivo}</p>
            </div>
          </div>
        ) : null}

        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <ChevronDown
              className="size-4 transition-transform group-data-[panel-open]:rotate-180"
              aria-hidden
            />
            Ver el formato exigido ({COLUMNAS_APORTES.length} columnas)
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                El archivo debe traer estas columnas, con estos nombres y en este orden. Comparte
                las 17 primeras con el formulario de las transformaciones y se distingue por la
                pregunta final.
              </p>
              <ol className="flex flex-col gap-1 text-xs text-muted-foreground">
                {COLUMNAS_APORTES.map((columna, indice) => (
                  <li key={columna} className="flex gap-2">
                    <span className="w-5 shrink-0 text-right tabular-nums">{indice + 1}.</span>
                    <span className="font-mono">{columna}</span>
                  </li>
                ))}
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <Dialog open={subiendo && enCurso !== null} modal>
        <DialogContent showCloseButton={false} className="max-w-md items-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <DialogTitle>
            {enCurso?.modo === "actualizar" ? "Actualizando documento" : "Procesando documento"}
          </DialogTitle>
          <DialogDescription className="flex w-full min-w-0 flex-col gap-1">
            <span className="block max-w-full truncate font-medium text-foreground">
              {enCurso?.nombre}
            </span>
            <span>
              {enCurso?.modo === "actualizar"
                ? "Subiendo, validando y buscando los aportes nuevos"
                : "Subiendo y validando el formato"}{" "}
              ({enCurso?.mb} MB).
            </span>
            <span>No cierres esta página.</span>
          </DialogDescription>
          <div className="h-1 w-full overflow-hidden rounded-full bg-primary/15">
            <div className="h-full w-1/3 animate-[barra-cargue_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
