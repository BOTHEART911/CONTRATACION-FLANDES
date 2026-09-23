# CONTRATACION-FLANDES

App de **Contratación** de la **Alcaldía de Flandes**. Ecosistema Flandes, Fase 5.

Publicada en GitHub Pages: https://botheart911.github.io/CONTRATACION-FLANDES/

## Qué hay aquí (hasta la entrega 5.1.1)

- Entrada por el FLANDES-CORE con documento y contraseña (roles CREADOR y REVISOR; el DEV entra a todo).
- Inicio con el resumen de los contratos (activos, adicionados, cedidos y activos por secretaría).
- CONTRATISTAS: la lista completa con pastillas de estado, adicionados, cedidos, secretaría y supervisor, buscador y 1, 2 o 3 tarjetas según el ancho.
- La ficha de cada contrato (contrato, plazo, plata, respaldos, cesión, datos personales, pago, seguridad social, firma y obligaciones).
- Botón Refrescar con la hora de la última carga, orden (A→Z, contrato más nuevo, termina primero), barra del plazo y documento que se copia al tocarlo.
- Soporte en el menú del perfil: se guarda en la hoja SOPORTE (la responde ADMIN) y avisa al grupo de desarrollo.
- Foto de perfil (la misma en las siete apps), Insights en todas las vistas, PWA instalable y modo oscuro.

## Estructura

```
index.html                  arma la página y carga el kit
js/                         el código propio de esta app
  marca.js                  LO ÚNICO que cambia al mover el CORE o replicar la app
  app.js                    arranque, enrutador e inicio
  contratistas.js           la lista y la ficha de los contratistas
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

---

Desarrollo: **Oscar Polania** · Experto en soluciones digitales
