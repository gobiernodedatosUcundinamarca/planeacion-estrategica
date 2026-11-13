# Edición de textos de la interfaz

Edición descriptiva separada de los datos de los módulos, con almacenamiento local
o PostgreSQL según la configuración del servidor.

Los lápices permanecen ocultos por defecto. El icono de edición del pie del menú lateral
permite activar el modo de edición, previa autenticación con la contraseña
configurada en este equipo; la sesión dura dos horas. El mismo icono permite salir
del modo de edición sin cambiar ningún contenido. Una recarga vuelve a la vista
de lectura, aunque la sesión de acceso siga vigente. Es posible guardar, restaurar
el original y cerrar la sesión. Las ediciones se presentan a los visitantes al cargar
la página. Otras pestañas recargan el contenido al volver a estar visibles.

Junto al icono de edición y a «Volver al inicio» está el control de tamaño de
textos. Usa porcentajes relativos al diseño original (100 %), sin cambiar familias
tipográficas. Permite previsualizar cinco categorías; «Guardar» confirma las
preferencias del navegador, mientras «Cancelar» o Escape descartan la propuesta,
incluido cualquier restablecimiento provisional. La portada usa su propio pie.

Los fragmentos descriptivos con color o énfasis tienen su propio identificador;
se conserva su presentación y se pueden editar por separado. Los lápices solo
se renderizan en el modo de edición. El cuadro de acceso se monta en `body` para
separarlo del contenedor escalado. En el modo de escritorio escalado se centra
con `dvh` para evitar el fallo de posición y clic de WebKit móvil.

## Separación entre contenido y datos

`catalogo.json` registra identificadores estables y valores originales de textos
estáticos de la interfaz. `TextoEditorial` y los adaptadores compartidos muestran
el contenido guardado. Los números, respuestas originales, clasificaciones,
preguntas provenientes de datos y resultados calculados no se vuelven editables.
Los elementos que no están registrados no aceptan escrituras desde la API.
Las ediciones son texto plano, nunca HTML ejecutable.

Los textos compartidos por componentes pueden compartir una edición. No se alteran
URLs de navegación, fórmulas, filtros, consultas, archivos Excel o modelos de datos.
Los títulos dinámicos que provienen de una fuente de datos se conservan como datos.

## Persistencia y protección

La ruta `EDITORIAL_LOCAL_DIR` está configurada por el lanzador local y queda fuera
del repositorio. Contiene el verificador scrypt de la contraseña, una clave aleatoria
de firma, los textos guardados y el historial. No copiar estos archivos a public,
no versionarlos ni imprimirlos en los registros. No hay contraseña literal en el
código ni se envía el verificador al navegador.

En el modo de archivos, la API exige sesión firmada en cookie HttpOnly/SameSite, origen local, catálogo
válido, límite de longitud y revisión vigente. Tiene límite de intentos de acceso,
cola de escrituras y bloqueo de archivo entre procesos; el reemplazo del archivo
es atómico. El historial permite rastrear el valor anterior sin modificar código.
Un conflicto exige revisar la edición antes de reintentar. Los cambios persisten
tras recargar y reiniciar. Los errores no sobrescriben los originales.

Respaldar la carpeta editorial externa antes de limpiar o mover el entorno.
Si un cierre abrupto deja `edicion.lock`, solo retirarlo tras comprobar que todos
los procesos que usan este almacenamiento están detenidos y respaldar el contenido.

## Preparación para producción

El adaptador PostgreSQL guarda textos, revisión, historial e intentos de acceso en
un esquema editorial independiente. Cada edición y su historial se confirman en
una sola operación transaccional. Una revisión antigua devuelve un conflicto y
conserva el contenido vigente. La importación inicial no reemplaza ediciones del
destino. La migración se ejecuta explícitamente, nunca durante una petición web.

En producción se requiere configurar las variables privadas del servidor y los
orígenes HTTPS exactos. La contraseña se verifica con scrypt y las sesiones usan
cookies HttpOnly/SameSite, Secure en HTTPS, y una clave privada. El límite de
intentos se comparte entre instancias. Sin configuración válida, la edición queda
deshabilitada y se muestran los textos públicos incluidos en `contenido-inicial.json`.
El modo local conserva los archivos y el acceso existentes del lanzador.

Preparación, importación y verificación: [PRODUCCION.md](PRODUCCION.md).
Los secretos y respaldos permanecen fuera del repositorio. No se aplicaron cambios
a la base remota ni se publicó el rediseño durante esta preparación.

Editar desde la página cambia el contenido persistido; no reescribe `.tsx` ni
realiza commits o despliegues. El catálogo y los valores por defecto siguen siendo
código versionable. Para un reemplazo o eliminación de un texto, conservar su clave
o documentar la migración de la edición. Los metadatos SEO no se actualizan con
esta edición visual; deben tratarse en la futura preparación de publicación.

## Pruebas

Desde el repositorio, con el servidor local activo y la contraseña en la variable
temporal `TEST_EDITORIAL_PASSWORD`:

```
node scripts/probar-editorial-local.cjs
node scripts/probar-editorial-reinicio.cjs
node scripts/probar-modo-editorial.cjs
```

El segundo test reinicia únicamente el servidor local registrado de 3217. No
detiene la base ni los prototipos. Las pruebas usan textos temporales y los
restauran; no requieren credenciales de producción. Evidencias en la carpeta
editorial de uso-local, fuera del código publicado.
