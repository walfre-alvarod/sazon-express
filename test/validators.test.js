const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validarUsuario,
  validarItems,
  validarProducto
} = require("../backend/src/utils/validators");

test("valida y normaliza un cliente correcto", () => {
  const resultado = validarUsuario({
    nombre: "  Ana López  ",
    correo: " ANA@EXAMPLE.COM ",
    telefono: "5555-0101",
    direccion: "Zona 1"
  });
  assert.equal(resultado.error, undefined);
  assert.equal(resultado.datos.nombre, "Ana López");
  assert.equal(resultado.datos.correo, "ana@example.com");
});

test("rechaza carrito vacío y cantidades inválidas", () => {
  assert.ok(validarItems([]).error);
  assert.ok(validarItems([{ producto_id: 1, cantidad: 0 }]).error);
  assert.equal(validarItems([{ producto_id: 1, cantidad: 2 }]).error, undefined);
});

test("valida los datos de un platillo", () => {
  const valido = validarProducto({
    nombre: "Pizza de la casa",
    descripcion: "Mozzarella y tomate",
    precio: 70,
    categoria: "pizzas",
    imagen_url: "https://example.com/pizza.jpg"
  });
  assert.equal(valido.error, undefined);
  assert.ok(validarProducto({ ...valido.datos, categoria: "otra" }).error);
  assert.ok(validarProducto({ ...valido.datos, precio: -1 }).error);
});
