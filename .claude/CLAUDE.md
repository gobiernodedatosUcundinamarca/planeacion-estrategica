# CLAUDE.md — Reglas del proyecto

Estas reglas aplican a todo el proyecto y tienen prioridad sobre cualquier
convención genérica. Léelas antes de tocar código.

El sitio (Next.js) vive en la **raíz del repositorio**: `app/`, `components/`,
`data/`, `repositories/`… cuelgan directamente de aquí, y las rutas de este
documento son relativas a esa raíz (aunque el documento viva en `.claude/`,
junto a los hooks, reglas y skills que lo hacen cumplir). No hay carpeta contenedora intermedia — si
alguna vez se anida el proyecto, hay que actualizar a la vez el *Root Directory*
del proyecto en Vercel y `Compilar-Portable.bat`, que asumen esta estructura
plana.

## 1. Gestor de paquetes: pnpm — obligatorio

Nunca `npm` ni `yarn` ni `bun`, en ningún contexto (instalación, scripts, CI,
`npx`). Siempre `pnpm` / `pnpm add` / `pnpm dlx`. El proyecto fija el gestor en
`package.json` (`packageManager`) y usa `pnpm-workspace.yaml` para
configuración de instalación (incluido `node-linker: hoisted` cuando se genera el
build portable — ver más abajo).

## 2. Arquitectura de datos: el Excel es la única fuente de verdad

- **Todos** los módulos leen su Excel en vivo con `fs` desde
  `data/source-*/`. No hay JSON intermedios ni scripts ETL: editar el
  Excel se refleja en la siguiente petición, sin regenerar nada. No se
  reintroduzca un `data/*.json` con datos de negocio.
- Agregar una fila/persona/actividad nueva debe bastar con editar el Excel (y,
  cuando aplique, soltar un archivo de foto con el slug correcto) — nunca
  hardcodear datos en componentes, constantes o datasources. Si un dato de
  negocio falta en el Excel (un nombre, una regla de exclusión), se agrega al
  Excel — no al código.
- Las rutas de los Excel son **siempre relativas** a la raíz del proyecto
  (`join(process.cwd(), "data", "source-*")`). Nunca una ruta absoluta del
  escritorio: Vercel corre en Linux y el `.exe` portable debe ser autocontenido,
  así que una ruta tipo `C:\Users\...` rompe ambos.
- Todo `data/source-*/` nuevo debe registrarse en `outputFileTracingIncludes`
  (`next.config.ts`) o Vercel no empaqueta los `.xlsx` en el bundle
  serverless.
- Los archivos de trabajo sueltos que alguien deja en el escritorio para
  actualizar un Excel (fuera de este repo) nunca se versionan — solo su copia
  dentro de `data/source-*/` es la fuente real que usa el sitio.

### Única excepción: lo que se sube desde `/admin` vive en Postgres (Neon)

Las respuestas del Momento 4 ("Transformaciones que nos conectan"), su
**Participación** (asistencia en territorio) y los **aportes generales** se
guardan en Postgres porque se actualizan desde el sitio publicado y en Vercel
el disco es de solo lectura. El `.xlsx` sigue siendo el formato de entrada y se
valida contra `lib/reglas/` antes de guardar; la conexión sale solo de
`datasource/infrastructure/neon.ts` y requiere `DATABASE_URL` (`.env` / Vercel).
**Esto no abre la puerta a migrar otros módulos.** Detalle completo (tablas,
migraciones, anonimización, cédula no publicada, `lugar_desarrollo`, corte por
fecha, clasificación): `.claude/rules/neon-y-admin.md`, que se carga solo al
tocar esos archivos. Cargar jornadas de Participación: skill
`cargar-participacion`.

## 2.1 Capas: quién puede llamar a quién

El flujo de datos va **siempre en una dirección** y sin saltarse escalones:

```
  data/source-*/*.xlsx          Fuente de verdad (única)
          ↓
  datasource/infrastructure/    Cómo se lee y se cachea un archivo
          ↓                       · excel.ts        — única puerta a la librería XLSX
          ↓                       · cache-archivo.ts — caché invalidada por mtime
          ↓                       · singleton.ts     — una instancia por proceso
  datasource/excel-*-source.ts  Qué significan las celdas de UN Excel
          ↓                     (implementa un contrato de types.ts)
  repositories/*Repository.ts   Única puerta de entrada a los datos
          ↓
  app/**/page.tsx               Punto de entrada (Server Component)
          ↓
  components/**                 Presentación
```

