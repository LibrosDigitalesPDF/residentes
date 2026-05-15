let allResidents = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchResidents();
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterResidents(e.target.value);
    });
});

async function fetchResidents() {
    try {
        const response = await fetch(`${API_URL}?action=getResidentes`);
        const data = await response.json();
        
        if (data.error) {
            alert("Error de Apps Script: " + data.error);
            return;
        }

        allResidents = data;
        renderGrid(allResidents);
        document.getElementById('loader').style.display = 'none';
        document.getElementById('residentsGrid').style.display = 'grid';
    } catch (error) {
        console.error("Error cargando residentes:", error);
        alert("Hubo un error de conexión con la base de datos.");
    }
}

function renderGrid(residents) {
    const grid = document.getElementById('residentsGrid');
    grid.innerHTML = '';

    residents.forEach(res => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => window.location.href = `resident.html?nombre=${encodeURIComponent(res.Nombre)}`;

        const fotoUrl = res.FotoURL && res.FotoURL !== "" ? res.FotoURL : DEFAULT_IMAGE;
        const fnac = res['Fecha de nacimiento'] || '-';
        const edad = res.Edad ? `${res.Edad} años` : '-';
        const nSocio = res['Nro de socio'] || res['Nº'] || '-';

        // Procesar lista de Obras Sociales para la tarjeta
        let osHtml = "<em>No registrada</em>";
        if (res.listaOS && res.listaOS.length > 0) {
            osHtml = res.listaOS.map(os => `▪ ${os.nombre} (Nº: ${os.numero || '-'})`).join('<br>');
        }

        card.innerHTML = `
            <img src="${fotoUrl}" alt="Foto de ${res.Nombre}">
            <h3>${res.Nombre}</h3>
            
            <p class="info-text"><strong><i class="fas fa-id-badge"></i> Nº Socio:</strong> ${nSocio}</p>
            <p class="info-text"><strong><i class="fas fa-birthday-cake"></i> Nacimiento:</strong> ${fnac} (${edad})</p>
            <p class="info-text"><strong><i class="fas fa-address-card"></i> DNI:</strong> ${res.DNI || '-'}</p>
            <p class="info-text"><strong><i class="fas fa-file-medical"></i> Nº Trámite:</strong> ${res['Nº de tramite'] || '-'}</p>
            
            <div class="os-list">
                <strong><i class="fas fa-hospital"></i> Obras Sociales:</strong><br>
                ${osHtml}
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterResidents(searchTerm) {
    const term = searchTerm.toLowerCase();
    const filtered = allResidents.filter(res => 
        (res.Nombre && res.Nombre.toLowerCase().includes(term)) ||
        (res.DNI && res.DNI.toString().includes(term)) ||
        (res['Nº de tramite'] && res['Nº de tramite'].toString().includes(term)) ||
        (res['Nro de socio'] && res['Nro de socio'].toString().includes(term)) ||
        (res.listaOS && res.listaOS.some(os => os.nombre.toLowerCase().includes(term)))
    );
    renderGrid(filtered);
}
