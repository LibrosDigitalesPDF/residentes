let currentResidentData = null;
const urlParams = new URLSearchParams(window.location.search);
const residentName = urlParams.get('nombre');

document.addEventListener('DOMContentLoaded', () => {
    if(!residentName) {
        window.location.href = 'index.html';
        return;
    }
    fetchResidentDetails();
    setupImageUpload();
    
    document.getElementById('personalForm').addEventListener('submit', handleSavePersonalData);
});

async function fetchResidentDetails() {
    try {
        const response = await fetch(`${API_URL}?action=getResidentDetails&nombre=${encodeURIComponent(residentName)}`);
        const data = await response.json();
        
        currentResidentData = data;
        renderResident(data);
        
        document.getElementById('loader').style.display = 'none';
        document.getElementById('content').style.display = 'block';
    } catch (error) {
        console.error("Error:", error);
        alert("Error al cargar los datos del residente.");
    }
}

function renderResident(data) {
    const res = data.residente;
    
    // Header
    document.getElementById('headerName').innerText = res.Nombre;
    document.getElementById('displayName').innerText = res.Nombre;
    document.getElementById('displayId').innerText = `Nº Interno: ${res['Nº']}`;
    if (res.FotoURL && res.FotoURL !== "") {
        document.getElementById('profileImage').src = res.FotoURL;
    }

    // Campos Personales Dinámicos
    const personalFields = document.getElementById('personalFields');
    personalFields.innerHTML = '';
    
    // Mapeo de campos a mostrar y editar
    const fieldsToRender = ['Nombre', 'Cuil', 'Fecha de nacimiento', 'Edad', 'Domicilio', 'Nacionalidad', 'Fecha de ingreso'];
    
    fieldsToRender.forEach(field => {
        if(res[field] !== undefined) {
            const div = document.createElement('div');
            div.className = 'form-group';
            
            // La edad y el nombre original no deberían ser editables directamente para no romper relaciones/fórmulas
            const isReadonly = field === 'Edad' ? 'disabled title="Calculado automáticamente"' : '';
            
            div.innerHTML = `
                <label>${field}</label>
                <input type="text" name="${field}" value="${res[field]}" ${isReadonly}>
            `;
            personalFields.appendChild(div);
        }
    });

    // Render Obras Sociales
    const osTbody = document.querySelector('#osTable tbody');
    osTbody.innerHTML = '';
    data.obrasSociales.forEach(os => {
        osTbody.innerHTML += `
            <tr>
                <td>${os['Obra Social']}</td>
                <td>${os['Nº O. Social']}</td>
                <td>${os['Nº de tramite']}</td>
                <td>${os['Medico de Cabecera']}</td>
                <td>${os['Alergias']}</td>
            </tr>
        `;
    });

    // Render Contactos
    const contTbody = document.querySelector('#contactTable tbody');
    contTbody.innerHTML = '';
    data.contactos.forEach(cont => {
        contTbody.innerHTML += `
            <tr>
                <td>${cont['Familiar Responsable']}</td>
                <td>${cont['Teléfono']}</td>
                <td>${cont['DNI del Responsable']}</td>
                <td>${cont['Domicilio del Responsable']}</td>
            </tr>
        `;
    });
}

async function handleSavePersonalData(e) {
    e.preventDefault();
    const statusSpan = document.getElementById('saveStatus');
    statusSpan.style.color = "var(--text-muted)";
    statusSpan.innerText = "Guardando...";

    const formData = new FormData(e.target);
    const updatedData = Object.fromEntries(formData.entries());
    
    // Necesitamos enviar el nombre original para que GAS encuentre la fila
    updatedData.NombreOriginal = residentName;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Evita preflight CORS OPTIONS
            body: JSON.stringify({
                action: 'updateResidente',
                residenteData: updatedData
            })
        });
        
        const result = await response.json();
        if(result.success) {
            statusSpan.style.color = "var(--success)";
            statusSpan.innerText = "¡Cambios guardados con éxito en Sheets!";
            setTimeout(() => { statusSpan.innerText = ""; }, 3000);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        statusSpan.style.color = "red";
        statusSpan.innerText = "Error al guardar.";
        console.error(error);
    }
}

function setupImageUpload() {
    const fileInput = document.getElementById('fileInput');
    const statusText = document.getElementById('imageStatus');
    const imgEl = document.getElementById('profileImage');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        statusText.innerText = "Subiendo imagen a Google Drive...";
        statusText.style.color = "orange";

        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64Data = event.target.result;
            
            // Preview inmediato
            imgEl.src = base64Data;

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'uploadImage',
                        nombre: residentName,
                        base64: base64Data,
                        mimeType: file.type,
                        fileName: file.name
                    })
                });

                const result = await response.json();
                if(result.success) {
                    statusText.innerText = "Imagen guardada exitosamente.";
                    statusText.style.color = "var(--success)";
                    setTimeout(() => statusText.innerText = "", 3000);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                statusText.innerText = "Error al subir imagen.";
                statusText.style.color = "red";
                console.error(error);
            }
        };
        reader.readAsDataURL(file);
    });
}
