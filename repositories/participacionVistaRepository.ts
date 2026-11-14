import 'server-only';
import { versionarDatos } from '@/lib/datos-versionados';
import { getRegistrosParticipacion } from './participacionRepository';
import { getConvocatoriaDocumental } from './convocatoriaRepository';
import { crearNarrativa } from '@/components/participacion-narrativa/modelo';

/** Una lectura alimenta todos los indicadores y el detalle de la sección. */
export async function getVistaParticipacion() {
  const [registros,convocatoria] = await Promise.all([getRegistrosParticipacion(),getConvocatoriaDocumental()]);
  const datosNarrativos = crearNarrativa(registros,convocatoria);
  return versionarDatos({registros,datosNarrativos});
}
