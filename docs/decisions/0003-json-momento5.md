# 0003 — JSON precalculado como fuente de «Resultados Momento 5 · CAI»

- Fecha: 2026-11-23 · Estado: Aceptada

## Decisión
La sección `/resultados-momento5` lee en vivo `data/source-momento5-cai/resultados.json`, el
archivo que genera el proyecto de análisis del Momento 5 a partir de los cinco formularios de
Microsoft Forms. Es una excepción acotada a «no hay JSON intermedios» (0002): no abre esa vía
para otros módulos, que siguen leyendo su .xlsx.

## Motivo
El JSON ya trae la depuración y la codificación analítica hechas por respuesta (exclusiones,
normalización de ajustes, categorías de proceso y dificultad, temas del MEDIT, tabla maestra de
participantes unida por correo). Reconstruirlas desde los Excel duplicaría esas reglas en
TypeScript y arriesgaría cambiar cifras ya presentadas.

## Consecuencias
- Se lee con `infrastructure/json.ts` (única puerta a los .json) y `CacheArchivo`: reemplazar el
  archivo se refleja en la siguiente petición. `momento5-formato.ts` solo protege la vista de
  nulos, vacíos o campos ausentes; no recalcula nada.
- Actualizar los datos es regenerar el JSON en el proyecto de análisis y reemplazar el archivo
  (ver `data/source-momento5-cai/README.md`); el portal no ejecuta el script de Python.
- El archivo contiene nombres de participantes y se publica con el sitio, igual que la vista.
- Las cifras derivadas (`lib/reglas/momento5.ts`) son las del dashboard de análisis; la prueba
  `tests/momento5.test.ts` fija las publicadas.

## Referencias
`repositories/datasource/json-momento5-source.ts` · `repositories/datasource/momento5-formato.ts` ·
`repositories/datasource/infrastructure/json.ts` · `lib/reglas/momento5.ts` ·
`tests/momento5.test.ts` · `next.config.ts` (`outputFileTracingIncludes`)
