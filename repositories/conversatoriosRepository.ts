import 'server-only';
import { getConversatoriosDataSource } from './datasource';
import { getAportes } from './aportesRepository';
import { versionarDatos } from '@/lib/datos-versionados';
export const getDocumentosConversatorios = () => getConversatoriosDataSource().obtener();
export const leerPresentacionConversatorios = (archivo: string) => getConversatoriosDataSource().leerArchivo(archivo);
export async function getVistaConversatorios() {
  const [documentos, aportes] = await Promise.all([Promise.resolve().then(getDocumentosConversatorios), getAportes()]);
  return versionarDatos({ documentos, aportes });
}
