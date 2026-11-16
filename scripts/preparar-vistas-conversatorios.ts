import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readdirSync,readFileSync,mkdirSync,existsSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {CFB} from 'xlsx';
import {interpretarConversatorio} from '../lib/reglas/conversatorios';

// Caché documental reproducible; nunca modifica las presentaciones originales.
const raiz=join(process.cwd(),'data/source-conversatorios');
let paginas=0;
for(const archivo of readdirSync(join(raiz,'presentaciones')).filter(n=>/^Presentacion_.*_Resumen\.pptx$/.test(n))){
  const fuente=join(raiz,'presentaciones',archivo),bytes=readFileSync(fuente);
  const hash=createHash('sha256').update(bytes).digest('hex');
  const zip=CFB.read(bytes,{type:'buffer'}) as {FullPaths:string[];FileIndex:{content:Uint8Array}[]};
  for(const [i,ruta] of zip.FullPaths.entries()){
    const numero=ruta.match(/ppt\/slides\/slide(\d+)\.xml$/)?.[1];
    if(!numero)continue;
    const xml=Buffer.from(zip.FileIndex[i].content).toString('utf8');
    const textos=[...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map(m=>m[1]);
    if(!interpretarConversatorio(textos,Number(numero)))continue;
    const carpeta=join(raiz,'vistas',hash),destino=join(carpeta,`${numero}.png`);
    if(!existsSync(destino)){
      if(process.platform!=='win32')throw Error('Para generar vistas nuevas se necesita PowerPoint en Windows');
      mkdirSync(carpeta,{recursive:true});
      const temporal=join(carpeta,`${numero}.generando.png`);
      execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(process.cwd(),'scripts/renderizar-fuente-conversatorios.ps1'),'-Documento',fuente,'-Destino',temporal,'-Pagina',numero],{windowsHide:true,timeout:90000});
      renameSync(temporal,destino);
    }
    if(readFileSync(destino).subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Vista no válida: '+archivo);
    paginas++;
  }
}
console.log(`Vistas verificadas desde las fuentes actuales: ${paginas}`);
