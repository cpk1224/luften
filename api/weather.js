export default async function handler(req, res) {
  const API_KEY = process.env.WEATHER_API_KEY;
  const { lat, lon } = req.query;

  // Endpoint 1: Weather Forecast
  const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
  // Endpoint 2: Current Air Pollution
  const airUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

  try {
    const [weatherRes, airRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(airUrl)
    ]);

    const weatherData = await weatherRes.json();
    const airData = await airRes.json();

    res.status(200).json({
      weather: weatherData,
      air: airData.list ? airData.list[0] : null
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Austin data" });
  }
}
