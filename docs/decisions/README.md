# Registro de decisiones

Decisiones que afectan trabajo futuro y no se deducen del código: arquitectura y límites
entre módulos, contratos y modelos de datos, autenticación y seguridad, dependencias
fundamentales, migraciones e incompatibilidades. No se registran comandos, logs ni
correcciones menores.

| N.º | Decisión | Estado |
|---|---|---|
| [0001](0001-base-local-en-ejecutable.md) | Base de datos local en el ejecutable portable | Aceptada |
| [0002](0002-fuentes-de-datos.md) | Archivos en vivo y Postgres solo para `/admin` | Aceptada |
| [0003](0003-json-momento5.md) | JSON precalculado como fuente de «Resultados Momento 5 · CAI» | Aceptada |
| [0004](0004-descarga-momento5-con-datos-personales.md) | Descarga del Momento 5 con los formularios tal como se enviaron | Aceptada |
| [0005](0005-actividad2-momento5.md) | Actividad 2 del Momento 5: transcripción literal a un Excel en vivo | Aceptada |

Plantilla `NNNN-titulo.md`: Fecha · Estado (Propuesta, Aceptada, Reemplazada por NNNN)
· Decisión · Motivo · Consecuencias · Referencias verificables. Una decisión superada se
marca como reemplazada; no se borra.
