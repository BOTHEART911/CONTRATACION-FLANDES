# CONTRATACION-FLANDES

App de **Contratación** de la **Alcaldía de Flandes**. Ecosistema Flandes, Fase 5.

Publicada en GitHub Pages: https://botheart911.github.io/CONTRATACION-FLANDES/

## Qué hay aquí (hasta la entrega 5.5)

- Entrada por el FLANDES-CORE con documento y contraseña (roles CREADOR y REVISOR; el DEV entra a todo).
- Inicio con el resumen de los contratos (activos, adicionados, cedidos y activos por secretaría).
- CONTRATISTAS: la lista completa con pastillas de estado, adicionados, cedidos, secretaría y supervisor, buscador y 1, 2 o 3 tarjetas según el ancho.
- La ficha de cada contrato (contrato, plazo, plata, respaldos, cesión, datos personales, pago, seguridad social, firma y obligaciones).
- Informes por tramo en la ficha: primario, 1ª adición y total por separado (5.1.2).
- Botón Refrescar con la hora de la última carga, orden (A→Z, contrato más nuevo, termina primero), barra del plazo y documento que se copia al tocarlo.
- Soporte en el menú del perfil: se guarda en la hoja SOPORTE (la responde ADMIN) y avisa al grupo de desarrollo.
- Agregar contratista, adición, cesión y suspensión (5.2).
- REVISAR CUENTAS (5.3): la lista de lo que el supervisor ya revisó (pastillas sin abrir / en revisión / vuelven corregidas, secretaría, buscador, Refrescar), el detalle en pestañas (Contrato, Pago, Planilla, Actividades, Bitácora) con el visor multidocumento y el carrusel con zoom de las evidencias, la bitácora de notas internas que se guarda sin decidir y se retoma, y la decisión (aprobar o devolver) que sale a nombre del supervisor.
- 5.4 · Los documentos de la revisión se bajan en segundo plano apenas se abre la cuenta (paquetes firmados, `js/docs-revision.js`): abrir uno o pasar al siguiente es inmediato y el revisor sigue sin necesitar permisos de Drive.
- REQUERIMIENTOS (5.4): pedirle algo a uno o a varios contratistas (máximo 20); queda guardado, llega por notificación y WhatsApp y se marca atendido. Pastillas, buscador y Refrescar.
- COMUNICADOS (5.4): publicar con documentos (Office se ve como PDF en el visor), aviso a los teléfonos, retirar y volver a publicar.
- REPORTE (5.4): cuentas aprobadas y devueltas por rango, con quién revisó de verdad (nunca el supervisor); PDF membretado y Excel.
- EDITAR CONTRATO (5.5): corregir secretaría, supervisor, tipo, fecha, valor inicial, CDP, objeto y obligaciones. Con la casilla OTROSÍ, al contratista le llega el aviso de adjuntar el OTROSÍ (SECOP II) en su próxima cuenta; sin ella es una corrección. Cada cambio queda con quién, qué y cuándo (historial en la misma vista).
- Foto de perfil (la misma en las siete apps), Insights en todas las vistas, PWA instalable y modo oscuro.

## Estructura

```
index.html                  arma la página y carga el kit
js/                         el código propio de esta app
  marca.js                  LO ÚNICO que cambia al mover el CORE o replicar la app
  app.js                    arranque, enrutador e inicio
  contratistas.js           la lista y la ficha de los contratistas
  gestion.js                agregar, adición, cesión y suspensión
  revision.js               revisar cuentas: lista, detalle, bitácora y decisión
  ayuda.js                  la guía de Insights de cada vista
styles.css                  la hoja de CONTRATISTA-FLANDES + el bloque de Contratación
manifest.json               PWA
version.js                  EN LA RAÍZ a propósito: los teléfonos preguntan aquí si hay versión nueva
sw.js                       EN LA RAÍZ a propósito: un service worker solo controla su carpeta y las de abajo
firebase-messaging-sw.js    EN LA RAÍZ por lo mismo: avisos con la app cerrada, en su propio scope
kit/                        las piezas compartidas, copia de KIT-FLANDES (solo las que esta app carga)
img/                        iconos propios de la PWA
```

## Al actualizar

`kit/` es una **copia** de [KIT-FLANDES](https://github.com/BOTHEART911/KIT-FLANDES).
No se edita aquí: se arregla allá y se vuelve a copiar, o las siete apps se separan.
Pendiente de llevar a KIT-FLANDES (5.4): `kit/visor.js` (bytes directos, un solo trabajador de pdf.js, `precalentar`) y `kit/exportar.js` (`subtitulo` y anchos medidos en mm).

---

Desarrollo: **Oscar Polania** · Experto en soluciones digitales
