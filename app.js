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

// ... (fetchWeather and calculateDewPoint remain the same)

function processForecast(hourlyList) {
    const todayContainer = document.getElementById('today-slots');
    const tomorrowContainer = document.getElementById('tomorrow-slots');
    const aqiText = document.getElementById('aqi-text');
    const aqiDot = document.getElementById('aqi-dot-today');

    // 1. SAFE DATA ACCESS (Line 44 area)
    // Tomorrow.io uses .values.epaIndex and .values.temperature
    const current = hourlyList[0].values;
    const aqi = current.epaIndex || 1; 
    const highestPollen = Math.max(current.treeIndex || 0, current.grassIndex || 0, current.weedIndex || 0);

    const aqiLabels = ["", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
    const pollenLabels = ["None", "Low", "Moderate", "High", "Very High", "Extreme"];
    
    if (aqiDot) aqiDot.className = 'aqi-indicator aqi-' + aqi;
    aqiText.innerHTML = "AQI: " + aqiLabels[aqi] + " | Pollen: " + pollenLabels[highestPollen];

    const todayDate = new Date().toLocaleDateString();
    const tomorrowDate = new Date(Date.now() + 86400000).toLocaleDateString();

    const todayItems = hourlyList.filter(i => new Date(i.time).toLocaleDateString() === todayDate);
    const tomorrowItems = hourlyList.filter(i => new Date(i.time).toLocaleDateString() === tomorrowDate);

    const getAdvice = (items) => {
        if (aqi >= 3 || highestPollen >= 3) {
            return { error: "Air quality/Pollen too high today." };
        }

        // Filter using Tomorrow.io's .values property
        const safeSlots = items.filter(item => {
            const v = item.values; 
            const dp = calculateDewPoint(v.temperature, v.humidity);
            return v.temperature < 78 && dp < 62;
        });

        return safeSlots.length > 0 ? { safe: safeSlots } : { error: "No safe windows found." };
    };

    // 2. RENDER MULTIPLE SLOTS (Line 89 area)
    const renderSlot = (container, advice) => {
        container.innerHTML = ""; 
        if (advice.safe) {
            advice.safe.forEach(item => {
                const v = item.values;
                const time = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dp = calculateDewPoint(v.temperature, v.humidity).toFixed(0);
                
                const card = document.createElement('div');
                card.className = "card status-good";
                card.innerHTML = "<strong>" + time + "</strong><br><small>" + v.temperature.toFixed(0) + "°F | DP: " + dp + "°</small>";
                container.appendChild(card);
            });
        } else {
            const errorCard = document.createElement('div');
            errorCard.className = "card status-bad";
            errorCard.innerHTML = "🚫 <b>Keep Closed</b><br><small>" + advice.error + "</small>";
            container.appendChild(errorCard);
        }
    };

    renderSlot(todayContainer, getAdvice(todayItems));
    renderSlot(tomorrowContainer, getAdvice(tomorrowItems));
}

fetchWeather();
