CREATE TABLE IF NOT EXISTS usuario_permisos (
  usuario_id INT NOT NULL,
  vista VARCHAR(30) NOT NULL,
  PRIMARY KEY (usuario_id, vista),
  CONSTRAINT fk_usuario_permiso_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);