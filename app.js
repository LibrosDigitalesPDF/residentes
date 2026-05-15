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
        if(!res.Nombre) return; // Saltar filas vacías

        const card = document.createElement('div');
        card.className = 'card';
        // Redirigir a resident.html pasando el nombre como parámetro
        card.onclick = () => window.location.href = `resident.html?nombre=${encodeURIComponent(res.Nombre)}`;

        // Imagen por defecto si no hay URL en Sheets
        const fotoUrl = res.FotoURL && res.FotoURL !== "" ? res.FotoURL : "https://via.placeholder.com/150?text=Sin+Foto";

        card.innerHTML = `
            <img src="${fotoUrl}" alt="Foto de ${res.Nombre}">
            <h3>${res.Nombre}</h3>
            <p><i class="fas fa-id-card"></i> Nº: ${res['Nº']}</p>
            <p><i class="fas fa-birthday-cake"></i> ${res.Edad} años</p>
        `;
        grid.appendChild(card);
    });
}

function filterResidents(searchTerm) {
    const term = searchTerm.toLowerCase();
    const filtered = allResidents.filter(res => 
        (res.Nombre && res.Nombre.toLowerCase().includes(term)) ||
        (res.Cuil && res.Cuil.toString().includes(term)) ||
        (res['Nº'] && res['Nº'].toString().includes(term))
    );
    renderGrid(filtered);
}
