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
    const montado = useSyncExternalStore(sinSuscripcion, () => true, () => false);
    const dialogo = useRef<HTMLDialogElement>(null);
    async function refrescar() { const r = await fetch('/api/editorial', { cache: 'no-store' }); if (r.ok)
        setEstado(await r.json()); }
    useEffect(() => {
        let vigente = true;
        const consultar = () => {
            void fetch('/api/editorial', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(datos => {
                if (vigente && datos) setEstado(datos);
            }).catch(() => {});
        };
        consultar();
        const cambio = () => { if (document.visibilityState === 'visible') consultar(); };
        document.addEventListener('visibilitychange', cambio);
        return () => { vigente = false; document.removeEventListener('visibilitychange', cambio); };
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
    function editar(o: Objetivo) { if (!modoEdicion) return; setObjetivo(o); setValor(estado.textos[o.id] ?? o.original); setMensaje(''); dialogo.current?.showModal(); }
    async function enviar(body: unknown) { setOcupado(true); setMensaje(''); try {
        const r = await fetch('/api/editorial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json();
        if (!r.ok) {
            if (r.status === 401) setEstado(s => ({ ...s, autorizado: false }));
            setMensaje(d.error || 'No se pudo completar la operación');
            if (r.status === 409)
                await refrescar();
            return false;
        }
        if (d.textos)
            setEstado(s => ({ ...s, ...d }));
        if (typeof d.autorizado === 'boolean')
            setEstado(s => ({ ...s, autorizado: d.autorizado }));
        return true;
    }
    catch {
        setMensaje('No se pudo conectar. Intente nuevamente.');
        return false;
    }
    finally {
        setOcupado(false);
    } }
    return <Contexto.Provider value={{ textos: estado.textos, editar, modoEdicion, alternarModo, disponible: estado.habilitado }}>{children}{montado ? createPortal(<dialog ref={dialogo} className="dialogo-editorial" aria-labelledby="titulo-editorial" onClose={() => { setClave(''); setObjetivo(null); }}>
    <form onSubmit={async (e) => { e.preventDefault(); if (!estado.autorizado) {
        if (await enviar({ accion: 'entrar', clave })) {
            setModoEdicion(true);
            if (!objetivo) dialogo.current?.close();
        }
        setClave('');
    }
    else if (objetivo && await enviar({ id: objetivo.id, valor, revision: estado.revision }))
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
    <button disabled={ocupado} type="submit">{ocupado ? 'Procesando…' : estado.autorizado ? 'Guardar cambios' : 'Ingresar'}</button>{estado.autorizado && objetivo ? <button disabled={ocupado} type="button" onClick={async () => { if (await enviar({ id: objetivo.id, valor: null, revision: estado.revision }))
        dialogo.current?.close(); }}>Restaurar texto original</button> : null}{estado.autorizado && objetivo ? <button type="button" disabled={ocupado} onClick={async () => {if(await enviar({id:objetivo.id,valor:'',revision:estado.revision})) dialogo.current?.close();}}>Ocultar texto</button> : null}{estado.autorizado ? <button type="button" disabled={ocupado} onClick={async () => { if (await enviar({ accion: 'salir' })) { setModoEdicion(false); dialogo.current?.close(); } }}>Cerrar sesión</button> : null}</div>
    </form>
    </dialog>, document.body) : null}
    </Contexto.Provider>;
}
