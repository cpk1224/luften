export default async function handler(req, res) {
  // 1. Get your API key from Vercel's environment variables
  const API_KEY = process.env.WEATHER_API_KEY;

  // 2. Get the coordinates (Austin is passed from your app.js)
  const { lat, lon } = req.query;

  // 3. Validation: Make sure we have what we need
  if (!API_KEY) {
    return res.status(500).json({ error: "API Key not found in Vercel settings." });
  }
  if (!lat || !lon) {
    return res.status(400).json({ error: "Latitude and Longitude are required." });
  }

  // 4. Construct the OpenWeather URL
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // 5. Check if OpenWeather returned an error
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // 6. Send the weather data back to your app.js
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Server error fetching weather data." });
  }
}
