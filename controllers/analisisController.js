const Model = require('../models/analisisModel');
const fields = ["codigo", "nombre", "descripcion", "precio", "tiempo_entrega_horas", "activo"];

function validar(data) {
  for (const field of fields) {
    if (data[field] === undefined) data[field] = null;
  }
  for (const field of ['codigo','nombre','descripcion']) {
    if (typeof data[field] === 'string') data[field] = data[field].trim() || null;
  }
  data.precio = Number(data.precio);
  data.tiempo_entrega_horas = Number(data.tiempo_entrega_horas || 24);
  return data;
}
async function listar(req, res, next) {
  try { res.json(await Model.listar()); } catch (e) { next(e); }
}
async function obtener(req, res, next) {
  try {
    const item = await Model.obtener(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Análisis no encontrado/a.' });
    res.json(item);
  } catch (e) { next(e); }
}
async function crear(req, res, next) {
  try {
    const data = validar(req.body);
    if (!data.codigo || !data.nombre || req.body.precio === undefined || String(req.body.precio).trim() === '' || !Number.isFinite(data.precio) || !Number.isFinite(data.tiempo_entrega_horas) || data.tiempo_entrega_horas < 1) {
      return res.status(400).json({ error: 'Código, nombre, precio y un tiempo de entrega válido son obligatorios.' });
    }
    if ('precio' in data && Number(data.precio) < 0) return res.status(400).json({ error: 'El precio no puede ser negativo.' });
    data.activo = data.activo === false || data.activo === 0 || data.activo === '0' ? 0 : 1;
    const item = await Model.crear(data);
    res.status(201).json(item);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un registro con ese código o CI.' });
    next(e);
  }
}
async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!(await Model.obtener(id))) return res.status(404).json({ error: 'Registro no encontrado.' });
    const data = validar(req.body);
    if (!data.codigo || !data.nombre || req.body.precio === undefined || String(req.body.precio).trim() === '' || !Number.isFinite(data.precio) || !Number.isFinite(data.tiempo_entrega_horas) || data.tiempo_entrega_horas < 1) {
      return res.status(400).json({ error: 'Código, nombre, precio y un tiempo de entrega válido son obligatorios.' });
    }
    if (data.precio < 0) return res.status(400).json({ error: 'El precio no puede ser negativo.' });
    data.activo = data.activo === false || data.activo === 0 || data.activo === '0' ? 0 : 1;
    res.json(await Model.actualizar(id, data));
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un registro con ese código o CI.' });
    next(e);
  }
}
async function eliminar(req, res, next) {
  try {
    const ok = await Model.eliminar(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Registro no encontrado.' });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'No se puede eliminar: el registro está siendo utilizado.' });
    next(e);
  }
}
module.exports = { listar, obtener, crear, actualizar, eliminar };
