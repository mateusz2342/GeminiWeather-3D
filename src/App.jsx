import React, { useState, useEffect } from 'react';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind,
  Droplets, Compass, ShieldAlert, Sparkles, RefreshCw, Send, Bot
} from 'lucide-react';

export default function App() {
  const [city, setCity] = useState('Warszawa');
  const [searchInput, setSearchInput] = useState('Warszawa');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Cześć! Jestem Twoim asystentem pogodowym. Zapytaj mnie o temperaturę, deszcz, UV, wiatr czy pogodę na wybraną godzinę (np. "Jaka pogoda jutro o 18:00?")!' }
  ]);

  const getWeatherIcon = (code) => {
    if (code === 0) return <Sun className="w-8 h-8 text-amber-400 mx-auto" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-8 h-8 text-slate-300 mx-auto" />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className="w-8 h-8 text-blue-400 mx-auto" />;
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow className="w-8 h-8 text-cyan-200 mx-auto" />;
    if (code >= 95) return <CloudLightning className="w-8 h-8 text-purple-400 mx-auto" />;
    return <Sun className="w-8 h-8 text-amber-400 mx-auto" />;
  };

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

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`);
      const weatherJson = await weatherRes.json();

      const days = weatherJson.daily.time.map((dateStr, idx) => {
        const d = new Date(dateStr);
        const dayName = idx === 0 ? 'Dzisiaj' : d.toLocaleDateString('pl-PL', { weekday: 'short' });

        const startHourIdx = idx * 24;
        const hourlyForDay = [];
        for (let h = 0; h < 24; h++) {
          const globalIdx = startHourIdx + h;
          if (weatherJson.hourly && weatherJson.hourly.time[globalIdx]) {
            hourlyForDay.push({
              time: `${h}:00`,
              hourNum: h,
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
          uvMax: weatherJson.daily.uv_index_max ? weatherJson.daily.uv_index_max[idx] : 0,
          hourly: hourlyForDay
        };
      });

      setWeatherData({
        name: `${name}, ${country || ''}`,
        temp: weatherJson.current.temperature_2m,
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

  const handleChatSubmit = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    const newMessages = [...chatMessages, { sender: 'user', text }];
    setChatMessages(newMessages);
    setChatInput('');

    setTimeout(() => {
      const q = text.toLowerCase();
      let reply = `Dla lokalizacji ${weatherData?.name || 'wybranego miasta'} obecna temperatura to ${weatherData?.temp}°C. Zapytaj np. o wiatr, UV lub deszcz!`;

      let targetDayIdx = 0;
      if (q.includes('jutro')) targetDayIdx = 1;
      if (q.includes('pojutrze')) targetDayIdx = 2;

      // Niezawodne parsowanie godziny z tekstu
      let targetHour = null;
      
      // 1. Szukaj pełnego formatu godzina:minuta lub godzina.minuta (np. 18:00, 18.00, 08:00)
      const timeMatch = q.match(/(\d{1,2})[:.]\d{2}/);
      if (timeMatch) {
        const parsed = parseInt(timeMatch[1], 10);
        if (parsed >= 0 && parsed <= 23) {
          targetHour = parsed;
        }
      }

      // 2. Jeśli nie znalazło formatu z dwukropkiem, szukaj po "o 18", "18", itp.
      if (targetHour === null) {
        const numberMatches = q.match(/\d+/g);
        if (numberMatches) {
          for (let numStr of numberMatches) {
            const num = parseInt(numStr, 10);
            if (num >= 0 && num <= 23) {
              targetHour = num;
              break;
            }
          }
        }
      }

      const selectedDay = weatherData?.days[targetDayIdx] || weatherData?.days[0];
      const hourObj = (targetHour !== null && targetHour >= 0 && targetHour < 24 && selectedDay?.hourly) 
        ? selectedDay.hourly[targetHour] 
        : null;

      const dayLabel = targetDayIdx === 1 ? 'Jutro' : targetDayIdx === 2 ? 'Pojutrze' : 'Dzisiaj';

      if (q.includes('uv')) {
        const val = hourObj ? hourObj.uv : selectedDay?.uvMax;
        reply = `Wskaźnik UV ${hourObj ? `${dayLabel.toLowerCase()} o ${targetHour}:00` : `${dayLabel.toLowerCase()}`} wynosi ${val !== undefined ? val : '--'}. ${val > 5 ? 'Pamiętaj o kremie z filtrem!' : 'Poziom UV jest bezpieczny.'}`;
      } else if (q.includes('deszcz') || q.includes('pada') || q.includes('opad') || q.includes('parasol')) {
        const code = hourObj ? hourObj.code : selectedDay?.code;
        const isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
        const isSnow = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
        if (isRain) reply = `Tak, ${hourObj ? `${dayLabel.toLowerCase()} o ${targetHour}:00` : `w dzień: ${dayLabel.toLowerCase()}`} spodziewany jest deszcz. Zabierz parasol!`;
        else if (isSnow) reply = `Spodziewane są opady śniegu.`;
        else reply = `Brak opadów deszczu ${hourObj ? `${dayLabel.toLowerCase()} o ${targetHour}:00` : `w dzień: ${dayLabel.toLowerCase()}`}.`;
      } else if (q.includes('temp') || q.includes('stopni') || q.includes('ciepło') || q.includes('zimno') || q.includes('pogoda')) {
        if (hourObj) {
          reply = `${dayLabel} o ${targetHour}:00 będzie około ${hourObj.temp}°C.`;
        } else if (targetDayIdx > 0) {
          reply = `${dayLabel} temperatura wyniesie od ${selectedDay?.minTemp}°C do ${selectedDay?.maxTemp}°C.`;
        } else {
          reply = `Obecnie jest ${weatherData?.temp}°C. Maksymalna temperatura dzisiaj to ${selectedDay?.maxTemp}°C.`;
        }
      } else if (q.includes('wiatr')) {
        const w = hourObj ? hourObj.wind : weatherData?.wind;
        reply = `Prędkość wiatru ${hourObj ? `${dayLabel.toLowerCase()} o ${targetHour}:00` : ''} wynosi około ${w || '--'} km/h.`;
      } else if (q.includes('ciśnienie')) {
        const p = hourObj ? hourObj.pressure : weatherData?.pressure;
        reply = `Ciśnienie atmosferyczne wynosi ${p ? p.toFixed(1) : '--'} hPa.`;
      } else if (q.includes('ubrać') || q.includes('ubiór')) {
        const tempVal = hourObj ? hourObj.temp : weatherData?.temp;
        reply = tempVal < 10 ? 'Ubierz się ciepło (kurtka, czapka).' : tempVal < 20 ? 'Wystarczy bluza lub lekka kurtka.' : 'Jest ciepło, T-shirt wystarczy!';
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 300);
  };

  const currentDay = weatherData?.days[selectedDayIndex];
  const hourlyMid = currentDay?.hourly[12] || currentDay?.hourly[0];

  const activeHumidity = selectedDayIndex === 0 ? weatherData?.humidity : hourlyMid?.humidity;
  const activeWind = selectedDayIndex === 0 ? weatherData?.wind : hourlyMid?.wind;
  const activePressure = selectedDayIndex === 0 ? weatherData?.pressure : hourlyMid?.pressure;
  const activeCode = selectedDayIndex === 0 ? weatherData?.code : currentDay?.code;
  
