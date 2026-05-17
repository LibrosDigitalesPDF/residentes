/**
 * APP.JS - Lógica de Dashboard Multitabs
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbxj6MkJj1HGKh3hcPFTzPBYZ-uMBtepQ3sYq0Pacx_OeONpFNBgnzv07OaCZ2ZR_m7Tzw/exec';
const FALLBACK_IMAGE = 'https://placehold.co/200x200/0A3D91/FFFFFF/png?text=Sin+Foto';

let globalActivos = [];
let globalArchivados = [];

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    fetchActivos();
    fetchArchivados();
    setupEventListeners();
});

// ================= NAVEGACIÓN DE TABS =================
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden')); 
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.remove('hidden');
            document.getElementById(targetId).classList.add('active');

            if(targetId === 'tab-cumpleanos') {
                renderCalendar(globalActivos);
            }
        });
    });
}

// ================= FETCH DATOS =================
async function fetchActivos() {
    const loader = document.getElementById('loaderActivos');
    loader.classList.remove('hidden');
    try {
        const res = await fetch(`${API_URL}?action=getResidents`);
        const json = await res.json();
        if (json.status === 'success') {
            globalActivos = json.data;
            populateFilters(globalActivos);
            renderGrid(globalActivos, 'gridActivos', false);
        }
    } catch (e) { alert('Error cargando activos.'); } 
    finally { loader.classList.add('hidden'); }
}

async function fetchArchivados() {
    const loader = document.getElementById('loaderArchivados');
    loader.classList.remove('hidden');
    try {
        const res = await fetch(`${API_URL}?action=getArchived`);
        const json = await res.json();
        if (json.status === 'success') {
            globalArchivados = json.data;
            renderGrid(globalArchivados, 'gridArchivados', true);
        }
    } catch (e) { console.error(e); } 
    finally { loader.classList.add('hidden'); }
}

// ================= RENDER DE TARJETAS =================
function renderGrid(data, containerId, isArchived) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';

    if (data.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No hay registros para mostrar.</p>';
        return;
    }

    data.forEach(res => {
        const card = document.createElement('div');
        card.className = `card ${isArchived ? 'archived-card' : ''}`;
        card.style.cursor = 'pointer'; 
        
        card.onclick = function(e) {
            e.preventDefault(); e.stopPropagation(); 
            if(e.target.closest('.btn-archive-card')) {
                openArchiveModal(res.nombre);
                return;
            }
            window.location.href = `resident.html?id=${encodeURIComponent(res.nombre)}`;
        };

        // BLOQUE: Obra Social + Nro Obra Social
        let osBlocksHtml = '';
        res.obrasSociales.forEach((os, idx) => {
            if (os && os.trim() !== '') {
                const nro = res.numerosOs[idx] || 'S/N';
                osBlocksHtml += `
                    <div class="os-block">
                        <span class="os-name">${os}</span>
                        <span class="os-number">N° OS: ${nro}</span>
                    </div>
                `;
            }
        });

        const imgSrc = res.fotoUrl && res.fotoUrl !== '' ? res.fotoUrl : FALLBACK_IMAGE;

        // Botón archivar solo si no está archivado
        const archiveBtnHtml = !isArchived 
            ? `<button type="button" class="btn-archive-card" title="Archivar Residente"><i class="fa-solid fa-box-archive"></i></button>` 
            : '';

        card.innerHTML = `
            ${archiveBtnHtml}
            <div class="card-header">
                <img src="${imgSrc}" alt="${res.nombre}" class="card-img" onerror="this.src='${FALLBACK_IMAGE}'">
                <div class="card-title">
                    <h3>${res.nombre}</h3>
                    <p>DNI: ${res.dni || 'S/D'}</p>
                </div>
            </div>
            <div class="card-body">
                <div class="info-row"><span>Edad:</span><strong>${res.edad || '-'} años</strong></div>
                <div class="info-row"><span>Nro Trámite:</span><strong>${res.numeroTramite || '-'}</strong></div>
                ${isArchived && res.fechaSalida ? `<div class="info-row"><span style="color:var(--danger)">Fecha Salida:</span><strong>${res.fechaSalida}</strong></div>` : ''}
                <div style="margin-top: 10px; display:flex; flex-direction:column; gap:5px;">
                    ${osBlocksHtml}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ================= CALENDARIO DE CUMPLEAÑOS =================
function renderCalendar(residentesActivos) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('calendarMonthTitle').textContent = `${monthNames[month]} ${year}`;

    const daysContainer = document.getElementById('calendarDays');
    daysContainer.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Rellenar espacios vacíos antes del día 1
    for (let x = 0; x < firstDayIndex; x++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        daysContainer.appendChild(emptyCell);
    }

    // Identificar cumpleaños de este mes
    const monthBirthdays = {};
    residentesActivos.forEach(res => {
        if(res.fechaNacimiento) {
            let bMonth, bDay;
            if(res.fechaNacimiento.includes('/')) {
                const parts = res.fechaNacimiento.split('/');
                bDay = parseInt(parts[0], 10);
                bMonth = parseInt(parts[1], 10) - 1;
            } else if (res.fechaNacimiento.includes('-')) {
                const parts = res.fechaNacimiento.split('-');
                bDay = parseInt(parts[2], 10);
                bMonth = parseInt(parts[1], 10) - 1;
            } else {
                const d = new Date(res.fechaNacimiento);
                bDay = d.getDate();
                bMonth = d.getMonth();
            }

            if(bMonth === month) {
                if(!monthBirthdays[bDay]) monthBirthdays[bDay] = [];
                monthBirthdays[bDay].push(res.nombre);
            }
        }
    });

    // Crear celdas de días
    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        if (i === today.getDate()) dayCell.classList.add('today');

        let html = `<span class="day-number">${i}</span>`;
        
        if (monthBirthdays[i]) {
            dayCell.classList.add('has-birthday');
            monthBirthdays[i].forEach(name => {
                const shortName = name.split(' ').slice(0,2).join(' ');
                html += `<span class="birthday-item"><i class="fa-solid fa-cake-candles"></i> ${shortName}</span>`;
            });
        }

        dayCell.innerHTML = html;
        daysContainer.appendChild(dayCell);
    }
}

// ================= FILTROS Y EVENTOS =================
function populateFilters(data) {
    const select = document.getElementById('osFilterActivos');
    const osSet = new Set();
    data.forEach(res => res.obrasSociales.forEach(os => { if(os && os.trim() !== '') osSet.add(os.trim()); }));
    select.innerHTML = '<option value="">Todas las Obras Sociales</option>';
    Array.from(osSet).sort().forEach(os => select.insertAdjacentHTML('beforeend', `<option value="${os}">${os}</option>`));
}

function setupEventListeners() {
    const searchActivos = document.getElementById('searchActivos');
    const osFilterActivos = document.getElementById('osFilterActivos');
    const searchArchivados = document.getElementById('searchArchivados');

    const doFilterActivos = () => {
        const term = searchActivos.value.toLowerCase();
        const os = osFilterActivos.value;
        const filtered = globalActivos.filter(r => 
            (r.nombre.toLowerCase().includes(term) || (r.dni && r.dni.includes(term))) &&
            (os === '' || r.obrasSociales.includes(os))
        );
        renderGrid(filtered, 'gridActivos', false);
    };

    const doFilterArchivados = () => {
        const term = searchArchivados.value.toLowerCase();
        const filtered = globalArchivados.filter(r => r.nombre.toLowerCase().includes(term) || (r.dni && r.dni.includes(term)));
        renderGrid(filtered, 'gridArchivados', true);
    };

    searchActivos.addEventListener('input', doFilterActivos);
    osFilterActivos.addEventListener('change', doFilterActivos);
    searchArchivados.addEventListener('input', doFilterArchivados);

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
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Archivando...';

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'archiveResident', payload: { nombre: residentToArchive, fechaSalida: fechaSalida } }) });
        const result = await res.json();
        if(result.status === 'success') {
            closeArchiveModal();
            fetchActivos(); 
            fetchArchivados(); // Recargar ambos
        }
    } catch (e) { alert("Error al archivar"); } 
    finally { btn.disabled = false; btn.innerHTML = 'Archivar Residente'; }
}
