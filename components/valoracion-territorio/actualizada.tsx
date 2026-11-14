'use client';
import { useFuenteActualizable } from '@/hooks/use-fuente-actualizable';
import { AvisoActualizacion } from '@/components/layout/aviso-actualizacion';
import { TextoEditorial } from '@/components/editorial/texto-editorial';
import { PanelValoracionTerritorio } from './panel-valoracion-territorio';
import type { VistaValoracionTerritorio } from '@/types/valoracion-territorio';

export function ValoracionActualizada({inicial}:{inicial:{vista:VistaValoracionTerritorio;version:string}}) {
  const {datos,error}=useFuenteActualizable(inicial,'/api/datos/valoracion');
  return <>{error?<AvisoActualizacion/>:null}{datos.vista.respuestas.length ? <PanelValoracionTerritorio {...datos.vista}/> : <p><TextoEditorial id="5381e64d33b4ae952112" original="Todavía no hay respuestas publicables en esta selección de la fuente."/></p>}</>;
}
