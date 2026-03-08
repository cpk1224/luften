export default async function handler(req, res) {
  const API_KEY = process.env.TOMORROW_API_KEY;
  const { lat, lon } = req.query;

  // We request hourly data for the next 48 hours
  const url = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${API_KEY}&units=imperial`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Tomorrow.io API Error');
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
}