Reglas que se derivan de lo anterior, y que un cambio nuevo no debe romper:

- **Un componente o página nunca importa un `datasource`** — solo repositorios.
  El único acoplamiento permitido hacia abajo es el repositorio → su datasource.
- **Ningún módulo llama a `XLSX` ni a `readFileSync` por su cuenta**: se pasa por
  `datasource/infrastructure/excel.ts`. Que la lectura esté en un solo sitio es
  lo que garantiza que dos módulos interpreten igual una misma celda.
- **Ningún datasource implementa su propia caché**: usa `CacheArchivo`. Un origen
  sin caché reparsea su Excel en cada request (le pasó a analítica de momentos:
  releía 8 archivos por visita).
- Un datasource se construye **solo** en `datasource/index.ts`, vía
  `crearSingleton`. La instancia guarda la caché: crear una nueva por consulta la
  tiraría.
- Cada origen implementa un **contrato declarado en `datasource/types.ts`**, y el
  repositorio depende del contrato, nunca de la clase. Migrar un módulo a SQL o a
  una API es escribir otra clase que cumpla el contrato y cambiar una línea de
  `index.ts`: ni repositorios, ni páginas, ni componentes se enteran.

- Un umbral o criterio que necesitan servidor y vista a la vez vive en
  `lib/reglas/` (sin `server-only` ni `"use client"`), definido una sola vez.
- `CacheArchivo` invalida por `mtime`: datos siempre frescos y cero lecturas de
  disco en estado estable. Cachear sin invalidar por `mtime` rompe la regla
  principal del proyecto.

Tabla "dónde va cada cosa", detalle de rendimiento y receta para un módulo
nuevo: `.claude/rules/capas-y-modulos.md` (se carga al tocar `repositories/`,
`lib/`, `types/`, `constants/`, páginas o `next.config.ts`).

## 3. Sin diseño responsivo para móvil — regla de interfaz

**El sitio debe verse y comportarse exactamente igual en cualquier dispositivo,
incluidos los teléfonos.** No se crean variantes de layout para pantallas
pequeñas.

- Nunca uses breakpoints de Tailwind (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) para
  cambiar visibilidad, dirección de flex, columnas de grid o tamaños de fuente
  de forma condicional. Usa directamente el valor de escritorio, sin prefijo.
- Motivo técnico: el mecanismo de `app/layout.tsx` (clase `forzar-escritorio` +
  `transform: scale()` sobre `#app-frame`) hace que el sitio se vea como
  escritorio escalado en cualquier pantalla física — pero las media queries de
  Tailwind evalúan siempre contra el viewport real, no contra el tamaño ya
  escalado. Cualquier clase `sm:`/`lg:`/etc. rompe esa ilusión y el componente
  vuelve a comportarse como "modo móvil" real (menús hamburguesa, columnas que
  colapsan, texto más chico), inconsistente con el resto del sitio.
- Excepción explícita y deliberada: `components/ui/input.tsx` y `textarea.tsx`
  usan `md:text-sm` para evitar el zoom automático de Safari al enfocar un
  campo en iOS — es una salvaguarda funcional, no una adaptación de diseño, y
  debe conservarse.
- Cualquier componente o funcionalidad nueva debe respetar el diseño existente
  y verse igual en PC y en móvil, salvo instrucción explícita en contrario.

## 4. Buenas prácticas antes de subir cambios a GitHub

1. `pnpm build` debe pasar limpio (sin `output: "standalone"`, ese modo solo se
   activa con `BUILD_STANDALONE=1` para el `.exe` portable — nunca debe alterar
   el build normal que usa Vercel).
2. Para cualquier cambio visual o interactivo, probar con Playwright en
   **WebKit real** (`playwright.webkit`, no la emulación de dispositivo de
   Chromium) — este proyecto tiene historial de bugs que solo aparecen ahí.
   Cualquier script de verificación temporal (`__*.mjs`) se borra antes de
   terminar; nunca se commitea.
3. Nunca `git add -A` ni `git add .` — añadir archivos explícitos por nombre,
   revisando `git status`/`git diff` antes de comitear.
