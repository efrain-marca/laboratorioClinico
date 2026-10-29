ALTER TABLE solicitud_detalles
  ADD COLUMN IF NOT EXISTS codigo_analisis VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS nombre_analisis VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS descripcion_analisis TEXT NULL;

UPDATE solicitud_detalles sd
JOIN analisis a ON a.id=sd.analisis_id
SET sd.codigo_analisis=COALESCE(sd.codigo_analisis,a.codigo),
    sd.nombre_analisis=COALESCE(sd.nombre_analisis,a.nombre),
    sd.descripcion_analisis=COALESCE(sd.descripcion_analisis,a.descripcion);