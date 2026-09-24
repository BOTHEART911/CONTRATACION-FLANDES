/* ============================================================
   CONTRATACION-FLANDES · CONTRATISTAS
   Ecosistema Flandes · Fase 5, entrega 5.1

   La lista de todos los contratos y la ficha de cada uno.

   CÓMO CARGA (el patrón de BD Predial, kit/listas.js)
     Las 223 filas llegan UNA vez, compactas, dentro del arranque. Filtrar,
     buscar y contar pasa en el teléfono: tocar una pastilla no viaja al
     servidor. El botón de recargar pide la lista fresca cuando alguien la
     cambió desde otra app.

   LOS FILTROS (pliego de la Fase 5)
     · Estado: Activos (de entrada), Inactivos, Todos.
     · Adicionados y Cedidos, que se suman al estado.
     · Secretaría y, dentro de ella, Supervisor. Cada pastilla lleva su
       conteo sobre lo que dejan pasar los demás filtros.
     · Buscador por nombre, documento (desde 6 dígitos), contrato,
       secretaría, supervisor o teléfono, sin tildes y por varias palabras.
     Los filtros se recuerdan en este teléfono: al volver de una ficha,
     la lista está donde la dejaste.

   5.1.1 (correcciones de Oss)
     · Sin activar/inactivar: lo hace solo otro script.
     · Botón REFRESCAR a la vista, con la hora de la última carga.
     · Ordenar (A→Z, contrato más nuevo, termina primero), barra del plazo
       con aviso de "termina en N días" y documento que se copia al tocarlo.

   5.2
     · En cada tarjeta ACTIVA, para quien tiene el permiso: Adición,
       Cesión y Suspensión (cada una abre su vista, en gestion.js). La
       suspensión se ve también como marca en la tarjeta.
     · Botón Agregar contratista en la cabecera de la lista.

   10.2 (archivo COMPARTIDO: el mismo en CONTRATACION-FLANDES y ADMIN-FLANDES)
     · Botón CARGA MASIVA junto a Agregar (misma regla de permiso).
     · Ganchos para ADMIN (window.GESTION_EXTRA): más botones en la tarjeta
       y la ficha (novedades, editar datos, cuentas) y secciones propias en
       la ficha. En CONTRATACION no existe y todo sigue igual.
     · Si la ficha llega ya pedida (una escritura devolvió 'detalle'), se
       pinta sin volver a viajar (FICHAS listas).

   LA LLAVE es el ID CONTRATO (documento-contrato). EDILBERTO sale tres
   veces, una por contrato, y cada tarjeta abre SU ficha.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};                  /* lo que da app.js: app, puede, irA, errorCaja */
  var FILTRO_K = 'contratistas.filtro.v1';
  var POR_TANDA = 30;          /* tarjetas que se pintan de cada vez */

  var F = leerFiltro();

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    return {
      estado: g.estado === undefined ? 'ACTIVO' : g.estado,
      extras: Array.isArray(g.extras) ? g.extras : [],
      sec: g.sec || '',
      sup: g.sup || '',
      busca: g.busca || '',
      orden: g.orden || 'nombre'
    };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, F); }

  /** El arranque entrega la lista hecha: se mete sin viajar. */
  function recibir(datos) {
    TODAS = K.piezas.listas.expandir(datos).map(pulir);
    HORA = new Date();
  }
  var HORA = null;             /* cuándo llegó la lista: se enseña junto al conteo */

  function horaCorta(d) {
    if (!d) return '';
    var h = d.getHours(), m = ('0' + d.getMinutes()).slice(-2);
    return (h % 12 || 12) + ':' + m + (h < 12 ? ' a. m.' : ' p. m.');
  }

  var TODAS = null;

  /* 1/0 → true/false y el texto de búsqueda armado una sola vez */
  function pulir(f) {
    f.adic = !!f.adic;
    f.cedido = !!f.cedido;
    f.susp = f.susp || '';
    f._t = K.norm([f.nombre, f.doc, f.contrato, f.sec, f.sup, f.tel, f.tipo].join(' '));
    return f;
  }

  function todas() { return TODAS || []; }

  /** Si la lista no llegó con el arranque (sesión recién abierta por otro
      camino), el arranque se repite: trae también caras y configuración. */
  /* 7.0 · la lista ya no viaja con 'inicio': se pide aparte y UNA sola vez
     aunque la pidan a la vez el arranque, el resumen y la vista (EN_CAMINO). */
  var EN_CAMINO = null;
  function cargar(forzar) {
    if (TODAS && !forzar) return Promise.resolve(TODAS);
    if (EN_CAMINO && !forzar) return EN_CAMINO;
    var p = K.pedir('contratistas', {}, { ms: 60000 }).then(function (d) { recibir(d); return TODAS || []; });
    EN_CAMINO = p;
    p.then(function () { if (EN_CAMINO === p) EN_CAMINO = null; }, function () { if (EN_CAMINO === p) EN_CAMINO = null; });
    return p;
  }

  function olvidar() { TODAS = null; EN_CAMINO = null; FICHAS = {}; K.guardar.borrar(FILTRO_K); F = leerFiltro(); }

  /* ══════════════ el filtro ══════════════ */

  function pasaEstado(f) {
    if (F.estado === 'ACTIVO') return f.estado === 'ACTIVO';
    if (F.estado === 'INACTIVO') return f.estado !== 'ACTIVO';
    return true;
  }
  function pasaExtras(f) {
    if (F.extras.indexOf('adic') >= 0 && !f.adic) return false;
    if (F.extras.indexOf('cedido') >= 0 && !f.cedido) return false;
    return true;
  }
  function pasaBusca(f) {
    var q = K.norm(F.busca || '');
    if (!q) return true;
    var palabras = q.split(' ').filter(Boolean);
    for (var i = 0; i < palabras.length; i++) {
      var p = palabras[i];
      /* el documento cuenta desde seis cifras: con tres, "123" sale en
         medio mundo y la búsqueda no sirve */
      if (/^\d+$/.test(p)) {
        if (p.length >= 6 ? (f.doc.indexOf(p) < 0 && f.tel.indexOf(p) < 0 && f._t.indexOf(p) < 0)
                          : (String(f.contrato).indexOf(p) < 0)) return false;
      } else if (f._t.indexOf(p) < 0) return false;
    }
    return true;
  }
  function filtradas(sin) {
    sin = sin || {};
    return todas().filter(function (f) {
      if (!sin.estado && !pasaEstado(f)) return false;
      if (!sin.extras && !pasaExtras(f)) return false;
      if (!sin.sec && F.sec && f.sec !== F.sec) return false;
      if (!sin.sup && F.sup && f.sup !== F.sup) return false;
      if (!sin.busca && !pasaBusca(f)) return false;
      return true;
    });
  }

  /* 5.1.1 · ORDENAR. La hoja no trae un orden útil para trabajar: se ordena
     aquí, sin viajar. "Termina primero" pone arriba lo que vence antes. */
  function fechaDe(s) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || ''));
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }
  function ordenar(filas) {
    var o = F.orden || 'nombre';
    var copia = filas.slice();
    if (o === 'contrato') copia.sort(function (a, b) { return (parseInt(b.contrato, 10) || 0) - (parseInt(a.contrato, 10) || 0); });
    else if (o === 'fin') copia.sort(function (a, b) {
      var x = fechaDe(a.fin), y = fechaDe(b.fin);
      if (!x && !y) return 0; if (!x) return 1; if (!y) return -1;
      return x - y;
    });
    else copia.sort(function (a, b) {
      var ea = a.estado === 'ACTIVO' ? 0 : 1, eb = b.estado === 'ACTIVO' ? 0 : 1;
      return ea - eb || String(a.nombre).localeCompare(String(b.nombre), 'es');
    });
    return copia;
  }

  function textoFiltros() {
    var t = [];
    t.push(F.estado === 'ACTIVO' ? 'activos' : F.estado === 'INACTIVO' ? 'inactivos' : 'todos los estados');
    if (F.extras.indexOf('adic') >= 0) t.push('adicionados');
    if (F.extras.indexOf('cedido') >= 0) t.push('cedidos');
    if (F.sec) t.push(titulo(F.sec));
    if (F.sup) t.push('supervisor(a) ' + nombre(F.sup));
    if (F.busca) t.push('búsqueda «' + F.busca + '»');
    return t.join(' · ');
  }

  /* ══════════════ la vista lista ══════════════ */

  var VISTA = null;            /* lo que está en pantalla, para Insights */

  /**
   * sub llega del inicio: 'activos', 'adicionados', 'cedidos', 'todos' o
   * 'sec/<nombre>'. Pone el filtro y deja la ruta limpia.
   */
  function aplicarAtajo(sub) {
    if (!sub) return;
    var p = String(sub).split('/');
    F.busca = ''; F.sup = '';
    if (p[0] === 'activos') { F.estado = 'ACTIVO'; F.extras = []; F.sec = ''; }
    else if (p[0] === 'adicionados') { F.estado = 'ACTIVO'; F.extras = ['adic']; F.sec = ''; }
    else if (p[0] === 'cedidos') { F.estado = 'ACTIVO'; F.extras = ['cedido']; F.sec = ''; }
    else if (p[0] === 'todos') { F.estado = ''; F.extras = []; F.sec = ''; }
    else if (p[0] === 'sec') { F.estado = 'ACTIVO'; F.extras = []; F.sec = decodeURIComponent(p.slice(1).join('/')); }
    guardarFiltro();
    history.replaceState(null, '', '#/contratistas');
  }

  function lista(sub) {
    aplicarAtajo(sub);
    var caja = K.nodo('<div class="kit-ancho vista ct"></div>');
    C.app.appendChild(caja);

    caja.appendChild(K.nodo(
      '<header class="ct-cab">' +
      '  <span class="ct-cab__ico">' + K.icono('persona', 22) + '</span>' +
      '  <div><h2 class="ct-cab__t">CONTRATISTAS</h2>' +
      '  <p class="ct-cab__p">Toca una tarjeta para ver el contrato y los datos. Los filtros no gastan datos: todo pasa en tu teléfono.</p></div>' +
      '</header>'
    ));
    if (C.puede && C.puede('agregarContratista')) {
      var bAg = K.nodo('<button type="button" class="kit-btn kit-btn--marca ct-agregar">' + K.icono('mas', 16) + ' Agregar contratista</button>');
      bAg.addEventListener('click', function () { K.vibrar(8); C.irA('agregar'); });
      caja.firstChild.appendChild(bAg);
      /* 10.2 · varios contratos de una vez con la plantilla de Excel */
      var bMa = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-agregar ct-masiva">' + K.icono('hoja', 16) + ' Carga masiva</button>');
      bMa.addEventListener('click', function () { K.vibrar(8); C.irA('masiva'); });
      caja.firstChild.appendChild(bMa);
    }

    var barra = K.nodo('<div class="ct-barra-bus"></div>');
    var buscar = K.nodo(
      '<label class="ins-buscar">' + K.icono('buscar', 18) +
      '<input type="search" placeholder="Nombre, documento, contrato, secretaría o supervisor" ' +
      'aria-label="Buscar contratista" autocomplete="off" enterkeyhint="search"></label>'
    );
    var inp = buscar.querySelector('input');
    inp.value = F.busca;
    var recargar = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-recargar" aria-label="Refrescar la lista" title="Refrescar la lista">' +
      K.icono('recargar', 18) + '<span>Refrescar</span></button>');
    var orden = K.nodo('<label class="ct-orden"><span class="kit-oculto">Ordenar</span><select aria-label="Ordenar la lista">' +
      '<option value="nombre">A → Z</option><option value="contrato">Contrato más nuevo</option>' +
      '<option value="fin">Termina primero</option></select></label>');
    orden.querySelector('select').value = F.orden || 'nombre';
    orden.querySelector('select').addEventListener('change', function (ev) { F.orden = ev.target.value; cambio(); });
    barra.appendChild(buscar);
    barra.appendChild(orden);
    barra.appendChild(recargar);
    caja.appendChild(barra);

    var zEstado = K.nodo('<div></div>');
    var zSec = K.nodo('<div></div>');
    var zSup = K.nodo('<div></div>');
    caja.appendChild(zEstado);
    caja.appendChild(zSec);
    caja.appendChild(zSup);

    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var rej = K.nodo('<div class="kit-rejilla ct-lista"></div>');
    caja.appendChild(rej);
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-mas" hidden>Ver más</button>');
    caja.appendChild(mas);

    var pEstado, pSec, pSup, visibles = POR_TANDA;

    function montarPastillas() {
      zEstado.innerHTML = ''; zSec.innerHTML = ''; zSup.innerHTML = '';
      pEstado = K.piezas.pastillas.montar(zEstado, {
        etiqueta: 'Estado y tipo',
        multiple: false,
        opciones: [
          { valor: 'ACTIVO', texto: 'Activos', tono: 'ok' },
          { valor: 'INACTIVO', texto: 'Inactivos', tono: 'aviso' },
          { valor: '', texto: 'Todos' },
          { valor: '+adic', texto: 'Adicionados' },
          { valor: '+cedido', texto: 'Cedidos' }
        ],
        valor: F.estado,
        alCambiar: function (v) {
          /* las dos últimas se prenden y apagan sin mover el estado */
          if (v.charAt(0) === '+') {
            var x = v.slice(1), k = F.extras.indexOf(x);
            if (k >= 0) F.extras.splice(k, 1); else F.extras.push(x);
          } else {
            F.estado = v;
          }
          cambio();
        }
      });
      pSec = K.piezas.pastillas.montar(zSec, {
        etiqueta: 'Secretaría', opciones: [{ valor: '', texto: 'Todas las secretarías' }], valor: F.sec,
        alCambiar: function (v) { F.sec = v; F.sup = ''; cambio(); }
      });
      pSup = K.piezas.pastillas.montar(zSup, {
        etiqueta: 'Supervisor', opciones: [{ valor: '', texto: 'Todos los supervisores' }], valor: F.sup,
        alCambiar: function (v) { F.sup = v; cambio(); }
      });
    }

    function opciones(filas, campo, textoTodas) {
      var m = {};
      filas.forEach(function (f) { var v = f[campo] || ''; if (v) m[v] = (m[v] || 0) + 1; });
      var claves = Object.keys(m).sort(function (a, b) { return a.localeCompare(b, 'es'); });
      return {
        lista: [{ valor: '', texto: textoTodas }].concat(claves.map(function (v) { return { valor: v, texto: campo === 'sec' ? titulo(v) : nombre(v) }; })),
        conteos: (function () { var c = { '': filas.length }; claves.forEach(function (k) { c[k] = m[k]; }); return c; }())
      };
    }

    /** Las pastillas se rehacen con lo que dejan pasar los OTROS filtros:
        así el número de cada una es lo que vas a ver si la tocas. */
    function repintarPastillas() {
      /* estado: conteos sobre todo lo demás */
      var baseE = filtradas({ estado: true, extras: true });
      var cE = { ACTIVO: 0, INACTIVO: 0, '': baseE.length, '+adic': 0, '+cedido': 0 };
      baseE.forEach(function (f) {
        if (f.estado === 'ACTIVO') cE.ACTIVO++; else cE.INACTIVO++;
        if (pasaEstado(f) && f.adic) cE['+adic']++;
        if (pasaEstado(f) && f.cedido) cE['+cedido']++;
      });
      pEstado.conteos(cE);
      /* las dos que suman se marcan a mano: la pieza es de una sola elección */
      zEstado.querySelectorAll('.kit-pastilla').forEach(function (b) {
        var v = b.getAttribute('data-valor');
        if (v.charAt(0) === '+') b.setAttribute('aria-pressed', F.extras.indexOf(v.slice(1)) >= 0 ? 'true' : 'false');
        else b.setAttribute('aria-pressed', v === F.estado ? 'true' : 'false');
      });

      var oS = opciones(filtradas({ sec: true, sup: true }), 'sec', 'Todas las secretarías');
      if (F.sec && !oS.conteos[F.sec]) { oS.lista.push({ valor: F.sec, texto: titulo(F.sec) }); oS.conteos[F.sec] = 0; }
      pSec.opciones(oS.lista); pSec.conteos(oS.conteos);
      marcar(zSec, F.sec);

      var oP = opciones(filtradas({ sup: true }), 'sup', 'Todos los supervisores');
      if (F.sup && !oP.conteos[F.sup]) { oP.lista.push({ valor: F.sup, texto: nombre(F.sup) }); oP.conteos[F.sup] = 0; }
      pSup.opciones(oP.lista); pSup.conteos(oP.conteos);
      marcar(zSup, F.sup);
    }

    function marcar(zona, valor) {
      zona.querySelectorAll('.kit-pastilla').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-valor') === (valor || '') ? 'true' : 'false');
      });
      var on = zona.querySelector('[aria-pressed="true"]');
      if (on && on.scrollIntoView && on.offsetLeft > zona.clientWidth) {
        zona.scrollLeft = on.offsetLeft - 24;
      }
    }

    function cambio() {
      visibles = POR_TANDA;
      guardarFiltro();
      pintar();
    }

    function pintar() {
      repintarPastillas();
      var filas = ordenar(filtradas());
      VISTA = filas;
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'contrato' : 'contratos') +
        ' · <span>' + K.esc(textoFiltros()) + '</span>' +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(horaCorta(HORA)) + '</span>' : '');
      rej.innerHTML = '';
      if (!filas.length) {
        rej.appendChild(K.nodo('<div class="kit-tarjeta ct-vacio"><p>No hay contratos con estos filtros.</p>' +
          '<button type="button" class="kit-btn kit-btn--plano">Quitar los filtros</button></div>'));
        rej.querySelector('button').addEventListener('click', function () {
          F = { estado: 'ACTIVO', extras: [], sec: '', sup: '', busca: '', orden: F.orden || 'nombre' };
          inp.value = '';
          cambio();
        });
        mas.hidden = true;
        return;
      }
      filas.slice(0, visibles).forEach(function (f) { rej.appendChild(tarjeta(f)); });
      mas.hidden = filas.length <= visibles;
      mas.textContent = 'Ver ' + Math.min(POR_TANDA, filas.length - visibles) + ' más (quedan ' + (filas.length - visibles) + ')';
    }

    mas.addEventListener('click', function () {
      var desde = visibles;
      visibles += POR_TANDA;
      var filas = ordenar(filtradas());
      filas.slice(desde, visibles).forEach(function (f) { rej.appendChild(tarjeta(f)); });
      mas.hidden = filas.length <= visibles;
      mas.textContent = 'Ver ' + Math.min(POR_TANDA, filas.length - visibles) + ' más (quedan ' + (filas.length - visibles) + ')';
    });

    inp.addEventListener('input', K.debounce(function () { F.busca = inp.value.trim(); cambio(); }, 140));

    recargar.addEventListener('click', function () {
      recargar.disabled = true;
      recargar.classList.add('kit-ocupado');
      cargar(true).then(function () {
        pintar();
        K.aviso('Lista al día.', 'ok', 2500);
      })['catch'](function (e) {
        K.aviso(e && e.message ? e.message : 'No se pudo traer la lista.', 'malo', 6000);
      }).then(function () {
        recargar.disabled = false;
        recargar.classList.remove('kit-ocupado');
      });
    });

    K.piezas.esqueletos.mientras(rej, cargar(), { forma: 'tarjetas', cuantos: 6 })
      .then(function () { montarPastillas(); pintar(); })
      ['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });

    K.piezas.creditos.montar(caja);
  }

  /* ══════════════ la tarjeta ══════════════ */

  function tarjeta(f) {
    var t = K.nodo('<article class="kit-tarjeta ct-t' + (f.estado !== 'ACTIVO' ? ' ct-t--inactivo' : '') + '"></article>');
    var cab = K.nodo('<div class="ct-t__cab"></div>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(f.nombre, { tam: 48, foto: f.img || '' }));
    cab.appendChild(K.nodo(
      '<div class="ct-t__quien">' +
      '  <h3 class="ct-t__n">' + K.esc(nombre(f.nombre)) + '</h3>' +
      '  <button type="button" class="ct-t__doc" title="Toca para copiar">CC/NIT ' + K.esc(f.doc) + ' ' + K.icono('copiar', 12) + '</button>' +
      '</div>'
    ));
    cab.appendChild(K.nodo('<span class="kit-pastilla ' + (f.estado === 'ACTIVO' ? 'kit-pastilla--ok' : 'kit-pastilla--aviso') +
      ' ct-t__estado" aria-pressed="true">' + K.esc(f.estado) + '</span>'));
    t.appendChild(cab);
    cab.querySelector('.ct-t__doc').addEventListener('click', function () { copiar(f.doc, 'Documento copiado'); });

    var marcas = [];
    if (f.tramo) marcas.push('<span class="ct-marca">' + K.esc(f.tramo) + '</span>');
    if (f.adic) marcas.push('<span class="ct-marca ct-marca--adic">ADICIONADO</span>');
    if (f.cedido) marcas.push('<span class="ct-marca ct-marca--ced">CEDIDO</span>');
    if (f.susp) marcas.push('<span class="ct-marca ct-marca--susp">' + K.icono('pausa', 11) + ' SUSPENDIDO ' + K.esc(f.susp) + '</span>');
    t.appendChild(K.nodo(
      '<dl class="ct-t__datos">' +
      '  <div><dt>Contrato</dt><dd>' + K.esc(f.contrato || '—') + (f.fecha ? ' <small>de ' + K.esc(f.fecha) + '</small>' : '') + '</dd></div>' +
      '  <div><dt>Secretaría</dt><dd>' + K.esc(titulo(f.sec) || '—') + '</dd></div>' +
      '</dl>'
    ));
    t.appendChild(plazo(f));
    if (f.sup && K.piezas.personas) {
      var s = K.nodo('<div class="ct-t__sup"></div>');
      s.appendChild(K.piezas.personas.chip(f.sup, 'Supervisor(a)', { tam: 26 }));
      t.appendChild(s);
    }
    if (marcas.length) t.appendChild(K.nodo('<div class="ct-t__marcas">' + marcas.join('') + '</div>'));

    t.appendChild(acciones(f, false));
    var g = gestion(f);
    if (g) t.appendChild(g);
    return t;
  }

  /**
   * 5.2 · Adición, Cesión y Suspensión (5.5: y Editar). Solo en contratos ACTIVOS y solo
   * para quien tiene el permiso (CREADOR). Van aparte de Detalles /
   * WhatsApp / Drive porque cambian el contrato: no se tocan sin querer.
   */
  function gestion(f) {
    if (!C.puede) return null;
    var X = window.GESTION_EXTRA;
    if (f.estado !== 'ACTIVO' && !(X && X.inactivos)) return null;
    var items = f.estado !== 'ACTIVO' ? [] : [
      ['editar', 'lapiz', 'Editar', 'editarContratista'],   /* 5.5: corrección u OTROSÍ */
      ['adicion', 'mas', 'Adición'],
      ['cesion', 'persona', 'Cesión'],
      ['suspension', 'pausa', f.susp ? 'Suspensión ✓' : 'Suspensión']
    ].filter(function (x) { return C.puede(x[3] || x[0]); });
    /* 10.2 · ADMIN suma sus botones (novedades, datos, cuentas) */
    if (X && X.items) items = X.items(f, items);
    if (!items.length) return null;
    var a = K.nodo('<div class="ct-gest" role="group" aria-label="Gestionar el contrato"></div>');
    items.forEach(function (x) {
      var b = K.nodo('<button type="button" class="ct-gest__b">' + K.icono(x[1], 15) + ' ' + K.esc(x[2]) + '</button>');
      b.addEventListener('click', function () { K.vibrar(8); C.irA(x[0] + '/' + encodeURIComponent(f.id)); });
      a.appendChild(b);
    });
    return a;
  }

  /** Detalles · WhatsApp · Drive. Las mismas en tarjeta y ficha.
      5.1.1: SIN activar/inactivar. Oss lo hace de forma automática con otro
      script; un botón aquí sería una segunda puerta para lo mismo. */
  function acciones(f, enFicha) {
    var a = K.nodo('<div class="ct-acc"></div>');
    if (!enFicha) {
      var ver = K.nodo('<button type="button" class="kit-btn kit-btn--marca ct-acc__ver">' + K.icono('documento', 16) + ' Detalles</button>');
      ver.addEventListener('click', function () { K.vibrar(8); adelantar(f.id); C.irA('contratista/' + encodeURIComponent(f.id)); });
      /* 7.0 · la ficha se empieza a pedir al APOYAR el dedo (o el ratón), no al soltarlo */
      ver.addEventListener('pointerdown', function () { adelantar(f.id); });
      a.appendChild(ver);
    }
    var wa = K.nodo('<button type="button" class="ins-accion" aria-label="WhatsApp de ' + K.esc(f.nombre) + '">' + K.icono('whatsapp', 16) + ' WhatsApp</button>');
    wa.addEventListener('click', function () {
      var tel = String(f.tel || '').replace(/\D/g, '');
      if (tel.length !== 10) { K.aviso('Este contratista no tiene un celular de 10 dígitos registrado.', 'aviso', 5000); return; }
      window.open('https://wa.me/57' + tel, '_blank', 'noopener');
    });
    a.appendChild(wa);
    var dr = K.nodo('<button type="button" class="ins-accion" aria-label="Carpeta de Drive">' + K.icono('nube', 16) + ' Drive</button>');
    dr.addEventListener('click', function () {
      if (!f.carpeta) { K.aviso('Este contrato no tiene carpeta de Drive asociada.', 'aviso', 5000); return; }
      window.open('https://drive.google.com/drive/folders/' + encodeURIComponent(f.carpeta), '_blank', 'noopener');
    });
    a.appendChild(dr);
    return a;
  }

  /* ══════════════ la ficha ══════════════ */

  var FICHA = null;            /* la ficha abierta, para Insights */

  /*
   * 7.0 · LA FICHA SE SIENTE AL INSTANTE (medido el 23/09: 1,1 s de servidor
   * + ~2 s de transporte por ficha).
   *   · adelantar(): la petición sale al apoyar el dedo en "Detalles"; cuando
   *     la vista abre ya va en camino. Solo vale 20 s y solo para esa ficha,
   *     así nunca se pinta una ficha vieja (p. ej. después de una adición).
   *   · Mientras llega, la cabecera (foto, nombre, contrato, estado) se pinta
   *     de una vez con la fila de la lista, que ya está en el teléfono.
   */
  var FICHAS = {};             /* id -> { p: promesa, t: cuando } (solo peticiones recién hechas) */

  /** 10.2 · una escritura que ya trae la ficha nueva la deja lista: abrirla no viaja. */
  function ficha(d) {
    if (!d || !d.idContrato) return;
    FICHAS[K.norm(d.idContrato)] = { p: Promise.resolve(d), t: Date.now() };
  }

  function adelantar(id) {
    var k = K.norm(id), ya = FICHAS[k];
    if (ya && Date.now() - ya.t < 20000) return ya.p;
    var p = K.pedir('contratistaDetalle', { idContrato: id }, { ms: 60000 });
    FICHAS[k] = { p: p, t: Date.now() };
    p['catch'](function () { if (FICHAS[k] && FICHAS[k].p === p) delete FICHAS[k]; });
    return p;
  }

  function filaDeLista(id) {
    var k = K.norm(id);
    return (TODAS || []).filter(function (x) { return K.norm(x.id) === k; })[0] || null;
  }

  function detalle(sub) {
    var id = decodeURIComponent(String(sub || ''));
    var caja = K.nodo('<div class="kit-ancho vista ct-ficha"></div>');
    C.app.appendChild(caja);
    FICHA = null;

    var p = adelantar(id);
    delete FICHAS[K.norm(id)];          /* consumida: la próxima vez se pide fresca */
    var f = filaDeLista(id);
    var resto = caja;
    if (f) {
      caja.appendChild(cabecera(f));
      resto = K.nodo('<div class="ct-ficha__resto"></div>');
      caja.appendChild(resto);
    }
    K.piezas.esqueletos.mientras(resto, p, { forma: 'texto', cuantos: f ? 6 : 8 })
      .then(function (d) { FICHA = d; pintarFicha(caja, d); })
      ['catch'](function (e) {
        resto.appendChild(C.errorCaja(e, function () { C.app.innerHTML = ''; detalle(sub); }));
      });
  }

  /** La cabecera de la ficha. La usan la ficha completa y el pintado previo. */
  function cabecera(f, conGestion) {
    var cab = K.nodo('<section class="kit-tarjeta ct-ficha__cab"></section>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(f.nombre, { tam: 76, foto: f.img || '' }));
    var marcas = '<span class="kit-pastilla ' + (f.estado === 'ACTIVO' ? 'kit-pastilla--ok' : 'kit-pastilla--aviso') + '" aria-pressed="true">' + K.esc(f.estado) + '</span>';
    if (f.tramo) marcas += '<span class="ct-marca">' + K.esc(f.tramo) + '</span>';
    if (f.adic) marcas += '<span class="ct-marca ct-marca--adic">ADICIONADO</span>';
    if (f.cedido) marcas += '<span class="ct-marca ct-marca--ced">CEDIDO</span>';
    if (f.susp) marcas += '<span class="ct-marca ct-marca--susp">' + K.icono('pausa', 11) + ' SUSPENDIDO ' + K.esc(f.susp) + '</span>';
    cab.appendChild(K.nodo(
      '<div class="ct-ficha__quien">' +
      '  <h2>' + K.esc(nombre(f.nombre)) + '</h2>' +
      '  <p>CC/NIT ' + K.esc(f.doc) + ' · Contrato ' + K.esc(f.contrato) + '</p>' +
      '  <div class="ct-t__marcas">' + marcas + '</div>' +
      '</div>'
    ));
    cab.appendChild(acciones(f, true));
    if (conGestion) {
      var gF = gestion(f);
      if (gF) cab.appendChild(gF);
    }
    return cab;
  }

  function pintarFicha(caja, d) {
    caja.innerHTML = '';
    var c = d.contrato || {}, p = d.datos || {};
    var f = pulir(K.piezas.listas.expandir({ campos: d.campos, filas: [d.fila] })[0]);

    caja.appendChild(cabecera(f, true));

    if (c.supervisor && K.piezas.personas) {
      var sup = K.nodo('<section class="kit-tarjeta grupo grupo--persona"><h3 class="grupo__t">Lo supervisa</h3></section>');
      sup.appendChild(K.piezas.personas.chip(c.supervisor, c.secretaria ? titulo(c.secretaria) : 'Supervisor(a)', { tam: 44 }));
      caja.appendChild(sup);
    }

    var rej = K.nodo('<div class="ct-ficha__rej"></div>');
    caja.appendChild(rej);

    rej.appendChild(grupo('El contrato', [
      dato('Número', c.contrato), dato('N° de proceso SECOP II', c.numProceso), dato('Tipo', c.tipo),
      dato('Objeto', c.objeto, true), dato('Secretaría', c.secretaria), dato('Fecha del contrato', c.fechaContrato),
      dato('Tramo', c.tramo), dato('Régimen simple', c.regimen), dato('Factura electrónica', c.factura),
      dato('Costos o deducciones', c.costos)
    ]));
    rej.appendChild(grupo('El plazo', [
      dato('Fecha de inicio', c.fechaInicio), dato('Fecha de terminación', c.fechaTermino), dato('Tiempo de ejecución', c.ejecucion),
      dato('Suspendido', f.susp)
    ]));
    rej.appendChild(grupo('La plata', [
      dato('Valor inicial', plata(c.valorInicial)), dato('1ª adición', plata(c.adicion1)),
      dato('2ª adición', plata(c.adicion2)), dato('Valor final', plata(c.valorFinal))
    ].concat(informes(d.informes, c))));
    rej.appendChild(grupo('Respaldos presupuestales', [
      dato('CDP', c.cdp), dato('RP', c.rp), dato('CDP adición', c.cdpAdicion), dato('RP adición', c.rpAdicion),
      dato('CDP 2ª adición', c.cdpAdicion2), dato('RP 2ª adición', c.rpAdicion2)
    ]));
    if (K.norm(c.cesion) === 'SI' || c.nombreCedente) {
      rej.appendChild(grupo('Cesión', [
        dato('Fecha', c.fechaCesion), dato('Cedente', c.nombreCedente),
        dato('Documento del cedente', c.documentoCedente), dato('Inicio del cesionario', c.inicioCesionario)
      ]));
    }
    rej.appendChild(grupo('Datos personales', [
      dato('Expedición del documento', p.expedida), dato('Teléfono', p.telefono), dato('Correo', p.correo),
      dato('Dirección', p.direccion), dato('Municipio de residencia', p.municipio), dato('Fecha de nacimiento', p.nacimiento)
    ]));
    rej.appendChild(grupo('Para el pago', [
      dato('Tipo de cuenta', p.tipoCuenta), dato('Número de cuenta', p.numeroCuenta), dato('Banco', p.banco)
    ]));
    rej.appendChild(grupo('Seguridad social', [
      dato('EPS', p.eps), dato('Fondo de pensiones', p.pension), dato('ARL', p.arl)
    ]));

    if (p.firma) {
      var gf = K.nodo('<section class="kit-tarjeta grupo"><h3 class="grupo__t">Firma</h3></section>');
      var img = K.nodo('<img class="campo__firma ct-firma" alt="Firma del contratista">');
      img.src = K.miniDrive ? K.miniDrive(p.firma, 480) : p.firma;
      img.addEventListener('error', function () { img.replaceWith(K.nodo('<p class="formulario__nota">La firma está guardada pero Drive no deja verla desde aquí.</p>')); });
      if (K.piezas.visor) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function () {
          K.piezas.visor.abrir([{ titulo: 'Firma de ' + nombre(f.nombre), url: K.miniDrive(p.firma, 1200), tipo: 'imagen' }]);
        });
      }
      gf.appendChild(img);
      rej.appendChild(gf);
    } else {
      rej.appendChild(K.nodo('<section class="kit-tarjeta grupo"><h3 class="grupo__t">Firma</h3>' +
        '<p class="formulario__nota formulario__nota--fuerte">No tiene firma cargada: sus formatos salen sin firmar.</p></section>'));
    }

    if ((c.obligaciones || []).length) {
      var g = K.nodo('<section class="kit-tarjeta grupo ct-obl"><h3 class="grupo__t">Obligaciones (' + c.obligaciones.length + ')</h3></section>');
      c.obligaciones.forEach(function (o) {
        g.appendChild(K.nodo('<div class="obl-lista__i"><span class="obl-lista__n">' + o.n + '</span>' +
          '<span class="obl-lista__t">' + K.esc(o.texto) + '</span></div>'));
      });
      caja.appendChild(g);
    }

    /* 10.2 · ADMIN: cuentas con su estado, canal, novedades y editar datos */
    if (window.GESTION_EXTRA && window.GESTION_EXTRA.ficha) {
      try { window.GESTION_EXTRA.ficha(caja, d, f); } catch (e) { try { console.error(e); } catch (e2) {} }
    }

    if (!c.yaDiligenciado) {
      caja.insertBefore(K.nodo('<p class="kit-tarjeta formulario__nota formulario__nota--fuerte ct-aviso">' +
        'Al contratista le faltan datos obligatorios del contrato (proceso, fechas del acta, RP o las preguntas del RUT). ' +
        'Sin ellos no se generan los formatos de su primera cuenta.</p>'), rej);
    }

    K.piezas.creditos.montar(caja);
  }

  function plata(v) { return (v && v.texto) ? ('$ ' + v.texto) : ''; }

  function grupo(titulo, filas) {
    var vivas = filas.filter(Boolean);
    if (!vivas.length) return document.createComment('');
    var g = K.nodo('<section class="kit-tarjeta grupo"><h3 class="grupo__t">' + K.esc(titulo) + '</h3></section>');
    vivas.forEach(function (x) { g.appendChild(x); });
    return g;
  }

  /**
   * 5.1.2 · LOS INFORMES POR TRAMO. La hoja guarda en TOTAL INFORMES 1RA
   * ADICION el TOTAL ACUMULADO (8 del primario + 3 de la adición = 11), no
   * los de la adición. El CORE ya manda cada tramo por separado y el total;
   * lo que sale del valor y no de la hoja se dice.
   */
  function informes(inf, c) {
    if (!inf) return [dato('Informes del primario', c.totalInformesPrimario)];
    var calc = function (k) { return (inf.calculado || []).indexOf(k) >= 0 ? ' (según el valor)' : ''; };
    var r = [dato('Informes del primario', inf.primario || '')];
    if (inf.adicion1) r.push(dato('Informes de la 1ª adición', inf.adicion1 + calc('adicion1')));
    if (inf.adicion2) r.push(dato('Informes de la 2ª adición', inf.adicion2 + calc('adicion2')));
    if (inf.adicion1 || inf.adicion2) r.push(dato('Total de informes', inf.total));
    if (inf.aviso) r.push(K.nodo('<p class="ct-inf-aviso">' + K.esc(inf.aviso) + '</p>'));
    return r;
  }

  function dato(etiqueta, valor, largo) {
    var v = String(valor === null || valor === undefined ? '' : valor).trim();
    if (!v) return null;
    return K.nodo('<div class="dato' + (largo ? ' dato--largo' : '') + '"><span class="dato__e">' + K.esc(etiqueta) +
      '</span><span class="dato__v">' + K.esc(v) + '</span></div>');
  }

  /**
   * 5.1.1 · EL PLAZO SE VE, NO SE LEE. Dos fechas sueltas obligan a hacer la
   * cuenta de cabeza. La barra dice cuánto del plazo ya corrió y, si termina
   * en los próximos 30 días, lo avisa. Sale de las fechas que ya trae la
   * lista: no cuesta un viaje. Si faltan las fechas, se dice.
   */
  function plazo(f) {
    var ini = fechaDe(f.inicio), fin = fechaDe(f.fin);
    var caja = K.nodo('<div class="ct-plazo"></div>');
    if (!ini || !fin) {
      caja.appendChild(K.nodo('<p class="ct-plazo__t"><span>Plazo</span><b class="ct-plazo__falta">Sin fechas del acta de inicio</b></p>'));
      return caja;
    }
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var total = Math.max(1, fin - ini), corrido = Math.min(Math.max(hoy - ini, 0), total);
    var pct = Math.round(corrido * 100 / total);
    var dias = Math.round((fin - hoy) / 864e5);
    var nota = '';
    if (f.estado === 'ACTIVO' && dias >= 0 && dias <= 30) nota = '<em class="ct-plazo__pronto">Termina en ' + dias + (dias === 1 ? ' día' : ' días') + '</em>';
    caja.appendChild(K.nodo('<p class="ct-plazo__t"><span>Plazo</span><b>' + K.esc(f.inicio) + ' → ' + K.esc(f.fin) + '</b></p>'));
    caja.appendChild(K.nodo('<div class="ct-plazo__barra' + (nota ? ' ct-plazo__barra--pronto' : '') + '" role="img" aria-label="Plazo corrido ' + pct + ' por ciento">' +
      '<i style="width:' + pct + '%"></i></div>'));
    caja.appendChild(K.nodo('<p class="ct-plazo__pie"><span>' + pct + '% del plazo</span>' + nota + '</p>'));
    return caja;
  }

  function copiar(texto, aviso) {
    var hecho = function () { K.vibrar(8); K.aviso(aviso || 'Copiado', 'ok', 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(texto)).then(hecho, function () { K.aviso(String(texto), 'info', 5000); });
    } else {
      K.aviso(String(texto), 'info', 5000);
    }
  }

  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }

  /** SECRETARÍA DE HACIENDA → Secretaría de Hacienda (sin gritar y sin "De" con mayúscula). */
  function titulo(s) {
    return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
                    .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }

  window.CONTRATISTAS = {
    configurar: function (o) { C = o || {}; },
    recibir: recibir, cargar: cargar, todas: todas, olvidar: olvidar, ficha: ficha,
    lista: lista, detalle: detalle,
    /* para la ayuda (Insights) */
    _visibles: function () { return VISTA || filtradas(); },
    _filtros: textoFiltros,
    _ficha: function () { return FICHA; },
    _filtro: function () { return F; }
  };
}());
