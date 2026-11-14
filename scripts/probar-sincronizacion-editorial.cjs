(async()=>{
const {chromium,webkit}=await import('playwright');
const {default:assert}=await import('node:assert/strict');const fs=await import('node:fs');
const BASE=process.env.EDITORIAL_PRUEBA_URL||'http://127.0.0.1:3217';
const id='e6a4d21f47539bd3b032',texto='TRABAJO EN TERRITORIO · VERIFICACIÓN TEMPORAL';
 const browser=await chromium.launch(),safari=await webkit.launch();let editor,original,originalVisible,modificado=false;
 try{
  editor=await browser.newContext();const visitante=await browser.newContext();
  const a=await editor.newPage(),b=await visitante.newPage();
  await Promise.all([a.goto(BASE+'/transformaciones-participacion',{waitUntil:'networkidle'}),b.goto(BASE+'/transformaciones-participacion',{waitUntil:'networkidle'})]);
  original=await a.request.get(BASE+'/api/editorial').then(r=>r.json());originalVisible=await a.locator(`[data-editorial-id="${id}"]`).innerText();
  assert.equal((await b.request.post(BASE+'/api/editorial',{headers:{Origin:BASE},data:{id,valor:texto,revision:original.revision}})).status(),401);
  await a.getByRole('button',{name:'Activar modo de edición',exact:true}).click();
  await a.locator('.dialogo-editorial[open] input[type=password]').fill(process.env.EDITORIAL_PRUEBA_CLAVE);
  await a.locator('.dialogo-editorial[open]').getByRole('button',{name:'Ingresar',exact:true}).click();
  await a.locator(`[data-editorial-id="${id}"] .lapiz-editorial`).click();
  await a.locator('.dialogo-editorial[open] textarea').fill(texto);
  modificado=true;
  await a.locator('.dialogo-editorial[open]').getByRole('button',{name:'Guardar',exact:true}).click();
  await a.locator('.dialogo-editorial[open]').waitFor({state:'hidden'});modificado=true;
  const persistido=await a.request.get(BASE+'/api/editorial').then(r=>r.json());assert.equal(persistido.textos[id],texto);
  const inicio=Date.now();await b.waitForFunction(({id,texto})=>document.querySelector(`[data-editorial-id="${id}"]`)?.textContent===texto,{id,texto},{timeout:12000});
  const latencia=Date.now()-inicio;
  const c=await safari.newPage();await c.goto(BASE+'/transformaciones-participacion',{waitUntil:'networkidle'});
  await c.waitForFunction(({id,texto})=>document.querySelector(`[data-editorial-id="${id}"]`)?.textContent===texto,{id,texto});
  await a.reload({waitUntil:'networkidle'});await a.waitForFunction(({id,texto})=>document.querySelector(`[data-editorial-id="${id}"]`)?.textContent===texto,{id,texto});
  await a.getByRole('button',{name:'Activar modo de edición',exact:true}).click();
  await a.locator(`[data-editorial-id="${id}"] .lapiz-editorial`).click();
  if(Object.hasOwn(original.textos,id)){await a.locator('.dialogo-editorial[open] textarea').fill(original.textos[id]);await a.locator('.dialogo-editorial[open]').getByRole('button',{name:'Guardar',exact:true}).click()}
  else await a.locator('.dialogo-editorial[open]').getByRole('button',{name:'Restaurar texto original',exact:true}).click();
  await a.locator('.dialogo-editorial[open]').waitFor({state:'hidden'});
  for(const p of [b,c])await p.waitForFunction(({id,originalVisible})=>document.querySelector(`[data-editorial-id="${id}"]`)?.textContent===originalVisible,{id,originalVisible},{timeout:12000});
  const final=await a.request.get(BASE+'/api/editorial').then(r=>r.json());assert.deepEqual(final.textos,original.textos);modificado=false;
  const informe={url:BASE,antes:original.revision,despues:final.revision,loginReal:true,guardadoPersistente:true,otroNavegador:true,recarga:true,sesionAbierta:true,latenciaObservadaMs:latencia,restauracionExacta:true,escrituraSinPermisoRechazada:true};
  if(process.env.EDITORIAL_PRUEBA_SALIDA){fs.mkdirSync(process.env.EDITORIAL_PRUEBA_SALIDA,{recursive:true});fs.writeFileSync(process.env.EDITORIAL_PRUEBA_SALIDA+'/prueba.json',JSON.stringify(informe,null,2))}console.log(informe);
 }finally{
  if(modificado&&editor){const actual=await editor.request.get(BASE+'/api/editorial').then(r=>r.json());if(actual.textos[id]===texto){const r=await editor.request.post(BASE+'/api/editorial',{headers:{Origin:BASE},data:{id,valor:original.textos[id]??null,revision:actual.revision}});console.log('Restauración de seguridad:',r.status())}}
  await browser.close();await safari.close();
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1});
