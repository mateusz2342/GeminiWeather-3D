import React, { useState, useEffect } from 'react';
import { 
  Sun, Wind, RefreshCw, Volume2, VolumeX, Sparkles, AlertTriangle, 
  MapPin, Droplets, Sunrise, Sunset 
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

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=auto`);
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
      const text = `Aktualna pogoda dla miasta ${weatherData.name}. Temperatura wynosi ${weatherData.temp} stopni.`;
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
      
