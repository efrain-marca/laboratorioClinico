const form=document.querySelector('#user-form');
let users=[],views=[];

function selectedPermissions(){return [...document.querySelectorAll('#permisos input:checked')].map(input=>input.value);}
function clearForm(){form.reset();document.querySelector('#user-id').value='';document.querySelector('#usuario').disabled=false;document.querySelector('#password').required=true;document.querySelector('#password-required').hidden=false;document.querySelector('#password-help').textContent='Mínimo 10 caracteres.';document.querySelector('#form-title').textContent='Registrar usuario';renderPermissions();}
function renderPermissions(selected=[]){
  const role=document.querySelector('#rol').value;
  const available=views.filter(view=>role==='recepcionista'?view.key!=='reportes':role==='laboratorista'?['solicitudes','resultados','almacen'].includes(view.key):role==='cajero'?view.key==='pagos':false);
  document.querySelector('#permisos').innerHTML=available.map(view=>`<label class="checkitem"><input type="checkbox" value="${esc(view.key)}" ${selected.includes(view.key)?'checked':''}>${esc(view.label)}</label>`).join('');
}
function render(){
  renderPermissions();
  document.querySelector('#rows').innerHTML=users.map(user=>{
    const viewLabels=user.permisos.map(key=>views.find(view=>view.key===key)?.label||key).join(', ')||'Ninguna';
    const actions=user.rol==='administrador'?'Administrador principal':`<div class="actions"><button class="btn secondary" data-edit="${user.id}">Editar</button><button class="btn ${user.activo?'danger':'secondary'}" data-toggle="${user.id}" data-active="${user.activo}">${user.activo?'Desactivar':'Activar'}</button><button class="btn danger" data-delete="${user.id}">Eliminar</button></div>`;
    const roleLabels={recepcionista:'Recepcionista',laboratorista:'Laboratorista',cajero:'Cajero'};
    return `<tr><td>${esc(user.usuario)}</td><td>${esc(user.nombre_completo)}</td><td>${roleLabels[user.rol]||esc(user.rol)}</td><td>${esc(viewLabels)}</td><td>${user.activo?'Activo':'Inactivo'}</td><td>${actions}</td></tr>`;
  }).join('')||'<tr><td colspan="6" class="empty">No hay usuarios registrados.</td></tr>';
}
async function refresh(){const data=await api('/api/usuarios');users=data.usuarios;views=data.vistas;render();}
function editUser(user){
  document.querySelector('#user-id').value=user.id;
  document.querySelector('#usuario').value=user.usuario;
  document.querySelector('#usuario').disabled=false;
  document.querySelector('#nombre_completo').value=user.nombre_completo;
  document.querySelector('#rol').value=user.rol;
  renderPermissions(user.permisos);
  document.querySelector('#password').value='';
  document.querySelector('#password').required=false;
  document.querySelector('#password-required').hidden=true;
  document.querySelector('#password-help').textContent='Déjala vacía para conservar la contraseña actual.';
  document.querySelectorAll('#permisos input').forEach(input=>input.checked=user.permisos.includes(input.value));
  document.querySelector('#form-title').textContent='Editar usuario';
  window.scrollTo({top:0,behavior:'smooth'});
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const id=document.querySelector('#user-id').value;
  const body={usuario:document.querySelector('#usuario').value,nombre_completo:document.querySelector('#nombre_completo').value,rol:document.querySelector('#rol').value,password:document.querySelector('#password').value,permisos:selectedPermissions()};
  try{await api('/api/usuarios'+(id?'/'+id:''),{method:id?'PUT':'POST',body:JSON.stringify(body)});notice('Usuario guardado correctamente.');clearForm();await refresh();}catch(error){notice(error.message,true);}
});
document.querySelector('#rows').addEventListener('click',async event=>{
  const edit=event.target.dataset.edit,toggle=event.target.dataset.toggle,remove=event.target.dataset.delete;
  if(edit){editUser(users.find(user=>user.id==edit));return;}
  if(toggle){try{await api(`/api/usuarios/${toggle}/estado`,{method:'PATCH',body:JSON.stringify({activo:event.target.dataset.active!=='true'})});notice('Estado actualizado.');await refresh();}catch(error){notice(error.message,true);}}
  if(remove&&confirm('¿Eliminar este usuario? Si tiene actividad asociada, desactívalo para conservar el historial.')){try{await api(`/api/usuarios/${remove}`,{method:'DELETE'});notice('Usuario eliminado.');await refresh();}catch(error){notice(error.message,true);}}
});
document.querySelector('#cancel-edit').addEventListener('click',clearForm);
document.querySelector('#rol').addEventListener('change',()=>renderPermissions(selectedPermissions()));
refresh().catch(error=>notice(error.message,true));