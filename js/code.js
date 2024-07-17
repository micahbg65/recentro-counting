mapboxgl.accessToken = 'pk.eyJ1IjoicGxndWVkZXMiLCJhIjoiZEg0TXRZOCJ9.J1TTOXpWW3ERgXWcG2uTdQ';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-34.8781405, -8.0641775],
    zoom: 15
});

const colors = {
    'car': '#ff0004',
    'pedestrian': '#008cff',
    'bus': '#ff7f00',
    'truck': '#fb00ff',
    'bike': '#167b2c',
    'motorcycle': '#4810e0',
    'other': '#000000'
};

const apiKey = 'AIzaSyAPFFLWVZBVgufZOH8lG6q-yMhbG7Bg8_c';
const sheetId = '14Iq-jUzOtkJ8oEZZKiVldaSfBYHFO7MmBNZoPskRntE';
const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Lista?key=${apiKey}`;

//https://sheets.googleapis.com/v4/spreadsheets/14Iq-jUzOtkJ8oEZZKiVldaSfBYHFO7MmBNZoPskRntE/values/Lista?key=AIzaSyAPFFLWVZBVgufZOH8lG6q-yMhbG7Bg8_c

let data = [];

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
                0, 4,
                50000, 30
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
    const pointUrl = `/Users/micahhhhh/Documents/RECENTRO/Ped&veh counting/structure/point-template.html?name=${encodeURIComponent(properties.name)}`; // Utilisez le chemin relatif ou l'URL correcte de votre application
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

function updateSummaryTable(maxUnit, maxUnitType, totalUnits) {
    const summaryTable = document.getElementById('summaryTable');
    if (!summaryTable) return;

    // Clear existing content
    summaryTable.innerHTML = '';

    // Create and append header row
    const headerRow = document.createElement('tr');
    const unitHeader = document.createElement('th');
    unitHeader.textContent = 'Highest unit';
    const typeHeader = document.createElement('th');
    typeHeader.textContent = 'Type';
    const totalHeader = document.createElement('th');
    totalHeader.textContent = 'Total units';
    headerRow.appendChild(unitHeader);
    headerRow.appendChild(typeHeader);
    headerRow.appendChild(totalHeader);
    summaryTable.appendChild(headerRow);

    // Create and append data row
    const dataRow = document.createElement('tr');
    const unitCell = document.createElement('td');
    unitCell.textContent = maxUnit;
    const typeCell = document.createElement('td');
    typeCell.textContent = maxUnitType;
    const totalCell = document.createElement('td');
    totalCell.textContent = totalUnits;
    dataRow.appendChild(unitCell);
    dataRow.appendChild(typeCell);
    dataRow.appendChild(totalCell);
    summaryTable.appendChild(dataRow);
}

async function filterMarkers(data, typeFilter, affluenceFilter) {
    console.log('Filtering with type:', typeFilter, 'affluence:', affluenceFilter);

    let filteredData = data.filter(point => {
        const typeMatch = typeFilter === 'all' || (point.TYPE && point.TYPE.toLowerCase().replace(/\s+/g, '-').replace('.', '') === typeFilter);
        const units = parseFloat(point.UNITS);
        const validUnits = isNaN(units) ? 0 : units;

        return typeMatch;
    });

    let totalUnits = filteredData.reduce((sum, point) => {
        const units = parseFloat(point.UNITS);
        return sum + (isNaN(units) ? 0 : units);
    }, 0);

    console.log('Total units:', totalUnits);

    // Trouver l'unité la plus élevée parmi les données filtrées
    let maxUnit = 0;
    let maxUnitType = '';

    filteredData.forEach(point => {
        const units = parseFloat(point.UNITS);
        if (!isNaN(units) && units > maxUnit) {
            maxUnit = units;
            maxUnitType = point.TYPE;
        }
    });

    // Définir les seuils pour les filtres d'affluence
    const lowThreshold = 0.3 * maxUnit;
    const highThreshold = 0.7 * maxUnit;

    console.log('Max units:', maxUnit, 'Low threshold:', lowThreshold, 'High threshold:', highThreshold);

    // Appliquer le filtre d'affluence en utilisant les seuils
    let affluenceFilteredData = filteredData.filter(point => {
        const units = parseFloat(point.UNITS);
        const validUnits = isNaN(units) ? 0 : units;

        if (affluenceFilter === 'low') {
            return validUnits < lowThreshold;
        } else if (affluenceFilter === 'medium') {
            return validUnits >= lowThreshold && validUnits <= highThreshold;
        } else if (affluenceFilter === 'high') {
            return validUnits > highThreshold;
        } else {
            return true; // Aucun filtre d'affluence appliqué
        }
    });

    console.log('Filtered data:', affluenceFilteredData);

        // Recalculer le total des unités sur les données filtrées par affluence
        let affluenceTotalUnits = affluenceFilteredData.reduce((sum, point) => {
            const units = parseFloat(point.UNITS);
            return sum + (isNaN(units) ? 0 : units);
        }, 0);
    
        // Trouver l'unité la plus élevée parmi les données filtrées par affluence
        let affluenceMaxUnit = 0;
        let affluenceMaxUnitType = '';
    
        affluenceFilteredData.forEach(point => {
            const units = parseFloat(point.UNITS);
            if (!isNaN(units) && units > affluenceMaxUnit) {
                affluenceMaxUnit = units;
                affluenceMaxUnitType = point.TYPE;
            }
        });
    
        console.log('Affluence Filtered Data:', affluenceFilteredData);
        console.log('Affluence Total Units:', affluenceTotalUnits);
        console.log('Affluence Max Unit:', affluenceMaxUnit, 'Type:', affluenceMaxUnitType);
    
        // Mettre à jour la table de résumé
        updateSummaryTable(affluenceMaxUnit, affluenceMaxUnitType, affluenceTotalUnits);
    
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