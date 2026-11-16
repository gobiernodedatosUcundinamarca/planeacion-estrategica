import { notFound } from 'next/navigation';
import { TextoEditorial } from '@/components/editorial/texto-editorial';
import { RecorridoConversatorios } from '@/components/conversatorios/recorrido-conversatorios';
import './conversatorios.css';
import '@/components/conversatorios/fondos.css';
import { DescargaExcel } from '@/components/layout/descarga-excel';
import { getVistaConversatorios } from '@/repositories/conversatoriosRepository';
import { estaSeccionPublicada } from '@/repositories/seccionesRepository';
import { SECCION_CONVERSATORIOS } from '@/constants/secciones';
export const metadata = { title: 'Conversatorios' };
export const dynamic = 'force-dynamic';
export default async function ConversatoriosPage() {
  if (!(await estaSeccionPublicada(SECCION_CONVERSATORIOS))) notFound();
  let inicial;
  try { inicial = await getVistaConversatorios(); }
  catch { return <p role="alert" className="rounded-xl border p-6"><TextoEditorial id="conversatorios-error-fuente" original="No se pudieron consultar las fuentes de Conversatorios. Intenta nuevamente cuando estén disponibles."/></p>; }
  return <div className="flex min-w-0 flex-col gap-6">
    <RecorridoConversatorios inicial={inicial}/><DescargaExcel ruta="/conversatorios"/>
  </div>;
}
