const apiKey = '670281e8848593c12ea8f0cbb24c2005';
const geminiApiKey = 'AIzaSyCpv4bwo3rNsYth4ty-s2-IEr_BZzPnzj4';

// DOM Elements
const getLocationButton = document.getElementById('get-location');
const temperatureElement = document.getElementById('temperature');
const conditionElement = document.getElementById('condition');
const windSpeedElement = document.getElementById('wind-speed');
const humidityElement = document.getElementById('humidity');
const airQualityElement = document.getElementById('air-quality');
const uvIndexElement = document.getElementById('uv-index');
const rainChartElement = document.getElementById('rain-chart');
const sunChartElement = document.getElementById('sun-chart');
const mapElement = document.getElementById('map');
const summaryElement = document.getElementById('summary');
const searchBox = document.querySelector('.search-box input');
const searchButton = document.querySelector('.search-box button');

let rainChart;
let sunChart;

// Event Listeners
getLocationButton.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, handleLocationError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
});

searchButton.addEventListener('click', () => {
    const city = searchBox.value.trim();
    if (city) {
        fetchWeatherByCity(city);
    } else {
        alert('Please enter a city name.');
    }
});

// Also add event listener for Enter key in search box
searchBox.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const city = searchBox.value.trim();
        if (city) {
            fetchWeatherByCity(city);
        } else {
            alert('Please enter a city name.');
        }
    }
});

function handleLocationError(error) {
    console.error('Geolocation error:', error);
    alert(`Unable to get your location: ${error.message}`);
}

function fetchWeatherByCity(city) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const forecastApiUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Weather status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateCurrentWeather(data);
            displayMapByCity(data.coord.lat, data.coord.lon);
            fetchAiSummary(data.weather[0].description, data.main.temp, data.wind.speed, data.main.humidity);
            
            // Fetch forecast data
            return fetch(forecastApiUrl);
        })
        .then(forecastResponse => {
            if (!forecastResponse.ok) {
                throw new Error(`HTTP error! Forecast status: ${forecastResponse.status}`);
            }
            return forecastResponse.json();
        })
        .then(forecastData => {
            processForecastData(forecastData);
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            alert('Error fetching weather data. Please try again.');
        });
}

function updateCurrentWeather(data) {
    temperatureElement.textContent = `${Math.round(data.main.temp)}°C`;
    conditionElement.textContent = data.weather[0].description;
    windSpeedElement.textContent = `${data.wind.speed} m/s`;
    humidityElement.textContent = `${data.main.humidity}%`;

    // Setting placeholder values for APIs we don't have yet
    airQualityElement.textContent = 'N/A';
    uvIndexElement.textContent = 'N/A';
}

function displayMapByCity(latitude, longitude) {
    const mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=10&output=embed`;
    mapElement.innerHTML = `<iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="${mapUrl}"></iframe>`;
}

function showPosition(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    fetchWeather(latitude, longitude);
}

async function fetchWeather(latitude, longitude) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
    const forecastApiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Weather status: ${response.status}`);
        }
        const data = await response.json();

        updateCurrentWeather(data);
        displayMap(latitude, longitude);
        fetchAiSummary(data.weather[0].description, data.main.temp, data.wind.speed, data.main.humidity);

        // Fetch forecast data
        const forecastResponse = await fetch(forecastApiUrl);
        if (!forecastResponse.ok) {
            throw new Error(`HTTP error! Forecast status: ${forecastResponse.status}`);
        }
        const forecastData = await forecastResponse.json();
        
        processForecastData(forecastData);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Error fetching weather data. Please try again.');
    }
}

