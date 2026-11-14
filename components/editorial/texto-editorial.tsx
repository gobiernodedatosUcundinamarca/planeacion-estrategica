'use client';
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Pencil } from 'lucide-react';
import catalogo from '@/editorial/catalogo.json';
import contenidoInicial from '@/editorial/contenido-inicial.json';
const porTexto = new Map(Object.entries(catalogo).map(([id, v]) => [v.original, id]));
const sinSuscripcion = () => () => {};
export function TextoDeCatalogo({ texto }: {
    texto: ReactNode;
}) { if (typeof texto !== 'string')
    return <>{texto}</>; const id = porTexto.get(texto); return id ? <TextoEditorial id={id} original={texto}/> : <>{texto}</>; }
type Objetivo = {
    id: string;
    original: string;
};
const Contexto = createContext<{
    textos: Record<string, string>;
    editar: (o: Objetivo) => void;
    modoEdicion: boolean;
    alternarModo: () => void;
    disponible: boolean;
}>({ textos: contenidoInicial.textos, editar: () => { }, modoEdicion: false, alternarModo: () => { }, disponible: false });
export function ControlEdicion() {
    const c = useContext(Contexto);
    const etiqueta = c.modoEdicion ? 'Salir del modo de edición' : 'Activar modo de edición';
    return <button type="button" className="control-edicion" disabled={!c.disponible} aria-label={etiqueta} title={c.disponible ? etiqueta : 'Edición de textos no disponible en este entorno'} aria-pressed={c.modoEdicion} onClick={c.alternarModo}><Pencil size={18} aria-hidden="true"/></button>;
}
export function EtiquetaEditorial({ texto }: {
    texto: string;
}) { const c = useContext(Contexto); const id = porTexto.get(texto); return <>{id ? c.textos[id] ?? texto : texto}</>; }
/** Permite reutilizar una etiqueta heredada sin tomar sus cifras como datos. */
export function useTextoEditorial(id:string,original:string) {
    return useContext(Contexto).textos[id] ?? original;
}
export function LapizDeCatalogo({ texto }: {
    texto: string;
}) {
    const c = useContext(Contexto);
    const id = porTexto.get(texto);
    return id && c.modoEdicion ? <button className="lapiz-editorial" type="button" title="Editar texto" aria-label={`Editar texto: ${texto.slice(0, 70)}`} onClick={e => { e.preventDefault(); e.stopPropagation(); c.editar({ id, original: texto }); }}>
    <Pencil size={12} aria-hidden="true"/>
    </button> : null;
}
export function TextoEditorial({ id, original }: {
    id: string;
    original: string;
}) {
    const c = useContext(Contexto);
    return <span className="texto-editorial" data-editorial-id={id}>{c.textos[id] ?? original}{c.modoEdicion ? <button type="button" className="lapiz-editorial" aria-label={`Editar texto: ${original.slice(0, 70)}`} title="Editar texto" onClick={e => { e.preventDefault(); e.stopPropagation(); c.editar({ id, original }); }}>
    <Pencil size={12} aria-hidden="true"/>
    </button> : null}
    </span>;
}
export function TextoEditorialCompuesto({id,partes}:{id:string;partes:({id:string;original:string}|string)[]}) {
    const c = useContext(Contexto);
    const original = partes.map(p => typeof p === 'string' ? p : c.textos[p.id] ?? p.original).join('');
    return <TextoEditorial id={id} original={original}/>;
}
export function EditorTextos({ children }: {
    children: ReactNode;
}) {
    const [estado, setEstado] = useState({ revision: contenidoInicial.revision, textos: contenidoInicial.textos as Record<string, string>, autorizado: false, habilitado: false }), [objetivo, setObjetivo] = useState<Objetivo | null>(null), [clave, setClave] = useState(''), [valor, setValor] = useState(''), [mensaje, setMensaje] = useState(''), [ocupado, setOcupado] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [aviso, setAviso] = useState('');
    const montado = useSyncExternalStore(sinSuscripcion, () => true, () => false);
    const dialogo = useRef<HTMLDialogElement>(null);
    const generacion = useRef(0);
    const enviando = useRef(false);
    const revisionEdicion = useRef(estado.revision);
    useEffect(() => { if (!aviso) return; const reloj = setTimeout(() => setAviso(''), 6000); return () => clearTimeout(reloj); }, [aviso]);
    async function refrescar() { const r = await fetch('/api/editorial', { cache: 'no-store' }); if (r.ok)
        setEstado(await r.json()); }
    useEffect(() => {
        let vigente = true, pendiente = false;
        const controlador = new AbortController();
        const consultar = async () => {
            if (pendiente || enviando.current || document.visibilityState !== 'visible') return;
            pendiente = true;
            const turno = generacion.current;
            try {
                const r = await fetch('/api/editorial', { cache: 'no-store', signal: controlador.signal });
                if (!r.ok) return;
                const datos = await r.json();
                if (vigente && turno === generacion.current && Number.isSafeInteger(datos.revision) && datos.textos) {
                    setEstado(actual => actual.habilitado && datos.habilitado && datos.revision < actual.revision ? actual
                        : datos.revision === actual.revision && datos.autorizado === actual.autorizado && datos.habilitado === actual.habilitado ? actual : datos);
                }
            } catch { /* Conservar el último contenido confirmado y reintentar. */ }
            finally { pendiente = false; }
        };
        void consultar();
        const intervalo = setInterval(() => { void consultar(); }, 2000);
        const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('editorial-actualizado') : null;
        if (canal) canal.onmessage = () => { void consultar(); };
        const cambio = () => { if (document.visibilityState === 'visible') consultar(); };
        document.addEventListener('visibilitychange', cambio);
        window.addEventListener('focus', cambio);
        window.addEventListener('online', cambio);
        return () => { vigente = false; controlador.abort(); clearInterval(intervalo); canal?.close(); document.removeEventListener('visibilitychange', cambio); window.removeEventListener('focus', cambio); window.removeEventListener('online', cambio); };
    }, []);
    useEffect(() => {
        if (modoEdicion) document.documentElement.dataset.modoEdicion = 'activo';
        else delete document.documentElement.dataset.modoEdicion;
        return () => { delete document.documentElement.dataset.modoEdicion; };
    }, [modoEdicion]);
    function alternarModo() {
        if (modoEdicion) { setModoEdicion(false); return; }
        if (estado.autorizado) { setModoEdicion(true); return; }
        setObjetivo(null); setClave(''); setMensaje(''); dialogo.current?.showModal();
    }
    function editar(o: Objetivo) { if (!modoEdicion) return; revisionEdicion.current = estado.revision; setObjetivo(o); setValor(estado.textos[o.id] ?? o.original); setMensaje(''); dialogo.current?.showModal(); }
    async function enviar(body: unknown) { enviando.current = true; generacion.current++; setOcupado(true); setMensaje(''); try {
        const r = await fetch('/api/editorial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json();
        if (!r.ok) {
            if (r.status === 401) setEstado(s => ({ ...s, autorizado: false }));
            setMensaje(d.error || 'No se pudo completar la operación');
            if (r.status === 409)
                await refrescar();
            return false;
        }
        if (body && typeof body === 'object' && 'id' in body) {
            const cambio = body as {id:string;valor:string|null;revision:number};
            const coincide = d.textos && (cambio.valor === null ? !Object.hasOwn(d.textos,cambio.id) : d.textos[cambio.id] === cambio.valor);
            if (!coincide || !Number.isSafeInteger(d.revision) || d.revision <= cambio.revision) {
                setMensaje('El servidor no confirmó el texto enviado. La edición sigue abierta; compruebe el contenido publicado antes de reintentar.');
                return false;
            }
            setAviso('Cambios guardados y publicados.');
        }
        if (d.textos) {
            setEstado(s => ({ ...s, ...d }));
            if (typeof BroadcastChannel !== 'undefined') { const canal = new BroadcastChannel('editorial-actualizado'); canal.postMessage(d.revision); canal.close(); }
        }
        if (typeof d.autorizado === 'boolean')
            setEstado(s => ({ ...s, autorizado: d.autorizado }));
        return true;
    }
    catch {
        setMensaje('No se pudo conectar. Intente nuevamente.');
        return false;
    }
    finally {
        enviando.current = false;
        setOcupado(false);
    } }
    return <Contexto.Provider value={{ textos: estado.textos, editar, modoEdicion, alternarModo, disponible: estado.habilitado }}>{children}{montado && aviso ? createPortal(<div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-lg border border-primary/30 bg-background px-5 py-3 text-sm text-foreground shadow-lg">{aviso}</div>,document.body) : null}{montado ? createPortal(<dialog ref={dialogo} className="dialogo-editorial" aria-labelledby="titulo-editorial" onClose={() => { setClave(''); setObjetivo(null); }}>
    <form onSubmit={async (e) => { e.preventDefault(); if (!estado.autorizado) {
        if (await enviar({ accion: 'entrar', clave })) {
            setModoEdicion(true);
            if (!objetivo) dialogo.current?.close();
        }
        setClave('');
    }
    else if (objetivo && await enviar({ id: objetivo.id, valor, revision: revisionEdicion.current }))
        dialogo.current?.close(); }}>
    <h2 id="titulo-editorial">{estado.autorizado ? 'Editar texto de la página' : 'Acceso al modo de edición'}</h2>{estado.autorizado ? <>
        <p>Este cambio modifica únicamente el texto descriptivo, no los datos de encuestas.</p>
        <label>Texto<textarea value={valor} onChange={e => setValor(e.target.value)} maxLength={4000} rows={6}/>
        </label>
        <p>Puede dejar el texto vacío para ocultarlo. El lápiz permanece disponible en modo de edición para recuperarlo.</p>
        </> : <label>Contraseña<input type="password" autoComplete="current-password" value={clave} onChange={e => setClave(e.target.value)} maxLength={200} required/>
        </label>}<p role="alert">{mensaje}</p>
    <div className="acciones-editorial">
    <button type="button" onClick={() => dialogo.current?.close()}>Cancelar</button>
    <button disabled={ocupado} type="submit">{ocupado ? 'Procesando…' : estado.autorizado ? 'Guardar' : 'Ingresar'}</button>{estado.autorizado && objetivo ? <button disabled={ocupado} type="button" onClick={async () => { if (await enviar({ id: objetivo.id, valor: null, revision: revisionEdicion.current }))
        dialogo.current?.close(); }}>Restaurar texto original</button> : null}{estado.autorizado && objetivo ? <button type="button" disabled={ocupado} onClick={async () => {if(await enviar({id:objetivo.id,valor:'',revision:revisionEdicion.current})) dialogo.current?.close();}}>Ocultar texto</button> : null}{estado.autorizado ? <button type="button" disabled={ocupado} onClick={async () => { if (await enviar({ accion: 'salir' })) { setModoEdicion(false); dialogo.current?.close(); } }}>Cerrar sesión</button> : null}</div>
    </form>
    </dialog>, document.body) : null}
    </Contexto.Provider>;
}
