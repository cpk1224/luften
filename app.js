const API_KEY = '777994cf70c9bdfce5e5b26178af1601'; 
const LAT = 30.2672; // Austin
const LON = -97.7431;

async function fetchWeather() {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=imperial`);
    const data = await response.json();
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

    // Filter for best times: Temp < 78 and Dew Point < 62
    let bestToday = list.find(f => {
        const dp = calculateDewPoint(f.main.temp, f.main.humidity);
        return f.main.temp < 78 && dp < 62;
    });

    if (bestToday) {
        const time = new Date(bestToday.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        todaySlot.innerHTML = `<span class="time-slot">${time}</span><br>Temp: ${bestToday.main.temp}°F<br>Dew Point: ${calculateDewPoint(bestToday.main.temp, bestToday.main.humidity).toFixed(1)}°F`;
        todaySlot.className = "card status-good";
    } else {
        todaySlot.innerHTML = "Keep windows closed. Austin is too humid today!";
        todaySlot.className = "card status-bad";
    }
}

fetchWeather();
