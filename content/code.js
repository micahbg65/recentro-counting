mapboxgl.accessToken = 'pk.eyJ1IjoicGxndWVkZXMiLCJhIjoiZEg0TXRZOCJ9.J1TTOXpWW3ERgXWcG2uTdQ';

let map;
let mapParkings;

document.addEventListener('DOMContentLoaded', () => {
    map = initializeMap('map');
    
    // Diagnostics pour map
    if (map) {
        console.log('Map initialized:', map);
        map.on('load', initMap);
    } else {
        console.error('Map not initialized properly.');
    }

    mapParkings = initializeMap('map-parkings');
    
    // Diagnostics pour mapParkings
    if (mapParkings) {
        console.log('Map Parkings initialized:', mapParkings);
    } else {
        console.error('Map Parkings not initialized properly.');
    }
    
    // Initialisation de la carte pour l'onglet par défaut "counting"
    showTab('counting');
});

function showTab(tabId) {
    // Masquer tous les contenus des onglets
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    // Désactiver tous les boutons des onglets
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    
    // Afficher le contenu de l'onglet sélectionné
    const tabContent = document.getElementById(tabId);
    tabContent.classList.add('active');
    
    // Activer le bouton de l'onglet sélectionné
    document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`).classList.add('active');

    // Vérifier le conteneur de la carte
    console.log(`Container for ${tabId}:`, tabContent.querySelector(`#${tabId === 'counting' ? 'map' : 'map-parkings'}`));
    
    // Initialiser la carte pour l'onglet "counting"
    if (tabId === 'counting') {
        if (!map) {
            map = initializeMap('map');
        }
    }
    
    // Initialiser la carte pour l'onglet "parkings"
    else if (tabId === 'parkings') {
        if (!mapParkings) {
            mapParkings = initializeMap('map-parkings');
        }
    }
}

function initializeMap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return null;
    }
    const map = new mapboxgl.Map({
        container: containerId,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-34.8781405, -8.0641775],
        zoom: 15
    });
    
    // Vérifiez que la carte est correctement initialisée avant d'ajouter des écouteurs d'événements
    map.on('load', function() {
        console.log(`Map loaded for container: ${containerId}`);
        // Ajoutez ici vos écouteurs d'événements Mapbox
    });
    
    return map;
}

function initMap() {
    console.log('Map loaded and ready to be customized.');
    // Ajoutez ici vos logiques supplémentaires de carte
}

// Ajoutez des diagnostics pour vérifier les étapes de votre code
console.log('Document loaded and script executed.');

const colors = {
    'car': '#ff0004',
    'pedestrian': '#008cff',
    'bus': '#ff7f00',
    'truck': '#fb00ff',
    'bike': '#164420',
    'motorcycle': '#4810e0',
    'other': '#000000'
};

