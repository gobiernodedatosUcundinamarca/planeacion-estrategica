'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Type } from 'lucide-react';
import { CATEGORIAS, CLAVE_TAMANOS, CLAVE_TAMANOS_ANTERIOR, ESCALA_MINIMA, ESCALA_MAXIMA,
  esEscalaValida, interpretarAjustes, type Ajustes, type Categoria } from './escala-tipografica';
import { reglasDeEscala, useEscalaTipografica } from './use-escala-tipografica';

const Contexto = createContext({ abrir: () => {}, disponible: false });

export function ControlTipografia() {
  const { abrir, disponible } = useContext(Contexto);
  return <button type="button" className="control-edicion" title="Tamaño de los textos"
    aria-label="Configurar tamaño de los textos" disabled={!disponible} onClick={abrir}>
    <Type size={19} aria-hidden="true" />
  </button>;
}

export function PreferenciasTipograficas({ children }: { children: ReactNode }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [guardados, setGuardados] = useState<Ajustes>({});
  const [propuesta, setPropuesta] = useState<Ajustes | null>(null);
  const [borradores, setBorradores] = useState<Partial<Record<Categoria, string>>>({});
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    void Promise.resolve().then(() => {
      if (!vigente) return;
      try {
        setGuardados(interpretarAjustes(localStorage.getItem(CLAVE_TAMANOS), localStorage.getItem(CLAVE_TAMANOS_ANTERIOR)));
      } catch { /* La vista original sigue disponible sin almacenamiento del navegador. */ }
      setListo(true);
    });
    return () => { vigente = false; };
  }, []);

  const activos = propuesta ?? guardados;
  const estilo = useEscalaTipografica(activos);
  const hayInvalidos = Object.values(borradores).some(texto => texto === '' || !esEscalaValida(Number(texto)));

  function abrir() {
    setPropuesta({ ...guardados });
    setBorradores({});
    setError('');
    dialogo.current?.showModal();
  }

  function cancelar() {
    setPropuesta(null);
    setBorradores({});
    setError('');
    dialogo.current?.close();
  }

  function cambiar(categoria: Categoria, texto: string) {
    setBorradores(previos => ({ ...previos, [categoria]: texto }));
    const valor = Number(texto);
    if (texto !== '' && esEscalaValida(valor)) {
      setPropuesta(previa => {
        const siguientes = { ...previa };
        if (valor === 100) delete siguientes[categoria];
        else siguientes[categoria] = valor;
        return siguientes;
      });
    }
  }

  function guardar() {
    if (propuesta === null || hayInvalidos) return;
    try {
      localStorage.setItem(CLAVE_TAMANOS, JSON.stringify(propuesta));
      setGuardados(propuesta);
      setPropuesta(null);
      dialogo.current?.close();
    } catch {
      setError('El navegador no permite guardar la configuración. Puedes cancelar para conservar los tamaños anteriores.');
    }
  }

  return <Contexto.Provider value={{ abrir, disponible: listo }}>{children}{listo ? createPortal(<>
    <style ref={estilo} data-preferencias-tipografia="true">{reglasDeEscala(activos)}</style>
    <dialog ref={dialogo} className="dialogo-editorial tamanos-generales" aria-labelledby="titulo-tamanos"
      onCancel={evento => { evento.preventDefault(); cancelar(); }} onClose={() => { if (!dialogo.current?.open) setPropuesta(null); }}>
      <form onSubmit={evento => { evento.preventDefault(); guardar(); }}>
        <h2 id="titulo-tamanos">Tamaño de los textos</h2>
        <p>Ajusta cada categoría con el número o la barra. El 100 % conserva el tamaño original.
          Puedes previsualizar los cambios antes de guardarlos en este navegador.</p>
        <div className="lista-tamanos">{CATEGORIAS.map(categoria => {
          const valor = activos[categoria.id] ?? 100;
          const texto = borradores[categoria.id];
          const invalido = texto !== undefined && (texto === '' || !esEscalaValida(Number(texto)));
          return <div className="fila-tamano" key={categoria.id}>
            <label htmlFor={'tamano-' + categoria.id}>{categoria.nombre}</label>
            <div className="controles-tamano">
              <input id={'tamano-' + categoria.id} type="number" min={ESCALA_MINIMA} max={ESCALA_MAXIMA} step={1}
                aria-invalid={invalido} aria-describedby={'estado-tamano-' + categoria.id}
                value={texto ?? valor} onChange={evento => cambiar(categoria.id, evento.target.value)} />
              <span aria-hidden="true">%</span>
              <input aria-label={'Tamaño de ' + categoria.nombre.toLocaleLowerCase()} type="range"
                min={ESCALA_MINIMA} max={ESCALA_MAXIMA} step={1} value={valor}
                aria-valuetext={`${valor} % del tamaño original`}
                onChange={evento => cambiar(categoria.id, evento.target.value)} />
            </div>
            <span className="estado-tamano" id={'estado-tamano-' + categoria.id}>
              {invalido ? `Usa un número entero entre ${ESCALA_MINIMA} y ${ESCALA_MAXIMA} %.`
                : valor === 100 ? 'Tamaño original' : `${valor} % del tamaño original`}
            </span>
          </div>;
        })}</div>
        <p role="alert">{error}</p>
        <div className="acciones-editorial">
          <button type="button" onClick={() => { setBorradores({}); setPropuesta({}); }}>Restablecer tamaños</button>
          <button type="button" onClick={cancelar}>Cancelar</button>
          <button type="submit" disabled={hayInvalidos}>Guardar</button>
        </div>
      </form>
    </dialog>
  </>, document.body) : null}</Contexto.Provider>;
}
