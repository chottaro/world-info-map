document.addEventListener("DOMContentLoaded", async function () {
  const OPENWEATHER_API_KEY = CONFIG.OPENWEATHER_API_KEY;
  const GEONAMES_USERNAME = CONFIG.GEONAMES_USERNAME;

  const map = L.map("map", {
    worldCopyJump: false,
    center: [35.0, 135.0], // 日本を中心
    zoom: 3,
    minZoom: 2, // ズームアウト制限
    maxBounds: [
      [-85, -180], // 南西端（緯度, 経度）
      [85, 180], // 北東端（緯度, 経度）
    ],
    maxBoundsViscosity: 1.0, // 1.0で「境界を越えようとすると跳ね返る」
  }).setView([36.2048, 138.2529], 3); // 日本中心（緯度: 北緯36度, 経度: 東経138度）

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  let marker;
  let currencyMap = {};
  let languageMap = {};

  await loadJsonMaps();

  map.on("click", async function (e) {
    const lat = e.latlng.lat;
    const lng = normalizeLng(e.latlng.lng);
    if (marker) {
      marker.setLatLng(e.latlng);
    } else {
      marker = L.marker(e.latlng).addTo(map);
    }

    // 初期化
    init();

    // 緯度・経度
    document.getElementById("lat").textContent = lat.toFixed(4);
    document.getElementById("lng").textContent = lng.toFixed(4);

    // 国に関する情報を取得・設定する
    await setLocationInfo(lat, lng);

    // お天気情報を取得・設定する
    await setWeather(lat, lng);

    // 現在時刻を取得・設定する
    await setCurrentTime(lat, lng);
  });

  async function loadJsonMaps() {
    const currencyRes = await fetch("../assets/currency_ja.json");
    currencyMap = await currencyRes.json();

    const languageRes = await fetch("../assets/language_ja.json");
    languageMap = await languageRes.json();
  }

  function normalizeLng(lng) {
    // -180〜180の範囲に丸める（360度周期の世界地図対応）
    return ((((lng + 180) % 360) + 360) % 360) - 180;
  }

  function init() {
    document.getElementById("lat").textContent = "取得中...";
    document.getElementById("lng").textContent = "取得中...";
    document.getElementById("weather").textContent = "取得中...";
    document.getElementById("country").textContent = "取得中...";
    document.getElementById("region").textContent = "取得中...";
    document.getElementById("currency").textContent = "取得中...";
    document.getElementById("language").textContent = "取得中...";
    document.getElementById("flag").textContent = "取得中...";
    document.getElementById("time").textContent = "取得中...";
  }

  // 国に関する情報を取得する
  async function setLocationInfo(lat, lng) {
    try {
      const locationDetails = await getLocationDetails(lat, lng);
      if (!locationDetails || !locationDetails.countryCode) throw new Error("地域情報取得失敗");

      const countryInfo = await fetchCountryInfo(locationDetails.countryCode);
      if (!countryInfo) throw new Error("国情報取得失敗");

      // 通貨と通貨名（日本語）取得
      const currencyCode = Object.keys(countryInfo.currencies)[0];
      const symbol = `(${countryInfo.currencies[currencyCode]["symbol"]})` || "";
      const currency = `${currencyMap[currencyCode] || currencyCode}${symbol}`;

      // 言語と日本語名取得
      const langCode = Object.values(countryInfo.languages)[0];
      const language = languageMap[langCode] || langCode;

      document.getElementById("country").textContent = locationDetails.countryName;
      document.getElementById("region").textContent = locationDetails.region;
      document.getElementById("currency").textContent = currency;
      document.getElementById("language").textContent = language;
      document.getElementById("flag").innerHTML = `<img src="${countryInfo.flags.png}" alt="国旗" width="50">`;
    } catch (error) {
      document.getElementById("country").textContent = "取得失敗";
      document.getElementById("region").textContent = "-";
      document.getElementById("currency").textContent = "-";
      document.getElementById("language").textContent = "-";
      document.getElementById("flag").textContent = "-";
      console.error(error);
    }
  }

  async function getLocationDetails(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { "User-Agent": "various-map-app" } });
    const data = await res.json();
    const address = data.address;

    return {
      countryCode: address.country_code ? address.country_code.toUpperCase() : null, // ISOコード（例：JP, USなど）
      countryName: address.country ? address.country : null, // 国名
      region: address.state || address.province || address.county || null, // 都道府県、または郡レベル
    };
  }

  async function fetchCountryInfo(countryCode) {
    const url = `https://restcountries.com/v3.1/alpha/${countryCode}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0]; // 配列の1番目に対象国情報
  }

  async function setWeather(lat, lng) {
    try {
      const weather = await fetchWeather(lat, lng);
      if (!weather) throw new Error("天気情報取得失敗");

      const description = weather.weather[0].description;
      const temp = weather.main.temp;
      document.getElementById("weather").textContent = `${description}（${temp}℃）`;
    } catch (error) {
      document.getElementById("weather").textContent = "取得失敗";
      console.error(error);
    }
  }

  async function fetchWeather(lat, lng) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ja`;
    const res = await fetch(url);
    return await res.json();
  }

  // 現地時刻の取得と表示
  async function setCurrentTime(lat, lng) {
    try {
      const res = await fetchCurrentTime(lat, lng);
      if (!res.ok) throw new Error("時刻取得エラー");
      const data = await res.json();
      if (!data.time) throw new Error("時刻取得失敗");

      const localTime = new Date(data.time).toLocaleString();
      document.getElementById("time").textContent = localTime;
    } catch (error) {
      document.getElementById("time").textContent = "取得失敗";
      console.error(error);
    }
  }

  async function fetchCurrentTime(lat, lng) {
    const url = `http://api.geonames.org/timezoneJSON?lat=${lat}&lng=${lng}&username=${GEONAMES_USERNAME}`;
    return await fetch(url);
  }

  setTimeout(() => {
    // レンダリング直後にサイズを再認識させる
    map.invalidateSize();
  }, 500);
});
