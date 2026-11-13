'use client';

import {TextoEditorial,TextoEditorialCompuesto,EtiquetaEditorial,LapizDeCatalogo} from "@/components/editorial/texto-editorial";
import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Atlas } from './atlas';
import { Jornadas } from './jornadas';
import { useEscena } from './use-escena';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { formato, porcentaje, capitulos, type DatosNarrativos } from './modelo';
export function Vista({ children, datosNarrativos }: {
    children: React.ReactNode;
    datosNarrativos: DatosNarrativos;
}) {
    const {resumen,jornadasRegionales,rolPrincipal,documento:fuente} = datosNarrativos;
const unidades=fuente.filas, unidadesPorAsistencia=[...unidades].sort((a,b)=>b.asistentes-a.asistentes);
const convocados=unidades.reduce((s,r)=>s+r.convocados,0),asistentes=unidades.reduce((s,r)=>s+r.asistentes,0);
    const [modo, setModo] = useState('narrativa'), [reducido, setReducido] = useState(false), [compacto, setCompacto] = useState(false), [pausa, setPausa] = useState(false), [unidad, setUnidad] = useState('Todas'), [capitulo, setCapitulo] = useState(0);
    useEffect(() => {
        const motion = matchMedia('(prefers-reduced-motion: reduce)');
        const small = matchMedia('(max-width: 760px)');
        const short = matchMedia('(max-height: 620px)');
        function change() {
            const nav = navigator as Navigator & { connection?: { saveData: boolean } };
            setReducido(motion.matches || !!nav.connection?.saveData ||
                (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency < 4));
            setCompacto(document.documentElement.classList.contains('forzar-escritorio') || small.matches || short.matches);
        }
        change();
        const queries = [motion, small, short];
        queries.forEach(query => query.addEventListener('change', change));
        window.addEventListener('resize', change);
        window.addEventListener('orientationchange', change);
        return () => {
            queries.forEach(query => query.removeEventListener('change', change));
            window.removeEventListener('resize', change);
            window.removeEventListener('orientationchange', change);
        };
    }, []);
    const esencial = modo !== 'narrativa' || reducido || compacto;
    const { ref, paso, nivel } = useEscena(esencial, pausa);
    const filas = unidadesPorAsistencia.filter(r => unidad === 'Todas' || r.unidad === unidad);
    const c = filas.reduce((s, r) => s + r.convocados, 0), a = filas.reduce((s, r) => s + r.asistentes, 0);
    function ir(i: number) { setCapitulo(i); document.getElementById(capitulos[i].id)?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' }); }
    return <div className={`experiencia modo-${modo}`} data-motion={esencial ? 'esencial' : nivel}>
 <span className="accion-editorial"><a className="saltar" href="#seguimiento"><EtiquetaEditorial texto="Saltar a filtros, gráficos y registros"/></a><LapizDeCatalogo texto="Saltar a filtros, gráficos y registros"/></span>
 <div className="barra-participacion"><div className="fila-navegacion-participacion"> <nav className="indice" aria-label="Capítulos de la presentación">{capitulos.map((s, i) => <span key={s.id} className="accion-editorial"><a href={`#${s.id}`} onClick={() => setCapitulo(i)}>
        <span>{String(i + 1).padStart(2, '0')}</span><EtiquetaEditorial texto={s.nombre}/></a><LapizDeCatalogo texto={s.nombre}/></span>)}</nav><details className="preferencias-presentacion"><summary aria-label="Opciones de presentación"><SlidersHorizontal size={16} aria-hidden="true"/><EtiquetaEditorial texto="Presentación"/></summary><div className="menu-presentacion"><p><TextoEditorial id="participacion-menu-presentacion" original="Modo de presentación"/></p>    <div className="modos" role="group" aria-label="Modo de presentación">{[['narrativa', 'Narrativa'], ['lectura', 'Baja animación'], ['reunion', 'Reunión']].map(([id, label]) => <span key={id} className="accion-editorial"><button aria-pressed={modo === id} onClick={e => {setModo(id);e.currentTarget.closest("details")?.removeAttribute("open")}}><EtiquetaEditorial texto={label}/></button><LapizDeCatalogo texto={label}/></span>)}</div></div></details><LapizDeCatalogo texto="Presentación"/></div>
 {modo === 'reunion' ? <div className="controles-reunion" role="group" aria-label="Control de reunión">
        <span className="accion-editorial"><button onClick={() => ir(Math.max(0, capitulo - 1))} disabled={capitulo === 0}><EtiquetaEditorial texto="← Anterior"/></button><LapizDeCatalogo texto="← Anterior"/></span>
        <span>{capitulo + 1} / {capitulos.length} · <EtiquetaEditorial texto={capitulos[capitulo].nombre}/></span>
        <span className="accion-editorial"><button onClick={() => ir(Math.min(capitulos.length - 1, capitulo + 1))} disabled={capitulo === capitulos.length - 1}><EtiquetaEditorial texto="Siguiente →"/></button><LapizDeCatalogo texto="Siguiente →"/></span>
        <span className="accion-editorial"><button onClick={() => window.print()}><EtiquetaEditorial texto="Imprimir informe"/></button><LapizDeCatalogo texto="Imprimir informe"/></span>
        </div> : null}
 </div>
 <div className="contenido-narrativo">
 <section id="apertura" className="apertura">
    <p className="folio"><TextoEditorial id="e6a4d21f47539bd3b032" original={"TRABAJO EN TERRITORIO CON LA COMUNIDAD UNIVERSITARIA"}/></p>
    <div className="portada-composicion">
    <div>
    <h1><TextoEditorial id="64faed2db00866290e02" original={"Del llamado"}/><br />al <em><TextoEditorial id="e0a1e1bc81e6e0535304" original={"encuentro."}/></em>
    </h1>
    <p className="bajada"><TextoEditorial id="ae75bd20be30b02b1ca3" original={"Experiencia «Transformaciones que nos conectan»"}/><br /><TextoEditorial id="ddb4467adc317844fe7d" original={"Participación · Universidad de Cundinamarca"}/></p>
    <p className="pregunta"><TextoEditorial id="9fe0e52f0807bc04de6b" original={"¿Qué nos dice la asistencia sobre el alcance de la convocatoria?"}/></p>
    </div>
    <div className="cifra-portada">
    <span className="numero-portada">{formato(resumen.registros)}</span>
    <span><TextoEditorial id="dac29f4368cf485e2161" original={"registros de asistencia"}/></span>
    <p>
    <b>{resumen.jornadas}</b> <TextoEditorial id="fc1f75164b0d4335a820" original={"jornadas"}/> <span className="separador">/</span> <b>{resumen.unidades}</b> <TextoEditorial id="6c9d53b748cb7d05859d" original={"unidades regionales"}/></p>
    <small><TextoEditorial id="3c90c9d967b89c2e666b" original={"Registros de jornadas; no equivalen necesariamente a personas únicas."}/></small>
    </div>
    </div>
    <div className="pie-portada">
    <span><TextoEditorial id="0e3063bfd63c95aba10b" original={"Participación de la comunidad universitaria"}/></span>
    <span className="accion-editorial"><a href="#atlas"><EtiquetaEditorial texto="Explorar el alcance"/><span aria-hidden>↓</span>
    </a><LapizDeCatalogo texto="Explorar el alcance"/></span>
    <span className="accion-editorial"><a href="#seguimiento"><EtiquetaEditorial texto="Ir directamente al detalle ↗"/></a><LapizDeCatalogo texto="Ir directamente al detalle ↗"/></span>
    </div>
    </section>
 <section ref={ref} id="atlas" className={`escena-atlas ${pausa ? 'en-pausa' : ''}`} data-motor={nivel} data-compacta={compacto} aria-labelledby="titulo-atlas">
 <div className="argumento">
    <article className={`paso-narrativo ${paso === 0 ? 'paso-activo' : ''}`} data-paso="0">
    <div className="texto-paso">
    <p className="folio"><TextoEditorial id="80baf7c23b106a2b05e7" original={"01 / EL ALCANCE DOCUMENTADO"}/></p>
    <h2 id="titulo-atlas"><TextoEditorial id="d282aa0cd2026f7d51f3" original={"Convocatoria en"}/><br /><TextoEditorial id="cc69188ffcfa103705ce" original={"siete unidades regionales."}/></h2>
    <p><TextoEditorial id="7eb89d9f2232a90b39b7" original={"Las presentaciones registran"}/> <strong>{formato(convocados)}</strong> <TextoEditorial id="880b3c1275f066edb1b9" original={"personas convocadas. Cada círculo representa una unidad regional."}/></p>
    <p className="margen"><TextoEditorial id="5b6ec4e8ccf15c3b4b18" original={"La ubicación de los círculos es ilustrativa y no representa distancias geográficas."}/></p>
    <span className="accion-editorial"><a href="#inspeccion"><EtiquetaEditorial texto="Consultar cifras por unidad ↗"/></a><LapizDeCatalogo texto="Consultar cifras por unidad ↗"/></span>
    </div>
    {compacto ? <PlanoDePaso etapa="convocatoria" unidades={unidades} seleccion={unidad} onElegir={setUnidad}/> : null}
    </article>
 <article className={`paso-narrativo ${paso === 1 ? 'paso-activo' : ''}`} data-paso="1">
    <div className="texto-paso">
    <p className="folio"><TextoEditorial id="85bd5b6b76f05e106438" original={"02 / DE LA CONVOCATORIA A LA ASISTENCIA"}/></p>
    <h2><TextoEditorial id="050c1ca5668e11796784" original={"Convocatoria"}/><br /><TextoEditorial id="708cb9214dde9596a943" original={"y asistencia por unidad."}/></h2>
    <p><TextoEditorial id="4afad3ad65f5905b77fd" original={"Las barras comparan la convocatoria y la asistencia en cada unidad regional, con un total de"}/> <strong>{formato(asistentes)} <TextoEditorial id="4067e37f24724480ff77" original={"asistentes documentados"}/></strong>.</p>
    <p><TextoEditorial id="595f76ff5e2296d6c751" original={"Las unidades están ordenadas por número de asistentes. El porcentaje se calcula sobre las personas convocadas en cada unidad."}/></p>
    </div>
    {compacto ? <PlanoDePaso etapa="asistencia" unidades={unidades} seleccion={unidad} onElegir={setUnidad}/> : null}
    </article>
 <article className={`paso-narrativo ${paso === 2 ? 'paso-activo' : ''}`} data-paso="2">
    <p className="folio"><TextoEditorial id="7bdef54936a725292b77" original={"03 / ASISTENCIA EFECTIVA"}/></p>
    <h2>{porcentaje(asistentes, convocados)} %<br />
    <em><TextoEditorial id="29cb018d643a14e4b163" original={"asistencia efectiva."}/></em>
    </h2>
    <p>{formato(asistentes)} de {formato(convocados)} <TextoEditorial id="c063036dd96ca2972007" original={"en el mismo corte documental. La diferencia aritmética es"}/> <strong>{formato(convocados - asistentes)}</strong>.</p>
    <p className="margen"><TextoEditorial id="33d86558b1c884733b2f" original={"Porcentaje de asistencia: asistentes divididos entre convocados, expresado con un decimal."}/></p>
    <span className="accion-editorial"><a href="#inspeccion"><EtiquetaEditorial texto="Revisar unidades y fuentes ↓"/></a><LapizDeCatalogo texto="Revisar unidades y fuentes ↓"/></span>
    </article>
    </div>
 {!compacto ? <div className="plano-analitico">
    <div className="cabecera-plano">
    <span><TextoEditorial id="4ac587bc5826e8289f5c" original={"CONVOCATORIA → ASISTENCIA"}/></span>
    <button onClick={() => setPausa(v => !v)} aria-pressed={pausa} disabled={esencial}><EtiquetaEditorial texto={pausa ? 'Reanudar animación' : 'Pausar animación'}/></button><LapizDeCatalogo texto={pausa ? 'Reanudar animación' : 'Pausar animación'}/>
    </div>
    <Atlas unidades={unidades} seleccion={unidad} onElegir={setUnidad}/>
    <div className="leyenda">
    <span>
    <i className="muestra-conv"/><TextoEditorial id="595faa158cb0bd052852" original={"Convocados"}/></span>
    <span>
    <i className="muestra-asist"/><TextoEditorial id="d80c1b1ff240ccafc8d6" original={"Asistentes"}/></span>
    </div>
    <p className="pie-fuente"><TextoEditorial id="dea61138d835bd56cafd" original={"Fuente: presentaciones resumidas por unidad regional, diapositiva 2. Corte: 12 de noviembre de 2026."}/></p>
    </div> : null}
    </section>
 <section id="inspeccion" className="inspeccion">
    <div className="cabecera-editorial">
    <div>
    <p className="folio"><TextoEditorial id="0da6094c2a717557ed24" original={"DETALLE REGIONAL"}/></p>
    <h2><TextoEditorial id="45ff90ceac72d2a23f74" original={"Cifras por"}/><br /><TextoEditorial id="70c21c597da8ee50fe11" original={"unidad regional."}/></h2>
    </div>
    <label><TextoEditorial id="261c41da31a54927f6d3" original={"Alcance documental"}/>
    <Select value={unidad} onValueChange={valor => setUnidad(valor ?? 'Todas')}>
      <SelectTrigger aria-label="Alcance documental" className="selector-documental">
        <SelectValue>{(valor: string | null) => valor || 'Todas'}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="Todas">Todas</SelectItem>
        {unidades.map(r => <SelectItem key={r.unidad} value={r.unidad}>{r.unidad}</SelectItem>)}
      </SelectContent>
    </Select>
    </label>
    </div>
    <dl className="ecuacion">
    <div>
    <dt><TextoEditorial id="595faa158cb0bd052852" original={"Convocados"}/></dt>
    <dd>{formato(c)}</dd>
    </div>
    <div>
    <dt><TextoEditorial id="b97e2bdb49b7a8fbeab4" original={"Asistentes documentados"}/></dt>
    <dd>{formato(a)}</dd>
    </div>
    <div>
    <dt><TextoEditorial id="49a491a7b65c7c5cc94c" original={"Asistentes sobre convocados"}/></dt>
    <dd>{porcentaje(a, c)} %</dd>
    </div>
    <div>
    <dt><TextoEditorial id="ca1a13bc0d11d2d39f98" original={"Convocados menos asistentes"}/></dt>
    <dd>{formato(c - a)}</dd>
    </div>
    </dl>
<div className="tabla-scroll" tabIndex={0} role="region" aria-label="Cifras documentales por unidad regional">
    <table>
    <caption><TextoEditorial id="dc9361ef34fc7de31b95" original={"Porcentaje de asistencia = asistentes ÷ convocados × 100. Los porcentajes se calculan con los conteos de las presentaciones y se redondean a un decimal."}/></caption>
    <thead>
    <tr>
    <th scope="col"><TextoEditorial id="7748acb8619b3a07c0f9" original={"Unidad"}/></th>
    <th scope="col"><TextoEditorial id="595faa158cb0bd052852" original={"Convocados"}/></th>
    <th scope="col"><TextoEditorial id="d80c1b1ff240ccafc8d6" original={"Asistentes"}/></th>
    <th scope="col"><TextoEditorial id="53676d61f67d12550267" original={"% de asistencia"}/></th>
    <th scope="col"><TextoEditorial id="ca1a13bc0d11d2d39f98" original={"Convocados menos asistentes"}/></th>
    </tr>
    </thead>
    <tbody>{filas.map(r => <tr key={r.unidad}>
        <th scope="row">{r.unidad}</th>
        <td>{formato(r.convocados)}</td>
        <td>{formato(r.asistentes)}</td>
        <td>{porcentaje(r.asistentes, r.convocados)} %</td>
        <td>{formato(r.convocados - r.asistentes)}</td>
        </tr>)}</tbody>
    </table>
    </div>
    <p className="nota-evidencia"><TextoEditorial id="b040194ca5290aed6da4" original={"Las cifras corresponden al mismo conjunto de convocatoria y asistencia de las presentaciones. La consulta de registros por jornada se realiza por separado."}/></p>

    </section>
 <section id="pulso" className="pulso">
    <div className="cabecera-editorial">
    <div>
    <p className="folio"><TextoEditorial id="57896e8d82540ed5e954" original={"04 / LA ASISTENCIA EN EL TIEMPO"}/></p>
    <h2><TextoEditorial id="1a2ad35cec0850d57de3" original={"No fue un único momento."}/><br /><TextoEditorialCompuesto id="participacion-titulo-jornadas-completo" partes={[{id:"fb3573fa58dfd26bbbc8",original:"Fueron"},` ${resumen.jornadas} `,{id:"97259da99149a93a7a22",original:"jornadas."}]}/></h2>
    </div>
    <p><TextoEditorial id="participacion-resumen-agrupacion-regional" original={"Asistencias por lugar del encuentro, agrupando sus fechas registradas."}/></p>
    </div>
    <Jornadas jornadas={jornadasRegionales}/>
    <p className="conclusion"><TextoEditorial id="aad6328d286ec1f2fd5f" original={"El rol con mayor asistencia registrada es"}/> <strong>{rolPrincipal[0]}</strong>: {formato(rolPrincipal[1])} de {formato(resumen.registros)} ({porcentaje(rolPrincipal[1], resumen.registros)} <TextoEditorial id="c32bb3debe45d14172ad" original={"%). El detalle por rol, edad, unidad y dependencia permanece en el explorador."}/></p>
    </section>
 <section id="seguimiento" className="laboratorio">
    <div className="cabecera-editorial">
    <div>
    <p className="folio"><TextoEditorial id="d345cf79a82f95e3a00e" original={"05 / CONSULTA DETALLADA"}/></p>
    <h2><TextoEditorial id="48c7e686a89bc7a56433" original={"Registros"}/><br /><TextoEditorial id="7d934b538c495c553675" original={"de participación."}/></h2>
    </div>
    <div>
    <p><TextoEditorial id="2dd68500413032f103c7" original={"Consulte la asistencia por fecha, lugar, rol, unidad regional y dependencia."}/></p>
    <span className="accion-editorial"><a className="descarga" download href="/api/descargas/transformaciones-participacion"><EtiquetaEditorial texto="Descargar Excel completo ↓"/></a><LapizDeCatalogo texto="Descargar Excel completo ↓"/></span>
    </div>
    </div>{children}</section>
 <section id="fuentes" className="fuentes-editoriales">
    <p className="folio"><TextoEditorial id="e0113c0e85fa663d2b0f" original={"06 / SÍNTESIS EJECUTIVA Y FUENTES"}/></p>
    <h2><TextoEditorial id="ecc370355ee5837a72d8" original={"Resumen"}/><br /><TextoEditorial id="a25b77f504ad818ac83f" original={"y fuentes de información."}/></h2>
    <div className="sintesis">
    <article>
    <h3><TextoEditorial id="bf3b8d67324516afd365" original={"Alcance documentado"}/></h3>
    <p>{formato(convocados)} <TextoEditorial id="b65bc82e3ab39718beec" original={"convocados;"}/> {formato(asistentes)} <TextoEditorial id="c48fbce8ac6e5e04eb21" original={"asistentes;"}/> {porcentaje(asistentes, convocados)} <TextoEditorial id="094e554de021b499f3eb" original={"% de asistencia respecto a las personas convocadas. Permite comparar unidades dentro del corte de las presentaciones."}/></p>
    </article>
    <article>
    <h3><TextoEditorial id="3851d7c949b5fab05e8a" original={"Participación registrada"}/></h3>
    <p>{formato(resumen.registros)} <TextoEditorial id="203dedbf302052184254" original={"registros distribuidos en"}/> {resumen.jornadas} <TextoEditorial id="cd2c7ea5e43bf4962ff9" original={"fechas. Una misma persona puede registrar asistencia en varias jornadas."}/></p>
    </article>
    </div>
    <details>
    <summary><EtiquetaEditorial texto="Fuentes y criterios de cálculo"/></summary><LapizDeCatalogo texto="Fuentes y criterios de cálculo"/>
    <p><TextoEditorial id="538a3b1b4166a28465b3" original={"Convocatoria:"}/> {fuente.fuente}<TextoEditorial id="d974700c83125be8e481" original={", diapositiva"}/> {fuente.diapositiva}.</p>
    <p><TextoEditorial id="cc10a806fd6718e520f1" original={"Registros de asistencia: 3.576 entradas de participación, con corte de consulta al 11 de noviembre de 2026."}/></p>
    <p><TextoEditorial id="096b02dd1255e1952372" original={"Una entrada puede estar asociada a varias dependencias, por lo que sus conteos pueden superar el total de registros. Los porcentajes por edad consideran únicamente las edades registradas. La descarga incluye los registros de toda la sección."}/></p>
    </details>
    <footer><TextoEditorial id="2111b1ef7b08fe1278a3" original={"Universidad de Cundinamarca · Planeación Estratégica 2027 — 2037"}/></footer>
    </section>
 </div>
    </div>;
}

function PlanoDePaso({ etapa, unidades, seleccion, onElegir }: {
    etapa: 'convocatoria' | 'asistencia';
    unidades: DatosNarrativos['documento']['filas'];
    seleccion: string;
    onElegir: (unidad: string) => void;
}) {
    return <div className="plano-por-paso">
        <Atlas etapa={etapa} unidades={unidades} seleccion={seleccion} onElegir={onElegir}/>
        <div className="leyenda">
            <span><i className="muestra-conv"/><TextoEditorial id="595faa158cb0bd052852" original="Convocados"/></span>
            {etapa === 'asistencia' ? <span><i className="muestra-asist"/><TextoEditorial id="d80c1b1ff240ccafc8d6" original="Asistentes"/></span> : null}
        </div>
        <p className="pie-fuente"><TextoEditorial id="dea61138d835bd56cafd" original="Fuente: presentaciones resumidas por unidad regional, diapositiva 2. Corte: 12 de noviembre de 2026."/></p>
    </div>;
}
