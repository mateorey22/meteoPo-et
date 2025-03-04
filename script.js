const apiKey = '670281e8848593c12ea8f0cbb24c2005';
const geminiApiKey = 'AIzaSyCpv4bwo3rNsYth4ty-s2-IEr_BZzPnzj4';

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const cityName = document.getElementById('city-name');
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const description = document.getElementById('description');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const geminiButton = document.getElementById('gemini-button');
const geminiSummaryText = document.getElementById('gemini-summary-text');
const geminiAnimation = document.querySelector('.gemini-animation'); // Select the animation container
const mapDiv = document.getElementById('map');
const temperatureChartCanvas = document.getElementById('temperature-chart');
const humidityChartCanvas = document.getElementById('humidity-chart');
const dailyForecastContainer = document.getElementById('daily-forecast-container');

let map;
let marker;
let temperatureChart;
let humidityChart;

function initMap(lat, lon) {
    if (map) {
        map.remove();
    }
    map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = L.marker([lat, lon]).addTo(map);
}


async function getWeatherData(city) {
    try {
        const currentWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=fr`);
        const currentWeatherData = await currentWeatherResponse.json();

        if (currentWeatherData.cod === '404') {
            alert('Ville non trouvée !');
            return null;
        }

        // Fetch 5-day forecast
        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=fr`);
        const forecastData = await forecastResponse.json();

        if (forecastData.cod !== '200') {
            console.error('Erreur lors de la récupération des prévisions:', forecastData);
            return currentWeatherData; // Return current weather data even if forecast fails
        }

        return { current: currentWeatherData, forecast: forecastData };

    } catch (error) {
        console.error('Erreur lors de la récupération des données météo:', error);
        alert('Erreur lors de la récupération des données météo. Veuillez réessayer.');
        return null;
    }
}

async function getGeminiSummary(weatherData) {
    geminiSummaryText.textContent = "Chargement du résumé..."; // Initial loading message
    geminiAnimation.style.opacity = 0; // Hide the summary initially
    geminiAnimation.style.animation = 'none'; // Reset animation

    const prePrompt = "Tu es un expert en météo. Tu dois fournir un résumé concis et informatif de la météo actuelle. En plus du résumé, donne des conseils sur comment s'habiller en fonction de la météo et des explications intelligentes sur les conditions météorologiques. Limite toi à une ou deux phrases maximum.";
    const prompt = `${prePrompt} Résumé météo pour ${weatherData.current.name}: température ${weatherData.current.main.temp}°C, ${weatherData.current.weather[0].description}, humidité ${weatherData.current.main.humidity}%, vent ${weatherData.current.wind.speed} m/s.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            }),
        });

        const data = await response.json();

        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            const summary = data.candidates[0].content.parts[0].text;
            geminiSummaryText.textContent = summary;

            // Trigger animation
            geminiAnimation.style.opacity = 1;
            geminiAnimation.style.animation = 'fadeIn 1s forwards';

            return summary;
        } else {
            console.warn("Réponse Gemini inattendue:", data);
            geminiSummaryText.textContent = "Résumé non disponible.";
            return "Résumé non disponible.";
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du résumé Gemini:', error);
        geminiSummaryText.textContent = "Résumé non disponible.";
        return "Résumé non disponible.";
    }
}

function displayWeatherData(weatherData) {
    cityName.textContent = weatherData.current.name;
    weatherIcon.src = `https://openweathermap.org/img/w/${weatherData.current.weather[0].icon}.png`;
    temperature.textContent = `Température: ${weatherData.current.main.temp}°C`;
    description.textContent = `Description: ${weatherData.current.weather[0].description}`;
    humidity.textContent = `Humidité: ${weatherData.current.main.humidity}%`;
    windSpeed.textContent = `Vitesse du vent: ${weatherData.current.wind.speed} m/s`;

    initMap(weatherData.current.coord.lat, weatherData.current.coord.lon);

    // Handle forecast data
    if (weatherData.forecast) {
        const dailyData = processForecastData(weatherData.forecast.list);
        createTemperatureChart(dailyData.timestamps, dailyData.temperatures);
        createHumidityChart(dailyData.timestamps, dailyData.humidities);
        displayDailyForecast(dailyData);
    }
}


function processForecastData(forecastList) {
    const dailyData = {};

    forecastList.forEach(item => {
        const date = item.dt_txt.split(' ')[0]; // Get the date part
        if (!dailyData[date]) {
            dailyData[date] = {
                timestamp: date,
                temperatures: [],
                humidities: [],
                icon: null,
            };
        }
        dailyData[date].temperatures.push(item.main.temp);
        dailyData[date].humidities.push(item.main.humidity);

        if (!dailyData[date].icon) {
            dailyData[date].icon = item.weather[0].icon;
        }
    });

    // Convert the object to an array
    const dailyDataArray = Object.values(dailyData);

    // Extract timestamps, temperatures, and humidities
    const timestamps = dailyDataArray.map(item => item.timestamp);
    const temperatures = dailyDataArray.map(item => item.temperatures.reduce((a, b) => a + b, 0) / item.temperatures.length); // Average temperature
    const humidities = dailyDataArray.map(item => item.humidities.reduce((a, b) => a + b, 0) / item.humidities.length); // Average humidity
    const icons = dailyDataArray.map(item => item.icon);

    return { timestamps, temperatures, humidities, icons };
}

function createTemperatureChart(labels, data) {
    if (temperatureChart) {
        temperatureChart.destroy();
    }

    temperatureChart = new Chart(temperatureChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Température (°C)',
                data: data,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createHumidityChart(labels, data) {
    if (humidityChart) {
        humidityChart.destroy();
    }

    humidityChart = new Chart(humidityChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Humidité (%)',
                data: data,
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function displayDailyForecast(dailyData) {
    dailyForecastContainer.innerHTML = ''; // Clear previous forecast

    for (let i = 0; i < dailyData.timestamps.length; i++) {
        const forecastItem = document.createElement('div');
        forecastItem.classList.add('daily-forecast-item');

        const date = dailyData.timestamps[i];
        const temperature = dailyData.temperatures[i].toFixed(1);
        const iconCode = dailyData.icons[i];
        const iconUrl = `https://openweathermap.org/img/w/${iconCode}.png`;

        forecastItem.innerHTML = `
            <p>${date}</p>
            <img src="${iconUrl}" alt="Weather Icon">
            <p>${temperature}°C</p>
        `;
        dailyForecastContainer.appendChild(forecastItem);
    }
}

searchButton.addEventListener('click', async () => {
    const city = searchInput.value;
    const weatherData = await getWeatherData(city);

    if (weatherData) {
        displayWeatherData(weatherData);
    }
});

// Default location on load (Paris)
geminiButton.addEventListener('click', async () => {
    const city = searchInput.value;
    if (!city) {
        alert("Veuillez entrer une ville.");
        return;
    }

    const weatherData = await getWeatherData(city);
    if (weatherData) {
        await getGeminiSummary(weatherData);
    }
});

window.addEventListener('load', async () => {
    const defaultCity = 'Paris';
    const weatherData = await getWeatherData(defaultCity);
    if (weatherData) {
        displayWeatherData(weatherData);
    } else {
        console.error("Impossible de récupérer les données météo pour Paris par défaut.");
    }
});
