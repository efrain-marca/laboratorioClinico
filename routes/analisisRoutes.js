const express=require('express');
const c=require('../controllers/analisisController');
const router=express.Router();
router.get('/',c.listar);
router.get('/:id',c.obtener);
router.post('/',c.crear);
router.put('/:id',c.actualizar);
router.delete('/:id',c.eliminar);
module.exports=router;
