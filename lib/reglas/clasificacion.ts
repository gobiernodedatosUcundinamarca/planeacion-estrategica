/**
 * Clasificación temática de los comentarios abiertos: limpieza → vectores →
 * K-Means → grupos → nombre automático.
 *
 * Todo el proceso es aritmética sobre texto, sin llamar a ningún servicio
 * externo ni descargar modelos. Es una decisión de diseño, no una limitación
 * que se pasó por alto:
 *
 *  · el .exe portable tiene que seguir siendo autocontenido, y un modelo de
 *    embeddings neuronales pesa cientos de megas;
 *  · los comentarios son opiniones de personas identificables, así que
 *    mandarlos a una API de terceros para vectorizarlos tiene un costo de
 *    privacidad que este módulo no necesita pagar;
 *  · con decenas o cientos de comentarios, agrupar por vocabulario compartido
 *    (TF-IDF) da grupos legibles y en milisegundos.
 *
 * La contrapartida, dicha sin rodeos: agrupa por PALABRAS, no por significado.
 * Dos comentarios que dicen lo mismo con vocabulario distinto pueden caer en
 * grupos diferentes. Si algún día hacen falta grupos semánticos, se sustituye
 * `vectorizar` por embeddings reales y el resto del archivo sigue igual.
 *
 * Vive en `lib/reglas/` porque son funciones puras que necesitan tanto el
 * servidor (para clasificar al cargar) como la vista (para explicar el
 * criterio).
 */

/**
 * Palabras que no distinguen un comentario de otro. Sin quitarlas, todos los
 * grupos quedarían definidos por "que", "de" y "la", que aparecen en todos.
 */
const VACIAS = new Set(
  `a al algo algunas algunos ante antes como con contra cual cuando de del desde donde dos el ella
   ellas ellos en entre era erais eran eres es esa esas ese eso esos esta estaba estan estar estas
   este esto estos ha habia han hasta hay la las le les lo los mas me mi mis mucho muy nada ni no
   nos nosotros o os otra otras otro otros para pero poco por porque que quien se sea ser si sin
   sobre solo son su sus tambien tanto te tiene tienen todo todos tu tus un una uno unos y ya
   deberia debería deben debe puede pueden podria podría hacer mejor manera forma parte pues asi
   así cada vez mismo misma toda todas cuales sino aunque
   universidad ucundinamarca cundinamarca transformacion transformaciones`
    .split(/\s+/)
    .filter(Boolean)
);

/** Un comentario ya preparado para vectorizar. */
export interface DocumentoTexto {
  id: number;
  texto: string;
}

export interface GrupoComentarios {
  /** Índice del grupo, 0..k-1. Es lo que se guarda en cada respuesta. */
  grupo: number;
  /** Nombre derivado de sus términos más característicos. */
  nombre: string;
  /** Términos que lo definen, de más a menos característico. */
  terminos: string[];
  /** Ids de los comentarios que cayeron aquí. */
  ids: number[];
}

/**
 * 1. LIMPIEZA — deja solo las palabras con contenido: sin tildes, sin signos,
 * sin números sueltos, sin palabras vacías y sin términos de menos de 4 letras
 * (en español casi siempre son conectores).
 */
export function limpiar(texto: string): string[] {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-zñ\s]/g, " ")
    .split(/\s+/)
    .filter((palabra) => palabra.length >= 4 && !VACIAS.has(palabra))
    // Plural simple: "estudiantes" y "estudiante" son el mismo término. No es
    // un lematizador, pero evita que el mismo concepto se parta en dos.
    .map((palabra) => palabra.replace(/(es|s)$/, ""))
    .filter((palabra) => palabra.length >= 4);
}

/**
 * Forma "bonita" de cada término: la escritura original más frecuente entre los
 * comentarios. La limpieza quita tildes y plurales para poder comparar, pero un
 * nombre de grupo que diga "Informacion" en vez de "Información" se ve como un
 * error. Este mapa devuelve la palabra tal como la escribió la gente.
 */
