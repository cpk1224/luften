const API_KEY = 'WEATHER_API_KEY'; 
const LAT = 30.2672; // Austin
const LON = -97.7431;

async function fetchWeather() {
    try {
        const response = await fetch('/api/weather?lat=' + LAT + '&lon=' + LON);
        const data = await response.json();

        // data.weather contains the forecast, data.air contains AQI
        processForecast(data.weather.list, data.air);

        const now = new Date();
        document.getElementById('last-updated').innerHTML = "Last Updated: " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
        console.error("Fetch failed:", err);
    }
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

    const todayDate = new Date().toLocaleDateString();
    const tomorrowDate = new Date(Date.now() + 86400000).toLocaleDateString();

    const todayItems = list.filter(i => new Date(i.dt * 1000).toLocaleDateString() === todayDate);
    const tomorrowItems = list.filter(i => new Date(i.dt * 1000).toLocaleDateString() === tomorrowDate);

    // This function finds the best time OR tells you why no time is good
   const getAdvice = (items, airData) => {
    // 1. CHECK AIR QUALITY FIRST (OpenWeather AQI: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor)
    const aqi = airData ? airData.main.aqi : 1;
    if (aqi >= 3) {
        let reason = aqi === 3 ? "Moderate pollution/pollen." : "Poor air quality (Ozone/Smoke).";
        return { error: "Air Quality Alert: " + reason + " Keep windows shut." };
    }

    // 2. PROCEED TO WEATHER CHECKS
    const safeSlots = items.filter(f => {
        const dp = calculateDewPoint(f.main.temp, f.main.humidity);
        return f.main.temp < 78 && dp < 62;
    });

    if (safeSlots.length > 0) {
        return { best: safeSlots.sort((a, b) => a.main.temp - b.main.temp)[0] };
    }

    // ... (rest of your existing "Why it's closed" logic)
    return { error: "No safe weather window available." };
};

    const renderSlot = (slot, advice) => {
        if (advice.best) {
            const data = advice.best;
            const time = new Date(data.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dp = calculateDewPoint(data.main.temp, data.main.humidity).toFixed(1);
            
            // Duration Logic (Texas adjustment)
            const tempDiff = 75 - data.main.temp;
            let duration = "20-25 mins";
            if (tempDiff > 15) duration = "5-10 mins (Flash Airing)";
            else if (tempDiff > 5) duration = "15-20 mins";

            slot.innerHTML = `
                <span class="time-slot">${time}</span><br>
                <b>Open for: ${duration}</b><br>
                <small>Temp: ${data.main.temp.toFixed(0)}°F | Dew Point: ${dp}°F</small>
            `;
            slot.className = "card status-good";
        } else {
            slot.innerHTML = `🚫 <b>Keep Closed</b><br><small>${advice.error}</small>`;
            slot.className = "card status-bad";
        }
    };

    renderSlot(todaySlot, getAdvice(todayItems));
    renderSlot(tomorrowSlot, getAdvice(tomorrowItems));
}

fetchWeather();
