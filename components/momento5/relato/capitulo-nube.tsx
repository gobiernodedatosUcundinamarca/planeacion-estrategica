"use client";

import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { formatNumero } from "@/lib/formatters";
import type { FiltroEquipo } from "@/lib/reglas/momento5";
import type { InstrumentoActividad2, NubeActividad2 } from "@/types/momento5-actividad2";
import { NubeFrases } from "../nube-frases";
import { LineaFuente } from "../piezas";
import { Capitulo, Pregunta } from "./capitulo";

/**
 * Un instrumento de Mentimeter de la Actividad 2 (la pregunta inicial o el
 * registro de aprendizajes): la pregunta tal como se proyectó y la nube con
 * todas las frases. Mentimeter no registra quién escribió cada una, así que el
 * filtro de equipo no la recorta.
 */
export function CapituloNube({
  instrumento,
  nube,
  equipo,
}: {
  instrumento: InstrumentoActividad2;
  nube: NubeActividad2 | undefined;
  equipo: FiltroEquipo;
}) {
  const total = nube?.frases.length ?? 0;
  return (
    <Capitulo
      id={instrumento.id}
      titulo={instrumento.nombre}
      equipo={equipo}
      ficha={
        <>
          {instrumento.instrumento} · <TextoEditorial id="m5-a2-actividad" original="Actividad 2." /> {instrumento.medio}:{" "}
          <span className="m5-cifra">{formatNumero(total)}</span> <TextoEditorial id="m5-a2-ficha-frases" original="frases, sin nombre ni equipo." />
        </>
      }
    >
      {nube && total ? (
        <div className="mt-10 flex flex-col gap-4">
          <Pregunta>{nube.pregunta}</Pregunta>
          {equipo !== null ? (
            <p className="m5-nota">
              <TextoEditorial
                id="m5-a2-nube-sin-filtro"
                original="Mentimeter no registra quién escribió cada frase: con el filtro de equipo se siguen mostrando todas."
              />
            </p>
          ) : null}
          <NubeFrases frases={nube.frases} etiqueta={nube.pregunta} />
          <LineaFuente
            id="m5-a2-fuente-nube"
            original="nube de Mentimeter de la Actividad 2, transcrita de la imagen. Mentimeter no entrega conteos: el tamaño de cada frase reproduce el de la imagen en tres niveles (grande, mediano y pequeño). Las frases van tal como se escribieron, también las que Mentimeter cortó al dibujarlas."
          />
          {nube.omitidas.length ? (
            <p className="m5-nota">
              {nube.omitidas.map((o) => (
                <span key={o.frase}>
                  <TextoEditorial id="m5-a2-nube-omitida" original="Se omite" /> «{o.frase}»: {o.motivo}{" "}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="m5-entradilla mt-10 text-[var(--m5-suave)]">
          <TextoEditorial id="m5-a2-nube-vacia" original="No hay frases transcritas para este instrumento." />
        </p>
      )}
    </Capitulo>
  );
}
