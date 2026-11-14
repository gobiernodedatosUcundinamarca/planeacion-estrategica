'use client';
import { TextoEditorial,useTextoEditorial } from '@/components/editorial/texto-editorial';
import { etiquetaJornadasSinConteo } from './modelo';

export function TituloJornadas({total}:{total:number}) {
  const heredada=useTextoEditorial('1a2ad35cec0850d57de3','Jornadas de');
  return <>{total} <TextoEditorial id="participacion-etiqueta-jornadas" original={etiquetaJornadasSinConteo(heredada)}/></>;
}
