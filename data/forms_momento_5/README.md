# Formularios del Momento 5 · exportaciones de Microsoft Forms

Las cinco exportaciones originales de los formularios del 17 y 18 de noviembre de 2026, copiadas
sin cambios de la carpeta del proyecto de análisis «Solicitud de resultados de actividades –
Momento 5 del CAI Planeación Estratégica 2027-2037». Alimentan solo la descarga en Excel de
`/resultados-momento5`; las cifras de la página salen de `data/source-momento5-cai/resultados.json`.

Contienen nombres y correos de quienes respondieron, y la descarga los publica por decisión de
los responsables (docs/decisions/0004).

## Actualizar

1. Reemplazar el .xlsx del formulario por la nueva exportación de Forms. El nombre puede variar
   («(1-51)» cambia con el número de envíos): cada archivo se reconoce por el nombre del formulario.
2. Si cambió la depuración, regenerar también `resultados.json` (ver su README).
3. Ejecutar `pnpm exec tsx --test tests/descarga-momento5.test.ts`: comprueba que cada archivo trae
   los envíos originales que registra el análisis y que, sin los depurados, quedan los válidos.
