/**
 * RESIDENT.JS - Lógica de Perfil (Multifuente y Multicontacto)
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbxLw9c7kFEB-HOfV_DJ_urMtoP4b8ye8k3E1IR95BfdlsntCDa9G3FOoPHu3XvDrsUyyg/exec';
const FALLBACK_IMAGE = 'https://placehold.co/200x200/0A3D91/FFFFFF/png?text=Sin+Foto';

let currentResidentName = new URLSearchParams(window.location.search).get('id');
let isEditMode = false;
let base64ImageToUpload = null;
let currentFotoUrl = '';
let isArchivedProfile = false; // Bandera para saber si es un residente histórico

document.addEventListener('DOMContentLoaded', () => {
    window.onbeforeunload = null;

    if (currentResidentName) {
        loadResidentData();
    } else {
        toggleEditMode(true);
        addOsRow('', '');
        addResponsableRow('', '', '', ''); // Añade un bloque vacío por defecto
        document.getElementById('profileImage').src = FALLBACK_IMAGE;
    }
    setupFormEvents();
});

async function loadResidentData() {
    const loader = document.getElementById('loader');
    loader.classList.remove('hidden');

    try {
        // BUSCADOR DUAL: Busca en ambas pestañas al mismo tiempo
        const [resActivos, resArchivados] = await Promise.all([
            fetch(`${API_URL}?action=getResidents`).then(r => r.json()),
            fetch(`${API_URL}?action=getArchived`).then(r => r.json())
        ]);

        let todosLosResidentes = [];
        if (resActivos.status === 'success') todosLosResidentes = todosLosResidentes.concat(resActivos.data);
        if (resArchivados.status === 'success') todosLosResidentes = todosLosResidentes.concat(resArchivados.data);

        const resident = todosLosResidentes.find(r => r.nombre === currentResidentName);
        if (resident) {
            isArchivedProfile = (resident.estado === 'Archivado');
            populateForm(resident);
        } else {
            showToast("Residente no encontrado en la base de datos", true);
        }
    } catch (error) {
        showToast("Error de conexión al cargar", true);
        console.error(error);
    } finally {
        loader.classList.add('hidden');
    }
}

function populateForm(data) {
    document.getElementById('nombre').value = data.nombre;
    document.getElementById('numeroSocio').value = data.numeroSocio || '';
    document.getElementById('fechaNacimiento').value = formatToInputDate(data.fechaNacimiento);
    document.getElementById('edad').value = data.edad || '';
    document.getElementById('dni').value = data.dni || '';
    document.getElementById('cuil').value = data.cuil || '';
    document.getElementById('numeroTramite').value = data.numeroTramite || '';
    document.getElementById('lugarInternacion').value = data.lugarInternacion || '';
    document.getElementById('alergias').value = data.alergias || '';
    document.getElementById('medicoCabecera').value = data.medicoCabecera || '';
    document.getElementById('fechaIngreso').value = formatToInputDate(data.fechaIngreso);
    document.getElementById('nacionalidad').value = data.nacionalidad || '';
    
    // Si existe el campo viejo de domicilio (se mantiene por si acaso)
    if(document.getElementById('domicilio')) document.getElementById('domicilio').value = data.domicilio || '';

    // ================= OBRAS SOCIALES DINÁMICAS =================
    const osContainer = document.getElementById('obrasSocialesContainer');
    if (osContainer) {
        osContainer.innerHTML = '';
        if (data.obrasSociales && data.obrasSociales.length > 0) {
            data.obrasSociales.forEach((os, index) => { addOsRow(os, data.numerosOs[index]); });
        } else { addOsRow('', ''); }
    }

    // ================= RESPONSABLES DINÁMICOS =================
    const respContainer = document.getElementById('responsablesContainer');
    if (respContainer) {
        respContainer.innerHTML = '';
        if (data.responsablesList && data.responsablesList.length > 0) {
            data.responsablesList.forEach((resp, index) => {
                addResponsableRow(
                    resp, 
                    data.dniResponsablesList[index] || '', 
                    data.telefonosList[index] || '', 
                    data.domicilioResponsablesList[index] || ''
                );
            });
        } else {
            addResponsableRow('', '', '', '');
        }
    }

    // ================= DATOS DE ARCHIVO =================
    const divSalida = document.getElementById('divFechaSalida');
    const inputSalida = document.getElementById('fechaSalida');
    const statusBadge = document.getElementById('statusBadge'); // Opcional, si agregamos una etiqueta visual

    if (isArchivedProfile) {
        if(divSalida) divSalida.classList.remove('hidden');
        if(inputSalida) inputSalida.value = formatToInputDate(data.fechaSalida);
        if(statusBadge) {
            statusBadge.textContent = 'ARCHIVADO';
            statusBadge.style.display = 'inline-block';
            statusBadge.style.backgroundColor = 'var(--danger)';
            statusBadge.style.color = 'white';
            statusBadge.style.padding = '5px 15px';
            statusBadge.style.borderRadius = '8px';
        }
    } else {
        if(divSalida) divSalida.classList.add('hidden');
        if(statusBadge) statusBadge.style.display = 'none';
    }

    currentFotoUrl = data.fotoUrl;
    document.getElementById('profileImage').src = (data.fotoUrl && data.fotoUrl !== '') ? data.fotoUrl : FALLBACK_IMAGE;
}

function formatToInputDate(sheetDate) {
    if(!sheetDate) return '';
    try {
        if(sheetDate.includes('/')) {
            const parts = sheetDate.split('/');
            return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
        return new Date(sheetDate).toISOString().split('T')[0];
    } catch { return sheetDate; }
}

function setupFormEvents() {
    document.getElementById('btnEdit').onclick = (e) => { e.preventDefault(); toggleEditMode(true); };
    document.getElementById('btnSave').onclick = (e) => { e.preventDefault(); saveResident(); };
    
    // Controles dinámicos
    const btnAddOs = document.getElementById('btnAddOs');
    if(btnAddOs) btnAddOs.onclick = (e) => { e.preventDefault(); addOsRow('', ''); };
    
    const btnAddResp = document.getElementById('btnAddResponsable');
    if(btnAddResp) btnAddResp.onclick = (e) => { e.preventDefault(); addResponsableRow('', '', '', ''); };
    
    document.getElementById('imageUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById('profileImage').src = event.target.result;
                base64ImageToUpload = { base64: event.target.result, mimeType: file.type };
            };
            reader.readAsDataURL(file);
        }
    });
}

function toggleEditMode(enable) {
    // Si está archivado, bloqueamos la edición permanentemente
    if (isArchivedProfile) {
        showToast("Los perfiles archivados son de solo lectura.", true);
        return;
    }

    isEditMode = enable;
    const form = document.getElementById('residentForm');
    const inputs = form.querySelectorAll('input');
    
    if (enable) {
        form.classList.remove('readonly-mode');
        inputs.forEach(input => input.removeAttribute('readonly'));
        document.getElementById('btnEdit').classList.add('hidden');
        document.getElementById('btnSave').classList.remove('hidden');
        if(document.getElementById('btnAddOs')) document.getElementById('btnAddOs').classList.remove('hidden');
        if(document.getElementById('btnAddResponsable')) document.getElementById('btnAddResponsable').classList.remove('hidden');
        document.getElementById('uploadOverlay').classList.remove('hidden');
        document.querySelectorAll('.btn-remove-os').forEach(btn => btn.classList.remove('hidden'));
        document.querySelectorAll('.btn-remove-resp').forEach(btn => btn.classList.remove('hidden'));
    } else {
        form.classList.add('readonly-mode');
        inputs.forEach(input => input.setAttribute('readonly', 'true'));
        document.getElementById('btnEdit').classList.remove('hidden');
        document.getElementById('btnSave').classList.add('hidden');
        if(document.getElementById('btnAddOs')) document.getElementById('btnAddOs').classList.add('hidden');
        if(document.getElementById('btnAddResponsable')) document.getElementById('btnAddResponsable').classList.add('hidden');
        document.getElementById('uploadOverlay').classList.add('hidden');
        document.querySelectorAll('.btn-remove-os').forEach(btn => btn.classList.add('hidden'));
        document.querySelectorAll('.btn-remove-resp').forEach(btn => btn.classList.add('hidden'));
    }
}

function addOsRow(osValue, nroValue) {
    const container = document.getElementById('obrasSocialesContainer');
    if(!container) return;
    const row = document.createElement('div');
    row.className = 'os-row';
    row.innerHTML = `
        <div class="form-group flex-1">
            <label>Obra Social</label>
            <input type="text" class="os-name" value="${osValue}" ${!isEditMode ? 'readonly' : ''}>
        </div>
        <div class="form-group flex-1">
            <label>N° Obra Social</label>
            <input type="text" class="os-number" value="${nroValue}" ${!isEditMode ? 'readonly' : ''}>
        </div>
        <button type="button" class="btn-remove-os ${!isEditMode ? 'hidden' : ''}" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
    `;
    container.appendChild(row);
}

// NUEVA FUNCIÓN: Agrega bloques completos para los responsables
function addResponsableRow(nombreVal, dniVal, telVal, domVal) {
    const container = document.getElementById('responsablesContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'responsable-block';
    row.style.cssText = 'position: relative; background: var(--bg-main); padding: 15px; border-radius: var(--radius-md); margin-bottom: 15px; border: 1px solid var(--border-color);';
    
    row.innerHTML = `
        <button type="button" class="btn-remove-resp ${!isEditMode ? 'hidden' : ''}" onclick="this.closest('.responsable-block').remove()" style="position: absolute; top: 10px; right: 10px; background: var(--danger); color: white; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer; z-index: 10;"><i class="fa-solid fa-trash"></i></button>
        <div class="form-row" style="margin-right: 40px;">
            <div class="form-group flex-2">
                <label>Nombre del Contacto / Responsable</label>
                <input type="text" class="resp-nombre" value="${nombreVal}" ${!isEditMode ? 'readonly' : ''}>
            </div>
            <div class="form-group flex-1">
                <label>DNI</label>
                <input type="text" class="resp-dni" value="${dniVal}" ${!isEditMode ? 'readonly' : ''}>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group flex-1">
                <label>Teléfono</label>
                <input type="text" class="resp-tel" value="${telVal}" ${!isEditMode ? 'readonly' : ''}>
            </div>
            <div class="form-group flex-2">
                <label>Domicilio del Responsable</label>
                <input type="text" class="resp-dom" value="${domVal}" ${!isEditMode ? 'readonly' : ''}>
            </div>
        </div>
    `;
    container.appendChild(row);
}

async function saveResident() {
    if(isArchivedProfile) return showToast("No se puede editar un perfil archivado.", true);

    const btnSave = document.getElementById('btnSave');
    const loader = document.getElementById('loader');
    
    const nombreInput = document.getElementById('nombre').value.trim();
    if(!nombreInput) { showToast("El Nombre Completo es obligatorio", true); return; }

    btnSave.disabled = true;
    loader.classList.remove('hidden');

    try {
        let finalFotoUrl = currentFotoUrl;
        if (base64ImageToUpload) {
            const imgPayload = { action: 'uploadImage', payload: { nombre: nombreInput, base64: base64ImageToUpload.base64, mimeType: base64ImageToUpload.mimeType } };
            const imgRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify(imgPayload) });
            const imgData = await imgRes.json();
            if(imgData.status === 'success') finalFotoUrl = imgData.data.url;
        }

        const osNames = Array.from(document.querySelectorAll('.os-name')).map(el => el.value.trim());
        const osNumbers = Array.from(document.querySelectorAll('.os-number')).map(el => el.value.trim());

        // Recolectar datos del nuevo sistema de responsables múltiples
        const respNames = Array.from(document.querySelectorAll('.resp-nombre')).map(el => el.value.trim());
        const respDnis = Array.from(document.querySelectorAll('.resp-dni')).map(el => el.value.trim());
        const respTels = Array.from(document.querySelectorAll('.resp-tel')).map(el => el.value.trim());
        const respDoms = Array.from(document.querySelectorAll('.resp-dom')).map(el => el.value.trim());

        const residentData = {
            nombreViejo: currentResidentName, 
            nombre: nombreInput,
            numeroSocio: document.getElementById('numeroSocio').value,
            fechaNacimiento: document.getElementById('fechaNacimiento').value,
            edad: document.getElementById('edad').value,
            dni: document.getElementById('dni').value,
            cuil: document.getElementById('cuil').value,
            numeroTramite: document.getElementById('numeroTramite').value,
            lugarInternacion: document.getElementById('lugarInternacion').value,
            alergias: document.getElementById('alergias').value,
            medicoCabecera: document.getElementById('medicoCabecera').value,
            obrasSociales: osNames,
            numerosOs: osNumbers,
            fechaIngreso: document.getElementById('fechaIngreso').value,
            nacionalidad: document.getElementById('nacionalidad').value,
            
            // Enviamos el primer responsable como titular por retrocompatibilidad backend
            responsable: respNames[0] || '',
            dniResponsable: respDnis[0] || '',
            telefono: respTels[0] || '',
            domicilioResponsable: respDoms[0] || '',
            domicilio: document.getElementById('domicilio') ? document.getElementById('domicilio').value : '',
            
            fotoUrl: finalFotoUrl
        };

        const postData = { action: 'saveResident', payload: residentData };
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(postData) });
        const result = await response.json();

        if (result.status === 'success') {
            showToast("Guardado correctamente");
            currentResidentName = nombreInput;
            currentFotoUrl = finalFotoUrl;
            base64ImageToUpload = null;
            toggleEditMode(false);
            window.history.replaceState({}, '', `resident.html?id=${encodeURIComponent(nombreInput)}`);
        } else {
            showToast("Error: " + result.message, true);
        }
    } catch (error) {
        showToast("Error al guardar", true);
    } finally {
        btnSave.disabled = false;
        loader.classList.add('hidden');
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + (isError ? 'error' : '');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
