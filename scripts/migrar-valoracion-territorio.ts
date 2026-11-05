/**
 * Crea (si no existen) las tablas de la valoración de la experiencia en
 * territorio. Se ejecuta a mano —`pnpm migrar:valoracion-territorio`— y es
 * idempotente. Las respuestas se cargan después desde /admin.
 */
import { DEFINICION_VALORACION_TERRITORIO } from "@/repositories/datasource/formularios-definicion";
import { crearTablasFormulario } from "./tablas-formulario";

crearTablasFormulario(DEFINICION_VALORACION_TERRITORIO).catch((error) => {
  console.error("Falló la migración:", error);
  process.exit(1);
});
