// Regresión del contenedor, sus filtros y la prioridad de las ediciones guardadas.
(async () => {
  const { default: assert } = await import('node:assert/strict');
  const { chromium, webkit } = await import('playwright');
  const BASE = process.env.PORTAL_PRUEBAS_URL || 'http://127.0.0.1:3217';
  const ID_TITULO = '6e15162168e3b1815131';
  for (const [nombre, motor] of Object.entries({ chromium, webkit })) {
    const navegador = await motor.launch();
    try {
      for (const [vista, opciones] of [
        ['escritorio', { viewport: { width: 1440, height: 1000 } }],
        ['telefono', { viewport: { width: 393, height: 852 }, screen: { width: 393, height: 852 }, isMobile: true, hasTouch: true }],
        ['escritorio-en-telefono', { viewport: { width: 1280, height: 2775 }, screen: { width: 393, height: 852 }, isMobile: true, hasTouch: true }],
        ['horizontal', { viewport: { width: 852, height: 393 }, screen: { width: 852, height: 393 }, isMobile: true, hasTouch: true }],
      ]) {
        const contexto = await navegador.newContext(opciones);
        const pagina = await contexto.newPage();
        const errores = [];
        pagina.on('pageerror', error => errores.push(error.message));
        const respuesta = await pagina.goto(BASE + '/transformaciones', { waitUntil: 'networkidle' });
        assert.equal(respuesta.status(), 200);
        await pagina.locator('[data-testid=lista-comentarios][data-lista-completa=true]').waitFor();
        assert.equal(await pagina.locator('#titulo-comentarios').innerText(), 'Comentarios');
        const scroll = pagina.getByTestId('scroll-comentarios');
        const tarjetas = pagina.locator('[data-comentario-id]');
        const originales = await tarjetas.evaluateAll(es => es.map(e => ({
          id: e.dataset.comentarioId, texto: e.querySelector('[data-texto-original]').textContent,
        })));
        const total = Number((await pagina.getByTestId('conteo-comentarios').locator('strong').innerText()).replace(/\D/g, ''));
        assert.equal(total, 3379);
        assert.equal(originales.length, total);
        const dimensiones = await scroll.evaluate(e => {
          const panel = e.closest('.panel-comentarios').getBoundingClientRect();
          const estilos = getComputedStyle(document.documentElement);
          const escala = Number(estilos.getPropertyValue('--escala-escritorio')) || 1;
          return { alto: panel.height, maximo: Math.max(360, Number.parseFloat(estilos.getPropertyValue('--alto-escritorio')) * .78) * escala,
            ancho: panel.width, main: document.querySelector('main').getBoundingClientRect().width,
            interior: e.clientHeight, contenido: e.scrollHeight, overflow: getComputedStyle(e).overflowY };
        });
        assert.ok(Math.abs(dimensiones.alto - dimensiones.maximo) < 2, JSON.stringify(dimensiones));
        assert.ok(dimensiones.ancho > dimensiones.main * .9, 'El panel debe aprovechar el ancho del contenido');
        assert.ok(dimensiones.contenido > dimensiones.interior * 5);
        assert.equal(dimensiones.overflow, 'auto');
        await scroll.scrollIntoViewIfNeeded();
        const posicionPagina = await pagina.evaluate(() => scrollY);
        await scroll.evaluate(e => { e.scrollTop = e.scrollHeight; });
        assert.ok(await scroll.evaluate(e => e.scrollTop > 0));
        assert.equal(await pagina.evaluate(() => scrollY), posicionPagina, 'Recorrer comentarios no debe alargar ni desplazar la página');
        await tarjetas.last().scrollIntoViewIfNeeded();
        assert.ok(await tarjetas.last().locator('[data-texto-original]').innerText());
        const buscador = pagina.getByRole('textbox', { name: 'Buscar en los comentarios originales', exact: true });
        await buscador.fill(originales[0].texto.slice(0, 45));
        await pagina.waitForFunction(() => document.querySelector('[data-testid=scroll-comentarios]').scrollTop === 0);
        assert.ok(await tarjetas.count() > 0 && await tarjetas.count() < total);
        assert.ok(Math.abs(await pagina.locator('.panel-comentarios').evaluate(e => e.getBoundingClientRect().height) - dimensiones.alto) < 1);
        await buscador.fill('zzzz-sin-coincidencias-928374');
        await pagina.waitForFunction(() => document.querySelectorAll('[data-comentario-id]').length === 0);
        assert.ok(await scroll.getByRole('status').isVisible());
        await buscador.fill('');
        await pagina.waitForFunction(total => document.querySelectorAll('[data-comentario-id]').length === total, total);
        assert.deepEqual(await tarjetas.evaluateAll(es => es.map(e => ({ id: e.dataset.comentarioId,
          texto: e.querySelector('[data-texto-original]').textContent }))), originales);
        await pagina.emulateMedia({ media: 'print' });
        assert.equal(await scroll.evaluate(e => getComputedStyle(e).overflowY), 'visible');
        assert.equal(await tarjetas.first().evaluate(e => getComputedStyle(e).contentVisibility), 'visible');
        const impresion = await pagina.locator('.panel-comentarios').evaluate(e => e.getBoundingClientRect().height);
        assert.ok(impresion > dimensiones.alto * 5, 'La impresión debe conservar la lista completa');
        await pagina.emulateMedia({ media: 'screen' });

        if (vista === 'escritorio' || vista === 'telefono') {
          // Simula exclusivamente la lectura editorial. Nunca escribe en el editor real.
          await pagina.route('**/api/editorial', async ruta => {
            assert.equal(ruta.request().method(), 'GET');
            const original = await ruta.fetch();
            const estado = await original.json();
            await ruta.fulfill({ response: original, json: { ...estado, autorizado: true, habilitado: true,
              textos: { ...estado.textos, [ID_TITULO]: 'Título guardado por los responsables' } } });
          });
          await pagina.reload({ waitUntil: 'networkidle' });
          await pagina.waitForFunction(id => document.querySelector(`[data-editorial-id="${id}"]`)?.textContent === 'Título guardado por los responsables', ID_TITULO);
          await pagina.getByRole('button', { name: 'Activar modo de edición', exact: true }).click();
          await pagina.locator('#titulo-comentarios .lapiz-editorial').click();
          assert.equal(await pagina.locator('.dialogo-editorial[open] textarea').inputValue(), 'Título guardado por los responsables');
          await pagina.locator('.dialogo-editorial[open]').getByRole('button', { name: 'Cancelar', exact: true }).click();
          assert.ok(await pagina.locator('#titulo-comentarios').innerText() === 'Título guardado por los responsables');
        }
        assert.deepEqual(errores, []);
        console.log({ motor: nombre, vista, comentarios: total, panelAcotado: true, scrollInterno: true,
          filtros: true, impresionCompleta: true, textosConservados: true });
        await contexto.close();
      }
    } finally { await navegador.close(); }
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
