"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumero } from "@/lib/formatters";
import { indicePorId, type DerivadosMomento5 } from "@/lib/reglas/momento5";
import type { EquipoMomento5, MatrizEquipo, ResultadosMomento5 } from "@/types/momento5";
import { EstadoVacio, FiltroCategoria, Fuente, TablaSimple, Tarjeta } from "./piezas";

/**
 * Las respuestas individuales sobre el MEDIT, completas. El tema lo controla el
 * capítulo: elegir una barra del ranking en el relato filtra esta lista.
 */
export function VocesMedit({ d, tema, setTema }: { d: DerivadosMomento5; tema: string | null; setTema: (id: string | null) => void }) {
  const n = d.consolidacion.length;
  const voces = d.consolidacion.filter((c) => !tema || c.temas.includes(tema));
  const nombreTema = Object.fromEntries(d.temas.map((t) => [t.id, t.label]));

  return (
    <div className="flex flex-col">
      <Tarjeta
        titulo={
          tema ? (
            <>
              <TextoEditorial id="m5-voces-tema" original="Respuestas con el tema:" /> {nombreTema[tema] ?? tema}
            </>
          ) : (
            "Respuestas de los participantes"
          )
        }
        pie={
          <Fuente
            id="m5-fuente-medit-voces"
            original="respuestas tal como se escribieron en el Formulario Individual de Consolidación del MEDIT. Bajo cada aspecto: «Nombre Completo:», «Rol o vinculación institucional:» y «Sede o seccional:». El filtro de tema usa la asignación por palabras clave de la gráfica anterior."
          />
        }
        descripcion={
          <>
            {formatNumero(voces.length)} <TextoEditorial id="m5-de" original="de" /> {formatNumero(n)}{" "}
            <TextoEditorial
              id="m5-voces-descripcion"
              original="respuestas a «Aspecto prioritario de consolidación del MEDIT:» y «¿Qué debería cambiar o mejorar en la Universidad?»"
            />
          </>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <FiltroCategoria etiqueta="Tema" items={d.temas} valor={tema} onCambiar={setTema} ancho="w-72" />
          {tema ? (
            <Button variant="ghost" size="sm" onClick={() => setTema(null)}>
              <X className="size-3.5" aria-hidden />
              <TextoEditorial id="m5-ver-todas" original="Ver todas" />
            </Button>
          ) : null}
        </div>
        <div className="flex max-h-[470px] flex-col gap-3 overflow-y-auto pr-1" tabIndex={0} aria-label="Respuestas de los participantes">
          {voces.map((v) => (
            <article key={v.pid} className="flex flex-col gap-1 border-t border-[var(--m5-linea)] pt-3 text-sm">
              <p className="text-foreground">{v.aspecto ?? "—"}</p>
              <p className="m5-nota">{[v.nombre, v.rol, v.sede].filter(Boolean).join(", ")}</p>
              {v.cambio ? (
                <p className="text-[var(--m5-suave)]">
                  <b className="text-foreground">
                    <TextoEditorial id="m5-que-cambiar" original="¿Qué debería cambiar o mejorar en la Universidad?" />
                  </b>{" "}
                  {v.cambio}
                </p>
              ) : null}
            </article>
          ))}
          {!voces.length ? <EstadoVacio>Sin respuestas para este filtro.</EstadoVacio> : null}
        </div>
      </Tarjeta>
    </div>
  );
}

const COLUMNAS_MATRIZ = [
  { campo: "aspectos", id: "m5-matriz-aspectos", titulo: "¿Qué aspectos del MEDIT debemos consolidar?" },
  { campo: "cambios", id: "m5-matriz-cambios", titulo: "¿Qué cambios esperamos lograr?" },
  { campo: "indicadores", id: "m5-matriz-indicadores", titulo: "¿Cómo sabremos que los hemos logrado?" },
] as const;

function ContenidoMatriz({
  m,
  info,
  nombreT,
  nombreTema,
}: {
  m: MatrizEquipo;
  info: EquipoMomento5 | undefined;
  nombreT: Record<string, string>;
  nombreTema: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <strong className="text-base text-foreground">
          <TextoEditorial id="m5-equipo" original="Equipo" /> {m.equipo}
        </strong>
        {info?.transformaciones.length ? (
          <p className="m5-nota">{info.transformaciones.map((t) => nombreT[t] ?? t).join(" y ")}.</p>
        ) : null}
        {m.temas.length ? (
          <p className="m5-nota">
            <TextoEditorial id="m5-matriz-temas" original="Temas identificados:" /> {m.temas.map((t) => (nombreTema[t] ?? t).toLowerCase()).join("; ")}.
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-8">
        {COLUMNAS_MATRIZ.map((col) => (
          <div key={col.campo} className="flex flex-col gap-2 border-t border-[var(--m5-filete)] pt-3">
            <h4 className="text-[13px] font-semibold text-foreground">
              <TextoEditorial id={col.id} original={col.titulo} />
            </h4>
            {m[col.campo].length ? (
              <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-xs text-foreground">
                {m[col.campo].map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </div>
        ))}
      </div>
      {m.integrantes ? (
        <p className="text-xs text-muted-foreground">
          <TextoEditorial id="m5-integrantes-registrados" original="Integrantes del equipo:" /> {m.integrantes.replace(/\n/g, "; ")}
        </p>
      ) : null}
    </div>
  );
}

/** Matriz grupal: qué consolidar del MEDIT, qué cambios se esperan y cómo se sabrá que se lograron. */
export function MatrizColaborativa({ d, datos }: { d: DerivadosMomento5; datos: ResultadosMomento5 }) {
  const [local, setLocal] = useState<number>(datos.matriz[0]?.equipo ?? 1);
  const equipo = d.eq ?? local;
  const m = datos.matriz.find((x) => x.equipo === equipo);
  const info = datos.equipos.find((x) => x.equipo === equipo);
  const nombreT = Object.fromEntries(datos.transformaciones.map((t) => [t.id, t.nombre]));
  const nombreTema = indicePorId(datos.catalogos.temasMedit);

  const contenido = m ? (
    <ContenidoMatriz m={m} info={info} nombreT={nombreT} nombreTema={nombreTema} />
  ) : (
    <EstadoVacio>Este equipo no registró matriz.</EstadoVacio>
  );

  return (
    <Tarjeta
      titulo="Matriz de construcción colaborativa del MEDIT"
      descripcion="Respuestas completas de cada equipo a las tres preguntas de la matriz."
      pie={
        <Fuente
          id="m5-fuente-matriz"
          original="Matriz de Construcción Colaborativa y Acuerdos del MEDIT, un registro por equipo («Equipo numero:»). Cada respuesta se dividió en puntos por salto de línea, sin la numeración ni las viñetas originales. «Temas identificados» aplica las palabras clave del Formulario Individual de Consolidación del MEDIT a los aspectos y los cambios."
        />
      }
      tabla={
        <TablaSimple
          encabezados={["Equipo", "¿Qué aspectos del MEDIT debemos consolidar?", "¿Qué cambios esperamos lograr?", "¿Cómo sabremos que los hemos logrado?"]}
          filas={d.matriz.map((x) => [`${x.equipo}`, x.aspectos.join(" · "), x.cambios.join(" · "), x.indicadores.join(" · ")])}
          alto="max-h-[560px]"
        />
      }
    >
      {d.eq === null && datos.matriz.length ? (
        <Tabs value={String(equipo)} onValueChange={(v) => setLocal(Number(v))}>
          <TabsList variant="line" aria-label="Equipo de la matriz">
            {datos.matriz.map((x) => (
              <TabsTrigger key={x.equipo} value={String(x.equipo)} className="px-2.5">
                <TextoEditorial id="m5-eq-abreviado" original="Eq." /> {x.equipo}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={String(equipo)} className="pt-3">
            {contenido}
          </TabsContent>
        </Tabs>
      ) : (
        contenido
      )}
    </Tarjeta>
  );
}
