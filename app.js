const LAT = 30.2672; // Austin
const LON = -97.7431;

async function fetchWeather() {
    try {
        const response = await fetch('/api/weather?lat=' + LAT + '&lon=' + LON);
        const data = await response.json();

        // Pass BOTH the forecast list and the air data to the processor
        processForecast(data.weather.list, data.air);

        const now = new Date();
        document.getElementById('last-updated').innerHTML = "Last Updated: " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

function calculateDewPoint(T, RH) {
    const Tc = (T - 32) * 5 / 9;
    const a = 17.625;
    const b = 243.04;
    const alpha = Math.log(RH / 100) + (a * Tc) / (b + Tc);
    const Tdc = (b * alpha) / (a - alpha);
    return (Tdc * 9 / 5) + 32;
}

function processForecast(list, airData) {
    const todaySlot = document.getElementById('today-slot');
    const tomorrowSlot = document.getElementById('tomorrow-slot');
    const aqiDot = document.getElementById('aqi-dot-today');

    // 1. Update the AQI Status Indicator
    const aqi = airData ? airData.main.aqi : 1; 
    if (aqiDot) {
        aqiDot.className = 'aqi-indicator aqi-' + aqi;
    }

    const todayDate = new Date().toLocaleDateString();
    const tomorrowDate = new Date(Date.now() + 86400000).toLocaleDateString();

    const todayItems = list.filter(i => new Date(i.dt * 1000).toLocaleDateString() === todayDate);
    const tomorrowItems = list.filter(i => new Date(i.dt * 1000).toLocaleDateString() === tomorrowDate);

    const getAdvice = (items, currentAqi) => {
        // Air Quality Veto: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
        if (currentAqi >= 3) {
            let reason = currentAqi === 3 ? "Moderate pollution." : "Poor air quality.";
            return { error: "Air Quality Alert: " + reason + " Keep windows shut." };
        }

        const safeSlots = items.filter(f => {
            const dp = calculateDewPoint(f.main.temp, f.main.humidity);
            return f.main.temp < 78 && dp < 62;
        });

        if (safeSlots.length > 0) {
            return { best: safeSlots.sort((a, b) => a.main.temp - b.main.temp)[0] };
        }

        // Logic for why windows are closed
        const avgTemp = items.reduce((sum, f) => sum + f.main.temp, 0) / items.length;
        if (avgTemp > 82) return { error: "Too hot outside today." };
        
        return { error: "No safe weather window available." };
    };

    const renderSlot = (slot, advice) => {
        if (advice.best) {
            const data = advice.best;
            const time = new Date(data.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dp = calculateDewPoint(data.main.temp, data.main.humidity).toFixed(1);
            
            const tempDiff = 75 - data.main.temp;
            let duration = "20-25 mins";
            if (tempDiff > 15) duration = "5-10 mins (Flash Airing)";
            else if (tempDiff > 5) duration = "15-20 mins";

            slot.innerHTML = "<strong>" + time + "</strong><br>" +
                             "<b>Open for: " + duration + "</b><br>" +
                             "<small>Temp: " + data.main.temp.toFixed(0) + "°F | DP: " + dp + "°F</small>";
            slot.className = "card status-good";
        } else {
            slot.innerHTML = "🚫 <b>Keep Closed</b><br><small>" + advice.error + "</small>";
            slot.className = "card status-bad";
        }
    };

    // Pass the AQI into the advice function
    renderSlot(todaySlot, getAdvice(todayItems, aqi));
    renderSlot(tomorrowSlot, getAdvice(tomorrowItems, aqi));
}

fetchWeather();
