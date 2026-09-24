/* ============================================================
   AYUDA (Insights) DE CONTRATISTAS · archivo compartido
   Ecosistema Flandes · Fase 10, entrega 10.2
   El MISMO archivo va en CONTRATACION-FLANDES y en ADMIN-FLANDES: las
   guías de la lista, la ficha, agregar, adición, cesión, suspensión,
   editar y la CARGA MASIVA. Cada ayuda.js las suma a las suyas con
   AYUDA_CONTRATOS.sumar(GUIAS, TITULOS). Nada viaja al servidor.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  function nombre(s) {
    var t = K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || '');
    return t.replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
            .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }
  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }
  function CT() { return window.CONTRATISTAS || null; }
  function todas() { return CT() ? CT().todas() : []; }
  function top(filas, campo, n) {
    var m = {};
    filas.forEach(function (f) { var v = f[campo] || 'SIN DATO'; m[v] = (m[v] || 0) + 1; });
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, n || 99)
      .map(function (k) { return { k: k, n: m[k] }; });
  }
  function sinFecha(filas) {
    return filas.filter(function (f) { return f.estado === 'ACTIVO' && (!f.inicio || !f.fin); });
  }
  function listaCorta(filas, fmt, max) {
    max = max || 8;
    var t = filas.slice(0, max).map(fmt).join('\n');
    if (filas.length > max) t += '\n… y ' + (filas.length - max) + ' más.';
    return t;
  }

  var GUIAS = {
    contratistas: function () {
      return {
        guia: 'Aquí están todos los contratos. Empiezas viendo los **activos**; con las pastillas cambias a inactivos o todos, ' +
              'sumas **adicionados** o **cedidos**, y eliges secretaría y supervisor. El número de cada pastilla es lo que verás al tocarla. ' +
              'El buscador encuentra por nombre, contrato, secretaría o supervisor, y por documento desde 6 cifras.',
        botones: [
          { texto: '¿Qué estoy viendo?', responde: function (f) {
              var c = CT();
              return 'Estás viendo **' + f.length + '** ' + (f.length === 1 ? 'contrato' : 'contratos') + ': ' + (c ? c._filtros() : '') + '.';
            } },
          { texto: '¿Por supervisor?', responde: function (f) {
              var s = top(f, 'sup', 12);
              if (!s.length) return 'No hay contratos en pantalla.';
              return 'De lo que tienes en pantalla, por supervisor(a):\n' + s.map(function (x) { return '· ' + nombre(x.k) + ': **' + x.n + '**'; }).join('\n');
            } },
          { texto: '¿A quién le faltan fechas?', responde: function (f) {
              var s = sinFecha(f);
              if (!s.length) return 'Todos los activos en pantalla tienen fecha de inicio y de terminación.';
              return 'Activos en pantalla sin fecha de inicio o de terminación (sin ellas no se generan sus formatos):\n' +
                listaCorta(s, function (x) { return '· **' + nombre(x.nombre) + '** — contrato ' + x.contrato; });
            } },
          { texto: '¿Los que tienen varios contratos?', responde: function () {
              var m = {};
              todas().forEach(function (x) { (m[x.doc] = m[x.doc] || []).push(x); });
              var varios = Object.keys(m).filter(function (d) { return m[d].length > 1; });
              if (!varios.length) return 'Nadie tiene más de un contrato.';
              return '**' + varios.length + '** contratistas tienen más de un contrato. Cada contrato es una tarjeta aparte y abre su propia ficha:\n' +
                listaCorta(varios, function (d) {
                  return '· **' + nombre(m[d][0].nombre) + '** — ' + m[d].map(function (x) { return x.contrato + ' (' + x.estado.toLowerCase() + ')'; }).join(', ');
                });
            } }
        ],
        filas: function () { return CT() ? CT()._visibles() : []; },
        filtros: function () { return CT() ? CT()._filtros() : ''; },
        medidas: [
          { titulo: 'Contratos', calcula: function (f) { return f.length; } },
          { titulo: 'Activos', calcula: function (f) { return f.filter(function (x) { return x.estado === 'ACTIVO'; }).length; } },
          { titulo: 'Adicionados', calcula: function (f) { return f.filter(function (x) { return x.adic; }).length; } }
        ]
      };
    },

    contratista: function () {
      return {
        guia: 'Es la ficha de un contrato: la misma información que el contratista ve en su app, más sus datos personales y de pago. ' +
              'Si arriba sale el aviso amarillo, al contratista le faltan datos del contrato y sus formatos no salen completos.',
        botones: [
          { texto: '¿Qué le falta a este contrato?', responde: function () {
              var d = CT() ? CT()._ficha() : null;
              if (!d) return 'La ficha todavía está cargando.';
              var c = d.contrato || {}, p = d.datos || {}, falta = [];
              if (!c.numProceso) falta.push('N° de proceso SECOP II');
              if (!c.fechaInicio) falta.push('fecha de inicio');
              if (!c.fechaTermino) falta.push('fecha de terminación');
              if (!c.rp) falta.push('RP');
              if (!c.regimen) falta.push('régimen simple');
              if (!c.factura) falta.push('factura electrónica');
              if (!c.costos) falta.push('costos y deducciones');
              if (!p.firma) falta.push('firma');
              if (!p.numeroCuenta || !p.banco) falta.push('cuenta bancaria');
              if (!p.eps || !p.arl) falta.push('EPS o ARL');
              if (!falta.length) return 'No le falta nada: el contrato y sus datos están completos.';
              return 'Le falta: **' + falta.join(', ') + '**. Lo diligencia el contratista desde su app (DATOS DEL CONTRATO y DATOS PERSONALES).';
            } },
          { texto: '¿Tiene otros contratos?', responde: function () {
              var d = CT() ? CT()._ficha() : null;
              if (!d || !d.datos) return 'La ficha todavía está cargando.';
              var doc = String(d.datos.documento || '').replace(/\D/g, '');
              var otros = todas().filter(function (x) { return x.doc === doc && x.id !== d.idContrato; });
              if (!otros.length) return 'No: este es su único contrato.';
              return 'Sí, tiene ' + otros.length + ' más:\n' + otros.map(function (x) {
                return '· Contrato **' + x.contrato + '** — ' + nombre(x.sec) + ' (' + x.estado.toLowerCase() + ')';
              }).join('\n');
            } }
        ]
      };
    }
  };

  /* ══════════════ 5.2 · agregar, adición, cesión y suspensión ══════════════ */
  function ULT() { return (window.GESTION && window.GESTION._ultima()) || {}; }
  function pesos52(v) { return '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO'); }

  GUIAS.agregar = function () {
    return {
      guia: 'Primero **el documento**: la app te dice si es una persona nueva, alguien que ya trabajó con la Alcaldía (se traen sus datos y su contraseña) o alguien con contrato **activo** (solo se deja en otra secretaría). Después llenas el contrato; el valor en letras y el conteo de obligaciones salen solos.',
      botones: [
        { texto: '¿Cómo pego las obligaciones?', responde: function () {
            return 'Cópialas del clausulado **con su numeración** (1. 2. 3. …). La app las separa por el número, no por los saltos de línea, y te muestra cuántas contó antes de guardar. Máximo 26.';
          } },
        { texto: '¿Qué valida el CDP?', responde: function () {
            return 'Que tenga **10 dígitos**, que empiece por el año de la vigencia y que **no esté usado** en ningún otro contrato (ni como CDP inicial ni de adición). Escribes solo el final: el año lo pone la app.';
          } },
        { texto: '¿Qué le llega al contratista?', responde: function () {
            return 'Si es nuevo, su **contraseña** por WhatsApp (se guarda cifrada) y el aviso del contrato. Si ya había trabajado, solo el aviso: conserva la contraseña que tenía.';
          } }
      ]
    };
  };

  GUIAS.adicion = function () {
    return {
      guia: 'La app decide si es la **1ª o la 2ª** adición. La 2ª va en su propia columna y ya no pisa el valor de la 1ª. Los informes del contrato inicial se **congelan** y se guarda el **total acumulado** (como ya lo tenía la hoja).',
      botones: [
        { texto: '¿Cuánto se puede adicionar?', responde: function () {
            var c = ULT().contrato || {}, inf = c.informes || {};
            if (!c.valorInicial) return 'Hasta el **50 %** del valor inicial, sumando las dos adiciones.';
            return 'Hasta el **50 %** del valor inicial (' + pesos52(c.valorInicial) + '): el tope total es **' + pesos52(c.valorInicial / 2) + '**' +
              (c.adicion1 ? ' y ya tiene ' + pesos52(c.adicion1) + ' en la 1ª' : '') + '.';
          } },
        { texto: '¿Cuántos informes quedan?', responde: function () {
            var c = ULT().contrato || {}, inf = c.informes || {};
            if (!inf.primario) return 'Todavía no hay informes congelados: los pones tú en el formulario.';
            return 'Primario **' + inf.primario + '**' + (inf.adicion1 ? ' + 1ª adición **' + inf.adicion1 + '**' : '') +
              (inf.adicion2 ? ' + 2ª **' + inf.adicion2 + '**' : '') + ' = **' + inf.total + '** informes.';
          } },
        { texto: '¿Y si me equivoqué?', responde: function () {
            var c = ULT().contrato || {}, inf = c.informes || {};
            return 'Usa **Corregir la última adición**: reescribe esa misma adición (no crea otra) y vuelve a avisar al contratista.';
          } }
      ]
    };
  };

  GUIAS.cesion = function () {
    return {
      guia: 'Desde la 10.2 el cesionario entra como **contratista nuevo**: su propia fila, su informe 1, sus datos bancarios y del RUT. ' +
            'El plazo, el **valor** y los **informes** se parten entre los dos: lo ya cobrado es del cedente y el mes partido cuenta para los dos. Puedes ajustar la propuesta antes de guardar.',
      botones: [
        { texto: '¿Cómo se parte el contrato?', responde: function () {
            var c = ULT().contrato || {}, p = c.particion || {};
            if (!p.valorTotal) return 'Elige el inicio del cesionario y la propuesta sale en el formulario.';
            return 'Contrato de **' + pesos52(p.valorTotal) + '** en **' + p.totalInformes + '** informes. El cedente ya radicó **' + p.cuentasHechas + '** cuentas y cobró **' +
              pesos52(p.cobrado) + '**: eso es suyo sí o sí. Lo demás se reparte por el tiempo de cada uno (meses de 30 días).';
          } },
        { texto: '¿Qué pasa con las cuentas del cedente?', responde: function () {
            return 'Se quedan **con él**, con su nombre y su documento. Su plazo termina el día antes del cesionario; si le queda un periodo partido, radica una cuenta más con su propia fila.';
          } },
        { texto: '¿Y el RP de la cesión?', responde: function () {
            return 'Lo pone el **cesionario en su cuenta** (campo obligatorio en su app) hasta que Contabilidad lo use en una orden de pago. El RP original del contrato **no se toca**.';
          } },
        { texto: '¿Por qué no me deja ceder?', responde: function () {
            var c = ULT().contrato || {};
            var ab = c.abiertas || [];
            if (!c.fechaInicio || !c.fechaFinal) return 'Faltan las fechas del acta de inicio: sin ellas no se puede partir el plazo.';
            if (!ab.length) return 'Sí se puede: no tiene cuentas a medio camino.';
            return 'Tiene ' + ab.map(function (x) { return 'la cuenta ' + x.informe + ' en ' + x.estado; }).join(', ') +
              '. Hasta que llegue al plan de pagos (**CERRADA**) quedaría entre dos personas.';
          } }
      ]
    };
  };

  GUIAS.suspension = function () {
    return {
      guia: 'Escribe el **tiempo total** que el contrato estuvo suspendido. La fecha final se corre lo mismo y el tiempo de ejecución queda en lo **realmente ejecutado**. Con 0 y 0 se quita.',
      botones: [
        { texto: '¿Por qué el total y no lo nuevo?', responde: function () {
            return 'Porque así no se suma dos veces si alguien guarda lo mismo otra vez: la app compara con lo que ya tenía y mueve la fecha solo la diferencia.';
          } }
      ]
    };
  };

  /* 5.5 · editar: corrección u OTROSÍ */
  GUIAS.editar = function () {
    return {
      guia: 'Cambia lo que haga falta y guarda. **Sin marcar la casilla** es una corrección: queda registrado quién cambió qué y cuándo. **Con la casilla OTROSÍ** además le llega un aviso al contratista para que adjunte el OTROSÍ (del SECOP II) en su próxima cuenta.',
      botones: [
        { texto: '¿Por qué no puedo cambiar el nombre o el número?', responde: function () {
            return 'Cambiar de persona es una CESIÓN (tiene su propio botón). El N° de contrato y el documento forman la llave con la que el contrato se une a sus cuentas: si cambian, las cuentas quedarían huérfanas.';
          } },
        { texto: '¿Qué pasa si cambio el supervisor?', responde: function () {
            return 'Queda el nuevo con su grupo de WhatsApp, y las cuentas que todavía no llegan al plan de pagos pasan a él. Las cerradas se quedan con quien las revisó.';
          } },
        { texto: '¿Y si otra persona lo está editando?', responde: function () {
            return 'Si alguien guarda antes que tú, la app no deja pisar su cambio: te pide volver a abrir el contrato para ver lo que hay ahora.';
          } }
      ]
    };
  };

  /* ══════════════ 10.2 · carga masiva ══════════════ */
  function MS() { return window.MASIVA ? window.MASIVA._ultimo() : {}; }
  GUIAS.masiva = function () {
    return {
      guia: 'Descarga la **plantilla**, llénala (una fila por contrato) y cárgala. Primero se **revisa** todo con las mismas reglas del alta de uno y **no se escribe nada**; después registras solo lo que pasó. ' +
            'Sin la casilla de avisos se registra **en silencio**.',
      botones: [
        { texto: '¿Qué revisa?', responde: function () {
            return 'Documento de 6 a 10 dígitos, nombre y apellido, N° de contrato que no exista, fecha de la vigencia, valor, **CDP** de 10 dígitos sin usar, objeto, al menos una obligación, y que la **secretaría** y el **supervisor** estén en la lista (hoja LISTAS de la plantilla). ' +
              'Dentro del mismo archivo tampoco se repiten contrato, CDP ni la misma persona en la misma secretaría.';
          } },
        { texto: '¿Cómo van las obligaciones?', responde: function () {
            return 'En la columna **OBLIGACIONES**, numeradas (1. 2. 3. …) en la misma celda, como se pegan del clausulado. También sirven columnas OBLIGACIÓN 1 a OBLIGACIÓN 26.';
          } },
        { texto: '¿Qué pasó con mi archivo?', responde: function () {
            var u = MS();
            if (u.resultado) {
              var ok = u.resultado.filter(function (x) { return x.ok; }).length;
              return 'Se registraron **' + ok + '** de ' + u.resultado.length + '.' + (u.resultado.length - ok ? ' Las demás tienen su motivo en la lista: corrígelas y vuelve a cargar el archivo.' : ' ✓');
            }
            if (u.revision) return '**' + u.revision.pasan + '** de ' + u.revision.filas.length + ' filas pasan la revisión. Todavía no se ha registrado nada.';
            return 'Todavía no has cargado un archivo.';
          } }
      ]
    };
  };

  var TITULOS = { contratistas: 'CONTRATISTAS', contratista: 'Ficha del contratista', agregar: 'Agregar contratista',
                  adicion: 'Adición', cesion: 'Cesión', suspension: 'Suspensión', editar: 'Editar contrato', masiva: 'Carga masiva' };

  window.AYUDA_CONTRATOS = {
    guias: GUIAS, titulos: TITULOS,
    sumar: function (g, t) {
      Object.keys(GUIAS).forEach(function (k) { if (!g[k]) g[k] = GUIAS[k]; });
      if (t) Object.keys(TITULOS).forEach(function (k) { if (!t[k]) t[k] = TITULOS[k]; });
    }
  };
}());
