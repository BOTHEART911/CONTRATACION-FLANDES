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
      busca: g.busca || ''
    };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, F); }

  /** El arranque entrega la lista hecha: se mete sin viajar. */
  function recibir(datos) {
    TODAS = K.piezas.listas.expandir(datos).map(pulir);
  }

  var TODAS = null;

  /* 1/0 → true/false y el texto de búsqueda armado una sola vez */
  function pulir(f) {
    f.adic = !!f.adic;
    f.cedido = !!f.cedido;
    f._t = K.norm([f.nombre, f.doc, f.contrato, f.sec, f.sup, f.tel, f.tipo].join(' '));
    return f;
  }

  function todas() { return TODAS || []; }

  /** Si la lista no llegó con el arranque (sesión recién abierta por otro
      camino), el arranque se repite: trae también caras y configuración. */
  function cargar(forzar) {
    if (TODAS && !forzar) return Promise.resolve(TODAS);
    if (forzar) {
      return K.pedir('contratistas').then(function (d) { recibir(d); return TODAS; });
    }
    return Promise.resolve(C.recargarTodo ? C.recargarTodo() : K.pedir('contratistas').then(recibir))
      .then(function () { return TODAS || []; });
  }

  function olvidar() { TODAS = null; K.guardar.borrar(FILTRO_K); F = leerFiltro(); }

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

    var barra = K.nodo('<div class="ct-barra-bus"></div>');
    var buscar = K.nodo(
      '<label class="ins-buscar">' + K.icono('buscar', 18) +
      '<input type="search" placeholder="Nombre, documento, contrato, secretaría o supervisor" ' +
      'aria-label="Buscar contratista" autocomplete="off" enterkeyhint="search"></label>'
    );
    var inp = buscar.querySelector('input');
    inp.value = F.busca;
    var recargar = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-recargar" aria-label="Traer la lista de nuevo">' +
      K.icono('recargar', 18) + '</button>');
    barra.appendChild(buscar);
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
      var filas = filtradas();
      VISTA = filas;
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'contrato' : 'contratos') +
        ' · <span>' + K.esc(textoFiltros()) + '</span>';
      rej.innerHTML = '';
      if (!filas.length) {
        rej.appendChild(K.nodo('<div class="kit-tarjeta ct-vacio"><p>No hay contratos con estos filtros.</p>' +
          '<button type="button" class="kit-btn kit-btn--plano">Quitar los filtros</button></div>'));
        rej.querySelector('button').addEventListener('click', function () {
          F = { estado: 'ACTIVO', extras: [], sec: '', sup: '', busca: '' };
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
      var filas = filtradas();
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
      '  <p class="ct-t__doc">CC/NIT ' + K.esc(f.doc) + '</p>' +
      '</div>'
    ));
    cab.appendChild(K.nodo('<span class="kit-pastilla ' + (f.estado === 'ACTIVO' ? 'kit-pastilla--ok' : 'kit-pastilla--aviso') +
      ' ct-t__estado" aria-pressed="true">' + K.esc(f.estado) + '</span>'));
    t.appendChild(cab);

    var marcas = [];
    if (f.tramo) marcas.push('<span class="ct-marca">' + K.esc(f.tramo) + '</span>');
    if (f.adic) marcas.push('<span class="ct-marca ct-marca--adic">ADICIONADO</span>');
    if (f.cedido) marcas.push('<span class="ct-marca ct-marca--ced">CEDIDO</span>');
    t.appendChild(K.nodo(
      '<dl class="ct-t__datos">' +
      '  <div><dt>Contrato</dt><dd>' + K.esc(f.contrato || '—') + (f.fecha ? ' <small>de ' + K.esc(f.fecha) + '</small>' : '') + '</dd></div>' +
      '  <div><dt>Secretaría</dt><dd>' + K.esc(titulo(f.sec) || '—') + '</dd></div>' +
      '  <div><dt>Plazo</dt><dd>' + K.esc(f.inicio || '¿?') + ' → ' + K.esc(f.fin || '¿?') + '</dd></div>' +
      '</dl>'
    ));
    if (f.sup && K.piezas.personas) {
      var s = K.nodo('<div class="ct-t__sup"></div>');
      s.appendChild(K.piezas.personas.chip(f.sup, 'Supervisor(a)', { tam: 26 }));
      t.appendChild(s);
    }
    if (marcas.length) t.appendChild(K.nodo('<div class="ct-t__marcas">' + marcas.join('') + '</div>'));

    t.appendChild(acciones(f, false));
    return t;
  }

  /** Detalles · WhatsApp · Drive · estado. Las mismas en tarjeta y ficha. */
  function acciones(f, enFicha) {
    var a = K.nodo('<div class="ct-acc"></div>');
    if (!enFicha) {
      var ver = K.nodo('<button type="button" class="kit-btn kit-btn--marca ct-acc__ver">' + K.icono('documento', 16) + ' Detalles</button>');
      ver.addEventListener('click', function () { K.vibrar(8); C.irA('contratista/' + encodeURIComponent(f.id)); });
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
    if (C.puede('editarContratista')) {
      var activo = f.estado === 'ACTIVO';
      var es = K.nodo('<button type="button" class="ins-accion ct-acc__estado' + (activo ? ' ct-acc__estado--apagar' : '') + '">' +
        K.icono(activo ? 'prohibido' : 'check', 16) + ' ' + (activo ? 'Inactivar' : 'Activar') + '</button>');
      es.addEventListener('click', function () { cambiarEstado(f, activo ? 'INACTIVO' : 'ACTIVO'); });
      a.appendChild(es);
    }
    return a;
  }

  /**
   * ACTIVO ↔ INACTIVO. Antes eran dos toques (la pastilla y "GUARDAR
   * ESTADO") y el cambio de la pastilla se veía aunque no se guardara:
   * quedaba en pantalla un INACTIVO que en la hoja seguía ACTIVO. Ahora es
   * un botón con confirmación, y la tarjeta cambia solo cuando el CORE
   * responde.
   */
  function cambiarEstado(f, nuevo) {
    var inactivar = nuevo === 'INACTIVO';
    K.piezas.confirmar.abrir({
      titulo: inactivar ? '¿Inactivar este contrato?' : '¿Activar este contrato?',
      lista: [['Contratista', nombre(f.nombre)], ['Contrato', f.contrato + ' · ' + titulo(f.sec)], ['Queda', nuevo]],
      nota: inactivar
        ? 'Un contrato INACTIVO no deja entrar al contratista con él a su app, y deja de contarse entre los activos.'
        : 'El contratista podrá volver a entrar a su app con este contrato.',
      si: inactivar ? 'Inactivar' : 'Activar', no: 'Cancelar'
    }).then(function (ok) {
      if (!ok) return;
      K.piezas.guardado.abrir({ titulo: inactivar ? 'Inactivando el contrato' : 'Activando el contrato', sub: 'No cierres esta ventana hasta que termine.' });
      K.pedir('contratistaEstado', { idContrato: f.id, estado: nuevo })
        .then(function (r) {
          var fila = pulir(K.piezas.listas.expandir({ campos: r.campos, filas: [r.fila] })[0]);
          for (var i = 0; i < TODAS.length; i++) if (TODAS[i].id === fila.id) { TODAS[i] = fila; break; }
          K.piezas.guardado.listo({ sub: 'El contrato quedó ' + nuevo + '.' });
          /* se repinta la vista donde se está, con el filtro puesto */
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        })
        ['catch'](function (e) {
          K.piezas.guardado.fallo();
          K.aviso(e && e.message ? e.message : 'No se pudo cambiar el estado.', 'malo', 7000);
        });
    });
  }

  /* ══════════════ la ficha ══════════════ */

  var FICHA = null;            /* la ficha abierta, para Insights */

  function detalle(sub) {
    var id = decodeURIComponent(String(sub || ''));
    var caja = K.nodo('<div class="kit-ancho vista ct-ficha"></div>');
    C.app.appendChild(caja);
    FICHA = null;

    var p = K.pedir('contratistaDetalle', { idContrato: id });
    K.piezas.esqueletos.mientras(caja, p, { forma: 'texto', cuantos: 8 })
      .then(function (d) { FICHA = d; pintarFicha(caja, d); })
      ['catch'](function (e) {
        caja.appendChild(C.errorCaja(e, function () { C.app.innerHTML = ''; detalle(sub); }));
      });
  }

  function pintarFicha(caja, d) {
    caja.innerHTML = '';
    var c = d.contrato || {}, p = d.datos || {};
    var f = pulir(K.piezas.listas.expandir({ campos: d.campos, filas: [d.fila] })[0]);

    var cab = K.nodo('<section class="kit-tarjeta ct-ficha__cab"></section>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(f.nombre, { tam: 76, foto: f.img || '' }));
    var marcas = '<span class="kit-pastilla ' + (f.estado === 'ACTIVO' ? 'kit-pastilla--ok' : 'kit-pastilla--aviso') + '" aria-pressed="true">' + K.esc(f.estado) + '</span>';
    if (f.tramo) marcas += '<span class="ct-marca">' + K.esc(f.tramo) + '</span>';
    if (f.adic) marcas += '<span class="ct-marca ct-marca--adic">ADICIONADO</span>';
    if (f.cedido) marcas += '<span class="ct-marca ct-marca--ced">CEDIDO</span>';
    cab.appendChild(K.nodo(
      '<div class="ct-ficha__quien">' +
      '  <h2>' + K.esc(nombre(f.nombre)) + '</h2>' +
      '  <p>CC/NIT ' + K.esc(f.doc) + ' · Contrato ' + K.esc(f.contrato) + '</p>' +
      '  <div class="ct-t__marcas">' + marcas + '</div>' +
      '</div>'
    ));
    cab.appendChild(acciones(f, true));
    caja.appendChild(cab);

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
      dato('Fecha de inicio', c.fechaInicio), dato('Fecha de terminación', c.fechaTermino), dato('Tiempo de ejecución', c.ejecucion)
    ]));
    rej.appendChild(grupo('La plata', [
      dato('Valor inicial', plata(c.valorInicial)), dato('1ª adición', plata(c.adicion1)),
      dato('2ª adición', plata(c.adicion2)), dato('Valor final', plata(c.valorFinal)),
      dato('Informes del primario', c.totalInformesPrimario), dato('Informes de la 1ª adición', c.totalInformesAdicion1)
    ]));
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

  function dato(etiqueta, valor, largo) {
    var v = String(valor === null || valor === undefined ? '' : valor).trim();
    if (!v) return null;
    return K.nodo('<div class="dato' + (largo ? ' dato--largo' : '') + '"><span class="dato__e">' + K.esc(etiqueta) +
      '</span><span class="dato__v">' + K.esc(v) + '</span></div>');
  }

  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }

  /** SECRETARÍA DE HACIENDA → Secretaría de Hacienda (sin gritar y sin "De" con mayúscula). */
  function titulo(s) {
    return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
                    .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }

  window.CONTRATISTAS = {
    configurar: function (o) { C = o || {}; },
    recibir: recibir, cargar: cargar, todas: todas, olvidar: olvidar,
    lista: lista, detalle: detalle,
    /* para la ayuda (Insights) */
    _visibles: function () { return VISTA || filtradas(); },
    _filtros: textoFiltros,
    _ficha: function () { return FICHA; },
    _filtro: function () { return F; }
  };
}());
