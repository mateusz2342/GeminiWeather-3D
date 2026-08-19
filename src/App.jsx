import React, { useState, useEffect } from 'react';
import {
  Sun, Wind, RefreshCw, Volume2, VolumeX, Sparkles, AlertTriangle,
  Droplets, Compass, ShieldAlert, Calendar, Clock
} from 'lucide-react';

export default function App() {
  const [city, setCity] = useState('Warszawa');
  const [searchInput, setSearchInput] = useState('Warszawa');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const fetchWeather = async (cityName) => {
    setLoading(true);
    setError(null);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pl&format=json`);
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Nie znaleziono takiego miasta.');
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`);
      const weatherJson = await weatherRes.json();

      const days = weatherJson.daily.time.map((dateStr, idx) => {
        const d = new Date(dateStr);
        const dayName = idx === 0 ? 'Dzisiaj' : d.toLocaleDateString('pl-PL', { weekday: 'short' });

        const startHourIdx = idx * 24;
        const hourlyForDay = [];
        for (let h = 0; h < 24; h++) {
          const globalIdx = startHourIdx + h;
          if (weatherJson.hourly && weatherJson.hourly.time[globalIdx]) {
            const timeString = weatherJson.hourly.time[globalIdx].split('T')[1];
            hourlyForDay.push({
              time: timeString,
              temp: weatherJson.hourly.temperature_2m[globalIdx],
              humidity: weatherJson.hourly.relative_humidity_2m[globalIdx],
              wind: weatherJson.hourly.wind_speed_10m[globalIdx],
              pressure: weatherJson.hourly.surface_pressure[globalIdx],
              code: weatherJson.hourly.weather_code[globalIdx],
              uv: weatherJson.hourly.uv_index ? weatherJson.hourly.uv_index[globalIdx] : 0
            });
          }
        }

        return {
          date: dayName,
          maxTemp: weatherJson.daily.temperature_2m_max[idx],
          minTemp: weatherJson.daily.temperature_2m_min[idx],
          code: weatherJson.daily.weather_code[idx],
          sunrise: weatherJson.daily.sunrise[idx].split('T')[1],
          sunset: weatherJson.daily.sunset[idx].split('T')[1],
          uvMax: weatherJson.daily.uv_index_max ? weatherJson.daily.uv_index_max[idx] : 0,
          hourly: hourlyForDay
        };
      });

      setWeatherData({
        name: `${name}, ${country || ''}`,
        temp: weatherJson.current.temperature_2m,
        feelsLike: weatherJson.current.apparent_temperature,
        humidity: weatherJson.current.relative_humidity_2m,
        wind: weatherJson.current.wind_speed_10m,
        pressure: weatherJson.current.surface_pressure,
        code: weatherJson.current.weather_code,
        lat: latitude,
        lon: longitude,
        days: days
      });
      setSelectedDayIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(city);
  }, [city]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setCity(searchInput.trim());
    }
  };

  const currentDay = weatherData?.days[selectedDayIndex];
  const currentHourly = currentDay?.hourly[12] || currentDay?.hourly[0]; 

  const activeHumidity = selectedDayIndex === 0 ? weatherData?.humidity : currentHourly?.humidity;
  const activeWind = selectedDayIndex === 0 ? weatherData?.wind : currentHourly?.wind;
  const activePressure = selectedDayIndex === 0 ? weatherData?.pressure : currentHourly?.pressure;
    return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4">
      <header className="w-full max-w-md mx-auto flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">GeminiWeather 3D</h1>
        </div>
      </header>

      <form onSubmit={handleSearch} className="w-full max-w-md mx-auto flex gap-2 mb-4">
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100" />
        <button type="submit" className="bg-cyan-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-500">Szukaj</button>
      </form>

      <main className="w-full max-w-md mx-auto flex-1 flex flex-col gap-4">
        {!loading && !error && weatherData && (
          <>
            <div className="relative w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center">
              <h2 className="text-2xl font-bold">{weatherData.name}</h2>
              <p className="text-4xl font-extrabold text-cyan-400 my-2">{selectedDayIndex === 0 ? weatherData.temp : currentDay.maxTemp}°C</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400">Wilgotność</p>
                <p className="text-sm font-semibold">{activeHumidity !== undefined ? activeHumidity : '--'}%</p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400">Wiatr</p>
                <p className="text-sm font-semibold">{activeWind !== undefined ? activeWind : '--'} km/h</p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400">Ciśnienie</p>
                <p className="text-sm font-semibold">{activePressure ? Math.round(activePressure) : '--'} hPa</p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400">Indeks UV (max)</p>
                <p className="text-sm font-semibold">{currentDay ? currentDay.uvMax : '--'}</p>
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {weatherData.days.map((day, idx) => (
                  <button key={idx} onClick={() => setSelectedDayIndex(idx)} className={`p-3 rounded-xl min-w-[75px] border ${selectedDayIndex === idx ? 'bg-cyan-500/20 border-cyan-500' : 'bg-slate-900 border-slate-800'}`}>
                    <span className="text-xs">{day.date}</span>
                    <p className="font-bold">{day.maxTemp}°</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

