"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { nivelDeLectura } from "@/lib/reglas/nota-metodologica";
import { cn } from "@/lib/utils";
import type { EstamentoMuestreo, EstratoMuestreo, NotaMetodologica } from "@/types/nota-metodologica";
import {
  Apartado,
  Aparecer,
  COLOR_ESTAMENTO,
  Pestanas,
  SUAVIZADO,
  decimal,
  entero,
  nombreEstamento,
  partirEtiqueta,
  porcentaje,
  useAlEntrar,
} from "./piezas";

/**
 * Tramos del color de la matriz: escala de tinta y la señal solo para la
 * asistencia baja. Son de lectura visual, no criterios del diseño muestral.
 */
const TRAMOS = [
  {
    desde: 1,
    fondo: "var(--nm-tinta)",
    texto: "var(--nm-papel)",
    etiqueta: <TextoEditorial id="nota-muestreo-tramo-100" original={"100 o más"} />,
  },
  {
    desde: 0.7,
    fondo: "color-mix(in oklab, var(--nm-tinta) 58%, var(--nm-papel))",
    texto: "var(--nm-papel)",
    etiqueta: <TextoEditorial id="nota-muestreo-tramo-70" original={"70 a 99"} />,
  },
  {
    desde: 0.4,
    fondo: "color-mix(in oklab, var(--nm-tinta) 14%, var(--nm-papel))",
    texto: "var(--nm-tinta)",
    etiqueta: <TextoEditorial id="nota-muestreo-tramo-40" original={"40 a 69"} />,
  },
  {
    desde: 0,
    fondo: "color-mix(in oklab, var(--nm-senal) 40%, var(--nm-papel))",
    texto: "var(--nm-tinta)",
    etiqueta: <TextoEditorial id="nota-muestreo-tramo-0" original={"Menos de 40"} />,
  },
];

function tramoDe(asistentes: number, muestra: number) {
  // Se clasifica con la cifra ya redondeada que muestra la celda, para que color y número coincidan.
  const r = muestra > 0 ? Math.round((asistentes / muestra) * 100) / 100 : 0;
  return TRAMOS.find((t) => r >= t.desde) ?? TRAMOS[TRAMOS.length - 1];
}

type Celda = Pick<
  EstratoMuestreo,
  "estamento" | "poblacion" | "muestraCalculada" | "convocados" | "asistentes" | "margenReal" | "lectura"
> & { unidad: string | null };

type Props = { nota: NotaMetodologica; numero: number; titulo: ReactNode; enlace: ReactNode | null };

