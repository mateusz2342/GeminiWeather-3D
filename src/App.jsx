import React, { useState, useEffect } from 'react';
import {
  Sun, Wind, RefreshCw, Sparkles, AlertTriangle,
  Droplets, Compass, ShieldAlert, Calendar, Clock
} from 'lucide-react';

export default function App() {
  const [city, setCity] = useState('Warszawa');
  const [searchInput, setSearchInput] = useState('Warszawa');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const fetchWeather = async (cityName) => {
    setLoading(true);
    setError(null);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pl&format=json`);
      const geoData = await geoRes.json();

      if (!geoData.results) throw new Error('Nie znaleziono miasta.');
      const { latitude, longitude, name, country } = geoData.results[0];

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`);
      const weatherJson = await weatherRes.json();

      const days = weatherJson.daily.time.map((dateStr, idx) => {
        const d = new Date(dateStr);
        const dayName = idx === 0 ? 'Dzisiaj' : d.toLocaleDateString('pl-PL', { weekday: 'short' });
        
        const hourlyForDay = [];
        for (let h = 0; h < 24; h++) {
          const globalIdx = (idx * 24) + h;
          hourlyForDay.push({
            time: `${h}:00`,
            temp: weatherJson.hourly.temperature_2m[globalIdx],
            humidity: weatherJson.hourly.relative_humidity_2m[globalIdx],
            wind: weatherJson.hourly.wind_speed_10m[globalIdx],
            pressure: weatherJson.hourly.surface_pressure[globalIdx]
          });
        }
        return {
          date: dayName,
          maxTemp: weatherJson.daily.temperature_2m_max[idx],
          minTemp: weatherJson.daily.temperature_2m_min[idx],
          uvMax: weatherJson.daily.uv_index_max[idx],
          hourly: hourlyForDay
        };
      });

      setWeatherData({
        name: `${name}, ${country}`,
        temp: weatherJson.current.temperature_2m,
        humidity: weatherJson.current.relative_humidity_2m,
        wind: weatherJson.current.wind_speed_10m,
        pressure: weatherJson.current.surface_pressure,
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

  useEffect(() => { fetchWeather(city); }, [city]);

  const currentDay = weatherData?.days[selectedDayIndex];
  // Pobieramy dane z 12:00 w południe dla prognozy godzinowej, aby mieć reprezentatywne wartości
  const hourlyData = currentDay?.hourly[12]; 

  const active = selectedDayIndex === 0 
    ? { h: weatherData?.humidity, w: weatherData?.wind, p: weatherData?.pressure }
    : { h: hourlyData?.humidity, w: hourlyData?.wind, p: hourlyData?.pressure };
    return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); setCity(searchInput); }} className="flex gap-2">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100" />
          <button type="submit" className="bg-cyan-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-500">Szukaj</button>
        </form>

        {loading && <div className="text-center py-10"><RefreshCw className="animate-spin w-8 h-8 mx-auto text-cyan-400" /></div>}
        {error && <div className="p-4 bg-red-900/50 rounded-xl text-red-200">{error}</div>}

        {weatherData && (
          <>
            <div className="bg-slate-900 p-6 rounded-3xl text-center border border-slate-800 shadow-xl">
              <Sun className="w-12 h-12 mx-auto text-cyan-400 mb-2" />
              <h2 className="text-xl font-bold">{weatherData.name}</h2>
              <p className="text-4xl font-extrabold text-cyan-400 my-2">{selectedDayIndex === 0 ? weatherData.temp : currentDay.maxTemp}°C</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <Droplets className="text-blue-400" />
                <div><p className="text-[10px] text-slate-400">Wilgotność</p><p className="font-semibold">{active.h}%</p></div>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <Wind className="text-cyan-400" />
                <div><p className="text-[10px] text-slate-400">Wiatr</p><p className="font-semibold">{active.w} km/h</p></div>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <Compass className="text-emerald-400" />
                <div><p className="text-[10px] text-slate-400">Ciśnienie</p><p className="font-semibold">{active.p ? active.p.toFixed(1) : '--'} hPa</p></div>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <ShieldAlert className="text-amber-400" />
                <div><p className="text-[10px] text-slate-400">UV Max</p><p className="font-semibold">{currentDay.uvMax}</p></div>
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

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">Radar Pogodowy</h3>
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800">
                <iframe title="Radar" src={`https://www.rainviewer.com/map.html?loc=${weatherData.lat},${weatherData.lon},7&o8=1&c=1&o=0&m=0&g=0`} className="w-full h-full" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

