export default async function handler(req, res) {
  const API_KEY = process.env.WEATHER_API_KEY;
  const { lat, lon } = req.query;

  const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
  const airUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

  try {
    // Fetch both at the same time to stay fast
    const [weatherRes, airRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(airUrl)
    ]);

    const weatherData = await weatherRes.json();
    const airData = await airRes.json();

    // Combine them into one object
    res.status(200).json({
      weather: weatherData,
      air: airData.list ? airData.list[0] : null
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
