const bcrypt = require('bcryptjs');
const Login = require('../models/loginModel');
const { viewKeys } = require('../config/views');

function mostrarLogin(req, res) {
  if (req.session.user) return res.redirect('/');
  res.sendFile('index.html', { root: 'views/login' });
}

async function iniciarSesion(req, res, next) {
  try {
    const usuario = String(req.body.usuario || '').trim();
    const password = String(req.body.password || '');
    if (!usuario || !password) return res.status(400).json({ error: 'Ingresa usuario y contraseña.' });

    const encontrado = await Login.buscarPorUsuario(usuario);
    if (!encontrado || !encontrado.activo || !(await bcrypt.compare(password, encontrado.password_hash))) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = {
        id: encontrado.id,
        usuario: encontrado.usuario,
        nombre_completo: encontrado.nombre_completo,
        rol: encontrado.rol
      };
      res.json({ ok: true, usuario: req.session.user });
    });
  } catch (error) {
    next(error);
  }
}

function cerrarSesion(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('lab.sid');
    res.json({ ok: true });
  });
}

async function usuarioActual(req, res, next) {
  try {
    const usuario = req.session.user || null;
    if (!usuario) return res.json({ usuario: null, permisos: [] });
    const permisos = usuario.rol === 'administrador'
      ? viewKeys
      : await Login.permisosPorUsuario(usuario.id);
    res.json({ usuario, permisos });
  } catch (error) {
    next(error);
  }
}

module.exports = { mostrarLogin, iniciarSesion, cerrarSesion, usuarioActual };
