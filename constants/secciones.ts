/**
 * Secciones cuya publicación se activa o desactiva desde la vista de
 * administración. El identificador es la clave en la tabla `secciones_publicadas`
 * y no cambia aunque cambie la URL o el título de la sección.
 */
export const SECCION_TRANSFORMACIONES = "transformaciones";

/** Participación (asistencia a las actividades en territorio) — sección aparte del Momento 4. */
export const SECCION_PARTICIPACION = "transformaciones-participacion";

/** Valoración de la experiencia en territorio (instrumento al cierre de cada jornada). */
export const SECCION_VALORACION_TERRITORIO = "valoracion-territorio";

/** Encuesta diagnóstica sobre uso de IA en procesos administrativos. */
export const SECCION_IA_ADMINISTRATIVOS = "ia-administrativos";

/**
 * Rutas que solo se muestran si su sección está publicada. El menú lateral las
 * oculta y la propia página responde 404 cuando están desactivadas — ocultar el
 * enlace sin cerrar la ruta dejaría la sección accesible a quien tenga la URL.
 */
export const RUTA_POR_SECCION: Record<string, string> = {
  [SECCION_TRANSFORMACIONES]: "/transformaciones",
  [SECCION_PARTICIPACION]: "/transformaciones-participacion",
  [SECCION_VALORACION_TERRITORIO]: "/valoracion-territorio",
  [SECCION_IA_ADMINISTRATIVOS]: "/ia-administrativos",
};
