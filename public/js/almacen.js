const form=document.querySelector('#item-form');
let items=[];

function render(){
  const term=document.querySelector('#search').value.trim().toLocaleLowerCase('es');
  const filtered=items.filter(item=>item.nombre.toLocaleLowerCase('es').includes(term));
  document.querySelector('#rows').innerHTML=filtered.map(item=>`<tr><td>${esc(item.codigo)}</td><td>${esc(item.nombre)}${item.descripcion?`<br><small class="muted">${esc(item.descripcion)}</small>`:''}</td><td>${esc(item.unidad)}</td><td>${Number(item.stock_actual).toLocaleString('es-BO')}</td><td>${Number(item.stock_minimo).toLocaleString('es-BO')}</td><td>${Number(item.activo)?(Number(item.stock_actual)<=Number(item.stock_minimo)?'Stock bajo':'Activo'):'Inactivo'}</td><td><div class="actions"><button class="btn secondary" data-edit="${item.id}">Editar</button><button class="btn danger" data-delete="${item.id}">Eliminar</button></div></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No hay químicos que coincidan.</td></tr>';
}
async function refresh(){items=await api('/api/almacen');render();}
function clearForm(){form.reset();document.querySelector('#item-id').value='';document.querySelector('#stock_actual').value='0';document.querySelector('#stock_minimo').value='0';document.querySelector('#activo').value='1';document.querySelector('#form-title').textContent='Registrar químico';}
function editItem(item){
  document.querySelector('#item-id').value=item.id;
  for(const field of ['nombre','unidad','stock_actual','stock_minimo','descripcion','activo'])document.getElementById(field).value=item[field]??'';
  document.querySelector('#form-title').textContent=`Editar ${item.nombre} (${item.codigo})`;
  window.scrollTo({top:0,behavior:'smooth'});
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const id=document.querySelector('#item-id').value;
  const body=Object.fromEntries(['nombre','unidad','stock_actual','stock_minimo','descripcion','activo'].map(field=>[field,document.getElementById(field).value]));
  body.stock_actual=Number(body.stock_actual);body.stock_minimo=Number(body.stock_minimo);body.activo=Number(body.activo);
  try{await api('/api/almacen'+(id?`/${id}`:''),{method:id?'PUT':'POST',body:JSON.stringify(body)});notice(id?'Químico actualizado.':'Químico registrado.');clearForm();await refresh();}catch(error){notice(error.message,true);}
});
document.querySelector('#rows').addEventListener('click',async event=>{
  const edit=event.target.dataset.edit,remove=event.target.dataset.delete;
  if(edit){editItem(items.find(item=>item.id==edit));return;}
  if(remove&&confirm('¿Eliminar este químico del inventario?')){try{await api(`/api/almacen/${remove}`,{method:'DELETE'});notice('Químico eliminado.');await refresh();}catch(error){notice(error.message,true);}}
});
document.querySelector('#search').addEventListener('input',render);
document.querySelector('#cancel-edit').addEventListener('click',clearForm);
refresh().catch(error=>notice(error.message,true));