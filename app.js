const API_KEY = 'WEATHER_API_KEY'; 
const LAT = 30.2672; // Austin
const LON = -97.7431;

async function fetchWeather() {
    try {
        const response = await fetch('/api/weather?lat=' + LAT + '&lon=' + LON);
        const data = await response.json();

        if (data.error || !data.list) {
            console.error("Server Error:", data);
            return;
        }

        processForecast(data.list);

        // UPDATE TIMESTAMP HERE
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('last-updated').innerHTML = "Last Updated: " + timeString;

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
    const getAdvice = (items) => {
        if (items.length === 0) return { error: "No forecast data available." };

        // 1. Try to find a "Safe" slot (Temp < 78, Dew Point < 62)
        const safeSlots = items.filter(f => {
            const dp = calculateDewPoint(f.main.temp, f.main.humidity);
            return f.main.temp < 78 && dp < 62;
        });

        if (safeSlots.length > 0) {
            // Pick the one with the lowest dew point for maximum freshness
            return { best: safeSlots.sort((a, b) => calculateDewPoint(a.main.temp, a.main.humidity) - calculateDewPoint(b.main.temp, b.main.humidity))[0] };
        }

        // 2. If no safe slot, figure out WHY
        const avgTemp = items.reduce((sum, f) => sum + f.main.temp, 0) / items.length;
        const avgDP = items.reduce((sum, f) => sum + calculateDewPoint(f.main.temp, f.main.humidity), 0) / items.length;

        if (avgTemp > 85) return { error: "Too hot outside. You'll just lose your AC's cold air." };
        if (avgDP > 65) {
    return { error: "Too humid. High dew point (" + avgDP.toFixed(0) + "°F) will make your house feel sticky." };
}
        return { error: "Conditions are marginal. Better to keep sealed." };
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
