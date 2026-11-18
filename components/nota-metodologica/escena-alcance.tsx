"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { NotaMetodologica } from "@/types/nota-metodologica";
import { Apartado, SUAVIZADO, useAlEntrar } from "./piezas";

type Props = { nota: NotaMetodologica; numero: number; titulo: ReactNode; enlace: ReactNode | null };

/** Cierre de la nota: las tres conclusiones principales, a cuerpo de entradilla y separadas por filetes. */
export function EscenaAlcance({ numero, titulo, enlace }: Props) {
  const frases = [
    <TextoEditorial
      key="1"
      id="nota-muestreo-epilogo-1"
      original={"El tamaño de muestra se calculó para cada combinación de unidad regional y estamento, de modo que cada unidad contara con representación propia."}
    />,
    <TextoEditorial
      key="2"
      id="nota-muestreo-epilogo-2"
      original={"La meta se ajustó en dos casos: los estratos pequeños se convocaron en su totalidad y la capacidad de un auditorio limitó la convocatoria."}
    />,
    <TextoEditorial
      key="3"
      id="nota-muestreo-epilogo-3"
      original={"La asistencia efectiva condiciona el alcance de cada resultado: donde fue baja, las conclusiones deben interpretarse con cautela."}
    />,
  ];
  const [ref, visible] = useAlEntrar<HTMLOListElement>(0.4);

  return (
    <Apartado id="escena-alcance" numero={numero} titulo={titulo} enlace={enlace}>
      <div className="nm-reticula">
        <div className="nm-principal">
          <ol ref={ref} className="border-t border-[var(--nm-tinta)]">
            {frases.map((frase, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: 0.6, delay: i * 0.2, ease: SUAVIZADO }}
                className="grid grid-cols-[3rem_1fr] items-baseline border-b border-[var(--nm-linea)] py-5"
              >
                <span className="nm-mono text-[var(--nm-gris)]">{String(i + 1).padStart(2, "0")}</span>
                <p className="max-w-[48ch] text-[length:var(--nm-t-3)] leading-snug">{frase}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </Apartado>
  );
}
