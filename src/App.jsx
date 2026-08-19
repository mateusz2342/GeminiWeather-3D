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
    { sender: 'bot', text: 'Cześć! Jestem Twoim asystentem pogodowym. Zapytaj mnie o temperaturę, opady, wiatr, UV czy pogode na konkretną godzinę!' }
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
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      let botReply = `W mieście ${weatherData?.name || 'wybranym'} jest obecnie ${weatherData?.temp}°C. Zapytaj mnie o opady, wiatr, UV lub konkretną godzinę!`;
      const query = userMsg.toLowerCase();

      let targetDayIdx = 0;
      if (query.includes('jutro')) targetDayIdx = 1;
      else if (query.includes('pojutrze')) targetDayIdx = 2;

      const hourMatch = query.match(/(\d{1,2})(:00)?/);
      let targetHour = hourMatch ? parseInt(hourMatch[1], 10) : null;

      const selectedDay = weatherData?.days[targetDayIdx] || weatherData?.days[0];
      const selectedHourData = targetHour !== null && selectedDay?.hourly ? selectedDay.hourly.find(h => h.hourNum === targetHour) : null;

      if (query.includes('uv')) {
        const uvVal = selectedHourData ? selectedHourData.uv : selectedDay?.uvMax;
        botReply = `Wskaźnik UV wynosi ${uvVal !== undefined ? uvVal : '--'}. ${uvVal > 5 ? 'Zalecam okulary przeciwsłoneczne i krem z filtrem!' : 'Poziom UV jest bezpieczny.'}`;
      } else if (query.includes('temp') || query.includes('stopni') || query.includes('ciepło') || query.includes('zimno')) {
        if (selectedHourData) {
          botReply = `${targetDayIdx === 1 ? 'Jutro' : 'Dzisiaj'} o godzinie ${targetHour}:00 będzie około ${selectedHourData.temp}°C.`;
        } else if (targetDayIdx === 1) {
          botReply = `Jutro w ciągu dnia temperatura wyniesie od ${selectedDay?.minTemp}°C do ${selectedDay?.maxTemp}°C.`;
        } else {
          botReply = `Obecna temperatura w ${weatherData?.name || 'lokalizacji'} to ${weatherData?.temp}°C. Maksymalna dzisiaj: ${selectedDay?.maxTemp}°C.`;
        }
      } else if (query.includes('deszcz') || query.includes('pada') || query.includes('opad')) {
        const code = selectedHourData ? selectedHourData.code : selectedDay?.code;
        const isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
        const isSnow = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
        if (isRain) botReply = `Tak, ${selectedHourData ? `o ${targetHour}:00` : 'w tym okresie'} przewidywane są opady deszczu. Przyda się parasol!`;
        else if (isSnow) botReply = `Przewidywane są opady śniegu!`;
        else botReply = `Brak opadów deszczu ${selectedHourData ? `o ${targetHour}:00` : 'w tym czasie'}. Powinno być sucho.`;
      } else if (query.includes('wiatr')) {
        const windSpeed = selectedHourData ? selectedHourData.wind : weatherData?.wind;
        botReply = `Prędkość wiatru ${selectedHourData ? `o ${targetHour}:00` : 'obecnie'} wynosi około ${windSpeed || '--'} km/h.`;
      } else if (query.includes('ciśnienie')) {
        const press = selectedHourData ? selectedHourData.pressure : weatherData?.pressure;
        botReply = `Ciśnienie atmosferyczne wynosi ${press ? press.toFixed(1) : '--'} hPa.`;
      } else if (query.includes('ubrać') || query.includes('ubiór')) {
        const t = selectedHourData ? selectedHourData.temp : weatherData?.temp;
        botReply = t < 10 ? 'Jest chłodno – włóż ciepłą kurtkę.' : t < 20 ? 'Temperatura umiarkowana, przyda się bluza lub lekka kurtka.' : 'Jest ciepło, T-shirt wystarczy!';
      } else if (selectedHourData) {
        botReply = `Prognoza dla ${weatherData?.name} na ${selectedDay.date} o godzinie ${targetHour}:00: Temperatura ${selectedHourData.temp}°C, wiatr ${selectedHourData.wind} km/h, ciśnienie ${selectedHourData.pressure.toFixed(1)} hPa.`;
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
    }, 400);
  };

  const currentDay = weatherData?.days[selectedDayIndex];
  const hourlyMid = currentDay?.hourly[12] || currentDay?.hourly[0];

  const activeHumidity = selectedDayIndex === 0 ? weatherData?.humidity : hourlyMid?.humidity;
  const activeWind = selectedDayIndex === 0 ? weatherData?.wind : hourlyMid?.wind;
  const activePressure = selectedDayIndex === 0 ? weatherData?.pressure : hourlyMid?.pressure;
  const activeCode = selectedDayIndex === 0 ? weatherData?.code : currentDay?.code;
  
