const API_KEY = 'WEATHER_API_KEY'; 
const LAT = 30.2672; // Austin
const LON = -97.7431;

async function fetchWeather() {
    // We call our internal "middleman" API, not OpenWeather directly
    const response = await fetch(`/api/weather?lat=${LAT}&lon=${LON}`);
    const data = await response.json();
    
    if (data.error) {
        console.error("Weather error:", data.error);
        return;
    }
    processForecast(data.list);
}

function calculateDewPoint(T, RH) {
    // Magnus-Tetens Approximation for Celsius conversion
    const Tc = (T - 32) * 5 / 9;
    const a = 17.625;
    const b = 243.04;
    const alpha = Math.log(RH / 100) + (a * Tc) / (b + Tc);
    const Tdc = (b * alpha) / (a - alpha);
    return (Tdc * 9 / 5) + 32; // Back to Fahrenheit
}

function processForecast(list) {
    const todaySlot = document.getElementById('today-slot');
    const tomorrowSlot = document.getElementById('tomorrow-slot');

    // Helper to find the best slot in a group of forecast items
    const findBestSlot = (forecasts) => {
        return forecasts
            .filter(f => {
                const dp = calculateDewPoint(f.main.temp, f.main.humidity);
                // Austin "Safe Zone": Temp < 78 and Dew Point < 62
                return f.main.temp < 78 && dp < 62;
            })
            .sort((a, b) => a.main.temp - b.main.temp)[0]; // Pick the coolest available
    };

    // Get today's and tomorrow's date strings
    const todayDate = new Date().toLocaleDateString();
    const tomorrowDate = new Date(Date.now() + 86400000).toLocaleDateString();

    const todayItems = list.filter(i => new Date(i.dt * 1000).toLocaleDateString() === todayDate);
    const tomorrowItems = list.filter(i => new Date(i.dt * 1000).toLocaleDateString() === tomorrowDate);

    const bestToday = findBestSlot(todayItems);
    const bestTomorrow = findBestSlot(tomorrowItems);

    const updateUI = (slot, data) => {
        if (data) {
            const time = new Date(data.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dp = calculateDewPoint(data.main.temp, data.main.humidity).toFixed(1);
            
            // Calculate Duration: The cooler it is relative to a 75° house, the faster it airs out
            const tempDiff = 75 - data.main.temp;
            let duration = "25-30 mins"; // Default
            if (tempDiff > 15) duration = "5-10 mins (Flash Airing)";
            else if (tempDiff > 5) duration = "15-20 mins";

            slot.innerHTML = `
                <span class="time-slot">${time}</span><br>
                <b>Duration: ${duration}</b><br>
                Temp: ${data.main.temp}°F | Dew Point: ${dp}°F
            `;
            slot.className = "card status-good";
        } else {
            slot.innerHTML = "🚫 No safe window. Keep AC on.";
            slot.className = "card status-bad";
        }
    };

    updateUI(todaySlot, bestToday);
    updateUI(tomorrowSlot, bestTomorrow);
}

fetchWeather();
