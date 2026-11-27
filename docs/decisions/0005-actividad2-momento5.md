# 0005 — Actividad 2 del Momento 5: transcripción literal a un Excel en vivo

- Fecha: 2026-11-27 · Estado: Aceptada

## Decisión
La Actividad 2 del Momento 5 (17 de noviembre de 2026, después de la Actividad 1) se publica
dentro de `/resultados-momento5` a partir de `data/source-momento5-actividad2/actividad2.xlsx`,
una transcripción literal de las fichas por mesa (.pptx, .pdf, .txt) y de las dos nubes de
Mentimeter (imágenes). Se lee en vivo con `infrastructure/excel.ts` y `CacheArchivo`, como
cualquier `data/source-*/` (0002). Los archivos originales se conservan en
`data/momento5_actividad_2/`, fuera del sitio.

- Las preguntas, los enunciados y los nombres de los instrumentos vienen en el libro (como
  encabezados de columna o en la hoja `enunciados`) y la vista los muestra tal cual: no se
  parafrasean en el código.
- Mesa N = Equipo N de las actividades 1 y 3: el filtro de equipo de la sección también filtra
  las mesas. Lo comprueba `tests/momento5-actividad2.test.ts` con los integrantes que traen las
  fichas y con quién guardó cada archivo.
- De la Mesa 2 llegaron cuatro archivos con el mismo contenido en distinta redacción (dos
  idénticos): se publica el último guardado. La hoja `archivos` registra cada archivo recibido y
  cómo se usó (y, como dato interno, quién lo guardó y cuándo según sus propiedades); la página
  muestra al final solo el archivo, la mesa, el uso y una nota, sin esos metadatos.
- Las nubes de Mentimeter no traen conteos: el tamaño de cada frase se transcribió de la imagen en
  tres niveles y la página lo dice. Se dibujan con los colores de la sección.

- El **Kahoot de Apropiación del MEDIT** (Actividad 3) llega como reporte de Kahoot en
  `data/forms_momento_5/`. Se lee tal cual (sin transcribir) con su propio origen, que lo reconoce
  por la hoja `Quiz Details`; el origen de la descarga de Forms lo ignora. Solo se publican
  conteos, ningún apodo de jugador.

## Motivo
Leer los originales en vivo exigiría un lector de PDF nuevo, interpretar diapositivas con
plantillas distintas y elegir entre versiones duplicadas en cada petición. Un libro con una hoja
por instrumento se corrige a mano, se valida con la prueba y sigue la vía normal de datos, sin
ampliar la excepción del JSON (0003).

## Consecuencias
- Si llega otra ficha o se corrige un texto, se edita `actividad2.xlsx` (no los originales) y se
  agrega la fila correspondiente en `archivos`. Ver `data/source-momento5-actividad2/README.md`.
- La descarga en Excel de la sección (0004) sigue trayendo solo los formularios de Forms.
- El libro contiene nombres de participantes y de quien guardó cada archivo, y se publica con el
  sitio, igual que el resto de la sección.

## Referencias
`data/source-momento5-actividad2/README.md` · `data/momento5_actividad_2/README.md` ·
`repositories/datasource/excel-momento5-actividad2-source.ts` ·
`repositories/datasource/momento5-actividad2-formato.ts` · `lib/reglas/momento5-actividad2.ts` ·
`tests/momento5-actividad2.test.ts` · `next.config.ts` (`outputFileTracingIncludes`)
