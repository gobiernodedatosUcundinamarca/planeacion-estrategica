# Publicación del editor de textos

El repositorio incluye el editor PostgreSQL y los textos aprobados de la copia
local. Esta preparación no publica el sitio ni modifica la base remota.

## Archivos que se publican

- Componentes y API editorial, adaptadores y catálogo de identificadores.
- `editorial/contenido-inicial.json`: cuatro textos descriptivos de la revisión
  local 93; conserva espacios, texto vacío y claves originales.
- Scripts de preparación/migración, plantilla de variables y pruebas permanentes.

`acceso.json`, el historial privado y los `.env` reales no se versionan. El script
de preparación respalda el origen sin modificarlo y rechaza guardar los secretos
dentro del repositorio:

```powershell
pnpm editorial:preparar --origen ../../uso-local/editorial --privado ../../uso-local/editorial-produccion
```

El `.env` privado conserva el verificador scrypt existente y genera una nueva
clave de sesión. No contiene la contraseña literal. Si ya existe, el script lo
conserva; no rota credenciales por repetir la preparación. Los respaldos se
guardan en subcarpetas fechadas dentro de la misma carpeta privada.

## Configuración en Vercel

Configurar exclusivamente en el servidor, con alcance al entorno correspondiente:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL de la aplicación, ya existente |
| `DATABASE_URL_UNPOOLED` | Conexión de mantenimiento, para ejecutar la migración |
| `EDITORIAL_STORAGE` | `postgres` |
| `EDITORIAL_SCHEMA` | `editorial` |
| `EDITORIAL_PASSWORD_SCRYPT` | Verificador del archivo privado |
| `EDITORIAL_SESSION_SECRET` | Clave aleatoria del archivo privado |
| `EDITORIAL_ALLOWED_ORIGINS` | `https://planeacion-estrategica.vercel.app` |

El origen corresponde al `homepageUrl` del repositorio oficial, consultado el
13/11/2026. Añadir otros dominios oficiales explícitamente, separados por comas,
sin barra final, rutas ni comodines. Una vista previa que permita editar debe
tener un origen configurado y una base/esquema de pruebas independientes.
No usar variables `NEXT_PUBLIC_` para las credenciales. No subir el `.env` local.

Sin estas variables, Vercel no puede habilitar el editor por accidente usando los
archivos locales. El visitante conserva el contenido inicial y el botón de edición
queda deshabilitado. Un fallo de PostgreSQL devuelve un error genérico; no se
reemplaza el contenido persistido ni se expone la conexión en la respuesta.

## Migración controlada

Respaldar el destino antes de la operación. Usar el checkout revisado y la conexión
del entorno correcto. El plan por defecto no abre conexión ni realiza escrituras:

```powershell
pnpm editorial:migrar
```

Solo después de autorizar los cambios remotos:

```powershell
pnpm editorial:migrar --aplicar --permitir-remoto
pnpm editorial:migrar --verificar
```

Se crean el esquema editorial y tres tablas: `editorial_estado`,
`editorial_historial`, `editorial_intentos`. No se modifican tablas de encuestas,
participación ni formularios. La importación conserva los cuatro textos y la
revisión de origen. Repetirla con el mismo contenido no lo altera; si el destino
ya contiene otro contenido, se detiene sin sobrescribirlo. No usar esta importación
como sincronización posterior de un editor que ya está funcionando en producción.

## Funcionamiento y recuperación

La API valida catálogo, revisión y longitud antes de escribir. Texto vacío oculta
el rótulo; `null` restaura el original. El texto se presenta como texto plano.
El estado y su historial se guardan atómicamente con bloqueo de fila. Un conflicto
exige recargar antes de reintentar. Cambiar la contraseña/verificador o la clave de
sesión invalida las sesiones PostgreSQL anteriores; su duración máxima es dos horas.

El límite de acceso es global para este editor: cinco intentos por quince minutos,
compartidos por las instancias. Un acceso válido limpia el contador. No comparte
el PIN del panel administrativo. La historia del editor local permanece en el
respaldo privado; la importación registra una entrada de inicio con los textos
aprobados, sin subir intentos o borradores antiguos al sitio público.

Para recuperar un texto, consultar su historia y guardar una nueva revisión. Para
recuperar todo el almacenamiento, utilizar el respaldo PostgreSQL del esquema.
No cambiar claves de catálogo sin una migración de las ediciones existentes.
La edición modifica datos persistidos, no archivos `.tsx`, commits ni despliegues.

## Verificación local

```powershell
pnpm exec tsx --test tests/editorial-seguridad.test.ts
pnpm exec tsx --test tests/editorial-postgres.test.ts
pnpm exec tsx scripts/probar-editorial-produccion.ts
```

Las dos últimas comprobaciones exigen el transporte Docker local del proyecto,
`PORTAL_SQL_LOCAL=1` y una conexión a `db.localtest.me/planeacion_local`. Cada prueba
usa su propio esquema aleatorio y lo elimina al finalizar. La prueba de navegador
crea copias temporales del editor de archivos y servidores en puertos libres;
los cierra y elimina sus archivos sin modificar el editor local vigente. No
genera informes temporales dentro del repositorio. El lanzador habitual conserva
su modo de archivos; la opción PostgreSQL se activa explícitamente por entorno.

Fuentes técnicas: [Neon](https://neon.com/docs/serverless/serverless-driver),
[almacenamiento de funciones Vercel](https://vercel.com/docs/functions/runtimes#file-system-support)
y [scrypt de Node](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).
