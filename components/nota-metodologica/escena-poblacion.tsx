"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { NotaMetodologica } from "@/types/nota-metodologica";
import {
  Apartado,
  BarraCreciente,
  COLOR_ESTAMENTO,
  Contador,
  entero,
  partirEtiqueta,
  porcentaje,
  sumarTotales,
  useAlEntrar,
} from "./piezas";

type Props = { nota: NotaMetodologica; numero: number; titulo: ReactNode; enlace: ReactNode | null };

/** Comparación entre estamentos: tabla. La depuración de graduados: libro contable. Fuentes al margen. */
export function EscenaPoblacion({ nota, numero, titulo, enlace }: Props) {
  const total = sumarTotales(nota.totales);

  return (
    <Apartado
      id="escena-poblacion"
      numero={numero}
      titulo={titulo}
      enlace={enlace}
      pregunta={<TextoEditorial id="nota-muestreo-poblacion-gancho" original={"¿A quiénes se buscaba consultar?"} />}
      entrada={
        <TextoEditorial
          id="nota-muestreo-poblacion-entrada"
          original={
            "Los datos de estudiantes, docentes y administrativos se obtuvieron con corte al primer semestre de 2026 (2026-1). Para graduados, se consideró la totalidad de los graduados del histórico institucional, de todas las cohortes, con corte al primer semestre de 2026 (2026-1). La consulta se dirigió a cuatro estamentos de la comunidad universitaria. Para cada uno se definió una población de referencia, es decir, el conjunto completo de personas cuya opinión se buscaba conocer; a partir de ella se calculó el número de personas a convocar."
          }
        />
      }
    >
      <div className="nm-reticula">
        <div className="nm-principal">
          <table className="nm-tabla">
            <thead>
              <tr>
                <th>
                  <TextoEditorial id="nota-muestreo-portada-matriz-estamento" original={"Estamento"} />
                </th>
                <th>
                  <TextoEditorial id="nota-muestreo-poblacion-composicion" original={"Composición"} />
                </th>
                <th>
                  <TextoEditorial id="nota-muestreo-tabla-poblacion" original={"Población"} />
                </th>
                <th className="w-[30%]">
                  <TextoEditorial id="nota-muestreo-poblacion-participacion" original={"Participación en el total"} />
                </th>
              </tr>
            </thead>
            <tbody>
              {nota.totales.map((t, i) => {
                const { nombre, detalle } = partirEtiqueta(t.etiqueta);
                // Administrativos reúne dos vinculaciones; se muestra cuánto aporta cada una.
                const porVinculacion = new Map<string, number>();
                for (const k of nota.calculos) {
                  if (k.estamento === t.estamento && k.vinculacion) {
                    porVinculacion.set(k.vinculacion, (porVinculacion.get(k.vinculacion) ?? 0) + k.poblacion);
                  }
                }
                return (
                  <tr key={t.estamento}>
                    <td>
                      <span className="flex items-baseline gap-2">
                        <span className="nm-muestra-color" style={{ backgroundColor: COLOR_ESTAMENTO[t.estamento] }} aria-hidden />
                        <span>
                          <span className="font-semibold">{nombre}</span>
                          {detalle ? <span className="nm-nota block">{detalle}</span> : null}
                        </span>
                      </span>
                    </td>
                    <td className="nm-nota">
                      {porVinculacion.size > 0
                        ? [...porVinculacion].map(([v, n]) => `${v} ${entero(n)}`).join(" · ")
                        : "—"}
                    </td>
                    <td className="text-[length:var(--nm-t-4)] font-semibold">
                      <Contador valor={t.poblacion} />
                    </td>
                    <td>
                      <span className="flex items-center gap-3">
                        <BarraCreciente fraccion={t.poblacion / total.poblacion} color={COLOR_ESTAMENTO[t.estamento]} retraso={i * 0.1} />
                        <span className="nm-mono w-14 shrink-0 text-[length:var(--nm-t-0)]">{porcentaje(t.poblacion / total.poblacion)}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <TextoEditorial id="740c1f9e2d6b67bd9ace" original={"Total"} />
                </td>
                <td />
                <td className="text-[length:var(--nm-t-4)]">{entero(total.poblacion)}</td>
                <td />
              </tr>
            </tfoot>
          </table>

          {nota.depuracionGraduados ? <LibroDepuracion depuracion={nota.depuracionGraduados} /> : null}

          {nota.notasPoblacion.length > 0 ? (
            <ol className="nm-pies mt-10 border-t border-[var(--nm-linea)] pt-4">
              {nota.notasPoblacion.filter((n) => !n.startsWith("Excluidos de la población objetivo:")).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </Apartado>
  );
}

/** La depuración de graduados como operación contable: cada resta en su renglón, con filete antes del resultado. */
function LibroDepuracion({ depuracion }: { depuracion: NonNullable<NotaMetodologica["depuracionGraduados"]> }) {
  const [ref, visible] = useAlEntrar<HTMLTableSectionElement>(0.4);
  const filas = [
    {
      signo: "",
      texto: <TextoEditorial id="nota-muestreo-depuracion-registros" original={"Registros de titulación"} />,
      valor: depuracion.registros,
    },
    {
      signo: "−",
      texto: <TextoEditorial id="nota-muestreo-depuracion-repetidos" original={"Documentos repetidos"} />,
      valor: depuracion.repetidos,
    },
    {
      signo: "=",
      texto: <TextoEditorial id="nota-muestreo-depuracion-personas" original={"Personas únicas"} />,
      valor: depuracion.personas,
      resultado: true,
    },
    {
      signo: "−",
      texto: <TextoEditorial id="nota-muestreo-depuracion-fuera" original={"Personas fuera de las unidades con encuentro"} />,
      valor: depuracion.personas - depuracion.enUnidades,
    },
    {
      signo: "=",
      texto: <TextoEditorial id="nota-muestreo-depuracion-unidades" original={"Población de referencia de graduados"} />,
      valor: depuracion.enUnidades,
      resultado: true,
      final: true,
    },
  ];

  return (
    <div className="mt-14 grid grid-cols-[1fr_1.2fr] gap-10">
      <div>
        <h3 className="text-[length:var(--nm-t-3)] leading-tight font-bold">
          <TextoEditorial id="nota-muestreo-poblacion-depuracion-titulo" original={"Graduados: depuración de registros duplicados"} />
        </h3>
        <p className="nm-nota mt-2">
          <TextoEditorial
            id="nota-muestreo-poblacion-depuracion-entrada"
            original={"Se tomó el histórico institucional de todas las cohortes y se depuró para contar una sola vez a cada persona."}
          />
        </p>
      </div>
      <table className="nm-libro">
        <tbody ref={ref}>
          {filas.map((f, i) => (
            <motion.tr
              key={i}
              data-resultado={f.resultado ? "" : undefined}
              data-final={f.final ? "" : undefined}
              initial={{ opacity: 0 }}
              animate={{ opacity: visible ? 1 : 0 }}
              transition={{ duration: 0.4, delay: i * 0.25 }}
            >
              <td>{f.signo}</td>
              <td className="text-[length:var(--nm-t-1)]">{f.texto}</td>
              <td className="nm-cifra">{entero(f.valor)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
