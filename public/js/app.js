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
  var STORAGE_SESION = "sazonExpressSesion";
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

  function obtenerSesion() {
    try { return JSON.parse(localStorage.getItem(STORAGE_SESION)) || null; } catch (error) { return null; }
  }

  function guardarSesion(sesion) {
    localStorage.setItem(STORAGE_SESION, JSON.stringify(sesion));
    actualizarEnlaceCuenta();
  }

  function cerrarSesion() {
    localStorage.removeItem(STORAGE_SESION);
    actualizarEnlaceCuenta();
  }

  function opcionesAutenticadas(opciones) {
    var sesion = obtenerSesion();
    var opcionesFinales = opciones || {};
    opcionesFinales.headers = opcionesFinales.headers || {};
    if (sesion && sesion.token) opcionesFinales.headers.Authorization = "Bearer " + sesion.token;
    return opcionesFinales;
  }

  async function obtenerPerfil() {
    var perfil = await obtenerJSON("/usuarios/perfil", opcionesAutenticadas());
    var sesion = obtenerSesion() || {};
    guardarSesion({ token: sesion.token, cliente: perfil.cliente, direcciones: perfil.direcciones });
    return perfil;
  }

  function actualizarEnlaceCuenta() {
    var lista = document.querySelector(".nav__list");
    if (!lista) return;
    var item = lista.querySelector("[data-nav-cuenta]");
    var sesion = obtenerSesion();
    if (!item) {
      item = document.createElement("li");
      item.dataset.navCuenta = "";
      lista.insertBefore(item, lista.lastElementChild);
    }
    item.innerHTML = '<a href="cuenta.html">' + (sesion && sesion.cliente ? "Hola, " + escaparHTML(sesion.cliente.nombre.split(" ")[0]) : "Ingresar") + "</a>";
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
        precio: item.personalizacion ? Number(item.precio) : Number(producto.precio),
        imagen_url: producto.imagen_url,
        cantidad: item.cantidad,
        personalizacion: item.personalizacion || "",
        clave: item.clave || String(producto.id)
      };
    });
    guardarCarrito(carrito);
  }

  function renderizarCatalogo(lista, productos) {
    lista.innerHTML = "";
    var categorias = ["hamburguesas", "pizzas", "asados", "postres", "bebidas"];
    categorias.forEach(function (categoria) {
      var productosCategoria = productos.filter(function (producto) { return producto.categoria === categoria; });
      if (!productosCategoria.length) return;
      var producto = productosCategoria[0];
      lista.appendChild(
        crearElemento(
          '<li data-categoria="' + escaparHTML(categoria) + '">' +
            '<article class="product-card product-card--category">' +
              '<img class="product-card__img" src="' + escaparHTML(producto.imagen_url) + '" width="600" height="450" loading="lazy" alt="' + escaparHTML(producto.nombre) + '">' +
              '<div class="product-card__body">' +
                '<p class="product-card__cat">' + productosCategoria.length + ' opciones</p>' +
                '<h3 class="product-card__title">' + escaparHTML(categoriaLegible(categoria)) + '</h3>' +
                '<p class="product-card__desc">Explora nuestras ' + escaparHTML(categoriaLegible(categoria).toLowerCase()) + ' y elige tu favorita.</p>' +
                '<div class="product-card__actions">' +
                  '<a class="btn btn--primary" href="producto.html?categoria=' + encodeURIComponent(categoria) + '">Ver ' + escaparHTML(categoriaLegible(categoria).toLowerCase()) + '</a>' +
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
    var categoria = parametros.get("categoria");
    var id = parametros.get("id") || detalle.dataset.productoId || "1";

    detalle.innerHTML = '<p class="empty-state">Cargando producto...</p>';

    try {
      if (categoria) {
        var productos = await obtenerJSON("/productos");
        var disponibles = productos.filter(function (producto) { return producto.categoria === categoria; });
        if (!disponibles.length) throw new Error("No encontramos esta categoria.");
        document.title = categoriaLegible(categoria) + " | Sazon Express";
        detalle.classList.add("product-detail--category");
        detalle.innerHTML =
          '<div class="category-head"><p class="product-detail__cat">Menu</p><h1>' + escaparHTML(categoriaLegible(categoria)) + '</h1><p>Elige una opcion para verla y personalizarla.</p></div>' +
          '<ul class="product-grid product-grid--inside">' + disponibles.map(function (producto) {
            return '<li><article class="product-card"><img class="product-card__img" src="' + escaparHTML(producto.imagen_url) + '" alt="' + escaparHTML(producto.nombre) + '"><div class="product-card__body"><h2 class="product-card__title">' + escaparHTML(producto.nombre) + '</h2><p class="product-card__desc">' + escaparHTML(producto.descripcion) + '</p><p class="product-card__price">' + formatoMoneda(producto.precio) + '</p><a class="btn btn--primary" href="producto.html?id=' + producto.id + '">Elegir</a></div></article></li>';
          }).join("") + '</ul>';
        return;
      }
      var producto = await obtenerJSON("/productos/" + id);
      detalle.dataset.productoId = producto.id;
      detalle.innerHTML =
        '<img class="product-detail__img" src="' + escaparHTML(producto.imagen_url) + '" width="600" height="450" alt="' + escaparHTML(producto.nombre) + '">' +
        '<div class="product-detail__info">' +
          '<p class="product-detail__cat">' + escaparHTML(categoriaLegible(producto.categoria)) + '</p>' +
          '<h1>' + escaparHTML(producto.nombre) + '</h1>' +
          '<p class="product-detail__price">' + formatoMoneda(producto.precio) + '</p>' +
          '<p>' + escaparHTML(producto.descripcion) + '</p>' +
          (producto.categoria === "pizzas" ?
            '<fieldset class="product-options"><legend>Elige el tamano</legend><label><input type="radio" name="tamano" value="Mediana" data-recargo="0" checked> Mediana <span>Incluida</span></label><label><input type="radio" name="tamano" value="Grande" data-recargo="20"> Grande <span>+Q20.00</span></label><label><input type="radio" name="tamano" value="Familiar" data-recargo="35"> Familiar <span>+Q35.00</span></label><legend class="product-options__legend">Quitar ingredientes</legend><label><input type="checkbox" name="quitar" value="Queso"> Sin queso</label><label><input type="checkbox" name="quitar" value="Salsa de tomate"> Sin salsa de tomate</label><label><input type="checkbox" name="quitar" value="Cebolla"> Sin cebolla</label></fieldset>' : "") +
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

  async function agregarProductoAlCarrito(productoId, cantidad, personalizacion, recargo) {
    var producto = await obtenerJSON("/productos/" + productoId);
    var carrito = obtenerCarrito();
    var configuracion = personalizacion || "";
    var clave = String(producto.id) + "|" + configuracion;
    var existente = carrito.find(function (item) {
      return (item.clave || String(item.id)) === clave;
    });

    if (existente) {
      existente.cantidad = Math.min(20, Number(existente.cantidad) + cantidad);
      existente.nombre = producto.nombre;
      existente.precio = Number(producto.precio) + Number(recargo || 0);
      existente.imagen_url = producto.imagen_url;
    } else {
      carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precio) + Number(recargo || 0),
        imagen_url: producto.imagen_url,
        cantidad: cantidad,
        personalizacion: configuracion,
        clave: clave
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
      var opcionTamano = contenedor.querySelector('input[name="tamano"]:checked');
      var ingredientes = Array.from(contenedor.querySelectorAll('input[name="quitar"]:checked')).map(function (input) { return input.value; });
      var personalizacion = opcionTamano ? "Tamano: " + opcionTamano.value : "";
      if (ingredientes.length) personalizacion += (personalizacion ? " | " : "") + "Sin: " + ingredientes.join(", ");
      var recargo = opcionTamano ? Number(opcionTamano.dataset.recargo || 0) : 0;

      agregarProductoAlCarrito(botonAgregar.dataset.agregarCarrito, cantidad, personalizacion, recargo).catch(function (error) {
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

      var clave = quitar.dataset.eliminarCarrito;
      guardarCarrito(obtenerCarrito().filter(function (item) {
        return (item.clave || String(item.id)) !== clave;
      }));
      renderizarCarrito(lista, resumen);
      mostrarAviso("Producto eliminado del carrito.");
    });

    lista.addEventListener("cantidad:cambio", function (evento) {
      var item = evento.target.closest(".cart-item");
      if (!item) return;

      var clave = item.dataset.productoId;
      var cantidad = Number(item.querySelector(".qty__input").value) || 1;
      var carrito = obtenerCarrito().map(function (producto) {
        if ((producto.clave || String(producto.id)) === clave) producto.cantidad = cantidad;
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
            '<article class="cart-item" data-producto-id="' + escaparHTML(item.clave || String(item.id)) + '">' +
              '<img class="cart-item__img" src="' + escaparHTML(item.imagen_url) + '" width="88" height="88" alt="' + escaparHTML(item.nombre) + '">' +
              '<div class="cart-item__info">' +
                '<h2 class="cart-item__name">' + escaparHTML(item.nombre) + '</h2>' +
                '<p class="cart-item__unit">' + formatoMoneda(item.precio) + ' c/u</p>' +
                (item.personalizacion ? '<p class="cart-item__options">' + escaparHTML(item.personalizacion) + '</p>' : '') +
              '</div>' +
              '<button class="cart-item__remove" type="button" data-eliminar-carrito="' + escaparHTML(item.clave || String(item.id)) + '" aria-label="Eliminar ' + escaparHTML(item.nombre) + ' del carrito">' +
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
    prepararCheckout(formulario).catch(function (error) {
      formulario.innerHTML = '<h2>Inicia sesion para continuar</h2><p class="form-hint">Tu cuenta guarda tus datos y direcciones para futuros pedidos.</p><a class="btn btn--primary" href="cuenta.html?volver=checkout.html">Ingresar o crear cuenta</a>';
      if (obtenerSesion()) cerrarSesion();
    });

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
        direccion_id: Number(datos.get("direccion_id")),
        metodo_pago: String(datos.get("metodo_pago") || "efectivo"),
        items: carritoActual.map(function (item) {
          return {
            producto_id: item.id,
            cantidad: item.cantidad,
            personalizacion: item.personalizacion || ""
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
          headers: opcionesAutenticadas({ headers: { "Content-Type": "application/json" } }).headers,
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
            correo: (obtenerSesion().cliente || {}).correo,
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

  async function prepararCheckout(formulario) {
    var perfil = await obtenerPerfil();
    if (!perfil.direcciones.length) throw new Error("Agrega una direccion.");
    formulario.innerHTML =
      '<h2>Entrega para ' + escaparHTML(perfil.cliente.nombre) + '</h2>' +
      '<p class="form-hint">' + escaparHTML(perfil.cliente.telefono) + ' · ' + escaparHTML(perfil.cliente.correo) + '</p>' +
      '<fieldset class="form-field form-field--full"><legend>Elige una direccion guardada</legend><div class="address-options">' +
      perfil.direcciones.map(function (direccion) {
        return '<label class="address-option"><input type="radio" name="direccion_id" value="' + direccion.id + '"' + (direccion.predeterminada ? " checked" : "") + '><span><strong>' + escaparHTML(direccion.etiqueta) + '</strong><small>' + escaparHTML(direccion.direccion) + '</small></span></label>';
      }).join("") +
      '</div><a class="text-link" href="cuenta.html?volver=checkout.html">Administrar direcciones</a></fieldset>' +
      '<fieldset class="form-field form-field--full"><legend>Metodo de pago</legend><div class="pay-options"><label class="pay-option"><input type="radio" name="metodo_pago" value="efectivo" checked><div><strong>Efectivo contra entrega</strong><span>Paga al recibir tu pedido.</span></div></label><label class="pay-option"><input type="radio" name="metodo_pago" value="tarjeta"><div><strong>Tarjeta contra entrega</strong><span>El repartidor lleva el terminal.</span></div></label><label class="pay-option"><input type="radio" name="metodo_pago" value="transferencia"><div><strong>Transferencia bancaria</strong><span>Recibiras los datos al confirmar.</span></div></label></div></fieldset>';
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
            (item.personalizacion ? '<p class="mini-item__qty">' + escaparHTML(item.personalizacion) + '</p>' : '') +
            '</div>' +
            '<p class="mini-item__price">' + formatoMoneda(item.precio * item.cantidad) + '</p>' +
          '</li>'
        );
      }).join("") +
      '</ul>'
    );
  }

  function iniciarCuenta() {
    var pagina = document.querySelector(".account-page");
    if (!pagina) return;
    var volver = new URLSearchParams(window.location.search).get("volver") || "index.html";
    var sesion = obtenerSesion();

    if (sesion) {
      renderizarPerfilCuenta(pagina, volver);
      return;
    }

    pagina.innerHTML =
      '<div class="account-grid"><form class="form-card" id="form-login"><h1>Bienvenido de nuevo</h1><p class="form-hint">Ingresa para usar tus datos y direcciones guardadas.</p><div class="form-grid"><div class="form-field form-field--full"><label for="login-correo">Correo electronico</label><input id="login-correo" name="correo" type="email" required autocomplete="email"></div><div class="form-field form-field--full"><label for="login-password">Contrasena</label><input id="login-password" name="password" type="password" required autocomplete="current-password"></div></div><button class="btn btn--primary btn--block" type="submit">Ingresar</button></form>' +
      '<form class="form-card" id="form-registro"><h2>Crea tu cuenta</h2><p class="form-hint">Guardaremos estos datos para que tu proximo pedido sea mucho mas rapido.</p><div class="form-grid"><div class="form-field form-field--full"><label for="registro-nombre">Nombre completo</label><input id="registro-nombre" name="nombre" required autocomplete="name"></div><div class="form-field"><label for="registro-correo">Correo</label><input id="registro-correo" name="correo" type="email" required autocomplete="email"></div><div class="form-field"><label for="registro-telefono">Telefono</label><input id="registro-telefono" name="telefono" type="tel" required autocomplete="tel"></div><div class="form-field"><label for="registro-etiqueta">Nombre de direccion</label><input id="registro-etiqueta" name="etiqueta" placeholder="Casa, trabajo..." required></div><div class="form-field"><label for="registro-password">Contrasena</label><input id="registro-password" name="password" type="password" minlength="8" required autocomplete="new-password"></div><div class="form-field form-field--full"><label for="registro-direccion">Direccion de entrega</label><textarea id="registro-direccion" name="direccion" rows="3" required autocomplete="street-address"></textarea></div></div><button class="btn btn--primary btn--block" type="submit">Crear cuenta</button></form></div>';

    pagina.querySelector("#form-login").addEventListener("submit", function (evento) {
      enviarAcceso(evento.currentTarget, "/usuarios/login", volver);
      evento.preventDefault();
    });
    pagina.querySelector("#form-registro").addEventListener("submit", function (evento) {
      enviarAcceso(evento.currentTarget, "/usuarios/registro", volver);
      evento.preventDefault();
    });
  }

  async function enviarAcceso(formulario, ruta, volver) {
    var boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      var datos = Object.fromEntries(new FormData(formulario).entries());
      var data = await obtenerJSON(ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
      guardarSesion(data);
      window.location.href = volver;
    } catch (error) {
      mostrarAviso(error.message);
      boton.disabled = false;
    }
  }

  async function renderizarPerfilCuenta(pagina, volver) {
    try {
      var perfil = await obtenerPerfil();
      pagina.innerHTML =
        '<div class="account-profile"><div class="form-card"><p class="section-kicker">Mi cuenta</p><h1>Hola, ' + escaparHTML(perfil.cliente.nombre) + '</h1><p class="form-hint">' + escaparHTML(perfil.cliente.correo) + ' · ' + escaparHTML(perfil.cliente.telefono) + '</p><button class="btn btn--outline" type="button" data-cerrar-sesion>Cerrar sesion</button></div><div class="form-card"><h2>Mis direcciones</h2><div class="saved-addresses">' + perfil.direcciones.map(function (direccion) { return '<div class="saved-address"><div><strong>' + escaparHTML(direccion.etiqueta) + (direccion.predeterminada ? ' <span>Predeterminada</span>' : '') + '</strong><p>' + escaparHTML(direccion.direccion) + '</p></div><button type="button" class="cart-item__remove" data-eliminar-direccion="' + direccion.id + '" aria-label="Eliminar direccion">×</button></div>'; }).join("") + '</div><form id="form-direccion" class="address-form"><div class="form-field"><label>Etiqueta</label><input name="etiqueta" placeholder="Ej. Trabajo" required></div><div class="form-field"><label>Nueva direccion</label><textarea name="direccion" rows="2" required></textarea></div><button class="btn btn--primary" type="submit">Guardar direccion</button></form></div></div>';
      pagina.querySelector("[data-cerrar-sesion]").addEventListener("click", function () { cerrarSesion(); window.location.href = "index.html"; });
      pagina.querySelector("#form-direccion").addEventListener("submit", async function (evento) {
        evento.preventDefault();
        try {
          var datos = Object.fromEntries(new FormData(evento.currentTarget).entries());
          await obtenerJSON("/usuarios/direcciones", opcionesAutenticadas({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }));
          renderizarPerfilCuenta(pagina, volver);
        } catch (error) { mostrarAviso(error.message); }
      });
      pagina.querySelectorAll("[data-eliminar-direccion]").forEach(function (boton) {
        boton.addEventListener("click", async function () {
          try { await obtenerJSON("/usuarios/direcciones/" + boton.dataset.eliminarDireccion, opcionesAutenticadas({ method: "DELETE" })); renderizarPerfilCuenta(pagina, volver); } catch (error) { mostrarAviso(error.message); }
        });
      });
    } catch (error) {
      cerrarSesion();
      iniciarCuenta();
    }
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
    actualizarEnlaceCuenta();
    iniciarMenuMovil();
    iniciarSelectoresCantidad();
    iniciarAccionesCarritoGlobales();
    actualizarBadgesCarrito();
    iniciarCatalogo();
    iniciarDetalleProducto();
    iniciarPaginaCarrito();
    iniciarCheckout();
    iniciarCuenta();
    iniciarConfirmacion();
  });
})();
