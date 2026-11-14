'use client';
import { useState } from 'react';
import { useFuenteActualizable } from '@/hooks/use-fuente-actualizable';
import { AvisoActualizacion } from '@/components/layout/aviso-actualizacion';
import { TextoEditorial } from '@/components/editorial/texto-editorial';
import { AportesGenerales } from '@/components/transformaciones/aportes-generales';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { actorConversatorio } from '@/lib/reglas/conversatorios';
import type { getVistaConversatorios } from '@/repositories/conversatoriosRepository';

export function PanelConversatorios({ inicial }: { inicial: Awaited<ReturnType<typeof getVistaConversatorios>> }) {
  const { datos, error } = useFuenteActualizable(inicial, '/api/datos/conversatorios');
  const [archivo, setArchivo] = useState(inicial.documentos.find(d => d.general)!.archivo);
  const [actor, setActor] = useState('__todos__');
  const documento = datos.documentos.find(d => d.archivo === archivo) ?? datos.documentos.find(d => d.general)!;
  const actores = [...new Set(documento.diapositivas.flatMap(s => s.grupos.map(g => actorConversatorio(g.nombre))))];
  const seleccionado = actores.includes(actor) ? actor : '__todos__';
  return <div className="flex min-w-0 flex-col gap-6">
    {error ? <AvisoActualizacion/> : null}
    <section className="rounded-xl border bg-card p-5" aria-label="Filtros de conversatorios">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex min-w-64 flex-1 flex-col gap-2"><span><TextoEditorial id="conversatorios-unidad" original="Unidad regional"/></span>
          <Select value={documento.archivo} onValueChange={v => { if (v) { setArchivo(v); setActor('__todos__'); } }}>
            <SelectTrigger aria-label="Unidad regional de conversatorios" className="w-full"><SelectValue>{documento.unidad}</SelectValue></SelectTrigger>
            <SelectContent>{[...datos.documentos].sort((a,b) => Number(b.general)-Number(a.general)).map(d => <SelectItem key={d.archivo} value={d.archivo}>{d.unidad}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="flex min-w-72 flex-1 flex-col gap-2"><span><TextoEditorial id="conversatorios-grupo" original="Grupo de interés"/></span>
          <Select value={seleccionado} onValueChange={v => setActor(v ?? '__todos__')}>
            <SelectTrigger aria-label="Grupo de interés de conversatorios" className="w-full"><SelectValue>{seleccionado === '__todos__' ? <TextoEditorial id="conversatorios-todos" original="Todos"/> : seleccionado}</SelectValue></SelectTrigger>
            <SelectContent><SelectItem value="__todos__">Todos</SelectItem>{actores.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </label>
      </div>
      <p className="mt-4 text-sm text-muted-foreground"><TextoEditorial id="conversatorios-sintesis-nota" original="Síntesis documental de los conversatorios con el Rector. Los planteamientos conservan la redacción y el alcance de las presentaciones."/></p>
    </section>
    {documento.diapositivas.map(slide => <section key={documento.archivo + slide.numero} className="rounded-xl border bg-card p-6" aria-labelledby={'slide-' + slide.numero}>
      <h2 id={'slide-' + slide.numero} className="text-2xl font-semibold text-foreground">{slide.titulo}</h2>
      <p className="mb-6 mt-2 text-muted-foreground">{slide.descripcion}</p>
      {slide.grupos.length ? <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">{slide.grupos.filter(g => seleccionado === '__todos__' || actorConversatorio(g.nombre) === seleccionado).map(g => <article key={g.nombre} className="rounded-lg border border-primary/15 bg-primary/5 p-5">
        <h3 className="mb-3 font-semibold text-primary">{g.nombre}</h3><ul className="list-disc space-y-3 pl-5">{g.planteamientos.map((t,i) => <li key={i} className="leading-relaxed">{t}</li>)}</ul>
      </article>)}</div> : <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">{slide.solicitudes.filter(s => documento.general || seleccionado === '__todos__' || actorConversatorio(s.ambito) === seleccionado).map((s,i) => <article key={i} className="rounded-lg border p-5">
        <h3 className="font-semibold text-foreground">{s.titulo}</h3><p className="my-2 text-sm font-medium text-primary">{s.ambito}</p><p className="leading-relaxed">{s.descripcion}</p>
      </article>)}</div>}
      {documento.general && seleccionado !== '__todos__' && slide.solicitudes.length ? <p className="mt-4 text-sm text-muted-foreground"><TextoEditorial id="conversatorios-solicitudes-generales" original="La síntesis general de solicitudes agrupa unidades regionales; no desglosa cada tema por grupo de interés."/></p> : null}
      {!documento.general && slide.solicitudes.length && seleccionado !== '__todos__' && !slide.solicitudes.some(s => actorConversatorio(s.ambito) === seleccionado) ? <p role="status" className="rounded-lg bg-muted/40 p-4"><TextoEditorial id="conversatorios-sin-solicitudes-grupo" original="Esta diapositiva no detalla solicitudes estratégicas para el grupo seleccionado. Sus planteamientos pueden consultarse en el apartado anterior."/></p> : null}
      {slide.notas.map((t,i) => <p key={i} className="mt-4 leading-relaxed">{t}</p>)}
      <footer className="mt-6 border-t pt-4 text-sm text-muted-foreground"><p>{slide.pie}</p><a className="mt-2 inline-block text-primary underline underline-offset-4" href={'/api/conversatorios/fuentes/' + encodeURIComponent(documento.archivo)}><TextoEditorial id="conversatorios-consultar-fuente" original="Consultar presentación"/> · <TextoEditorial id="conversatorios-diapositiva" original="diapositiva"/> {slide.numero}</a></footer>
    </section>)}
    <section aria-labelledby="titulo-aportes-generales" className="rounded-xl border px-4 py-5">
      <h2 id="titulo-aportes-generales" className="text-2xl font-semibold"><TextoEditorial id="b846cb38d3fd8d95d8d1" original="Aportes generales al Plan — formulario independiente"/></h2>
      <p className="my-3 text-muted-foreground"><TextoEditorial id="conversatorios-aportes-separados" original="Respuestas del formulario «Comparte aquí tu aporte». Se consultan por separado de la síntesis documental de los conversatorios."/></p>
      <AportesGenerales aportes={datos.aportes}/>
    </section>
  </div>;
}
