# Convocatoria de las jornadas

`convocatoria-roles.csv` contiene la población convocada de la diapositiva 2 de las siete presentaciones resumidas. Las rutas y huellas SHA-256 de esas presentaciones están en `convocatoria.csv`. Los cuatro grupos son estudiantes, docentes, administrativos y graduados. Administrativos reúne planta y trabajadores.

La suma de los convocados por rol debe coincidir con el total de cada unidad; el lector documental rechaza datos que no cumplan esa condición. `pnpm migrar:convocatoria` prepara `participacion_convocatoria` en la base configurada e importa estas fuentes sin sobrescribir filas existentes. Debe ejecutarse expresamente para cada entorno. No se ejecuta una migración ni se escribe en la base al visitar la página.

Cuando existe esa tabla, los convocados se leen de PostgreSQL en cada consulta y los totales regionales se calculan sumando sus roles. Una corrección en la tabla se refleja automáticamente, sin editar código ni desplegar. Los campos `fuente`, `diapositiva` y `sha256` conservan el origen documental. Al actualizar las presentaciones deben verificarse y actualizarse las filas correspondientes de la tabla; no se considera que editar otro repositorio cambie automáticamente una base de datos.

En entornos donde todavía no existe la tabla se usa la fuente CSV, cuya caché se invalida al cambiar cualquiera de los dos archivos. Los archivos de producción forman parte del despliegue. Una tabla existente pero vacía o inválida produce un error visible: no se sustituye silenciosamente por datos anteriores.

La columna histórica `asistentes` de `convocatoria.csv` se conserva para trazabilidad. **No alimenta las cifras publicadas**: el modelo la sustituye por el conteo actual de `participacion_registros`, agrupado por lugar del encuentro. Tampoco se usa el porcentaje publicado como indicador actual.

`/api/participacion` consulta PostgreSQL y calcula el mismo modelo que la página inicial. La pantalla consulta cada 30 segundos mientras está visible, además de al recuperar foco o conexión. Usa una huella de contenido para evitar descargar y renderizar registros que no cambiaron. Los errores conservan la última lectura y muestran un aviso. El endpoint no permite escrituras.

Los porcentajes de asistencia usan los convocados del mismo grupo y lugar. Los porcentajes de distribución usan las asistencias de la selección actual. No se estima una convocatoria independiente para planta o trabajadores ni se limita una tasa al 100 %. Los lugares o roles sin convocatoria se conservan sin inventar denominadores.
