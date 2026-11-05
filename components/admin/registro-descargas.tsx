import { Download, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NAVEGACION } from "@/constants/navegacion";
import { ZONA_HORARIA } from "@/constants/admin";
import { formatNumero } from "@/lib/formatters";
import {
  LIMITE_DESCARGAS_GLOBAL,
  LIMITE_DESCARGAS_POR_VISITANTE,
  VENTANA_GLOBAL_MINUTOS,
  VENTANA_VISITANTE_MINUTOS,
  DIAS_REGISTRO_DESCARGAS,
  slugDeRuta,
} from "@/lib/reglas/descargas";
import type { RegistroDescargas, ResultadoDescarga } from "@/types/descargas";

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: ZONA_HORARIA,
});

const NOMBRE_RESULTADO: Record<ResultadoDescarga, string> = {
  entregada: "Entregada",
  limite_ip: "Límite del visitante",
  limite_global: "Límite del sitio",
  no_publicada: "Sección retirada",
  no_existe: "Sección inexistente",
  error: "Error",
};

function nombreSeccion(slug: string): string {
  return NAVEGACION.find((item) => slugDeRuta(item.href) === slug)?.etiqueta ?? slug;
}

/**
 * La auditoría de las descargas en Excel: cuántas se entregaron y rechazaron
 * por sección, quién pide más (por un hash de la IP, nunca la dirección) y las
 * últimas peticiones. Es donde se vería un uso desmedido antes de que pese.
 */
export function RegistroDescargasPanel({
  registro,
  error,
}: {
  registro: RegistroDescargas | null;
  error: string | null;
}) {
  const entregadas = registro?.porSeccion.reduce((s, f) => s + f.entregadas, 0) ?? 0;
  const rechazadas = registro?.porSeccion.reduce((s, f) => s + f.rechazadas, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de descargas</CardTitle>
        <CardDescription>
          Cada petición de descarga en Excel, entregada o rechazada. Límites vigentes:{" "}
          {LIMITE_DESCARGAS_POR_VISITANTE} descargas por visitante cada {VENTANA_VISITANTE_MINUTOS} minutos y{" "}
          {LIMITE_DESCARGAS_GLOBAL} para todo el sitio cada {VENTANA_GLOBAL_MINUTOS} minutos. El visitante se
          identifica con un código derivado de su IP, no con la dirección; el registro se conserva{" "}
          {DIAS_REGISTRO_DESCARGAS} días.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {error || !registro ? (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-muted-foreground">
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            No se pudo consultar el registro: {error ?? "sin datos"}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="default">
                <Download className="size-3" aria-hidden /> {formatNumero(entregadas)} entregadas
              </Badge>
              <Badge variant="secondary">
                <ShieldCheck className="size-3" aria-hidden /> {formatNumero(rechazadas)} rechazadas
              </Badge>
              <span className="text-muted-foreground">en los últimos {registro.dias} días</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-foreground">Por sección</h3>
                {registro.porSeccion.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin descargas en el periodo.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Sección</TableHead>
                        <TableHead className="text-right text-xs">Entregadas</TableHead>
                        <TableHead className="text-right text-xs">Rechazadas</TableHead>
                        <TableHead className="text-right text-xs">KB</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registro.porSeccion.map((f) => (
                        <TableRow key={f.seccion}>
                          <TableCell className="text-xs whitespace-normal">{nombreSeccion(f.seccion)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatNumero(f.entregadas)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatNumero(f.rechazadas)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatNumero(f.kilobytes)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-foreground">Visitantes con más peticiones</h3>
                {registro.visitantesMasActivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin peticiones en el periodo.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Visitante</TableHead>
                        <TableHead className="text-right text-xs">Peticiones</TableHead>
                        <TableHead className="text-right text-xs">Rechazadas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registro.visitantesMasActivos.map((v) => (
                        <TableRow key={v.visitante}>
                          <TableCell className="font-mono text-xs">{v.visitante}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatNumero(v.peticiones)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatNumero(v.rechazadas)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-foreground">Últimas peticiones</h3>
              {registro.recientes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay descargas registradas.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Sección</TableHead>
                      <TableHead className="text-xs">Resultado</TableHead>
                      <TableHead className="text-xs">Visitante</TableHead>
                      <TableHead className="text-right text-xs">KB</TableHead>
                      <TableHead className="text-right text-xs">ms</TableHead>
                      <TableHead className="text-xs">Origen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registro.recientes.map((r, i) => (
                      <TableRow key={`${r.fecha}-${i}`}>
                        <TableCell className="text-xs tabular-nums">{formatoFecha.format(new Date(r.fecha))}</TableCell>
                        <TableCell className="text-xs whitespace-normal">{nombreSeccion(r.seccion)}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={r.resultado === "entregada" ? "default" : "secondary"}>
                            {NOMBRE_RESULTADO[r.resultado] ?? r.resultado}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.visitante}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {r.kilobytes === null ? "—" : formatNumero(r.kilobytes)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {r.milisegundos === null ? "—" : formatNumero(r.milisegundos)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.resultado === "entregada" ? (r.desdeCache ? "Copia en memoria" : "Generado") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
