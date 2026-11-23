import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { nombreFormularioDe } from "@/lib/reglas/momento5";
import type { ResultadosMomento5 } from "@/types/momento5";

/**
 * Cierre del relato: qué se descartó al depurar los formularios y cómo se
 * leyeron los datos. No depende del filtro de equipo, así que se renderiza en
 * el servidor.
 */
export function NotasMomento5({ meta }: { meta: ResultadosMomento5["meta"] }) {
  return (
    <section id="notas" aria-labelledby="notas-titulo" className="m5-capitulo scroll-mt-60">
      <div className="m5-reticula items-start gap-y-10">
        <h2 id="notas-titulo" className="m5-titular-2 col-span-12">
          <TextoEditorial id="m5-notas-titulo" original="Qué se depuró" />
        </h2>
        <div className="col-span-6">
          {meta.exclusiones.length ? (
            <ul className="flex flex-col gap-4">
              {meta.exclusiones.map((x, i) => (
                <li key={i} className="m5-texto text-[0.9375rem]">
                  {/* El análisis abrevia el nombre; se muestra el del formulario, igual que en el menú. */}
                  <span className="font-semibold">{x.formulario ? nombreFormularioDe(x.formulario, meta.formularios) : "—"}</span>
                  {x.id_respuesta !== null ? <span className="m5-cifra text-[var(--m5-suave)]"> (ID {x.id_respuesta})</span> : null}.{" "}
                  {x.motivo || "—"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m5-texto">
              <TextoEditorial id="m5-sin-exclusiones" original="No se registraron exclusiones." />
            </p>
          )}
        </div>
        <div className="col-span-6">
          <h3 className="m5-titular-3">
            <TextoEditorial id="m5-notas-metodologicas" original="Cómo se leyeron los datos" />
          </h3>
          <ul className="m5-nota mt-4 flex flex-col gap-3">
            <li>
              <TextoEditorial
                id="m5-nota-correo"
                original="Las respuestas de una misma persona se cruzan entre formularios por su correo institucional, que no se muestra."
              />
            </li>
            <li>
              <TextoEditorial
                id="m5-nota-codificacion"
                original="En el Formulario de Percepción sobre Transformación Digital, las categorías de «Proceso propuesto:» y los tipos de «Dificultad percibida» son una codificación analítica, respuesta por respuesta. Los temas del MEDIT se asignan por palabras clave a «Aspecto prioritario de consolidación del MEDIT:» y «¿Qué debería cambiar o mejorar en la Universidad?», y en la matriz, a sus aspectos y cambios."
              />
            </li>
            <li>
              <TextoEditorial
                id="m5-nota-filtro-equipo"
                original="El filtro de equipo usa la respuesta a «Equipo asignado:» del Formulario Individual de Validación Estratégica. Quien solo aparece en un registro grupal toma el equipo de ese registro."
              />
            </li>
            <li>
              <TextoEditorial
                id="m5-nota-abiertas"
                original="Las preguntas abiertas que el análisis no había clasificado se agrupan con la clasificación automática del portal: TF-IDF sobre las palabras y K-Means, con el número de temas elegido por silueta. Cada tema toma el nombre de sus términos más característicos."
              />
            </li>
            {meta.generado ? (
              <li>
                <TextoEditorial id="m5-nota-generado" original="Datos generados el" /> {meta.generado}.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
