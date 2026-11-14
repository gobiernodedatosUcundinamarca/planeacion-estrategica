# Fuentes de Conversatorios

Las presentaciones oficiales de `Nicolaserd/Planeacion_estrategica_transformaciones_temas` se conservan completas en `presentaciones/`. Se incorporan únicamente los archivos vigentes de `flujo_bert_jev/informe/presentacionresumida/`, sin sus carpetas de respaldos. `origen.json` registra el commit y las huellas de los archivos incorporados; no contiene resultados estadísticos.

El datasource `PptxConversatoriosDataSource` lee directamente estas presentaciones y extrae las diapositivas tituladas «Conversatorio con el Rector». No utiliza una copia JSON de sus afirmaciones. Conserva el texto, la unidad, el grupo de interés, las solicitudes, las conclusiones y la referencia a la diapositiva. Ante un formato no reconocido genera un error en lugar de mostrar contenido incompleto como válido.

Los aportes del formulario «Comparte aquí tu aporte» permanecen en `aportes_respuestas`, mediante `aportesRepository`. Se trasladó su presentación a `/conversatorios`; no se fusionaron con las respuestas de las transformaciones ni se reinterpretaron como transcripciones de los conversatorios.

## Actualizar las presentaciones

1. Actualizar la copia del repositorio documental, conservando sus cambios locales.
2. Desde la raíz de este proyecto ejecutar:

   `pnpm exec tsx scripts/sincronizar-conversatorios.ts RUTA_DEL_REPOSITORIO_DOCUMENTAL`

3. Revisar `origen.json` y los archivos modificados. La pantalla local relee los archivos cuando cambia su fecha de modificación. Las sesiones abiertas consultan `/api/datos/conversatorios` cada 30 segundos y al recuperar el foco o la conexión.

El proceso es explícito: actualizar un repositorio externo no modifica automáticamente los archivos incorporados ni un despliegue de Vercel. En producción los archivos empaquetados requieren la publicación correspondiente, mientras que los aportes de PostgreSQL se consultan en cada actualización. El editor de textos controla etiquetas de la interfaz; no sustituye los datos ni la redacción de los documentos oficiales.

La publicación del módulo se controla mediante `secciones_publicadas.conversatorios`, con el mismo mecanismo y autorización de administración que las demás secciones.
