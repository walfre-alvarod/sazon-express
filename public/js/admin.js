(function () {
  "use strict";

  var API_URL = window.location.protocol === "file:"
    ? "http://localhost:3000/api"
    : window.location.origin + "/api";
  var TOKEN_KEY = "sazonExpressAdminToken";
  var token = localStorage.getItem(TOKEN_KEY) || "";
  var productos = [];
  var pedidos = [];
  var toastTimer;
  var searchTimer;

  function escapar(valor) {
    return String(valor == null ? "" : valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function moneda(valor) {
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: "GTQ"
    }).format(Number(valor || 0));
  }

  function fecha(valor) {
    return new Intl.DateTimeFormat("es-GT", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(valor));
  }

  function nombreEstado(estado) {
    return {
      pendiente: "Pendiente",
      en_preparacion: "En preparación",
      en_camino: "En camino",
      entregado: "Entregado",
      cancelado: "Cancelado"
    }[estado] || estado;
  }

  function nombreCategoria(categoria) {
    return {
      hamburguesas: "Hamburguesas",
      pizzas: "Pizzas",
      asados: "Asados",
      postres: "Postres",
      bebidas: "Bebidas"
    }[categoria] || categoria;
  }

  function mostrarToast(mensaje) {
    var toast = document.getElementById("admin-toast");
    toast.textContent = mensaje;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2800);
  }

  async function api(ruta, opciones) {
    opciones = opciones || {};
    var headers = Object.assign({}, opciones.headers || {});
    if (token) headers.Authorization = "Bearer " + token;

    var respuesta = await fetch(API_URL + ruta, Object.assign({}, opciones, { headers: headers }));
    var cuerpo = await respuesta.json().catch(function () { return {}; });

    if (respuesta.status === 401 && ruta !== "/admin/login") {
      cerrarSesion("Tu sesión terminó. Inicia sesión nuevamente.");
      throw new Error(cuerpo.mensaje || "Sesión no válida.");
    }
    if (!respuesta.ok || cuerpo.ok === false) {
      throw new Error(cuerpo.mensaje || "No se pudo completar la operación.");
    }
    return cuerpo.data;
  }

  function mostrarLogin(mensaje) {
    document.getElementById("login-view").hidden = false;
    document.getElementById("admin-app").hidden = true;
    var error = document.getElementById("login-error");
    error.hidden = !mensaje;
    error.textContent = mensaje || "";
  }

  function mostrarPanel(admin) {
    document.getElementById("login-view").hidden = true;
    document.getElementById("admin-app").hidden = false;
    document.getElementById("admin-name").textContent = admin.nombre || "Administrador";
    cambiarVista("resumen");
  }

  function cerrarSesion(mensaje) {
    token = "";
    localStorage.removeItem(TOKEN_KEY);
    mostrarLogin(mensaje || "");
  }

  async function verificarSesion() {
    if (!token) {
      mostrarLogin();
      return;
    }
    try {
      mostrarPanel(await api("/admin/me"));
    } catch (error) {
      mostrarLogin(error.message);
    }
  }

  function cambiarVista(vista) {
    var titulos = { resumen: "Resumen", productos: "Platillos", pedidos: "Pedidos" };
    document.querySelectorAll("[data-admin-view]").forEach(function (seccion) {
      seccion.hidden = seccion.dataset.adminView !== vista;
    });
    document.querySelectorAll("[data-view]").forEach(function (boton) {
      boton.classList.toggle("is-active", boton.dataset.view === vista);
    });
    document.getElementById("view-title").textContent = titulos[vista];
    document.querySelector(".admin-sidebar").classList.remove("is-open");

    if (vista === "resumen") cargarResumen();
    if (vista === "productos") cargarProductos();
    if (vista === "pedidos") cargarPedidos();
  }

  async function cargarResumen() {
    var metrics = document.getElementById("metrics");
    metrics.innerHTML = '<p class="loading-row">Cargando resumen...</p>';
    try {
      var data = await api("/admin/resumen");
      var r = data.resumen;
      metrics.innerHTML =
        metric("Pedidos hoy", r.pedidos_hoy, r.pendientes + " pendientes") +
        metric("Ventas registradas", moneda(r.ventas_totales), "Excluye pedidos cancelados") +
        metric("Platillos activos", r.productos_activos, "Disponibles en el menú") +
        metric("Clientes", r.clientes, "Clientes registrados");
      renderPedidosRecientes(data.recientes);
    } catch (error) {
      metrics.innerHTML = '<p class="loading-row">' + escapar(error.message) + '</p>';
    }
  }

  function metric(etiqueta, valor, nota) {
    return '<article class="metric"><p class="metric__label">' + escapar(etiqueta) +
      '</p><p class="metric__value">' + escapar(valor) +
      '</p><p class="metric__note">' + escapar(nota) + '</p></article>';
  }

  function renderPedidosRecientes(lista) {
    var tbody = document.getElementById("recent-orders");
    if (!lista.length) {
      tbody.innerHTML = '<tr><td class="empty-row" colspan="6">Todavía no hay pedidos.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(function (pedido) {
      return '<tr><td><strong>#' + pedido.id + '</strong></td><td>' + escapar(pedido.cliente) +
        '</td><td>' + escapar(fecha(pedido.fecha)) + '</td><td>' + moneda(pedido.total) +
        '</td><td>' + estadoBadge(pedido.estado) +
        '</td><td><button class="admin-btn admin-btn--outline admin-btn--small" data-ver-pedido="' + pedido.id + '">Ver</button></td></tr>';
    }).join("");
  }

  async function cargarProductos() {
    var tbody = document.getElementById("products-table");
    tbody.innerHTML = '<tr><td class="loading-row" colspan="5">Cargando platillos...</td></tr>';
    try {
      productos = await api("/admin/productos");
      renderProductos();
    } catch (error) {
      tbody.innerHTML = '<tr><td class="empty-row" colspan="5">' + escapar(error.message) + '</td></tr>';
    }
  }

  function renderProductos() {
    var buscar = document.getElementById("buscar-productos").value.trim().toLowerCase();
    var lista = productos.filter(function (producto) {
      return !buscar || producto.nombre.toLowerCase().includes(buscar) || producto.categoria.includes(buscar);
    });
    var tbody = document.getElementById("products-table");
    if (!lista.length) {
      tbody.innerHTML = '<tr><td class="empty-row" colspan="5">No hay platillos que coincidan.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(function (producto) {
      var activo = Number(producto.activo) === 1;
      return '<tr><td><div class="table-product"><img src="' + escapar(producto.imagen_url) + '" alt=""><div><strong>' +
        escapar(producto.nombre) + '</strong><span>' + escapar(producto.descripcion) +
        '</span></div></div></td><td>' + escapar(nombreCategoria(producto.categoria)) +
        '</td><td><strong>' + moneda(producto.precio) + '</strong></td><td>' +
        '<span class="status status--' + (activo ? "active" : "inactive") + '">' + (activo ? "Disponible" : "Oculto") +
        '</span></td><td><div class="table-actions"><button class="admin-btn admin-btn--outline admin-btn--small" data-editar-producto="' + producto.id + '">Editar</button>' +
        '<button class="admin-btn admin-btn--outline admin-btn--small' + (activo ? " admin-btn--danger" : "") + '" data-toggle-producto="' + producto.id + '" data-activo="' + (activo ? "0" : "1") + '">' +
        (activo ? "Ocultar" : "Reactivar") + '</button></div></td></tr>';
    }).join("");
  }

  function abrirProducto(producto) {
    var dialog = document.getElementById("product-dialog");
    var form = document.getElementById("form-producto");
    form.reset();
    form.elements.id.value = producto ? producto.id : "";
    document.getElementById("product-dialog-title").textContent = producto ? "Editar platillo" : "Nuevo platillo";
    document.getElementById("product-error").hidden = true;
    if (producto) {
      form.elements.nombre.value = producto.nombre;
      form.elements.descripcion.value = producto.descripcion;
      form.elements.precio.value = producto.precio;
      form.elements.categoria.value = producto.categoria;
      form.elements.imagen_url.value = producto.imagen_url;
    }
    actualizarPreview();
    dialog.showModal();
  }

  function actualizarPreview() {
    var valor = document.querySelector('#form-producto [name="imagen_url"]').value.trim();
    var imagen = document.getElementById("product-preview");
    var vacio = document.getElementById("product-preview-empty");
    imagen.hidden = !valor;
    vacio.hidden = Boolean(valor);
    if (valor) imagen.src = valor;
  }

  async function guardarProducto(evento) {
    evento.preventDefault();
    var form = evento.currentTarget;
    var id = form.elements.id.value;
    var error = document.getElementById("product-error");
    var body = {
      nombre: form.elements.nombre.value.trim(),
      descripcion: form.elements.descripcion.value.trim(),
      precio: Number(form.elements.precio.value),
      categoria: form.elements.categoria.value,
      imagen_url: form.elements.imagen_url.value.trim()
    };
    var boton = form.querySelector('[type="submit"]');
    boton.disabled = true;
    error.hidden = true;
    try {
      await api(id ? "/admin/productos/" + id : "/admin/productos", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      document.getElementById("product-dialog").close();
      mostrarToast(id ? "Platillo actualizado." : "Platillo agregado al menú.");
      await cargarProductos();
      cargarResumen();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    } finally {
      boton.disabled = false;
    }
  }

  async function toggleProducto(id, activo) {
    try {
      await api("/admin/productos/" + id + "/disponibilidad", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: activo })
      });
      mostrarToast(activo ? "Platillo reactivado." : "Platillo ocultado del menú.");
      await cargarProductos();
    } catch (error) {
      mostrarToast(error.message);
    }
  }

  async function cargarPedidos() {
    var tbody = document.getElementById("orders-table");
    tbody.innerHTML = '<tr><td class="loading-row" colspan="7">Cargando pedidos...</td></tr>';
    var estado = document.getElementById("filtro-estado").value;
    var buscar = document.getElementById("buscar-pedidos").value.trim();
    var query = new URLSearchParams({ estado: estado, buscar: buscar });
    try {
      pedidos = await api("/admin/pedidos?" + query.toString());
      renderPedidos();
    } catch (error) {
      tbody.innerHTML = '<tr><td class="empty-row" colspan="7">' + escapar(error.message) + '</td></tr>';
    }
  }

  function renderPedidos() {
    var tbody = document.getElementById("orders-table");
    if (!pedidos.length) {
      tbody.innerHTML = '<tr><td class="empty-row" colspan="7">No hay pedidos que coincidan.</td></tr>';
      return;
    }
    tbody.innerHTML = pedidos.map(function (pedido) {
      return '<tr><td><strong>#' + pedido.id + '</strong></td><td><strong>' + escapar(pedido.cliente) +
        '</strong><br><small>' + escapar(pedido.correo) + '</small></td><td>' + escapar(fecha(pedido.fecha)) +
        '</td><td>' + Number(pedido.articulos) + '</td><td><strong>' + moneda(pedido.total) +
        '</strong></td><td>' + estadoBadge(pedido.estado) +
        '</td><td><button class="admin-btn admin-btn--outline admin-btn--small" data-ver-pedido="' + pedido.id + '">Gestionar</button></td></tr>';
    }).join("");
  }

  function estadoBadge(estado) {
    return '<span class="status status--' + escapar(estado) + '">' + escapar(nombreEstado(estado)) + '</span>';
  }

  async function abrirPedido(id) {
    var dialog = document.getElementById("order-dialog");
    var detalle = document.getElementById("order-detail");
    document.getElementById("order-dialog-title").textContent = "Pedido #" + id;
    detalle.innerHTML = '<p class="loading-row">Cargando detalle...</p>';
    dialog.showModal();
    try {
      var pedido = await api("/admin/pedidos/" + id);
      detalle.innerHTML = renderDetallePedido(pedido);
    } catch (error) {
      detalle.innerHTML = '<p class="form-error">' + escapar(error.message) + '</p>';
    }
  }

  function renderDetallePedido(pedido) {
    var opciones = ["pendiente", "en_preparacion", "en_camino", "entregado", "cancelado"].map(function (estado) {
      return '<option value="' + estado + '"' + (pedido.estado === estado ? " selected" : "") + '>' + nombreEstado(estado) + '</option>';
    }).join("");
    var items = pedido.detalles.map(function (item) {
      return '<div class="order-item"><img src="' + escapar(item.imagen_url) + '" alt=""><div><p><strong>' + escapar(item.nombre) +
        '</strong></p><small>' + item.cantidad + ' × ' + moneda(item.precio_unitario) + (item.personalizacion ? '<br>' + escapar(item.personalizacion) : '') + '</small></div><strong>' + moneda(item.subtotal) + '</strong></div>';
    }).join("");
    return '<div class="order-grid"><div class="order-block"><h3>Cliente</h3><p><strong>' + escapar(pedido.cliente) +
      '</strong></p><p>' + escapar(pedido.correo) + '</p><p>' + escapar(pedido.telefono) + '</p><p>' + escapar(pedido.direccion) +
      '</p></div><div class="order-block"><h3>Información del pedido</h3><p>Fecha: ' + escapar(fecha(pedido.fecha)) +
      '</p><p>Pago: ' + escapar(nombreCategoriaPago(pedido.metodo_pago)) + '</p><p>Estado actual: ' + estadoBadge(pedido.estado) +
      '</p><form class="order-status-form" data-form-estado="' + pedido.id + '"><select name="estado">' + opciones +
      '</select><button class="admin-btn admin-btn--primary" type="submit">Guardar</button></form></div></div>' +
      '<div class="order-items"><h3>Platillos</h3>' + items + '<p class="order-total"><span>Total</span><span>' + moneda(pedido.total) + '</span></p></div>';
  }

  function nombreCategoriaPago(pago) {
    return { efectivo: "Efectivo contra entrega", tarjeta: "Tarjeta contra entrega", transferencia: "Transferencia bancaria" }[pago] || pago;
  }

  async function actualizarEstado(evento) {
    var form = evento.target.closest("[data-form-estado]");
    if (!form) return;
    evento.preventDefault();
    var id = form.dataset.formEstado;
    var boton = form.querySelector("button");
    boton.disabled = true;
    try {
      await api("/admin/pedidos/" + id + "/estado", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: form.elements.estado.value })
      });
      mostrarToast("Estado del pedido actualizado.");
      document.getElementById("order-dialog").close();
      await cargarPedidos();
      cargarResumen();
    } catch (error) {
      mostrarToast(error.message);
    } finally {
      boton.disabled = false;
    }
  }

  function registrarEventos() {
    document.getElementById("form-login").addEventListener("submit", async function (evento) {
      evento.preventDefault();
      var form = evento.currentTarget;
      var boton = form.querySelector("button");
      var error = document.getElementById("login-error");
      boton.disabled = true;
      error.hidden = true;
      try {
        var data = await api("/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo: form.elements.correo.value, password: form.elements.password.value })
        });
        token = data.token;
        localStorage.setItem(TOKEN_KEY, token);
        form.reset();
        mostrarPanel(data.admin);
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
      } finally {
        boton.disabled = false;
      }
    });

    document.querySelectorAll("[data-view]").forEach(function (boton) {
      boton.addEventListener("click", function () { cambiarVista(boton.dataset.view); });
    });
    document.querySelectorAll("[data-go-view]").forEach(function (boton) {
      boton.addEventListener("click", function () { cambiarVista(boton.dataset.goView); });
    });
    document.getElementById("btn-logout").addEventListener("click", function () { cerrarSesion(); });
    document.getElementById("btn-menu").addEventListener("click", function () {
      var sidebar = document.querySelector(".admin-sidebar");
      sidebar.classList.toggle("is-open");
      this.setAttribute("aria-expanded", String(sidebar.classList.contains("is-open")));
    });
    document.getElementById("btn-nuevo-producto").addEventListener("click", function () { abrirProducto(null); });
    document.getElementById("form-producto").addEventListener("submit", guardarProducto);
    document.querySelector('#form-producto [name="imagen_url"]').addEventListener("input", actualizarPreview);
    document.getElementById("buscar-productos").addEventListener("input", renderProductos);
    document.getElementById("filtro-estado").addEventListener("change", cargarPedidos);
    document.getElementById("btn-refrescar-pedidos").addEventListener("click", cargarPedidos);
    document.getElementById("buscar-pedidos").addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(cargarPedidos, 350);
    });
    document.addEventListener("submit", actualizarEstado);

    document.addEventListener("click", function (evento) {
      var cerrar = evento.target.closest("[data-close-dialog]");
      if (cerrar) document.getElementById(cerrar.dataset.closeDialog).close();

      var editar = evento.target.closest("[data-editar-producto]");
      if (editar) abrirProducto(productos.find(function (p) { return Number(p.id) === Number(editar.dataset.editarProducto); }));

      var toggle = evento.target.closest("[data-toggle-producto]");
      if (toggle) toggleProducto(toggle.dataset.toggleProducto, Number(toggle.dataset.activo));

      var ver = evento.target.closest("[data-ver-pedido]");
      if (ver) abrirPedido(ver.dataset.verPedido);
    });

    document.querySelectorAll("dialog").forEach(function (dialog) {
      dialog.addEventListener("click", function (evento) {
        if (evento.target === dialog) dialog.close();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    registrarEventos();
    verificarSesion();
  });
})();
