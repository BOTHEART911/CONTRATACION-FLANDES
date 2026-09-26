/* ============================================================
   CONTRATACION-FLANDES · SOLICITUDES DE LOS CONTRATISTAS (26/09/2026)

   La bandeja donde la oficina RESPONDE lo que piden los contratistas:
     · Desde la ENTRADA de la app (aún sin acceso): contrato INACTIVO que
       ya aceptó uno nuevo en el SECOP II, o persona sin registro que ya
       aceptó su primer contrato. Traen celular (obligatorio): la respuesta
       le llega por WhatsApp.
     · Desde la APP CONTRATISTA: adición, cesión, modificación o
       corrección, suspensión.

   Qué se puede hacer aquí (como el soporte de ADMIN, SIN estrellas):
     RESPONDER      la respuesta le llega al contratista y queda en su vista.
     GESTIÓN        lo que la oficina HIZO (sobre una solicitud, o suelta a
                    un contrato con "Registrar gestión"). El contratista la
                    ve en su panel SOLICITUD CONTRATACIÓN.
     BORRAR         las solicitudes basura (quedan marcadas, no se ven).
     AGREGAR        a quien pidió acceso y todavía no tiene contrato activo:
                    abre AGREGAR CONTRATISTA con el documento ya validado.

   Una sola llamada trae la bandeja (patrón de carga única): los filtros y
   el buscador trabajan en el teléfono. El número del inicio llega con el
   arranque (sin viaje extra).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var FILTRO_K = 'solicitudes.filtro.v1';

  var DATA = null;
  var HORA = null;
  var CARGANDO = null;
  var F = leerFiltro();

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    return { estado: g.estado === undefined ? 'PENDIENTE' : g.estado, origen: g.origen || '', busca: '' };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, { estado: F.estado, origen: F.origen }); }

  function recibir(d) {
    DATA = d || { lista: [], pendientes: 0 };
    DATA.lista = (DATA.lista || []).map(preparar);
    HORA = new Date();
    if (C.alCambiar) C.alCambiar(DATA.pendientes || 0);
  }
  function preparar(r) {
    r._t = K.norm([r.nombre, r.documento, r.contrato, r.secretaria, r.detalle, r.id, r.tipoTexto, r.respuesta].join(' '));
    r._iso = isoDe(r.fecha);
    return r;
  }
  function isoDe(f) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(f || ''));
    return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
  }

  function cargar(fresco) {
    if (DATA && !fresco) return Promise.resolve(DATA);
    if (CARGANDO && !fresco) return CARGANDO;
    CARGANDO = O.leer('solicitudes').then(function (d) { CARGANDO = null; recibir(d); return DATA; },
      function (e) { CARGANDO = null; throw e; });
    return CARGANDO;
  }

  function coincide(t, q) {
    q = K.norm(q || '');
    if (!q) return true;
    var p = q.split(' ').filter(Boolean);
    for (var i = 0; i < p.length; i++) if (t.indexOf(p[i]) < 0) return false;
    return true;
  }

  function esAcceso(r) { return r.origen === 'LOGIN'; }
  function grupoEstado(r) {
    if (r.tipo === 'GESTION') return 'GESTION';
    return r.estado === 'RESPONDIDA' ? 'RESPONDIDA' : 'PENDIENTE';
  }

  function contratistas() { return window.CONTRATISTAS ? window.CONTRATISTAS.todas() : []; }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct of sb"></div>');
    C.app.appendChild(caja);
    O.cabecera(caja, 'sobre', 'SOLICITUDES',
      'Lo que piden los contratistas: acceso por contrato nuevo (desde la entrada de la app), adición, cesión, modificación o corrección y suspensión. Respóndelas aquí y registra las gestiones que hagas: el contratista lo ve en su app.');

    var puedeEscribir = true;
    var zBot = K.nodo('<div class="sb-acciones"></div>');
    var bGest = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('check', 16) + ' Registrar gestión</button>');
    bGest.addEventListener('click', function () { gestionSuelta(); });
    zBot.appendChild(bGest);
    caja.appendChild(zBot);

    var b = O.barra({
      placeholder: 'Nombre, documento, contrato o texto', valor: F.busca,
      alBuscar: function (q) { F.busca = q; pintar(); },
      alRefrescar: function () { return cargar(true).then(function () { pintar(); }); }
    });
    caja.appendChild(b.caja);
    var zA = K.nodo('<div></div>'), zB = K.nodo('<div></div>');
    caja.appendChild(zA); caja.appendChild(zB);
    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var rej = K.nodo('<div class="kit-rejilla ct-lista"></div>');
    caja.appendChild(rej);
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-mas" hidden>Ver más</button>');
    caja.appendChild(mas);
    var VER = 40;
    mas.addEventListener('click', function () { VER += 40; pintar(); });

    var pA = K.piezas.pastillas.montar(zA, {
      etiqueta: 'Estado', valor: F.estado,
      opciones: [{ valor: 'PENDIENTE', texto: 'Por responder', tono: 'aviso' }, { valor: 'RESPONDIDA', texto: 'Respondidas', tono: 'ok' },
                 { valor: 'GESTION', texto: 'Gestiones sueltas' }, { valor: '', texto: 'Todas' }],
      alCambiar: function (v) { F.estado = v; guardarFiltro(); pintar(); }
    });
    var pB = K.piezas.pastillas.montar(zB, {
      etiqueta: 'De dónde', valor: F.origen,
      opciones: [{ valor: '', texto: 'Todas' }, { valor: 'LOGIN', texto: 'Acceso (desde la entrada)' }, { valor: 'APP', texto: 'Desde la app' }],
      alCambiar: function (v) { F.origen = v; guardarFiltro(); pintar(); }
    });

    function pasa(r, sin) {
      sin = sin || {};
      if (!sin.estado && F.estado && grupoEstado(r) !== F.estado) return false;
      if (!sin.origen && F.origen && r.origen !== F.origen) return false;
      return coincide(r._t, F.busca);
    }

    function pintar() {
      rej.innerHTML = '';
      mas.hidden = true;
      var L = DATA ? DATA.lista : [];
      puedeEscribir = !!(DATA && DATA.puedeResponder);
      bGest.hidden = !puedeEscribir;
      var bE = L.filter(function (r) { return pasa(r, { estado: true }); });
      pA.conteos({ PENDIENTE: bE.filter(function (r) { return grupoEstado(r) === 'PENDIENTE'; }).length,
                   RESPONDIDA: bE.filter(function (r) { return grupoEstado(r) === 'RESPONDIDA'; }).length,
                   GESTION: bE.filter(function (r) { return grupoEstado(r) === 'GESTION'; }).length, '': bE.length });
      O.marcar(zA, F.estado);
      var bO = L.filter(function (r) { return pasa(r, { origen: true }); });
      pB.conteos({ '': bO.length, LOGIN: bO.filter(esAcceso).length, APP: bO.filter(function (r) { return r.origen === 'APP'; }).length });
      O.marcar(zB, F.origen);

      var filas = L.filter(function (r) { return pasa(r); });
      /* por responder: la más vieja primero (la que más espera); lo demás, lo más nuevo arriba */
      if (F.estado === 'PENDIENTE') filas = filas.slice().reverse();
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'solicitud' : 'solicitudes') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(O.horaCorta(HORA)) + '</span>' : '');
      if (!L.length) {
        rej.appendChild(K.nodo('<div class="kit-tarjeta ct-vacio">' + K.icono('sobre', 30) +
          '<p><b>Todavía no hay solicitudes.</b><br>Cuando un contratista pida algo, llega aquí y al grupo de Contratación.</p></div>'));
        return;
      }
      if (!filas.length) {
        rej.appendChild(O.vacio(F.estado === 'PENDIENTE' ? 'No hay solicitudes por responder. ¡Al día!' : 'No hay solicitudes con estos filtros.',
          function () { F.estado = ''; F.origen = ''; F.busca = ''; b.inp.value = ''; pA.poner(''); pB.poner(''); guardarFiltro(); pintar(); }));
      }
      filas.slice(0, VER).forEach(function (r) { rej.appendChild(tarjeta(r)); });
      if (filas.length > VER) { mas.hidden = false; mas.textContent = 'Ver ' + Math.min(40, filas.length - VER) + ' más'; }
    }

    function tarjeta(r) {
      var g = grupoEstado(r);
      var t = K.nodo('<article class="kit-tarjeta ct-t of-t sb-t sb-t--' + g.toLowerCase() + '"></article>');
      var cab = K.nodo('<div class="ct-t__cab"></div>');
      if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(r.nombre, { tam: 44, foto: r.img || '' }));
      cab.appendChild(K.nodo('<div class="ct-t__quien"><h3 class="ct-t__n">' + K.esc(O.nombre(r.nombre) || 'Sin nombre') + '</h3>' +
        '<p class="ct-t__doc">' + K.esc(r.id) + ' · CC ' + K.esc(r.documento || '—') + '</p></div>'));
      var est = g === 'GESTION' ? ['GESTIÓN', 'sb-est--gest'] : (g === 'RESPONDIDA' ? ['RESPONDIDA', 'of-estado--ok'] : ['POR RESPONDER', 'of-estado--abierto']);
      cab.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado ' + est[1] + '">' + est[0] + '</span>'));
      t.appendChild(cab);

      var marcas = K.nodo('<div class="ct-t__marcas"></div>');
      marcas.appendChild(K.nodo('<span class="ct-marca sb-tipo">' + K.icono(esAcceso(r) ? 'llave' : (r.tipo === 'GESTION' ? 'check' : 'documento'), 11) + ' ' + K.esc(r.tipoTexto || r.tipo) + '</span>'));
      marcas.appendChild(K.nodo('<span class="ct-marca">' + K.icono('reloj', 11) + ' ' + K.esc(O.cuando(r._iso) || r.fecha) + '</span>'));
      if (esAcceso(r)) marcas.appendChild(K.nodo('<span class="ct-marca sb-marca--entrada">Desde la entrada · sin acceso</span>'));
      if (esAcceso(r) && r.activoAhora) marcas.appendChild(K.nodo('<span class="ct-marca ct-marca--adic">' + K.icono('check', 11) + ' Ya tiene contrato ACTIVO</span>'));
      t.appendChild(marcas);

      var datos = [];
      if (r.contrato) datos.push('Contrato ' + r.contrato);
      if (r.secretaria) datos.push(O.titulo(r.secretaria));
      if (datos.length) t.appendChild(K.nodo('<p class="of-req__pie">' + K.esc(datos.join(' · ')) + '</p>'));
      if (r.telefono) {
        var wa = K.nodo('<p class="of-req__pie sb-contacto">' + K.icono('whatsapp', 12) + ' <a target="_blank" rel="noopener"></a>' +
          (r.correo ? ' · ' + K.icono('sobre', 12) + ' ' + K.esc(r.correo) : '') + '</p>');
        var a = wa.querySelector('a');
        a.href = 'https://wa.me/57' + String(r.telefono).replace(/\D/g, '').slice(-10);
        a.textContent = String(r.telefono).replace(/\D/g, '').slice(-10).replace(/(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
        t.appendChild(wa);
      }
      var txt = r.detalle || (r.tipo === 'NUEVO CONTRATO' ? 'Confirmó que ya aceptó un NUEVO contrato en el SECOP II y pide el acceso.'
        : (r.tipo === 'PRIMER CONTRATO' ? 'Confirmó que ya aceptó su contrato en el SECOP II y pide el acceso.' : ''));
      if (txt) { var p = K.nodo('<p class="of-req__txt"></p>'); p.textContent = txt; t.appendChild(p); }

      if (r.adjuntos && r.adjuntos.length) {
        var ad = K.nodo('<div class="sb-docs"></div>');
        r.adjuntos.forEach(function (u, i) {
          var bb = K.nodo('<button type="button" class="kit-btn kit-btn--plano sb-doc">' + K.icono('clip', 14) + ' Soporte ' + (i + 1) + '</button>');
          bb.addEventListener('click', function () {
            if (K.piezas.visor) K.piezas.visor.abrir(r.adjuntos.map(function (v, j) { return { url: v, titulo: r.id + ' · soporte ' + (j + 1) }; }), { indice: i });
            else window.open(u, '_blank', 'noopener');
          });
          ad.appendChild(bb);
        });
        t.appendChild(ad);
      }

      if (r.respuesta) {
        var rs = K.nodo('<div class="sb-resp"><p class="sb-resp__t">' + K.icono('responder', 13) + ' Respuesta · ' +
          K.esc(O.nombre(r.respondio)) + (r.fechaRespuesta ? ' · ' + K.esc(String(r.fechaRespuesta).slice(0, 16)) : '') + '</p><p class="sb-resp__x"></p></div>');
        rs.querySelector('.sb-resp__x').textContent = r.respuesta;
        t.appendChild(rs);
      }
      if (r.gestiones && r.gestiones.length) {
        var gl = K.nodo('<ol class="sb-gest" aria-label="Gestiones"></ol>');
        r.gestiones.forEach(function (it) {
          var li = K.nodo('<li><span class="sb-gest__f"></span><p></p></li>');
          li.querySelector('.sb-gest__f').textContent = String(it.f || '').slice(0, 16) + ' · ' + O.nombre(it.por);
          li.querySelector('p').textContent = it.t || '';
          gl.appendChild(li);
        });
        t.appendChild(gl);
      }
      if (r.aviso && /fallo|SIN CANAL/i.test(r.aviso)) {
        t.appendChild(K.nodo('<p class="of-req__pie of-req__malo">' + K.icono('aviso', 12) + ' Aviso: ' + K.esc(r.aviso) + '</p>'));
      }

      if (puedeEscribir) {
        var acc = K.nodo('<div class="ct-acc"></div>');
        if (r.tipo !== 'GESTION') {
          var bR = K.nodo('<button type="button" class="kit-btn ' + (g === 'PENDIENTE' ? 'kit-btn--marca' : 'kit-btn--plano') + '">' +
            K.icono('responder', 15) + (g === 'PENDIENTE' ? ' Responder' : ' Corregir respuesta') + '</button>');
          bR.addEventListener('click', function () { responder(r, g !== 'PENDIENTE'); });
          acc.appendChild(bR);
        }
        var bG = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('check', 15) + ' Gestión</button>');
        bG.addEventListener('click', function () { gestion(r); });
        acc.appendChild(bG);
        if (esAcceso(r) && !r.activoAhora && C.puede && C.puede('agregarContratista')) {
          var bA = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('persona', 15) + ' Agregar contratista</button>');
          bA.addEventListener('click', function () { C.irA('agregar/' + encodeURIComponent(r.documento)); });
          acc.appendChild(bA);
        }
        var bB = K.nodo('<button type="button" class="kit-btn kit-btn--plano kit-btn--malo sb-borrar" aria-label="Borrar la solicitud ' + K.esc(r.id) + '">' + K.icono('basura', 15) + '</button>');
        bB.addEventListener('click', function () { borrar(r); });
        acc.appendChild(bB);
        t.appendChild(acc);
      }
      return t;
    }

    K.piezas.esqueletos.mientras(rej, cargar(false), { forma: 'tarjetas', cuantos: 4 })
      .then(function () { pintar(); })
      ['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(caja);
    vista._repintar = pintar;
  }

  /* ══════════════ acciones ══════════════ */

  function actualizar(item, pendientes) {
    if (!DATA) return;
    item = preparar(item);
    var ya = false;
    DATA.lista.forEach(function (x, i) { if (x.id === item.id) { item.img = item.img || x.img; item.activoAhora = x.activoAhora; DATA.lista[i] = item; ya = true; } });
    if (!ya) DATA.lista.unshift(item);
    if (typeof pendientes === 'number') DATA.pendientes = pendientes;
    if (C.alCambiar) C.alCambiar(DATA.pendientes || 0);
    if (vista._repintar) vista._repintar();
  }

  function editor(o) {
    var TOPE = 2000;
    var cuerpo = K.nodo('<div class="of-redactar"></div>');
    if (o.cabeza) cuerpo.appendChild(o.cabeza);
    var ta = K.nodo('<textarea class="rv-editor__ta of-ta" rows="6" maxlength="' + TOPE + '"></textarea>');
    ta.placeholder = o.marcador || '';
    ta.value = o.valor || '';
    cuerpo.appendChild(ta);
    var cuenta = K.nodo('<p class="of-cuenta">' + ta.value.length + ' / ' + TOPE + '</p>');
    cuerpo.appendChild(cuenta);
    ta.addEventListener('input', function () { cuenta.textContent = ta.value.length + ' / ' + TOPE; });
    if (o.rapidos && o.rapidos.length) {
      cuerpo.appendChild(K.nodo('<p class="of-rapidos__t">Textos rápidos · toca uno para usarlo</p>'));
      var zr = K.nodo('<div class="of-rapidos"></div>');
      o.rapidos.forEach(function (tx) {
        var bb = K.nodo('<button type="button" class="of-rapido"></button>');
        bb.textContent = tx;
        bb.addEventListener('click', function () { ta.value = ta.value.trim() ? (ta.value.trim() + '\n' + tx) : tx; ta.dispatchEvent(new Event('input')); ta.focus(); });
        zr.appendChild(bb);
      });
      cuerpo.appendChild(zr);
    }
    if (o.nota) cuerpo.appendChild(K.nodo('<p class="formulario__nota">' + K.icono('campana', 13) + ' ' + o.nota + '</p>'));
    var m = O.modal({
      titulo: o.titulo, cuerpo: cuerpo, ancha: true,
      botones: [
        { texto: 'Cancelar', al: function () { m.cerrar(); } },
        { texto: o.si || 'Guardar', icono: o.icono || 'enviar', marca: true, al: function () {
            var texto = ta.value.replace(/\r/g, '').trim();
            if (texto.length < 5) { K.aviso('Escribe un poco más (mínimo 5 caracteres).', 'aviso', 4000); ta.focus(); return; }
            if (K.ocupado) return;
            K.ocupado = true;
            m.botones.forEach(function (x) { x.disabled = true; });
            o.enviar(texto).then(function () { K.ocupado = false; m.cerrar(); },
              function (e) { K.ocupado = false; m.botones.forEach(function (x) { x.disabled = false; }); K.aviso((e && e.message) || 'No se pudo guardar.', 'malo', 9000); });
          } }
      ]
    });
    setTimeout(function () { ta.focus(); }, 120);
    return m;
  }

  function resumenDe(r) {
    var c = K.nodo('<div class="sb-cita"><p class="sb-cita__t"></p><p class="sb-cita__x"></p></div>');
    c.querySelector('.sb-cita__t').textContent = r.id + ' · ' + O.nombre(r.nombre) + ' · ' + (r.tipoTexto || r.tipo);
    c.querySelector('.sb-cita__x').textContent = r.detalle || (esAcceso(r) ? 'Pide acceso: ya aceptó el contrato en el SECOP II.' : '');
    return c;
  }

  var RAPIDOS_ACCESO = [
    'Ya quedaste registrado con tu contrato nuevo. Entra a la App Contratista con tu documento; si no recuerdas la contraseña, toca "Olvidé mi contraseña".',
    'Todavía no vemos tu contrato aceptado en el SECOP II. Cuando quede aceptado, vuelve a escribirnos desde la entrada de la app.',
    'Acércate a la oficina de Contratación con tu documento de identidad para completar tu registro.'
  ];
  var RAPIDOS_APP = [
    'Recibimos tu solicitud y ya está en trámite. Te avisaremos cuando quede lista.',
    'Tu trámite quedó registrado en la app: revisa DATOS DEL CONTRATO.',
    'Necesitamos que te acerques a la oficina de Contratación para firmar el documento.'
  ];

  function responder(r, otraVez) {
    editor({
      titulo: (otraVez ? 'Corregir la respuesta · ' : 'Responder · ') + r.id,
      cabeza: resumenDe(r),
      valor: otraVez ? r.respuesta : '',
      marcador: 'Escribe la respuesta para el contratista…',
      rapidos: esAcceso(r) ? RAPIDOS_ACCESO : RAPIDOS_APP,
      nota: esAcceso(r) ? 'Le llega por <b>WhatsApp</b> al celular que dejó (todavía no tiene la app). Queda con tu nombre y sin evaluación.'
                        : 'Le llega como notificación en la app CONTRATISTA y por WhatsApp, y queda en SOLICITUD CONTRATACIÓN.',
      si: otraVez ? 'Guardar y avisar' : 'Responder', icono: 'responder',
      enviar: function (texto) {
        return K.piezas.guardado.mientras(K.pedir('solicitudResponder', { id: r.id, respuesta: texto, otraVez: !!otraVez }, { ms: 90000 }), {
          titulo: 'Enviando la respuesta', sub: 'No cierres la app.', pasos: ['Guardando…', 'Avisando al contratista…', 'Listo'],
          listo: { titulo: 'Respuesta enviada', paso: 'Guardada y avisada' }
        }).then(function (x) {
          actualizar(x.item, x.pendientes);
          if (x.aviso && x.aviso.ok === false) K.aviso('Quedó guardada, pero el aviso no salió: ' + (x.aviso.error || 'sin detalle') + '. Escríbele por WhatsApp desde la tarjeta.', 'aviso', 10000);
        });
      }
    });
  }

  function gestion(r) {
    editor({
      titulo: 'Gestión · ' + r.id,
      cabeza: resumenDe(r),
      marcador: 'Qué se hizo: se atendió en la oficina, se envió la minuta, se tramitó la adición…',
      nota: 'El contratista la ve en su panel SOLICITUD CONTRATACIÓN y le llega el aviso.',
      si: 'Registrar', icono: 'check',
      enviar: function (texto) {
        return K.piezas.guardado.mientras(K.pedir('solicitudGestion', { id: r.id, texto: texto }, { ms: 90000 }), {
          titulo: 'Registrando la gestión', sub: 'No cierres la app.', pasos: ['Guardando…', 'Avisando al contratista…', 'Listo'],
          listo: { titulo: 'Gestión registrada', paso: 'Guardada y avisada' }
        }).then(function (x) { actualizar(x.item, x.pendientes); });
      }
    });
  }

  /* Gestión suelta: a un contrato, sin que haya solicitud. */
  function gestionSuelta() {
    var elegido = null;
    var cab = K.nodo('<div class="sb-elige"><label class="campo"><span>Contratista</span>' +
      '<input type="search" autocomplete="off" placeholder="Busca por nombre, documento o contrato"></label><div class="sb-elige__lista" role="listbox"></div></div>');
    var inp = cab.querySelector('input'), lista = cab.querySelector('.sb-elige__lista');
    function pintarLista() {
      lista.innerHTML = '';
      var q = inp.value.trim();
      if (elegido) {
        var ch = K.nodo('<div class="sb-elegido"></div>');
        if (K.piezas.personas) ch.appendChild(K.piezas.personas.avatar(elegido.nombre, { tam: 30, foto: elegido.img || '' }));
        ch.appendChild(K.nodo('<span><b>' + K.esc(O.nombre(elegido.nombre)) + '</b><small>Contrato ' + K.esc(elegido.contrato || '—') + ' · ' + K.esc(O.titulo(elegido.sec)) + '</small></span>'));
        var x = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Cambiar</button>');
        x.addEventListener('click', function () { elegido = null; inp.value = ''; inp.hidden = false; pintarLista(); inp.focus(); });
        ch.appendChild(x);
        lista.appendChild(ch);
        return;
      }
      if (q.length < 2) return;
      var L = contratistas().filter(function (f) { return coincide(f._t || K.norm([f.nombre, f.doc, f.contrato, f.sec].join(' ')), q); })
        .sort(function (a, b) { return (a.estado === 'ACTIVO' ? 0 : 1) - (b.estado === 'ACTIVO' ? 0 : 1); }).slice(0, 8);
      if (!L.length) { lista.appendChild(K.nodo('<p class="seg-nada">No hay contratistas con ese dato.</p>')); return; }
      L.forEach(function (f) {
        var bb = K.nodo('<button type="button" class="sb-op" role="option"><b></b><small></small></button>');
        bb.querySelector('b').textContent = O.nombre(f.nombre);
        bb.querySelector('small').textContent = 'Contrato ' + (f.contrato || '—') + ' · ' + O.titulo(f.sec) + (f.estado !== 'ACTIVO' ? ' · ' + f.estado : '');
        bb.addEventListener('click', function () { elegido = f; inp.hidden = true; pintarLista(); });
        lista.appendChild(bb);
      });
    }
    inp.addEventListener('input', K.debounce ? K.debounce(pintarLista, 120) : pintarLista);
    var cargaLista = window.CONTRATISTAS && window.CONTRATISTAS.cargar ? window.CONTRATISTAS.cargar() : Promise.resolve();
    cargaLista.then(pintarLista, function () {});
    editor({
      titulo: 'Registrar gestión',
      cabeza: cab,
      marcador: 'Qué se hizo por este contrato…',
      nota: 'Queda en el panel SOLICITUD CONTRATACIÓN del contratista y le llega el aviso.',
      si: 'Registrar', icono: 'check',
      enviar: function (texto) {
        if (!elegido) { inp.focus(); return Promise.reject(new Error('Escoge el contratista.')); }
        return K.piezas.guardado.mientras(K.pedir('solicitudGestion', { idContrato: elegido.id, texto: texto }, { ms: 90000 }), {
          titulo: 'Registrando la gestión', sub: 'No cierres la app.', pasos: ['Guardando…', 'Avisando al contratista…', 'Listo'],
          listo: { titulo: 'Gestión registrada', paso: 'Guardada y avisada' }
        }).then(function (x) { x.item.img = elegido.img || ''; actualizar(x.item, x.pendientes); });
      }
    });
    setTimeout(function () { inp.focus(); }, 140);
  }

  function borrar(r) {
    K.piezas.confirmar.preguntar({
      titulo: 'Borrar la solicitud ' + r.id,
      texto: 'Úsalo solo con solicitudes basura (datos falsos, repetidas, pruebas). Deja de verse aquí y en la app del contratista; en la hoja queda marcada BORRADA con tu nombre.',
      si: 'Borrar', no: 'Cancelar', peligro: true
    }).then(function (ok) {
      if (!ok || K.ocupado) return;
      K.ocupado = true;
      K.pedir('solicitudBorrar', { id: r.id }, { ms: 60000 }).then(function (x) {
        K.ocupado = false;
        DATA.lista = DATA.lista.filter(function (y) { return y.id !== r.id; });
        DATA.pendientes = x.pendientes;
        if (C.alCambiar) C.alCambiar(DATA.pendientes || 0);
        K.aviso('Solicitud ' + r.id + ' borrada.', 'ok', 3000);
        if (vista._repintar) vista._repintar();
      }, function (e) { K.ocupado = false; K.aviso((e && e.message) || 'No se pudo borrar.', 'malo', 8000); });
    });
  }

  window.SOLICITUDES = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    olvidar: function () { DATA = null; K.guardar.borrar(FILTRO_K); F = leerFiltro(); },
    _datos: function () { return DATA; },
    _grupo: grupoEstado
  };
}());
