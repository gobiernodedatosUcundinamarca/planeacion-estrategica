# Resultados del Momento 5 · CAI

`resultados.json` alimenta la sección `/resultados-momento5`. Es una copia sin cambios del
archivo que genera el proyecto de análisis «Solicitud de resultados de actividades – Momento 5
del CAI Planeación Estratégica 2027-2037» (`dashboard/src/data/resultados.json`) a partir de los
cinco formularios de Microsoft Forms del 17 y 18 de noviembre de 2026.

El portal no recalcula la depuración ni la codificación: las exclusiones, la normalización de
los ajustes de equipo, las categorías de proceso y dificultad y los temas del MEDIT vienen en el
archivo. Solo se protege la vista de valores nulos, vacíos o de relleno, y se descartan las
valoraciones sin transformación o estado reconocibles y los registros grupales sin número de
equipo (con el archivo actual no hay ninguno). Ver docs/decisions/0003.

## Actualizar

1. En el proyecto de análisis, regenerar el archivo con su script de procesamiento.
2. Reemplazar `resultados.json` en esta carpeta. La página lo relee en la siguiente petición.
3. Ejecutar `pnpm exec tsx --test tests/momento5.test.ts`. Si las cifras cambiaron a propósito,
   actualizar las esperadas en la prueba.

El archivo incluye nombres de participantes y se publica con el sitio.
