---
paths:
  - "repositories/**"
  - "lib/**"
  - "types/**"
  - "constants/**"
  - "app/**/page.tsx"
  - "next.config.ts"
  - "data/**"
---

# Capas: detalle (complementa CLAUDE.md §2.1)

## Dónde va cada cosa

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Infraestructura | `repositories/datasource/infrastructure/` | Leer archivos, cachear, instanciar. Nada de negocio. |
| Origen de datos | `repositories/datasource/excel-*-source.ts` | Interpretar UN Excel y tiparlo. |
| Contratos | `repositories/datasource/types.ts` | Interfaz que cumple cada origen. |
| Repositorio | `repositories/*Repository.ts` | Puerta única de datos; agrega y compone. |
| Reglas de negocio | `lib/reglas/` | Umbrales y criterios que comparten servidor y vista. |
| Tipos de dominio | `types/` | Forma de los datos. Nunca se declaran dentro de un datasource. |
| Utilidades | `lib/` | Funciones puras sin estado (formato, búsqueda, texto). |
| Configuración | `constants/` | Valores fijos que no salen del Excel (navegación, marca). |

## Reglas de negocio compartidas (`lib/reglas/`)

Cuando un umbral o un criterio lo necesitan **el servidor y la vista a la vez**,
vive en `lib/reglas/` — un módulo neutro, sin `server-only` ni `"use client"`,
que ambos importan. Ejemplo real: los rangos de días de accesos y el umbral de
atención (`UMBRAL_ATENCION_DIAS`) estaban duplicados literalmente en el
datasource y en el panel; cambiar el criterio obligaba a editar dos capas y, si
se olvidaba una, el gráfico y las tarjetas mostraban cifras que se
contradecían. Una regla de negocio se define una vez y se importa.

## Rendimiento: cómo conviven "Excel en vivo" y velocidad

`CacheArchivo` guarda en memoria lo ya parseado y lo descarta en cuanto cambia
la fecha de modificación del archivo (y, para orígenes que leen un directorio
completo, cuando aparece o desaparece un `.xlsx`). El resultado: los datos son
siempre los del Excel —editarlo se ve en la siguiente petición, sin reiniciar—
pero en estado estable una página no hace **ninguna** lectura de disco. Al tocar
esta capa, mantener ambas propiedades: si algo se cachea sin invalidar por
`mtime`, se rompe la regla principal del proyecto.

## Receta para un módulo nuevo (lo que hace escalable al proyecto)

1. Deja el `.xlsx` en `data/source-<modulo>/` y regístralo en
   `outputFileTracingIncludes` (`next.config.ts`).
2. Declara los tipos en `types/<modulo>.ts` — nunca dentro del datasource.
3. Declara el contrato (`<Modulo>DataSource`) en `datasource/types.ts`.
4. Escribe `datasource/excel-<modulo>-source.ts`: lee con
   `infrastructure/excel`, cachea con `CacheArchivo`, sin lógica de vista.
5. Regístralo en `datasource/index.ts` con `crearSingleton`.
6. Crea `repositories/<modulo>Repository.ts` como única puerta de entrada.
7. La página consume el repositorio; el componente recibe los datos por props.

Si un umbral o criterio lo necesitan servidor y vista, ponlo en `lib/reglas/`
desde el principio — no lo copies en ambos lados.
