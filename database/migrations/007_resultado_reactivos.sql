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