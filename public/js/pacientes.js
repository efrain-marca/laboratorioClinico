let rows=[];
const form=document.querySelector('#form');

async function searchPeople(term){
	const results=document.querySelector('#persona-results');
	if(!term.trim()){results.hidden=true;results.innerHTML='';return;}
	const people=await api(`/api/pacientes/opciones/personas?buscar=${encodeURIComponent(term)}${document.querySelector('#paciente-id').value?`&paciente_id=${document.querySelector('#paciente-id').value}`:''}`);
	results.innerHTML=people.map(person=>`<button type="button" class="search-option" data-person-id="${person.id}" data-person-name="${esc(`${person.nombres} ${person.apellidos}`)}" data-person-ci="${esc(person.ci)}">${esc(person.ci)} · ${esc(person.nombres)} ${esc(person.apellidos)}</button>`).join('')||'<span class="search-empty">Sin coincidencias.</span>';
	results.hidden=false;
}
function clearForm(){form.reset();document.querySelector('#paciente-id').value='';document.querySelector('#persona_id').value='';document.querySelector('#codigo_paciente').value='';document.querySelector('#persona-search').value='';document.querySelector('#persona-results').hidden=true;document.querySelector('#selected-person').textContent='Selecciona una persona de los resultados.';document.querySelector('#form-title').textContent='Registrar paciente';}
function render(){
	document.querySelector('#rows').innerHTML=rows.map(patient=>`<tr><td>${esc(patient.codigo_paciente)}</td><td>${esc(patient.ci)}</td><td>${esc(patient.nombres)} ${esc(patient.apellidos)}</td><td>${esc(patient.telefono)}</td><td><div class="actions"><button class="btn secondary" data-edit="${patient.id}">Editar</button><button class="btn secondary" data-history="${patient.id}">Historial</button><button class="btn danger" data-del="${patient.id}">Eliminar</button></div></td></tr>`).join('')||'<tr><td colspan="5" class="empty">No hay pacientes.</td></tr>';
}
async function refresh(){rows=await api('/api/pacientes');render();}
async function showHistory(id){
	const data=await api(`/api/pacientes/${id}/historial`),patient=data.paciente;
	const balance=request=>Math.max(0,Number(request.total)-Number(request.pagado));
	document.querySelector('#history-content').innerHTML=`<p><strong>${esc(patient.codigo_paciente)} · ${esc(patient.ci)}</strong> | ${esc(patient.nombres)} ${esc(patient.apellidos)} | ${esc(patient.telefono)} | ${esc(patient.email)}</p>
		<h3>Solicitudes</h3><div class="table-wrap"><table><thead><tr><th>Código</th><th>Fecha</th><th>Estado</th><th>Total</th><th>Pagado</th><th>Saldo</th></tr></thead><tbody>${data.solicitudes.map(item=>`<tr><td>${esc(item.codigo)}</td><td>${esc(dateText(item.fecha_solicitud))}</td><td>${esc(item.estado)}</td><td>${money(item.total)}</td><td>${money(item.pagado)}</td><td>${money(balance(item))}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Sin solicitudes.</td></tr>'}</tbody></table></div>
		<h3>Resultados</h3><div class="table-wrap"><table><thead><tr><th>Solicitud</th><th>Análisis</th><th>Valor</th><th>Interpretación</th><th>Fecha</th><th>Validación</th></tr></thead><tbody>${data.resultados.map(item=>`<tr><td>${esc(item.solicitud)}</td><td>${esc(item.analisis)}</td><td>${esc(item.valor)} ${esc(item.unidad)}</td><td>${esc(item.interpretacion)}</td><td>${esc(dateText(item.fecha_resultado))}</td><td>${item.validado?'Validado':'Pendiente'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Sin resultados.</td></tr>'}</tbody></table></div>
		<h3>Pagos</h3><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Solicitud</th><th>Monto</th><th>Método</th></tr></thead><tbody>${data.pagos.map(item=>`<tr><td>${esc(dateText(item.fecha_pago))}</td><td>${esc(item.solicitud)}</td><td>${money(item.monto)}</td><td>${esc(item.metodo)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Sin pagos.</td></tr>'}</tbody></table></div>`;
	document.querySelector('#history-panel').hidden=false;
	document.querySelector('#history-panel').scrollIntoView({behavior:'smooth'});
}
form.addEventListener('submit',async event=>{
	event.preventDefault();
	const id=document.querySelector('#paciente-id').value;
	const body={persona_id:document.querySelector('#persona_id').value,observaciones:document.querySelector('#observaciones').value};
	if(!body.persona_id){notice('Busca y selecciona una persona antes de guardar.',true);return;}
	try{const saved=await api('/api/pacientes'+(id?`/${id}`:''),{method:id?'PUT':'POST',body:JSON.stringify(body)});notice(id?'Paciente actualizado.':`Paciente registrado con código ${saved.codigo_paciente}.`);clearForm();await refresh();}catch(error){notice(error.message,true);}
});
document.querySelector('#rows').addEventListener('click',async event=>{
	const edit=event.target.dataset.edit,history=event.target.dataset.history,remove=event.target.dataset.del;
	try{
		if(edit){const patient=rows.find(row=>row.id==edit);document.querySelector('#paciente-id').value=patient.id;document.querySelector('#persona_id').value=patient.persona_id;document.querySelector('#persona-search').value=`${patient.ci} · ${patient.nombres} ${patient.apellidos}`;document.querySelector('#selected-person').textContent=`Seleccionada: ${patient.ci} · ${patient.nombres} ${patient.apellidos}`;document.querySelector('#codigo_paciente').value=patient.codigo_paciente;document.querySelector('#observaciones').value=patient.observaciones||'';document.querySelector('#form-title').textContent='Editar paciente';window.scrollTo({top:0,behavior:'smooth'});return;}
		if(history){await showHistory(history);return;}
		if(remove&&confirm('¿Eliminar paciente?')){await api(`/api/pacientes/${remove}`,{method:'DELETE'});notice('Paciente eliminado.');clearForm();await Promise.all([loadOptions(),refresh()]);}
	}catch(error){notice(error.message,true);}
});
document.querySelector('#persona-search').addEventListener('input',event=>{document.querySelector('#persona_id').value='';document.querySelector('#selected-person').textContent='Selecciona una persona de los resultados.';searchPeople(event.target.value).catch(error=>notice(error.message,true));});
document.querySelector('#persona-results').addEventListener('click',event=>{const option=event.target.closest('[data-person-id]');if(!option)return;document.querySelector('#persona_id').value=option.dataset.personId;document.querySelector('#persona-search').value=`${option.dataset.personCi} · ${option.dataset.personName}`;document.querySelector('#selected-person').textContent=`Seleccionada: ${option.dataset.personCi} · ${option.dataset.personName}`;document.querySelector('#persona-results').hidden=true;});
document.querySelector('#cancel-edit').addEventListener('click',clearForm);
document.querySelector('#close-history').addEventListener('click',()=>{document.querySelector('#history-panel').hidden=true;});
refresh().catch(error=>notice(error.message,true));