export function formasOriginales(documentos: DocumentoTexto[]): Map<string, string> {
  const conteos = new Map<string, Map<string, number>>();
  for (const doc of documentos) {
    for (const palabra of doc.texto.split(/[^\p{L}]+/u)) {
      if (palabra.length < 4) continue;
      const [clave] = limpiar(palabra);
      if (!clave) continue;
      const variantes = conteos.get(clave) ?? new Map<string, number>();
      const forma = palabra.toLocaleLowerCase("es");
      variantes.set(forma, (variantes.get(forma) ?? 0) + 1);
      conteos.set(clave, variantes);
    }
  }
  const mapa = new Map<string, string>();
  for (const [clave, variantes] of conteos) {
    const mejor = [...variantes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (mejor) mapa.set(clave, mejor[0]);
  }
  return mapa;
}

/**
 * 2. VECTORES (TF-IDF) — cada comentario se convierte en un vector sobre el
 * vocabulario común, normalizado para que un comentario largo no pese más que
 * uno corto por el solo hecho de tener más palabras.
 *
 * IDF penaliza las palabras que están en casi todos los comentarios: si algo
 * lo dice todo el mundo, no sirve para separar grupos.
 */
export function vectorizar(documentos: DocumentoTexto[]): {
  vectores: number[][];
  vocabulario: string[];
} {
  const tokensPorDoc = documentos.map((d) => limpiar(d.texto));

  const apariciones = new Map<string, number>();
  for (const tokens of tokensPorDoc) {
    for (const termino of new Set(tokens)) {
      apariciones.set(termino, (apariciones.get(termino) ?? 0) + 1);
    }
  }

  // Un término que aparece en un solo comentario no puede agrupar nada, y solo
  // agranda el vocabulario. Se conserva si hay muy pocos documentos, donde
  // todo aparece una vez.
  const minimo = documentos.length >= 8 ? 2 : 1;
  const vocabulario = [...apariciones.entries()]
    .filter(([, veces]) => veces >= minimo)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 400)
    .map(([termino]) => termino);

  const indice = new Map(vocabulario.map((t, i) => [t, i]));
  const total = documentos.length;

  const vectores = tokensPorDoc.map((tokens) => {
    const vector = new Array<number>(vocabulario.length).fill(0);
    for (const token of tokens) {
      const i = indice.get(token);
      if (i !== undefined) vector[i] += 1;
    }
    for (let i = 0; i < vector.length; i++) {
      if (vector[i] === 0) continue;
      const df = apariciones.get(vocabulario[i]) ?? 1;
      vector[i] = (1 + Math.log(vector[i])) * Math.log((1 + total) / (1 + df));
    }
    const norma = Math.hypot(...vector);
    return norma > 0 ? vector.map((v) => v / norma) : vector;
  });

  return { vectores, vocabulario };
}

/**
 * 3. K-MEANS — agrupa los vectores en k grupos.
 *
 * La inicialización es k-means++ con un generador pseudoaleatorio de semilla
 * fija: los mismos comentarios producen siempre los mismos grupos. Sin eso,
 * recargar la página podría renombrar y reordenar los grupos, y nadie confiaría
 * en un tablero que cambia solo.
 */
function kmeans(vectores: number[][], k: number, semilla = 42) {
  const n = vectores.length;
  const dim = vectores[0]?.length ?? 0;
  let estado = semilla;
  const azar = () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };

  const distancia = (a: number[], b: number[]) => {
    let suma = 0;
    for (let i = 0; i < dim; i++) suma += (a[i] - b[i]) ** 2;
    return suma;
  };

  // k-means++: el primer centro al azar y cada siguiente lejos de los ya
  // elegidos, para no arrancar con dos centros pegados.
  const centros: number[][] = [vectores[Math.floor(azar() * n)].slice()];
  while (centros.length < k) {
    const distancias = vectores.map((v) => Math.min(...centros.map((c) => distancia(v, c))));
    const suma = distancias.reduce((a, b) => a + b, 0);
    let objetivo = azar() * suma;
    let elegido = distancias.length - 1;
    for (let i = 0; i < distancias.length; i++) {
      objetivo -= distancias[i];
      if (objetivo <= 0) {
        elegido = i;
        break;
      }
    }
    centros.push(vectores[elegido].slice());
  }

  let asignacion = new Array<number>(n).fill(0);
  for (let iteracion = 0; iteracion < 50; iteracion++) {
    const nueva = vectores.map((v) => {
      let mejor = 0;
      let mejorDistancia = Infinity;
      centros.forEach((c, i) => {
        const d = distancia(v, c);
        if (d < mejorDistancia) {
          mejorDistancia = d;
          mejor = i;
        }
      });
      return mejor;
    });
    if (nueva.every((g, i) => g === asignacion[i])) break;
    asignacion = nueva;

    for (let c = 0; c < k; c++) {
      const miembros = vectores.filter((_, i) => asignacion[i] === c);
      if (miembros.length === 0) continue;
      for (let d = 0; d < dim; d++) {
        centros[c][d] = miembros.reduce((suma, v) => suma + v[d], 0) / miembros.length;
      }
    }
  }

  return asignacion;
}

