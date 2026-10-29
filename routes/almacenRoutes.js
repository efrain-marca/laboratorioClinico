const express = require('express');
const controller = require('../controllers/almacenController');
const router = express.Router();

router.get('/', controller.listar);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);

module.exports = router;