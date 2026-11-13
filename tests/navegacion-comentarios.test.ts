import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { RespuestaMomento4 } from "@/types/momento4";
import type { ClasificacionDocumental } from "@/types/clasificacion-documental";
import { TODOS_LOS_COMENTARIOS as TODOS, POSTURAS_COMENTARIOS, alternarTema, claveTema, comentariosExistentes, contarPosturas, contarTemas, filtrarComentarios, opcionesComentarios, seleccionarNivel, compactarClasificacion, expandirClasificacion } from "@/lib/reglas/navegacion-comentarios";
import { consultarRespuestas } from "@/repositories/datasource/momento4-almacen";
import { consultarClasificacionDocumental } from "@/repositories/datasource/clasificacion-documental-almacen";
import { conexionSql } from "@/repositories/datasource/infrastructure/neon";

function respuesta(id: number, unidad: string|null, transformacion: string, grupo: string, postura: string|null, texto="Comentario de prueba"): RespuestaMomento4 {
  return {id,transformacion,etiqueta:transformacion,correo:null,nombre:null,fechaInicio:null,tipoActor:grupo,programaGraduado:null,unidadRegional:unidad,respondeNecesidad:postura,ajustes:texto,cluster:null};
}
function referencia(id: number, ...temas: string[]): ClasificacionDocumental {
  return {idRespuesta:id,estado:"con_temas",motivo:null,fuente:{archivo:"referencia.xlsx",sha256:"0".repeat(64),hoja:"Clasificación",fila:2,version:"4",taxonomia:null,sha256Taxonomia:null},
    temas:temas.map(t=>({id:t,codigo:t,nombre:t,componente:"Registrado",otrosComponentes:[],criterio:"Existente",exclusion:"Existente",justificacion:"Existente",probabilidad:.8}))};
}
const respuestas=[respuesta(1,"Fusagasugá","digital","Graduados","Sí"),respuesta(2,"Fusagasugá","digital","Graduados","Parcialmente"),
 respuesta(3,"Fusagasugá","digital","Administrativos","No"),respuesta(4,"Soacha","inteligente","Graduados",null),
 respuesta(5,null,"digital","Graduados","Respuesta no identificable"),respuesta(6,"Soacha","digital","Graduados","Sí","  ")];
const referencias=new Map([[1,referencia(1,"A1","A2")],[2,referencia(2,"A1")],[3,referencia(3,"A2")],[4,referencia(4,"A1")]]);

test("Todos los comentarios incluye cada texto completo, sin confundir textos iguales y registros duplicados",()=>{
 const originales=comentariosExistentes([...respuestas,respuestas[0]]);
 assert.deepEqual(originales.map(r=>r.id),[1,2,3,4,5]);
 assert.equal(filtrarComentarios(originales,referencias,TODOS).length,5);
 assert.equal(originales[0].ajustes,respuestas[0].ajustes);
});
test("cada nivel parcial filtra por regional, transformación y grupo con conteos únicos",()=>{
 const originales=comentariosExistentes(respuestas);
 const regional=seleccionarNivel(TODOS,"unidad","Fusagasugá");
 assert.equal(filtrarComentarios(originales,referencias,regional).length,3);
 const transformacion=seleccionarNivel(regional,"transformacion","digital");
 const grupo=seleccionarNivel(transformacion,"grupo","Graduados");
 assert.deepEqual(filtrarComentarios(originales,referencias,grupo).map(r=>r.id),[1,2]);
 assert.deepEqual(opcionesComentarios(originales,regional).transformaciones.map(o=>[o.id,o.total]),[["digital",3]]);
 const cambiado=seleccionarNivel({...grupo,temas:["digital:A1"]},"unidad","Soacha");
 assert.equal(cambiado.transformacion,null);assert.equal(cambiado.grupo,null);assert.deepEqual(cambiado.temas,[]);
 assert.equal(opcionesComentarios(originales,TODOS).unidades.find(o=>o.id==="Sin especificar")?.total,1);
});
test("el top temático respeta asignaciones múltiples y códigos por transformación sin duplicar",()=>{
 const originales=comentariosExistentes(respuestas);
 const temas=contarTemas(originales,referencias);
 assert.equal(temas.find(t=>t.id==="digital:A1")?.total,2);
 assert.equal(temas.find(t=>t.id==="inteligente:A1")?.total,1);
 let filtros=alternarTema(TODOS,"digital:A1");
 const primero=filtrarComentarios(originales,referencias,filtros);
 assert.deepEqual(primero.map(r=>r.id),[1,2]);
 assert.equal(contarTemas(primero,referencias).find(t=>t.id==="digital:A2")?.total,1);
 filtros=alternarTema(filtros,"digital:A2");
 assert.deepEqual(filtrarComentarios(originales,referencias,filtros).map(r=>r.id),[1]);
 assert.deepEqual(filtrarComentarios(originales,referencias,{...TODOS,sinTema:true}).map(r=>r.id),[5]);
});
test("la postura usa solo el campo del formulario, conserva ausentes y admite combinaciones vacías",()=>{
 const originales=comentariosExistentes(respuestas);
 assert.deepEqual(contarPosturas(originales),{si:1,parcialmente:1,no:1,otra:2});
 assert.deepEqual(filtrarComentarios(originales,referencias,{...TODOS,postura:"parcialmente"}).map(r=>r.id),[2]);
 assert.equal(filtrarComentarios(originales,referencias,{...TODOS,temas:["digital:A1"],postura:"no"}).length,0);
 assert.deepEqual(filtrarComentarios(originales,referencias,{...TODOS,postura:"otra"}).map(r=>r.id),[4,5]);
 assert.equal(filtrarComentarios(originales,referencias,TODOS).length,5);
});
test("compactar las referencias no modifica ninguna clasificación ni probabilidad",()=>{
 const original={disponible:true,comentarios:[...referencias.values()]};
 assert.deepEqual([...expandirClasificacion(compactarClasificacion(original)).values()],original.comentarios);
});

