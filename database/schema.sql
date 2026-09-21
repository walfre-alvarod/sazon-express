-- ============================================================================
-- SAZÓN EXPRESS — Fase 1: Base de datos
-- Archivo:  schema.sql
-- Base de datos: pedidos_db
-- Motor: MySQL 8.0.16 o superior (las restricciones CHECK solo se aplican
--        desde esa versión; en versiones anteriores se aceptan pero se ignoran).
--
-- Relaciones:
--   usuarios  1 --- N  pedidos
--   pedidos   1 --- N  detalles_pedido
--   productos 1 --- N  detalles_pedido
--
-- AVISO: este script vuelve a crear las tablas (DROP TABLE IF EXISTS), por lo
-- que borra los datos existentes en pedidos_db cada vez que se ejecuta.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS pedidos_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pedidos_db;

-- Se eliminan primero las tablas hijas para respetar las claves foráneas.
DROP TABLE IF EXISTS detalles_pedido;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS usuarios;


-- ----------------------------------------------------------------------------
-- TABLA: usuarios
-- Clientes que realizan pedidos.
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100)  NOT NULL,
  correo          VARCHAR(150)  NOT NULL,
  telefono        VARCHAR(20)   NOT NULL,
  direccion       VARCHAR(255)  NOT NULL,
  fecha_registro  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_usuarios        PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_correo UNIQUE (correo)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- TABLA: productos
-- Catálogo del restaurante. La categoría permite filtrar el menú.
-- La imagen se guarda como ruta relativa (o URL) dentro del proyecto.
-- ----------------------------------------------------------------------------
CREATE TABLE productos (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100)   NOT NULL,
  descripcion  VARCHAR(255)   NOT NULL,
  precio       DECIMAL(10,2)  NOT NULL,
  categoria    ENUM('hamburguesas', 'pizzas', 'asados', 'postres', 'bebidas') NOT NULL,
  imagen_url   VARCHAR(255)   NOT NULL,

  CONSTRAINT pk_productos        PRIMARY KEY (id),
  CONSTRAINT ck_productos_precio CHECK (precio >= 0),
  INDEX idx_productos_categoria (categoria)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- TABLA: pedidos
-- Cada pedido pertenece a un usuario y tiene un estado controlado.
-- ----------------------------------------------------------------------------
CREATE TABLE pedidos (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED   NOT NULL,
  fecha       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total       DECIMAL(10,2)  NOT NULL,
  estado      ENUM('pendiente', 'en_preparacion', 'entregado') NOT NULL DEFAULT 'pendiente',

  CONSTRAINT pk_pedidos         PRIMARY KEY (id),
  CONSTRAINT ck_pedidos_total   CHECK (total >= 0),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  INDEX idx_pedidos_estado (estado)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- TABLA: detalles_pedido
-- Líneas de cada pedido. Guarda el precio_unitario vigente al momento de la
-- compra, para que cambios futuros de precio no alteren pedidos anteriores.
-- ----------------------------------------------------------------------------
CREATE TABLE detalles_pedido (
  id               INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  pedido_id        INT UNSIGNED   NOT NULL,
  producto_id      INT UNSIGNED   NOT NULL,
  cantidad         INT UNSIGNED   NOT NULL,
  precio_unitario  DECIMAL(10,2)  NOT NULL,

  CONSTRAINT pk_detalles_pedido          PRIMARY KEY (id),
  CONSTRAINT ck_detalles_cantidad        CHECK (cantidad > 0),
  CONSTRAINT ck_detalles_precio_unitario CHECK (precio_unitario >= 0),
  -- Un mismo producto aparece una sola vez por pedido (se acumula en cantidad).
  CONSTRAINT uq_detalles_pedido_producto UNIQUE (pedido_id, producto_id),
  CONSTRAINT fk_detalles_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_detalles_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- DATOS DE PRUEBA (opcionales): los mismos productos del diseño visual.
-- ----------------------------------------------------------------------------
INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url) VALUES
  ('Hamburguesa Clásica',         'Carne de res de 150 g, queso cheddar, lechuga, tomate y salsa de la casa.',  35.00, 'hamburguesas', 'assets/images/hamburguesa-clasica.svg'),
  ('Hamburguesa Doble Queso',     'Doble carne, doble cheddar, cebolla caramelizada y pan brioche.',            48.00, 'hamburguesas', 'assets/images/hamburguesa-doble-queso.svg'),
  ('Sándwich de Pollo Crujiente', 'Pechuga empanizada, pepinillos y mayonesa ahumada en pan suave.',            42.00, 'hamburguesas', 'assets/images/sandwich-pollo-crujiente.svg'),
  ('Pizza Margarita',             'Salsa de tomate, mozzarella fresca y albahaca. Tamaño mediano.',             65.00, 'pizzas',       'assets/images/pizza-margarita.svg'),
  ('Pizza Pepperoni',             'Mozzarella gratinada y abundante pepperoni. Tamaño mediano.',                75.00, 'pizzas',       'assets/images/pizza-pepperoni.svg'),
  ('Costillas BBQ',               'Costillas de cerdo glaseadas en salsa BBQ con papas rústicas.',              95.00, 'asados',       'assets/images/costillas-bbq.svg'),
  ('Pollo a la Parrilla',         'Cuarto de pollo marinado con chimichurri, con guarnición del día.',          70.00, 'asados',       'assets/images/pollo-parrilla.svg'),
  ('Flan de Vainilla',            'Postre cremoso con caramelo casero.',                                        22.00, 'postres',      'assets/images/flan-vainilla.svg'),
  ('Brownie con Helado',          'Brownie tibio de chocolate con una bola de helado de vainilla.',             30.00, 'postres',      'assets/images/brownie-helado.svg'),
  ('Limonada Natural',            'Limón recién exprimido con hielo y hierbabuena. 16 oz.',                     15.00, 'bebidas',      'assets/images/limonada-natural.svg'),
  ('Horchata Fría',               'Bebida cremosa de arroz y canela, servida bien fría. 16 oz.',                18.00, 'bebidas',      'assets/images/horchata-fria.svg'),
  ('Refresco de Frutas',          'Mezcla de frutas de temporada con hielo. 16 oz.',                            12.00, 'bebidas',      'assets/images/refresco-frutas.svg');


-- ----------------------------------------------------------------------------
-- VERIFICACIÓN RÁPIDA
-- ----------------------------------------------------------------------------
SHOW TABLES;
SELECT categoria, COUNT(*) AS total_productos FROM productos GROUP BY categoria;
