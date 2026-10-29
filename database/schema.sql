CREATE DATABASE IF NOT EXISTS laboratorio_clinico
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE laboratorio_clinico;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(120) NOT NULL,
  rol ENUM('administrador','recepcionista','laboratorista','cajero') NOT NULL DEFAULT 'recepcionista',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuario_permisos (
  usuario_id INT NOT NULL,
  vista VARCHAR(30) NOT NULL,
  PRIMARY KEY (usuario_id, vista),
  CONSTRAINT fk_usuario_permiso_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS personas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ci VARCHAR(30) NOT NULL UNIQUE,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE NULL,
  sexo ENUM('F','M','Otro','No especificado') NOT NULL DEFAULT 'No especificado',
  telefono VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  direccion VARCHAR(255) NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pacientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  persona_id INT NOT NULL UNIQUE,
  codigo_paciente VARCHAR(30) NOT NULL UNIQUE,
  observaciones TEXT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_paciente_persona FOREIGN KEY (persona_id) REFERENCES personas(id)
);

CREATE TABLE IF NOT EXISTS analisis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  tiempo_entrega_horas INT NOT NULL DEFAULT 24,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  paciente_id INT NOT NULL,
  fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('Pendiente','En proceso','Completada','Cancelada') NOT NULL DEFAULT 'Pendiente',
  observaciones TEXT NULL,
  usuario_id INT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_solicitud_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  CONSTRAINT fk_solicitud_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS solicitud_detalles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id INT NOT NULL,
  analisis_id INT NOT NULL,
  codigo_analisis VARCHAR(30) NULL,
  nombre_analisis VARCHAR(120) NULL,
  descripcion_analisis TEXT NULL,
  precio DECIMAL(10,2) NOT NULL,
  UNIQUE KEY uq_solicitud_analisis (solicitud_id, analisis_id),
  CONSTRAINT fk_detalle_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_analisis FOREIGN KEY (analisis_id) REFERENCES analisis(id)
);

CREATE TABLE IF NOT EXISTS resultados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_detalle_id INT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  unidad VARCHAR(40) NULL,
  referencia VARCHAR(120) NULL,
  interpretacion TEXT NULL,
  observaciones TEXT NULL,
  fecha_resultado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NULL,
  validado TINYINT(1) NOT NULL DEFAULT 0,
  validado_por INT NULL,
  validado_en DATETIME NULL,
  CONSTRAINT fk_resultado_detalle FOREIGN KEY (solicitud_detalle_id) REFERENCES solicitud_detalles(id),
  CONSTRAINT fk_resultado_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id INT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  metodo ENUM('Efectivo','Tarjeta','Transferencia','QR','Otro') NOT NULL DEFAULT 'Efectivo',
  referencia VARCHAR(120) NULL,
  fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NULL,
  CONSTRAINT fk_pago_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
  CONSTRAINT fk_pago_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS inventario_quimicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT NULL,
  unidad VARCHAR(40) NOT NULL,
  stock_actual DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(12,2) NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resultado_reactivos (
  resultado_id INT NOT NULL,
  quimico_id INT NOT NULL,
  nombre_quimico VARCHAR(120) NOT NULL,
  unidad VARCHAR(40) NOT NULL,
  cantidad DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (resultado_id, quimico_id),
  CONSTRAINT fk_reactivo_resultado FOREIGN KEY (resultado_id) REFERENCES resultados(id) ON DELETE CASCADE,
  CONSTRAINT fk_reactivo_quimico FOREIGN KEY (quimico_id) REFERENCES inventario_quimicos(id)
);

CREATE INDEX idx_personas_apellidos ON personas(apellidos);
CREATE INDEX idx_solicitudes_fecha ON solicitudes(fecha_solicitud);
CREATE INDEX idx_pagos_fecha ON pagos(fecha_pago);
