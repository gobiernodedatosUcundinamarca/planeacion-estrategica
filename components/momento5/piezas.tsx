"use client";

import { useId, useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { TextoDeCatalogo, TextoEditorial } from "@/components/editorial/texto-editorial";
import { Sic } from "@/components/editorial/sic";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { FiltroOpciones, TODAS_LAS_OPCIONES } from "@/components/layout/filtro-opciones";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/** Fracción (0–1) con el formato de porcentaje del portal. */
export const pct = (fraccion: number) => formatPorcentaje(Number.isFinite(fraccion) ? fraccion * 100 : 0);

/**
 * Tramos de la escala secuencial (verde institucional sobre la tarjeta). El
 * texto de cada tramo se eligió por contraste ≥ 4,5:1 (medido en WebKit): hasta
 * el tramo 4 el verde solo admite texto oscuro (4,7:1); el 5, blanco (5,4:1).
 */
const MEZCLA_TRAMO = [10, 25, 42, 60, 80, 100];
const TEXTO_TRAMO = [
  "text-foreground",
  "text-foreground",
  "text-foreground",
  "text-foreground",
  "text-foreground",
  "text-primary-foreground",
];

export function estiloTramo(tramo: number): { style: React.CSSProperties; className: string } {
  const i = Math.max(0, Math.min(5, tramo));
  return {
    style: { background: `color-mix(in srgb, var(--primary) ${MEZCLA_TRAMO[i]}%, var(--card))` },
    className: TEXTO_TRAMO[i],
  };
}

/** Colores de «Se valida» y «Requiere ajuste»; el texto encima supera 5:1 en ambos. */
export const COLOR_VALIDA = { background: "var(--primary)" };
export const COLOR_AJUSTE = { background: "var(--chart-2)" };
export const TEXTO_VALIDA = "text-primary-foreground";
export const TEXTO_AJUSTE = "text-foreground";

/**
 * Tarjeta de un gráfico. Si recibe `tabla`, alterna entre el gráfico y su tabla
 * equivalente, con el mismo botón de icono que `RankedBarChart`.
 */
export function Tarjeta({
  titulo,
  descripcion,
  tabla,
  acciones,
  pie,
  children,
  className,
}: {
  titulo: ReactNode;
  descripcion?: ReactNode;
  tabla?: ReactNode;
  acciones?: ReactNode;
  pie?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [vistaTabla, setVistaTabla] = useState(false);
  const id = useId();
  // Sin caja: un filete arriba y el título; el anexo es parte del texto, no un tablero.
  return (
    <section
      className={cn("flex min-w-0 flex-col gap-3 border-t border-[var(--m5-filete,var(--border))] pt-4", className)}
      aria-labelledby={`${id}-titulo`}
      role="region"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`${id}-titulo`} className="text-base font-semibold leading-snug">
            {typeof titulo === "string" ? <TextoDeCatalogo texto={titulo} /> : titulo}
          </h3>
          {descripcion ? (
            <p className="max-w-[70ch] text-sm text-[var(--m5-suave,var(--muted-foreground))]">
              {typeof descripcion === "string" ? <TextoDeCatalogo texto={descripcion} /> : descripcion}
            </p>
          ) : null}
        </div>
        {acciones || tabla ? (
          <div className="flex shrink-0 items-center gap-2">
            {acciones}
            {tabla ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-[var(--m5-suave,var(--muted-foreground))] hover:text-foreground"
                onClick={() => setVistaTabla((v) => !v)}
                aria-pressed={vistaTabla}
                aria-label={vistaTabla ? "Ver gráfico" : "Ver tabla"}
                title={vistaTabla ? "Ver gráfico" : "Ver tabla"}
              >
                {vistaTabla ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {vistaTabla && tabla ? tabla : children}
        {pie ? <p className="mt-auto pt-2 text-xs text-[var(--m5-suave,var(--muted-foreground))]">{pie}</p> : null}
      </div>
    </section>
  );
}

/**
 * Pie de una gráfica: de qué preguntas del formulario sale y cómo se calculó.
 * Toda gráfica lo lleva, para que nadie tenga que adivinar el origen de una cifra.
 */
export function Fuente({ id, original }: { id: string; original: string }) {
  return (
    <>
      <span className="font-semibold">
        <TextoEditorial id="m5-fuente" original="Fuente:" />
      </span>{" "}
      <TextoEditorial id={id} original={original} />
    </>
  );
}

/** La misma fuente, como párrafo propio, para gráficas que no van en `Tarjeta`. Ocupa todo el ancho, como en las tarjetas. */
export function LineaFuente({ id, original, className }: { id: string; original: string; className?: string }) {
  return (
    <p className={cn("w-full text-xs text-[var(--m5-suave,var(--muted-foreground))]", className)}>
      <Fuente id={id} original={original} />
    </p>
  );
}

/**
 * Respuesta escrita por un participante, transcrita sin corregir: el texto y
 * «[sic]». Sin texto no devuelve nada, para que el «—» de la celda siga saliendo.
 */
export function Literal({ texto }: { texto: string | null | undefined }) {
  if (!texto) return null;
  return (
    <>
      {texto} <Sic />
    </>
  );
}

/** Tabla equivalente de un gráfico: textos largos en varias líneas y scroll propio. */
export function TablaSimple({
  encabezados,
  filas,
  numericas = [],
  alto = "max-h-[420px]",
}: {
  encabezados: string[];
  /** Las respuestas literales llegan como `<Literal>`; lo demás, como texto o número. */
  filas: (string | number | ReactNode)[][];
  numericas?: number[];
  alto?: string;
}) {
  if (!filas.length) return <EstadoVacio>Sin datos para este filtro.</EstadoVacio>;
  return (
    <div className={cn("overflow-y-auto border-y border-[var(--m5-linea,var(--border))]", alto)} tabIndex={0} role="group" aria-label="Tabla de datos">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {encabezados.map((h, i) => (
              <TableHead key={i} className={cn("text-xs", numericas.includes(i) && "text-right")}>
                <TextoDeCatalogo texto={h} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila, i) => (
            <TableRow key={i}>
              {fila.map((celda, j) => (
                <TableCell
                  key={j}
                  className={cn(
                    "align-top text-xs",
                    numericas.includes(j) ? "text-right tabular-nums" : "min-w-24 whitespace-normal break-words"
                  )}
                >
                  {typeof celda === "number" ? formatNumero(celda) : celda || "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** «x de n» con una barra de proporción, para indicadores sencillos. */
export function Medidor({ etiqueta, valor, total }: { etiqueta: ReactNode; valor: number; total: number }) {
  const fraccion = total ? Math.min(1, valor / total) : 0;
  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-foreground">{etiqueta}</span>
        <span className="shrink-0 font-semibold tabular-nums text-foreground">
          {formatNumero(valor)} de {formatNumero(total)}
        </span>
      </div>
      <span className="h-1.5 w-full overflow-hidden bg-[var(--m5-velo,var(--muted))]" aria-hidden>
        <span className="block h-full bg-[var(--m5-tinta,var(--foreground))]" style={{ width: `${fraccion * 100}%` }} />
      </span>
    </div>
  );
}

/** Mensaje de "no hay nada que mostrar", con el estilo de las demás secciones. */
export function EstadoVacio({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-[var(--m5-suave,var(--muted-foreground))]">
      {typeof children === "string" ? <TextoDeCatalogo texto={children} /> : children}
    </p>
  );
}

/**
 * Ranking de categorías con el gráfico de barras del portal. El % se calcula
 * sobre el denominador de cada tarjeta (participantes o respuestas), no sobre
 * la suma de barras: en las preguntas de varias etiquetas no suma 100.
 */
export function Ranking({
  titulo,
  descripcion,
  items,
  total,
  truncarEn = 30,
  seleccionada,
  onSeleccionar,
  pie,
  className,
}: {
  titulo: string;
  descripcion?: string;
  items: { id: string; label: string; value: number; sub?: string }[];
  total: number;
  truncarEn?: number;
  pie?: ReactNode;
  className?: string;
  /** id de la categoría activa como filtro. */
  seleccionada?: string | null;
  onSeleccionar?: (id: string | null) => void;
}) {
  const datos = items.map((it) => ({
    id: it.id,
    etiqueta: it.sub ? `${it.label} · ${it.sub}` : it.label,
    conteo: it.value,
    porcentaje: total ? (it.value / total) * 100 : 0,
  }));
  const etiquetaSeleccionada = datos.find((x) => x.id === seleccionada)?.etiqueta ?? null;
  return (
    <div className={cn("flex h-full min-w-0 flex-col border-t border-[var(--m5-filete,var(--border))] pt-4", className)}>
      <div className="flex h-full flex-col gap-3">
        {datos.length && total ? (
          <RankedBarChart
            titulo={titulo}
            descripcion={descripcion}
            datos={datos}
            truncarEn={truncarEn}
            mostrarPorcentaje
            etiquetaSeleccionada={onSeleccionar ? etiquetaSeleccionada : undefined}
            onSeleccionarBarra={
              onSeleccionar
                ? (etiqueta) => {
                    const id = datos.find((x) => x.etiqueta === etiqueta)?.id ?? null;
                    onSeleccionar(id === seleccionada ? null : id);
                  }
                : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold leading-tight text-foreground">
              <TextoDeCatalogo texto={titulo} />
            </h3>
            <EstadoVacio>Sin respuestas para este filtro.</EstadoVacio>
          </div>
        )}
        {pie ? <p className="mt-auto border-t border-border/70 pt-3 text-xs text-muted-foreground">{pie}</p> : null}
      </div>
    </div>
  );
}

/**
 * Filtro accesible por teclado equivalente a hacer clic en una barra del
 * ranking: elige una categoría por su nombre visible y guarda su id.
 */
export function FiltroCategoria({
  etiqueta,
  items,
  valor,
  onCambiar,
  ancho = "w-64",
}: {
  etiqueta: string;
  items: { id: string; label: string }[];
  valor: string | null;
  onCambiar: (id: string | null) => void;
  ancho?: string;
}) {
  const actual = items.find((i) => i.id === valor)?.label ?? TODAS_LAS_OPCIONES;
  return (
    <FiltroOpciones
      etiqueta={etiqueta}
      valor={actual}
      opciones={items.map((i) => i.label)}
      siTodas="Todas"
      ancho={ancho}
      onCambiar={(label) => onCambiar(items.find((i) => i.label === label)?.id ?? null)}
    />
  );
}

/** Leyenda de «Se valida» / «Requiere ajuste». */
export function LeyendaValoracion() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-hidden>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 shrink-0" style={COLOR_VALIDA} />
        <TextoEditorial id="m5-leyenda-valida" original="Se valida" />
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 shrink-0" style={COLOR_AJUSTE} />
        <TextoEditorial id="m5-leyenda-ajuste" original="Requiere ajuste" />
      </li>
    </ul>
  );
}
