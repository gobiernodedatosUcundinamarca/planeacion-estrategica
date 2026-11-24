# 0004 — Descarga del Momento 5 con los formularios tal como se enviaron

- Fecha: 2026-11-24 · Estado: Aceptada

## Decisión
La descarga en Excel de `/resultados-momento5` entrega los cinco formularios de Microsoft Forms
tal como se enviaron, una hoja por formulario, con todas sus columnas, incluidos el nombre y el
correo de quien respondió. Solo se quitan los envíos que el análisis depuró (`meta.exclusiones` de
`resultados.json`), y la última hoja dice cuáles y por qué. Es una excepción acotada a la regla
de que las descargas públicas son anónimas: las demás secciones no cambian.

## Motivo
Los responsables pidieron el archivo «tal como fue enviado, con las excepciones que se tuvieron
en cuenta» y, preguntados por los datos personales, decidieron dejarlo todo (2026-11-24). La
página de la sección ya muestra los nombres de los participantes (0003).

## Consecuencias
- Las exportaciones originales viven en `data/forms_momento_5/` y se versionan con nombres y
  correos de unos 60 participantes. Se leen en vivo (`CacheArchivo`); solo alimentan la descarga,
  no las cifras de la página.
- `DESCARGAS_CON_DATOS_PERSONALES` (`lib/reglas/descargas.ts`) enumera las secciones exceptuadas:
  en ellas no se aplica `sinCorreos` y el aviso anónimo se reemplaza por uno que dice qué trae el
  archivo, en el botón y en el Excel. Agregar una sección ahí exige una decisión como esta.
- La descarga sigue con los límites por visitante y global, la copia en memoria y el registro
  de `/admin`.
- `tests/descarga-momento5.test.ts` fija que cada archivo trae los envíos originales del análisis
  y que, sin los depurados, quedan los válidos que muestra la página.

## Referencias
`lib/reglas/momento5-descarga.ts` · `lib/reglas/descargas.ts` ·
`repositories/descargasRepository.ts` · `repositories/datasource/excel-forms-momento5-source.ts` ·
`repositories/datasource/forms-momento5-formato.ts` · `data/forms_momento_5/README.md` ·
`next.config.ts` (`outputFileTracingIncludes`)
