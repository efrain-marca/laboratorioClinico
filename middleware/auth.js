const Login = require('../models/loginModel');

async function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ error: 'Debes iniciar sesión.' });
    }
    return res.redirect('/login');
  }
  if (req.session.user.rol !== 'administrador') {
    try {
      if (!(await Login.usuarioActivo(req.session.user.id))) {
        req.session.destroy(() => {});
        if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ error: 'La cuenta está desactivada.' });
        return res.redirect('/login');
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
}

function requireViewAccess(view) {
  return async (req, res, next) => {
    if (!req.session?.user) return requireAuth(req, res, next);
    if (req.session.user.rol === 'administrador') return next();
    try {
      if (!(await Login.usuarioActivo(req.session.user.id))) {
        req.session.destroy(() => {});
        if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ error: 'La cuenta está desactivada.' });
        return res.redirect('/login');
      }
      if (await Login.tienePermiso(req.session.user.id, view)) return next();
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ error: 'No tienes acceso a esta vista.' });
      }
      return res.status(403).send('No tienes acceso a esta vista.');
    } catch (error) {
      next(error);
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    if (!roles.includes(req.session.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta operación.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, requireViewAccess };
