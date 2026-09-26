/* ============================================================
   CONTRATACION-FLANDES · GESTIÓN DE CONTRATOS
   Ecosistema Flandes · Fase 5, entrega 5.2

   Cuatro vistas, cada una con su ruta (así el botón atrás del banner y el
   del teléfono hacen lo que se espera):
     #/agregar              registrar un contrato
     #/adicion/<id>         1ª o 2ª adición (o corregir la última)
     #/cesion/<id>          ceder el contrato a otra persona
     #/suspension/<id>      registrar o cambiar la suspensión

   10.2 · ARCHIVO COMPARTIDO: el mismo en CONTRATACION-FLANDES y en
   ADMIN-FLANDES (ADMIN llega a las mismas funciones del CORE por sus
   rutas con su nombre). La CESIÓN ahora crea la fila del cesionario y
   parte plazo, valor e informes entre los dos.

   La app vieja (referencia, no copia) tenía todo en formularios de 20
   campos que se enviaban para descubrir el error al final. Aquí:
     · el documento se valida ANTES de mostrar el resto del formulario;
     · cada campo dice lo que falta mientras se escribe (CDP de 10 dígitos
       con el año ya puesto, valor en letras en vivo, obligaciones contadas);
     · el servidor decide si una adición es la 1ª o la 2ª y vuelve a validar
       TODO: el front solo avisa antes.
     · antes de guardar sale el resumen; al guardar, el cohete.

   Lo que devuelve el CORE al guardar trae la lista de contratistas fresca:
   la vista CONTRATISTAS queda al día sin otro viaje.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};                       /* lo que da app.js: app, puede, irA, errorCaja */
  var OPCIONES = null;              /* secretarías, supervisores y tipos */
  var ULTIMA = null;                /* lo que está en pantalla, para Insights */

  function configurar(o) { C = o || {}; }

  /* ══════════════ piezas de formulario ══════════════ */

  function ayuda(c, texto) {
    if (texto) c.appendChild(K.nodo('<small class="campo__ayuda">' + texto + '</small>'));
  }

  function campoTexto(donde, D, clave, titulo, texto, o) {
    o = o || {};
    var c = K.nodo('<label class="campo"><span>' + K.esc(titulo) + '</span></label>');
    var inp = o.area
      ? K.nodo('<textarea rows="' + (o.filas || 3) + '"></textarea>')
      : K.nodo('<input type="text" autocomplete="off"' + (o.numerico ? ' inputmode="numeric"' : '') + '>');
    if (o.marcador) inp.placeholder = o.marcador;
    inp.value = D[clave] || '';
    c.appendChild(inp);
    ayuda(c, texto);
    inp.addEventListener('input', function () {
      if (o.numerico) inp.value = inp.value.replace(/\D/g, '').slice(0, o.numerico);
      if (o.mayus) {
        var p = inp.selectionStart;
        inp.value = inp.value.toUpperCase();
        try { inp.setSelectionRange(p, p); } catch (e) {}
      }
      D[clave] = inp.value.trim();
      if (o.alCambiar) o.alCambiar(D[clave]);
    });
    donde.appendChild(c);
    return inp;
  }

  function campoLista(donde, D, clave, titulo, texto, opciones, o) {
    o = o || {};
    var c = K.nodo('<label class="campo"><span>' + K.esc(titulo) + '</span></label>');
    var sel = K.nodo('<select><option value="">Selecciona</option></select>');
    opciones.forEach(function (op) {
      var x = document.createElement('option');
      x.value = op.valor;
      x.textContent = op.texto;
      if (op.bloqueada) { x.disabled = true; x.textContent += ' — ya tiene contrato activo aquí'; }
      if (op.valor === D[clave]) x.selected = true;
      sel.appendChild(x);
    });
    c.appendChild(sel);
    ayuda(c, texto);
    sel.addEventListener('change', function () { D[clave] = sel.value; if (o.alCambiar) o.alCambiar(sel.value); });
    donde.appendChild(c);
    return sel;
  }

  function campoFecha(donde, D, clave, titulo, texto, o) {
    o = o || {};
    var c = K.nodo('<label class="campo"><span>' + K.esc(titulo) + '</span></label>');
    var inp = K.nodo('<input type="text" readonly data-kit-fecha placeholder="dd/mm/aaaa" data-titulo="' + K.esc(titulo) + '"' +
      (o.anioFijo ? ' data-anio-fijo="' + o.anioFijo + '"' : '') +
      (o.desde ? ' data-desde="' + o.desde + '"' : '') + '>');
    inp.value = D[clave] || '';
    c.appendChild(inp);
    ayuda(c, texto);
    inp.addEventListener('change', function () {
      /* la rueda deja ISO; a la hoja va dd/mm/aaaa, como el resto de CONTRATISTAS */
      D[clave] = K.fecha(inp.value.trim());
      if (o.alCambiar) o.alCambiar(D[clave]);
    });
    donde.appendChild(c);
    return inp;
  }

  /** Pesos: se escribe en números y se ve con puntos; debajo, en letras. */
  function campoPesos(donde, D, clave, titulo, texto, o) {
    o = o || {};
    var c = K.nodo('<label class="campo"><span>' + K.esc(titulo) + '</span></label>');
    var caja = K.nodo('<div class="cta-pesos"><span class="cta-pesos__signo" aria-hidden="true">$</span></div>');
    var inp = K.nodo('<input type="tel" inputmode="numeric" class="cta-inp cta-inp--pesos" autocomplete="off">');
    if (D[clave]) inp.value = K.numero(D[clave]);
    caja.appendChild(inp);
    c.appendChild(caja);
    var eco = K.nodo('<p class="gs-letras" aria-live="polite"></p>');
    c.appendChild(eco);
    ayuda(c, texto);
    function pintar() {
      var n = K.aNumero(D[clave]);
      eco.textContent = n ? letras(n) : '';
      if (o.alCambiar) o.alCambiar(n);
    }
    K.pesosEnVivo(inp, function (limpio) { D[clave] = limpio; pintar(); });
    pintar();
    donde.appendChild(c);
    return inp;
  }

  /**
   * CDP: 10 dígitos que empiezan por el año de la vigencia. El año se
   * pone solo (como el RP en CONTRATISTA) y se escribe el final: 526 queda
   * 2026000526. Si se pega el número completo, también sirve.
   */
  function campoCodigo(donde, D, clave, titulo, texto, anio) {
    anio = String(anio);
    var c = K.nodo('<label class="campo campo--rp"><span>' + K.esc(titulo) + '</span></label>');
    var caja = K.nodo('<div class="rp"></div>');
    var pre = K.nodo('<span class="rp__anio" aria-hidden="true">' + K.esc(anio) + '</span>');
    var inp = K.nodo('<input type="text" inputmode="numeric" class="rp__final" autocomplete="off" maxlength="10" placeholder="Ej: 526">');
    var previo = String(D[clave] || '');
    inp.value = previo.length === 10 ? previo.slice(4).replace(/^0+/, '') : previo;
    caja.appendChild(pre);
    caja.appendChild(inp);
    c.appendChild(caja);
    var eco = K.nodo('<p class="rp__eco" aria-live="polite"></p>');
    c.appendChild(eco);
    ayuda(c, texto);
    function repintar() {
      var d = inp.value.replace(/\D/g, '').slice(0, 10);
      inp.value = d;
      var full = !d ? '' : (d.length > 6 ? d : anio + ('000000' + d).slice(-6));
      D[clave] = full;
      var ok = full.length === 10 && full.indexOf(anio) === 0;
      c.classList.toggle('campo--ok', ok);
      eco.textContent = full ? (ok ? 'Va a quedar como ' + full : (full.length !== 10 ? 'Un CDP completo tiene 10 dígitos' : full + ' no empieza por ' + anio)) : '';
    }
    inp.addEventListener('input', repintar);
    pre.addEventListener('click', function () { inp.focus(); });
    repintar();
    donde.appendChild(c);
    return inp;
  }

  function botones(donde, textoSi, alGuardar, alCancelar) {
    var fila = K.nodo('<div class="campo-fila campo-fila--botones"></div>');
    var no = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Cancelar</button>');
    var si = K.nodo('<button type="submit" class="kit-btn kit-btn--marca">' + K.esc(textoSi) + '</button>');
    fila.appendChild(no);
    fila.appendChild(si);
    no.addEventListener('click', alCancelar);
    donde.appendChild(fila);
    return si;
  }

  /* ══════════════ números en letras (igual que el CORE) ══════════════
     Solo para enseñar mientras se escribe: el texto que se guarda lo
     escribe el servidor. Probado contra las 223 filas de la hoja: 220
     iguales; las tres distintas tienen el error en la hoja (DIESCISIETE,
     VENTISEIS y un 7.000.000 escrito como SETECIENTOS MIL). */
  function letras(numero) {
    var U = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    var D = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    var Cc = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS',
              'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    var E = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    function dec(n) {
      if (n < 10) return U[n];
      if (n < 20) return E[n - 10];
      if (n === 20) return 'VEINTE';
      if (n < 30) return 'VEINTI' + U[n % 10];
      return D[Math.floor(n / 10)] + (n % 10 ? ' Y ' + U[n % 10] : '');
    }
    function cen(n) {
      if (n === 100) return 'CIEN';
      if (n > 100) return (Cc[Math.floor(n / 100)] + ' ' + dec(n % 100)).trim();
      return dec(n);
    }
    function mil(n) {
      if (n < 1000) return cen(n);
      if (n < 1000000) {
        var m = Math.floor(n / 1000), r = n % 1000;
        return ((m === 1 ? 'MIL' : cen(m) + ' MIL') + (r ? ' ' + cen(r) : '')).trim();
      }
      var mi = Math.floor(n / 1000000), re = n % 1000000;
      return ((mi === 1 ? 'UN MILLON' : cen(mi) + ' MILLONES') + ' ' + (re ? mil(re) : 'DE')).trim();
    }
    var n = Math.round(Number(numero) || 0);
    return n ? (mil(n) + ' PESOS M/CTE').replace(/\s+/g, ' ') : '';
  }

  /**
   * Obligaciones: se pegan tal cual vienen del clausulado. Se parten SOLO
   * por la numeración (1. 2) 3: 4- …, hasta 26), no por los saltos de
   * línea: una obligación larga ocupa varias líneas en el PDF. Es la regla
   * de la app vieja, que ya funcionaba.
   */
  function partirObligaciones(texto) {
    var t = String(texto || '').trim();
    if (!t) return [];
    var marca = /(?:^|\s)((?:[1-9]|1\d|2[0-6]))\s*(?:[.)]|:|[-–—])\s+/g;
    var idx = [], m;
    while ((m = marca.exec(t)) !== null) idx.push({ i: m.index, largo: m[0].length, n: +m[1] });
    /* solo cuenta si la numeración empieza en 1 y va en orden */
    var buenas = [], esperado = 1;
    idx.forEach(function (x) { if (x.n === esperado) { buenas.push(x); esperado++; } });
    if (!buenas.length) return [t.replace(/\s+/g, ' ')];
    var out = [];
    for (var k = 0; k < buenas.length; k++) {
      var desde = buenas[k].i + buenas[k].largo;
      var hasta = k + 1 < buenas.length ? buenas[k + 1].i : t.length;
      var parte = t.slice(desde, hasta).replace(/\s+/g, ' ').trim();
      if (parte) out.push(parte);
    }
    return out;
  }

  /* ══════════════ listas del formulario ══════════════ */

  function opciones() {
    if (OPCIONES) return Promise.resolve(OPCIONES);
    return K.pedir('opciones').then(function (d) { OPCIONES = d; return d; });
  }

  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function titulo(s) {
    return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
                    .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }

  function cabecera(caja, icono, t, p) {
    caja.appendChild(K.nodo(
      '<header class="ct-cab">' +
      '  <span class="ct-cab__ico">' + K.icono(icono, 22) + '</span>' +
      '  <div><h2 class="ct-cab__t">' + K.esc(t) + '</h2>' +
      '  <p class="ct-cab__p">' + p + '</p></div>' +
      '</header>'));
  }

  function mal(e) { K.aviso((e && e.message) || 'No se pudo guardar.', 'malo', 9000); }

  /** Guardar = resumen → cohete → CORE → lista fresca → a la ficha. */
  function guardar(o) {
    return K.piezas.confirmar.abrir({
      titulo: o.titulo, lista: o.lista, nota: o.nota, si: o.si || 'Guardar', no: 'Revisar'
    }).then(function (ok) {
      if (!ok) return null;
      K.ocupado = true;
      return K.piezas.guardado.mientras(K.pedir(o.accion, o.datos, { ms: 90000 }), {
        titulo: o.cohete, sub: o.sub || 'No cierres la app.', pasos: o.pasos
      }).then(function (r) {
        K.ocupado = false;
        if (r && r.contratistas && window.CONTRATISTAS) window.CONTRATISTAS.recibir(r.contratistas);
        /* 10.2 · ADMIN apunta la bitácora que trae la respuesta */
        if (r && window.GESTION_EXTRA && window.GESTION_EXTRA.alGuardar) window.GESTION_EXTRA.alGuardar(r);
        return r;
      }, function (e) { K.ocupado = false; mal(e); return null; });
    });
  }

  function avisoEnvio(r) {
    /* el CORE dice si el WhatsApp o el push salieron; si no, se dice aquí */
    var a = r && (r.aviso && (r.aviso.contrato || r.aviso));
    if (a && a.ok === false) {
      K.aviso('Quedó guardado, pero el aviso al contratista no salió: ' + (a.error || 'sin canal disponible') + '.', 'aviso', 9000);
    }
  }

  /* ══════════════ AGREGAR ══════════════ */

  /* 26/09 · sub = documento que pidió acceso desde SOLICITUDES: llega ya escrito y validado */
  function agregar(sub) {
    var caja = K.nodo('<div class="kit-ancho vista gs"></div>');
    C.app.appendChild(caja);
    cabecera(caja, 'mas', 'AGREGAR CONTRATISTA',
      'Primero el documento: así sabes si se puede registrar antes de llenar nada.');

    var D = {};
    var V = null;                                   /* lo que dijo validarDocumento */
    var paso1 = K.nodo('<form class="kit-tarjeta formulario gs-paso" novalidate></form>');
    caja.appendChild(paso1);
    var docInp = campoTexto(paso1, D, 'documento', 'Documento del contratista', 'Sin puntos ni espacios. De 6 a 10 dígitos.',
      { numerico: 10, marcador: 'Ej: 1070602493', alCambiar: function () { if (V) invalidar(); } });
    var bVal = K.nodo('<button type="submit" class="kit-btn kit-btn--marca">' + K.icono('buscar', 16) + ' Validar documento</button>');
    paso1.appendChild(bVal);
    var veredicto = K.nodo('<div class="gs-veredicto" aria-live="polite"></div>');
    paso1.appendChild(veredicto);

    var paso2 = K.nodo('<form class="kit-tarjeta formulario gs-paso" novalidate hidden></form>');
    caja.appendChild(paso2);
    K.piezas.creditos.montar(caja);
    var docPedido = String(sub ? decodeURIComponent(sub) : '').replace(/\D/g, '');
    if (/^\d{6,10}$/.test(docPedido)) {
      D.documento = docPedido;
      docInp.value = docPedido;
      setTimeout(function () { bVal.click(); }, 0);
    }

    function invalidar() {
      V = null;
      veredicto.innerHTML = '';
      paso2.hidden = true;
      paso2.innerHTML = '';
    }

    paso1.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!/^\d{6,10}$/.test(D.documento || '')) { K.aviso('El documento tiene de 6 a 10 dígitos.', 'aviso', 4000); docInp.focus(); return; }
      bVal.disabled = true;
      bVal.classList.add('kit-ocupado');
      Promise.all([K.pedir('validarDocumento', { documento: D.documento }), opciones()])
        .then(function (r) { V = r[0]; pintarVeredicto(); pintarPaso2(); })
        ['catch'](mal)
        .then(function () { bVal.disabled = false; bVal.classList.remove('kit-ocupado'); });
    });

    function pintarVeredicto() {
      var html = '';
      if (V.tipo === 'NUEVO') {
        html = '<p class="gs-ok"><b>Documento libre.</b> No está en CONTRATISTAS: es una persona nueva. Al guardar se le crea su contraseña y le llega por WhatsApp.</p>';
      } else if (V.tipo === 'NUEVO_CONTRATO') {
        html = '<p class="gs-ok"><b>' + K.esc(nombre(V.nombre)) + '</b> ya trabajó con la Alcaldía (' +
          V.contratos.map(function (c) { return 'contrato ' + K.esc(c.contrato) + ' · ' + K.esc(titulo(c.secretaria)); }).join('; ') +
          ', todos INACTIVOS). Es un <b>contrato nuevo</b>: se traen sus datos personales, su firma y la misma contraseña.</p>';
      } else {
        html = '<p class="gs-alerta"><b>' + K.esc(nombre(V.nombre)) + '</b> tiene contrato ACTIVO en: ' +
          V.activas.map(function (a) { return K.esc(titulo(a.secretaria)) + ' (contrato ' + K.esc(a.contrato) + ')'; }).join(', ') +
          '. Solo se le puede registrar en <b>otra secretaría</b>. Para renovar en la misma, primero tiene que quedar INACTIVO.</p>';
      }
      veredicto.innerHTML = html;
    }

    function pintarPaso2() {
      paso2.innerHTML = '';
      paso2.hidden = false;
      var bloqueadas = (V.activas || []).map(function (a) { return K.norm(a.secretaria); });
      var anio = OPCIONES.vigencia;
      D.nombre = V.nombre || '';

      paso2.appendChild(K.nodo('<h3 class="grupo__t">La persona</h3>'));
      var inpNom = campoTexto(paso2, D, 'nombre', 'Nombre completo', V.tipo === 'NUEVO' ? 'Como está en la cédula: nombres y apellidos.' : 'Viene de sus contratos anteriores.', { mayus: true });
      if (V.tipo !== 'NUEVO') { inpNom.readOnly = true; inpNom.classList.add('campo--quieto'); }
      if (V.tipo === 'NUEVO') {
        var fila0 = K.nodo('<div class="campo-fila"></div>');
        campoTexto(fila0, D, 'telefono', 'Celular', 'Ahí le llega la contraseña.', { numerico: 10, marcador: '3001234567' });
        campoTexto(fila0, D, 'correo', 'Correo (opcional)', '', { marcador: 'nombre@correo.com' });
        paso2.appendChild(fila0);
      } else if (V.telefono) {
        paso2.appendChild(K.nodo('<p class="formulario__nota">El aviso le llega al celular que ya tiene registrado (' + K.esc(V.telefono) + ').</p>'));
      }

      paso2.appendChild(K.nodo('<h3 class="grupo__t">El contrato</h3>'));
      campoLista(paso2, D, 'secretaria', 'Secretaría', 'Su carpeta de Drive se crea dentro de la de la secretaría.',
        OPCIONES.secretarias.map(function (s) { return { valor: s.nombre, texto: titulo(s.nombre), bloqueada: bloqueadas.indexOf(K.norm(s.nombre)) >= 0 }; }));
      campoLista(paso2, D, 'supervisor', 'Supervisor(a)', 'Los avisos de sus cuentas van al grupo de WhatsApp de esta persona.',
        OPCIONES.supervisores.map(function (s) { return { valor: s.nombre, texto: nombre(s.nombre) }; }));
      var fila1 = K.nodo('<div class="campo-fila"></div>');
      campoTexto(fila1, D, 'contrato', 'N° de contrato', 'Tres dígitos.', { numerico: 3, marcador: 'Ej: 027' });
      campoFecha(fila1, D, 'fechaContrato', 'Fecha del contrato', '', { anioFijo: anio });
      paso2.appendChild(fila1);
      campoLista(paso2, D, 'tipo', 'Tipo de contrato', '',
        OPCIONES.tipos.map(function (t) { return { valor: t, texto: t.charAt(0) + t.slice(1).toLowerCase() }; }));
      campoPesos(paso2, D, 'valor', 'Valor del contrato', 'El valor en letras se escribe solo.');
      campoCodigo(paso2, D, 'cdp', 'CDP', 'Escribe el final del CDP; el año lo pone la app. No puede estar usado en otro contrato.', anio);
      campoTexto(paso2, D, 'objeto', 'Objeto del contrato', 'Se guarda en mayúsculas y en un solo párrafo.', { area: true, filas: 3 });

      var obl = campoTexto(paso2, D, 'obligaciones', 'Obligaciones',
        'Pégalas del clausulado con su numeración (1. 2. 3. …). Se separan por el número, no por los saltos de línea. Máximo 26.',
        { area: true, filas: 8 });
      var cuenta = K.nodo('<div class="gs-obl" aria-live="polite"></div>');
      obl.parentNode.appendChild(cuenta);
      function pintarObl() {
        var l = partirObligaciones(D.obligaciones);
        cuenta.innerHTML = l.length
          ? '<p class="gs-obl__n"><b>' + l.length + '</b> ' + (l.length === 1 ? 'obligación' : 'obligaciones') + (l.length > 26 ? ' — pasan de 26' : '') + '</p>' +
            '<ol>' + l.slice(0, 26).map(function (x) { return '<li>' + K.esc(x.length > 140 ? x.slice(0, 140) + '…' : x) + '</li>'; }).join('') + '</ol>'
          : '';
      }
      obl.addEventListener('input', pintarObl);
      obl.addEventListener('input', function () { obl.style.height = 'auto'; obl.style.height = (obl.scrollHeight + 4) + 'px'; });

      botones(paso2, 'Registrar contrato', null, function () { C.irA('contratistas'); });
      if (K.piezas.fechas) K.piezas.fechas.montar(paso2);
      paso2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    paso2.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var falta = faltaAlta(D, V);
      if (falta.length) { K.aviso('Te falta: ' + falta.join(', ') + '.', 'aviso', 7000); return; }
      var obls = partirObligaciones(D.obligaciones);
      var datos = {
        documento: D.documento, nombre: D.nombre, telefono: D.telefono || '', correo: D.correo || '',
        secretaria: D.secretaria, supervisor: D.supervisor, contrato: D.contrato, tipo: D.tipo,
        fechaContrato: D.fechaContrato, valor: String(K.aNumero(D.valor)), cdp: D.cdp,
        objeto: String(D.objeto || '').replace(/\s+/g, ' ').trim().toUpperCase(), obligaciones: obls
      };
      ULTIMA = { vista: 'agregar', datos: datos };
      guardar({
        titulo: 'Revisa antes de registrar',
        lista: [
          ['Contratista', nombre(D.nombre)], ['Documento', D.documento],
          ['Contrato', ('00' + D.contrato).slice(-3) + ' · ' + D.fechaContrato],
          ['Secretaría', titulo(D.secretaria)], ['Supervisor(a)', nombre(D.supervisor)],
          ['Valor', K.pesos(D.valor)], ['CDP', D.cdp], ['Obligaciones', String(obls.length)]
        ],
        nota: V.tipo === 'NUEVO' ? 'Se crea su carpeta de Drive y le llega la contraseña por WhatsApp.'
                                 : 'Se crea su carpeta de Drive y le llega el aviso del contrato nuevo.',
        si: 'Registrar', accion: 'agregarContratista', datos: datos,
        cohete: 'Registrando el contrato', pasos: ['Revisando que no esté repetido', 'Creando su carpeta', 'Guardando']
      }).then(function (r) {
        if (!r) return;
        avisoEnvio(r);
        K.aviso('Contrato ' + r.contrato + ' registrado.', 'ok', 4000);
        C.irA('contratista/' + encodeURIComponent(r.idContrato));
      });
    });
  }

  function faltaAlta(D, V) {
    var f = [];
    var anio = OPCIONES ? OPCIONES.vigencia : new Date().getFullYear();
    if (String(D.nombre || '').trim().split(/\s+/).length < 2) f.push('el nombre completo');
    if (V.tipo === 'NUEVO' && !/^\d{10}$/.test(D.telefono || '')) f.push('el celular (10 dígitos)');
    if (!D.secretaria) f.push('la secretaría');
    if (!D.supervisor) f.push('el supervisor');
    if (!D.contrato) f.push('el N° de contrato');
    if (!D.fechaContrato) f.push('la fecha del contrato');
    if (!D.tipo) f.push('el tipo de contrato');
    if (!K.aNumero(D.valor)) f.push('el valor');
    if (!new RegExp('^' + anio + '\\d{6}$').test(D.cdp || '')) f.push('el CDP');
    if (String(D.objeto || '').trim().length < 20) f.push('el objeto');
    var n = partirObligaciones(D.obligaciones).length;
    if (!n) f.push('las obligaciones');
    if (n > 26) f.push('máximo 26 obligaciones');
    return f;
  }

  /* ══════════════ lo común a adición, cesión y suspensión ══════════════ */

  function conContrato(sub, icono, t, p, pintar) {
    var id = decodeURIComponent(String(sub || ''));
    var caja = K.nodo('<div class="kit-ancho vista gs"></div>');
    C.app.appendChild(caja);
    cabecera(caja, icono, t, p);
    var cuerpo = K.nodo('<div class="gs-cuerpo"></div>');
    caja.appendChild(cuerpo);
    K.piezas.creditos.montar(caja);
    var espera = K.pedir('contratoPara', { idContrato: id });
    K.piezas.esqueletos.mientras(cuerpo, espera, { forma: 'texto', cuantos: 6 })
      .then(function (c) {
        ULTIMA = { vista: t, contrato: c };
        cuerpo.innerHTML = '';   /* el esqueleto deja su hueco si no se limpia */
        cuerpo.appendChild(resumenContrato(c));
        if (c.estado !== 'ACTIVO') {
          cuerpo.appendChild(K.nodo('<p class="kit-tarjeta formulario__nota formulario__nota--fuerte ct-aviso">Este contrato está ' +
            K.esc(c.estado) + ': solo se gestionan contratos ACTIVOS.</p>'));
          return;
        }
        pintar(cuerpo, c);
      })
      ['catch'](function (e) { cuerpo.appendChild(C.errorCaja(e)); });
  }

  function resumenContrato(c) {
    var g = K.nodo('<section class="kit-tarjeta grupo gs-resumen"></section>');
    var cab = K.nodo('<div class="ct-t__cab"></div>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(c.nombre, { tam: 44 }));
    cab.appendChild(K.nodo('<div class="ct-t__quien"><h3 class="ct-t__n">' + K.esc(nombre(c.nombre)) + '</h3>' +
      '<p class="ct-t__doc">Contrato ' + K.esc(c.contrato) + ' · ' + K.esc(c.tramo || 'PRIMARIO') + (c.cesion ? ' · CEDIDO' : '') + '</p></div>'));
    g.appendChild(cab);
    var inf = c.informes || {};
    var filas = [
      ['Plazo', (c.fechaInicio || '—') + ' → ' + (c.fechaFinal || '—')],
      ['Ejecución', c.ejecucion || '—'],
      ['Valor inicial', K.pesos(c.valorInicial)],
      c.adicion1 ? ['1ª adición', K.pesos(c.adicion1)] : null,
      c.adicion2 ? ['2ª adición', K.pesos(c.adicion2)] : null,
      ['Valor final', K.pesos(c.valorFinal)],
      ['Informes', (inf.primario || '—') + (inf.adicion1 ? ' + ' + inf.adicion1 : '') + (inf.adicion2 ? ' + ' + inf.adicion2 : '') + (inf.total && (inf.adicion1 || inf.adicion2) ? ' = ' + inf.total : '')],
      c.suspTexto ? ['Suspendido', c.suspTexto] : null,
      c.ultimaCuenta ? ['Última cuenta', 'Informe ' + c.ultimaCuenta.informe + ' · ' + c.ultimaCuenta.estado] : ['Cuentas', 'Todavía no ha radicado']
    ].filter(Boolean);
    g.appendChild(K.nodo('<dl class="ct-t__datos">' + filas.map(function (x) {
      return '<div><dt>' + K.esc(x[0]) + '</dt><dd>' + K.esc(x[1]) + '</dd></div>';
    }).join('') + '</dl>'));
    return g;
  }

  function volverAFicha(c) { C.irA('contratista/' + encodeURIComponent(c.idContrato)); }

  /* ══════════════ ADICIÓN ══════════════ */

  function adicion(sub) {
    conContrato(sub, 'mas', 'ADICIÓN', 'Más tiempo y más plata para el mismo contrato. La app sabe si es la 1ª o la 2ª.', function (cuerpo, c) {
      var corrigiendo = false;
      var zona = K.nodo('<div></div>');
      cuerpo.appendChild(zona);

      if (!c.fechaInicio) {
        zona.appendChild(K.nodo('<p class="kit-tarjeta formulario__nota formulario__nota--fuerte ct-aviso">El contratista todavía no ha puesto las fechas de su acta de inicio (DATOS DEL PROCESO en su app). Sin la fecha de inicio no se puede calcular el tiempo total de la adición.</p>'));
        return;
      }

      function pintar() {
        zona.innerHTML = '';
        var cual = corrigiendo ? (c.adicion2 ? 2 : 1) : c.siguienteAdicion;
        if (!corrigiendo && !cual) {
          zona.appendChild(K.nodo('<p class="kit-tarjeta formulario__nota ct-aviso">Este contrato ya tiene sus dos adiciones.</p>'));
        }
        if (c.siguienteAdicion !== 1) {
          var t = K.nodo('<button type="button" class="kit-btn kit-btn--plano gs-corregir">' + K.icono('lapiz', 16) + ' ' +
            (corrigiendo ? 'Registrar una adición nueva' : 'Corregir la ' + (c.adicion2 ? '2ª' : '1ª') + ' adición') + '</button>');
          t.addEventListener('click', function () { corrigiendo = !corrigiendo; pintar(); });
          zona.appendChild(t);
        }
        if (!cual) return;
        zona.appendChild(formAdicion(c, cual, corrigiendo));
      }
      pintar();
    });
  }

  function formAdicion(c, cual, corrigiendo) {
    var f = K.nodo('<form class="kit-tarjeta formulario" novalidate></form>');
    var anio = c.vigencia;
    var ord = cual === 1 ? '1ª' : '2ª';
    f.appendChild(K.nodo('<h3 class="grupo__t">' + (corrigiendo ? 'Corregir la ' : 'Registrar la ') + ord + ' adición</h3>'));
    var D = {};
    if (corrigiendo) {
      D.inicio = c.inicioAdicion; D.fin = c.finAdicion;
      D.valor = String(cual === 1 ? c.adicion1 : c.adicion2);
      D.cdp = String(cual === 1 ? c.cdpAdicion : c.cdpAdicion2).replace(/\D/g, '');
    }
    var inf = c.informes || {};
    /* informes: el primario se congela una sola vez (si ya está, no se pide) */
    var primarioFijo = !!inf.primario;   /* TOTAL INFORMES PRIMARIO ya congelado */
    D.informesPrimario = String(inf.primario || c.informesCuentas || c.meses || '');
    D.informesAdicion = corrigiendo ? String(cual === 1 ? inf.adicion1 : inf.adicion2 || '') : '';

    var fila = K.nodo('<div class="campo-fila"></div>');
    campoFecha(fila, D, 'inicio', 'Inicio de la adición', '', { anioFijo: anio, alCambiar: calc });
    campoFecha(fila, D, 'fin', 'Fin de la adición', 'Pasa a ser la fecha final del contrato.', { anioFijo: anio, alCambiar: calc });
    f.appendChild(fila);
    var plazo = K.nodo('<p class="gs-calc" aria-live="polite"></p>');
    f.appendChild(plazo);

    campoPesos(f, D, 'valor', 'Valor de la adición', 'Hasta el 50 % del valor inicial (' + K.pesos(c.valorInicial) + '), sumando las dos adiciones.', { alCambiar: calc });
    var tope = K.nodo('<p class="gs-calc" aria-live="polite"></p>');
    f.appendChild(tope);
    campoCodigo(f, D, 'cdp', 'CDP de la ' + ord + ' adición', 'El final del CDP; el año lo pone la app.', anio);

    f.appendChild(K.nodo('<h3 class="grupo__t grupo__t--sub">Informes (pagos)</h3>'));
    var fila2 = K.nodo('<div class="campo-fila"></div>');
    var iP = campoTexto(fila2, D, 'informesPrimario', 'Antes de la adición',
      primarioFijo ? 'Congelado: no cambia.' : 'Los pagos del contrato inicial.', { numerico: 2, alCambiar: calc });
    if (primarioFijo) { iP.readOnly = true; iP.classList.add('campo--quieto'); }
    var iAd = campoTexto(fila2, D, 'informesAdicion', 'De la adición', 'Se propone según el valor.', { numerico: 2, alCambiar: calc });
    iAd.addEventListener('input', function () { D._tocadoInf = true; });
    f.appendChild(fila2);
    var totalInf = K.nodo('<p class="gs-calc gs-calc--total" aria-live="polite"></p>');
    f.appendChild(totalInf);

    function calc() {
      /* los campos se pintan uno a uno y el de valor avisa al nacer: hasta
         que exista el último rótulo no hay nada que calcular */
      if (!totalInf) return;
      var ini = fechaDe(D.inicio), fin = fechaDe(D.fin);
      if (ini && fin) {
        if (fin < ini) plazo.textContent = 'El fin está antes del inicio.';
        else {
          var p = plazoEntre(ini, fin);
          var tot = plazoEntre(fechaDe(c.fechaInicio), fin);
          plazo.textContent = 'Adición de ' + tiempo(p.meses, p.dias) + '. El contrato queda en ' + tiempo(tot.meses, tot.dias) +
            (c.suspTexto ? ' menos ' + c.suspTexto.toLowerCase() + ' suspendidos' : '') + ', hasta el ' + D.fin + '.';
        }
      } else plazo.textContent = '';
      var v = K.aNumero(D.valor);
      var otra = cual === 1 ? (c.adicion2 || 0) : (c.adicion1 || 0);
      if (v) {
        var pasa = (v + otra) * 2 > c.valorInicial;
        tope.textContent = pasa ? 'Se pasa del 50 % del valor inicial: el tope es ' + K.pesos(Math.floor(c.valorInicial / 2) - otra) + '.'
                                : 'Valor final del contrato: ' + K.pesos(c.valorInicial + v + otra) + '.';
        tope.classList.toggle('gs-calc--mal', pasa);
        /* los informes de la adición se proponen con el valor de cada pago */
        var cuota = c.valorInicial && K.aNumero(D.informesPrimario) ? c.valorInicial / K.aNumero(D.informesPrimario) : 0;
        if (cuota && !D._tocadoInf && !corrigiendo) {
          var prop = Math.round(v / cuota);
          if (prop) { D.informesAdicion = String(prop); iAd.value = D.informesAdicion; }
        }
      } else tope.textContent = '';
      var a = K.aNumero(D.informesPrimario), b = K.aNumero(D.informesAdicion);
      var previo = cual === 2 ? (inf.adicion1 || 0) : 0;
      totalInf.innerHTML = (a && b) ? 'Total de informes del contrato: <b>' + (a + previo + b) + '</b> (' + a + (previo ? ' + ' + previo : '') + ' + ' + b + ')' : '';
    }

    botones(f, corrigiendo ? 'Guardar la corrección' : 'Registrar la adición', null, function () { volverAFicha(c); });
    if (K.piezas.fechas) K.piezas.fechas.montar(f);
    setTimeout(calc, 0);

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var falta = [];
      if (!D.inicio) falta.push('el inicio');
      if (!D.fin) falta.push('el fin');
      if (!K.aNumero(D.valor)) falta.push('el valor');
      if (!new RegExp('^' + anio + '\\d{6}$').test(D.cdp || '')) falta.push('el CDP');
      if (!K.aNumero(D.informesPrimario)) falta.push('los informes antes de la adición');
      if (!K.aNumero(D.informesAdicion)) falta.push('los informes de la adición');
      if (falta.length) { K.aviso('Te falta: ' + falta.join(', ') + '.', 'aviso', 6000); return; }
      var datos = {
        idContrato: c.idContrato, inicio: D.inicio, fin: D.fin, valor: String(K.aNumero(D.valor)), cdp: D.cdp,
        informesPrimario: K.aNumero(D.informesPrimario), informesAdicion: K.aNumero(D.informesAdicion), corregir: corrigiendo
      };
      guardar({
        titulo: (corrigiendo ? 'Corregir la ' : 'Registrar la ') + ord + ' adición',
        lista: [['Contratista', nombre(c.nombre)], ['Contrato', c.contrato], ['Periodo', D.inicio + ' a ' + D.fin],
                ['Valor', K.pesos(D.valor)], ['CDP', D.cdp], ['Informes', D.informesPrimario + ' + ' + D.informesAdicion]],
        nota: 'Al contratista le llega el aviso con lo que tiene que hacer (actualizar el RP de la adición).',
        si: 'Guardar', accion: 'adicion', datos: datos, cohete: 'Guardando la adición'
      }).then(function (r) {
        if (!r) return;
        avisoEnvio(r);
        K.aviso((r.cual === 1 ? '1ª' : '2ª') + ' adición guardada. El contrato queda en ' + r.total + ' informes.', 'ok', 5000);
        volverAFicha(c);
      });
    });
    return f;
  }

  /* ══════════════ SUSPENSIÓN ══════════════ */

  function suspension(sub) {
    conContrato(sub, 'pausa', 'SUSPENSIÓN', 'El tiempo que el contrato estuvo parado. Corre la fecha final lo mismo.', function (cuerpo, c) {
      if (!c.fechaInicio || !c.fechaFinal) {
        cuerpo.appendChild(K.nodo('<p class="kit-tarjeta formulario__nota formulario__nota--fuerte ct-aviso">Sin las fechas del acta de inicio no se puede calcular la suspensión.</p>'));
        return;
      }
      var f = K.nodo('<form class="kit-tarjeta formulario" novalidate></form>');
      f.appendChild(K.nodo('<h3 class="grupo__t">Tiempo TOTAL suspendido</h3>'));
      f.appendChild(K.nodo('<p class="formulario__nota">Escribe el total, no solo lo nuevo' + (c.suspTexto ? ': hoy tiene <b>' + K.esc(c.suspTexto) + '</b>' : '') +
        '. Para quitar la suspensión, deja 0 y 0.</p>'));
      var D = { meses: String(c.suspMeses || 0), dias: String(c.suspDias || 0) };
      var fila = K.nodo('<div class="campo-fila"></div>');
      campoTexto(fila, D, 'meses', 'Meses', '', { numerico: 2, alCambiar: calc });
      campoTexto(fila, D, 'dias', 'Días', '', { numerico: 2, alCambiar: calc });
      f.appendChild(fila);
      var eco = K.nodo('<p class="gs-calc gs-calc--total" aria-live="polite"></p>');
      f.appendChild(eco);
      function nuevaFin() {
        var fin = fechaDe(c.fechaFinal);
        var dm = (+D.meses || 0) - (c.suspMeses || 0), dd = (+D.dias || 0) - (c.suspDias || 0);
        var x = masMeses(fin, dm);
        return new Date(x.getFullYear(), x.getMonth(), x.getDate() + dd);
      }
      function calc() {
        var nf = nuevaFin();
        var igual = (+D.meses || 0) === (c.suspMeses || 0) && (+D.dias || 0) === (c.suspDias || 0);
        eco.innerHTML = igual ? 'Sin cambios.' : 'La fecha final pasa del <b>' + K.esc(c.fechaFinal) + '</b> al <b>' + dmy(nf) + '</b>.';
      }
      calc();
      botones(f, 'Guardar la suspensión', null, function () { volverAFicha(c); });
      cuerpo.appendChild(f);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var m = +D.meses || 0, d = +D.dias || 0;
        if (m === (c.suspMeses || 0) && d === (c.suspDias || 0)) { K.aviso('No cambiaste el tiempo de suspensión.', 'aviso', 4000); return; }
        guardar({
          titulo: 'Suspensión del contrato ' + c.contrato,
          lista: [['Contratista', nombre(c.nombre)], ['Suspendido en total', (m || d) ? tiempo(m, d) : 'Sin suspensión'],
                  ['Fecha final', c.fechaFinal + ' → ' + dmy(nuevaFin())]],
          nota: 'El tiempo de ejecución queda en lo realmente ejecutado. Al contratista le llega el aviso.',
          accion: 'suspension', datos: { idContrato: c.idContrato, meses: m, dias: d }, cohete: 'Guardando la suspensión'
        }).then(function (r) {
          if (!r) return;
          avisoEnvio(r);
          K.aviso('Suspensión guardada. Termina el ' + r.fechaFinal + '.', 'ok', 5000);
          volverAFicha(c);
        });
      });
    });
  }

  /* ══════════════ CESIÓN (10.2: fila nueva y periodos partidos) ══════════════
     Decidido por Oss (24/09): el cesionario entra como contratista NUEVO,
     con su propia fila, y el plazo, el valor y los informes se parten
     entre los dos. La propuesta sale de las cuentas reales del cedente
     (lo ya cobrado es suyo) y se puede ajustar antes de guardar; el CORE
     la vuelve a calcular y valida lo mismo. */

  /** La misma cuenta de FC52_cesionPropuesta_ del CORE. */
  function particion(c, inicioCes) {
    var p = c.particion || {}, out = {
      cobrado: p.cobrado || 0, hechas: p.cuentasHechas || 0, total: p.totalInformes || 0, valor: p.valorTotal || c.valorFinal || 0,
      infCed: p.cuentasHechas || 0, infCes: Math.max(1, (p.totalInformes || 0) - (p.cuentasHechas || 0)), valCed: p.cobrado || 0, partido: false
    };
    var ini = fechaDe(c.fechaInicio), dI = fechaDe(inicioCes);
    if (ini && dI) {
      var finCed = new Date(dI.getFullYear(), dI.getMonth(), dI.getDate() - 1);
      var pl = plazoEntre(ini, finCed);
      var cuota = out.total ? out.valor / out.total : 0;
      out.infCed = Math.max(out.hechas, pl.meses + (pl.dias > 0 ? 1 : 0));
      out.partido = pl.dias > 0;
      out.infCes = Math.max(1, out.total - pl.meses);
      out.valCed = Math.max(out.cobrado, Math.round(cuota * (pl.meses + Math.min(pl.dias, 30) / 30)));
      if (out.valCed >= out.valor) out.valCed = out.cobrado;
      out.finCed = dmy(finCed);
    }
    out.valCes = out.valor - out.valCed;
    return out;
  }

  function cesion(sub) {
    conContrato(sub, 'persona', 'CESIÓN', 'Otra persona sigue con el contrato. Entra como contratista nuevo, con su fila, y el plazo, el valor y los informes se parten entre los dos.', function (cuerpo, c) {
      if ((c.abiertas || []).length) {
        cuerpo.appendChild(K.nodo('<p class="kit-tarjeta formulario__nota formulario__nota--fuerte ct-aviso">Todavía no se puede ceder: ' +
          c.abiertas.map(function (a) { return 'la cuenta ' + a.informe + ' está en ' + K.esc(a.estado); }).join(', ') +
          '. Primero tiene que llegar al plan de pagos (CERRADA); si no, quedaría entre dos personas.</p>'));
        return;
      }
      if (!c.fechaInicio || !c.fechaFinal) {
        cuerpo.appendChild(K.nodo('<p class="kit-tarjeta formulario__nota formulario__nota--fuerte ct-aviso">El contrato no tiene las fechas del acta de inicio: sin ellas no se puede partir el plazo. ' +
          'El contratista las diligencia en su app (DATOS DEL CONTRATO).</p>'));
        return;
      }
      var f = K.nodo('<form class="kit-tarjeta formulario" novalidate></form>');
      f.appendChild(K.nodo('<h3 class="grupo__t">Quién recibe el contrato</h3>'));
      var D = {};
      var V = null;
      campoTexto(f, D, 'documento', 'Documento del cesionario', '', { numerico: 10, marcador: 'Sin puntos', alCambiar: function () { V = null; quien.innerHTML = ''; } });
      var quien = K.nodo('<div class="gs-veredicto" aria-live="polite"></div>');
      f.appendChild(quien);
      var inpN = campoTexto(f, D, 'nombre', 'Nombre completo', 'Como está en la cédula.', { mayus: true });
      var fila = K.nodo('<div class="campo-fila"></div>');
      campoTexto(fila, D, 'telefono', 'Celular', 'Ahí le llega el aviso (y la contraseña si es nuevo).', { numerico: 10, marcador: '3001234567' });
      campoTexto(fila, D, 'correo', 'Correo (opcional)', '');
      f.appendChild(fila);
      f.appendChild(K.nodo('<h3 class="grupo__t">Las fechas</h3>'));
      var fila2 = K.nodo('<div class="campo-fila"></div>');
      campoFecha(fila2, D, 'fechaCesion', 'Fecha de la cesión', '', { anioFijo: c.vigencia });
      campoFecha(fila2, D, 'inicioCesionario', 'Inicio del cesionario', 'El cedente termina el día anterior.', { anioFijo: c.vigencia, alCambiar: function () { proponer(); } });
      f.appendChild(fila2);

      /* ---- la partición ---- */
      f.appendChild(K.nodo('<h3 class="grupo__t">Cómo se parte el contrato</h3>'));
      var zP = K.nodo('<div class="gs-particion"></div>');
      f.appendChild(zP);
      var P = null;
      function proponer() {
        zP.innerHTML = '';
        if (!D.inicioCesionario) {
          zP.appendChild(K.nodo('<p class="formulario__nota">Elige el inicio del cesionario y aquí sale la propuesta: lo ya cobrado (' + K.esc(K.pesos(particion(c).cobrado)) +
            ', ' + particion(c).hechas + ' cuentas) es del cedente.</p>'));
          return;
        }
        P = particion(c, D.inicioCesionario);
        D.informesCedente = String(P.infCed); D.informesCesionario = String(P.infCes); D.valorCedente = String(P.valCed);
        var dos = K.nodo('<div class="gs-partes"></div>');
        var ced = K.nodo('<section class="gs-parte"><h4>Cedente · ' + K.esc(nombre(c.nombre)) + '</h4><p class="gs-parte__p">' +
          K.esc(c.fechaInicio) + ' → ' + K.esc(P.finCed || '') + '</p></section>');
        var ces = K.nodo('<section class="gs-parte gs-parte--nuevo"><h4>Cesionario</h4><p class="gs-parte__p">' +
          K.esc(D.inicioCesionario) + ' → ' + K.esc(c.fechaFinal) + '</p></section>');
        /* lo que repinta repintarCes va ANTES de los campos: campoPesos lo llama al nacer */
        var vCes = K.nodo('<div class="dato"><span class="dato__e">Valor del cesionario</span><span class="dato__v gs-parte__valor"></span></div>');
        var nota = K.nodo('<p class="formulario__nota"></p>');
        campoTexto(ced, D, 'informesCedente', 'Informes del cedente', 'Ya radicó ' + P.hechas + (P.partido ? '; el mes partido le deja una cuenta más.' : '.'), { numerico: 2, alCambiar: repintarCes });
        campoPesos(ced, D, 'valorCedente', 'Valor del cedente', 'Mínimo lo ya cobrado: ' + K.pesos(P.cobrado) + '.', { alCambiar: repintarCes });
        campoTexto(ces, D, 'informesCesionario', 'Informes del cesionario', 'Empieza en su informe 1.', { numerico: 2 });
        ces.appendChild(vCes);
        dos.appendChild(ced); dos.appendChild(ces);
        zP.appendChild(dos);
        zP.appendChild(nota);
        function repintarCes() {
          var vc = K.aNumero(D.valorCedente);
          var rest = P.valor - vc;
          vCes.querySelector('.gs-parte__valor').textContent = rest > 0 ? K.pesos(rest) : 'No queda valor';
          nota.innerHTML = 'Contrato de <b>' + K.esc(K.pesos(P.valor)) + '</b> y <b>' + P.total + '</b> informes. ' +
            (vc < P.cobrado ? '<b class="gs-mal">El cedente ya cobró ' + K.esc(K.pesos(P.cobrado)) + ': su parte no puede ser menor.</b>' : 'Las dos partes suman el valor del contrato.');
        }
        repintarCes();
        if (K.piezas.fechas) K.piezas.fechas.montar(zP);
      }
      proponer();

      f.appendChild(K.nodo('<p class="formulario__nota">Queda escrito quién cedió (<b>' + K.esc(nombre(c.nombre)) + '</b>). Sus cuentas se quedan con él y su contrato termina el día antes del cesionario. ' +
        'El cesionario entra con su <b>propia fila</b>: empieza en su informe 1, diligencia sus datos bancarios y del RUT y, en su primera cuenta, el <b>RP de la cesión</b>.</p>'));

      /* si el cesionario ya estuvo en la Alcaldía, se trae su nombre */
      f.querySelector('input').addEventListener('blur', function () {
        if (!/^\d{6,10}$/.test(D.documento || '') || V) return;
        K.pedir('validarDocumento', { documento: D.documento }).then(function (v) {
          V = v;
          if (v.tipo !== 'NUEVO') {
            D.nombre = v.nombre; inpN.value = v.nombre;
            quien.innerHTML = '<p class="gs-ok"><b>' + K.esc(nombre(v.nombre)) + '</b> ya está en la Alcaldía: se traen sus datos personales y conserva su contraseña.</p>';
          } else {
            quien.innerHTML = '<p class="gs-ok">Persona nueva: se le crea su contraseña y le llega por WhatsApp.</p>';
          }
        })['catch'](function () {});
      });

      botones(f, 'Ceder el contrato', null, function () { volverAFicha(c); });
      if (K.piezas.fechas) K.piezas.fechas.montar(f);
      cuerpo.appendChild(f);

      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var falta = [];
        if (!/^\d{6,10}$/.test(D.documento || '')) falta.push('el documento');
        if (String(D.nombre || '').trim().split(/\s+/).length < 2) falta.push('el nombre completo');
        if (!/^\d{10}$/.test(D.telefono || '') && !(V && V.tipo !== 'NUEVO')) falta.push('el celular');
        if (!D.fechaCesion) falta.push('la fecha de la cesión');
        if (!D.inicioCesionario) falta.push('el inicio del cesionario');
        var fc = fechaDe(D.fechaCesion), fi = fechaDe(D.inicioCesionario);
        if (fc && fi && fi < fc) falta.push('un inicio del cesionario que no sea antes de la cesión');
        var vCed = K.aNumero(D.valorCedente), vCes = P ? P.valor - vCed : 0;
        if (P && vCed < P.cobrado) falta.push('un valor del cedente de al menos ' + K.pesos(P.cobrado));
        if (P && vCes <= 0) falta.push('un valor que le deje algo al cesionario');
        if (P && !(+D.informesCesionario > 0)) falta.push('los informes del cesionario');
        if (falta.length) { K.aviso('Te falta: ' + falta.join(', ') + '.', 'aviso', 6000); return; }
        K.piezas.confirmar.preguntar({
          titulo: '¿Ceder el contrato ' + c.contrato + '?',
          lista: [['Cede', nombre(c.nombre)], ['Recibe', nombre(D.nombre)], ['Documento', D.documento],
                  ['Fecha de cesión', D.fechaCesion], ['Cedente', D.informesCedente + ' informes · ' + K.pesos(vCed) + ' · hasta ' + (P.finCed || '')],
                  ['Cesionario', D.informesCesionario + ' informes · ' + K.pesos(vCes) + ' · desde ' + D.inicioCesionario]],
          nota: 'Se crea la fila del cesionario y el plazo del cedente termina el ' + (P.finCed || '') + '. No se deshace desde la app.',
          si: 'Sí, ceder', peligro: true
        }).then(function (ok) {
          if (!ok) return;
          K.ocupado = true;
          K.piezas.guardado.mientras(K.pedir('cesion', {
            idContrato: c.idContrato, documento: D.documento, nombre: D.nombre, telefono: D.telefono || '',
            correo: D.correo || '', fechaCesion: D.fechaCesion, inicioCesionario: D.inicioCesionario,
            informesCedente: D.informesCedente, valorCedente: String(vCed), informesCesionario: D.informesCesionario
          }, { ms: 90000 }), { titulo: 'Cediendo el contrato', pasos: ['Revisando las cuentas', 'Partiendo el plazo y el valor', 'Creando la fila y la carpeta del cesionario'] })
            .then(function (r) {
              K.ocupado = false;
              if (r.contratistas && window.CONTRATISTAS) window.CONTRATISTAS.recibir(r.contratistas);
              if (window.GESTION_EXTRA && window.GESTION_EXTRA.alGuardar) window.GESTION_EXTRA.alGuardar(r);
              avisoEnvio(r);
              K.aviso('Contrato cedido a ' + nombre(r.cesionario) + ': entra con su propia fila.', 'ok', 6000);
              C.irA('contratista/' + encodeURIComponent(r.idContrato));
            }, function (e) { K.ocupado = false; mal(e); });
        });
      });
    });
  }

  /* ══════════════ EDITAR (5.5) ══════════════
     Una sola puerta para las dos razones de tocar un contrato registrado:
     · CORRECCIÓN: se escribió mal. Queda quién cambió qué y cuándo.
     · OTROSÍ (la casilla): el contrato cambió de verdad. Además, al
       contratista le llega el aviso de que en su próxima cuenta adjunte
       el OTROSÍ que encuentra en el SECOP II.
     Documento, nombre y N° de contrato no se editan: cambiar de persona
     es una CESIÓN y el número es parte de la llave del contrato. */

  var EDITABLES = [
    ['secretaria', 'Secretaría'], ['supervisor', 'Supervisor(a)'], ['tipo', 'Tipo de contrato'],
    ['fechaContrato', 'Fecha del contrato'], ['valorInicial', 'Valor inicial'], ['cdp', 'CDP'],
    ['cdpAdicion', 'CDP 1ª adición'], ['cdpAdicion2', 'CDP 2ª adición'], ['objeto', 'Objeto'], ['obligaciones', 'Obligaciones']
  ];

  function normObjeto(s) { return String(s || '').replace(/\s+/g, ' ').trim().toUpperCase(); }
  function numerar(l) { return (l || []).map(function (o, i) { return (i + 1) + '. ' + o; }).join('\n'); }
  function corto(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }

  /** Lo que cambió respecto a lo que hay en la hoja, igual que lo decide el CORE. */
  function cambiosDe(a, D) {
    var c = {};
    if (K.norm(D.secretaria) !== K.norm(a.secretaria)) c.secretaria = D.secretaria;
    if (K.norm(D.supervisor) !== K.norm(a.supervisor)) c.supervisor = D.supervisor;
    if (K.norm(D.tipo) !== K.norm(a.tipo)) c.tipo = D.tipo;
    if (String(D.fechaContrato || '') !== String(a.fechaContrato || '')) c.fechaContrato = D.fechaContrato;
    if (K.aNumero(D.valorInicial) !== Number(a.valorInicial || 0)) c.valorInicial = String(K.aNumero(D.valorInicial));
    ['cdp', 'cdpAdicion', 'cdpAdicion2'].forEach(function (k) {
      if (String(D[k] || '') !== String(a[k] || '')) c[k] = String(D[k] || '');
    });
    if (normObjeto(D.objeto) !== normObjeto(a.objeto)) c.objeto = normObjeto(D.objeto);
    var l = partirObligaciones(D.obligaciones);
    var antes = (a.obligaciones || []).map(function (o) { return String(o).replace(/\s+/g, ' ').trim(); });
    if (JSON.stringify(l) !== JSON.stringify(antes)) c.obligaciones = l;
    return c;
  }

  function textoDe(k, v) {
    if (k === 'valorInicial') return K.pesos(v);
    if (k === 'obligaciones') return (v || []).length + ((v || []).length === 1 ? ' obligación' : ' obligaciones');
    if (k === 'secretaria') return titulo(v);
    if (k === 'supervisor') return nombre(v);
    if (k === 'objeto') return corto(v, 70);
    return String(v || '') || '(vacío)';
  }

  function faltaEdicion(D, anio) {
    var f = [];
    if (!D.secretaria) f.push('la secretaría');
    if (!D.supervisor) f.push('el supervisor');
    if (!D.tipo) f.push('el tipo de contrato');
    if (!D.fechaContrato) f.push('la fecha del contrato');
    if (!K.aNumero(D.valorInicial)) f.push('el valor inicial');
    var re = new RegExp('^' + anio + '\\d{6}$');
    if (!re.test(D.cdp || '')) f.push('el CDP');
    if (D.cdpAdicion && !re.test(D.cdpAdicion)) f.push('el CDP de la 1ª adición');
    if (D.cdpAdicion2 && !re.test(D.cdpAdicion2)) f.push('el CDP de la 2ª adición');
    if (normObjeto(D.objeto).length < 20) f.push('el objeto');
    var n = partirObligaciones(D.obligaciones).length;
    if (!n) f.push('las obligaciones');
    if (n > 26) f.push('máximo 26 obligaciones');
    return f;
  }

  /** La lista del formulario con el valor de hoy aunque ya no esté (supervisor que se fue). */
  function conActual(lista, actual, pinta) {
    var l = lista.slice();
    if (actual && !l.some(function (x) { return K.norm(x) === K.norm(actual); })) l.unshift(actual);
    return l.map(function (x) { return { valor: x, texto: pinta(x) }; });
  }

  function editar(sub) {
    var id = decodeURIComponent(String(sub || ''));
    var caja = K.nodo('<div class="kit-ancho vista gs"></div>');
    C.app.appendChild(caja);
    cabecera(caja, 'lapiz', 'EDITAR CONTRATO',
      'Corrige un dato mal escrito o registra un <b>OTROSÍ</b>. Documento, nombre y N° de contrato no se editan aquí.');
    var cuerpo = K.nodo('<div class="gs-cuerpo"></div>');
    caja.appendChild(cuerpo);
    K.piezas.creditos.montar(caja);
    var espera = K.pedir('contratoEditarPara', { idContrato: id }, { ms: 60000 });
    K.piezas.esqueletos.mientras(cuerpo, espera, { forma: 'texto', cuantos: 8 })
      .then(function (e) {
        ULTIMA = { vista: 'editar', contrato: e };
        cuerpo.innerHTML = '';
        pintarEdicion(cuerpo, e);
      })
      ['catch'](function (err) { cuerpo.innerHTML = ''; cuerpo.appendChild(C.errorCaja(err)); });
  }

  function pintarEdicion(cuerpo, e) {
    var a = e.actual, op = e.opciones, anio = op.vigencia;
    var quien = K.nodo('<section class="kit-tarjeta grupo gs-resumen"></section>');
    var cab = K.nodo('<div class="ct-t__cab"></div>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(e.nombre, { tam: 44 }));
    cab.appendChild(K.nodo('<div class="ct-t__quien"><h3 class="ct-t__n">' + K.esc(nombre(e.nombre)) + '</h3>' +
      '<p class="ct-t__doc">CC/NIT ' + K.esc(e.documento) + ' · Contrato ' + K.esc(e.contrato) + ' · ' + K.esc(e.tramo || 'PRIMARIO') + '</p></div>'));
    quien.appendChild(cab);
    cuerpo.appendChild(quien);

    /* 10.2 · ADMIN edita también contratos inactivos (el CORE lo vuelve a exigir) */
    var puedeInactivo = !!(window.GESTION_EXTRA && window.GESTION_EXTRA.inactivos);
    if ((e.estado !== 'ACTIVO' && !puedeInactivo) || !e.puede) {
      cuerpo.appendChild(K.nodo('<p class="kit-tarjeta formulario__nota formulario__nota--fuerte ct-aviso">' +
        (e.estado !== 'ACTIVO' ? 'Este contrato está ' + K.esc(e.estado) + ': solo se editan contratos ACTIVOS.' : 'Tu rol no puede editar contratos.') + '</p>'));
      pintarHistorial(cuerpo, e.historial);
      return;
    }

    var D = {
      secretaria: a.secretaria, supervisor: a.supervisor, tipo: a.tipo, fechaContrato: a.fechaContrato,
      valorInicial: String(a.valorInicial || ''), cdp: a.cdp, cdpAdicion: a.cdpAdicion, cdpAdicion2: a.cdpAdicion2,
      objeto: a.objeto, obligaciones: numerar(a.obligaciones)
    };
    var f = K.nodo('<form class="kit-tarjeta formulario gs-paso" novalidate></form>');

    /* ---- la casilla va arriba: decide qué pasa al guardar ---- */
    var otrosi = K.nodo(
      '<label class="gs-otrosi">' +
      '  <input type="checkbox" name="otrosi">' +
      '  <span class="gs-otrosi__txt"><b>Este cambio es por un OTROSÍ</b>' +
      '  <small class="gs-otrosi__sin">Sin marcar es una <b>corrección</b>: queda registrado quién cambió qué y cuándo, sin avisar al contratista.</small>' +
      '  <small class="gs-otrosi__con">Al guardar, al contratista le llega un aviso (notificación y WhatsApp): se efectuó un cambio en su contrato por OTROSÍ y en su próxima cuenta debe adjuntar ese documento, que encuentra en el SECOP II.</small>' +
      '  </span>' +
      '</label>');
    var chk = otrosi.querySelector('input');
    chk.addEventListener('change', function () { otrosi.classList.toggle('gs-otrosi--si', chk.checked); K.vibrar(8); });
    f.appendChild(otrosi);

    f.appendChild(K.nodo('<h3 class="grupo__t">El contrato</h3>'));
    var nomSec = op.secretarias.map(function (x) { return x.nombre; });
    var nomSup = op.supervisores.map(function (x) { return x.nombre; });
    campoLista(f, D, 'secretaria', 'Secretaría', 'Si cambia, su carpeta de Drive se mueve a la de la nueva secretaría.',
      conActual(nomSec, a.secretaria, titulo));
    campoLista(f, D, 'supervisor', 'Supervisor(a)', e.abiertas && e.abiertas.length
      ? 'Si cambia, ' + (e.abiertas.length === 1 ? 'su cuenta abierta pasa' : 'sus ' + e.abiertas.length + ' cuentas abiertas pasan') + ' al nuevo supervisor.'
      : 'Los avisos de sus cuentas van al grupo de WhatsApp de esta persona.',
      conActual(nomSup, a.supervisor, nombre));
    var fila1 = K.nodo('<div class="campo-fila"></div>');
    campoFecha(fila1, D, 'fechaContrato', 'Fecha del contrato', '', { anioFijo: anio });
    campoLista(fila1, D, 'tipo', 'Tipo de contrato', '',
      conActual(op.tipos, a.tipo, function (t) { return t.charAt(0) + t.slice(1).toLowerCase(); }));
    f.appendChild(fila1);

    var adic = (e.adicion1 || 0) + (e.adicion2 || 0);
    var ecoTotal = K.nodo('<p class="gs-calc gs-calc--total" aria-live="polite"></p>');
    campoPesos(f, D, 'valorInicial', 'Valor inicial', 'El valor en letras lo escribe el sistema.', {
      alCambiar: function (n) {
        ecoTotal.innerHTML = adic ? 'Con las adiciones, el valor final queda en <b>' + K.esc(K.pesos((n || 0) + adic)) + '</b>.' : '';
      }
    });
    f.appendChild(ecoTotal);
    ecoTotal.innerHTML = adic ? 'Con las adiciones, el valor final queda en <b>' + K.esc(K.pesos(K.aNumero(D.valorInicial) + adic)) + '</b>.' : '';

    campoCodigo(f, D, 'cdp', 'CDP', 'No puede estar usado en otro contrato.', anio);
    if (e.adicion1 || a.cdpAdicion) campoCodigo(f, D, 'cdpAdicion', 'CDP de la 1ª adición', '', anio);
    if (e.adicion2 || a.cdpAdicion2) campoCodigo(f, D, 'cdpAdicion2', 'CDP de la 2ª adición', '', anio);

    var obj = campoTexto(f, D, 'objeto', 'Objeto del contrato', 'Se guarda en mayúsculas y en un solo párrafo.', { area: true, filas: 4 });
    var obl = campoTexto(f, D, 'obligaciones', 'Obligaciones',
      'Una por número (1. 2. 3. …). Se separan por el número, no por los saltos de línea. Máximo 26.', { area: true, filas: 10 });
    var cuenta = K.nodo('<div class="gs-obl" aria-live="polite"></div>');
    obl.parentNode.appendChild(cuenta);
    function pintarObl() {
      var l = partirObligaciones(D.obligaciones);
      cuenta.innerHTML = '<p class="gs-obl__n"><b>' + l.length + '</b> ' + (l.length === 1 ? 'obligación' : 'obligaciones') +
        (l.length > 26 ? ' — pasan de 26' : '') + '</p>';
    }
    function crecer(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 4) + 'px'; }
    obl.addEventListener('input', pintarObl);
    obl.addEventListener('input', function () { crecer(obl); });
    obj.addEventListener('input', function () { crecer(obj); });
    pintarObl();

    botones(f, 'Guardar cambios', null, function () { volverAFicha(e); });
    if (K.piezas.fechas) K.piezas.fechas.montar(f);
    cuerpo.appendChild(f);
    requestAnimationFrame(function () { crecer(obj); crecer(obl); });
    pintarHistorial(cuerpo, e.historial);

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var falta = faltaEdicion(D, anio);
      if (falta.length) { K.aviso('Revisa: ' + falta.join(', ') + '.', 'aviso', 7000); return; }
      var c = cambiosDe(a, D);
      var claves = Object.keys(c);
      if (!claves.length) { K.aviso('No cambiaste nada.', 'aviso', 4000); return; }
      var es = chk.checked;
      var lista = EDITABLES.filter(function (x) { return c[x[0]] !== undefined; }).map(function (x) {
        var antes = x[0] === 'valorInicial' ? a.valorInicial : a[x[0]];
        return [x[1], textoDe(x[0], antes) + '  →  ' + textoDe(x[0], c[x[0]])];
      });
      var notas = [];
      if (c.secretaria) notas.push('Su carpeta de Drive se mueve a la de la nueva secretaría.');
      if (c.supervisor && e.abiertas && e.abiertas.length) notas.push('Sus cuentas abiertas pasan al nuevo supervisor.');
      notas.push(es ? 'Es un OTROSÍ: al contratista le llega el aviso para que lo adjunte en su próxima cuenta.'
                    : 'Es una corrección: no se le avisa al contratista.');
      guardar({
        titulo: es ? 'OTROSÍ del contrato ' + e.contrato : 'Corrección del contrato ' + e.contrato,
        lista: lista, nota: notas.join(' '), si: es ? 'Guardar y avisar' : 'Guardar corrección',
        accion: 'contratoEditar', datos: { idContrato: e.idContrato, huella: e.huella, otrosi: es, cambios: c },
        cohete: es ? 'Registrando el OTROSÍ' : 'Guardando la corrección',
        pasos: es ? ['Revisando los datos', 'Guardando', 'Avisando al contratista'] : ['Revisando los datos', 'Guardando']
      }).then(function (r) {
        if (!r) return;
        if (r.aviso && r.aviso.ok === false) avisoEnvio(r);
        else K.aviso(es ? 'OTROSÍ registrado. El contratista ya tiene el aviso.' : 'Contrato corregido.', 'ok', 5000);
        if (typeof r.carpetaMovida === 'string') K.aviso('Se guardó, pero la carpeta de Drive no se pudo mover: ' + r.carpetaMovida, 'aviso', 9000);
        volverAFicha(e);
      });
    });
  }

  function pintarHistorial(cuerpo, h) {
    if (!h || !h.length) return;
    var g = K.nodo('<section class="kit-tarjeta grupo gs-hist"><h3 class="grupo__t">' + K.icono('reloj', 16) + ' Cambios anteriores</h3></section>');
    h.forEach(function (x) {
      var es = x.motivo === 'OTROSI';
      var it = K.nodo('<article class="gs-hist__i">' +
        '<p class="gs-hist__cab"><span class="gs-hist__m' + (es ? ' gs-hist__m--otrosi' : '') + '">' + (es ? 'OTROSÍ' : 'CORRECCIÓN') + '</span>' +
        '<span>' + K.esc(x.fecha) + ' · ' + K.esc(nombre(x.quien)) + '</span></p>' +
        '<ul>' + (x.cambios || []).map(function (c) {
          return '<li><b>' + K.esc(c.titulo) + ':</b> ' + K.esc(corto(c.antes, 60)) + ' → ' + K.esc(corto(c.despues, 60)) + '</li>';
        }).join('') + '</ul>' +
        (es && x.aviso ? '<p class="gs-hist__aviso">Aviso: ' + K.esc(x.aviso) + '</p>' : '') +
        '</article>');
      g.appendChild(it);
    });
    cuerpo.appendChild(g);
  }

  /* ══════════════ fechas ══════════════ */

  function fechaDe(s) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || ''));
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }
  function dmy(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function masMeses(d, n) {
    var t = d.getMonth() + n, y = d.getFullYear() + Math.floor(t / 12), m = ((t % 12) + 12) % 12;
    return new Date(y, m, Math.min(d.getDate(), new Date(y, m + 1, 0).getDate()));
  }
  /** Igual que FC_plazoContrato_ del CORE: cuenta los dos extremos. */
  function plazoEntre(ini, fin) {
    if (!ini || !fin || fin < ini) return { meses: 0, dias: 0 };
    var cur = new Date(ini.getTime()), resto = Math.round((fin - ini) / 864e5) + 1, meses = 0, dias = 0;
    while (resto > 0) {
      var enEste = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      if (resto >= enEste) { meses++; resto -= enEste; cur.setMonth(cur.getMonth() + 1); }
      else { dias = resto; resto = 0; }
    }
    return { meses: meses, dias: dias };
  }
  function tiempo(m, d) {
    var t = [];
    if (m) t.push(m + (m === 1 ? ' mes' : ' meses'));
    if (d) t.push(d + (d === 1 ? ' día' : ' días'));
    return t.join(' y ') || '0 días';
  }

  window.GESTION = {
    configurar: configurar, agregar: agregar, adicion: adicion, cesion: cesion, suspension: suspension, editar: editar,
    /* para las pruebas y la ayuda */
    _letras: letras, _partir: partirObligaciones, _particion: particion, _plazo: plazoEntre, _ultima: function () { return ULTIMA; }, _cambios: cambiosDe
  };
}());
