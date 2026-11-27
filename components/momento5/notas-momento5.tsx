import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { nombreFormularioDe } from "@/lib/reglas/momento5";
import type { ResultadosMomento5 } from "@/types/momento5";
import type { ArchivoActividad2 } from "@/types/momento5-actividad2";

/**
 * Cierre del relato: qué se descartó al depurar los formularios y, de la
 * Actividad 2, qué archivos llegaron y cuál se usó de cada mesa. No depende del filtro de equipo, así que se
 * renderiza en el servidor.
 */
export function NotasMomento5({ meta, archivosActividad2 }: { meta: ResultadosMomento5["meta"]; archivosActividad2: ArchivoActividad2[] }) {
  return (
    <section id="notas" aria-labelledby="notas-titulo" className="m5-capitulo scroll-mt-60">
      <div className="m5-reticula items-start gap-y-10">
        <h2 id="notas-titulo" className="m5-titular-2 col-span-12">
          <TextoEditorial id="m5-notas-titulo" original="Qué se depuró" />
        </h2>
        <div className="col-span-12">
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
        {archivosActividad2.length ? (
          <div className="col-span-12 flex flex-col gap-4">
            <h3 className="m5-titular-3">
              <TextoEditorial id="m5-a2-archivos-titulo" original="Actividad 2: archivos recibidos" />
            </h3>
            <p className="m5-texto text-[0.9375rem] text-[var(--m5-suave)]">
              <TextoEditorial
                id="m5-a2-archivos-entrada"
                original="Las fichas llegaron como presentaciones, PDF, texto e imágenes, y se pasaron a un solo libro de Excel."
              />
            </p>
            <table className="m5-tabla text-[0.875rem]">
              <thead>
                <tr>
                  <th className="w-[30%]">
                    <TextoEditorial id="m5-a2-archivos-archivo" original="Archivo" />
                  </th>
                  <th className="w-[6%]">
                    <TextoEditorial id="m5-a2-mesa" original="Mesa" />
                  </th>
                  <th className="w-[12%]">
                    <TextoEditorial id="m5-a2-archivos-uso" original="Uso" />
                  </th>
                  <th>
                    <TextoEditorial id="m5-a2-archivos-nota" original="Nota" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {archivosActividad2.map((a) => (
                  <tr key={a.archivo}>
                    <td className="break-words">{a.archivo}</td>
                    <td className="m5-cifra">{a.mesa ?? "—"}</td>
                    <td>{a.uso}</td>
                    <td className="text-[var(--m5-suave)]">{a.nota ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