const apiKey = 'AIzaSyAPFFLWVZBVgufZOH8lG6q-yMhbG7Bg8_c';
const sheetId = '14Iq-jUzOtkJ8oEZZKiVldaSfBYHFO7MmBNZoPskRntE';
const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Lista?key=${apiKey}`;
const dataUrlParkings = 'https://sheets.googleapis.com/v4/spreadsheets/1nrsbYPOiTmHAPPe_y9aeaat5KIK6x5_18V-3LxCyYsk/values/estacionamentos?key=AIzaSyAPFFLWVZBVgufZOH8lG6q-yMhbG7Bg8_c';


//https://sheets.googleapis.com/v4/spreadsheets/14Iq-jUzOtkJ8oEZZKiVldaSfBYHFO7MmBNZoPskRntE/values/Lista?key=AIzaSyAPFFLWVZBVgufZOH8lG6q-yMhbG7Bg8_c

let data = [];

async function initMap() {
    data = await loadGoogleSheetsData(dataUrl);
    console.log(data); // Vérifiez les données récupérées

    const geojson = createGeoJSON(data);
    console.log(geojson); // Vérifiez le GeoJSON créé

    addMarkers(geojson);
    filterMarkers(data, 'all', 'all');
}

async function loadGoogleSheetsData(url) {
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (!result.values) {
            console.error('No data found in the API response.');
            return [];
        }
        const rows = result.values;
        const headers = rows[0];
        return rows.slice(1).map(row => {
            let obj = {};
            row.forEach((value, index) => {
                if (headers[index] === 'UNITS') {
                    obj[headers[index]] = parseFloat(value);
                } else {
                    obj[headers[index]] = value;
                }
            });
            return obj;
        });
    } catch (error) {
        console.error('Error loading data from Google Sheets:', error);
        return [];
    }
}

function convertCoordinates(coord) {
    if (!coord) return NaN;
    return parseFloat(coord.replace(',', '.'));
}

function createGeoJSON(data) {
    return {
        type: 'FeatureCollection',
        features: data.map((point, index) => {
            if (!point.Longitude || !point.Latitude) {
                console.warn(`Missing coordinates for point: ${JSON.stringify(point)}`);
                return null;
            }
            const lng = convertCoordinates(point.Longitude);
            const lat = convertCoordinates(point.Latitude);
            if (isNaN(lng) || isNaN(lat)) {
                console.warn(`Invalid coordinates for point: ${JSON.stringify(point)}`);
                return null;
            }
            const tipo = point.TYPE ? point.TYPE.toLowerCase().replace(/\s+/g, '-').replace('.', '') : 'other';
            const color = colors[tipo] || colors['other'];

            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                properties: {
                    id: index,
                    name: point.NAME,
                    district: point.DISTRICT,
                    address: point.ADRESS,
                    type: point.TYPE,
                    units: point.UNITS,
                    color: color,
                    latitude: lat,
                    longitude: lng,
                }
            };
        }).filter(feature => feature !== null)
    };
}

function addMarkers(geojson) {
    if (map.getSource('markers')) {
        map.removeLayer('markers');
        map.removeLayer('labels');
        map.removeSource('markers');
    }

    map.addSource('markers', {
        type: 'geojson',
        data: geojson
    });

    map.addLayer({
        id: 'markers',
        type: 'circle',
        source: 'markers',
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['get', 'units'],
                0, 10,
                40000, 50
            ],
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
        }
    });

    map.addLayer({
        id: 'labels',
        type: 'symbol',
        source: 'markers',
        layout: {
            'text-field': ['get', 'units'],
            'text-size': 12,
            'text-anchor': 'top',
            'text-offset': [0, 1.5]
        },
        paint: {
            'text-color': '#000000',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1
        }
    });

    map.on('click', 'markers', async (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;
        const popupContent = await createPopupContent(properties);

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map);
    });

    map.on('mouseenter', 'markers', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'markers', () => {
        map.getCanvas().style.cursor = '';
    });
}

async function createPopupContent(properties) {
    const streetViewUrl = getStreetViewImage(properties.latitude, properties.longitude);
    const pointUrl = `point-template.html?name=${encodeURIComponent(properties.name)}`; 
    console.log('URL générée pour le lien "See more":', pointUrl);
    
    return `
        <div class="popup-content scrollable-popup">
            <h3>${properties.name}</h3>
            <p><strong>Address:</strong> ${properties.address}</p>
            <p><strong>Type:</strong> ${properties.type}</p>
            <p><strong>Units:</strong> ${properties.units}</p>
            <p><a href="${pointUrl}" target="_blank" class="see-more-link">Graphics</a></p>
            <img src="${streetViewUrl}" alt="Google Street View Image" />
        </div>
    `;
}

function getStreetViewImage(lat, lng) {
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=200x200&location=${lat},${lng}&fov=120&source=outdoor&pitch=10&key=AIzaSyDHtM7TQFC5tvvPTOLUrjesABt_G2pJ75k`;
    return streetViewUrl;
}

