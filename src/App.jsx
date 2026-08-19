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
  const [soundEnabled, setSoundEnabled] = useState(true);
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

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`);
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

  const speakSummary = () => {
    if (!weatherData) return;
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      const text = `Prognoza dla miasta ${weatherData.name}. Temperatura wynosi obecnie ${weatherData.temp} stopni Celsjusza. Wybrana prognoza na ten dzień to maksymalnie ${weatherData.days[selectedDayIndex].maxTemp} stopni.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pl-PL';
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const currentDay = weatherData?.days[selectedDayIndex];
  const currentHourly = currentDay?.hourly[12] || currentDay?.hourly[0];

  const activeHumidity = selectedDayIndex === 0 ? weatherData?.humidity : currentHourly?.humidity;
  const activeWind = selectedDayIndex === 0 ? weatherData?.wind : currentHourly?.wind;
    return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4">
      <header className="w-full max-w-md mx-auto flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            GeminiWeather 3D
          </h1>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      <form onSubmit={handleSearch} className="w-full max-w-md mx-auto flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Wpisz miasto..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          type="submit"
          className="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Szukaj
        </button>
      </form>

      <main className="w-full max-w-md mx-auto flex-1 flex flex-col gap-4">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
            <p className="text-sm text-slate-400">Pobieranie zaawansowanych danych...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-900/50 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {!loading && !error && weatherData && (
          <>
            <div className="relative w-full rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800/80 p-6 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 mb-3">
                <Sun className="w-12 h-12 text-cyan-400 animate-spin-slow" />
              </div>
              <h2 className="text-2xl font-bold">{weatherData.name}</h2>
              <p className="text-4xl font-extrabold my-1 text-cyan-400">
                {selectedDayIndex === 0 ? weatherData.temp : currentDay.maxTemp}°C
              </p>
              <p className="text-xs text-slate-400">
                {selectedDayIndex === 0 ? `Odczuwalna: ${weatherData.feelsLike}°C` : `Min: ${currentDay.minTemp}°C / Max: ${currentDay.maxTemp}°C`}
              </p>

              <button
                onClick={speakSummary}
                className="w-full mt-4 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 text-cyan-400 border border-slate-700/50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isSpeaking ? 'Zatrzymaj głos' : 'AI Asystent - Doczytaj pogodę'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <Droplets className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Wilgotność</p>
                  <p className="text-sm font-semibold">{activeHumidity !== undefined ? activeHumidity : '--'}%</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <Wind className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Wiatr</p>
                  <p className="text-sm font-semibold">{activeWind !== undefined ? activeWind : '--'} km/h</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <Compass className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Ciśnienie</p>
                  <p className="text-sm font-semibold">{weatherData.pressure} hPa</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Indeks UV (max)</p>
                  <p className="text-sm font-semibold">{currentDay ? currentDay.uvMax : '--'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">Prognoza na 7 dni</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weatherData.days.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`flex flex-col items-center p-3 rounded-xl min-w-[75px] border transition-all ${
                      selectedDayIndex === idx
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 scale-105'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-medium">{day.date}</span>
                    <Sun className="w-5 h-5 my-1.5 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-100">{day.maxTemp}°</span>
                    <span className="text-[10px] text-slate-500">{day.minTemp}°</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">Co godzinę ({currentDay?.date})</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {currentDay?.hourly.map((hour, hIdx) => (
                  <div key={hIdx} className="flex flex-col items-center bg-slate-900/80 p-2.5 rounded-xl min-w-[60px] border border-slate-800/50">
                    <span className="text-[11px] text-slate-400">{hour.time}</span>
                    <Sun className="w-4 h-4 my-2 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-100">{hour.temp}°C</span>
                    <span className="text-[10px] text-slate-500 mt-1">{hour.wind} km/h</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span>Radar Pogodowy (Opady na żywo)</span>
              </h3>
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800">
                <iframe
                  title="Radar pogodowy"
                  src={`https://www.rainviewer.com/map.html?loc=${weatherData.lat},${weatherData.lon},7&o8=1&c=1&o=0&m=0&g=0`}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

