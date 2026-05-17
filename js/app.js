/**
 * APP.JS - Lógica de la Página Principal (Index)
 */

// ================= CONSTANTES =================
const API_URL = 'https://script.google.com/macros/s/AKfycbyaBeXyPSGA3jZ4KzJs7fS15UVSnKADTtziiLeDLVsUl5lV7XEsHE_EupRFE0OqsmIR0g/exec';
const FALLBACK_IMAGE = 'https://placehold.co/200x200/0A3D91/FFFFFF/png?text=Sin+Foto';

let globalResidents = [];

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
    fetchResidents();
    setupEventListeners();
});

// ================= FETCH DATOS =================
async function fetchResidents() {
    const loader = document.getElementById('loader');
    const grid = document.getElementById('residentsGrid');
    
    loader.classList.remove('hidden');
    grid.innerHTML = '';

    try {
        const response = await fetch(`${API_URL}?action=getResidents`);
        const result = await response.json();

        if (result.status === 'success') {
            globalResidents = result.data;
            populateFilters(globalResidents);
            renderGrid(globalResidents);
        } else {
            alert('Error al cargar datos: ' + result.message);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Error de conexión con el servidor.');
    } finally {
        loader.classList.add('hidden');
    }
}

// ================= RENDERIZADO =================
function renderGrid(data) {
    const grid = document.getElementById('residentsGrid');
    grid.innerHTML = '';

    if (data.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No se encontraron residentes.</p>';
        return;
    }

    data.forEach(res => {
        // Usamos un div genérico blindado
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer'; 
        
        // Lógica de clic ultra-estricta
        card.onclick = function(e) {
            e.preventDefault(); // 🛑 Mata cualquier recarga fantasma
            e.stopPropagation(); // 🛑 Evita que el clic se propague al fondo

            // Si clicaron en archivar, solo abre el modal
            if(e.target.closest('.btn-archive-card')) {
                openArchiveModal(res.nombre);
                return;
            }
            
            // Si fue en la tarjeta, viaja al perfil
            window.location.href = `resident.html?id=${encodeURIComponent(res.nombre)}`;
        };

        const osTags = res.obrasSociales.map(os => 
            os ? `<span class="tag">${os}</span>` : ''
        ).join('');

        const imgSrc = res.fotoUrl && res.fotoUrl !== '' ? res.fotoUrl : FALLBACK_IMAGE;

        card.innerHTML = `
            <button type="button" class="btn-archive-card" title="Archivar Residente">
                <i class="fa-solid fa-box-archive"></i>
            </button>
            <div class="card-header">
                <img src="${imgSrc}" alt="${res.nombre}" class="card-img" onerror="this.src='${FALLBACK_IMAGE}'">
                <div class="card-title">
                    <h3>${res.nombre}</h3>
                    <p>DNI: ${res.dni || 'S/D'}</p>
                </div>
            </div>
            <div class="card-body">
                <div class="info-row">
                    <span>Edad:</span>
                    <strong>${res.edad || '-'} años</strong>
                </div>
                <div class="info-row">
                    <span>Nro Trámite:</span>
                    <strong>${res.numeroTramite || '-'}</strong>
                </div>
                <div class="tag-container">
                    ${osTags}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
// ================= FILTROS Y BÚSQUEDA =================
function populateFilters(data) {
    const select = document.getElementById('osFilter');
    const obrasSociales = new Set();
    
    data.forEach(res => {
        res.obrasSociales.forEach(os => {
            if(os && os.trim() !== '') obrasSociales.add(os.trim());
        });
    });

    select.innerHTML = '<option value="">Todas las Obras Sociales</option>';
    Array.from(obrasSociales).sort().forEach(os => {
        const option = document.createElement('option');
        option.value = os;
        option.textContent = os;
        select.appendChild(option);
    });
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const osFilter = document.getElementById('osFilter');

    const filterData = () => {
        const term = searchInput.value.toLowerCase();
        const osSelected = osFilter.value;

        const filtered = globalResidents.filter(res => {
            const matchName = res.nombre.toLowerCase().includes(term) || (res.dni && res.dni.includes(term));
            const matchOs = osSelected === '' || res.obrasSociales.includes(osSelected);
            return matchName && matchOs;
        });
        renderGrid(filtered);
    };

    searchInput.addEventListener('input', filterData);
    osFilter.addEventListener('change', filterData);

    // Modal Events
    document.getElementById('closeModal').onclick = closeArchiveModal;
    document.getElementById('cancelArchive').onclick = closeArchiveModal;
    document.getElementById('confirmArchive').onclick = executeArchive;
}

// ================= LÓGICA ARCHIVADO =================
let residentToArchive = null;

window.openArchiveModal = function(nombre) {
    residentToArchive = nombre;
    document.getElementById('archiveName').textContent = nombre;
    document.getElementById('archiveDate').valueAsDate = new Date();
    document.getElementById('archiveModal').classList.add('show');
}

function closeArchiveModal() {
    document.getElementById('archiveModal').classList.remove('show');
    residentToArchive = null;
}

async function executeArchive() {
    const fechaSalida = document.getElementById('archiveDate').value;
    if (!fechaSalida) return alert("Ingrese una fecha de salida");

    const btn = document.getElementById('confirmArchive');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Archivando...';

    const payload = {
        action: 'archiveResident',
        payload: { nombre: residentToArchive, fechaSalida: fechaSalida }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if(result.status === 'success') {
            closeArchiveModal();
            fetchResidents(); // Recargar grid
        }
    } catch (error) {
        alert("Error al archivar");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Archivar Residente';
    }
}
