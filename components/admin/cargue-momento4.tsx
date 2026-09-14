"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import {
  COLUMNAS_MOMENTO4,
  FECHA_MINIMA_RESPUESTA,
  TITULO_MOMENTO4,
} from "@/lib/reglas/momento4";
import type { DocumentoMomento4, ResultadoCargue } from "@/types/momento4";
import { eliminarRegistros, subirDocumentoMomento4 } from "@/app/admin/acciones";

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CargueMomento4({
  documentos,
  error,
}: {
  documentos: DocumentoMomento4[];
  error: string | null;
}) {
  // Un resultado por casilla: cada documento se sube por separado, así que el
  // mensaje pertenece a su fila y no a un cargue global.
  const [resultados, setResultados] = useState<Record<string, ResultadoCargue>>({});
  // Qué se está a punto de borrar. `null` = nada pendiente; `transformacion:
  // null` dentro del objeto = borrado de las cinco.
  const [aBorrar, setABorrar] = useState<{
    transformacion: string | null;
    etiqueta: string;
    respuestas: number;
  } | null>(null);
  const [avisoBorrado, setAvisoBorrado] = useState<{ ok: boolean; texto: string } | null>(null);
  const cargados = documentos.filter((documento) => documento.archivo).length;
  const totalRespuestas = documentos.reduce((suma, d) => suma + d.respuestas, 0);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Momento 4 · {TITULO_MOMENTO4}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="font-medium text-foreground">
                No se pudo consultar la base de datos.
              </p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Momento 4 · {TITULO_MOMENTO4}</CardTitle>
        <CardDescription>
          Son 5 documentos, uno por transformación. Se suben de a uno, en la fila que le
          corresponde: el archivo debe conservar el formato del export de Microsoft Forms y el que
          no lo cumpla se rechaza sin guardarse. Cada cargue reemplaza por completo las respuestas
          de esa transformación en la base de datos. Si una persona figura dos veces en el mismo
          archivo se guarda solo su respuesta más reciente; el mismo correo sí puede aparecer en
          documentos de transformaciones distintas.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Documentos cargados</span>
            <Badge variant={cargados === documentos.length ? "default" : "secondary"}>
              {cargados} de {documentos.length}
            </Badge>

            {/* Solo si hay algo que borrar: un botón que no puede hacer nada
                confunde más de lo que ayuda. */}
            {cargados > 0 ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="ml-auto"
                onClick={() =>
                  setABorrar({
                    transformacion: null,
                    etiqueta: "las cinco transformaciones",
                    respuestas: totalRespuestas,
                  })
                }
              >
                <Trash2 className="size-3.5" aria-hidden />
                Borrar todos los registros
              </Button>
            ) : null}
          </div>

          {avisoBorrado ? (
            <p
              role="status"
              className={cn(
                "mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                avisoBorrado.ok
                  ? "border-primary/30 bg-primary/5"
                  : "border-destructive/30 bg-destructive/5"
              )}
            >
              {avisoBorrado.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              )}
              <span className="text-muted-foreground">{avisoBorrado.texto}</span>
            </p>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transformación</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead className="text-right">Respuestas</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((documento) => (
                <FilaDocumento
                  key={documento.transformacion}
                  documento={documento}
                  resultado={resultados[documento.transformacion] ?? null}
                  onResultado={(resultado) =>
                    setResultados((previos) => {
                      // Un resultado nulo limpia el aviso de esta casilla, sin
                      // tocar los de las demás.
                      const siguientes = { ...previos };
                      if (resultado) siguientes[documento.transformacion] = resultado;
                      else delete siguientes[documento.transformacion];
                      return siguientes;
                    })
                  }
                  onPedirBorrado={() =>
                    setABorrar({
                      transformacion: documento.transformacion,
                      etiqueta: documento.etiqueta,
                      respuestas: documento.respuestas,
                    })
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>

        <ConfirmacionBorrado
          objetivo={aBorrar}
          onCerrar={() => setABorrar(null)}
          onHecho={(aviso) => {
            setABorrar(null);
            setAvisoBorrado(aviso);
          }}
        />

        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <ChevronDown
              className="size-4 transition-transform group-data-[panel-open]:rotate-180"
              aria-hidden
            />
            Ver el formato exigido ({COLUMNAS_MOMENTO4.length} columnas)
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                El archivo debe traer estas columnas, con estos nombres y en este orden. El nombre
                del archivo no importa: al guardarlo se renombra según su transformación.
              </p>
              <ol className="flex flex-col gap-1 text-xs text-muted-foreground">
                {COLUMNAS_MOMENTO4.map((columna, indice) => (
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
    </Card>
  );
}

/**
 * Confirmación antes de borrar. Es un paso deliberado y no un `confirm()` del
 * navegador: hace falta decir exactamente QUÉ se va a borrar —qué
 * transformación y cuántas respuestas— porque el cargue no se puede deshacer
 * si el Excel de origen ya no está a mano.
 */
function ConfirmacionBorrado({
  objetivo,
  onCerrar,
  onHecho,
}: {
  objetivo: { transformacion: string | null; etiqueta: string; respuestas: number } | null;
  onCerrar: () => void;
  onHecho: (aviso: { ok: boolean; texto: string }) => void;
}) {
  const router = useRouter();
  const [borrando, iniciarBorrado] = useTransition();

  function confirmar() {
    if (!objetivo) return;
    iniciarBorrado(async () => {
      try {
        const respuesta = await eliminarRegistros(objetivo.transformacion);
        onHecho({ ok: respuesta.ok, texto: respuesta.motivo });
        if (respuesta.ok) router.refresh();
      } catch {
        onHecho({
          ok: false,
          texto: "No se pudo borrar: el servidor no respondió correctamente.",
        });
      }
    });
  }

  return (
    <Dialog
      open={objetivo !== null}
      // Mientras borra no se puede cerrar: la operación ya está en marcha y no
      // hay forma de cancelarla a medias.
      onOpenChange={(abierto) => {
        if (!abierto && !borrando) onCerrar();
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
              Se borrarán{" "}
              <strong className="font-medium text-foreground">
                {objetivo?.respuestas ?? 0} respuesta(s)
              </strong>{" "}
              de{" "}
              <strong className="font-medium text-foreground">{objetivo?.etiqueta}</strong>. Esta
              acción no se puede deshacer: para recuperarlas habría que volver a subir el Excel.
            </DialogDescription>
          </div>
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={borrando} onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={borrando} onClick={confirmar}>
            {borrando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            {borrando ? "Borrando…" : "Sí, borrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilaDocumento({
  documento,
  resultado,
  onResultado,
  onPedirBorrado,
}: {
  documento: DocumentoMomento4;
  resultado: ResultadoCargue | null;
  /** `null` limpia el aviso de esta casilla (al empezar un cargue nuevo). */
  onResultado: (resultado: ResultadoCargue | null) => void;
  onPedirBorrado: () => void;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, iniciarSubida] = useTransition();
  // El nombre y el peso del archivo en curso se guardan para poder decir qué se
  // está procesando: con un documento grande el cargue tarda decenas de
  // segundos, y un botón que solo cambia de texto no alcanza para que se note
  // que el sitio está trabajando.
  const [enCurso, setEnCurso] = useState<{ nombre: string; mb: string } | null>(null);

  function alElegirArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    // El input se limpia siempre: si no, volver a elegir el mismo archivo tras
    // corregirlo no dispararía "change" y el botón parecería no responder.
    evento.target.value = "";
    if (!archivo) return;

    const rechazoLocal = (motivo: string) =>
      onResultado({
        archivo: archivo.name,
        aceptado: false,
        motivo,
        transformacion: documento.transformacion,
        etiqueta: documento.etiqueta,
        respuestas: null,
        descartadas: null,
        descartadasPorFecha: null,
        sinRespuesta: null,
        reemplazo: null,
      });

    const datos = new FormData();
    datos.set("transformacion", documento.transformacion);
    datos.set("documento", archivo);

    // El aviso anterior se retira al empezar: dejarlo mientras se procesa el
    // archivo nuevo haría creer que el resultado en pantalla es el de este.
    onResultado(null);
    setEnCurso({ nombre: archivo.name, mb: (archivo.size / 1024 / 1024).toFixed(1) });

    iniciarSubida(async () => {
      try {
        const respuesta = await subirDocumentoMomento4(datos);
        onResultado(respuesta);
        // La fila la pinta el servidor: sin refrescar seguiría mostrando el
        // archivo anterior al cargue.
        if (respuesta.aceptado) router.refresh();
      } catch {
        // Si la acción falla entera (red caída, error del servidor, un archivo
        // tan grande que el servidor corta la petición), la promesa se rechaza
        // y sin este catch la excepción quedaba sin atender: la pantalla no
        // mostraba nada y parecía que el botón no hacía nada.
        rechazoLocal(
          "No se pudo completar el cargue: el servidor no respondió correctamente. Revisa la conexión e inténtalo de nuevo."
        );
      } finally {
        setEnCurso(null);
      }
    });
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{documento.etiqueta}</TableCell>
        <TableCell
          className={documento.archivo ? "text-muted-foreground" : "text-destructive"}
          title={documento.archivo ?? undefined}
        >
          {/* El ancho va en este contenedor y no en la celda: con table-layout
              automático, un max-width sobre el <td> se ignora y el nombre largo
              del archivo ensancha la tabla hasta cortar la columna del botón. */}
          <span className="flex w-72 items-center gap-1.5">
            {documento.archivo ? (
              <>
                <FileSpreadsheet className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{documento.archivo}</span>
              </>
            ) : (
              "Sin cargar"
            )}
          </span>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {documento.archivo ? documento.respuestas : "—"}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {documento.actualizado ? formatoFecha.format(new Date(documento.actualizado)) : "—"}
        </TableCell>
        <TableCell className="text-right">
          <input
            ref={entrada}
            type="file"
            accept=".xlsx"
            className="hidden"
            aria-label={`Subir documento de ${documento.etiqueta}`}
            onChange={alElegirArchivo}
          />
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={subiendo}
              onClick={() => entrada.current?.click()}
            >
              {subiendo ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-3.5" aria-hidden />
              )}
              {subiendo ? "Procesando…" : documento.archivo ? "Reemplazar" : "Subir"}
            </Button>

            {/* Solo si esta casilla tiene algo cargado. */}
            {documento.archivo ? (
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                disabled={subiendo}
                onClick={onPedirBorrado}
                title={`Borrar los registros de ${documento.etiqueta}`}
                aria-label={`Borrar los registros de ${documento.etiqueta}`}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            ) : null}
          </div>
        </TableCell>
      </TableRow>

      {/* El aviso de "procesando" va en un modal y no dentro de la fila: el
          cargue puede tardar decenas de segundos, y el modal deja claro que hay
          una operación en curso —bloquea el resto de la pantalla— en vez de
          confiar en que el usuario mire una fila concreta de la tabla. */}
      {/* Controlado por `open` y sin `onOpenChange` a propósito: así ni Escape
          ni un clic fuera lo cierran. No hay forma de cancelar un cargue a
          medias, y dejarlo cerrar daría la impresión de que se canceló. */}
      <Dialog open={subiendo && enCurso !== null} modal>
        <DialogContent
          showCloseButton={false}
          className="max-w-md items-center gap-3 text-center"
        >
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <DialogTitle>Procesando documento</DialogTitle>
          <DialogDescription className="flex flex-col gap-1">
            <span className="truncate font-medium text-foreground">{enCurso?.nombre}</span>
            <span>
              Subiendo y validando el formato ({enCurso?.mb} MB) para{" "}
              <strong className="font-medium text-foreground">{documento.etiqueta}</strong>.
            </span>
            <span>
              Un documento con muchas respuestas puede tardar. No cierres esta página.
            </span>
          </DialogDescription>
          {/* Barra indeterminada: el cargue no informa avance parcial, así que
              se muestra movimiento —que algo está pasando— y no un porcentaje
              inventado. */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-primary/15">
            <div className="h-full w-1/3 animate-[barra-cargue_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
        </DialogContent>
      </Dialog>

      {resultado && !subiendo ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="whitespace-normal pt-0">
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
                {resultado.descartadasPorFecha ? (
                  <p className="mt-1 flex w-fit items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                    {resultado.descartadasPorFecha} respuesta(s) anteriores al{" "}
                    {FECHA_MINIMA_RESPUESTA.toLocaleDateString("es-CO")} no se cargaron.
                  </p>
                ) : null}
                {resultado.descartadas ? (
                  <p className="mt-1 flex w-fit items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                    {resultado.descartadas} respuesta(s) que repetían correo y rol no se cargaron.
                  </p>
                ) : null}
                {resultado.sinRespuesta ? (
                  <p className="mt-1 flex w-fit items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                    {resultado.sinRespuesta} respuesta(s) sin contestar nada (solo correo y fecha) no se
                    cargaron.
                  </p>
                ) : null}
                {resultado.reemplazo ? (
                  <p className="text-xs text-muted-foreground">
                    Reemplazó a “{resultado.reemplazo}”.
                  </p>
                ) : null}
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
