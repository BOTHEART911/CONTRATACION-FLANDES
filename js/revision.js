/* ============================================================
   CONTRATACION-FLANDES · REVISAR CUENTAS
   Ecosistema Flandes · Fase 5, entrega 5.3 (5.4: documentos rápidos,
   ver js/docs-revision.js)

   Qué hay aquí
     · La LISTA de cuentas por revisar: las que el supervisor ya revisó
       (REVISADA POR SUPERVISOR). Pastillas (sin abrir, en revisión,
       vuelven corregidas, secretaría), buscador y Refrescar.
     · El DETALLE de una cuenta en cinco pestañas: Contrato, Pago,
       Planilla, Actividades y Bitácora. Cada una con SUS documentos en
       el visor multidocumento del kit (se puede encoger y mover para
       seguir revisando debajo). Las evidencias de cada obligación (1 a
       3) se miran en el carrusel con zoom.
     · La BITÁCORA de revisión: notas internas por obligación, por
       documento y generales; lo ya visto; dónde quedaste. Se guarda sin
       aprobar ni devolver y se retoma donde quedó. Lo no guardado se
       conserva en este teléfono por si se cierra la app sin querer.
     · TOMAR DECISIÓN: aprobar o devolver. Al devolver, las notas pasan
       al motivo con un toque; el contratista solo lee el motivo. El
       aviso sale con el nombre del supervisor del contrato.

   Qué NO se hizo como en la app vieja (a propósito)
     · Cinco botones "Ver / Ocultar" apilados → pestañas: una sección a
       la vez, sin perder el sitio.
     · Abrir la carpeta de Drive en otra pestaña (exigía la cuenta de
       Google correcta en el teléfono) → los documentos llegan del CORE
       y se ven dentro de la app.
     · Un solo cuadro de observaciones que se perdía al salir → notas
       con autor y hora que se guardan y se retoman.
     · La revisión no se bloquea: si otra persona la está mirando, la
       tarjeta lo dice y ya.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};                           /* lo que da app.js */
  var FILTRO_K = 'revision.filtro.v1';
  var BORRADOR_K = 'revision.borrador.';
  var SEC = [
    { k: 'contrato', t: 'Contrato', i: 'documento' },
    { k: 'pago', t: 'Pago', i: 'moneda' },
    { k: 'planilla', t: 'Planilla', i: 'hoja' },
    { k: 'actividades', t: 'Actividades', i: 'check' },
    { k: 'bitacora', t: 'Bitácora', i: 'lapiz' }
  ];

  /* ══════════════ estado ══════════════ */

  var LISTA = null;          /* {cuentas, puedeDecidir, sello} */
  var HORA = null;
  var F = leerFiltro();

  var D = null;              /* el detalle abierto */
  var B = null;              /* la bitácora en el teléfono */
  var CARPETA = null;        /* {carpeta, grupos} o null mientras llega */
  var CARPETA_P = null;

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    return { rev: g.rev || '', sec: g.sec || '', busca: g.busca || '' };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, F); }

  /* ══════════════ la lista ══════════════ */

  function recibir(d) {
    LISTA = d || { cuentas: [] };
    LISTA.cuentas = (LISTA.cuentas || []).map(function (c) {
      c._t = K.norm([c.nombre, c.doc, c.contrato, c.sec, c.sup].join(' '));
      return c;
    });
    HORA = new Date();
    if (C.alCambiar) C.alCambiar(LISTA.cuentas.length);
  }

  /* Lo que solo LEE se reintenta una vez si la redirección de Google llega
     vencida (el 404 de googleusercontent). Guardar y decidir NUNCA se
     reintentan: se duplicaría la decisión. */
  function leer(accion, datos, veces) {
    return K.pedir(accion, datos, { ms: 60000 })['catch'](function (e) {
      var red = e && (e.codigo === 'RESPUESTA_NO_JSON' || e.codigo === 'SIN_RED' || e.codigo === 'TIEMPO');
      if (red && (veces || 0) < 1) return leer(accion, datos, (veces || 0) + 1);
      throw e;
    });
  }

  var CARGANDO = null;
  function cargar(fresco) {
    if (LISTA && !fresco) return Promise.resolve(LISTA);
    if (CARGANDO && !fresco) return CARGANDO;   /* el inicio y la vista a la vez: un solo viaje */
    CARGANDO = leer('cuentasPorRevisar', { fresco: !!fresco }).then(function (d) { CARGANDO = null; recibir(d); return LISTA; },
      function (e) { CARGANDO = null; throw e; });
    return CARGANDO;
  }

  function cuentas() { return (LISTA && LISTA.cuentas) || []; }

  function estadoRev(c) {
    if (c.revision) return 'curso';
    if (c.devoluciones) return 'vuelve';
    return 'nueva';
  }

  function pasa(c, sin) {
    sin = sin || {};
    if (!sin.rev && F.rev) {
      if (F.rev === 'vuelve' ? !c.devoluciones : estadoRev(c) !== F.rev) return false;
    }
    if (!sin.sec && F.sec && c.sec !== F.sec) return false;
    var q = K.norm(F.busca || '');
    if (q) {
      var p = q.split(' ').filter(Boolean);
      for (var i = 0; i < p.length; i++) if (c._t.indexOf(p[i]) < 0) return false;
    }
    return true;
  }

  function diasDesde(ddmmyyyy) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(ddmmyyyy || ''));
    if (!m) return null;
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.round((hoy - d) / 864e5);
  }

  function horaCorta(d) {
    if (!d) return '';
    var h = d.getHours(), mi = ('0' + d.getMinutes()).slice(-2);
    return (h % 12 || 12) + ':' + mi + (h < 12 ? ' a. m.' : ' p. m.');
  }

  function cabecera(caja, icono, t, p) {
    caja.appendChild(K.nodo(
      '<header class="ct-cab">' +
      '  <span class="ct-cab__ico">' + K.icono(icono, 22) + '</span>' +
      '  <div><h2 class="ct-cab__t">' + K.esc(t) + '</h2>' +
      '  <p class="ct-cab__p">' + p + '</p></div>' +
      '</header>'));
  }

  function lista() {
    if (window.DOCS_REV) window.DOCS_REV.olvidar();   /* 5.4: suelta los documentos de la cuenta anterior */
    var caja = K.nodo('<div class="kit-ancho vista ct rv"></div>');
    C.app.appendChild(caja);
    cabecera(caja, 'documento', 'REVISAR CUENTAS',
      'Las cuentas que el supervisor ya revisó. Las más antiguas van primero. Puedes dejar notas y volver después.');

    var barra = K.nodo('<div class="ct-barra-bus"></div>');
    var buscar = K.nodo('<label class="ins-buscar">' + K.icono('buscar', 18) +
      '<input type="search" placeholder="Nombre, documento, contrato o supervisor" aria-label="Buscar cuenta" autocomplete="off" enterkeyhint="search"></label>');
    var inp = buscar.querySelector('input');
    inp.value = F.busca;
    var recargar = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-recargar" aria-label="Refrescar la lista" title="Refrescar la lista">' +
      K.icono('recargar', 18) + '<span class="kit-oculto">Refrescar</span></button>');
    barra.appendChild(buscar);
    barra.appendChild(recargar);
    caja.appendChild(barra);

    var zRev = K.nodo('<div></div>'), zSec = K.nodo('<div></div>');
    caja.appendChild(zRev);
    caja.appendChild(zSec);
    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var rej = K.nodo('<div class="kit-rejilla ct-lista"></div>');
    caja.appendChild(rej);

    var pRev, pSec;
    function montarPastillas() {
      zRev.innerHTML = ''; zSec.innerHTML = '';
      pRev = K.piezas.pastillas.montar(zRev, {
        etiqueta: 'Cómo va la revisión',
        opciones: [
          { valor: '', texto: 'Todas' },
          { valor: 'nueva', texto: 'Sin abrir', tono: 'ok' },
          { valor: 'curso', texto: 'En revisión', tono: 'aviso' },
          { valor: 'vuelve', texto: 'Vuelven corregidas', tono: 'malo' }
        ],
        valor: F.rev,
        alCambiar: function (v) { F.rev = v; cambio(); }
      });
      pSec = K.piezas.pastillas.montar(zSec, {
        etiqueta: 'Secretaría', opciones: [{ valor: '', texto: 'Todas las secretarías' }], valor: F.sec,
        alCambiar: function (v) { F.sec = v; cambio(); }
      });
    }

    function repintarPastillas() {
      var base = cuentas().filter(function (c) { return pasa(c, { rev: true }); });
      var cR = { '': base.length, nueva: 0, curso: 0, vuelve: 0 };
      base.forEach(function (c) { var e = estadoRev(c); if (e !== 'vuelve') cR[e]++; if (c.devoluciones) cR.vuelve++; });
      pRev.conteos(cR);
      marcar(zRev, F.rev);
      var bs = cuentas().filter(function (c) { return pasa(c, { sec: true }); });
      var m = {};
      bs.forEach(function (c) { if (c.sec) m[c.sec] = (m[c.sec] || 0) + 1; });
      var claves = Object.keys(m).sort(function (a, b) { return a.localeCompare(b, 'es'); });
      var ops = [{ valor: '', texto: 'Todas las secretarías' }].concat(claves.map(function (s) { return { valor: s, texto: titulo(s) }; }));
      var cS = { '': bs.length };
      claves.forEach(function (s) { cS[s] = m[s]; });
      if (F.sec && !cS[F.sec]) { ops.push({ valor: F.sec, texto: titulo(F.sec) }); cS[F.sec] = 0; }
      pSec.opciones(ops); pSec.conteos(cS);
      marcar(zSec, F.sec);
      zSec.hidden = claves.length < 2 && !F.sec;
    }

    function marcar(zona, valor) {
      zona.querySelectorAll('.kit-pastilla').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-valor') === (valor || '') ? 'true' : 'false');
      });
    }

    function cambio() { guardarFiltro(); pintar(); }

    function pintar() {
      repintarPastillas();
      var filas = cuentas().filter(function (c) { return pasa(c); });
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'cuenta por revisar' : 'cuentas por revisar') +
        (filas.length !== cuentas().length ? ' <span>de ' + cuentas().length + '</span>' : '') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(horaCorta(HORA)) + '</span>' : '');
      rej.innerHTML = '';
      if (!cuentas().length) {
        rej.appendChild(K.nodo('<div class="kit-tarjeta ct-vacio rv-aldia">' + K.icono('check', 30) +
          '<p><b>¡Estás al día!</b><br>No hay cuentas esperando revisión. Toca Refrescar para mirar de nuevo.</p></div>'));
        return;
      }
      if (!filas.length) {
        var v = K.nodo('<div class="kit-tarjeta ct-vacio"><p>No hay cuentas con estos filtros.</p>' +
          '<button type="button" class="kit-btn kit-btn--plano">Quitar los filtros</button></div>');
        v.querySelector('button').addEventListener('click', function () { F = { rev: '', sec: '', busca: '' }; inp.value = ''; cambio(); });
        rej.appendChild(v);
        return;
      }
      filas.forEach(function (c) { rej.appendChild(tarjeta(c)); });
    }

    inp.addEventListener('input', K.debounce(function () { F.busca = inp.value.trim(); cambio(); }, 140));

    recargar.addEventListener('click', function () {
      recargar.disabled = true;
      recargar.classList.add('kit-ocupado');
      cargar(true).then(function () { pintar(); K.aviso('Lista al día.', 'ok', 2200); },
        function (e) { K.aviso((e && e.message) || 'No se pudo traer la lista.', 'malo', 6000); })
        .then(function () { recargar.disabled = false; recargar.classList.remove('kit-ocupado'); });
    });

    K.piezas.esqueletos.mientras(rej, cargar(false), { forma: 'tarjetas', cuantos: 4 })
      .then(function () { montarPastillas(); pintar(); })
      ['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });

    K.piezas.creditos.montar(caja);
  }

  function tarjeta(c) {
    var t = K.nodo('<article class="kit-tarjeta ct-t rv-t"></article>');
    var cab = K.nodo('<div class="ct-t__cab"></div>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(c.nombre, { tam: 48, foto: c.img || '' }));
    cab.appendChild(K.nodo(
      '<div class="ct-t__quien">' +
      '  <h3 class="ct-t__n">' + K.esc(nombre(c.nombre)) + '</h3>' +
      '  <p class="ct-t__doc">CC/NIT ' + K.esc(c.doc) + '</p>' +
      '</div>'));
    cab.appendChild(K.nodo('<span class="rv-t__cuenta"><b>' + K.esc(c.informe) + '</b><small>de ' + K.esc(c.total || '—') + '</small></span>'));
    t.appendChild(cab);

    var dias = diasDesde(c.radicada);
    t.appendChild(K.nodo(
      '<dl class="ct-t__datos">' +
      '  <div><dt>Contrato</dt><dd>' + K.esc(c.contrato || '—') + (c.cedido ? ' <small>cedido</small>' : '') + '</dd></div>' +
      '  <div><dt>Secretaría</dt><dd>' + K.esc(titulo(c.sec) || '—') + '</dd></div>' +
      '  <div><dt>Cobra</dt><dd>' + K.esc(c.cobro ? K.pesos(c.cobro) : '—') + '</dd></div>' +
      '  <div><dt>Radicada</dt><dd' + (dias !== null && dias >= 5 ? ' class="rv-t__tarde"' : '') + '>' + K.esc(c.radicada || '—') +
      (dias !== null ? ' <small>· hace ' + dias + (dias === 1 ? ' día' : ' días') + '</small>' : '') + '</dd></div>' +
      (c.revisadaSup ? '  <div><dt>Supervisor</dt><dd>la revisó el ' + K.esc(c.revisadaSup) + '</dd></div>' : '') +
      '</dl>'));
    if (c.sup && K.piezas.personas) {
      var s = K.nodo('<div class="ct-t__sup"></div>');
      s.appendChild(K.piezas.personas.chip(c.sup, 'Supervisor(a)', { tam: 26 }));
      t.appendChild(s);
    }
    var marcas = [];
    if (c.devoluciones) {
      marcas.push('<span class="ct-marca rv-marca--vuelve" title="' + K.esc(c.ultimaDevolucion ? c.ultimaDevolucion.motivo : '') + '">' +
        K.icono('recargar', 11) + ' VUELVE CORREGIDA' + (c.devoluciones > 1 ? ' (' + c.devoluciones + ' devoluciones)' : '') + '</span>');
    }
    if (marcas.length) t.appendChild(K.nodo('<div class="ct-t__marcas">' + marcas.join('') + '</div>'));
    if (c.revision) {
      t.appendChild(K.nodo('<p class="rv-encurso">' + K.icono('reloj', 14) + '<span>En revisión por <b>' + K.esc(nombre(c.revision.por)) +
        '</b> desde ' + K.esc(c.revision.desde) +
        (c.revision.notas ? ' · ' + c.revision.notas + (c.revision.notas === 1 ? ' nota' : ' notas') : '') +
        (c.revision.actualizadaPor && c.revision.actualizadaPor !== c.revision.por ? ' · última vez ' + K.esc(nombre(c.revision.actualizadaPor)) : '') +
        '</span></p>'));
    }
    var a = K.nodo('<div class="ct-acc"></div>');
    var ver = K.nodo('<button type="button" class="kit-btn kit-btn--marca ct-acc__ver">' + K.icono('buscar', 16) +
      (c.revision ? ' Retomar revisión' : ' Revisar') + '</button>');
    ver.addEventListener('click', function () { K.vibrar(8); C.irA('cuenta/' + c.fila + '/' + encodeURIComponent(c.id) + '/' + c.informe); });
    a.appendChild(ver);
    t.appendChild(a);
    return t;
  }

  /* ══════════════ el detalle ══════════════ */

  function llaveDe(sub) {
    var p = String(sub || '').split('/');
    return { fila: parseInt(p[0], 10) || 0, id: decodeURIComponent(p[1] || ''), informe: parseInt(p[2], 10) || 0 };
  }

  function borradorK() { return BORRADOR_K + D.cuenta.fila + '-' + D.cuenta.idContrato + '-' + D.cuenta.informe; }

  function detalle(sub) {
    var q = llaveDe(sub);
    var caja = K.nodo('<div class="kit-ancho vista rv-det"></div>');
    C.app.appendChild(caja);
    D = null; B = null; CARPETA = null;

    if (!q.fila || !q.id) { caja.appendChild(C.errorCaja(new Error('Falta la cuenta.'), function () { C.irA('revisar'); })); return; }

    /* 7.0 · el detalle viene 'ligero' (sin historial ni historia de APROBADAS:
       ~2 s menos de servidor) y esas dos cosas llegan EN PARALELO por
       'cuentaHistorial'. Solo se ven en Pago, Planilla y Bitácora. */
    var p = leer('cuentaRevision', { fila: q.fila, id: q.id, informe: q.informe, ligero: true });
    var pH = leer('cuentaHistorial', q);
    pH['catch'](function () {});        /* el error lo atiende recibirHistorial (o no importa: CORE viejo) */
    HIST_P = pH;
    /* 5.4 · pdf.js y su trabajador se bajan ya, no con el primer documento */
    if (K.piezas.visor && K.piezas.visor.precalentar) K.piezas.visor.precalentar();
    /* la carpeta se pide a la vez: tarda más (Drive) y no frena lo demás.
       5.4: revisionArchivos trae además el boleto de cada archivo para bajar
       los documentos en segundo plano. Si el CORE todavía no la tiene, se usa
       la de la 5.3 y el visor pide cada documento al tocarlo, como antes. */
    if (window.DOCS_REV) window.DOCS_REV.olvidar();
    CARPETA_P = leer('revisionArchivos', q).then(function (r) {
      if (window.DOCS_REV) window.DOCS_REV.recibir(q, r);
      return r;
    }, function () { return leer('revisionDocs', q); }).then(function (r) {
      CARPETA = { carpeta: !!(r && r.carpeta), grupos: (r && r.grupos) || [] };
      if (D) { repintarDocs(); precargar(); }
      return CARPETA;
    }, function () { CARPETA = { carpeta: false, grupos: [], error: true }; if (D) repintarDocs(); return CARPETA; });

    K.piezas.esqueletos.mientras(caja, p, { forma: 'texto', cuantos: 8 })
      .then(function (d) { D = d; iniciarBitacora(); pintar(caja); if (CARPETA) precargar(); recibirHistorial(pH, d); })
      ['catch'](function (e) { caja.appendChild(C.errorCaja(e, function () { C.app.innerHTML = ''; detalle(sub); })); });
  }

  /* ---------- 7.0 · el historial, por su lado ---------- */

  var HIST_P = null;

  function recibirHistorial(pH, d) {
    if (!d || !d.historialPendiente) return;          /* CORE viejo: ya vino completo */
    pH.then(function (r) {
      if (D !== d) return;                            /* ya se abrió otra cuenta */
      d.historial = (r && r.historial) || [];
      d.traza = d.traza || {};
      d.traza.eventos = (r && r.eventos) || [];
      d.historialPendiente = false;
      d.historialError = false;
      repintarHistorial();
    }, function () {
      if (D !== d) return;
      d.historialError = true;
      repintarHistorial();
    });
  }

  function reintentarHistorial() {
    if (!D) return;
    var d = D;
    d.historialError = false;
    d.historialPendiente = true;
    repintarHistorial();
    var pH = leer('cuentaHistorial', { fila: d.cuenta.fila, id: d.cuenta.idContrato, informe: d.cuenta.informe });
    pH['catch'](function () {});
    HIST_P = pH;
    recibirHistorial(pH, d);
  }

  /** Solo se repinta si la persona está en una pestaña que lo muestra. */
  function repintarHistorial() {
    if (!ZONA || !B) return;
    var k = B.posicion.seccion;
    if (k === 'bitacora') {
      /* en la Bitácora solo se cambia la tarjeta de la historia: repintar
         toda la pestaña te movería de donde estás escribiendo */
      var viejo = ZONA.querySelector('.rv-hist--espera');
      if (viejo) viejo.parentNode.replaceChild(historia(), viejo);
      return;
    }
    if (k === 'pago' || k === 'planilla') {
      var y = window.scrollY;
      irSeccion(k, 0, false, true);
      window.scrollTo(0, y);
    }
  }

  /** Mientras el historial viene en camino (o si falló). */
  function esperaHistorial(titulo) {
    var caja = K.nodo('<section class="kit-tarjeta grupo rv-hist rv-hist--espera"><h3 class="grupo__t">' + K.esc(titulo) + '</h3></section>');
    if (D.historialError) {
      caja.appendChild(K.nodo('<p class="formulario__nota">No se pudo traer el historial del contrato.</p>'));
      var b = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('recargar', 15) + ' Reintentar</button>');
      b.addEventListener('click', reintentarHistorial);
      caja.appendChild(b);
    } else {
      caja.appendChild(K.nodo('<p class="formulario__nota">Trayendo el historial del contrato…</p>'));
      if (K.piezas.esqueletos) K.piezas.esqueletos.poner(caja, { forma: 'texto', cuantos: 2 });
    }
    return caja;
  }

  function historialEnCamino() { return !!(D && (D.historialPendiente || D.historialError)); }

  /* ---------- la bitácora en el teléfono ---------- */

  function iniciarBitacora() {
    var r = D.revision || {};
    B = {
      notas: (r.notas || []).slice(),
      quitadas: [],
      vistos: JSON.parse(JSON.stringify(r.vistos || {})),
      cambiosVistos: {},
      posicion: { seccion: 'contrato', obligacion: 0 },
      sucia: false
    };
    var mia = r.posicion && r.posicion[D.yo.nombre];
    if (mia && mia.seccion) B.posicion = { seccion: mia.seccion, obligacion: mia.obligacion || 0 };
    B.retoma = !!(mia && mia.seccion);

    /* lo que quedó sin guardar en este teléfono */
    var g = K.guardar.leer(borradorK(), null);
    if (g && (g.notas || []).length + (g.quitadas || []).length + Object.keys(g.cambiosVistos || {}).length) {
      var mias = {};
      B.notas.forEach(function (n, i) { mias[n.id] = i; });
      (g.notas || []).forEach(function (n) {
        if (mias[n.id] !== undefined) B.notas[mias[n.id]].texto = n.texto; else B.notas.push(n);
      });
      (g.quitadas || []).forEach(function (id) { quitarNotaLocal(id, true); });
      Object.keys(g.cambiosVistos || {}).forEach(function (k) { marcarVisto(k, g.cambiosVistos[k], true); });
      B.sucia = true;
      B.recuperada = true;
    }
  }

  function esMia(n) { return n.nueva || n.autor === D.yo.nombre; }

  function guardarBorrador() {
    if (!D || !B) return;
    B.sucia = true;
    K.guardar.escribir(borradorK(), {
      notas: B.notas.filter(function (n) { return n.nueva || n.editada_local; }),
      quitadas: B.quitadas, cambiosVistos: B.cambiosVistos
    });
    pintarBarra();
  }

  function nuevaNota(ambito, ref, refTitulo, texto) {
    B.notas.push({
      id: 'n' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      ambito: ambito, ref: String(ref || ''), refTitulo: refTitulo || '', texto: texto,
      autor: D.yo.nombre, fecha: 'sin guardar', nueva: true
    });
    guardarBorrador();
  }

  function quitarNotaLocal(id, silencio) {
    for (var i = 0; i < B.notas.length; i++) {
      if (B.notas[i].id !== id) continue;
      if (!B.notas[i].nueva && B.quitadas.indexOf(id) < 0) B.quitadas.push(id);
      B.notas.splice(i, 1);
      break;
    }
    if (!silencio) guardarBorrador();
  }

  function notasDe(ambito, ref) {
    return B.notas.filter(function (n) { return n.ambito === ambito && String(n.ref) === String(ref); });
  }

  function marcarVisto(k, si, silencio) {
    if (si) B.vistos[k] = B.vistos[k] || { por: D.yo.nombre, fecha: 'ahora' };
    else delete B.vistos[k];
    B.cambiosVistos[k] = !!si;
    if (!silencio) guardarBorrador();
  }

  function cuerpoGuardar() {
    return {
      fila: D.cuenta.fila, id: D.cuenta.idContrato, informe: D.cuenta.informe,
      notas: B.notas.filter(esMia).map(function (n) {
        return { id: n.id, ambito: n.ambito, ref: n.ref, refTitulo: n.refTitulo, texto: n.texto };
      }),
      quitadas: B.quitadas,
      vistos: B.cambiosVistos,
      posicion: B.posicion
    };
  }

  function guardarRevision(silencioso) {
    if (!D.cuenta.porRevisar) return Promise.resolve(null);
    var p = K.pedir('revisionGuardar', cuerpoGuardar(), { ms: 60000 });
    var hecho = function (r) {
      D.revision = r.revision;
      K.guardar.borrar(borradorK());
      var pos = B.posicion;
      iniciarBitacora();
      B.posicion = pos;
      /* la tarjeta de la lista también cambia: En revisión por… */
      if (LISTA) LISTA = null;
      return r;
    };
    if (silencioso) return p.then(hecho);
    return K.piezas.guardado.mientras(p, {
      titulo: 'Guardando tu revisión', sub: 'La cuenta no cambia de estado. La retomas cuando quieras.',
      pasos: ['Juntando tus notas…', 'Guardando la bitácora…', 'Casi listo…'],
      listo: { titulo: 'Revisión guardada', paso: 'Queda donde la dejaste' }
    }).then(function (r) { hecho(r); repintarTodo(); return r; },
      function (e) { K.aviso((e && e.message) || 'No se pudo guardar la revisión.', 'malo', 8000); throw e; });
  }

  /* ---------- pintar ---------- */

  var CAJA = null, ZONA = null, BARRA = null, PESTANAS = null;

  function pintar(caja) {
    CAJA = caja;
    caja.innerHTML = '';
    var cu = D.cuenta;

    /* atrás con cambios sin guardar: se pregunta */
    K.piezas.banner.atras(function () { salir(function () { C.irA('revisar'); }); });

    var cab = K.nodo('<section class="kit-tarjeta ct-ficha__cab rv-cab"></section>');
    var foto = '';
    try { foto = (LISTA && cuentas().filter(function (x) { return x.fila === cu.fila; })[0] || {}).img || ''; } catch (e) {}
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(cu.nombre, { tam: 64, foto: foto }));
    var estado = cu.porRevisar
      ? '<span class="kit-pastilla kit-pastilla--aviso" aria-pressed="true">POR REVISAR</span>'
      : '<span class="kit-pastilla" aria-pressed="true">' + K.esc(cu.estado || 'SIN ESTADO') + '</span>';
    cab.appendChild(K.nodo(
      '<div class="ct-ficha__quien">' +
      '  <h2>' + K.esc(nombre(cu.nombre)) + '</h2>' +
      '  <p>CC/NIT ' + K.esc(cu.documento) + ' · Contrato ' + K.esc(cu.contrato) + ' · <b>Cuenta ' + K.esc(cu.informe) + ' de ' + K.esc(cu.total || '—') + '</b></p>' +
      '  <div class="ct-t__marcas">' + estado + '</div>' +
      '  <p class="rv-cab__fechas">Radicada el <b>' + K.esc(cu.radicada || '—') + '</b>' +
      (cu.revisadaSup ? ' · el supervisor la revisó el <b>' + K.esc(cu.revisadaSup) + '</b>' : '') + '</p>' +
      '</div>'));
    if (cu.supervisor && K.piezas.personas) {
      var s = K.nodo('<div class="rv-cab__sup"></div>');
      s.appendChild(K.piezas.personas.chip(cu.supervisor, 'Supervisor(a) · los avisos van a su nombre', { tam: 34 }));
      cab.appendChild(s);
    }
    caja.appendChild(cab);

    /* avisos de arriba: otra persona revisando, ya decidida, recuperada */
    var r = D.revision;
    if (!cu.porRevisar) {
      caja.appendChild(K.nodo('<p class="kit-tarjeta rv-aviso rv-aviso--malo">' + K.icono('aviso', 18) +
        '<span>Esta cuenta ya no está por revisar: quedó <b>' + K.esc(cu.estado) + '</b>. Puedes mirarla, pero ya no se guardan notas ni decisiones.</span></p>'));
    } else if (r && r.por && r.por !== D.yo.nombre) {
      caja.appendChild(K.nodo('<p class="kit-tarjeta rv-aviso">' + K.icono('reloj', 18) +
        '<span><b>' + K.esc(nombre(r.por)) + '</b> empezó esta revisión el ' + K.esc(r.desde) +
        (r.actualizadaPor ? ' (última vez: ' + K.esc(nombre(r.actualizadaPor)) + ', ' + K.esc(r.actualizada) + ')' : '') +
        '. Solo es un aviso: puedes seguir. Sus notas se quedan y las tuyas se suman.</span></p>'));
    }
    if (B.recuperada) {
      caja.appendChild(K.nodo('<p class="kit-tarjeta rv-aviso rv-aviso--ok">' + K.icono('info', 18) +
        '<span>Recuperamos lo que dejaste <b>sin guardar</b> en este teléfono. Toca <b>Guardar revisión</b> para no perderlo.</span></p>'));
    }
    if (B.retoma && !B.recuperada && cu.porRevisar) {
      var sec = SEC.filter(function (x) { return x.k === B.posicion.seccion; })[0];
      caja.appendChild(K.nodo('<p class="kit-tarjeta rv-aviso rv-aviso--ok">' + K.icono('info', 18) +
        '<span>Retomas donde quedaste: <b>' + K.esc(sec ? sec.t : B.posicion.seccion) + '</b>' +
        (B.posicion.obligacion ? ', obligación ' + B.posicion.obligacion : '') + '.</span></p>'));
    }

    caja.appendChild(progreso());

    PESTANAS = K.nodo('<nav class="rv-tabs" role="tablist" aria-label="Secciones de la cuenta"></nav>');
    SEC.forEach(function (x) {
      var b = K.nodo('<button type="button" role="tab" class="rv-tab" data-k="' + x.k + '">' + K.icono(x.i, 16) +
        '<span>' + K.esc(x.t) + '</span><i class="rv-tab__n"></i></button>');
      b.addEventListener('click', function () { K.vibrar(6); irSeccion(x.k, 0, true); });
      PESTANAS.appendChild(b);
    });
    caja.appendChild(PESTANAS);

    ZONA = K.nodo('<div class="rv-zona"></div>');
    caja.appendChild(ZONA);

    BARRA = K.nodo('<div class="rv-barra"></div>');
    caja.appendChild(BARRA);
    pintarBarra();

    K.piezas.creditos.montar(caja);
    irSeccion(B.posicion.seccion || 'contrato', B.posicion.obligacion || 0, false);
  }

  function repintarTodo() {
    if (!CAJA || !D) return;
    var y = window.scrollY;
    pintar(CAJA);
    window.scrollTo(0, y);
  }

  function repintarDocs() {
    if (!ZONA || !B) return;
    var k = B.posicion.seccion;
    refrescarCuentas();
    if (k === 'actividades' || k === 'bitacora') return;   /* no se repinta: perderías el sitio */
    irSeccion(k, 0, false, true);
  }

  /* lo que hay que mirar: documentos + obligaciones */
  function puntos() {
    var p = [];
    todosLosDocs().forEach(function (d) { p.push('doc:' + d.id); });
    D.obligaciones.forEach(function (o) { p.push('obl:' + o.n); });
    return p;
  }

  function progreso() {
    var p = puntos();
    var v = p.filter(function (k) { return !!B.vistos[k]; }).length;
    var pct = p.length ? Math.round(v * 100 / p.length) : 0;
    var n = B.notas.length;
    var caja = K.nodo('<section class="kit-tarjeta rv-prog"></section>');
    caja.appendChild(K.nodo('<p class="rv-prog__t"><span>Llevas <b>' + v + '</b> de <b>' + p.length + '</b> puntos revisados</span>' +
      '<span>' + n + (n === 1 ? ' nota' : ' notas') + '</span></p>'));
    caja.appendChild(K.nodo('<div class="rv-prog__barra" role="img" aria-label="Revisado ' + pct + ' por ciento"><i style="width:' + pct + '%"></i></div>'));
    return caja;
  }

  function contarSeccion(k) {
    if (k === 'actividades') {
      return { total: D.obligaciones.length, vistos: D.obligaciones.filter(function (o) { return B.vistos['obl:' + o.n]; }).length };
    }
    if (k === 'bitacora') return { total: B.notas.length, vistos: -1 };
    var docs = docsDe(k);
    return { total: docs.length, vistos: docs.filter(function (d) { return B.vistos['doc:' + d.id]; }).length };
  }

  function irSeccion(k, obligacion, recordar, sinScroll) {
    B.posicion.seccion = k;
    if (obligacion) B.posicion.obligacion = obligacion;
    PESTANAS.querySelectorAll('.rv-tab').forEach(function (b) {
      var on = b.getAttribute('data-k') === k;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      var c = contarSeccion(b.getAttribute('data-k'));
      var n = b.querySelector('.rv-tab__n');
      n.textContent = c.vistos < 0 ? (c.total ? String(c.total) : '') : (c.total ? c.vistos + '/' + c.total : '');
      n.classList.toggle('rv-tab__n--ok', c.vistos >= 0 && c.total > 0 && c.vistos === c.total);
    });
    ZONA.innerHTML = '';
    ({ contrato: secContrato, pago: secPago, planilla: secPlanilla, actividades: secActividades, bitacora: secBitacora })[k](ZONA);
    if (!sinScroll && obligacion) {
      var el = ZONA.querySelector('[data-obl="' + obligacion + '"]');
      if (el) setTimeout(function () { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
    } else if (!sinScroll && recordar) {
      var top = PESTANAS.getBoundingClientRect().top + window.scrollY - 70;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  /* ---------- documentos ---------- */

  function seccionDeCarpeta(grupo, nombreArchivo) {
    var g = K.norm(grupo || ''), n = K.norm(nombreArchivo || '');
    if (g.indexOf('NOVEDADES') >= 0) return 'contrato';
    if (g.indexOf('ANEXOS') >= 0) return 'actividades';
    if (g.indexOf('BANCO Y PLANILLA') >= 0) return n.indexOf('BANCARIA') >= 0 ? 'pago' : 'planilla';
    if (n.indexOf('ACTIVIDADES') >= 0 || n.indexOf('EVIDENCIAS') >= 0) return 'actividades';
    return 'pago';
  }

  /** Todos los documentos: los de las columnas de la cuenta + los de la carpeta. */
  function todosLosDocs() {
    var vistos = {}, out = [];
    (D.archivos || []).forEach(function (a) {
      if (vistos[a.id]) return;
      vistos[a.id] = true;
      out.push({ id: a.id, titulo: a.titulo, seccion: a.seccion, tipo: '', grupo: '' });
    });
    if (CARPETA && CARPETA.grupos) {
      CARPETA.grupos.forEach(function (g) {
        /* las evidencias ya están en cada obligación, con su carrusel */
        if (K.norm(g.nombre).indexOf('EVIDENCIA') >= 0) return;
        g.archivos.forEach(function (a) {
          if (vistos[a.id]) return;
          vistos[a.id] = true;
          out.push({ id: a.id, titulo: a.nombre.replace(/\.[a-z0-9]{2,4}$/i, ''), seccion: seccionDeCarpeta(g.nombre, a.nombre),
                     tipo: a.tipo === 'otro' ? '' : a.tipo, grupo: g.nombre, bytes: a.bytes });
        });
      });
    }
    return out;
  }

  function docsDe(k) { return todosLosDocs().filter(function (d) { return d.seccion === k; }); }

  /* 5.4 · Bajar en segundo plano todo lo de la cuenta, empezando por la
     pestaña donde está la persona y siguiendo el orden de las pestañas. */
  function precargar() {
    if (!window.DOCS_REV || !D || !CARPETA) return;
    var orden = [B && B.posicion ? B.posicion.seccion : 'contrato'].concat(SEC.map(function (x) { return x.k; }));
    var ids = [], visto = {};
    orden.forEach(function (k) {
      if (visto[k]) return;
      visto[k] = true;
      docsDe(k).forEach(function (d) { ids.push(d.id); });
    });
    window.DOCS_REV.precargar(ids);
  }

  function abrirVisor(lista, i) {
    if (!K.piezas.visor) return;
    var cu = D.cuenta;
    var R = window.DOCS_REV;
    var ids = lista.map(function (d) { return d.id; });
    K.piezas.visor.abrir(lista.map(function (d, j) {
      var viejo = function () {
        return leer('revisionDocumento', { fila: cu.fila, id: cu.idContrato, informe: cu.informe, archivo: d.id });
      };
      var x = { titulo: d.titulo, cargar: function () {
        /* los vecinos pasan al frente: pasar al siguiente se siente inmediato */
        if (R) R.adelantar([ids[j + 1], ids[j - 1]].filter(Boolean));
        var rapido = R ? R.pedir(d.id) : null;
        return rapido ? rapido['catch'](viejo) : viejo();
      } };
      if (d.tipo) x.tipo = d.tipo;
      return x;
    }), { indice: i || 0 });
    var d0 = lista[i || 0];
    if (d0 && !B.vistos['doc:' + d0.id] && D.cuenta.porRevisar) {
      marcarVisto('doc:' + d0.id, true);
      var fila = ZONA && ZONA.querySelector('[data-doc="' + d0.id + '"]');
      if (fila) {
        fila.classList.add('rv-doc--visto');
        var bv = fila.querySelector('.rv-visto');
        if (bv) { bv.classList.add('rv-visto--si'); bv.setAttribute('aria-pressed', 'true'); }
      }
      refrescarCuentas();
    }
  }

  function bloqueDocs(k, titulo) {
    var docs = docsDe(k);
    var caja = K.nodo('<section class="kit-tarjeta grupo rv-docs"></section>');
    var cab = K.nodo('<div class="rv-docs__cab"><h3 class="grupo__t">' + K.esc(titulo) + '</h3></div>');
    if (docs.length > 1) {
      var todos = K.nodo('<button type="button" class="kit-btn kit-btn--plano rv-docs__todos">' + K.icono('documento', 15) + ' Verlos juntos</button>');
      todos.addEventListener('click', function () { abrirVisor(docs, 0); });
      cab.appendChild(todos);
    }
    caja.appendChild(cab);
    if (!docs.length) {
      caja.appendChild(K.nodo('<p class="formulario__nota">' + (CARPETA ? 'Esta sección no tiene documentos.' : 'Buscando los documentos de la carpeta…') + '</p>'));
    }
    docs.forEach(function (d, i) {
      var visto = !!B.vistos['doc:' + d.id];
      var n = notasDe('documento', d.id).length;
      var f = K.nodo(
        '<div class="ins-doc rv-doc' + (visto ? ' rv-doc--visto' : '') + '" data-doc="' + K.esc(d.id) + '">' +
        '  <span class="ins-doc__ico">' + K.icono(d.tipo === 'imagen' ? 'imagen' : 'pdf', 20) + '</span>' +
        '  <span class="ins-doc__txt"><b>' + K.esc(d.titulo) + '</b><small>' + (d.grupo ? K.esc(d.grupo) : 'Adjunto de la cuenta') +
        (n ? ' · ' + n + (n === 1 ? ' nota' : ' notas') : '') + '</small></span>' +
        '</div>');
      var ver = K.nodo('<button type="button" class="kit-btn">' + K.icono('buscar', 15) + ' Ver</button>');
      ver.addEventListener('click', function () { abrirVisor(docs, i); });
      f.appendChild(ver);
      f.appendChild(botonNota('documento', d.id, d.titulo));
      f.appendChild(botonVisto('doc:' + d.id));
      caja.appendChild(f);
    });
    if (CARPETA && CARPETA.error) caja.appendChild(K.nodo('<p class="formulario__nota">No se pudo leer la carpeta de la cuenta: se muestran solo los adjuntos registrados.</p>'));
    return caja;
  }

  function botonVisto(k) {
    var si = !!B.vistos[k];
    var b = K.nodo('<button type="button" class="rv-visto' + (si ? ' rv-visto--si' : '') + '" aria-pressed="' + si + '" title="' +
      (si ? 'Revisado. Toca para desmarcar' : 'Marcar como revisado') + '">' + K.icono('check', 16) + '</button>');
    if (!D.cuenta.porRevisar) b.disabled = true;
    b.addEventListener('click', function () {
      var ahora = !B.vistos[k];
      marcarVisto(k, ahora);
      K.vibrar(6);
      b.classList.toggle('rv-visto--si', ahora);
      b.setAttribute('aria-pressed', String(ahora));
      var fila = b.closest('.rv-doc, .rv-obl');
      if (fila) fila.classList.toggle(fila.classList.contains('rv-obl') ? 'rv-obl--visto' : 'rv-doc--visto', ahora);
      refrescarCuentas();
    });
    return b;
  }

  function botonNota(ambito, ref, refTitulo) {
    var n = notasDe(ambito, ref).length;
    var b = K.nodo('<button type="button" class="rv-nota-b' + (n ? ' rv-nota-b--con' : '') + '" title="Nota interna">' + K.icono('lapiz', 15) +
      (n ? '<i>' + n + '</i>' : '') + '</button>');
    if (!D.cuenta.porRevisar) b.disabled = true;
    b.addEventListener('click', function () { editorNotas(ambito, ref, refTitulo); });
    return b;
  }

  /** El contador de la barra de pestañas y del progreso, sin repintar todo. */
  function refrescarCuentas() {
    if (!CAJA) return;
    var viejo = CAJA.querySelector('.rv-prog');
    if (viejo) viejo.parentNode.replaceChild(progreso(), viejo);
    PESTANAS.querySelectorAll('.rv-tab').forEach(function (b) {
      var c = contarSeccion(b.getAttribute('data-k'));
      var n = b.querySelector('.rv-tab__n');
      n.textContent = c.vistos < 0 ? (c.total ? String(c.total) : '') : (c.total ? c.vistos + '/' + c.total : '');
      n.classList.toggle('rv-tab__n--ok', c.vistos >= 0 && c.total > 0 && c.vistos === c.total);
    });
  }

  /* ---------- las secciones ---------- */

  function secContrato(z) {
    var c = D.contrato || {}, p = D.datos || {}, inf = D.informes || {};
    var rej = K.nodo('<div class="ct-ficha__rej"></div>');
    rej.appendChild(grupo('El contrato', [
      dato('Número', c.contrato), dato('N° de proceso SECOP II', c.numProceso), dato('Tipo', c.tipo),
      dato('Objeto', c.objeto, true), dato('Secretaría', c.secretaria), dato('Fecha del contrato', c.fechaContrato), dato('Tramo', c.tramo)
    ]));
    rej.appendChild(grupo('El plazo', [
      dato('Fecha de inicio', c.fechaInicio), dato('Fecha de terminación', c.fechaTermino), dato('Tiempo de ejecución', c.ejecucion)
    ]));
    var infs = [dato('Informes del primario', inf.primario)];
    if (inf.adicion1) infs.push(dato('Informes de la 1ª adición', inf.adicion1));
    if (inf.adicion2) infs.push(dato('Informes de la 2ª adición', inf.adicion2));
    if (inf.adicion1 || inf.adicion2) infs.push(dato('Total de informes', inf.total));
    rej.appendChild(grupo('La plata', [
      dato('Valor inicial', plata(c.valorInicial)), dato('1ª adición', plata(c.adicion1)),
      dato('2ª adición', plata(c.adicion2)), dato('Valor final', plata(c.valorFinal))
    ].concat(infs)));
    rej.appendChild(grupo('Respaldos presupuestales', [
      dato('CDP', c.cdp), dato('RP', c.rp), dato('CDP adición', c.cdpAdicion), dato('RP adición', c.rpAdicion),
      dato('CDP 2ª adición', c.cdpAdicion2), dato('RP 2ª adición', c.rpAdicion2),
      dato('RP de la cesión (en esta cuenta)', D.cuenta.campos && D.cuenta.campos.rpCesion)
    ]));
    if (K.norm(c.cesion) === 'SI' || c.nombreCedente) {
      rej.appendChild(grupo('Cesión', [
        dato('Fecha', c.fechaCesion), dato('Cedente', c.nombreCedente),
        dato('Documento del cedente', c.documentoCedente), dato('Inicio del cesionario', c.inicioCesionario)
      ]));
    }
    rej.appendChild(grupo('Régimen y facturación', [
      dato('Régimen simple', c.regimen), dato('Factura electrónica', c.factura), dato('Costos o deducciones', c.costos)
    ]));
    if (p.firma) {
      var gf = K.nodo('<section class="kit-tarjeta grupo"><h3 class="grupo__t">Firma del contratista</h3></section>');
      var img = K.nodo('<img class="campo__firma ct-firma" alt="Firma del contratista">');
      img.src = K.miniDrive ? K.miniDrive(p.firma, 480) : p.firma;
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () {
        K.piezas.carrusel.abrir([{ url: K.miniDrive ? K.miniDrive(p.firma, 1600) : p.firma, titulo: 'Firma de ' + nombre(D.cuenta.nombre) }]);
      });
      img.addEventListener('error', function () { img.replaceWith(K.nodo('<p class="formulario__nota">La firma está guardada pero Drive no deja verla desde aquí.</p>')); });
      gf.appendChild(img);
      rej.appendChild(gf);
    }
    z.appendChild(bloqueDocs('contrato', 'Documentos del contrato'));
    z.appendChild(rej);
    z.appendChild(notasSeccion('contrato', 'Contrato'));
  }

  function secPago(z) {
    var cu = D.cuenta, k = cu.campos || {}, p = D.datos || {}, c = D.contrato || {};
    z.appendChild(chequeos());
    var rej = K.nodo('<div class="ct-ficha__rej"></div>');
    rej.appendChild(grupo('El informe', [
      dato('Fecha de radicación', cu.radicada), dato('Informe', cu.informe + ' de ' + (cu.total || '—')),
      dato('Inicio del periodo', k.inicioPeriodo), dato('Fin del periodo', k.finPeriodo)
    ]));
    rej.appendChild(grupo('El cobro', [
      dato('N° factura electrónica', k.facturaNum || (/^SI/i.test(c.factura || '') ? 'Falta' : 'No factura electrónicamente')),
      dato('Saldo actual', pesosTxt(k.saldo)), dato('Valor cobrado', pesosTxt(k.cobro)), dato('Nuevo saldo', pesosTxt(k.nuevoSaldo))
    ]));
    rej.appendChild(grupo('Para el pago', [
      dato('Tipo de cuenta', p.tipoCuenta), dato('Número de cuenta', p.numeroCuenta), dato('Banco', p.banco)
    ]));
    z.appendChild(bloqueDocs('pago', 'Formatos y documentos del cobro'));
    z.appendChild(rej);
    z.appendChild(tablaPagos());
    z.appendChild(notasSeccion('pago', 'Pago'));
  }

  function secPlanilla(z) {
    var k = D.cuenta.campos || {}, p = D.datos || {};
    var rej = K.nodo('<div class="ct-ficha__rej"></div>');
    rej.appendChild(grupo('Planilla', [
      dato('N° de planilla', k.planilla), dato('Mes', k.mesPlanilla), dato('Base de cotización', pesosTxt(k.base)),
      dato('Salud', pesosTxt(k.salud)), dato('Pensión', pesosTxt(k.pension)), dato('Riesgos (ARL)', pesosTxt(k.riesgos)),
      dato('Caja de compensación', pesosTxt(k.caja)), dato('SENA', pesosTxt(k.sena)), dato('ICBF', pesosTxt(k.icbf)),
      dato('Fondo de solidaridad', [k.solidario, pesosTxt(k.aporte)].filter(Boolean).join(' · '))
    ]));
    if (k.planillaA) {
      rej.appendChild(grupo('Planilla anexa', [
        dato('N° de planilla', k.planillaA), dato('Mes', k.mesPlanillaA), dato('Base de cotización', pesosTxt(k.baseA)),
        dato('Salud', pesosTxt(k.saludA)), dato('Pensión', pesosTxt(k.pensionA)), dato('Riesgos (ARL)', pesosTxt(k.riesgosA)),
        dato('Caja de compensación', pesosTxt(k.cajaA)), dato('SENA', pesosTxt(k.senaA)), dato('ICBF', pesosTxt(k.icbfA)),
        dato('Fondo de solidaridad', [k.solidarioA, pesosTxt(k.aporteA)].filter(Boolean).join(' · '))
      ]));
    }
    rej.appendChild(grupo('Afiliaciones que declaró', [dato('EPS', p.eps), dato('Fondo de pensiones', p.pension), dato('ARL', p.arl)]));
    z.appendChild(bloqueDocs('planilla', 'Planillas y comprobantes'));
    z.appendChild(rej);
    z.appendChild(tablaPlanillas());
    z.appendChild(notasSeccion('planilla', 'Planilla'));
  }

  function secActividades(z) {
    z.appendChild(bloqueDocs('actividades', 'Formatos y anexos de actividades'));
    var obl = D.obligaciones || [];
    if (!obl.length) { z.appendChild(K.nodo('<p class="kit-tarjeta formulario__nota">El contrato no tiene obligaciones registradas.</p>')); return; }

    /* los números de arriba: saltar a una obligación sin bajar */
    var salto = K.nodo('<nav class="rv-saltos" aria-label="Ir a una obligación"></nav>');
    obl.forEach(function (o) {
      var cls = 'rv-salto' + (B.vistos['obl:' + o.n] ? ' rv-salto--visto' : '') + (notasDe('obligacion', o.n).length ? ' rv-salto--nota' : '') +
        (!o.actividad ? ' rv-salto--vacia' : '');
      var b = K.nodo('<button type="button" class="' + cls + '">' + o.n + '</button>');
      b.addEventListener('click', function () {
        B.posicion.obligacion = o.n;
        var el = z.querySelector('[data-obl="' + o.n + '"]');
        if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
      salto.appendChild(b);
    });
    z.appendChild(salto);

    obl.forEach(function (o) { z.appendChild(tarjetaObligacion(o, obl.length)); });
  }

  function tarjetaObligacion(o, total) {
    var visto = !!B.vistos['obl:' + o.n];
    var t = K.nodo('<article class="kit-tarjeta rv-obl' + (visto ? ' rv-obl--visto' : '') + '" data-obl="' + o.n + '"></article>');
    var cab = K.nodo('<div class="rv-obl__cab"><span class="obl-lista__n">' + o.n + '</span>' +
      '<p class="rv-obl__t">' + K.esc(o.texto) + '</p></div>');
    t.appendChild(cab);
    var act = K.nodo('<div class="rv-obl__act"><p class="rv-obl__et">Actividades</p></div>');
    if (o.actividad) act.appendChild(textoConEnlaces(o.actividad));
    else act.appendChild(K.nodo('<p class="rv-obl__vacia">' + K.icono('aviso', 14) + ' Sin actividades escritas.</p>'));
    t.appendChild(act);

    var ev = o.evidencias || [];
    var tira = K.nodo('<div class="rv-evi"><p class="rv-obl__et">Evidencias <small>' + ev.length + ' de 3</small></p></div>');
    if (!ev.length) tira.appendChild(K.nodo('<p class="rv-obl__vacia">' + K.icono('imagen', 14) + ' Sin evidencias.</p>'));
    var fotos = K.nodo('<div class="rv-evi__fotos"></div>');
    ev.forEach(function (e, i) {
      var b = K.nodo('<button type="button" class="rv-evi__f" aria-label="Ver evidencia ' + (i + 1) + ' con zoom"><img alt="" loading="lazy"><span>' + (i + 1) + '</span></button>');
      var im = b.querySelector('img');
      im.src = e.mini;
      im.addEventListener('error', function () { b.classList.add('rv-evi__f--rota'); });
      b.addEventListener('click', function () {
        B.posicion.obligacion = o.n;
        K.piezas.carrusel.abrir(ev.map(function (x, j) {
          return { url: x.grande, titulo: 'Obligación ' + o.n + ' · evidencia ' + (j + 1) + ' de ' + ev.length };
        }), { indice: i });
      });
      fotos.appendChild(b);
    });
    if (ev.length) tira.appendChild(fotos);
    t.appendChild(tira);

    var notas = notasDe('obligacion', o.n);
    if (notas.length) t.appendChild(listaNotas(notas, true));

    var pie = K.nodo('<div class="rv-obl__pie"></div>');
    pie.appendChild(botonNota('obligacion', o.n, 'Obligación ' + o.n));
    var bv = botonVisto('obl:' + o.n);
    bv.classList.add('rv-visto--grande');
    bv.insertAdjacentHTML('beforeend', '<span>' + (visto ? 'Revisada' : 'Marcar revisada') + '</span>');
    bv.addEventListener('click', function () {
      var si = !!B.vistos['obl:' + o.n];
      bv.querySelector('span').textContent = si ? 'Revisada' : 'Marcar revisada';
      var s = document.querySelector('.rv-saltos .rv-salto:nth-child(' + o.n + ')');
      if (s) s.classList.toggle('rv-salto--visto', si);
      B.posicion.obligacion = o.n;
      /* al marcarla, a la siguiente: se revisa de corrido */
      if (si && o.n < total) {
        var sig = document.querySelector('[data-obl="' + (o.n + 1) + '"]');
        if (sig) setTimeout(function () { sig.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 180);
      }
    });
    pie.appendChild(bv);
    t.appendChild(pie);
    return t;
  }

  /** Texto con los enlaces vivos (las actividades traen links a publicaciones). */
  function textoConEnlaces(texto) {
    var p = K.nodo('<p class="rv-obl__txt"></p>');
    var re = /(https?:\/\/[^\s]+)/g, i = 0, m;
    var s = String(texto);
    while ((m = re.exec(s)) !== null) {
      if (m.index > i) p.appendChild(document.createTextNode(s.slice(i, m.index)));
      var url = m[0], cola = (url.match(/[.,;:!?)\]]+$/) || [''])[0];
      if (cola) url = url.slice(0, -cola.length);
      var a = document.createElement('a');
      a.href = url; a.textContent = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      p.appendChild(a);
      if (cola) p.appendChild(document.createTextNode(cola));
      i = m.index + m[0].length;
    }
    if (i < s.length) p.appendChild(document.createTextNode(s.slice(i)));
    return p;
  }

  /* ---------- los chequeos que la app vieja hacía de cabeza ---------- */

  function numeroDe(v) { return K.aNumero ? K.aNumero(v) : Number(String(v || '').replace(/\D/g, '')) || 0; }

  function chequeos() {
    if (historialEnCamino()) return esperaHistorial('Chequeo de saldos');
    var k = D.cuenta.campos || {}, h = D.historial || [];
    var avisos = [];
    var saldo = numeroDe(k.saldo), cobro = numeroDe(k.cobro), nuevo = numeroDe(k.nuevoSaldo);
    if (saldo && cobro && Math.abs(saldo - cobro - nuevo) > 1) {
      avisos.push('El saldo no cuadra: ' + K.pesos(saldo) + ' − ' + K.pesos(cobro) + ' da ' + K.pesos(saldo - cobro) + ', no ' + K.pesos(nuevo) + '.');
    }
    var i = -1;
    h.forEach(function (x, j) { if (x.actual) i = j; });
    var ant = i > 0 ? h[i - 1] : null;
    if (ant && ant.nuevoSaldo && saldo && Math.abs(ant.nuevoSaldo - saldo) > 1) {
      avisos.push('El saldo actual (' + K.pesos(saldo) + ') no es el nuevo saldo de la cuenta ' + ant.informe + ' (' + K.pesos(ant.nuevoSaldo) + ').');
    }
    if (ant && ant.cobro && cobro && ant.cobro !== cobro && D.cuenta.informe < (D.cuenta.total || 0)) {
      avisos.push('Cobra ' + K.pesos(cobro) + ' y en la cuenta ' + ant.informe + ' cobró ' + K.pesos(ant.cobro) + '.');
    }
    if (D.cuenta.informe === D.cuenta.total && nuevo > 1) {
      avisos.push('Es la última cuenta del contrato y el nuevo saldo no queda en cero (' + K.pesos(nuevo) + ').');
    }
    var caja = K.nodo('<section class="kit-tarjeta rv-chequeo' + (avisos.length ? ' rv-chequeo--aviso' : '') + '"></section>');
    if (!avisos.length) {
      caja.appendChild(K.nodo('<p>' + K.icono('check', 16) + ' <span>Los saldos cuadran con la cuenta anterior.</span></p>'));
    } else {
      caja.appendChild(K.nodo('<p class="rv-chequeo__t">' + K.icono('aviso', 16) + ' <b>Para mirar con cuidado</b></p>'));
      avisos.forEach(function (a) { caja.appendChild(K.nodo('<p class="rv-chequeo__i">' + K.esc(a) + '</p>')); });
    }
    return caja;
  }

  function tablaPagos() {
    if (historialEnCamino()) return esperaHistorial('Historial de pagos del contrato');
    var h = D.historial || [];
    var caja = K.nodo('<section class="kit-tarjeta grupo rv-hist"><h3 class="grupo__t">Historial de pagos del contrato</h3></section>');
    if (!h.length) { caja.appendChild(K.nodo('<p class="formulario__nota">Sin cuentas anteriores.</p>')); return caja; }
    var filas = h.map(function (x) {
      return '<tr' + (x.actual ? ' class="rv-hist__actual"' : '') + '><th scope="row">' + x.informe + ' de ' + (x.total || '—') + '</th>' +
        '<td>' + K.esc(x.radicada || '—') + '</td><td>' + K.esc(x.saldo ? K.pesos(x.saldo) : '—') + '</td>' +
        '<td>' + K.esc(x.cobro ? K.pesos(x.cobro) : '—') + '</td><td>' + K.esc(x.nuevoSaldo || x.nuevoSaldo === 0 ? K.pesos(x.nuevoSaldo) : '—') + '</td>' +
        '<td>' + K.esc(x.estado || '') + '</td></tr>';
    }).join('');
    caja.appendChild(K.nodo('<div class="seg-tabla"><table class="rv-tabla"><thead><tr><th>Cuenta</th><th>Radicada</th><th>Saldo</th>' +
      '<th>Cobrado</th><th>Nuevo saldo</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div>'));
    return caja;
  }

  function tablaPlanillas() {
    if (historialEnCamino()) return esperaHistorial('Historial de planillas (con anexas)');
    var h = (D.historial || []).filter(function (x) { return x.planilla || x.anexa; });
    var caja = K.nodo('<section class="kit-tarjeta grupo rv-hist"><h3 class="grupo__t">Historial de planillas (con anexas)</h3></section>');
    if (!h.length) { caja.appendChild(K.nodo('<p class="formulario__nota">Sin planillas anteriores.</p>')); return caja; }
    var fila = function (x, p, tipo) {
      return '<tr class="' + (x.actual ? 'rv-hist__actual' : '') + (tipo === 'Anexa' ? ' rv-hist__anexa' : '') + '"><th scope="row">' + x.informe + '</th>' +
        '<td>' + tipo + '</td><td>' + K.esc(p.numero) + (p.mes ? ' <small>' + K.esc(p.mes) + '</small>' : '') + '</td>' +
        '<td>' + K.esc(K.pesos(p.base)) + '</td><td>' + K.esc(K.pesos(p.salud)) + '</td><td>' + K.esc(K.pesos(p.pension)) + '</td>' +
        '<td>' + K.esc(K.pesos(p.riesgos)) + '</td></tr>';
    };
    var filas = h.map(function (x) { return (x.planilla ? fila(x, x.planilla, 'Principal') : '') + (x.anexa ? fila(x, x.anexa, 'Anexa') : ''); }).join('');
    caja.appendChild(K.nodo('<div class="seg-tabla"><table class="rv-tabla"><thead><tr><th>Cuenta</th><th>Tipo</th><th>Planilla</th>' +
      '<th>Base</th><th>Salud</th><th>Pensión</th><th>ARL</th></tr></thead><tbody>' + filas + '</tbody></table></div>'));
    return caja;
  }

  /* ---------- notas ---------- */

  function notasSeccion(k, titulo) {
    var caja = K.nodo('<section class="kit-tarjeta grupo rv-notas-sec"><div class="rv-docs__cab"><h3 class="grupo__t">Notas de ' + K.esc(titulo.toLowerCase()) + '</h3></div></section>');
    if (D.cuenta.porRevisar) {
      var b = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('lapiz', 15) + ' Agregar nota</button>');
      b.addEventListener('click', function () { editorNotas('seccion', k, titulo); });
      caja.firstChild.appendChild(b);
    }
    var n = notasDe('seccion', k);
    if (n.length) caja.appendChild(listaNotas(n, true));
    else caja.appendChild(K.nodo('<p class="formulario__nota">Sin notas. Son internas: el contratista no las ve.</p>'));
    return caja;
  }

  function listaNotas(notas, compacta) {
    var ul = K.nodo('<ul class="rv-notas' + (compacta ? ' rv-notas--compacta' : '') + '"></ul>');
    notas.forEach(function (n) {
      var li = K.nodo('<li class="rv-nota' + (n.nueva ? ' rv-nota--nueva' : '') + '">' +
        '<p class="rv-nota__txt"></p>' +
        '<p class="rv-nota__pie">' + K.esc(nombre(n.autor)) + ' · ' + K.esc(n.nueva ? 'sin guardar' : (n.fecha || '')) +
        (n.editada ? ' · editada ' + K.esc(n.editada) : '') +
        (!compacta && n.refTitulo ? ' · <b>' + K.esc(n.refTitulo) + '</b>' : '') + '</p></li>');
      li.querySelector('.rv-nota__txt').textContent = n.texto;
      ul.appendChild(li);
    });
    return ul;
  }

  /** La capa para escribir, editar y quitar notas de un sitio. */
  function editorNotas(ambito, ref, refTitulo) {
    var cuerpo = K.nodo('<div class="rv-editor"></div>');
    var lista = K.nodo('<div class="rv-editor__lista"></div>');
    cuerpo.appendChild(lista);
    var ta = K.nodo('<textarea class="rv-editor__ta" rows="4" maxlength="2000" placeholder="Qué viste, qué falta, qué hay que corregir…"></textarea>');
    cuerpo.appendChild(ta);
    cuerpo.appendChild(K.nodo('<p class="formulario__nota">Nota interna: el contratista no la ve, salvo que la pases al motivo de una devolución.</p>'));

    function pintarLista() {
      lista.innerHTML = '';
      notasDe(ambito, ref).forEach(function (n) {
        var f = K.nodo('<div class="rv-nota rv-nota--edit"><p class="rv-nota__txt"></p><p class="rv-nota__pie">' + K.esc(nombre(n.autor)) + ' · ' +
          K.esc(n.nueva ? 'sin guardar' : n.fecha) + '</p></div>');
        f.querySelector('.rv-nota__txt').textContent = n.texto;
        if (esMia(n)) {
          var acc = K.nodo('<div class="rv-nota__acc"></div>');
          var ed = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Editar</button>');
          ed.addEventListener('click', function () {
            ta.value = n.texto; ta.focus();
            ta.dataset.edita = n.id;
            guardarBtn.textContent = 'Guardar cambio';
          });
          var qu = K.nodo('<button type="button" class="kit-btn kit-btn--plano kit-btn--malo">Quitar</button>');
          qu.addEventListener('click', function () { quitarNotaLocal(n.id); pintarLista(); });
          acc.appendChild(ed); acc.appendChild(qu);
          f.appendChild(acc);
        }
        lista.appendChild(f);
      });
    }
    pintarLista();

    var guardarBtn;
    var m = modal({
      titulo: 'Notas · ' + refTitulo,
      cuerpo: cuerpo,
      alCerrar: function () { irSeccion(B.posicion.seccion, 0, false, true); refrescarCuentas(); },
      botones: [
        { texto: 'Listo', al: function () { m.cerrar(); } },
        { texto: 'Agregar nota', marca: true, al: function () {
            var t = ta.value.replace(/\r/g, '').trim();
            if (!t) { ta.focus(); return; }
            if (ta.dataset.edita) {
              B.notas.forEach(function (n) { if (n.id === ta.dataset.edita) { n.texto = t; n.editada_local = true; } });
              delete ta.dataset.edita;
              guardarBorrador();
            } else {
              nuevaNota(ambito, ref, refTitulo, t);
            }
            ta.value = '';
            guardarBtn.textContent = 'Agregar nota';
            K.vibrar(8);
            pintarLista();
          } }
      ]
    });
    guardarBtn = m.botones[1];
    setTimeout(function () { ta.focus(); }, 120);
  }

  /* ---------- la pestaña Bitácora ---------- */

  function secBitacora(z) {
    var cu = D.cuenta;
    /* nota general */
    var gen = K.nodo('<section class="kit-tarjeta grupo"><div class="rv-docs__cab"><h3 class="grupo__t">Notas generales</h3></div></section>');
    if (cu.porRevisar) {
      var b = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('lapiz', 15) + ' Agregar nota</button>');
      b.addEventListener('click', function () { editorNotas('general', 'general', 'Nota general'); });
      gen.firstChild.appendChild(b);
    }
    var ng = notasDe('general', 'general');
    gen.appendChild(ng.length ? listaNotas(ng, true) : K.nodo('<p class="formulario__nota">Sin notas generales.</p>'));
    z.appendChild(gen);

    /* todas las notas de esta ronda */
    var todas = K.nodo('<section class="kit-tarjeta grupo"><h3 class="grupo__t">Todas las notas de esta revisión (' + B.notas.length + ')</h3></section>');
    todas.appendChild(B.notas.length ? listaNotas(ordenarNotas(B.notas), false) : K.nodo('<p class="formulario__nota">Aún no hay notas.</p>'));
    z.appendChild(todas);

    /* rondas anteriores */
    (D.anteriores || []).forEach(function (r) {
      var s = K.nodo('<details class="kit-tarjeta grupo rv-ronda"><summary><b>Revisión anterior</b> · ' + K.esc(r.decision || 'cerrada') +
        ' el ' + K.esc(r.decidida || r.actualizada || '') + ' · ' + (r.notas || []).length + ' notas</summary></details>');
      if ((r.notas || []).length) s.appendChild(listaNotas(ordenarNotas(r.notas), false));
      z.appendChild(s);
    });

    /* la historia: quién y cuándo */
    z.appendChild(historia());
  }

  function ordenarNotas(n) {
    var peso = { general: 0, seccion: 1, documento: 2, obligacion: 3 };
    return n.slice().sort(function (a, b) {
      return (peso[a.ambito] - peso[b.ambito]) || (Number(a.ref) - Number(b.ref)) || 0;
    });
  }

  function historia() {
    if (historialEnCamino()) return esperaHistorial('Historia de la cuenta · quién y cuándo');
    var cu = D.cuenta, t = D.traza || {};
    var ev = [];
    if (cu.radicada) ev.push({ f: cu.radicada, e: 'RADICADA', q: cu.nombre, m: '' });
    (t.eventos || []).forEach(function (x) {
      ev.push({ f: x.fecha, e: x.estado, q: x.quien, r: x.revisor, m: x.motivo });
    });
    if (cu.revisadaSup) ev.push({ f: cu.revisadaSup, e: 'REVISADA POR SUPERVISOR', q: cu.supervisor, m: cu.observacionSup && cu.estado === 'REVISADA POR SUPERVISOR' ? cu.observacionSup : '' });
    ev.sort(function (a, b) { return clave(a.f) - clave(b.f); });
    var caja = K.nodo('<section class="kit-tarjeta grupo rv-historia"><h3 class="grupo__t">Historia de la cuenta · quién y cuándo</h3></section>');
    if (!ev.length) { caja.appendChild(K.nodo('<p class="formulario__nota">Sin movimientos registrados.</p>')); return caja; }
    var ol = K.nodo('<ol class="rv-linea"></ol>');
    ev.forEach(function (x) {
      var tono = x.e === 'DEVUELTA' ? ' rv-linea__i--malo' : (x.e === 'APROBADA' ? ' rv-linea__i--ok' : '');
      var li = K.nodo('<li class="rv-linea__i' + tono + '"><p class="rv-linea__t"><b>' + K.esc(x.e) + '</b> · ' + K.esc(x.f || '') + '</p>' +
        '<p class="rv-linea__q">' + K.esc(nombre(x.q || '')) + (x.r && K.norm(x.r) !== K.norm(x.q) ? ' <small>(revisó ' + K.esc(nombre(x.r)) + ')</small>' : '') + '</p></li>');
      if (x.m) { var p = K.nodo('<p class="rv-linea__m"></p>'); p.textContent = x.m; li.appendChild(p); }
      ol.appendChild(li);
    });
    caja.appendChild(ol);
    return caja;
  }

  function clave(f) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?/.exec(String(f || ''));
    return m ? Number(m[3] + m[2] + m[1] + (m[4] || '00') + (m[5] || '00')) : 0;
  }

  /* ---------- la barra de abajo ---------- */

  function pintarBarra() {
    if (!BARRA || !D) return;
    BARRA.innerHTML = '';
    if (!D.cuenta.porRevisar) return;
    var g = K.nodo('<button type="button" class="kit-btn rv-barra__g">' + K.icono('nube', 16) + ' Guardar revisión' +
      (B.sucia ? ' <i class="rv-barra__punto" aria-label="Hay cambios sin guardar"></i>' : '') + '</button>');
    g.addEventListener('click', function () { guardarRevision(false); });
    BARRA.appendChild(g);
    if (D.puedeDecidir) {
      var d = K.nodo('<button type="button" class="kit-btn kit-btn--marca rv-barra__d">' + K.icono('check', 16) + ' Tomar decisión</button>');
      d.addEventListener('click', tomarDecision);
      BARRA.appendChild(d);
    } else {
      BARRA.appendChild(K.nodo('<p class="rv-barra__nota">Tu usuario revisa y deja notas. Aprobar o devolver lo decide quien tiene ese permiso.</p>'));
    }
  }

  function salir(seguir) {
    if (!B || !B.sucia || !D || !D.cuenta.porRevisar) { seguir(); return; }
    K.piezas.confirmar.abrir({
      titulo: 'Tienes cambios sin guardar',
      texto: 'Tus notas quedan en este teléfono, pero nadie más las verá hasta que guardes la revisión.',
      si: 'Guardar y salir', no: 'Salir sin guardar'
    }).then(function (ok) {
      if (!ok) { seguir(); return; }
      guardarRevision(false).then(seguir, function () {});
    });
  }

  /* ══════════════ TOMAR DECISIÓN ══════════════ */

  function tomarDecision() {
    var cu = D.cuenta;
    var p = puntos(), faltan = p.filter(function (k) { return !B.vistos[k]; });
    var cuerpo = K.nodo('<div class="rv-dec"></div>');
    if (faltan.length) {
      var od = faltan.filter(function (k) { return k.indexOf('obl:') === 0; }).length;
      cuerpo.appendChild(K.nodo('<p class="rv-aviso rv-aviso--mini">' + K.icono('aviso', 16) + '<span>Te faltan por marcar ' +
        (od ? od + (od === 1 ? ' obligación' : ' obligaciones') : '') + (od && faltan.length - od ? ' y ' : '') +
        (faltan.length - od ? (faltan.length - od) + (faltan.length - od === 1 ? ' documento' : ' documentos') : '') +
        '. Puedes decidir igual.</span></p>'));
    }
    var op = K.nodo('<div class="rv-dec__ops" role="radiogroup" aria-label="Decisión"></div>');
    var bA = K.nodo('<button type="button" class="rv-dec__op rv-dec__op--ok" role="radio" aria-checked="false">' + K.icono('check', 26) +
      '<b>Aprobar</b><small>Sigue al plan de pagos</small></button>');
    var bD = K.nodo('<button type="button" class="rv-dec__op rv-dec__op--malo" role="radio" aria-checked="false">' + K.icono('responder', 26) +
      '<b>Devolver</b><small>Vuelve al contratista para corregir</small></button>');
    op.appendChild(bA); op.appendChild(bD);
    cuerpo.appendChild(op);
    var zona = K.nodo('<div class="rv-dec__zona"></div>');
    cuerpo.appendChild(zona);

    var eleccion = '';
    var ta = null;

    function elegir(e) {
      eleccion = e;
      bA.setAttribute('aria-checked', String(e === 'APROBAR'));
      bD.setAttribute('aria-checked', String(e === 'DEVOLVER'));
      zona.innerHTML = '';
      if (e === 'APROBAR') {
        zona.appendChild(K.nodo('<p class="rv-dec__txt">Se aprueba la <b>cuenta ' + cu.informe + ' de ' + K.esc(cu.total || '—') + '</b> de <b>' +
          K.esc(nombre(cu.nombre)) + '</b>. Le llega el aviso para hacer el plan de pagos, a nombre de <b>' + K.esc(nombre(cu.supervisor)) + '</b>.</p>'));
      } else {
        zona.appendChild(K.nodo('<label class="rv-dec__et" for="rv-motivo">Motivo de la devolución · <b>lo lee el contratista</b></label>'));
        ta = K.nodo('<textarea id="rv-motivo" class="rv-editor__ta" rows="6" maxlength="3000" placeholder="Qué debe corregir, uno por línea"></textarea>');
        zona.appendChild(ta);
        var cont = K.nodo('<p class="rv-dec__cont">0 / 3.000</p>');
        zona.appendChild(cont);
        var notas = ordenarNotas(B.notas);
        if (notas.length) {
          var cab = K.nodo('<div class="rv-docs__cab"><p class="rv-dec__et">Tus notas de la revisión · pásalas con un toque</p></div>');
          var todas = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Pasar todas</button>');
          cab.appendChild(todas);
          zona.appendChild(cab);
          var ul = K.nodo('<ul class="rv-pasar"></ul>');
          var botones = [];
          notas.forEach(function (n) {
            var li = K.nodo('<li><span class="rv-pasar__t"><b>' + K.esc(n.refTitulo || 'General') + ':</b> </span></li>');
            li.querySelector('.rv-pasar__t').appendChild(document.createTextNode(n.texto));
            var b = K.nodo('<button type="button" class="kit-btn kit-btn--plano rv-pasar__b">' + K.icono('mas', 14) + ' Pasar</button>');
            b.addEventListener('click', function () { pasar(n, b); });
            botones.push([n, b]);
            li.appendChild(b);
            ul.appendChild(li);
          });
          todas.addEventListener('click', function () { botones.forEach(function (x) { if (!x[1].disabled) pasar(x[0], x[1]); }); });
          zona.appendChild(ul);
        }
        var prev = K.nodo('<div class="rv-dec__prev"><p class="rv-dec__et">Así le llega al contratista</p><pre></pre></div>');
        zona.appendChild(prev);
        var pintarPrev = function () {
          cont.textContent = K.numero(ta.value.length) + ' / 3.000';
          prev.querySelector('pre').textContent = 'Hola ' + cu.nombre + '. Tu cuenta del informe ' + cu.informe + ' (contrato ' + cu.contrato +
            ') fue DEVUELTA.\n\nMotivo:\n' + (ta.value.trim() || '…') + '\n\nCorrígela en CORREGIR CUENTA y, cuando la guardes, repórtala otra vez desde ESTADO DE CUENTA.\n\n' +
            cu.supervisor + '\nSupervisor(a) del contrato';
        };
        ta.addEventListener('input', pintarPrev);
        pintarPrev();
        setTimeout(function () { ta.focus(); }, 80);
      }
      m.botones[1].disabled = false;
    }

    function pasar(n, b) {
      var linea = '• ' + (n.refTitulo && n.ambito !== 'general' ? n.refTitulo + ': ' : '') + n.texto;
      ta.value = (ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n' : '') + linea;
      ta.dispatchEvent(new Event('input'));
      b.disabled = true;
      b.innerHTML = K.icono('check', 14) + ' Pasada';
      K.vibrar(6);
    }

    bA.addEventListener('click', function () { K.vibrar(6); elegir('APROBAR'); });
    bD.addEventListener('click', function () { K.vibrar(6); elegir('DEVOLVER'); });

    var m = modal({
      titulo: 'Tomar decisión · cuenta ' + cu.informe,
      cuerpo: cuerpo,
      ancha: true,
      botones: [
        { texto: 'Cancelar', al: function () { m.cerrar(); } },
        { texto: 'Confirmar', marca: true, al: function () { confirmar(); } }
      ]
    });
    m.botones[1].disabled = true;

    function confirmar() {
      if (!eleccion) return;
      var motivo = ta ? ta.value.replace(/\r/g, '').trim() : '';
      if (eleccion === 'DEVOLVER' && motivo.length < 10) {
        K.aviso('Escribe el motivo: es lo que va a leer el contratista.', 'aviso', 5000);
        if (ta) ta.focus();
        return;
      }
      var cuerpoD = cuerpoGuardar();
      cuerpoD.decision = eleccion;
      cuerpoD.motivo = motivo;
      m.cerrar();
      K.ocupado = true;
      var devolver = eleccion === 'DEVOLVER';
      K.piezas.guardado.mientras(K.pedir('revisionDecidir', cuerpoD, { ms: 90000 }), {
        titulo: devolver ? 'Devolviendo la cuenta' : 'Aprobando la cuenta',
        sub: 'No cierres la app.',
        pasos: devolver ? ['Guardando el motivo…', 'Anotando quién y cuándo…', 'Avisando al contratista y al supervisor…', 'Casi listo…']
                        : ['Aprobando…', 'Anotando quién y cuándo…', 'Avisando al contratista…', 'Casi listo…'],
        listo: { titulo: devolver ? 'Cuenta devuelta' : 'Cuenta aprobada', paso: devolver ? 'El contratista ya tiene el motivo' : 'Sigue al plan de pagos' }
      }).then(function (r) {
        K.ocupado = false;
        K.guardar.borrar(borradorK());
        B.sucia = false;
        if (r && r.lista) recibir(r.lista);
        if (r && r.aviso && r.aviso.ok === false) {
          K.aviso('Quedó ' + r.estado.toLowerCase() + ', pero el aviso al contratista no salió: ' + (r.aviso.error || 'sin canal') + '.', 'aviso', 9000);
        }
        if (r && r.grupo && r.grupo.ok === false) {
          K.aviso('El aviso al grupo del supervisor no salió: ' + (r.grupo.error || '') + '.', 'aviso', 9000);
        }
        C.irA('revisar');
      }, function (e) {
        K.ocupado = false;
        K.aviso((e && e.message) || 'No se pudo guardar la decisión.', 'malo', 9000);
        /* si otra persona decidió antes, lo que hay en pantalla ya no vale */
        if (e && /ya no esta por revisar/i.test(e.message || '')) { LISTA = null; C.irA('revisar'); }
      });
    }
  }

  /* ══════════════ una capa sencilla ══════════════ */

  function modal(o) {
    var capa = K.nodo('<div class="rv-modal" role="dialog" aria-modal="true"><div class="rv-modal__velo"></div>' +
      '<div class="rv-modal__caja' + (o.ancha ? ' rv-modal__caja--ancha' : '') + '"><header class="rv-modal__cab"><h3></h3>' +
      '<button type="button" class="rv-modal__x" aria-label="Cerrar">' + K.icono('cerrar', 18) + '</button></header>' +
      '<div class="rv-modal__cuerpo"></div><footer class="rv-modal__pie"></footer></div></div>');
    capa.querySelector('h3').textContent = o.titulo || '';
    capa.querySelector('.rv-modal__cuerpo').appendChild(o.cuerpo);
    var botones = (o.botones || []).map(function (b) {
      var x = K.nodo('<button type="button" class="kit-btn' + (b.marca ? ' kit-btn--marca' : ' kit-btn--plano') + '"></button>');
      x.textContent = b.texto;
      x.addEventListener('click', b.al);
      capa.querySelector('.rv-modal__pie').appendChild(x);
      return x;
    });
    function cerrar() {
      if (capa.__cerrada) return;
      capa.__cerrada = true;
      document.removeEventListener('keydown', tecla);
      if (o.alCerrar) { try { o.alCerrar(); } catch (e) {} }
      capa.classList.remove('rv-modal--on');
      setTimeout(function () { if (capa.parentNode) capa.parentNode.removeChild(capa); }, 180);
    }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    capa.querySelector('.rv-modal__velo').addEventListener('click', cerrar);
    capa.querySelector('.rv-modal__x').addEventListener('click', cerrar);
    document.addEventListener('keydown', tecla);
    document.body.appendChild(capa);
    requestAnimationFrame(function () { capa.classList.add('rv-modal--on'); });
    return { cerrar: cerrar, botones: botones, capa: capa };
  }

  /* ══════════════ auxiliares ══════════════ */

  function plata(v) { return (v && v.texto) ? ('$ ' + v.texto) : ''; }
  function pesosTxt(v) {
    var s = String(v === null || v === undefined ? '' : v).trim();
    if (!s || /^N\/?A$/i.test(s)) return '';
    return /\d/.test(s) ? K.pesos(numeroDe(s)) : s;
  }

  function grupo(t, filas) {
    var vivas = filas.filter(Boolean);
    if (!vivas.length) return document.createComment('');
    var g = K.nodo('<section class="kit-tarjeta grupo"><h3 class="grupo__t">' + K.esc(t) + '</h3></section>');
    vivas.forEach(function (x) { g.appendChild(x); });
    return g;
  }

  function dato(etiqueta, valor, largo) {
    var v = String(valor === null || valor === undefined ? '' : valor).trim();
    if (!v) return null;
    return K.nodo('<div class="dato' + (largo ? ' dato--largo' : '') + '"><span class="dato__e">' + K.esc(etiqueta) +
      '</span><span class="dato__v">' + K.esc(v) + '</span></div>');
  }

  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function titulo(s) {
    return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
                    .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }

  /* cerrar la app con cambios sin guardar: el navegador pregunta */
  window.addEventListener('beforeunload', function (e) {
    if (B && B.sucia && D && D.cuenta.porRevisar && /^#\/cuenta\//.test(location.hash)) { e.preventDefault(); e.returnValue = ''; }
  });

  window.REVISION = {
    configurar: function (o) { C = o || {}; },
    recibir: recibir, cargar: cargar, lista: lista, detalle: detalle,
    olvidar: function () { LISTA = null; D = null; B = null; K.guardar.borrar(FILTRO_K); F = leerFiltro(); if (window.DOCS_REV) window.DOCS_REV.olvidar(); },
    pendientes: function () { return LISTA ? LISTA.cuentas.length : null; },
    salir: salir,
    /* para Insights */
    _cuentas: cuentas,
    _visibles: function () { return cuentas().filter(function (c) { return pasa(c); }); },
    _detalle: function () { return D; },
    _bitacora: function () { return B; },
    _puntos: function () { return D ? puntos() : []; },
    _docs: function () { return D ? todosLosDocs() : []; }
  };
}());
