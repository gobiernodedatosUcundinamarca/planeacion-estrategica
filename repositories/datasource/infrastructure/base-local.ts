import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { PGlite } from "@electric-sql/pglite";

/**
 * Base PostgreSQL embebida (PGlite) para el ejecutable portable, que funciona
 * sin conexión. Expone la misma interfaz que el driver HTTP de Neon —plantilla
 * etiquetada, `query` y `transaction`— para que ningún almacén cambie.
 */
type Consulta = { texto: string; parametros: unknown[] };
type Diferida = Promise<Record<string, unknown>[]> & { consulta: Consulta };

const instancias = new Map<string, Promise<PGlite>>();

function abrir(directorio: string) {
  let instancia = instancias.get(directorio);
  if (!instancia) {
    instancia = import("@electric-sql/pglite").then(({ PGlite, types }) =>
      PGlite.create(directorio, {
        // Mismos tipos que entrega Neon: enteros de 64 bits y numéricos como texto,
        // y fechas a medianoche de la hora local.
        parsers: {
          [types.INT8]: (v: string) => v,
          [types.NUMERIC]: (v: string) => v,
          [types.DATE]: (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : v),
        },
      })
    );
    instancias.set(directorio, instancia);
  }
  return instancia;
}

function desdePlantilla(partes: TemplateStringsArray, valores: unknown[]): Consulta {
  let texto = partes[0];
  for (let i = 0; i < valores.length; i++) texto += `$${i + 1}${partes[i + 1]}`;
  return { texto, parametros: valores };
}

async function ejecutar(bd: PGlite | Pick<PGlite, "query">, { texto, parametros }: Consulta) {
  const resultado = await bd.query<Record<string, unknown>>(texto, parametros);
  return resultado.rows;
}

export function conexionLocal(directorio: string): NeonQueryFunction<false, false> {
  const diferida = (consulta: Consulta): Diferida => {
    let promesa: Promise<Record<string, unknown>[]> | undefined;
    const correr = () => (promesa ??= abrir(directorio).then((bd) => ejecutar(bd, consulta)));
    return Object.assign(
      {
        then: (ok?: never, error?: never) => correr().then(ok, error),
        catch: (error?: never) => correr().catch(error),
        finally: (fin?: () => void) => correr().finally(fin),
        [Symbol.toStringTag]: "Promise",
      },
      { consulta }
    ) as unknown as Diferida;
  };

  const sql = ((partes: TemplateStringsArray, ...valores: unknown[]) =>
    diferida(desdePlantilla(partes, valores))) as unknown as NeonQueryFunction<false, false>;

  const query = (texto: string, parametros: unknown[] = []) => diferida({ texto, parametros });

  const transaction = async (
    entrada: ((txn: unknown) => Diferida[]) | Diferida[]
  ): Promise<Record<string, unknown>[][]> => {
    const txn = Object.assign(
      (partes: TemplateStringsArray, ...valores: unknown[]) => diferida(desdePlantilla(partes, valores)),
      { query }
    );
    const consultas = (typeof entrada === "function" ? entrada(txn) : entrada).map((q) => q.consulta);
    const bd = await abrir(directorio);
    return bd.transaction(async (tx) => {
      const resultados: Record<string, unknown>[][] = [];
      for (const consulta of consultas) resultados.push(await ejecutar(tx, consulta));
      return resultados;
    });
  };

  return Object.assign(sql, { query, transaction }) as unknown as NeonQueryFunction<false, false>;
}

/** Cierra las instancias abiertas; lo usan los scripts antes de terminar. */
export async function cerrarBasesLocales() {
  for (const instancia of instancias.values()) await (await instancia).close();
  instancias.clear();
}