function updateSummaryTable(filteredData) {
    const summaryTable = document.getElementById('summaryTable');
    if (!summaryTable) return;

    // Clear existing content
    summaryTable.innerHTML = '';

    // Create and append header row
    const headerRow = document.createElement('tr');
    const unitHeader = document.createElement('th');
    unitHeader.textContent = 'Units';
    const typeHeader = document.createElement('th');
    typeHeader.textContent = 'Type';
    const totalHeader = document.createElement('th');
    totalHeader.textContent = 'Total units';
    headerRow.appendChild(unitHeader);
    headerRow.appendChild(typeHeader);
    headerRow.appendChild(totalHeader);
    summaryTable.appendChild(headerRow);

    // Calculate the total units
    const totalUnits = filteredData.reduce((sum, point) => sum + point.units, 0);

    // Append a row to display the total units at the top
    const totalRow = document.createElement('tr');
    const emptyCell1 = document.createElement('td');
    emptyCell1.textContent = ''; // No text in this cell
    const emptyCell2 = document.createElement('td');
    emptyCell2.textContent = ''; // No text in this cell
    const totalValueCell = document.createElement('td');
    totalValueCell.textContent = totalUnits;
    totalRow.appendChild(emptyCell1);
    totalRow.appendChild(emptyCell2);
    totalRow.appendChild(totalValueCell);
    summaryTable.appendChild(totalRow);

    // Sort the filtered data by 'units' in descending order
    const sortedData = filteredData.sort((a, b) => b.units - a.units);

    // Create and append data rows for each entry
    sortedData.forEach(point => {
        const dataRow = document.createElement('tr');
        const unitCell = document.createElement('td');
        unitCell.textContent = point.units;
        const typeCell = document.createElement('td');
        typeCell.textContent = point.type;
        dataRow.appendChild(unitCell);
        dataRow.appendChild(typeCell);
        summaryTable.appendChild(dataRow);
    });
}

async function filterMarkers(data, typeFilter, affluenceFilter) {
    console.log('Filtering with type:', typeFilter, 'affluence:', affluenceFilter);

    let filteredData = data.filter(point => {
        const typeMatch = typeFilter === 'all' || (point.TYPE && point.TYPE.toLowerCase().replace(/\s+/g, '-').replace('.', '') === typeFilter);
        return typeMatch;
    });

    // Calculer le total des unités et filtrer par affluence
    let totalUnits = 0;
    let maxUnit = 0;
    let maxUnitType = '';

    filteredData = filteredData.map(point => {
        const units = parseFloat(point.UNITS);
        if (!isNaN(units)) {
            totalUnits += units;
            if (units > maxUnit) {
                maxUnit = units;
                maxUnitType = point.TYPE;
            }
        }
        return {
            ...point,
            units: units,
            type: point.TYPE
        };
    });

    const lowThreshold = 0.3 * maxUnit;
    const highThreshold = 0.7 * maxUnit;

    let affluenceFilteredData = filteredData.filter(point => {
        const units = point.units;
        if (affluenceFilter === 'low') {
            return units < lowThreshold;
        } else if (affluenceFilter === 'medium') {
            return units >= lowThreshold && units <= highThreshold;
        } else if (affluenceFilter === 'high') {
            return units > highThreshold;
        } else {
            return true;
        }
    });

    // Update the summary table
    updateSummaryTable(affluenceFilteredData);

    // Update the map
    const geojson = createGeoJSON(affluenceFilteredData);
    addMarkers(geojson);
}

async function initMap() {
    data = await loadGoogleSheetsData(dataUrl);

    const geojson = createGeoJSON(data);
    addMarkers(geojson);
    filterMarkers(data, 'all', 'all');
}

document.getElementById('typeFilter').addEventListener('change', (e) => {
    const typeFilter = e.target.value;
    const affluenceFilter = document.getElementById('affluenceFilter').value;
    filterMarkers(data, typeFilter, affluenceFilter);
});

document.getElementById('affluenceFilter').addEventListener('change', (e) => {
    const typeFilter = document.getElementById('typeFilter').value;
    const affluenceFilter = e.target.value;
    filterMarkers(data, typeFilter, affluenceFilter);
});

map.on('load', initMap);