/** Hallazgo: matriz anotada con llamadas a notas al pie. Comparación: tabla de detalle por estamento. */
export function EscenaAsistencia({ nota, numero, titulo, enlace }: Props) {
  const [refMatriz, visible] = useAlEntrar<HTMLTableElement>(0.25);
  const [foco, setFoco] = useState<Celda | null>(() => (nota.estratos[0] ? { ...nota.estratos[0] } : null));
  const [tabla, setTabla] = useState<EstamentoMuestreo>(nota.totales[0]?.estamento ?? "estudiantes");

  const celdaTotal = (estamento: EstamentoMuestreo): Celda => {
    const t = nota.totales.find((x) => x.estamento === estamento)!;
    return { ...t, unidad: null };
  };
  const filasTabla = nota.estratos.filter((e) => e.estamento === tabla);
  const totalTabla = nota.totales.find((t) => t.estamento === tabla);

  return (
    <Apartado
      id="escena-asistencia"
      numero={numero}
      titulo={titulo}
      enlace={enlace}
      pregunta={<TextoEditorial id="nota-muestreo-asistencia-gancho" original={"¿Cuántas de las personas convocadas asistieron?"} />}
      entrada={
        <TextoEditorial
          id="nota-muestreo-asistencia-entrada"
          original={
            "El registro de asistencia refleja la participación efectiva. En algunas mesas el número de asistentes superó la muestra calculada y en otras fue considerablemente menor. Cada celda indica el porcentaje de asistentes respecto a la muestra calculada del estrato."
          }
        />
      }
    >
      <div className="nm-reticula items-start">
        <aside className="nm-margen flex flex-col gap-8">
          {foco ? <Ficha nota={nota} celda={foco} /> : null}
          <div>
            <p className="nm-rotulo">
              <TextoEditorial id="nota-muestreo-ficha-razon" original={"Asistencia frente a la muestra calculada (%)"} />
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-[length:var(--nm-t-1)]">
              {TRAMOS.map((t) => (
                <li key={t.desde} className="flex items-center gap-2">
                  <span className="inline-block h-3 w-5" style={{ backgroundColor: t.fondo }} />
                  {t.etiqueta}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="nm-principal">
          <table ref={refMatriz} className="w-full table-fixed border-separate border-spacing-[3px] text-center">
            <thead>
              <tr>
                <th className="w-36" />
                {nota.unidades.map((u) => (
                  <th key={u.nombre} className="nm-rotulo pb-2 font-normal">
                    <span className="block normal-case tracking-normal text-[var(--nm-tinta)]">{u.nombre}</span>
                    {u.tipo}
                  </th>
                ))}
                <th className="nm-rotulo pb-2 align-bottom text-[var(--nm-tinta)]">
                  <TextoEditorial id="740c1f9e2d6b67bd9ace" original={"Total"} />
                </th>
              </tr>
            </thead>
            <tbody>
              {nota.totales.map((t, fila) => (
                <tr key={t.estamento}>
                  <th className="pr-3 text-left text-[length:var(--nm-t-1)] font-semibold whitespace-nowrap">
                    <span className="nm-muestra-color mr-2" style={{ backgroundColor: COLOR_ESTAMENTO[t.estamento] }} aria-hidden />
                    {partirEtiqueta(t.etiqueta).nombre}
                  </th>
                  {[
                    ...nota.unidades.map((u) => nota.estratos.find((e) => e.estamento === t.estamento && e.unidad === u.nombre)),
                    celdaTotal(t.estamento),
                  ].map((celda, col) => {
                    if (!celda) return <td key={col} />;
                    const tramo = tramoDe(celda.asistentes, celda.muestraCalculada);
                    const activa = foco?.estamento === celda.estamento && foco?.unidad === celda.unidad;
                    return (
                      <td key={col} className={cn("p-0", celda.unidad === null && "pl-2")}>
                        <motion.button
                          type="button"
                          onMouseEnter={() => setFoco(celda)}
                          onFocus={() => setFoco(celda)}
                          onClick={() => setFoco(celda)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: visible ? 1 : 0 }}
                          transition={{ duration: 0.35, delay: (fila * 8 + col) * 0.03, ease: SUAVIZADO }}
                          className={cn(
                            "nm-mono relative flex h-14 w-full items-center justify-center text-[length:var(--nm-t-2)]",
                            activa && "outline-2 outline-offset-2 outline-[var(--nm-acento)] outline-solid"
                          )}
                          style={{ backgroundColor: tramo.fondo, color: tramo.texto }}
                          aria-label={`${partirEtiqueta(t.etiqueta).nombre} ${celda.unidad ?? "total"}: ${porcentaje(celda.asistentes / celda.muestraCalculada)}`}
                        >
                          {entero((celda.asistentes / celda.muestraCalculada) * 100)}%
                        </motion.button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <Aparecer className="mt-8 border-t border-[var(--nm-tinta)] pt-4">
            <h3 className="font-semibold">
              <TextoEditorial id="nota-muestreo-asistencia-mas-titulo" original={"Asistentes frente a la muestra calculada, por estrato"} />
            </h3>
            <p className="nm-nota mt-1">
              <TextoEditorial
                id="nota-muestreo-asistencia-mas-texto"
                original={"Un valor superior a 100 % indica que el número de asistentes excedió la muestra calculada del estrato."}
              />
            </p>
            <div className="mt-4 border-t border-[var(--nm-tinta)]">
              {nota.totales.map((t) => (
                <DesplegableEstamento key={t.estamento} nota={nota} total={t} />
              ))}
            </div>
          </Aparecer>
        </div>
      </div>

      <div className="nm-reticula mt-14">
        <div className="nm-margen">
          <p className="nm-rotulo">
            <TextoEditorial id="nota-muestreo-tabla-titulo" original={"Detalle por unidad regional"} />
          </p>
        </div>
        <div className="nm-principal">
          <Pestanas<EstamentoMuestreo>
            etiqueta="Estamento de la tabla"
            valor={tabla}
            onCambio={setTabla}
            opciones={nota.totales.map((t) => ({
              id: t.estamento,
              texto: partirEtiqueta(t.etiqueta).nombre,
              color: COLOR_ESTAMENTO[t.estamento],
            }))}
          />
          <table className="nm-tabla mt-6">
            <thead>
              <tr>
                <th>
                  <TextoEditorial id="filtro-generales-unidad-regional" original={"Unidad regional"} />
                </th>
                <th>
                  <TextoEditorial id="nota-muestreo-tabla-poblacion" original={"Población"} />
                </th>
                <th>
                  <TextoEditorial id="nota-muestreo-tope-calculada" original={"Muestra calculada"} />
                </th>
                <th>
                  <TextoEditorial id="595faa158cb0bd052852" original={"Convocados"} />
                </th>
                <th>
                  <TextoEditorial id="d80c1b1ff240ccafc8d6" original={"Asistentes"} />
                </th>
                <th>
                  <TextoEditorial id="nota-muestreo-tabla-razon" original={"Asistencia frente a la muestra"} />
                </th>
              </tr>
            </thead>
            <motion.tbody key={tabla} initial="oculto" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
              {filasTabla.map((e) => (
                <motion.tr key={e.unidad} variants={{ oculto: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <td>
                    {e.unidad}
                    {e.censo ? <sup className="nm-mono ml-1 text-[var(--nm-senal)]">†</sup> : null}
                  </td>
                  <td>{entero(e.poblacion)}</td>
                  <td>{entero(e.muestraCalculada)}</td>
                  <td>
                    {entero(e.convocados)}
                    {e.topeLogistico !== null ? <sup className="nm-mono ml-1 text-[var(--nm-senal)]">*</sup> : null}
                  </td>
                  <td>{entero(e.asistentes)}</td>
                  <td className={cn("font-semibold", e.asistentes > e.muestraCalculada && "text-[var(--nm-acento)]")}>
                    {porcentaje(e.asistentes / e.muestraCalculada)}
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
            {totalTabla ? (
              <tfoot>
                <tr>
                  <td>
                    <TextoEditorial id="740c1f9e2d6b67bd9ace" original={"Total"} />
                  </td>
                  <td>{entero(totalTabla.poblacion)}</td>
                  <td>{entero(totalTabla.muestraCalculada)}</td>
                  <td>{entero(totalTabla.convocados)}</td>
                  <td>{entero(totalTabla.asistentes)}</td>
                  <td>{porcentaje(totalTabla.asistentes / totalTabla.muestraCalculada)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
          <p className="nm-nota mt-3">
            <span className="nm-mono text-[var(--nm-senal)]">† </span>
            <TextoEditorial id="nota-muestreo-tabla-censo" original={"Estrato convocado en su totalidad."} />{" "}
            <span className="nm-mono text-[var(--nm-senal)]">* </span>
            <TextoEditorial id="nota-muestreo-tabla-tope" original={"Convocatoria limitada por capacidad logística."} />
          </p>
        </div>
      </div>
    </Apartado>
  );
}

/** Un estamento plegable: el encabezado resume el total y, al abrir, las unidades entran una tras otra. */
function DesplegableEstamento({ nota, total }: { nota: NotaMetodologica; total: NotaMetodologica["totales"][number] }) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = `asistencia-estamento-${total.estamento}`;
  const estratos = nota.estratos.filter((e) => e.estamento === total.estamento);

  return (
    <div className="border-b border-[var(--nm-linea)]">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full cursor-pointer items-center gap-2 py-2 text-left font-semibold"
      >
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-300", abierto && "rotate-180")}
          aria-hidden
        />
        <span className="nm-muestra-color" style={{ backgroundColor: COLOR_ESTAMENTO[total.estamento] }} aria-hidden />
        {nombreEstamento(nota, total.estamento)}
        <span className="nm-mono ml-auto text-[length:var(--nm-t-1)] font-normal">
          {entero(total.asistentes)} / {entero(total.muestraCalculada)} ({porcentaje(total.asistentes / total.muestraCalculada)})
        </span>
      </button>
      <AnimatePresence initial={false}>
        {abierto ? (
          <motion.div
            id={idPanel}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: SUAVIZADO }}
            className="overflow-hidden"
          >
            <ul className="border-t border-[var(--nm-linea)] text-[length:var(--nm-t-1)]">
              {estratos.map((e, i) => (
                <motion.li
                  key={e.unidad}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.08 + i * 0.04, ease: SUAVIZADO }}
                  className="flex items-baseline justify-between gap-4 border-b border-[var(--nm-linea)] py-1.5 last:border-b-0"
                >
                  <span>{e.unidad}</span>
                  <span className={cn("nm-mono", e.asistentes > e.muestraCalculada && "font-semibold text-[var(--nm-tinta)]")}>
                    {entero(e.asistentes)} / {entero(e.muestraCalculada)} ({porcentaje(e.asistentes / e.muestraCalculada)})
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Las cifras de la celda elegida en la matriz, como lista de definición en el margen. */
function Ficha({ nota, celda }: { nota: NotaMetodologica; celda: Celda }) {
  const filas = [
    { texto: <TextoEditorial id="nota-muestreo-tabla-poblacion" original={"Población"} />, valor: celda.poblacion },
    { texto: <TextoEditorial id="nota-muestreo-tope-calculada" original={"Muestra calculada"} />, valor: celda.muestraCalculada },
    { texto: <TextoEditorial id="595faa158cb0bd052852" original={"Convocados"} />, valor: celda.convocados },
    { texto: <TextoEditorial id="d80c1b1ff240ccafc8d6" original={"Asistentes"} />, valor: celda.asistentes },
    {
      texto: <TextoEditorial id="nota-muestreo-ficha-razon" original={"Asistencia frente a la muestra calculada (%)"} />,
      valor: celda.muestraCalculada > 0 ? (celda.asistentes / celda.muestraCalculada) * 100 : 0,
      sufijo: "%",
    },
  ];
  const nivel = nivelDeLectura(celda.lectura);
  return (
    <motion.div key={`${celda.estamento}-${celda.unidad ?? "total"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <p className="nm-rotulo">
        <TextoEditorial id="nota-muestreo-ficha-rotulo" original={"Estrato seleccionado"} />
      </p>
      <p className="mt-1 font-semibold" style={{ color: COLOR_ESTAMENTO[celda.estamento] }}>
        {nombreEstamento(nota, celda.estamento)} · {celda.unidad ?? <TextoEditorial id="740c1f9e2d6b67bd9ace" original={"Total"} />}
      </p>
      <dl className="mt-2 border-t border-[var(--nm-tinta)]">
        {filas.map((f, i) => (
          <div key={i} className="flex items-baseline justify-between border-b border-[var(--nm-linea)] py-1.5">
            <dt className="text-[length:var(--nm-t-1)]">{f.texto}</dt>
            <dd className="nm-cifra text-[length:var(--nm-t-3)] font-semibold">{entero(f.valor)}
              {"sufijo" in f ? f.sufijo : ""}
            </dd>
          </div>
        ))}
      </dl>
      <p className="nm-nota mt-2">
        <TextoEditorial id="nota-muestreo-ficha-margen" original={"Con los asistentes registrados, el resultado podría variar en"} />{" "}
        <strong className="nm-mono text-[var(--nm-tinta)]">±{decimal(celda.margenReal * 100, 1)}</strong>{" "}
        <TextoEditorial id="nota-muestreo-ficha-margen-unidad" original={"puntos porcentuales (cifra referencial)."} />
      </p>
      <p className="nm-nota mt-1 font-semibold text-[var(--nm-tinta)]">
        {nivel === "cumple" ? (
          <TextoEditorial id="nota-muestreo-ficha-nivel-cumple" original={"La precisión está dentro de lo planificado."} />
        ) : nivel === "moderada" ? (
          <TextoEditorial id="nota-muestreo-ficha-nivel-moderada" original={"La precisión es aceptable, aunque menor a la planificada."} />
        ) : (
          <TextoEditorial id="nota-muestreo-ficha-nivel-cautela" original={"La precisión es baja: los resultados deben leerse con cautela."} />
        )}
      </p>
      {celda.unidad !== null && celda.asistentes > celda.poblacion ? (
        <p className="nm-nota mt-2 text-[var(--nm-senal)]">
          <TextoEditorial
            id="nota-muestreo-ficha-margen-cero"
            original={"El margen resulta igual a cero porque los asistentes se limitan al tamaño de la población; no debe interpretarse como precisión real."}
          />
        </p>
      ) : null}
    </motion.div>
  );
}
