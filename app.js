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

    const safeSlots = items.filter(item => {
        const v = item.values; 
        const dp = calculateDewPoint(v.temperature, v.humidity);
        return v.temperature < 78 && dp < 62;
    });

    if (safeSlots.length > 0) {
        // --- NEW CONSOLIDATION LOGIC ---
        const ranges = [];
        let currentRange = [safeSlots[0]];

        for (let i = 1; i < safeSlots.length; i++) {
            const prevTime = new Date(safeSlots[i-1].time).getTime();
            const currTime = new Date(safeSlots[i].time).getTime();

            // Check if this hour is consecutive (3600000ms = 1 hour)
            if (currTime - prevTime === 3600000) {
                currentRange.push(safeSlots[i]);
            } else {
                ranges.push(currentRange);
                currentRange = [safeSlots[i]];
            }
        }
        ranges.push(currentRange); // Push the last group
        return { safeRanges: ranges };
    }

    return { error: "No safe windows found." };
};

    // 2. RENDER MULTIPLE SLOTS (Line 89 area)
    const renderSlot = (container, advice) => {
    container.innerHTML = ""; 

    if (advice.safeRanges) {
        advice.safeRanges.forEach(range => {
            const first = range[0];
            const last = range[range.length - 1];
            
            const startTime = new Date(first.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // If the range is longer than 1 hour, show "Start - End"
            let timeDisplay = startTime;
            if (range.length > 1) {
                // We add 1 hour to the 'last' slot because a 1pm slot covers 1pm-2pm
                const endTimeObj = new Date(new Date(last.time).getTime() + 3600000);
                const endTime = endTimeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                timeDisplay = `${startTime} - ${endTime}`;
            }

            const avgTemp = range.reduce((sum, h) => sum + h.values.temperature, 0) / range.length;
            
            const card = document.createElement('div');
            card.className = "card status-good";
            // Make ranges take up more width if they are long
            if (range.length > 2) card.style.flex = "1 1 100%";

            card.innerHTML = `
                <strong>${timeDisplay}</strong><br>
                <small>Avg Temp: ${avgTemp.toFixed(0)}°F</small>
            `;
            container.appendChild(card);
        });
    } else {
        // ... (Error handling stays the same)
    }
};

    renderSlot(todayContainer, getAdvice(todayItems));
    renderSlot(tomorrowContainer, getAdvice(tomorrowItems));
}

fetchWeather();
