USE pedidos_db;

-- Ejecuta este archivo solo si deseas actualizar manualmente una base de fases
-- anteriores. El servidor tambien aplica estos cambios automaticamente.

ALTER TABLE productos
  ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER imagen_url;

ALTER TABLE pedidos
  ADD COLUMN metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia')
  NOT NULL DEFAULT 'efectivo' AFTER total;

ALTER TABLE pedidos
  ADD COLUMN fecha_actualizacion DATETIME NOT NULL
  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER fecha;

ALTER TABLE pedidos
  MODIFY estado ENUM('pendiente', 'en_preparacion', 'en_camino', 'entregado', 'cancelado')
  NOT NULL DEFAULT 'pendiente';

ALTER TABLE usuarios ADD COLUMN password_hash VARCHAR(255) NULL AFTER direccion;
ALTER TABLE pedidos ADD COLUMN direccion_entrega VARCHAR(255) NULL AFTER metodo_pago;
UPDATE pedidos p INNER JOIN usuarios u ON u.id = p.usuario_id SET p.direccion_entrega = u.direccion WHERE p.direccion_entrega IS NULL;
ALTER TABLE pedidos MODIFY direccion_entrega VARCHAR(255) NOT NULL;
ALTER TABLE detalles_pedido ADD COLUMN personalizacion VARCHAR(500) NOT NULL DEFAULT '' AFTER precio_unitario;
ALTER TABLE detalles_pedido DROP INDEX uq_detalles_pedido_producto;
ALTER TABLE detalles_pedido ADD CONSTRAINT uq_detalles_pedido_producto UNIQUE (pedido_id, producto_id, personalizacion);

CREATE TABLE IF NOT EXISTS direcciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  etiqueta VARCHAR(60) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  predeterminada TINYINT(1) NOT NULL DEFAULT 0,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_direcciones_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_direcciones_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS administradores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_administradores PRIMARY KEY (id),
  CONSTRAINT uq_administradores_correo UNIQUE (correo)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
