
/**
 * Weather Widget Logic (Open-Meteo API)
 */
async function fetchWeather() {
    const widget = document.getElementById('weather-widget');
    if (!widget) return;

    try {
        // Viborg Coordinates
        const lat = 56.453;
        const lon = 9.402;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=Europe%2FBerlin`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.current) throw new Error("No weather data");

        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;
        const isDay = data.current.is_day;

        // Update UI logic to use Animated SVGs
        const getIcon = (code, isDay) => {
            // SVG Templates (Minimalist & Premium)
            const sunSvg = `<svg viewBox="0 0 64 64" class="w-anim-sun"><circle cx="32" cy="32" r="14" fill="#fbbf24"/><path d="M32 10V2 M32 62V54 M10 32H2 M62 32H54 M16.4 16.4L10.8 10.8 M53.2 53.2L47.6 47.6 M16.4 47.6L10.8 53.2 M53.2 10.8L47.6 16.4" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/></svg>`;

            const moonSvg = `<svg viewBox="0 0 64 64" class="w-anim-moon"><path d="M42 22a16 16 0 1 1-16 16 12 12 0 0 0 16-16z" fill="#94a3b8"/></svg>`;

            const cloudSvg = `<svg viewBox="0 0 64 64" class="w-anim-cloud"><path d="M16 40a10 10 0 0 1 10-10 h2 a14 14 0 0 1 27 2 a10 10 0 0 1-1 19 h-26 a12 12 0 0 1-12-12z" fill="#cbd5e1"/></svg>`;

            const rainSvg = `<svg viewBox="0 0 64 64" class="w-anim-rain"><path d="M20 36a10 10 0 0 1 10-10 h2 a14 14 0 0 1 27 2 a10 10 0 0 1-1 19 h-26 a12 12 0 0 1-12-12z" fill="#94a3b8"/><path d="M28 52l-4 8 M38 52l-4 8 M48 52l-4 8" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" class="w-drops"/></svg>`;

            const snowSvg = `<svg viewBox="0 0 64 64" class="w-anim-snow"><path d="M16 40a10 10 0 0 1 10-10 h2 a14 14 0 0 1 27 2 a10 10 0 0 1-1 19 h-26 a12 12 0 0 1-12-12z" fill="#e2e8f0"/><circle cx="28" cy="56" r="2" fill="white" class="w-flake"/><circle cx="38" cy="56" r="2" fill="white" class="w-flake-2"/><circle cx="48" cy="56" r="2" fill="white" class="w-flake"/></svg>`;

            const sunCloudSvg = `<svg viewBox="0 0 64 64" class="w-anim-partly"><circle cx="24" cy="24" r="10" fill="#fbbf24" class="w-sun-bg"/><path d="M20 42a9 9 0 0 1 9-9 h2 a12 12 0 0 1 24 2 a9 9 0 0 1-1 17 h-24 a10 10 0 0 1-10-10z" fill="#cbd5e1" class="w-cloud-fg"/></svg>`;

            // Mapping
            if (code === 0) return isDay ? sunSvg : moonSvg;
            if (code >= 1 && code <= 3) return isDay ? sunCloudSvg : cloudSvg;
            if (code >= 45 && code <= 48) return cloudSvg; // Fog
            if (code >= 51 && code <= 67) return rainSvg; // Rain
            if (code >= 71 && code <= 77) return snowSvg; // Snow
            if (code >= 80 && code <= 82) return rainSvg; // Showers
            if (code >= 95 && code <= 99) return rainSvg; // Storm (reuse rain for now)

            return cloudSvg;
        };

        const iconHtml = getIcon(code, isDay);

        // Update UI
        widget.querySelector('.weather-icon').innerHTML = iconHtml;
        widget.querySelector('.weather-temp').textContent = `${temp}°`;

        // Show Widget
        widget.classList.add('visible');
        widget.title = `Vejret i Viborg: ${temp}°C`;

    } catch (e) {
        console.error("Weather fetch failed:", e);
        // Hide widget on error
        widget.classList.remove('visible');
    }
}
