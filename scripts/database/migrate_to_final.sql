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
