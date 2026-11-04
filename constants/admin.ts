/**
 * Cookie que marca la sesión de /admin ya validada. La escribe el servidor
 * (httpOnly): el navegador la envía pero no puede leerla ni fabricarla desde
 * JavaScript. El PIN en sí no vive aquí sino en la variable de entorno
 * ADMIN_PIN — ver `.env.example`.
 */
export const COOKIE_ADMIN = "admin-validado";

/**
 * Duración del acceso. Al vencer, el navegador descarta la cookie solo y la
 * siguiente carga de /admin vuelve a pedir el PIN. Es un vencimiento absoluto
 * desde que se ingresó el PIN: navegar por la vista no lo renueva.
 */
export const DURACION_ACCESO_MINUTOS = 30;

/**
 * Zona horaria con que se fechan las descargas de /admin. Hay que decirla:
 * Vercel corre en UTC, y sin ella un archivo bajado a las 8 p. m. en Colombia
 * saldría con la fecha y la hora del día siguiente.
 */
export const ZONA_HORARIA = "America/Bogota";
