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
    
    // (AQI logic remains the same)

    const todayDate = new Date().toLocaleDateString();
    const tomorrowDate = new Date(Date.now() + 86400000).toLocaleDateString();

    const todayItems = hourlyList.filter(i => new Date(i.time).toLocaleDateString() === todayDate);
    const tomorrowItems = hourlyList.filter(i => new Date(i.time).toLocaleDateString() === tomorrowDate);

    const getAdvice = (items) => {
        // Veto Logic (AQI/Pollen checks stay the same)
        if (aqi >= 3) return { error: "Air pollution too high." };
        if (highestPollen >= 3) return { error: "Pollen counts too high." };

        // 1. Find ALL safe slots
        const safeSlots = items.filter(item => {
            const v = item.values;
            const dp = calculateDewPoint(v.temperature, v.humidity);
            return v.temperature < 78 && dp < 62;
        });

        if (safeSlots.length > 0) {
            return { safe: safeSlots }; // Return the full list
        }

        return { error: "No safe windows found." };
    };

    const renderSlot = (container, advice) => {
        container.innerHTML = ""; // Clear existing content

        if (advice.safe) {
            // 2. Loop through every safe window and create a card
            advice.safe.forEach(item => {
                const v = item.values;
                const time = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dp = calculateDewPoint(v.temperature, v.humidity).toFixed(0);
                
                const card = document.createElement('div');
                card.className = "card status-good";
                
                card.innerHTML = "<strong>" + time + "</strong><br>" +
                                 "<small>" + v.temperature.toFixed(0) + "°F | DP: " + dp + "°</small>";
                
                container.appendChild(card);
            });
        } else {
            // Show the "Keep Closed" card if nothing is safe
            const errorCard = document.createElement('div');
            errorCard.className = "card status-bad";
            errorCard.style.width = "100%";
            errorCard.innerHTML = "🚫 <b>Keep Closed</b><br><small>" + advice.error + "</small>";
            container.appendChild(errorCard);
        }
    };

    renderSlot(todayContainer, getAdvice(todayItems));
    renderSlot(tomorrowContainer, getAdvice(tomorrowItems));
}

fetchWeather();
