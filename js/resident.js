const urlParams = new URLSearchParams(window.location.search);
const residentName = urlParams.get('nombre');
let isEditing = false;
let globalData = null;

document.addEventListener('DOMContentLoaded', () => {
    if(!residentName) { window.location.href = 'index.html'; return; }
    fetchResidentDetails();
    setupImageUpload();
});

async function fetchResidentDetails() {
    try {
        const response = await fetch(`${API_URL}?action=getResidentDetails&nombre=${encodeURIComponent(residentName)}`);
        const data = await response.json();
        globalData = data;
        renderProfile(data);
        document.getElementById('loader').style.display = 'none';
        document.getElementById('content').style.display = 'block';
    } catch (error) {
        console.error(error);
        alert("Error al cargar los datos del residente.");
    }
}

// Función Helper para crear inputs
function createInputGroup(label, id, value, readonlyForever = false) {
    const safeValue = value || '';
    const readAttr = readonlyForever ? 'readonly disabled title="Campo automático"' : 'readonly';
    return `
        <div class="form-group">
            <label>${label}</label>
            <input type="text" id="${id}" class="data-input" value="${safeValue}" ${readAttr}>
        </div>
    `;
}

function renderProfile(data) {
    const res = data.residente;
    const osComunes = data.obraSocialData.comunes;
    const osLista = data.obraSocialData.lista;

    // Header
    document.getElementById('displayName').innerText = res.Nombre;
    document.getElementById('displaySocio').innerText = res['Nro de socio'] || res['Nº'] || '-';
    document.getElementById('profileImage').src = (res.FotoURL && res.FotoURL !== "") ? res.FotoURL : DEFAULT_IMAGE;

    // SECCIÓN 1: Personales y Médicos Comunes
    document.getElementById('section1').innerHTML = 
        createInputGroup('Fecha de nacimiento', 'inp_fnac', res['Fecha de nacimiento']) +
        createInputGroup('Edad', 'inp_edad', res.Edad, true) +
        createInputGroup('DNI', 'inp_dni', osComunes['DNI']) +
        createInputGroup('CUIL', 'inp_cuil', res.Cuil) +
        createInputGroup('Nº de Trámite', 'inp_tramite', osComunes['Nº de tramite']) +
        createInputGroup('Alergias', 'inp_alergias', osComunes['Alergias']) +
        createInputGroup('Lugar de Internación', 'inp_internacion', osComunes['Lugar de internacion']);

    // SECCIÓN 2: Obras Sociales (Dinámico según cantidad)
    let osHtml = '';
    if (osLista.length === 0) {
        osHtml = '<p style="color:var(--text-muted);">No tiene obras sociales registradas.</p>';
    } else {
        osLista.forEach((os, index) => {
            osHtml += `
            <div class="os-card form-grid">
                ${createInputGroup(`Obra Social ${index+1}`, `inp_os_nombre_${index}`, os['Obra Social'])}
                ${createInputGroup('Nº Obra Social', `inp_os_num_${index}`, os['Nº O. Social'])}
                ${createInputGroup('Médico de Cabecera', `inp_os_medico_${index}`, os['Medico de Cabecera'])}
            </div>`;
        });
    }
    document.getElementById('section2').innerHTML = osHtml;

    // SECCIÓN 3: Administrativos
    document.getElementById('section3').innerHTML = 
        createInputGroup('Fecha de Ingreso', 'inp_ingreso', res['Fecha de ingreso']) +
        createInputGroup('Nacionalidad', 'inp_nacionalidad', res.Nacionalidad) +
        createInputGroup('Domicilio', 'inp_domicilio', res.Domicilio);

    // SECCIÓN 4: Contactos
    const contTbody = document.querySelector('#contactTable tbody');
    contTbody.innerHTML = '';
    data.contactos.forEach(cont => {
        contTbody.innerHTML += `
            <tr>
                <td>${cont['Familiar Responsable'] || '-'}</td>
                <td>${cont['Teléfono'] || '-'}</td>
                <td>${cont['DNI del Responsable'] || '-'}</td>
                <td>${cont['Domicilio del Responsable'] || '-'}</td>
            </tr>`;
    });
}

