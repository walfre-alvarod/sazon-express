/* ==========================================================================
   SAZÓN EXPRESS — JavaScript (Fase 1: solo demostraciones visuales)

   Este archivo NO contiene lógica de negocio: no hay carrito real,
   no hay conexión a base de datos ni llamadas a APIs. Solo incluye
   interacciones visuales básicas para mostrar el diseño:

   1. Menú de navegación para móviles.
   2. Filtro visual de categorías en el catálogo.
   3. Selector de cantidad (+ / −).
   4. Aviso de demostración en botones que se conectarán en fases futuras.
   5. Navegación de demostración del formulario de checkout.
   ========================================================================== */

(function () {
  "use strict";

  /* 1. Menú de navegación para móviles */
  function iniciarMenuMovil() {
    var boton = document.querySelector(".nav-toggle");
    var menu = document.getElementById("menu-principal");
    if (!boton || !menu) return;

    function alternar(abrir) {
      menu.classList.toggle("is-open", abrir);
      boton.setAttribute("aria-expanded", String(abrir));
      boton.setAttribute(
        "aria-label",
        abrir ? "Cerrar menú de navegación" : "Abrir menú de navegación"
      );
    }

    boton.addEventListener("click", function () {
      alternar(!menu.classList.contains("is-open"));
    });

    // Cierra el menú al elegir un enlace o al presionar Escape
    menu.addEventListener("click", function (evento) {
      if (evento.target.closest("a")) alternar(false);
    });
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape") alternar(false);
    });
  }

  /* 2. Filtro visual de categorías (solo oculta/muestra tarjetas ya existentes) */
  function iniciarFiltroCategorias() {
    var botones = document.querySelectorAll("[data-filtro]");
    var productos = document.querySelectorAll("[data-categoria]");
    var mensajeVacio = document.getElementById("sin-resultados");
    if (!botones.length || !productos.length) return;

    botones.forEach(function (boton) {
      boton.addEventListener("click", function () {
        var filtro = boton.dataset.filtro;
        var visibles = 0;

        botones.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === boton));
        });

        productos.forEach(function (producto) {
          var coincide = filtro === "todos" || producto.dataset.categoria === filtro;
          producto.hidden = !coincide;
          if (coincide) visibles++;
        });

        if (mensajeVacio) mensajeVacio.hidden = visibles > 0;
      });
    });
  }

  /* 3. Selector de cantidad (compartido por detalle de producto y carrito) */
  function iniciarSelectoresCantidad() {
    document.querySelectorAll(".qty").forEach(function (selector) {
      var campo = selector.querySelector(".qty__input");
      if (!campo) return;

      var minimo = parseInt(campo.min, 10) || 1;
      var maximo = parseInt(campo.max, 10) || 99;

      function fijar(valor) {
        if (isNaN(valor)) valor = minimo;
        campo.value = Math.min(maximo, Math.max(minimo, valor));
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

  /* 4. Aviso de demostración (botones cuya lógica llegará en fases futuras) */
  var temporizadorAviso;

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
    // Fuerza un reflow para que la transición se reinicie
    void aviso.offsetWidth;
    aviso.classList.add("is-visible");
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () {
      aviso.classList.remove("is-visible");
    }, 2800);
  }

  function iniciarAvisosDemo() {
    document.addEventListener("click", function (evento) {
      var boton = evento.target.closest("[data-demo]");
      if (boton) mostrarAviso(boton.dataset.demo);
    });
  }

  /* 5. Formulario de checkout: al validar, solo navega a la pantalla de
        confirmación de ejemplo. No se envían ni se guardan datos. */
  function iniciarCheckoutDemo() {
    var formulario = document.getElementById("form-checkout");
    if (!formulario) return;

    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();
      window.location.href = "pedido-confirmado.html";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    iniciarMenuMovil();
    iniciarFiltroCategorias();
    iniciarSelectoresCantidad();
    iniciarAvisosDemo();
    iniciarCheckoutDemo();
  });
})();
