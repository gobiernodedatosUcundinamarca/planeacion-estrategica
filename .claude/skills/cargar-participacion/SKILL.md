---
name: cargar-participacion
description: Anexar, actualizar o reemplazar una jornada de asistencia (Excel) en la sección Participación de "Transformaciones que nos conectan" en Neon, con reporte de anomalías antes de escribir. Úsala cuando el usuario pida subir/anexar/actualizar/reemplazar participación o asistencia de un evento, o ver el estado de las tandas cargadas.
---

# Cargar una jornada de Participación

Toda la lógica vive en `cargar.ts` (junto a este archivo). **No escribas scripts
`scripts/__*.ts` para esto**: el script ya usa el mismo camino que `/admin`
(`guardarDocumento`), así que respeta la anonimización, el reconocimiento por
nombre de columna y la cédula guardada sin publicar.

```
pnpm exec tsx .claude/skills/cargar-participacion/cargar.ts estado
pnpm exec tsx .claude/skills/cargar-participacion/cargar.ts revisar <archivo.xlsx> [opciones]
pnpm exec tsx .claude/skills/cargar-participacion/cargar.ts aplicar <archivo.xlsx> [opciones]
```

`<archivo.xlsx>` puede ser solo el nombre si está en
`data/source-participacon-momoento4-planeacion-teritorial/`.

| Opción | Para qué |
|---|---|
| `--lugar "Fusagasugá"` | Ciudad del evento (`lugar_desarrollo`). Siempre con tilde y la misma escritura que ya existe en la base. |
| `--fecha 2026-09-28` | Fija la fecha de toda la tanda (los exports de Forms traen la fecha en que se llenó, no la del evento). |
| `--dividir "TRABAJADOR,PLANTA=2026-09-22"` | Esos roles van a otra fecha. Repetible. |
| `--reemplaza viejo.xlsx` | Además de la tanda con el mismo nombre, sustituye estas (cuando el archivo nuevo cambió de nombre). |
| `--solo-roles "DOCENTE"` | Guarda solo esos roles; el resto del archivo se descarta (el `.xlsx` queda intacto). |

## Flujo (siempre en este orden)

1. **Si el usuario no dio lugar o fecha**, dedúcelos del nombre del archivo
   (`28-sept-fusa.xlsx` → Fusagasugá, 2026-09-28) y dilo en el reporte; si es
   ambiguo, pregunta.
2. **`revisar`** con las opciones. No escribe nada.
3. **Muestra al usuario un resumen corto** con: filas, fechas, roles,
   anomalías y el plan (qué tanda sustituye, total antes → después). Si la
   actualización cambia mucho la composición (p. ej. un rol pasa de 13 a 292),
   destácalo con una tabla antes/después.
4. **Espera la decisión del usuario** cuando haya anomalías o se vaya a
   sustituir/borrar algo. Si pidió explícitamente "súbelo" y no hay anomalías
   nuevas, sigue.
5. **`aplicar`** con exactamente las mismas opciones. Inserta antes de borrar;
   si algo falla deshace lo nuevo.
6. **Commit del `.xlsx`** (skill `publicar-cambios`), con el mensaje de la convención:
   - nuevo: `data: se anexa la jornada DD-MM de Participacion en <Lugar> (<N> asistentes)`
   - actualización: `data: se actualiza la jornada DD-MM de Participacion en <Lugar> (<N> asistentes)`
   - sustitución completa: `data: se reemplaza la jornada …`

## Reglas de negocio ya acordadas

- **Mismo nombre de archivo = actualización**: la tanda anterior con ese nombre
  se sustituye; nunca se duplica.
- **Dos días en un archivo**: si el usuario indica una regla por rol (p. ej.
  Chía: el 21 todos menos TRABAJADOR y PLANTA; el 22 TRABAJADOR y PLANTA), usa
  `--fecha <día1> --dividir "TRABAJADOR,PLANTA=<día2>"`.
- **Jornadas filtradas por rol**: al actualizarlas hay que repetir el filtro o
  vuelven los roles descartados. Hasta hoy: `19_octubre_fusa.xlsx` →
  `--solo-roles DOCENTE` (jornada de docentes en Fusagasugá).
- Las anomalías **se reportan, no se corrigen solas**: cédulas repetidas o
  raras, filas sin rol/edad, edades fuera de rango y asistentes que ya figuran
  en otra tanda del mismo día. El usuario decide.
- El script nunca imprime cédulas completas; no las copies al chat.
- "Reemplazar todo" (borrar todas las tandas) **no** se hace con este script:
  solo con petición explícita y desde `/admin`.
