const bcrypt = require('bcryptjs');
const Model = require('../models/usuarioModel');
const { views, viewKeys, viewRoles } = require('../config/views');

function validarPermisos(value, rol) {
  if (!Array.isArray(value)) return null;
  const permisos = [...new Set(value.map(String))];
  return permisos.every(view => viewKeys.includes(view) && viewRoles[view].includes(rol)) ? permisos : null;
}

async function listar(req, res, next) {
  try {
    res.json({ usuarios: await Model.listar(), vistas: views });
  } catch (error) { next(error); }
}

async function crear(req, res, next) {
  try {
    const usuario = String(req.body.usuario || '').trim();
    const nombreCompleto = String(req.body.nombre_completo || '').trim();
    const password = String(req.body.password || '');
    const rol = String(req.body.rol || '');
    const permisos = validarPermisos(req.body.permisos, rol);
    if (!usuario || !nombreCompleto || password.length < 10) {
      return res.status(400).json({ error: 'Completa usuario y nombre; la contraseña debe tener al menos 10 caracteres.' });
    }
    if (!['recepcionista', 'laboratorista', 'cajero'].includes(rol) || !permisos) {
      return res.status(400).json({ error: 'Selecciona un rol y permisos válidos.' });
    }
    await Model.crear({ usuario, passwordHash: await bcrypt.hash(password, 12), nombreCompleto, rol, permisos });
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese nombre de usuario ya está registrado.' });
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const encontrado = await Model.obtener(id);
    if (!encontrado || encontrado.rol === 'administrador') {
      return res.status(404).json({ error: 'Usuario no encontrado o no editable.' });
    }
    const usuario = String(req.body.usuario || '').trim();
    const nombreCompleto = String(req.body.nombre_completo || '').trim();
    const rol = String(req.body.rol || '');
    const password = String(req.body.password || '');
    const permisos = validarPermisos(req.body.permisos, rol);
    if (!usuario || !nombreCompleto || !['recepcionista', 'laboratorista', 'cajero'].includes(rol) || !permisos) {
      return res.status(400).json({ error: 'Completa usuario, nombre, rol y permisos válidos.' });
    }
    if (password && password.length < 10) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 10 caracteres.' });
    }
    await Model.actualizar(id, {
      usuario,
      nombreCompleto,
      rol,
      permisos,
      passwordHash: password ? await bcrypt.hash(password, 12) : null
    });
    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese nombre de usuario ya está registrado.' });
    next(error);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const activo = req.body.activo === true;
    if (!(await Model.cambiarEstado(Number(req.params.id), activo))) {
      return res.status(404).json({ error: 'Usuario no encontrado o no modificable.' });
    }
    res.json({ ok: true });
  } catch (error) { next(error); }
}

async function eliminar(req, res, next) {
  try {
    if (!(await Model.eliminar(Number(req.params.id)))) {
      return res.status(404).json({ error: 'Usuario no encontrado o no eliminable.' });
    }
    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'El usuario tiene operaciones registradas; desactívalo para conservar el historial.' });
    }
    next(error);
  }
}

module.exports = { listar, crear, actualizar, cambiarEstado, eliminar };