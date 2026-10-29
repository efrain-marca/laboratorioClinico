const express=require('express');
const c=require('../controllers/loginController');
const router=express.Router();
router.get('/',c.mostrarLogin);
router.post('/',c.iniciarSesion);
router.post('/logout',c.cerrarSesion);
router.get('/me',c.usuarioActual);
module.exports=router;
