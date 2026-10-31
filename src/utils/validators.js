function normalizarTexto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function esCorreoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function esEnteroPositivo(valor) {
  return Number.isInteger(Number(valor)) && Number(valor) > 0;
}

function validarUsuario(usuario) {
  const datos = {
    nombre: normalizarTexto(usuario && usuario.nombre),
    correo: normalizarTexto(usuario && usuario.correo).toLowerCase(),
    telefono: normalizarTexto(usuario && usuario.telefono),
    direccion: normalizarTexto(usuario && usuario.direccion)
  };

  if (!datos.nombre || !datos.correo || !datos.telefono || !datos.direccion) {
    return { error: "Nombre, correo, telefono y direccion son obligatorios." };
  }

  if (!esCorreoValido(datos.correo)) {
    return { error: "El correo electronico no tiene un formato valido." };
  }

  return { datos };
}

function validarRegistro(usuario) {
  const resultado = validarUsuario(usuario);
  if (resultado.error) return resultado;
  const password = String((usuario && usuario.password) || "");
  if (password.length < 8) return { error: "La contrasena debe tener al menos 8 caracteres." };
  return { datos: { ...resultado.datos, password } };
}

function validarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "El pedido debe incluir al menos un producto." };
  }

  const productos = items.map((item) => ({
    producto_id: Number(item.producto_id),
    cantidad: Number(item.cantidad),
    personalizacion: normalizarTexto(item.personalizacion).slice(0, 500)
  }));

  const invalido = productos.some(
    (item) => !esEnteroPositivo(item.producto_id) || !esEnteroPositivo(item.cantidad)
  );

  if (invalido) {
    return { error: "Cada item debe tener producto_id y cantidad como enteros positivos." };
  }

  return { datos: productos };
}

const CATEGORIAS = ["hamburguesas", "pizzas", "asados", "postres", "bebidas"];

function validarProducto(producto) {
  const datos = {
    nombre: normalizarTexto(producto && producto.nombre),
    descripcion: normalizarTexto(producto && producto.descripcion),
    precio: Number(producto && producto.precio),
    categoria: normalizarTexto(producto && producto.categoria),
    imagen_url: normalizarTexto(producto && producto.imagen_url)
  };

  if (!datos.nombre || !datos.descripcion || !datos.categoria || !datos.imagen_url) {
    return { error: "Nombre, descripcion, categoria e imagen son obligatorios." };
  }
  if (!Number.isFinite(datos.precio) || datos.precio < 0) {
    return { error: "El precio debe ser un numero igual o mayor que cero." };
  }
  if (!CATEGORIAS.includes(datos.categoria)) {
    return { error: "La categoria seleccionada no es valida." };
  }
  if (datos.nombre.length > 100 || datos.descripcion.length > 255 || datos.imagen_url.length > 255) {
    return { error: "Uno de los campos supera la longitud permitida." };
  }

  return { datos };
}

module.exports = {
  normalizarTexto,
  esEnteroPositivo,
  validarUsuario,
  validarRegistro,
  validarItems,
  validarProducto
};
