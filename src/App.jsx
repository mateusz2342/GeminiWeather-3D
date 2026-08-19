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
  
