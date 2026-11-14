'use client';
import { useFuenteActualizable } from '@/hooks/use-fuente-actualizable';
import { AvisoActualizacion } from '@/components/layout/aviso-actualizacion';
import { TextoEditorial } from '@/components/editorial/texto-editorial';
import { Vista } from './vista';
import { PanelParticipacion } from '@/components/transformaciones-participacion/panel-participacion';
import type { DatosNarrativos } from './modelo';
import type { RegistroParticipacion } from '@/types/participacion';

type Datos = {registros:RegistroParticipacion[];datosNarrativos:DatosNarrativos;version:string};
export function ParticipacionActualizada({inicial}:{inicial:Datos}) {
  const {datos,error}=useFuenteActualizable(inicial,'/api/participacion');
  return <>{error ? <AvisoActualizacion/> : null}
    {datos.registros.length ? <Vista datosNarrativos={datos.datosNarrativos}><PanelParticipacion registros={datos.registros}/></Vista> : <p><TextoEditorial id="6e0e3936f5f9f5cff480" original="Todavía no hay tandas de asistencia cargadas. Se publican subiendo el Excel de participación desde la vista de administración."/></p>}
  </>;
}
