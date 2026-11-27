# Actividad 2 del Momento 5 · transcripción

`actividad2.xlsx` alimenta los capítulos de la Actividad 2 en `/resultados-momento5`. Es una
transcripción literal, sin corregir, de los archivos de `data/momento5_actividad_2/`
(docs/decisions/0005). La página lo relee en la siguiente petición.

| Hoja | Una fila por | Notas |
|---|---|---|
| `instrumentos` | instrumento | `Id` fijo: `pregunta-inicial`, `reto1`, `reto2`, `aprendizajes`. |
| `enunciados` | enunciado de un instrumento | «Pregunta base: …» del Reto 1 y la consigna del Reto 2. |
| `mesas` | mesa (Reto 1) | Los encabezados `¿…?` y «Mensaje de cierre para tus colegas:» son las preguntas de la ficha y se muestran tal cual. |
| `indicadores` | indicador propuesto | Encabezados de la tabla «Indicadores propuestos» de la ficha; `Origen` dice de dónde sale. |
| `reto2` | elemento de un registro | `Elemento` es el rótulo de la ficha; `Registro` agrupa los elementos. |
| `nubes` | frase de Mentimeter | `Tamaño en la imagen`: 3, 2 o 1 (no es un conteo). Con texto en `Se omite`, la frase no se muestra y el motivo sí. |
| `archivos` | archivo recibido | Cómo se usó. «Guardado por/el» (propiedades del archivo) es solo registro interno: la página no lo muestra. |

## Actualizar

1. Copiar el archivo nuevo a `data/momento5_actividad_2/` y transcribirlo, tal como está escrito,
   en la hoja que corresponda. Agregar su fila en `archivos`.
2. No cambiar los encabezados: la página busca cada columna por su nombre y muestra las
   preguntas desde ahí.
3. Ejecutar `pnpm exec tsx --test tests/momento5-actividad2.test.ts`. Si las cifras cambiaron a
   propósito, actualizar las esperadas.

El libro incluye nombres de participantes y se publica con el sitio.
