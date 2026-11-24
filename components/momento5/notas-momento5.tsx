import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { nombreFormularioDe } from "@/lib/reglas/momento5";
import type { ResultadosMomento5 } from "@/types/momento5";

/**
 * Cierre del relato: qué se descartó al depurar los formularios. No depende
 * del filtro de equipo, así que se renderiza en el servidor.
 */
export function NotasMomento5({ meta }: { meta: ResultadosMomento5["meta"] }) {
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
      </div>
    </section>
  );
}