// Control del Modo Edición
function toggleEditMode() {
    isEditing = !isEditing;
    const header = document.getElementById('profileHeader');
    const inputs = document.querySelectorAll('.data-input:not([disabled])'); // Selecciona inputs que no sean la Edad
    
    if (isEditing) {
        header.classList.add('edit-mode');
        document.getElementById('btnEdit').style.display = 'none';
        document.getElementById('btnSave').style.display = 'flex';
        inputs.forEach(inp => inp.removeAttribute('readonly'));
    } else {
        header.classList.remove('edit-mode');
        document.getElementById('btnEdit').style.display = 'flex';
        document.getElementById('btnSave').style.display = 'none';
        inputs.forEach(inp => inp.setAttribute('readonly', true));
    }
}

// Guardar Todos los Datos
async function saveAllData() {
    const btnSave = document.getElementById('btnSave');
    btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btnSave.disabled = true;

    // 1. Recolectar datos de "Residentes"
    const dataResidentes = {
        'Fecha de nacimiento': document.getElementById('inp_fnac').value,
        'Cuil': document.getElementById('inp_cuil').value,
        'Fecha de ingreso': document.getElementById('inp_ingreso').value,
        'Nacionalidad': document.getElementById('inp_nacionalidad').value,
        'Domicilio': document.getElementById('inp_domicilio').value
    };

    // 2. Recolectar datos comunes de "Obra Social"
    const dataOsComunes = {
        'DNI': document.getElementById('inp_dni').value,
        'Nº de tramite': document.getElementById('inp_tramite').value,
        'Alergias': document.getElementById('inp_alergias').value,
        'Lugar de internacion': document.getElementById('inp_internacion').value
    };

    // 3. Recolectar lista específica de "Obra Social"
    const dataOsLista = [];
    globalData.obraSocialData.lista.forEach((_, index) => {
        dataOsLista.push({
            'Obra Social': document.getElementById(`inp_os_nombre_${index}`).value,
            'Nº O. Social': document.getElementById(`inp_os_num_${index}`).value,
            'Medico de Cabecera': document.getElementById(`inp_os_medico_${index}`).value
        });
    });

    const payload = {
        action: 'updateResidente',
        payload: {
            NombreOriginal: residentName,
            residentes: dataResidentes,
            osComunes: dataOsComunes,
            osLista: dataOsLista
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if(result.success) {
            btnSave.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
            btnSave.classList.replace('btn-success', 'btn-primary');
            setTimeout(() => {
                btnSave.classList.replace('btn-primary', 'btn-success');
                btnSave.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
                btnSave.disabled = false;
                toggleEditMode(); // Volver a modo lectura
            }, 2000);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert("Error al guardar: " + error);
        btnSave.innerHTML = '<i class="fas fa-save"></i> Intentar de nuevo';
        btnSave.disabled = false;
    }
}

// Subida de imagen
function setupImageUpload() {
    const fileInput = document.getElementById('fileInput');
    const statusText = document.getElementById('imageStatus');
    const imgEl = document.getElementById('profileImage');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        statusText.innerText = "Subiendo imagen a Drive...";
        statusText.style.color = "#ed8936";
        const reader = new FileReader();

        reader.onload = async function(event) {
            imgEl.src = event.target.result; // Vista previa inmediata

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'uploadImage', nombre: residentName, base64: event.target.result, mimeType: file.type, fileName: file.name })
                });

                const result = await response.json();
                if(result.success) {
                    statusText.innerText = "¡Imagen guardada!";
                    statusText.style.color = "var(--success)";
                    setTimeout(() => statusText.innerText = "", 3000);
                } else throw new Error(result.error);
            } catch (error) {
                statusText.innerText = "Error al subir.";
                statusText.style.color = "red";
                console.error(error);
            }
        };
        reader.readAsDataURL(file);
    });
}