/** Un vector guardado solo con sus posiciones no nulas, en orden ascendente. */
interface VectorDisperso {
  indices: number[];
  valores: number[];
}

function aDisperso(vector: number[]): VectorDisperso {
  const indices: number[] = [];
  const valores: number[] = [];
  vector.forEach((valor, i) => {
    if (valor !== 0) {
      indices.push(i);
      valores.push(valor);
    }
  });
  return { indices, valores };
}

/**
 * Distancia euclidiana recorriendo solo las posiciones no nulas de los dos
 * vectores. Da EXACTAMENTE el mismo número que recorrer las 400 dimensiones:
 * donde ambos valen 0 el término es +0, y sumar +0 no altera un número de
 * punto flotante; el resto se suma en el mismo orden ascendente. Un comentario
 * tiene en promedio unos 6 términos no nulos, así que cada distancia cuesta
 * ~12 operaciones en vez de 400.
 */
function distanciaDispersa(a: VectorDisperso, b: VectorDisperso): number {
  let suma = 0;
  let x = 0;
  let y = 0;
  while (x < a.indices.length || y < b.indices.length) {
    const ta = x < a.indices.length ? a.indices[x] : Infinity;
    const tb = y < b.indices.length ? b.indices[y] : Infinity;
    if (ta === tb) {
      suma += (a.valores[x] - b.valores[y]) ** 2;
      x++;
      y++;
    } else if (ta < tb) {
      suma += (a.valores[x] - 0) ** 2;
      x++;
    } else {
      suma += (0 - b.valores[y]) ** 2;
      y++;
    }
  }
  return Math.sqrt(suma);
}

/**
 * Qué tan bien separado quedó cada punto de su grupo (silueta, −1 a 1), para
 * varias agrupaciones a la vez: `asignaciones[q]` es la partición en `ks[q]`
 * grupos.
 *
 * Se calculan todas en una sola pasada porque la silueta compara cada
 * comentario con todos los demás, y esas distancias no dependen de cómo se
 * agrupe: calcularlas una vez por par y repartirlas entre las particiones
 * evita repetir el trabajo para cada k. Con ~3.000 comentarios, calcular la
 * silueta por separado para cada k (y en las 400 dimensiones) tomaba 18 s por
 * cargue. Las sumas se acumulan en el mismo orden que el cálculo directo, así
 * que el resultado no cambia ni en el último decimal.
 */
function siluetas(vectores: number[][], asignaciones: number[][], ks: number[]): number[] {
  const n = vectores.length;
  const dispersos = vectores.map(aDisperso);
  const validas = ks.map((k) => k >= 2 && n > k);
  const tamanos = asignaciones.map((asignacion, q) => {
    const conteo = new Array<number>(ks[q]).fill(0);
    for (const grupo of asignacion) conteo[grupo]++;
    return conteo;
  });
  const sumasPorGrupo = ks.map((k) => new Array<number>(k).fill(0));
  const totales = ks.map(() => 0);

  for (let i = 0; i < n; i++) {
    for (const sumas of sumasPorGrupo) sumas.fill(0);
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const distancia = distanciaDispersa(dispersos[i], dispersos[j]);
      for (let q = 0; q < ks.length; q++) sumasPorGrupo[q][asignaciones[q][j]] += distancia;
    }

    for (let q = 0; q < ks.length; q++) {
      if (!validas[q]) continue;
      const propio = asignaciones[q][i];
      const companeros = tamanos[q][propio] - 1;
      if (companeros === 0) continue;
      const a = sumasPorGrupo[q][propio] / companeros;

      let b = Infinity;
      for (let c = 0; c < ks[q]; c++) {
        if (c === propio || tamanos[q][c] === 0) continue;
        b = Math.min(b, sumasPorGrupo[q][c] / tamanos[q][c]);
      }
      if (b === Infinity) continue;
      totales[q] += (b - a) / Math.max(a, b);
    }
  }

  return totales.map((total, q) => (validas[q] ? total / n : -1));
}

