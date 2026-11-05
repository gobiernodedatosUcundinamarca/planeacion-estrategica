/**
 * Crea (si no existen) las tablas de la encuesta de IA a administrativos. Se
 * ejecuta a mano —`pnpm migrar:ia-administrativos`— y es idempotente. Las
 * respuestas se cargan después desde /admin.
 */
import { DEFINICION_IA_ADMINISTRATIVOS } from "@/repositories/datasource/formularios-definicion";
import { crearTablasFormulario } from "./tablas-formulario";

crearTablasFormulario(DEFINICION_IA_ADMINISTRATIVOS).catch((error) => {
  console.error("Falló la migración:", error);
  process.exit(1);
});
