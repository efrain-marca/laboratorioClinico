const form=document.querySelector('#form');
let rows=[],analysisOptions=[],savedPrices=new Map(),canProcess=false;
async function loadRole(){const data=await api('/api/login/me');canProcess=['administrador','laboratorista'].includes(data.usuario?.rol);if(rows.length)render();}
async function loadOptions(solicitudId=''){
	const query=solicitudId?`?solicitud_id=${encodeURIComponent(solicitudId)}`:'';
	const data=await api('/api/solicitudes/opciones'+query);
	analysisOptions=data.analisis;
	document.querySelector('#analisis-list').innerHTML=data.analisis.map(item=>`<label class="checkitem"><input type="checkbox" value="${item.id}"><span>${esc(item.nombre)} (${money(item.precio)})</span></label>`).join('')||'<p>No hay análisis activos. Registra análisis primero.</p>';
	document.querySelectorAll('#analisis-list input').forEach(input=>input.addEventListener('change',updateTotal));
}
async function searchPatients(term){
	const results=document.querySelector('#patient-results');
	if(!term.trim()){results.hidden=true;results.innerHTML='';return;}
	const patients=await api(`/api/solicitudes/opciones/pacientes?buscar=${encodeURIComponent(term)}`);
	results.innerHTML=patients.map(patient=>`<button type="button" class="search-option" data-patient-id="${patient.id}" data-patient-label="${esc(`${patient.codigo_paciente} · ${patient.ci} · ${patient.nombre}`)}" data-patient-details="${esc([patient.telefono,patient.email].filter(Boolean).join(' · '))}">${esc(patient.ci)} · ${esc(patient.nombre)} (${esc(patient.codigo_paciente)})</button>`).join('')||'<span class="search-empty">Sin coincidencias.</span>';
	results.hidden=false;
}
function updateTotal(){
	const total=[...document.querySelectorAll('#analisis-list input:checked')].reduce((sum,input)=>{
		const id=Number(input.value),saved=savedPrices.get(id),item=analysisOptions.find(option=>Number(option.id)===id);
		return sum+Number(saved??item?.precio??0);
	},0);
	document.querySelector('#estimated-total').textContent=money(total);
}
function resetForm(){form.reset();document.querySelector('#solicitud-id').value='';document.querySelector('#paciente_id').value='';document.querySelector('#paciente-search').value='';document.querySelector('#selected-patient').textContent='Selecciona un paciente de los resultados.';document.querySelector('#patient-results').hidden=true;document.querySelector('#form-title').textContent='Nueva solicitud';document.querySelector('button[type="submit"]').textContent='Crear solicitud';document.querySelector('#cancel-edit').hidden=true;savedPrices=new Map();updateTotal();}
function render(){
	document.querySelector('#rows').innerHTML=rows.map(item=>{const states=item.estado==='Pendiente'?['Pendiente','En proceso','Cancelada']:item.estado==='En proceso'?['En proceso','Cancelada']:[item.estado];return `<tr><td>${esc(item.codigo)}</td><td>${esc(item.paciente)}</td><td>${esc(dateText(item.fecha_solicitud))}</td><td><select data-state="${item.id}" ${canProcess?'':'disabled'}>${states.map(state=>`<option ${state===item.estado?'selected':''}>${state}</option>`).join('')}</select></td><td>${money(item.total)}</td><td>${money(item.pagado)}</td><td><div class="actions">${item.estado==='Pendiente'?`<button class="btn secondary" data-edit="${item.id}">Editar</button>`:''}<button class="btn danger" data-del="${item.id}">Eliminar</button></div></td></tr>`;}).join('')||'<tr><td colspan="7" class="empty">No hay solicitudes.</td></tr>';
}
async function refresh(){rows=await api('/api/solicitudes');render();}
form.addEventListener('submit',async event=>{
	event.preventDefault();
	const id=document.querySelector('#solicitud-id').value;
	const body={paciente_id:document.querySelector('#paciente_id').value,analisis_ids:[...document.querySelectorAll('#analisis-list input:checked')].map(input=>Number(input.value)),observaciones:document.querySelector('#observaciones').value};
	if(!body.paciente_id){notice('Busca y selecciona un paciente antes de guardar.',true);return;}
	try{await api('/api/solicitudes'+(id?`/${id}`:''),{method:id?'PUT':'POST',body:JSON.stringify(body)});notice(id?'Solicitud actualizada correctamente.':'Solicitud creada correctamente.');resetForm();await Promise.all([loadOptions(),refresh()]);}catch(error){notice(error.message,true);}
});
document.querySelector('#rows').addEventListener('change',async event=>{
	if(!event.target.dataset.state)return;
	try{await api(`/api/solicitudes/${event.target.dataset.state}/estado`,{method:'PATCH',body:JSON.stringify({estado:event.target.value})});notice('Estado actualizado.');await refresh();}catch(error){notice(error.message,true);await refresh();}
});
document.querySelector('#rows').addEventListener('click',async event=>{
	const edit=event.target.dataset.edit,remove=event.target.dataset.del;
	try{
		if(edit){
			const item=await api(`/api/solicitudes/${edit}`);
			await loadOptions(item.id);
			savedPrices=new Map(item.detalles.map(detail=>[Number(detail.analisis_id),Number(detail.precio)]));
			document.querySelector('#solicitud-id').value=item.id;
			document.querySelector('#paciente_id').value=item.paciente_id;
			document.querySelector('#paciente-search').value=`${item.codigo_paciente} · ${item.ci} · ${item.paciente}`;
			document.querySelector('#selected-patient').textContent=`Paciente seleccionado: ${item.ci} · ${item.paciente}`;
			document.querySelector('#observaciones').value=item.observaciones||'';
			document.querySelectorAll('#analisis-list input').forEach(input=>input.checked=savedPrices.has(Number(input.value)));
			document.querySelector('#form-title').textContent=`Editar solicitud ${item.codigo}`;
			document.querySelector('button[type="submit"]').textContent='Guardar cambios';
			document.querySelector('#cancel-edit').hidden=false;
			updateTotal();window.scrollTo({top:0,behavior:'smooth'});return;
		}
		if(remove&&confirm('¿Eliminar solicitud?')){await api(`/api/solicitudes/${remove}`,{method:'DELETE'});notice('Solicitud eliminada.');await refresh();}
	}catch(error){notice(error.message,true);}
});
document.querySelector('#paciente-search').addEventListener('input',event=>{document.querySelector('#paciente_id').value='';document.querySelector('#selected-patient').textContent='Selecciona un paciente de los resultados.';searchPatients(event.target.value).catch(error=>notice(error.message,true));});
document.querySelector('#patient-results').addEventListener('click',event=>{const option=event.target.closest('[data-patient-id]');if(!option)return;document.querySelector('#paciente_id').value=option.dataset.patientId;document.querySelector('#paciente-search').value=option.dataset.patientLabel;document.querySelector('#selected-patient').textContent=`Paciente seleccionado: ${option.dataset.patientLabel}${option.dataset.patientDetails?` · ${option.dataset.patientDetails}`:''}`;document.querySelector('#patient-results').hidden=true;});
document.querySelector('#cancel-edit').addEventListener('click',async()=>{resetForm();await loadOptions();});
document.querySelector('#form').addEventListener('reset',()=>{savedPrices=new Map();updateTotal();});
Promise.all([loadRole(),loadOptions(),refresh()]).catch(error=>notice(error.message,true));
window.addEventListener('payment-saved',refresh);
