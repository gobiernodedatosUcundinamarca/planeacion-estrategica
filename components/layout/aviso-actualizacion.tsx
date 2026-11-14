import { TextoEditorial } from '@/components/editorial/texto-editorial';
export function AvisoActualizacion() {
  return <p role="status" className="rounded-lg border border-border p-3 text-sm"><TextoEditorial id="fuente-aviso-actualizacion" original="No se pudo consultar la última actualización. Se conserva la información cargada y se reintentará automáticamente."/></p>;
}
