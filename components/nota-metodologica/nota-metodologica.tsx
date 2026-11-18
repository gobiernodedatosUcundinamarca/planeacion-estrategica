"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { NotaMetodologica } from "@/types/nota-metodologica";
import { EscenaAlcance } from "./escena-alcance";
import { EscenaAsistencia } from "./escena-asistencia";
import { EscenaCenso } from "./escena-censo";
import { EscenaCuatroCifras } from "./escena-cuatro-cifras";
import { EscenaFormula } from "./escena-formula";
import { EscenaParametros } from "./escena-parametros";
import { EscenaPoblacion } from "./escena-poblacion";
import { EscenaPortada } from "./escena-portada";
import { EscenaTope } from "./escena-tope";

type PropsEscena = { nota: NotaMetodologica; numero: number; titulo: ReactNode; enlace: ReactNode | null };

interface Capitulo {
  id: string;
  titulo: ReactNode;
  /** La frase de enlace con el apartado anterior. */
  puente: ReactNode | null;
  Escena: (props: PropsEscena) => ReactNode;
  /** Un apartado sin datos que exponer (p. ej. ningún tope) se omite y se renumera el resto. */
  aplica: (nota: NotaMetodologica) => boolean;
}

const CAPITULOS: Capitulo[] = [
  {
    id: "escena-poblacion",
    titulo: <TextoEditorial id="nota-muestreo-cap-poblacion" original={"Población de referencia"} />,
    puente: null,
    Escena: EscenaPoblacion,
    aplica: () => true,
  },
  {
    id: "escena-cifras",
    titulo: <TextoEditorial id="nota-muestreo-cap-cifras" original={"Las cuatro cifras del proceso"} />,
    puente: (
      <TextoEditorial
        id="nota-muestreo-puente-cifras"
        original={"Definida la población de referencia, el paso siguiente fue determinar cuántas personas convocar en cada estrato."}
      />
    ),
    Escena: EscenaCuatroCifras,
    aplica: () => true,
  },
  {
    id: "escena-formula",
    titulo: <TextoEditorial id="nota-muestreo-cap-formula" original={"Cálculo del tamaño de muestra"} />,
    puente: (
      <TextoEditorial
        id="nota-muestreo-puente-formula"
        original={"La muestra calculada resulta de una fórmula estadística estándar, que se expone a continuación."}
      />
    ),
    Escena: EscenaFormula,
    aplica: (nota) => nota.calculos.length > 0,
  },
  {
    id: "escena-parametros",
    titulo: <TextoEditorial id="nota-muestreo-cap-parametros" original={"Parámetros de planificación"} />,
    puente: (
      <TextoEditorial
        id="nota-muestreo-puente-parametros"
        original={"La fórmula depende de tres parámetros fijados antes de la convocatoria."}
      />
    ),
    Escena: EscenaParametros,
    aplica: () => true,
  },
  {
    id: "escena-censo",
    titulo: <TextoEditorial id="nota-muestreo-cap-censo" original={"Convocatoria total en estratos pequeños"} />,
    puente: (
      <TextoEditorial
        id="nota-muestreo-puente-censo"
        original={"En los estratos de menor tamaño se aplicó una regla complementaria."}
      />
    ),
    Escena: EscenaCenso,
    aplica: (nota) => nota.calculos.some((k) => k.censo),
  },
  {
    id: "escena-tope",
    titulo: <TextoEditorial id="nota-muestreo-cap-tope" original={"Ajuste por capacidad logística"} />,
    puente: <TextoEditorial id="nota-muestreo-puente-tope" original={"En algunos casos, la convocatoria debió ajustarse a restricciones logísticas."} />,
    Escena: EscenaTope,
    aplica: (nota) => nota.estratos.some((e) => e.topeLogistico !== null),
  },
  {
    id: "escena-asistencia",
    titulo: <TextoEditorial id="nota-muestreo-cap-asistencia" original={"Asistencia registrada"} />,
    puente: (
      <TextoEditorial id="nota-muestreo-puente-asistencia" original={"Realizada la convocatoria, se registró la asistencia efectiva a las mesas."} />
    ),
    Escena: EscenaAsistencia,
    aplica: () => true,
  },
  {
    id: "escena-alcance",
    titulo: <TextoEditorial id="nota-muestreo-cap-alcance" original={"Alcance e interpretación de los resultados"} />,
    puente: (
      <TextoEditorial
        id="nota-muestreo-puente-alcance"
        original={"Con estas cifras es posible precisar el alcance y los límites de los resultados."}
      />
    ),
    Escena: EscenaAlcance,
    aplica: () => true,
  },
];

/**
 * La nota metodológica como expediente en dos columnas: apertura construida
 * sobre la cifra de la población y la matriz de metas, apartados con la
 * evidencia en la columna principal y las fuentes al margen, y una síntesis.
 * Las animaciones respetan «reducir movimiento» del sistema operativo.
 */
export function NotaMetodologicaPanel({ nota }: { nota: NotaMetodologica }) {
  const capitulos = CAPITULOS.filter((c) => c.aplica(nota));

  return (
    <MotionConfig reducedMotion="user">
      <article className="nm">
        <EscenaPortada nota={nota} indice={capitulos.map(({ id, titulo }) => ({ id, titulo }))} />
        {capitulos.map(({ id, titulo, puente, Escena }, i) => (
          <Escena key={id} nota={nota} numero={i + 1} titulo={titulo} enlace={puente} />
        ))}
      </article>
    </MotionConfig>
  );
}
