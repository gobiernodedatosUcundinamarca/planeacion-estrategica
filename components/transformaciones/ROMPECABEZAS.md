# Rompecabezas integrado

El componente usa los recortes originales del prototipo, copiados a `public/rompecabezas/`. `piezas.json` solo relaciona la identidad de cada transformación con sus imágenes y posiciones en Misión y Visión. No contiene estadísticas ni resultados. Las dos caras tienen posiciones distintas: la asociación se realiza por identidad, nunca por índice.

`TransformacionesActualizadas` conserva una única lectura de `/api/datos/transformaciones`. Esa misma lectura alimenta el resumen del rompecabezas, las tarjetas por transformación, los indicadores y los comentarios. `resumirTransformaciones` obtiene los grupos desde los registros y aplica las reglas existentes de respaldo y comentarios. Un grupo nuevo sin recurso gráfico sigue apareciendo con un icono de sustitución y sus resultados. No se inventan respuestas para completar las piezas del material institucional.

Seleccionar una tarjeta recorta indicadores y comentarios por transformación; una segunda pulsación o «Ver todas las transformaciones» elimina ese recorte. Los aportes generales conservan su cuestionario independiente. La actualización de la fuente mantiene la selección cuando el grupo sigue existiendo; si desaparece, se vuelve al conjunto actual.

La escena empieza ensamblada y espera la carga de las imágenes antes de abrirse suavemente. El desplazamiento la vuelve a ensamblar. La animación se suspende fuera de pantalla, respeta la preferencia de movimiento reducido y permanece ensamblada en el marco de escritorio escalado para teléfonos. Los estilos están limitados al componente; la navegación, el editor y las preferencias tipográficas son los del sitio.

Los textos descriptivos están registrados en el catálogo editorial. Los conteos y resultados se mantienen separados de las etiquetas editables. Las imágenes conservan el texto propio del material institucional original; una actualización de ese material requiere reemplazar sus recursos gráficos, no alterar resultados estadísticos.
