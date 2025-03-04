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

function getBackgroundGradient(weatherDescription) {
    switch (weatherDescription) {
        case 'ciel dégagé': // Sunny
            return 'linear-gradient(to bottom, #FFD700, #FFA500)'; // Gold to orange
        case 'nuageux': // Cloudy
            return 'linear-gradient(to bottom, #808080, #A9A9A9)'; // Gray to dark gray
        case 'pluie': // Rainy
            return 'linear-gradient(to bottom, #4682B4, #778899)'; // Steel blue to light slate gray
        case 'bruine': // Drizzle
            return 'linear-gradient(to bottom, #ADD8E6, #B0C4DE)'; // Light blue to light steel blue
        case 'orage': // Thunderstorm
            return 'linear-gradient(to bottom, #4B0082, #800080)'; // Indigo to purple
        case 'neige': // Snow
            return 'linear-gradient(to bottom, #FFFFFF, #F0F8FF)'; // White to alice blue
        case 'vent': // Windy
            return 'linear-gradient(to bottom, #A0522D, #C04000)'; // Sienna to brown
        default:
            return 'linear-gradient(to bottom, #222, #444)'; // Default dark gradient
    }
}

function displayWeatherData(weatherData) {
    cityName.textContent = weatherData.current.name;
    weatherIcon.src = `https://openweathermap.org/img/w/${weatherData.current.weather[0].icon}.png`;
    temperature.textContent = `Température: ${weatherData.current.main.temp}°C`;
    description.textContent = `Description: ${weatherData.current.weather[0].description}`;
    humidity.textContent = `Humidité: ${weatherData.current.main.humidity}%`;
    windSpeed.textContent = `Vitesse du vent: ${weatherData.current.wind.speed} m/s`;

    // Set background gradient based on weather description
    const weatherDescription = weatherData.current.weather[0].description;
    const backgroundGradient = getBackgroundGradient(weatherDescription);
    document.body.style.background = backgroundGradient;

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
    let city = searchInput.value;

    // Normalize city name
    const normalizedCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const weatherData = await getWeatherData(normalizedCity);

    if (weatherData) {
        displayWeatherData(weatherData);

        // Update the Google Maps embed URL
        const mapUrl = `https://maps.google.com/maps?q=${normalizedCity}&t=&z=16&ie=UTF8&iwloc=&output=embed&maptype=satellite`;
        console.log("Normalized City:", normalizedCity);
        console.log("Map URL:", mapUrl);
        document.getElementById('map').src = mapUrl;

        cityName.textContent = city;
        searchInput.value = city;

        // Reset Gemini Summary
        geminiSummaryText.textContent = ""; // Clear the summary
        if (weatherData) {
            await getGeminiSummary(weatherData);
        }
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

const locationButton = document.getElementById('location-button');

locationButton.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
});

async function showPosition(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    // Reverse geocoding using Nominatim API
    try {
        const reverseGeocodingResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const reverseGeocodingData = await reverseGeocodingResponse.json();

        let city = reverseGeocodingData.address.city || reverseGeocodingData.address.town || reverseGeocodingData.address.village;
        if (!city) {
            // Try to find a nearby larger city
            city = await findNearbyCity(latitude, longitude);
            if (!city) {
                cityName.textContent = `Latitude: ${latitude}, Longitude: ${longitude}`;
                return;
            }
        }

        if (!city) {
            cityName.textContent = "Impossible de déterminer la ville. Veuillez entrer manuellement votre emplacement.";
            return;
        }

        // Update the Google Maps embed URL
        const mapUrl = `https://maps.google.com/maps?q=${city}&t=&z=16&ie=UTF8&iwloc=&output=embed&maptype=satellite`;
        document.getElementById('map').src = mapUrl;
        cityName.textContent = city;
        searchInput.value = city;

        // Normalize city name
        const normalizedCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Fetch weather data for the location
        geminiSummaryText.textContent = ""; // Clear the summary
        const weatherData = await getWeatherData(normalizedCity);
        if (weatherData) {
            displayWeatherData(weatherData);
            await getGeminiSummary(weatherData);
        }
    } catch (error) {
        console.error('Error during reverse geocoding:', error);
        cityName.textContent = "Impossible de déterminer la ville. Veuillez réessayer ou entrer manuellement votre emplacement.";
    }
}

async function findNearbyCity(latitude, longitude) {
    try {
        // Search for nearby cities using Nominatim API
        const searchResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=[city]&bounded=1&viewbox=${longitude-0.5},${latitude-0.5},${longitude+0.5},${latitude+0.5}`);
        const searchData = await searchResponse.json();

        if (searchData && searchData.length > 0) {
            // Return the first city found
            return searchData[0].display_name.split(',').reverse()[2];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error during nearby city search:', error);
        return null;
    }
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}

window.addEventListener('load', async () => {
    const defaultCity = 'Paris';
    const weatherData = await getWeatherData(defaultCity);
    if (weatherData) {
        displayWeatherData(weatherData);
    } else {
        console.error("Impossible de récupérer les données météo pour Paris par défaut.");
    }
});
