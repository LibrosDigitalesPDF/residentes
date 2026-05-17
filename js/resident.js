/**
 * RESIDENT.JS - Lógica de Perfil (VERSIÓN SEGURA ANTI-REDIRECCIÓN)
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbyhMXLjtTZOATMYKqGdnyBSUneNEVKqHTHzIT9R8tEyLqBEaiJXQu2q4fHK0Twsk_BPQw/exec';
const FALLBACK_IMAGE = 'https://placehold.co/200x200/0A3D91/FFFFFF/png?text=Sin+Foto';

let currentResidentName = new URLSearchParams(window.location.search).get('id');
let isEditMode = false;
let base64ImageToUpload = null;
let currentFotoUrl = '';

document.addEventListener('DOMContentLoaded', () => {
    // Interceptamos cualquier intento de navegación accidental por consola
    window.onbeforeunload = null;

    if (currentResidentName) {
        loadResidentData();
    } else {
        toggleEditMode(true);
        addOsRow('', '');
        document.getElementById('profileImage').src = FALLBACK_IMAGE;
    }
    setupFormEvents();
});

async function loadResidentData() {
    const loader = document.getElementById('loader');
    loader.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}?action=getResidents`);
        const result = await response.json();

        if (result.status === 'success') {
            const resident = result.data.find(r => r.nombre === currentResidentName);
            if(resident) populateForm(resident);
            else showToast("Residente no encontrado en la base de datos", true);
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
    
    const container = document.getElementById('obrasSocialesContainer');
    container.innerHTML = '';
    data.obrasSociales.forEach((os, index) => {
        addOsRow(os, data.numerosOs[index]);
    });

    document.getElementById('fechaIngreso').value = formatToInputDate(data.fechaIngreso);
    document.getElementById('nacionalidad').value = data.nacionalidad || '';
    document.getElementById('domicilio').value = data.domicilio || '';
    document.getElementById('responsable').value = data.responsable || '';
    document.getElementById('dniResponsable').value = data.dniResponsable || '';
    document.getElementById('telefono').value = data.telefono || '';
    document.getElementById('domicilioResponsable').value = data.domicilioResponsable || '';

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
    document.getElementById('btnAddOs').onclick = (e) => { e.preventDefault(); addOsRow('', ''); };
    
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
    isEditMode = enable;
    const form = document.getElementById('residentForm');
    const inputs = form.querySelectorAll('input');
    
    if (enable) {
        form.classList.remove('readonly-mode');
        inputs.forEach(input => input.removeAttribute('readonly'));
        document.getElementById('btnEdit').classList.add('hidden');
        document.getElementById('btnSave').classList.remove('hidden');
        document.getElementById('btnAddOs').classList.remove('hidden');
        document.getElementById('uploadOverlay').classList.remove('hidden');
        document.querySelectorAll('.btn-remove-os').forEach(btn => btn.classList.remove('hidden'));
    } else {
        form.classList.add('readonly-mode');
        inputs.forEach(input => input.setAttribute('readonly', 'true'));
        document.getElementById('btnEdit').classList.remove('hidden');
        document.getElementById('btnSave').classList.add('hidden');
        document.getElementById('btnAddOs').classList.add('hidden');
        document.getElementById('uploadOverlay').classList.add('hidden');
        document.querySelectorAll('.btn-remove-os').forEach(btn => btn.classList.add('hidden'));
    }
}

function addOsRow(osValue, nroValue) {
    const container = document.getElementById('obrasSocialesContainer');
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

async function saveResident() {
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
            domicilio: document.getElementById('domicilio').value,
            responsable: document.getElementById('responsable').value,
            dniResponsable: document.getElementById('dniResponsable').value,
            telefono: document.getElementById('telefono').value,
            domicilioResponsable: document.getElementById('domicilioResponsable').value,
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
