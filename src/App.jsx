import React, { useState, useEffect } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Thermometer, Compass, 
  Search, RefreshCw, Volume2, VolumeX, Sparkles, AlertTriangle, 
  MapPin, Eye, Droplets, Sunrise, Sunset
} from 'lucide-react';

export default function App() {
  const [city, setCity] = useState('Warszawa');
  const [searchInput, setSearchInput] = useState('Warszawa');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

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

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`);
      const weatherJson = await weatherRes.json();

      setWeatherData({
        name: `${name}, ${country || ''}`,
        temp: weatherJson.current.temperature_2m,
        feelsLike: weatherJson.current.apparent_temperature,
        humidity: weatherJson.current.relative_humidity_2m,
        wind: weatherJson.current.wind_speed_10m,
        code: weatherJson.current.weather_code,
        sunrise: weatherJson.daily.sunrise[0].split('T')[1],
        sunset: weatherJson.daily.sunset[0].split('T')[1],
      });
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
      const text = `Aktualna pogoda dla miasta ${weatherData.name}. Temperatura wynosi ${weatherData.temp} stopni Celsjusza. Wiatr wieje z prędkością ${weatherData.wind} kilometrów na godzinę.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pl-PL';
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 selection:bg-cyan-500 selection:text-white">
      {/* Nagłówek */}
      <header className="w-full max-w-md flex items-center justify-between py-4 mb-2">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            GeminiWeather 3D
          </h1>
        </div>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      {/* Wyszukiwarka */}
      <form onSubmit={handleSearch} className="w-full max-w-md flex gap-2 mb-6">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Wpisz miasto..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <button 
          type="submit" 
          className="bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
        >
          Szukaj
        </button>
      </form>

      {/* Główny kontener */}
      <main className="w-full max-w-md flex-1 flex flex-col gap-4 pb-6">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
            <p className="text-sm">Pobieranie danych pogodowych...</p>
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
            {/* Główny kafel pogodowy */}
            <div className="relative w-full h-64 rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 to-indigo-950 border border-slate-800 flex flex-col items-center justify-center p-6 shadow-2xl">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              <div className="relative z-10 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-3 shadow-inner">
                  <Sun className="w-12 h-12 text-cyan-400 animate-spin-slow" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{weatherData.name}</h2>
                <p className="text-4xl font-extrabold mt-1 text-cyan-300">{weatherData.temp}°C</p>
                <p className="text-xs text-slate-400 mt-1">Odczuwalna: {weatherData.feelsLike}°C</p>
              </div>

              {/* Przycisk AI Asystent */}
              <button 
                onClick={speakSummary}
                className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-700/50 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 text-cyan-300 hover:bg-slate-800 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isSpeaking ? 'Zatrzymaj głos' : 'AI Asystent'}
              </button>
            </div>

            {/* Kafelki z parametrami */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Wilgotność</p>
                  <p className="text-sm font-semibold">{weatherData.humidity}%</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Wiatr</p>
                  <p className="text-sm font-semibold">{weatherData.wind} km/h</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <Sunrise className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Wschód słońca</p>
                  <p className="text-sm font-semibold">{weatherData.sunrise}</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Sunset className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Zachód słońca</p>
                  <p className="text-sm font-semibold">{weatherData.sunset}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>       <section className="w-full max-w-md mt-8 p-5 bg-slate-900/60 rounded-2xl border border-slate-800/80 text-slate-300 text-sm space-y-3 text-left">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <span>🌐</span> O GeminiWeather 3D
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          GeminiWeather 3D to interaktywna aplikacja pogodowa łącząca precyzyjne dane meteorologiczne w czasie rzeczywistym z analizą sztucznej inteligencji.
        </p>
        <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="font-medium text-slate-200 block">⚡ Szybka analiza</span>
            <span className="text-slate-400">Pomiary temperatury, wiatru i wilgotności.</span>
          </div>
          <div>
            <span className="font-medium text-slate-200 block">🤖 Asystent AI</span>
            <span className="text-slate-400">Rekomendacje dotyczące ubioru i aktywności.</span>
          </div>
        </div>
      </section>
      
  <footer className="w-full max-w-md mt-12 py-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col gap-2">
      <p>© 2026 GeminiWeather 3D. Wszystkie prawa zastrzeżone.</p>
      <div className="flex justify-center gap-4 text-slate-400">
        <a href="#about" className="hover:underline">O aplikacji</a>
        <span>•</span>
        <a href="#privacy" className="hover:underline">Polityka Prywatności</a>
      </div>
    </footer>
    {/* KONIEC WKLEJANIA */}

  </div>
    
    </div>
  );
}
