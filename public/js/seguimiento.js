(function () {
  "use strict";

  var API_URL = window.location.protocol === "file:"
    ? "http://localhost:3000/api"
    : window.location.origin + "/api";
  var STORAGE_ULTIMO_PEDIDO = "sazonExpressUltimoPedido";
  var refrescoAutomatico;

  function escapar(valor) {
    return String(valor == null ? "" : valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function moneda(valor) {
    return "Q" + Number(valor || 0).toFixed(2);
  }

  function fecha(valor) {
    return new Intl.DateTimeFormat("es-GT", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(valor));
  }

  function normalizarId(valor) {
    var digitos = String(valor || "").replace(/\D/g, "");
    return Number(digitos);
  }

  async function consultar(id, correo, silencioso) {
    var error = document.getElementById("tracking-error");
    var resultado = document.getElementById("tracking-result");
    var boton = document.querySelector('#form-seguimiento button[type="submit"]');

    if (!silencioso) {
      boton.disabled = true;
      boton.textContent = "Consultando...";
      error.hidden = true;
    }

    try {
      var response = await fetch(API_URL + "/pedidos/seguimiento/" + id + "?correo=" + encodeURIComponent(correo));
      var body = await response.json().catch(function () { return {}; });
      if (!response.ok || body.ok === false) throw new Error(body.mensaje || "No se pudo consultar el pedido.");

      renderPedido(body.data);
      resultado.hidden = false;
      error.hidden = true;

      clearInterval(refrescoAutomatico);
      refrescoAutomatico = setInterval(function () {
        consultar(id, correo, true);
      }, 30000);
    } catch (err) {
      if (!silencioso) {
        resultado.hidden = true;
        error.textContent = err.message;
        error.hidden = false;
      }
    } finally {
      if (!silencioso) {
        boton.disabled = false;
        boton.textContent = "Consultar estado";
      }
    }
  }

  function renderPedido(pedido) {
    var resultado = document.getElementById("tracking-result");
    var estados = ["pendiente", "en_preparacion", "en_camino", "entregado"];
    var indice = estados.indexOf(pedido.estado);
    var timeline = pedido.estado === "cancelado"
      ? '<div class="tracking-cancelled"><strong>Este pedido fue cancelado.</strong><br>Comunícate con el restaurante si necesitas más información.</div>'
      : '<ol class="status-timeline">' + estados.map(function (estado, posicion) {
          var clase = posicion < indice ? "is-complete" : posicion === indice ? "is-current" : "";
          var textos = {
            pendiente: ["Pedido recibido", "Esperando confirmación de cocina"],
            en_preparacion: ["En preparación", "Estamos cocinando tu pedido"],
            en_camino: ["En camino", "Tu pedido salió del restaurante"],
            entregado: ["Entregado", "Pedido completado"]
          }[estado];
          return '<li class="status-step ' + clase + '"><strong>' + textos[0] + '</strong><span>' + textos[1] + '</span></li>';
        }).join("") + '</ol>';

    var items = pedido.detalles.map(function (item) {
      return '<li class="mini-item"><img src="' + escapar(item.imagen_url) + '" width="52" height="52" alt=""><div><p class="mini-item__name">' +
        escapar(item.nombre) + '</p><p class="mini-item__qty">Cantidad: ' + item.cantidad + '</p>' + (item.personalizacion ? '<p class="mini-item__qty">' + escapar(item.personalizacion) + '</p>' : '') + '</div><p class="mini-item__price">' + moneda(item.subtotal) + '</p></li>';
    }).join("");

    resultado.innerHTML =
      '<header class="tracking-result__head"><div><p class="section-kicker">Pedido confirmado</p><h2>#SE-' + String(pedido.id).padStart(6, "0") +
      '</h2></div><p class="tracking-result__meta">Pedido realizado: ' + escapar(fecha(pedido.fecha)) + '<br>Última actualización: ' + escapar(fecha(pedido.fecha_actualizacion)) +
      '</p></header><div class="tracking-status"><h3>Estado de tu entrega</h3>' + timeline +
      '</div><div class="tracking-order"><div class="tracking-order__items"><h3>Tu pedido</h3><ul class="mini-list">' + items +
      '</ul></div><aside class="tracking-order__summary"><h3>Resumen</h3><p class="summary__row"><span>Cliente</span><span>' + escapar(pedido.cliente) +
      '</span></p><p class="summary__row"><span>Método de pago</span><span>' + escapar(nombrePago(pedido.metodo_pago)) +
      '</span></p><p class="summary__row summary__row--total"><span>Total</span><span>' + moneda(pedido.total) +
      '</span></p></aside></div><p class="tracking-refresh">Esta información se actualiza automáticamente cada 30 segundos.</p>';
  }

  function nombrePago(pago) {
    return {
      efectivo: "Efectivo",
      tarjeta: "Tarjeta",
      transferencia: "Transferencia"
    }[pago] || pago;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("form-seguimiento");
    var parametros = new URLSearchParams(window.location.search);
    var ultimo = null;
    try { ultimo = JSON.parse(localStorage.getItem(STORAGE_ULTIMO_PEDIDO)); } catch (error) { ultimo = null; }

    form.elements.pedido_id.value = parametros.get("id") || (ultimo && ultimo.id) || "";
    form.elements.correo.value = (ultimo && ultimo.correo) || "";

    form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var id = normalizarId(form.elements.pedido_id.value);
      var correo = form.elements.correo.value.trim().toLowerCase();
      consultar(id, correo, false);
    });

    if (form.elements.pedido_id.value && form.elements.correo.value) {
      form.requestSubmit();
    }
  });
})();
