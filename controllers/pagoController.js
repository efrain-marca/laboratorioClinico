const Model=require('../models/pagoModel');
async function listar(req,res,next){try{res.json(await Model.listar());}catch(e){next(e);}}
async function opciones(req,res,next){try{res.json(await Model.solicitudesConSaldo(String(req.query.buscar||'').trim()));}catch(e){next(e);}}
async function crear(req,res,next){
 try{
  const solicitud_id=Number(req.body.solicitud_id), monto=Number(req.body.monto);
  const metodos=['Efectivo','Tarjeta','Transferencia','QR','Otro'];
  if(!solicitud_id||!Number.isFinite(monto)||monto<=0)return res.status(400).json({error:'Selecciona una solicitud e ingresa un monto mayor a cero.'});
  if(!metodos.includes(req.body.metodo))return res.status(400).json({error:'Método de pago no válido.'});
    const solicitud=await Model.saldoSolicitud(solicitud_id);
  if(!solicitud)return res.status(404).json({error:'Solicitud no encontrada.'});
  if(monto>Number(solicitud.saldo)+0.001)return res.status(400).json({error:'El pago supera el saldo pendiente.'});
  res.status(201).json(await Model.crear({solicitud_id,monto,metodo:req.body.metodo,referencia:req.body.referencia},req.session.user.id));
 }catch(e){next(e);}
}
async function eliminar(req,res,next){try{if(!await Model.eliminar(Number(req.params.id)))return res.status(404).json({error:'Pago no encontrado.'});res.json({ok:true});}catch(e){next(e);}}
module.exports={listar,opciones,crear,eliminar};