4. Nunca usar `--no-verify`, `--no-gpg-sign`, ni saltarse hooks.
5. Nunca forzar push (`--force`) a `main` sin autorización explícita.
6. Después de un push a `main`, confirmar el deployment en Vercel (vía el API
   de estado de commits de GitHub) antes de dar el cambio por terminado.
7. No dejar archivos de prueba, backups temporales (`*.backup-*.xlsx`) ni
   carpetas de build (`portal-build-portable/`, `portal-portable/`) sueltos en
   el repo — ver `.gitignore`.

## 5. Autoría

- Los commits usan el usuario y correo configurados en este repositorio
  (`git config user.name` / `user.email`) — nunca otra identidad.
- **No incluir referencias, comentarios, metadatos ni créditos relacionados con
  Claude, Anthropic, GitHub Copilot ni ninguna otra herramienta de IA** en
  mensajes de commit, código, comentarios, `package.json` ni documentación.
  Sin `Co-Authored-By` de asistentes de IA.

## 6. Arquitectura consistente y escalable

- Sigue el patrón de capas ya establecido (secciones 2 y 2.1) para cualquier
  módulo nuevo — no introduzcas un segundo patrón de acceso a datos.
- Reutiliza componentes de `components/ui/` (basados en `@base-ui/react`, no
  Radix) antes de crear uno nuevo.
- No agregues abstracciones ni configuración especulativa para necesidades
  futuras hipotéticas — una fila nueva en el Excel debe seguir bastando para
  escalar el contenido, sin tocar código.
- Módulo nuevo: sigue la receta de 7 pasos de `.claude/rules/capas-y-modulos.md`.

### Nomenclatura

- Código y comentarios en español, con tildes correctas; los identificadores
  técnicos (`slug`, `mtime`, `props`) se dejan como están.
- Archivos: `kebab-case.ts`, salvo los repositorios, que van en `camelCase.ts`
  (`accesosCaiRepository.ts`) por coherencia con los ya existentes.
- Nombres descriptivos y sin abreviar: `promedioDias`, no `promDias`.
- Un comentario explica **por qué**, no **qué**: si describe lo que el código ya
  dice, sobra. Los que documentan una decisión de datos (por qué se excluye una
  hoja, por qué un rango queda abierto) sí valen y no deben borrarse.

## 7. Cómo refactorizar sin romper nada

El comportamiento observable es el contrato: mismas cifras, misma interfaz,
mismo flujo. Antes de cualquier refactor o de borrar un archivo, sigue la skill
`refactorizar` (snapshot JSON de los repositorios, pasos pequeños, medir,
`git stash` para distinguir lo preexistente). Un cambio estructural solo se
justifica con un beneficio comprobable, no por gusto estético.

## 8. Ejecutable portable

`Compilar-Portable.bat` genera `PlaneacionEstrategica2027-2037.exe`; el `.exe` y
`launcher-src/portal.zip` nunca se versionan, `launcher-src/Program.cs` sí.
Detalle: `.claude/rules/portable.md`.

## 9. Automatización del repo (`.claude/`)

- **Skills del proyecto** — úsalas en vez de reescribir scripts temporales:
  `cargar-participacion` (anexar/actualizar jornadas en Neon con reporte de
  anomalías), `publicar-cambios` (commit → push → confirmar Vercel),
  `verificar-webkit` (capturas y chequeos en WebKit real), `refactorizar`.
- **Hooks** (`.claude/settings.json`) que hacen cumplir este documento:
  bloquean npm/yarn/npx, `git add -A`/`.`, saltarse hooks, créditos de IA,
  breakpoints de Tailwind, rutas absolutas, `data/*.json` y secretos fuera de
  `.env`; piden confirmación para push forzado, `reset --hard` y borrados en
  `data/source-*`; y al terminar avisan si quedaron `__*` o backups sueltos.
- **Respuestas**: en español, cortas y con cifras concretas. Antes de una
  operación que borre o sustituya datos en Neon, mostrar anomalías y el plan
  (antes → después) y esperar la decisión del usuario.
- **Ahorro de contexto**: leer solo la parte necesaria de un archivo; filtrar la
  salida de comandos (`Select-Object -Last N`, `--stat`); no leer
  `pnpm-lock.yaml`, `.next/` ni los builds portables; mirar capturas solo
  cuando aporten. En Windows, PowerShell es el shell principal.