/**
 * 4-5. GRUPOS Y NOMBRE AUTOMÁTICO.
 *
 * El número de grupos no se fija a mano: se prueban varios y se queda el que
 * mejor separa (silueta más alta). Con pocos comentarios se limita, porque
 * partir 6 textos en 5 grupos no clasifica nada.
 *
 * El nombre sale de los términos con más peso medio dentro del grupo y menos
 * fuera: son las palabras que hacen que ese grupo sea ese y no otro.
 */
export function clasificarComentarios(documentos: DocumentoTexto[]): GrupoComentarios[] {
  const utiles = documentos.filter((d) => limpiar(d.texto).length > 0);
  if (utiles.length < 4) {
    // Con tan pocos comentarios cualquier partición es ruido: se deja un solo
    // grupo en vez de inventar categorías.
    return utiles.length === 0
      ? []
      : [{ grupo: 0, nombre: "Sin clasificar", terminos: [], ids: utiles.map((d) => d.id) }];
  }

  const { vectores, vocabulario } = vectorizar(utiles);
  const originales = formasOriginales(utiles);
  if (vocabulario.length === 0) {
    return [{ grupo: 0, nombre: "Sin clasificar", terminos: [], ids: utiles.map((d) => d.id) }];
  }

  const maximo = Math.min(6, Math.floor(utiles.length / 3));
  let mejorAsignacion = new Array<number>(utiles.length).fill(0);
  let mejorK = 1;
  let mejorPuntaje = -Infinity;

  const ks: number[] = [];
  for (let k = 2; k <= Math.max(2, maximo); k++) ks.push(k);
  const asignaciones = ks.map((k) => kmeans(vectores, k));
  const puntajes = siluetas(vectores, asignaciones, ks);

  ks.forEach((k, q) => {
    if (puntajes[q] > mejorPuntaje) {
      mejorPuntaje = puntajes[q];
      mejorAsignacion = asignaciones[q];
      mejorK = k;
    }
  });

  const grupos: GrupoComentarios[] = [];
  for (let c = 0; c < mejorK; c++) {
    const indices = mejorAsignacion.flatMap((g, i) => (g === c ? [i] : []));
    if (indices.length === 0) continue;

    // Peso medio de cada término dentro del grupo, menos su peso medio fuera:
    // así el nombre lo forman las palabras propias, no las comunes a todos.
    const puntajes = vocabulario.map((termino, t) => {
      const dentro = indices.reduce((s, i) => s + vectores[i][t], 0) / indices.length;
      const fueraIdx = mejorAsignacion.flatMap((g, i) => (g !== c ? [i] : []));
      const fuera = fueraIdx.length
        ? fueraIdx.reduce((s, i) => s + vectores[i][t], 0) / fueraIdx.length
        : 0;
      return { termino, peso: dentro - fuera };
    });

    const terminos = puntajes
      .filter((p) => p.peso > 0)
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 4)
      // Se muestran con la escritura real de la gente, no la normalizada.
      .map((p) => originales.get(p.termino) ?? p.termino);

    grupos.push({
      grupo: c,
      nombre: nombrarGrupo(terminos),
      terminos,
      ids: indices.map((i) => utiles[i].id),
    });
  }

  // De mayor a menor: el grupo con más comentarios es el que primero interesa.
  return grupos
    .sort((a, b) => b.ids.length - a.ids.length)
    .map((g, i) => ({ ...g, grupo: i }));
}

/** "territorio, comunidad" → "Territorio y comunidad". */
function nombrarGrupo(terminos: string[]): string {
  if (terminos.length === 0) return "Otros comentarios";
  const principales = terminos.slice(0, 2);
  const texto =
    principales.length === 2 ? `${principales[0]} y ${principales[1]}` : principales[0];
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
