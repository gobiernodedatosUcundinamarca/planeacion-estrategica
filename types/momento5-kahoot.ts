/**
 * Kahoot de Apropiación del MEDIT (Actividad 3 del Momento 5, 18 de noviembre de
 * 2026): el reporte que exporta Kahoot de un juego en vivo, leído tal cual
 * (`data/forms_momento_5/Actividad3-Momento5-….xlsx`). Las preguntas y las
 * opciones de respuesta van como las escribió el juego. No se publica ningún
 * apodo ni nombre de jugador: solo conteos.
 */

export interface OpcionKahoot {
  texto: string;
  /** Jugadores que la eligieron. */
  total: number;
  /** La que eligieron todos los jugadores que acertaron las cinco preguntas (Kahoot no exporta la clave). */
  correcta: boolean;
}

export interface PreguntaKahoot {
  numero: number;
  pregunta: string;
  tipo: string;
  /** Fracción 0–1 de jugadores que acertaron, como la calcula Kahoot. */
  precision: number;
  /** Segundos promedio por jugador. */
  tiempoPromedio: number;
  correctas: number;
  incorrectas: number;
  sinResponder: number;
  opciones: OpcionKahoot[];
}

export interface KahootMomento5 {
  jugadores: number;
  /** Fracción 0–1 de respuestas correctas del juego. */
  precision: number;
  preguntas: PreguntaKahoot[];
  /** Jugadores por número de preguntas acertadas: el índice es el número de aciertos (0…n). */
  porAciertos: number[];
}
