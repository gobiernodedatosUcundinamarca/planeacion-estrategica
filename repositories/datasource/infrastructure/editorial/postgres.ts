import { validarCambio, validarEstado, type EstadoEditorial } from '@/lib/editorial/modelo';

type Consulta = (texto: string, parametros?: unknown[]) => Promise<Record<string, unknown>[]>;

export function crearAlmacenEditorial(ejecutar: Consulta, esquema = 'editorial') {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(esquema)) throw Error('ESQUEMA_INVALIDO');
  const consultar: Consulta = (texto, parametros = []) => ejecutar(
    texto.replace(/\beditorial_(estado|historial|intentos)\b/g, nombre => `"${esquema}"."${nombre}"`), parametros);
  async function inicializar() {
    await ejecutar(`CREATE SCHEMA IF NOT EXISTS "${esquema}"`);
    await consultar(`CREATE TABLE IF NOT EXISTS editorial_estado (
      id smallint PRIMARY KEY CHECK (id=1), revision bigint NOT NULL CHECK(revision>=0),
      textos jsonb NOT NULL CHECK(jsonb_typeof(textos)='object'), actualizado timestamptz NOT NULL DEFAULT now())`);
    await consultar(`CREATE TABLE IF NOT EXISTS editorial_historial (
      revision bigint PRIMARY KEY, texto_id text, anterior jsonb, nuevo jsonb,
      accion text NOT NULL CHECK(accion IN ('edicion','importacion')), fecha timestamptz NOT NULL DEFAULT now())`);
    await consultar(`CREATE TABLE IF NOT EXISTS editorial_intentos (
      id smallint PRIMARY KEY CHECK(id=1), intentos integer NOT NULL, inicio timestamptz NOT NULL)`);
    await consultar(`INSERT INTO editorial_estado(id,revision,textos) VALUES(1,0,'{}') ON CONFLICT(id) DO NOTHING`);
  }

  async function leer(): Promise<EstadoEditorial> {
    const [fila] = await consultar('SELECT revision,textos FROM editorial_estado WHERE id=1');
    if (!fila) throw Error('EDITORIAL_NO_INICIALIZADO');
    return validarEstado({ revision: Number(fila.revision), textos: fila.textos });
  }

  async function guardar(id: string, valor: string | null, revision: number) {
    validarCambio(id, valor, revision);
    // Una sola sentencia: bloqueo de fila, revisión optimista e historial atómico.
    const [fila] = await consultar(`WITH anterior AS (
      SELECT revision,textos FROM editorial_estado WHERE id=1 AND revision=$1 FOR UPDATE
    ), cambio AS (
      UPDATE editorial_estado e SET revision=e.revision+1, actualizado=now(),
        textos=CASE WHEN $3::text IS NULL THEN e.textos-$2::text
          ELSE jsonb_set(e.textos,ARRAY[$2::text],to_jsonb($3::text),true) END
      FROM anterior a WHERE e.id=1 AND e.revision=$1 RETURNING e.revision,e.textos
    ), historial AS (
      INSERT INTO editorial_historial(revision,texto_id,anterior,nuevo,accion)
      SELECT c.revision,$2::text,a.textos->$2::text,c.textos->$2::text,'edicion'
      FROM cambio c CROSS JOIN anterior a RETURNING revision
    ) SELECT c.revision,c.textos FROM cambio c JOIN historial h USING(revision)`, [revision, id, valor]);
    if (!fila) throw Error('CONFLICTO');
    return validarEstado({ revision: Number(fila.revision), textos: fila.textos });
  }

  async function importarInicial(entrada: EstadoEditorial) {
    const estado = validarEstado(entrada);
    const [fila] = await consultar(`WITH cambio AS (
      UPDATE editorial_estado SET revision=$1,textos=$2::jsonb,actualizado=now()
      WHERE id=1 AND revision=0 AND textos='{}'::jsonb RETURNING revision,textos
    ), historial AS (
      INSERT INTO editorial_historial(revision,anterior,nuevo,accion)
      SELECT revision,'{}'::jsonb,textos,'importacion' FROM cambio RETURNING revision
    ) SELECT c.revision,c.textos FROM cambio c JOIN historial h USING(revision)`,
    [Math.max(1, estado.revision), JSON.stringify(estado.textos)]);
    if (fila) return validarEstado({ revision: Number(fila.revision), textos: fila.textos });
    const actual = await leer();
    const iguales = Object.keys(actual.textos).length === Object.keys(estado.textos).length
      && Object.entries(estado.textos).every(([id, valor]) => actual.textos[id] === valor);
    if (!iguales) throw Error('IMPORTACION_RECHAZADA: el destino ya contiene ediciones');
    return actual;
  }

  async function reservarIntento() {
    // El límite es compartido entre todas las instancias serverless del editor.
    const [fila] = await consultar(`INSERT INTO editorial_intentos(id,intentos,inicio) VALUES(1,1,now())
      ON CONFLICT(id) DO UPDATE SET
        intentos=CASE WHEN editorial_intentos.inicio<=now()-interval '15 minutes' THEN 1 ELSE LEAST(editorial_intentos.intentos+1,6) END,
        inicio=CASE WHEN editorial_intentos.inicio<=now()-interval '15 minutes' THEN now() ELSE editorial_intentos.inicio END
      RETURNING intentos`);
    return Number(fila.intentos) <= 5;
  }

  async function limpiarIntentos() { await consultar('DELETE FROM editorial_intentos WHERE id=1'); }
  return { inicializar, leer, guardar, importarInicial, reservarIntento, limpiarIntentos };
}
