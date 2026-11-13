# Consulta jerárquica de los comentarios existentes

## Alcance

La versión activa parte del código original `b5dc1f9` en la rama local `test/navegacion-comentarios-jerarquica`. Sustituye la interfaz anterior; aquella permanece únicamente como recuperación en `test/clasificacion-encuestas-detallada`.

La navegación presenta clasificaciones documentales verificadas y conserva las respuestas, probabilidades y metodologías originales. Las referencias complementarias se almacenan en tablas independientes.

## Comportamiento

- **Todos los comentarios** está seleccionado al ingresar y reúne los 3.379 textos no vacíos de las cinco transformaciones. La lista completa queda disponible al cargar la página, sin paginación ni botón de «Ver más». Los textos se muestran sin recortar ni resumir.
- El botón general permanece accesible al recorrer la lista y restablece regional, transformación, grupo, temas, postura y búsquedas. El anclaje respeta el escritorio escalado que utiliza el proyecto.
- **Limpiar todos los filtros** aparece junto al apartado de filtros activos. Comparte el restablecimiento del botón general, cancela las consultas pendientes y devuelve también la metodología común predeterminada; se deshabilita cuando ya no hay nada que limpiar.
- Los botones desplegables siguen **unidad regional → transformación → grupo de interés**. Una selección parcial ya muestra todos sus comentarios. Cada botón indica el número de comentarios de ese prefijo del árbol.
- Los códigos y los nombres de temas provienen de las asignaciones documentales existentes. En esa fuente, el código identifica al tema dentro de una transformación; se muestran juntos y no se inventa un nivel adicional de subcategorías.
- **Principales hallazgos** presenta los cinco temas con más comentarios únicos dentro de la selección actual, incluida la postura y la búsqueda. Las tarjetas numeradas usan superficies neutras sin franjas superiores; la primera destaca por su tipografía y cantidad. Una selección se identifica con fondo verde suave, borde discontinuo y etiqueta «Seleccionado», tanto en hallazgos como en los demás temas. La cabecera indica cuántos temas están seleccionados. «Ver los demás temas» permite consultar todos los restantes y buscar por su nombre o código.
- Es posible seleccionar varios temas existentes. Se aplica su intersección: solo se muestran comentarios con todas esas asignaciones. La lista y sus totales cuentan cada comentario una vez.
- **De acuerdo**, **Parcialmente de acuerdo**, **En desacuerdo** y **Sin postura registrada** utilizan exclusivamente `respondeNecesidad` mediante la regla existente `clasificarRespaldo`. No se infiere el acuerdo a partir del texto.
- La ausencia se puede consultar con **Sin asignación en esta clasificación**. Se distingue de la existencia de una clasificación en otra metodología. Los registros sin sede se conservan como **Sin especificar**; no se les asigna una regional.
- **Clasificación consultada** permite elegir la lista común de las presentaciones o una de cuatro metodologías históricas verificadas. Sus temas se mantienen separados por fuente/modelo y transformación. Al cambiar se conservan regional, transformación, grupo, postura y búsqueda de texto; se limpian las selecciones temáticas que pertenecían al otro catálogo. Las afinidades BERT no se convierten en probabilidades ni sus identificadores numéricos en códigos A.
- Cada tarjeta conserva el texto original y muestra regional, transformación, grupo, códigos/temas y postura. Las referencias documentales se conservan internamente para auditoría; no se muestra el desplegable «Ver referencia original» en las tarjetas.
- Los indicadores originales y el formulario de aportes generales permanecen accesibles en apartados desplegables independientes, evitando duplicar filtros y comentarios en la vista principal.

En la copia actual hay 2.533 comentarios con respuesta «Sí», 760 «Parcialmente» y 86 «No»: suman 3.379. No hay comentarios sin postura en esta copia; el caso está contemplado y probado con datos sintéticos.

«Laboratorios» no se convierte en una categoría nueva. Se puede consultar dentro del tema existente «Infraestructura tecnológica, conectividad y laboratorios», código A1 de UC Digital. No se asocia arbitrariamente con A1 de otra transformación.

## Integración

La página consulta `momento4Repository`, que usa el contrato `Momento4DataSource` y su adaptador Postgres. Se reutiliza la lectura documental existente, protegida con una huella del texto, para mostrar únicamente asignaciones correspondientes al comentario actual. Las metodologías históricas se consultan a petición en `/api/clasificaciones-comentarios`, bajo el mismo control de publicación de la sección, mediante `referencias-documentales-almacen`. El catálogo se comparte en el transporte; cada asignación conserva su archivo, hoja y fila. Si faltan las tablas suplementarias no se ofrecen esas metodologías, y los comentarios y la lista común siguen accesibles.

`lib/reglas/navegacion-comentarios.ts` concentra filtros, conteos, posturas y opciones del árbol. `ExploradorComentarios` reutiliza Button, Card, Input, Select y Collapsible del proyecto. Las referencias compartidas se envían una vez y las tarjetas se memorizan para evitar renders repetidos. Al cargar la interfaz se presenta la lista completa sin eliminar registros ni sus textos.

## Validación reproducible

`pnpm exec tsx --test tests/navegacion-comentarios.test.ts` ejecuta pruebas sintéticas sin credenciales. La prueba integral requiere el entorno local aislado y las rutas a las copias de auditoría, que permanecen fuera de Git.

`pnpm exec tsx --test tests/referencias-documentales.test.ts` comprueba referencias por asignación, separación de afinidad/probabilidad y modelos con IDs iguales. Su integración opcional usa `PORTAL_SQL_LOCAL=1` y `REFERENCIAS_CATALOGO` para contrastar los cuatro métodos y las tablas completas contra el catálogo privado, sin incorporarlo al repositorio.

La prueba integral comprueba:

1. Todos los campos de las 3.860 respuestas contra la copia original, incluidos los 3.379 textos no vacíos.
2. Igualdad completa de las cuatro tablas documentales con las asignaciones previamente registradas.
3. Selecciones parciales, conteos únicos, códigos por transformación, temas múltiples y top 5.
4. Los 2.348 cruces de postura y tema por regional, transformación y grupo.
5. Posturas ausentes, combinaciones vacías y restablecimiento a todos los comentarios.

Las pruebas de navegador comprueban los 3.379 textos del DOM, las selecciones parciales, las posturas, el top 5 tras cada filtro, los demás temas, la consulta de laboratorios, los casos sin clasificación, el restablecimiento y el botón general al final de la lista. Se ejecutan en Chromium y WebKit real, con escritorio y teléfono, bloqueando conexiones fuera de loopback.

Las herramientas personales de ejecución están en `uso-local/navegacion-comentarios/`, fuera del repositorio. La versión anterior y sus informes no describen esta interfaz activa.
