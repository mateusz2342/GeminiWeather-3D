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
  
