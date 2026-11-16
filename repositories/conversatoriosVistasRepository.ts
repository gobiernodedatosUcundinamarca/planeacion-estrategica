import 'server-only';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {getDocumentosConversatorios,leerPresentacionConversatorios} from './conversatoriosRepository';

const ejecutar=promisify(execFile);
const pendientes=new Map<string,Promise<Buffer>>();
let cola:Promise<unknown>=Promise.resolve();
/** Las vistas se identifican por el hash actual de la fuente y su referencia interna. */
export async function getImagenFuenteConversatorios(archivo:string,pagina:number,version:string|null){
  if(!/^[\w-]+\.pptx$/.test(archivo)||!Number.isSafeInteger(pagina)||pagina<1)throw Error('Referencia no válida');
  const documento=getDocumentosConversatorios().find(d=>d.archivo===archivo);
  if(!documento?.diapositivas.some(d=>d.numero===pagina))throw Error('Referencia no encontrada');
  if(version&&version!==documento.sha256)throw Error('La fuente cambió. Actualiza el recorrido');
  const bytes=leerPresentacionConversatorios(archivo);
  if(!bytes)throw Error('No se pudo obtener el documento original');
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(hash!==documento.sha256)throw Error('La fuente se está actualizando. Inténtalo de nuevo');
  const preparada=path.join(process.cwd(),'data/source-conversatorios/vistas',hash,`${pagina}.png`);
  try{return await readFile(preparada)}catch{/* Esta versión necesita una vista nueva. */}
  const carpeta=path.resolve(process.cwd(),'../../uso-local/vistas-fuentes-conversatorios',hash);
  const destino=path.join(carpeta,`${pagina}.png`);
  if(!process.env.VERCEL){try{return await readFile(destino)}catch{/* Conversión local pendiente. */}}
  if(process.platform!=='win32'||process.env.VERCEL)throw Error('La vista de esta versión todavía no está disponible');
  const clave=`${hash}/${pagina}`;
  const existente=pendientes.get(clave);
  if(existente)return existente;
  const trabajo=cola.then(async()=>{
    await mkdir(carpeta,{recursive:true});
    const pptx=path.join(carpeta,'fuente.pptx');
    const temporal=path.join(carpeta,`${pagina}.generando.png`);
    await writeFile(pptx,bytes);
    try{
      await ejecutar('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(process.cwd(),'scripts/renderizar-fuente-conversatorios.ps1'),'-Documento',pptx,'-Destino',temporal,'-Pagina',String(pagina)],{windowsHide:true,timeout:90000,maxBuffer:1024*1024});
      const imagen=await readFile(temporal);
      if(!imagen.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Vista previa no válida');
      await rename(temporal,destino);
      return imagen;
    }finally{await rm(temporal,{force:true})}
  });
  cola=trabajo.catch(()=>{});
  pendientes.set(clave,trabajo);
  try{return await trabajo}finally{pendientes.delete(clave)}
}
