const LAT = 30.2672;
const LON = -97.7431;

async function fetchWeather() {
    try {
        const response = await fetch('/api/weather?lat=' + LAT + '&lon=' + LON);
        const data = await response.json();

        // Tomorrow.io returns timelines (hourly/daily)
        processForecast(data.timelines.hourly);

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

function processForecast(hourlyList) {
    const todaySlot = document.getElementById('today-slot');
    const tomorrowSlot = document.getElementById('tomorrow-slot');
    const aqiText = document.getElementById('aqi-text');
    const aqiDot = document.getElementById('aqi-dot-today');

    // 1. Get Current Air/Pollen from the first hourly slot
    const current = hourlyList[0].values;
    const aqi = current.epaIndex || 1; 
    const treePollen = current.treeIndex || 0;
    const grassPollen = current.grassIndex || 0;
    const weedPollen = current.weedIndex || 0;
    const highestPollen = Math.max(treePollen, grassPollen, weedPollen);

    // Update AQI/Pollen Subheading
    const aqiLabels = ["", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
    const pollenLabels = ["None", "Low", "Moderate", "High", "Very High", "Extreme"];
    
    if (aqiDot) aqiDot.className = 'aqi-indicator aqi-' + aqi;
    aqiText.innerHTML = "AQI: " + aqiLabels[aqi] + " | Pollen: " + pollenLabels[highestPollen];

    // 2. Filter for Today and Tomorrow
    const todayDate = new Date().toLocaleDateString();
    const tomorrowDate = new Date(Date.now() + 86400000).toLocaleDateString();

    const todayItems = hourlyList.filter(i => new Date(i.time).toLocaleDateString() === todayDate);
    const tomorrowItems = hourlyList.filter(i => new Date(i.time).toLocaleDateString() === tomorrowDate);

    const getAdvice = (items) => {
        // Veto if air quality is Moderate+ or Pollen is High+
        if (aqi >= 3) return { error: "Air pollution is too high today." };
        if (highestPollen >= 3) return { error: "Pollen counts (Cedar/Oak) are too high." };

        const safeSlots = items.filter(item => {
            const v = item.values;
            const dp = calculateDewPoint(v.temperature, v.humidity);
            return v.temperature < 78 && dp < 62;
        });

        if (safeSlots.length > 0) {
            return { best: safeSlots.sort((a, b) => a.values.temperature - b.values.temperature)[0] };
        }

        const avgTemp = items.reduce((sum, i) => sum + i.values.temperature, 0) / items.length;
        return { error: avgTemp > 82 ? "Too hot outside." : "Too humid for Austin comfort." };
    };

    const renderSlot = (slot, advice) => {
        if (advice.best) {
            const v = advice.best.values;
            const time = new Date(advice.best.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dp = calculateDewPoint(v.temperature, v.humidity).toFixed(1);
            
            const tempDiff = 75 - v.temperature;
            let duration = tempDiff > 15 ? "5-10 mins (Flash)" : "20-25 mins";

            slot.innerHTML = "<strong>" + time + "</strong><br><b>Open for: " + duration + "</b><br>" +
                             "<small>Temp: " + v.temperature.toFixed(0) + "°F | DP: " + dp + "°F</small>";
            slot.className = "card status-good";
        } else {
            slot.innerHTML = "🚫 <b>Keep Closed</b><br><small>" + advice.error + "</small>";
            slot.className = "card status-bad";
        }
    };

    renderSlot(todaySlot, getAdvice(todayItems));
    renderSlot(tomorrowSlot, getAdvice(tomorrowItems));
}

fetchWeather();
