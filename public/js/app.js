/* ==========================================================================
   SAZON EXPRESS - JavaScript (Fase 3: frontend + API REST)
   ========================================================================== */

(function () {
  "use strict";

  var API_URL = window.location.protocol === "file:"
    ? "http://localhost:3000/api"
    : window.location.origin + "/api";
  var STORAGE_CARRITO = "sazonExpressCarrito";
  var STORAGE_ULTIMO_PEDIDO = "sazonExpressUltimoPedido";
  var COSTO_ENVIO = 15;
  var temporizadorAviso;

  function formatoMoneda(valor) {
    return "Q" + Number(valor || 0).toFixed(2);
  }

  function escaparHTML(valor) {
    return String(valor == null ? "" : valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function categoriaLegible(categoria) {
    var nombres = {
      hamburguesas: "Hamburguesas",
      pizzas: "Pizzas",
      asados: "Asados",
      postres: "Postres",
      bebidas: "Bebidas"
    };
    return nombres[categoria] || categoria;
  }

  function obtenerCarrito() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_CARRITO)) || [];
    } catch (error) {
      return [];
    }
  }

  function guardarCarrito(carrito) {
    localStorage.setItem(STORAGE_CARRITO, JSON.stringify(carrito));
    actualizarBadgesCarrito();
  }

  function totalItemsCarrito() {
    return obtenerCarrito().reduce(function (total, item) {
      return total + Number(item.cantidad || 0);
    }, 0);
  }

  function actualizarBadgesCarrito() {
    var total = totalItemsCarrito();
    document.querySelectorAll(".badge").forEach(function (badge) {
      badge.textContent = String(total);
      badge.setAttribute("aria-label", total + " productos");
    });
  }

  function mostrarAviso(texto) {
    var aviso = document.getElementById("aviso");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "aviso";
      aviso.className = "toast";
      aviso.setAttribute("role", "status");
      aviso.setAttribute("aria-live", "polite");
      document.body.appendChild(aviso);
    }

    aviso.textContent = texto;
    void aviso.offsetWidth;
    aviso.classList.add("is-visible");
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () {
      aviso.classList.remove("is-visible");
    }, 2800);
  }

  function crearElemento(html) {
    var plantilla = document.createElement("template");
    plantilla.innerHTML = html.trim();
    return plantilla.content.firstElementChild;
  }

  async function obtenerJSON(ruta, opciones) {
    var respuesta = await fetch(API_URL + ruta, opciones);
    var cuerpo = await respuesta.json().catch(function () {
      return {};
    });

    if (!respuesta.ok || cuerpo.ok === false) {
      throw new Error(cuerpo.mensaje || "No se pudo completar la solicitud.");
    }

    return cuerpo.data;
  }

  function iniciarMenuMovil() {
    var boton = document.querySelector(".nav-toggle");
    var menu = document.getElementById("menu-principal");
    if (!boton || !menu) return;

    function alternar(abrir) {
      menu.classList.toggle("is-open", abrir);
      boton.setAttribute("aria-expanded", String(abrir));
      boton.setAttribute("aria-label", abrir ? "Cerrar menu de navegacion" : "Abrir menu de navegacion");
    }

    boton.addEventListener("click", function () {
      alternar(!menu.classList.contains("is-open"));
    });

    menu.addEventListener("click", function (evento) {
      if (evento.target.closest("a")) alternar(false);
    });

    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape") alternar(false);
    });
  }

  async function iniciarCatalogo() {
    var lista = document.querySelector(".product-grid");
    if (!lista) return;

    var mensajeVacio = document.getElementById("sin-resultados");
    var botones = document.querySelectorAll("[data-filtro]");

    lista.innerHTML = '<li class="empty-state">Cargando menu...</li>';

    try {
      var productos = await obtenerJSON("/productos");
      sincronizarCarritoConCatalogo(productos);
      renderizarCatalogo(lista, productos);
      activarFiltrosCatalogo(botones, lista, mensajeVacio);
    } catch (error) {
      lista.innerHTML = '<li class="empty-state">No se pudo cargar el menu. Revisa que el backend este encendido.</li>';
      mostrarAviso(error.message);
    }
  }

  function sincronizarCarritoConCatalogo(productos) {
    var catalogo = new Map(productos.map(function (producto) {
      return [Number(producto.id), producto];
    }));
    var carrito = obtenerCarrito().filter(function (item) {
      return catalogo.has(Number(item.id));
    }).map(function (item) {
      var producto = catalogo.get(Number(item.id));
      return {
        id: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precio),
        imagen_url: producto.imagen_url,
        cantidad: item.cantidad
      };
    });
    guardarCarrito(carrito);
  }

  function renderizarCatalogo(lista, productos) {
    lista.innerHTML = "";

    productos.forEach(function (producto) {
      lista.appendChild(
        crearElemento(
          '<li data-producto-id="' + Number(producto.id) + '" data-categoria="' + escaparHTML(producto.categoria) + '">' +
            '<article class="product-card">' +
              '<img class="product-card__img" src="' + escaparHTML(producto.imagen_url) + '" width="600" height="450" loading="lazy" alt="' + escaparHTML(producto.nombre) + '">' +
              '<div class="product-card__body">' +
                '<p class="product-card__cat">' + escaparHTML(categoriaLegible(producto.categoria)) + '</p>' +
                '<h3 class="product-card__title">' + escaparHTML(producto.nombre) + '</h3>' +
                '<p class="product-card__desc">' + escaparHTML(producto.descripcion) + '</p>' +
                '<p class="product-card__price">' + formatoMoneda(producto.precio) + '</p>' +
                '<div class="product-card__actions">' +
                  '<a class="btn btn--outline" href="producto.html?id=' + producto.id + '">Ver producto</a>' +
                  '<button class="btn btn--primary" type="button" data-agregar-carrito="' + producto.id + '">Agregar al carrito</button>' +
                '</div>' +
              '</div>' +
            '</article>' +
          '</li>'
        )
      );
    });
  }

  function activarFiltrosCatalogo(botones, lista, mensajeVacio) {
    if (!botones.length) return;

    botones.forEach(function (boton) {
      boton.addEventListener("click", function () {
        var filtro = boton.dataset.filtro;
        var visibles = 0;

        botones.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === boton));
        });

        lista.querySelectorAll("[data-categoria]").forEach(function (producto) {
          var coincide = filtro === "todos" || producto.dataset.categoria === filtro;
          producto.hidden = !coincide;
          if (coincide) visibles++;
        });

        if (mensajeVacio) mensajeVacio.hidden = visibles > 0;
      });
    });
  }

  async function iniciarDetalleProducto() {
    var detalle = document.querySelector(".product-detail");
    if (!detalle) return;

    var parametros = new URLSearchParams(window.location.search);
    var id = parametros.get("id") || detalle.dataset.productoId || "1";

    detalle.innerHTML = '<p class="empty-state">Cargando producto...</p>';

    try {
      var producto = await obtenerJSON("/productos/" + id);
      detalle.dataset.productoId = producto.id;
      detalle.innerHTML =
        '<img class="product-detail__img" src="' + escaparHTML(producto.imagen_url) + '" width="600" height="450" alt="' + escaparHTML(producto.nombre) + '">' +
        '<div class="product-detail__info">' +
          '<p class="product-detail__cat">' + escaparHTML(categoriaLegible(producto.categoria)) + '</p>' +
          '<h1>' + escaparHTML(producto.nombre) + '</h1>' +
          '<p class="product-detail__price">' + formatoMoneda(producto.precio) + '</p>' +
          '<p>' + escaparHTML(producto.descripcion) + '</p>' +
          '<ul class="product-detail__list">' +
            '<li>Preparado al momento</li>' +
            '<li>Disponible para entrega a domicilio</li>' +
            '<li>Precio actualizado desde la base de datos</li>' +
          '</ul>' +
          '<div class="product-detail__buy">' +
            '<div class="qty">' +
              '<button class="qty__btn" type="button" data-qty="menos" aria-label="Disminuir cantidad">-</button>' +
              '<input class="qty__input" id="cantidad" type="number" value="1" min="1" max="20" inputmode="numeric" aria-label="Cantidad">' +
              '<button class="qty__btn" type="button" data-qty="mas" aria-label="Aumentar cantidad">+</button>' +
            '</div>' +
            '<button class="btn btn--primary btn--lg" type="button" data-agregar-carrito="' + producto.id + '">Agregar al carrito</button>' +
          '</div>' +
        '</div>';
      iniciarSelectoresCantidad(detalle);
    } catch (error) {
      detalle.innerHTML = '<p class="empty-state">No se pudo cargar el producto.</p>';
      mostrarAviso(error.message);
    }
  }

  async function agregarProductoAlCarrito(productoId, cantidad) {
    var producto = await obtenerJSON("/productos/" + productoId);
    var carrito = obtenerCarrito();
    var existente = carrito.find(function (item) {
      return Number(item.id) === Number(producto.id);
    });

    if (existente) {
      existente.cantidad = Math.min(20, Number(existente.cantidad) + cantidad);
      existente.nombre = producto.nombre;
      existente.precio = Number(producto.precio);
      existente.imagen_url = producto.imagen_url;
    } else {
      carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precio),
        imagen_url: producto.imagen_url,
        cantidad: cantidad
      });
    }

    guardarCarrito(carrito);
    mostrarAviso("Producto agregado al carrito.");
  }

  function iniciarAccionesCarritoGlobales() {
    document.addEventListener("click", function (evento) {
      var botonAgregar = evento.target.closest("[data-agregar-carrito]");
      if (!botonAgregar) return;

      var contenedor = botonAgregar.closest(".product-detail") || document;
      var inputCantidad = contenedor.querySelector(".qty__input");
      var cantidad = inputCantidad ? Number(inputCantidad.value) || 1 : 1;

      agregarProductoAlCarrito(botonAgregar.dataset.agregarCarrito, cantidad).catch(function (error) {
        mostrarAviso(error.message);
      });
    });
  }

  function iniciarSelectoresCantidad(raiz) {
    (raiz || document).querySelectorAll(".qty").forEach(function (selector) {
      if (selector.dataset.qtyReady === "true") return;
      selector.dataset.qtyReady = "true";

      var campo = selector.querySelector(".qty__input");
      if (!campo) return;

      var minimo = parseInt(campo.min, 10) || 1;
      var maximo = parseInt(campo.max, 10) || 99;

      function fijar(valor) {
        if (isNaN(valor)) valor = minimo;
        campo.value = Math.min(maximo, Math.max(minimo, valor));
        campo.dispatchEvent(new Event("cantidad:cambio", { bubbles: true }));
      }

      selector.addEventListener("click", function (evento) {
        var boton = evento.target.closest("[data-qty]");
        if (!boton) return;
        var actual = parseInt(campo.value, 10) || minimo;
        fijar(boton.dataset.qty === "mas" ? actual + 1 : actual - 1);
      });

      campo.addEventListener("change", function () {
        fijar(parseInt(campo.value, 10));
      });
    });
  }

  function calcularTotales(carrito) {
    var subtotal = carrito.reduce(function (total, item) {
      return total + Number(item.precio) * Number(item.cantidad);
    }, 0);
    var envio = carrito.length > 0 ? COSTO_ENVIO : 0;

    return {
      subtotal: subtotal,
      envio: envio,
      total: subtotal + envio
    };
  }

  function iniciarPaginaCarrito() {
    var lista = document.querySelector(".cart-list");
    var resumen = document.querySelector(".summary");
    if (!lista || !resumen || !document.body.textContent.includes("Tu carrito")) return;

    renderizarCarrito(lista, resumen);

    lista.addEventListener("click", function (evento) {
      var quitar = evento.target.closest("[data-eliminar-carrito]");
      if (!quitar) return;

      var id = Number(quitar.dataset.eliminarCarrito);
      guardarCarrito(obtenerCarrito().filter(function (item) {
        return Number(item.id) !== id;
      }));
      renderizarCarrito(lista, resumen);
      mostrarAviso("Producto eliminado del carrito.");
    });

    lista.addEventListener("cantidad:cambio", function (evento) {
      var item = evento.target.closest(".cart-item");
      if (!item) return;

      var id = Number(item.dataset.productoId);
      var cantidad = Number(item.querySelector(".qty__input").value) || 1;
      var carrito = obtenerCarrito().map(function (producto) {
        if (Number(producto.id) === id) producto.cantidad = cantidad;
        return producto;
      });

      guardarCarrito(carrito);
      renderizarCarrito(lista, resumen);
    });
  }

  function renderizarCarrito(lista, resumen) {
    var carrito = obtenerCarrito();

    if (carrito.length === 0) {
      lista.innerHTML = '<li class="empty-state">Tu carrito esta vacio. Agrega productos desde el menu.</li>';
      resumen.innerHTML =
        '<h2 id="resumen-titulo">Resumen del pedido</h2>' +
        '<p class="summary__row"><span>Subtotal</span> <span>Q0.00</span></p>' +
        '<p class="summary__row"><span>Costo de envio</span> <span>Q0.00</span></p>' +
        '<p class="summary__row summary__row--total"><span>Total</span> <span>Q0.00</span></p>' +
        '<a class="btn btn--primary btn--lg btn--block" href="index.html#menu">Ir al menu</a>';
      return;
    }

    lista.innerHTML = "";
    carrito.forEach(function (item) {
      lista.appendChild(
        crearElemento(
          '<li>' +
            '<article class="cart-item" data-producto-id="' + item.id + '">' +
              '<img class="cart-item__img" src="' + escaparHTML(item.imagen_url) + '" width="88" height="88" alt="' + escaparHTML(item.nombre) + '">' +
              '<div class="cart-item__info">' +
                '<h2 class="cart-item__name">' + escaparHTML(item.nombre) + '</h2>' +
                '<p class="cart-item__unit">' + formatoMoneda(item.precio) + ' c/u</p>' +
              '</div>' +
              '<button class="cart-item__remove" type="button" data-eliminar-carrito="' + item.id + '" aria-label="Eliminar ' + escaparHTML(item.nombre) + ' del carrito">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>' +
              '</button>' +
              '<div class="qty">' +
                '<button class="qty__btn" type="button" data-qty="menos" aria-label="Disminuir cantidad">-</button>' +
                '<input class="qty__input" type="number" value="' + item.cantidad + '" min="1" max="20" inputmode="numeric" aria-label="Cantidad">' +
                '<button class="qty__btn" type="button" data-qty="mas" aria-label="Aumentar cantidad">+</button>' +
              '</div>' +
              '<p class="cart-item__total">' + formatoMoneda(item.precio * item.cantidad) + '</p>' +
            '</article>' +
          '</li>'
        )
      );
    });

    iniciarSelectoresCantidad(lista);
    renderizarResumen(resumen, carrito, true);
  }

  function renderizarResumen(resumen, carrito, permitirContinuar) {
    var totales = calcularTotales(carrito);
    var boton = permitirContinuar
      ? '<a class="btn btn--primary btn--lg btn--block" href="checkout.html">Continuar</a><a class="btn btn--outline btn--block" href="index.html#menu">Seguir comprando</a>'
      : '<button class="btn btn--primary btn--lg btn--block" type="submit" form="form-checkout">Confirmar pedido</button><a class="btn btn--outline btn--block" href="carrito.html">Volver al carrito</a>';

    resumen.innerHTML =
      '<h2 id="resumen-titulo">Resumen del pedido</h2>' +
      '<p class="summary__row"><span>Subtotal</span> <span>' + formatoMoneda(totales.subtotal) + '</span></p>' +
      '<p class="summary__row"><span>Costo de envio</span> <span>' + formatoMoneda(totales.envio) + '</span></p>' +
      '<p class="summary__row summary__row--total"><span>Total</span> <span>' + formatoMoneda(totales.total) + '</span></p>' +
      boton;
  }

  function iniciarCheckout() {
    var formulario = document.getElementById("form-checkout");
    var resumen = document.querySelector(".summary");
    if (!formulario || !resumen) return;

    renderizarCheckoutResumen(resumen, obtenerCarrito());

    formulario.addEventListener("submit", async function (evento) {
      evento.preventDefault();

      var carritoActual = obtenerCarrito();
      if (carritoActual.length === 0) {
        mostrarAviso("Agrega productos antes de confirmar el pedido.");
        window.location.href = "index.html#menu";
        return;
      }

      var datos = new FormData(formulario);
      var pedido = {
        usuario: {
          nombre: String(datos.get("nombre") || "").trim(),
          correo: String(datos.get("correo") || "").trim(),
          telefono: String(datos.get("telefono") || "").trim(),
          direccion: String(datos.get("direccion") || "").trim()
        },
        metodo_pago: String(datos.get("metodo_pago") || "efectivo"),
        items: carritoActual.map(function (item) {
          return {
            producto_id: item.id,
            cantidad: item.cantidad
          };
        })
      };

      try {
        var boton = resumen.querySelector('button[type="submit"]');
        if (boton) {
          boton.disabled = true;
          boton.textContent = "Enviando pedido...";
        }

        var data = await obtenerJSON("/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pedido)
        });
        localStorage.setItem(
          STORAGE_ULTIMO_PEDIDO,
          JSON.stringify({
            id: data.id,
            total: data.total,
            subtotal: data.subtotal,
            envio: data.envio,
            metodo_pago: data.metodo_pago,
            correo: pedido.usuario.correo,
            detalles: carritoActual
          })
        );
        guardarCarrito([]);
        window.location.href = "pedido-confirmado.html";
      } catch (error) {
        mostrarAviso(error.message);
        renderizarCheckoutResumen(resumen, carritoActual);
      }
    });
  }

  function renderizarCheckoutResumen(resumen, carrito) {
    if (carrito.length === 0) {
      resumen.innerHTML =
        '<h2 id="resumen-titulo">Resumen del pedido</h2>' +
        '<p class="empty-state">Tu carrito esta vacio.</p>' +
        '<a class="btn btn--primary btn--lg btn--block" href="index.html#menu">Ir al menu</a>';
      return;
    }

    resumen.innerHTML =
      '<h2 id="resumen-titulo">Resumen del pedido</h2>' +
      renderizarMiniLista(carrito) +
      '<div data-resumen-totales></div>';

    renderizarResumen(resumen.querySelector("[data-resumen-totales]"), carrito, false);
  }

  function renderizarMiniLista(items) {
    return (
      '<ul class="mini-list">' +
      items.map(function (item) {
        return (
          '<li class="mini-item">' +
            '<img src="' + escaparHTML(item.imagen_url) + '" width="52" height="52" alt="">' +
            '<div>' +
              '<p class="mini-item__name">' + escaparHTML(item.nombre) + '</p>' +
              '<p class="mini-item__qty">Cantidad: ' + item.cantidad + '</p>' +
            '</div>' +
            '<p class="mini-item__price">' + formatoMoneda(item.precio * item.cantidad) + '</p>' +
          '</li>'
        );
      }).join("") +
      '</ul>'
    );
  }

  function iniciarConfirmacion() {
    var confirmacion = document.querySelector(".confirm");
    if (!confirmacion) return;

    var pedido = null;
    try {
      pedido = JSON.parse(localStorage.getItem(STORAGE_ULTIMO_PEDIDO));
    } catch (error) {
      pedido = null;
    }

    if (!pedido) return;

    confirmacion.querySelector(".confirm__facts").innerHTML =
      '<div class="confirm__fact">' +
        '<dt>Numero de pedido</dt>' +
        '<dd>#SE-' + String(pedido.id).padStart(6, "0") + '</dd>' +
      '</div>' +
      '<div class="confirm__fact">' +
        '<dt>Tiempo estimado de entrega</dt>' +
        '<dd>35-45 minutos</dd>' +
      '</div>';

    confirmacion.querySelector(".confirm__summary").innerHTML =
      '<h2>Resumen de tu compra</h2>' +
      renderizarMiniLista(pedido.detalles) +
      '<p class="summary__row"><span>Subtotal</span> <span>' + formatoMoneda(pedido.subtotal) + '</span></p>' +
      '<p class="summary__row"><span>Costo de envio</span> <span>' + formatoMoneda(pedido.envio) + '</span></p>' +
      '<p class="summary__row summary__row--total"><span>Total</span> <span>' + formatoMoneda(pedido.total) + '</span></p>';

    var enlaceSeguimiento = document.getElementById("btn-seguimiento");
    if (enlaceSeguimiento) enlaceSeguimiento.href = "seguimiento.html?id=" + pedido.id;
  }

  document.addEventListener("DOMContentLoaded", function () {
    iniciarMenuMovil();
    iniciarSelectoresCantidad();
    iniciarAccionesCarritoGlobales();
    actualizarBadgesCarrito();
    iniciarCatalogo();
    iniciarDetalleProducto();
    iniciarPaginaCarrito();
    iniciarCheckout();
    iniciarConfirmacion();
  });
})();
