const Model = require('../models/almacenModel');

function validar(body) {
  const data = {
    nombre: String(body.nombre || '').trim(),
    descripcion: String(body.descripcion || '').trim(),
    unidad: String(body.unidad || '').trim(),
    stock_actual: Number(body.stock_actual),
    stock_minimo: Number(body.stock_minimo),
    activo: body.activo !== false && body.activo !== 0 && body.activo !== '0'
  };
  if (!data.nombre || !data.unidad || !Number.isFinite(data.stock_actual) || !Number.isFinite(data.stock_minimo)
    || data.stock_actual < 0 || data.stock_minimo < 0) return null;
  return data;
}

async function listar(req, res, next) {
  try { res.json(await Model.listar()); } catch (error) { next(error); }
}

async function crear(req, res, next) {
  const data = validar(req.body);
  if (!data) return res.status(400).json({ error: 'Ingresa nombre, unidad y existencias válidas (cero o más).' });
  try { res.status(201).json(await Model.crear(data)); } catch (error) { next(error); }
}

async function actualizar(req, res, next) {
  const data = validar(req.body);
  if (!data) return res.status(400).json({ error: 'Ingresa nombre, unidad y existencias válidas (cero o más).' });
  try {
    const item = await Model.actualizar(Number(req.params.id), data);
    if (!item) return res.status(404).json({ error: 'Químico no encontrado.' });
    res.json(item);
  } catch (error) { next(error); }
}

async function eliminar(req, res, next) {
  try {
    if (!(await Model.eliminar(Number(req.params.id)))) return res.status(404).json({ error: 'Químico no encontrado.' });
    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Este químico ya fue utilizado en resultados. Desactívalo para conservar el historial.' });
    }
    next(error);
  }
}

module.exports = { listar, crear, actualizar, eliminar };