function processForecastData(forecastData) {
    // Check if forecastData and its properties exist
    if (!forecastData || !forecastData.list || !Array.isArray(forecastData.list)) {
        console.error('Invalid forecast data format:', forecastData);
        return;
    }

    // Extract rain and cloud data for the next 5 days
    const rainData = [];
    const sunData = [];
    const forecastLength = Math.min(forecastData.list.length, 40); // 5 days, 8 intervals per day

    for (let i = 0; i < 5; i++) {
        let rain = 0;
        let clouds = 0;
        let entriesCount = 0;

        for (let j = 0; j < 8; j++) {
            const index = i * 8 + j;
            
            if (index < forecastLength) {
                const entry = forecastData.list[index];
                
                // Check if rain data exists and has the 3h property
                if (entry.rain && typeof entry.rain['3h'] === 'number') {
                    rain += entry.rain['3h'];
                }
                
                // Check if clouds data exists
                if (entry.clouds && typeof entry.clouds.all === 'number') {
                    clouds += entry.clouds.all;
                }
                
                entriesCount++;
            }
        }

        rainData.push(rain);
        // Calculate average cloud cover, inverted for sunshine, ensure we don't divide by zero
        sunData.push(entriesCount > 0 ? 100 - (clouds / entriesCount) : 0);
    }

    createRainChart(rainData);
    createSunChart(sunData);
}

async function fetchAiSummary(weatherDescription, temperature, windSpeed, humidity) {
    const prompt = `The current weather is ${weatherDescription} with a temperature of ${temperature} degrees Celsius, wind speed of ${windSpeed} m/s, and humidity of ${humidity}%. Provide a concise yet detailed summary of the weather conditions, highlighting key points such as temperature, wind speed, humidity, and any other relevant factors. Based on these conditions, recommend general types of clothing and accessories that would be appropriate to wear to ensure comfort and protection from the elements. Avoid being overly specific with clothing recommendations (e.g., instead of "a lightweight waterproof jacket," suggest "a light jacket"). Do not start the summary by saying "Okay, here's a summary:".`;

    summaryElement.textContent = "Generating AI summary..."; // Initial loading message

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Gemini API status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && data.candidates[0].content.parts && 
            data.candidates[0].content.parts.length > 0) {
            let aiText = data.candidates[0].content.parts[0].text;
            animateText(aiText);
        } else {
            console.error("Invalid Gemini API response:", data);
            summaryElement.textContent = 'Error fetching AI summary.';
        }
    } catch (error) {
        console.error('Error fetching AI summary:', error);
        summaryElement.textContent = 'Error fetching AI summary.';
    }
}

function animateText(text) {
    let index = 0;
    summaryElement.textContent = ""; // Clear the loading message
    
    const interval = setInterval(() => {
        if (index < text.length) {
            summaryElement.textContent += text.charAt(index);
            index++;
        } else {
            clearInterval(interval);
        }
    }, 20); // Adjust the interval to control the speed of the animation
}

function displayMap(latitude, longitude) {
    const mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=10&output=embed`;
    mapElement.innerHTML = `<iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="${mapUrl}"></iframe>`;
}

// Function to create or update the rain chart
function createRainChart(rainData) {
    const ctx = rainChartElement.getContext('2d');
    
    if (!ctx) {
        console.error('Could not get canvas context for rain chart');
        return;
    }

    if (rainChart) {
        rainChart.destroy(); // Destroy existing chart
    }

    rainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
            datasets: [{
                label: 'Rain Precipitation (mm)',
                data: rainData,
                backgroundColor: 'rgba(0, 0, 255, 0.5)',
                borderColor: 'rgba(0, 0, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                },
            },
        },
    });
}

// Function to create or update the sun chart
function createSunChart(sunData) {
    const ctx = sunChartElement.getContext('2d');
    
    if (!ctx) {
        console.error('Could not get canvas context for sun chart');
        return;
    }

    if (sunChart) {
        sunChart.destroy(); // Destroy existing chart
    }

    sunChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
            datasets: [{
                label: 'Sunshine (%)',
                data: sunData,
                backgroundColor: 'rgba(255, 255, 0, 0.2)',
                borderColor: 'rgba(255, 255, 0, 1)',
                borderWidth: 1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Animation on scroll
const animatedSections = document.querySelectorAll('.animated-section');

function handleScroll() {
    const windowHeight = window.innerHeight;
    const scrollPosition = window.pageYOffset;

    animatedSections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top + scrollPosition;
        const sectionHeight = section.offsetHeight;

        if (scrollPosition > sectionTop - windowHeight + 100 && scrollPosition < sectionTop + sectionHeight) {
            section.classList.add('visible');
        } else {
            section.classList.remove('visible');
        }
    });
}

window.addEventListener('scroll', handleScroll);

// Initial load
window.addEventListener('load', () => {
    handleScroll();
});
