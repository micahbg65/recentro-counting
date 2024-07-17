const urlParams = new URLSearchParams(window.location.search);
const pointNAME = urlParams.get('name');
console.log('Nom du point récupéré depuis l\'URL:', pointNAME); 

const apiKey = 'AIzaSyAPFFLWVZBVgufZOH8lG6q-yMhbG7Bg8_c';
const sheetId = '14Iq-jUzOtkJ8oEZZKiVldaSfBYHFO7MmBNZoPskRntE';
const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Lista?key=${apiKey}`;

function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
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
                obj[headers[index]] = value;
            });
            return obj;
        });
    } catch (error) {
        console.error('Error loading data from Google Sheets:', error);
        return [];
    }
}

async function displayPointDetails() {
    const pointName = getUrlParameter('name');
    if (!pointName) {
        console.error('Nom du point non trouvé dans l\'URL.');
        return;
    }
    console.log(`Nom du point récupéré depuis l'URL: ${pointName}`);
    
    const data = await loadGoogleSheetsData(dataUrl);
    console.log('Données chargées depuis Google Sheets:', data);

    const pointData = data.find(point => point.NAME.trim() === pointName.trim());
    console.log('Point trouvé:', pointData);

    if (!pointData) {
        document.getElementById('title').innerText = 'Point non trouvé';
        return;
    }

    const titleElement = document.getElementById('title');
    const addressElement = document.getElementById('address');
    const streetViewImageElement = document.getElementById('streetViewImage');

    if (titleElement) {
        titleElement.innerText = `Details of ${pointData.NAME}`;
    } else {
        console.error('Element with ID "title" not found.');
    }

    if (addressElement) {
        addressElement.innerText = `Address: ${pointData.ADRESS}`;
    } else {
        console.error('Element with ID "address" not found.');
    }

    if (streetViewImageElement) {
        const streetViewUrl = getStreetViewImage(pointData.Latitude, pointData.Longitude);
        console.log(`Street View URL: ${streetViewUrl}`); 
        streetViewImageElement.src = streetViewUrl;
    } else {
        console.error('Element with ID "streetViewImage" not found.');
    }

    createPieChart(data, pointName);
    createLineChart(data, pointName);
}

function createPieChart(data, pointName) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    const pointData = data.filter(point => point.NAME.trim() === pointName.trim());

    const labels = [...new Set(pointData.map(point => point.TYPE))];
    const units = labels.map(label => {
        return pointData
            .filter(point => point.TYPE === label)
            .reduce((sum, point) => sum + parseInt(point.UNITS), 0);
    });

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Units by Type',
                data: units,
                backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#00FF00', '#FF7C00'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Proportion of vehicles during one day (5hrs-23hrs)'
                }
            }
        }
    });
}

function createLineChart(data, pointName) {
    const ctx = document.getElementById('lineChart').getContext('2d');
    const pointData = data.filter(point => point.NAME.trim() === pointName.trim());

    const hours = pointData.map(point => point.HOURS);
    const pedestrians = pointData.map(point => parseInt(point.PEDESTRIANS));
    const vehicles = pointData.map(point => parseInt(point.VEHICLES));

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: 'Pedestrians',
                    data: pedestrians,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: false
                },
                {
                    label: 'Vehicles',
                    data: vehicles,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1,
                    fill: false
                }
            ]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (Hours)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Count'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Number of Pedestrians and Vehicles Over Time'
                }
            }
        }
    });
}

function getStreetViewImage(lat, lng) {
    const url = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&fov=120&source=outdoor&pitch=10&key=AIzaSyDHtM7TQFC5tvvPTOLUrjesABt_G2pJ75k`;
    console.log(`Construit URL Street View: ${url}`); // Ajout de log pour vérifier l'URL construite
    return url;
}

displayPointDetails();