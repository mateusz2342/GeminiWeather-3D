import React, { useState, useEffect } from 'react';
import { 
  Sun, Wind, RefreshCw, Volume2, VolumeX, Sparkles, AlertTriangle, 
  MapPin, Droplets, Compass, ShieldAlert, Calendar, Clock 
} from 'lucide-react';

export default function App() {
  const [city, setCity] = useState('Warszawa');
  const [searchInput, setSearchInput] = useState('Warszawa');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const fetchWeather = async (cityName) => {
    setLoading(true);
    setError(null);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pl&format=json`);
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Nie znaleziono takiego miasta!');
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`);
      const weatherJson = await weatherRes.json();

      const days = weatherJson.daily.time.map((dateStr, idx) => {
        const d = new Date(dateStr);
        const dayName = idx === 0 ? 'Dzisiaj' : d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' });
        
        const startHourIdx = idx * 24;
        const hourlyForDay = [];
        for (let h = 0; h < 24; h++) {
          const globalHIdx = startHourIdx + h;
          if (weatherJson.hourly && weatherJson.hourly.time[globalHIdx]) {
            const timeString = weatherJson.hourly.time[globalHIdx].split('T')[1];
            hourlyForDay.push({
              time: timeString,
              temp: weatherJson.hourly.temperature_2m[globalHIdx],
              humidity: weatherJson.hourly.relative_humidity_2m[globalHIdx],
              wind: weatherJson.hourly.wind_speed_10m[globalHIdx],
              code: weatherJson.hourly.weather_code[globalHIdx],
              uv: weatherJson.hourly.uv_index ? weatherJson.hourly.uv_index[globalHIdx] : 0
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
          uvMax: weatherJson.daily.uv_index_max ? weatherJson.daily.uv_index_max[idx] : 5,
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
      const text = `Prognoza dla miasta ${weatherData.name}. Temperatura wynosi ${weatherData.temp} stopni.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pl-PL';
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };
    return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4">
      <header className="w-full max-w-md flex items-center justify-between py-4 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            GeminiWeather 3D
          </h1>
        </div>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
        </button>
      </header>

      <form onSubmit={handleSearch} className="w-full max-w-md flex gap-2 mb-6">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Wpisz miasto..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-100"
          />
        </div>
        <button
          type="submit"
          className="bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg"
        >
          Szukaj
        </button>
      </form>

      <main className="w-full max-w-md flex-1 flex flex-col gap-4 pb-6">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
            <p className="text-sm">Pobieranie zaawansowanych danych...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && weatherData && (
          <>
            <div className="relative w-full rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950/40 p-6 border border-slate-800/80 flex flex-col justify-between">
              <div className="relative z-10 text-center my-auto">
                <div className="inline-flex p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-3">
                  <Sun className="w-12 h-12 text-cyan-400 animate-spin-slow" />
                </div>
                <h2 className="text-2xl font-bold">{weatherData.name}</h2>
                <p className="text-4xl font-extrabold mt-1 text-cyan-300">{weatherData.temp}°C</p>
                <p className="text-xs text-slate-400 mt-1">Odczuwalna: {weatherData.feelsLike}°C</p>
              </div>

              <button
                onClick={speakSummary}
                className="relative z-10 mt-6 w-full py-2.5 px-4 bg-slate-900/80 border border-slate-700/50 rounded-xl text-xs text-slate-200 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                {isSpeaking ? 'Zatrzymaj głos' : 'AI Asystent – Odczytaj pogodę'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <Droplets className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-slate-400">Wilgotność</p>
                  <p className="text-sm font-semibold">{weatherData.humidity}%</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <Wind className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-400">Wiatr</p>
                  <p className="text-sm font-semibold">{weatherData.wind} km/h</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <Compass className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-xs text-slate-400">Ciśnienie</p>
                  <p className="text-sm font-semibold">{weatherData.pressure} hPa</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs text-slate-400">Indeks UV (max)</p>
                  <p className="text-sm font-semibold">{weatherData.days[selectedDayIndex]?.uvMax || 'N/D'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" /> Prognoza na 7 dni (Wybierz dzień)
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weatherData.days.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`flex flex-col items-center p-3 rounded-xl min-w-[75px] border text-xs transition-all ${
                      selectedDayIndex === idx 
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-lg' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-medium">{day.date}</span>
                    <Sun className="w-5 h-5 my-1.5 text-cyan-400" />
                    <span className="font-bold text-slate-100">{day.maxTemp}°</span>
                    <span className="text-[10px] text-slate-500">{day.minTemp}°</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Co godzinę ({weatherData.days[selectedDayIndex]?.date})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {weatherData.days[selectedDayIndex]?.hourly.map((hour, hIdx) => (
                  <div key={hIdx} className="flex flex-col items-center bg-slate-955 p-3 rounded-xl min-w-[65px] border border-slate-800 text-xs">
                    <span className="text-slate-400 text-[11px]">{hour.time}</span>
                    <Sun className="w-4 h-4 my-2 text-cyan-400" />
                    <span className="font-semibold text-slate-100">{hour.temp}°C</span>
                    <span className="text-[10px] text-slate-500 mt-1">{hour.wind} km/h</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span>📡</span> Radar Pogodowy (Opady na żywo)
              </h3>
              <p className="text-xs text-slate-400 mb-3">Interaktywna mapa opadów deszczu i chmur na żywo.</p>
              <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <iframe 
                  title="Radar pogodowy"
                  src={`https://www.rainviewer.com/map.html?loc=${weatherData.lat},${weatherData.lon},7&oColor=1&c=1&o=83&v=1&run=1&sm=1&sn=1`}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="w-full max-w-md mt-8 py-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col gap-2">
        <p>© 2026 GeminiWeather 3D. Wszystkie prawa zastrzeżone.</p>
      </footer>
    </div>
  );
}