test("copia local completa: 3379 textos, top 5, todos los cruces y posturas, sin cambios en datos o asignaciones",{skip:process.env.PORTAL_SQL_LOCAL!=="1"||!process.env.NAVEGACION_AUDITORIA},async()=>{
 const destino=new URL(process.env.DATABASE_URL!);assert.equal(destino.hostname,"db.localtest.me");assert.equal(destino.pathname,"/planeacion_local");
 const origen=JSON.parse(readFileSync(process.env.NAVEGACION_COPIA!,"utf8").replace(/^\uFEFF/,""));
 const datos=JSON.parse(readFileSync(process.env.NAVEGACION_AUDITORIA!,"utf8"));
 const sql=conexionSql();
 const hash=(r:Record<string,unknown>)=>createHash("sha256").update(JSON.stringify(Object.keys(r).sort().map(k=>[k,r[k]]))).digest("hex");
 const originales=JSON.parse(origen.tablas.find((t:{tabla:string})=>t.tabla==="momento4_respuestas").json) as Record<string,unknown>[];
 const porId=new Map(originales.map(r=>[r.id,hash(r)]));
 const actuales=await sql`select to_jsonb(r) as fila from momento4_respuestas r`;
 assert.equal(actuales.length,3860);for(const {fila}of actuales)assert.equal(hash(fila),porId.get(fila.id));
 for(const [tabla,esperado]of [["momento4_fuentes_documentales",datos.fuentes],["momento4_temas_documentales",datos.temas],
 ["momento4_comentarios_documentales",datos.comentarios],["momento4_asignaciones_documentales",datos.asignaciones]] as const){
   const filas=await sql.query(`select to_jsonb(t) as fila from ${tabla} t`);
   assert.deepEqual(filas.map(r=>hash(r.fila as Record<string,unknown>)).sort(),esperado.map(hash).sort(),`Se alteró ${tabla}`);
 }
 const comentarios=comentariosExistentes(await consultarRespuestas(sql));
 const clasificacion=await consultarClasificacionDocumental(sql);const mapa=expandirClasificacion(compactarClasificacion(clasificacion));
 assert.equal(comentarios.length,3379);assert.equal(filtrarComentarios(comentarios,mapa,TODOS).length,3379);
 const asignaciones=new Map<string,Set<string>>();
 for(const a of datos.asignaciones){const key=`${a.transformacion}:${a.respuesta_id}`;
   if(!asignaciones.has(key))asignaciones.set(key,new Set());asignaciones.get(key)!.add(claveTema(a.transformacion,a.tema_id));}
 const expectativas=(grupo:RespuestaMomento4[],tema:string)=>grupo.filter(r=>asignaciones.get(`${r.transformacion}:${r.respuestaId}`)?.has(tema));
 const global=contarTemas(comentarios,mapa);
 assert.equal(global.length,23);for(const t of global)assert.equal(t.total,expectativas(comentarios,t.id).length);
 assert.equal(global.slice(0,5).length,5);for(let i=1;i<global.length;i++)assert.ok(global[i-1].total>=global[i].total);
 let cruces=0;
 for(const unidad of opcionesComentarios(comentarios,TODOS).unidades){
  const porUnidad=seleccionarNivel(TODOS,"unidad",unidad.id);
  assert.equal(filtrarComentarios(comentarios,mapa,porUnidad).length,unidad.total);
  for(const trans of opcionesComentarios(comentarios,porUnidad).transformaciones){
   const porTrans=seleccionarNivel(porUnidad,"transformacion",trans.id);
   assert.equal(filtrarComentarios(comentarios,mapa,porTrans).length,trans.total);
   for(const grupo of opcionesComentarios(comentarios,porTrans).grupos){
    const filtros=seleccionarNivel(porTrans,"grupo",grupo.id);const base=filtrarComentarios(comentarios,mapa,filtros);
    assert.equal(base.length,grupo.total);
    for(const t of contarTemas(base,mapa)){
     const esperado=expectativas(base,t.id);const seleccion={...filtros,temas:[t.id]};
     assert.deepEqual(filtrarComentarios(comentarios,mapa,seleccion).map(r=>r.id).sort((a,b)=>a-b),esperado.map(r=>r.id).sort((a,b)=>a-b));
     for(const postura of POSTURAS_COMENTARIOS){
      // Comparación independiente con los valores originales de Forms.
      const texto={si:"SI",parcialmente:"PARCIALMENTE",no:"NO",otra:""}[postura.id];
      const raw=esperado.filter(r=>{const v=(r.respondeNecesidad??"").trim().toUpperCase();return postura.id==="otra"?!["SI","SÍ","PARCIALMENTE","NO"].includes(v):texto==="SI"?["SI","SÍ"].includes(v):v===texto;});
      assert.equal(filtrarComentarios(comentarios,mapa,{...seleccion,postura:postura.id}).length,raw.length);cruces++;
     }
    }
   }
  }
 }
 assert.ok(cruces>2000);console.log(`Cruces tema/postura por regional, transformación y grupo: ${cruces}`);
 const final=filtrarComentarios(comentarios,mapa,TODOS);assert.equal(final.length,3379);assert.equal(new Set(final.map(r=>r.id)).size,3379);
});
