"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CAMPOS_PARTICIPACION, TITULO_PARTICIPACION } from "@/lib/reglas/participacion";
import type {
  DocumentoParticipacion,
  ModoCargueParticipacion,
  ResultadoCargueParticipacion,
} from "@/types/participacion";
import { eliminarTandaParticipacion, subirDocumentoParticipacion } from "@/app/admin/acciones";

const formatoFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

/**
 * A diferencia del Momento 4 no hay 5 casillas fijas: cada tanda de
 * asistencia sube un archivo nuevo que se SUMA a las anteriores, así que aquí
 * se ve como una lista que crece, con un botón de subir y una tabla de lo ya
 * cargado.
 */
export function CargueParticipacion({
  documentos,
  error,
}: {
  documentos: DocumentoParticipacion[];
  error: string | null;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, iniciarSubida] = useTransition();
  const [enCurso, setEnCurso] = useState<{ nombre: string; mb: string } | null>(null);
  const [resultado, setResultado] = useState<ResultadoCargueParticipacion | null>(null);
  const [aBorrar, setABorrar] = useState<{ id: number | null; etiqueta: string } | null>(null);
  // Qué botón abrió el selector de archivo. Se guarda porque el input es uno
  // solo y su "change" no sabe desde cuál se llegó.
  const [modo, setModo] = useState<ModoCargueParticipacion>("anexar");
  const totalRegistros = documentos.reduce((suma, d) => suma + d.filas, 0);

  function abrirSelector(siguiente: ModoCargueParticipacion) {
    setModo(siguiente);
    entrada.current?.click();
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{TITULO_PARTICIPACION}</CardTitle>
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

  function alElegirArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    const datos = new FormData();
    datos.set("documento", archivo);
    datos.set("modo", modo);

    setResultado(null);
    setEnCurso({ nombre: archivo.name, mb: (archivo.size / 1024 / 1024).toFixed(1) });

    iniciarSubida(async () => {
      try {
        const respuesta = await subirDocumentoParticipacion(datos);
        setResultado(respuesta);
        if (respuesta.aceptado) router.refresh();
      } catch {
        setResultado({
          archivo: archivo.name,
          aceptado: false,
          motivo:
            "No se pudo completar el cargue: el servidor no respondió correctamente. Revisa la conexión e inténtalo de nuevo.",
          filas: null,
          columnasReconocidas: null,
        });
      } finally {
        setEnCurso(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{TITULO_PARTICIPACION}</CardTitle>
        <CardDescription>
          Al subir un archivo se elige qué hacer con lo que ya está cargado.{" "}
          <strong className="font-medium text-foreground">Anexar</strong> lo agrega a las tandas
          anteriores —es lo normal cuando ocurre un evento nuevo— y{" "}
          <strong className="font-medium text-foreground">reemplazar todo</strong> deja el archivo
          como único contenido, que es la salida para corregir un cargue sin duplicar registros. El
          formato de columnas se reconoce por nombre y no por posición, y cualquier otra columna que
          traiga el Excel se descarta sin guardarse, como forma de anonimizar lo que no es relevante
          para el seguimiento.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Tandas cargadas</span>
            <Badge variant={documentos.length > 0 ? "default" : "secondary"}>
              {documentos.length}
            </Badge>
            <Badge variant="secondary">{totalRegistros} registro(s) en total</Badge>

            {/* Un solo input para los dos botones: cuál se pulsó queda en
                `modo`, y es lo que decide si el cargue anexa o reemplaza. */}
            <input
              ref={entrada}
              type="file"
              accept=".xlsx"
              className="hidden"
              aria-label="Archivo de asistencia"
              onChange={alElegirArchivo}
            />

            <Button
              type="button"
              size="sm"
              className="ml-auto"
              disabled={subiendo}
              onClick={() => abrirSelector("anexar")}
            >
              {subiendo && modo === "anexar" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-3.5" aria-hidden />
              )}
              Anexar tanda
            </Button>

            {/* Solo si hay algo que reemplazar: sin nada cargado hace lo mismo
                que anexar, y ofrecer dos botones idénticos confunde. */}
            {documentos.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={subiendo}
                onClick={() => abrirSelector("reemplazar")}
              >
                {subiendo && modo === "reemplazar" ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-3.5" aria-hidden />
                )}
                Reemplazar todo
              </Button>
            ) : null}

            {documentos.length > 0 ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={subiendo}
                onClick={() => setABorrar({ id: null, etiqueta: "todas las tandas" })}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Borrar todo
              </Button>
            ) : null}
          </div>

          {resultado ? (
            <div
              role="status"
              className={cn(
                "mb-3 flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
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

          {documentos.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Todavía no hay ninguna tanda cargada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead>Cargado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((documento) => (
                  <TableRow key={documento.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        <FileSpreadsheet className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{documento.archivo}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{documento.filas}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatoFecha.format(new Date(documento.cargadoEn))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        disabled={subiendo}
                        onClick={() => setABorrar({ id: documento.id, etiqueta: `“${documento.archivo}”` })}
                        title="Borrar esta tanda"
                        aria-label={`Borrar la tanda ${documento.archivo}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <ConfirmacionBorrado
          objetivo={aBorrar}
          onCerrar={() => setABorrar(null)}
          onHecho={() => {
            setABorrar(null);
            router.refresh();
          }}
        />

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Columnas que se reconocen del Excel (por nombre, no por posición ni orden). Cualquier
            otra columna que traiga el archivo no se guarda.
          </p>
          <ul className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
            {CAMPOS_PARTICIPACION.map((c) => (
              <li key={c.campo} className="font-mono">
                {c.etiqueta}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <Dialog open={subiendo && enCurso !== null} modal>
        <DialogContent showCloseButton={false} className="max-w-md items-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <DialogTitle>
            {modo === "reemplazar" ? "Reemplazando la asistencia" : "Anexando tanda de asistencia"}
          </DialogTitle>
          <DialogDescription className="flex w-full min-w-0 flex-col gap-1">
            <span className="block max-w-full truncate font-medium text-foreground">
              {enCurso?.nombre}
            </span>
            <span>Subiendo y validando el archivo ({enCurso?.mb} MB).</span>
            {modo === "reemplazar" ? (
              <span className="font-medium text-foreground">
                Al terminar, este archivo será lo único que quede en la sección.
              </span>
            ) : null}
            <span>Un archivo con muchos registros puede tardar. No cierres esta página.</span>
          </DialogDescription>
          <div className="h-1 w-full overflow-hidden rounded-full bg-primary/15">
            <div className="h-full w-1/3 animate-[barra-cargue_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ConfirmacionBorrado({
  objetivo,
  onCerrar,
  onHecho,
}: {
  objetivo: { id: number | null; etiqueta: string } | null;
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [borrando, iniciarBorrado] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    if (!objetivo) return;
    setError(null);
    iniciarBorrado(async () => {
      try {
        const respuesta = await eliminarTandaParticipacion(objetivo.id);
        if (respuesta.ok) onHecho();
        else setError(respuesta.motivo);
      } catch {
        setError("No se pudo borrar: el servidor no respondió correctamente.");
      }
    });
  }

  return (
    <Dialog
      open={objetivo !== null}
      onOpenChange={(abierto) => {
        if (!abierto && !borrando) {
          setError(null);
          onCerrar();
        }
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-md gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Trash2 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <DialogTitle>¿Borrar los registros?</DialogTitle>
            <DialogDescription className="mt-1">
              Se borrarán los registros de{" "}
              <strong className="font-medium text-foreground">{objetivo?.etiqueta}</strong>. Esta
              acción no se puede deshacer: para recuperarlos habría que volver a subir el Excel.
            </DialogDescription>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-muted-foreground">
            {error}
          </p>
        ) : null}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={borrando} onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={borrando} onClick={confirmar}>
            {borrando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
            {borrando ? "Borrando…" : "Sí, borrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
