ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('administrador','recepcionista','laboratorista','cajero') NOT NULL DEFAULT 'recepcionista';