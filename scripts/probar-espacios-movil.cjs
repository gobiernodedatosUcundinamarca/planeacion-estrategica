// Comprueba el escritorio fijo en teléfonos, sin convertirlo en otro layout.
(async () => {
const { default: assert } = await import('node:assert/strict');
const { chromium, webkit } = await import('playwright');
const BASE = process.env.PORTAL_PRUEBAS_URL || 'http://127.0.0.1:3217';
const escritorioUA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

async function marco(pagina, telefono) {
  const medidas = await pagina.evaluate(() => {
    const frame = document.querySelector('#app-frame');
    const outer = document.querySelector('#app-frame-outer');
    const visual = window.visualViewport;
    const escala = Number(getComputedStyle(document.documentElement).getPropertyValue('--escala-escritorio'));
    return {
      compacto: document.documentElement.classList.contains('forzar-escritorio'),
      escala,
      ancho: frame.getBoundingClientRect().width * visual.scale,
      disponible: Math.min(screen.width, Math.round(visual.width * visual.scale)),
      hueco: outer.getBoundingClientRect().height - frame.scrollHeight * escala,
      desborde: document.scrollingElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: document.querySelector('aside').getBoundingClientRect().height / visual.height,
      viewport: document.querySelector('meta[name=viewport]').content,
    };
  });
  assert.equal(medidas.compacto, telefono);
  assert.ok(medidas.desborde <= 1, JSON.stringify(medidas));
  if (telefono) {
    assert.ok(Math.abs(medidas.ancho - medidas.disponible) < 2, 'El navegador y el marco no deben reducir dos veces el ancho');
    assert.ok(Math.abs(medidas.hueco) < 2, 'El marco no debe dejar altura vacía al final');
    assert.ok(Math.abs(medidas.sidebar - 1) < 0.01, 'El menú debe ocupar la altura visible');
    assert.ok(!medidas.viewport.includes('initial-scale=1'), 'Se debe conservar el encaje nativo del escritorio fijo');
  }
  return medidas;
}

async function dialogoVisible(pagina, selector) {
  const estado = await pagina.locator(selector).evaluate(e => {
    const r = e.getBoundingClientRect(), v = visualViewport;
    return { izquierda: r.left - v.offsetLeft, arriba: r.top - v.offsetTop,
      derecha: v.offsetLeft + v.width - r.right, abajo: v.offsetTop + v.height - r.bottom };
  });
  assert.ok(Object.values(estado).every(n => n >= -1), 'El detalle debe caber en la ventana: ' + JSON.stringify(estado));
  assert.ok(Math.abs(estado.izquierda - estado.derecha) < 2 && Math.abs(estado.arriba - estado.abajo) < 2,
    'El detalle debe estar centrado en la ventana visible');
}

async function participacion(pagina, telefono) {
  await pagina.waitForFunction(telefono => document.querySelector('.escena-atlas')?.dataset.compacta === String(telefono), telefono);
  const escena = pagina.locator('.escena-atlas');
  if (telefono) {
    assert.equal(await escena.locator('.plano-analitico').count(), 0);
    assert.equal(await escena.locator('.plano-por-paso').count(), 2);
    const filas = await escena.locator('.paso-narrativo').evaluateAll(es => es.map(e => {
      const hijos = [...e.children].map(h => h.getBoundingClientRect().height);
      return { alto: e.getBoundingClientRect().height, minimo: getComputedStyle(e).minHeight, hijos };
    }));
    for (const fila of filas) assert.equal(fila.minimo, '0px', 'Las escenas no deben reservar pantallas vacías');
    for (const fila of filas.slice(0, 2)) assert.ok(fila.alto <= Math.max(...fila.hijos) + 80,
      'Cada fila debe medir lo que requiere su texto o gráfico');
    for (const etapa of ['convocatoria', 'asistencia']) {
      const svg = escena.locator(`svg[data-etapa=${etapa}]`);
      assert.equal(await svg.locator('.unidad-morph').count(), 7);
      assert.equal(await svg.locator('.registro-barra').first().evaluate(e => getComputedStyle(e).display === 'none'), etapa === 'convocatoria');
      assert.equal(await svg.locator('.sello').first().evaluate(e => getComputedStyle(e).display === 'none'), etapa === 'asistencia');
      const total = await svg.locator('.unidad-morph').evaluateAll(es => es.reduce((s, e) => s + Number(e.dataset.asistentes), 0));
      assert.equal(total, 3872);
    }
    const nodo = escena.locator('svg[data-etapa=asistencia] .unidad-morph').first();
    const unidad = await nodo.getAttribute('data-unidad');
    await nodo.locator('.registro-barra rect').last().click();
    await pagina.waitForFunction(() => document.querySelectorAll('#inspeccion tbody tr').length === 1);
    assert.equal(await pagina.locator('#inspeccion tbody th').innerText(), unidad);
    await nodo.locator('.registro-barra rect').last().click();
    await pagina.waitForFunction(() => document.querySelectorAll('#inspeccion tbody tr').length === 7);
    const ids = await escena.locator('svg title').evaluateAll(es => es.map(e => e.id));
    assert.equal(new Set(ids).size, ids.length, 'Las dos visualizaciones deben tener referencias accesibles distintas');
  } else {
    assert.equal(await escena.locator('.plano-por-paso').count(), 0);
    assert.equal(await escena.locator('.plano-analitico').count(), 1);
    assert.equal(await escena.locator('.plano-analitico').evaluate(e => getComputedStyle(e).position), 'sticky');
  }
  const barras = await pagina.locator('.partitura').evaluate(e => ({ ancho: e.clientWidth, contenido: e.scrollWidth }));
  assert.ok(barras.contenido <= barras.ancho + 1, 'Las siete jornadas deben caber sin cortar la última barra');
  const totales = await pagina.locator('.jornada').evaluateAll(es => es.reduce((s, e) => s + Number(e.dataset.total), 0));
  assert.equal(totales, 3872);
}

async function valoracion(pagina) {
  assert.equal(await pagina.locator('.contexto strong').innerText(), '515');
  const cuadro = pagina.locator('.cuadro-sugerencias');
  const alto = await cuadro.evaluate(e => e.getBoundingClientRect().height);
  await cuadro.locator('button').click();
  assert.ok(Math.abs(await cuadro.evaluate(e => e.getBoundingClientRect().height) - alto) < 1,
    'Cargar sugerencias no debe alargar la página');
  const scroll = cuadro.locator('.scroll-sugerencias');
  assert.equal(await scroll.evaluate(e => getComputedStyle(e).overflowY), 'auto');
  assert.ok(await scroll.evaluate(e => e.scrollHeight > e.clientHeight));
  await pagina.locator('#dificultades .contador-consulta').first().click();
  await dialogoVisible(pagina, '.ventana-respuestas[open]');
  assert.equal(await pagina.locator('.ventana-lista li').count(), 7);
  await pagina.keyboard.press('Escape');
  await pagina.locator('.preguntas .contador-consulta').first().click();
  await dialogoVisible(pagina, '.ventana-respuestas[open]');
  await pagina.locator('.ventana-lista').evaluate(e => { e.scrollTop = 300; });
  await pagina.keyboard.press('Escape');
  await pagina.locator('#dificultades .contador-consulta').nth(1).click();
  assert.equal(await pagina.locator('.ventana-lista').evaluate(e => e.scrollTop), 0);
  await pagina.keyboard.press('Escape');
}

  const resultados = [];
  for (const [motor, navegador] of Object.entries({ chromium, webkit })) {
    const browser = await navegador.launch();
    try {
      for (const [nombre, opciones, telefono] of [
        ['escritorio', { viewport: { width: 1440, height: 1000 } }, false],
        ['telefono', { viewport: { width: 393, height: 852 }, screen: { width: 393, height: 852 }, isMobile: true, hasTouch: true }, true],
        ['telefono-agente-escritorio', { viewport: { width: 393, height: 852 }, screen: { width: 393, height: 852 }, isMobile: true, hasTouch: true, userAgent: escritorioUA }, true],
        ['viewport-escritorio-alto', { viewport: { width: 1280, height: 2775 }, screen: { width: 393, height: 852 }, isMobile: true, hasTouch: true }, true],
        ['horizontal', { viewport: { width: 852, height: 393 }, screen: { width: 852, height: 393 }, isMobile: true, hasTouch: true }, true],
      ]) {
        const contexto = await browser.newContext(opciones);
        const pagina = await contexto.newPage();
        pagina.setDefaultTimeout(15000);
        const errores = [];
        pagina.on('pageerror', error => errores.push(error.message));
        for (const ruta of ['/transformaciones-participacion', '/valoracion-territorio', '/transformaciones', '/ia-administrativos']) {
          const respuesta = await pagina.goto(BASE + ruta, { waitUntil: 'networkidle' });
          assert.equal(respuesta.status(), 200);
          await pagina.locator('.herramientas-pie button:enabled').first().waitFor();
          if (ruta === '/transformaciones-participacion') await participacion(pagina, telefono);
          if (ruta === '/valoracion-territorio') await valoracion(pagina);
          if (ruta === '/transformaciones') {
            assert.equal(await pagina.locator('#titulo-indicadores-encuestas').isVisible(), true);
            const select = pagina.locator('section[aria-labelledby=titulo-indicadores-encuestas] [data-slot=select-trigger]').nth(1);
            await select.click();
            await pagina.locator('[data-slot=select-content][data-open]').waitFor();
            await pagina.keyboard.press('Escape');
          }
          await marco(pagina, telefono);
          await pagina.locator('.herramientas-pie button').first().click();
          await dialogoVisible(pagina, '.dialogo-editorial[open]');
          await pagina.getByRole('button', { name: 'Cancelar', exact: true }).click();
          assert.equal(await pagina.locator('dialog[open]').count(), 0);
          resultados.push({ motor, nombre, ruta, correcto: true });
        }
        assert.deepEqual(errores, []);
        await contexto.close();
        console.log(motor, nombre, '4 módulos correctos');
      }
    } finally { await browser.close(); }
  }
  console.log(`${resultados.length} verificaciones de módulos completadas, sin archivos temporales.`);
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
