import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import L from "leaflet";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

function App() {
  useEffect(() => {
    const openweatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    const geonamesUsername = import.meta.env.VITE_GEONAMES_USERNAME;

    // すでに初期化されている場合は削除
    const existingMap = L.DomUtil.get("map");
    if (existingMap._leaflet_id) {
      existingMap._leaflet_id = null;
      return;
    }
    const map = L.map("map", {
      center: [36.0, 138.0], // 日本を中心
      zoom: 3,
      minZoom: 2, // ズームアウト制限
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    let marker;
    let currencyMap = {};
    let languageMap = {};

    /**
     * 通貨と言語は日本語で取得できなかったのでjsonファイルを読み込む
     */
    async function loadJsonMaps() {
      const currencyRes = await fetch("/assets/currency_ja.json");
      if (!currencyRes.ok) {
        throw new Error(`HTTP error! status: ${currencyRes.status}`);
      }
      currencyMap = await currencyRes.json();

      const languageRes = await fetch("/assets/language_ja.json");
      if (!languageRes.ok) {
        throw new Error(`HTTP error! status: ${languageRes.status}`);
      }
      languageMap = await languageRes.json();
    }

    /**
     * 地図を1回転させるごとに座標が360度前後するため、各種情報が取得できるように-180〜180の範囲に丸める（360度周期の世界地図対応）
     *
     * @param {*} lng 経度
     * @returns 丸められた経度
     */
    function normalizeLng(lng) {
      return ((((lng + 180) % 360) + 360) % 360) - 180;
    }

    /**
     * 各種情報を取得中状態にする
     */
    function init() {
      document.getElementById("lat").textContent = "取得中...";
      document.getElementById("lng").textContent = "取得中...";
      document.getElementById("country").textContent = "取得中...";
      document.getElementById("region").textContent = "取得中...";
      document.getElementById("currency").textContent = "取得中...";
      document.getElementById("language").textContent = "取得中...";
      document.getElementById("flag").textContent = "取得中...";
      document.getElementById("weather").textContent = "取得中...";
      document.getElementById("time").textContent = "取得中...";
    }

    /**
     * 国に関する情報を取得・設定する
     *
     * @param {*} lat 緯度
     * @param {*} lng 経度
     */
    async function setLocationInfo(lat, lng) {
      try {
        const locationDetails = await getLocationDetails(lat, lng);
        if (!locationDetails || !locationDetails.countryCode)
          throw new Error("地域情報取得失敗");

        const countryInfo = await fetchCountryInfo(locationDetails.countryCode);
        if (!countryInfo) throw new Error("国情報取得失敗");

        // 通貨取得
        const currencyCode = Object.keys(countryInfo.currencies)[0];
        const symbol =
          `(${countryInfo.currencies[currencyCode]["symbol"]})` || "";
        const currency = `${
          currencyMap[currencyCode] || currencyCode
        }${symbol}`;

        // 言語取得
        const langCode = Object.values(countryInfo.languages)[0];
        const language = languageMap[langCode] || langCode;

        document.getElementById("country").textContent =
          locationDetails.countryName;
        document.getElementById("region").textContent = locationDetails.region;
        document.getElementById("currency").textContent = currency;
        document.getElementById("language").textContent = language;
        document.getElementById(
          "flag"
        ).innerHTML = `<img src="${countryInfo.flags.png}" alt="国旗" width="50">`;
      } catch (error) {
        document.getElementById("country").textContent = "取得失敗";
        document.getElementById("region").textContent = "-";
        document.getElementById("currency").textContent = "-";
        document.getElementById("language").textContent = "-";
        document.getElementById("flag").textContent = "-";
        console.error(error);
      }
    }

    /**
     * 地域情報を取得する
     *
     * @param {*} lat 緯度
     * @param {*} lng 経度
     * @returns 地域情報(ISOコード・国名・地域名)
     */
    async function getLocationDetails(lat, lng) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "various-map-app" },
      });
      const data = await res.json();
      const address = data.address;

      return {
        countryCode: address.country_code
          ? address.country_code.toUpperCase()
          : null, // ISOコード（例：JP, USなど）
        countryName: address.country ? address.country : null, // 国名
        region:
          address.state ||
          address.city ||
          address.province ||
          address.county ||
          null, // 地域名
      };
    }

    /**
     * 国に関する情報を取得する
     *
     * @param {*} countryCode ISOコード
     * @returns　国に関する情報
     */
    async function fetchCountryInfo(countryCode) {
      const url = `https://restcountries.com/v3.1/alpha/${countryCode}`;
      const res = await fetch(url);
      const data = await res.json();
      return data[0]; // 配列の1番目に対象国情報
    }

    /**
     * お天気情報を取得・設定する
     *
     * @param {*} lat 緯度
     * @param {*} lng 経度
     */
    async function setWeather(lat, lng) {
      try {
        const weather = await fetchWeather(lat, lng);
        if (!weather) throw new Error("天気情報取得失敗");

        const description = weather.weather[0].description;
        const temp = weather.main.temp;
        document.getElementById(
          "weather"
        ).textContent = `${description}（${temp}℃）`;
      } catch (error) {
        document.getElementById("weather").textContent = "取得失敗";
        console.error(error);
      }
    }

    /**
     * お天気情報を取得する
     *
     * @param {*} lat 緯度
     * @param {*} lng 経度
     * @returns お天気情報
     */
    const fetchWeather = async function (lat, lng) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${openweatherApiKey}&units=metric&lang=ja`;
      const res = await fetch(url);
      return await res.json();
    };

    /**
     * 現在時刻を取得・設定する
     *
     * @param {*} lat 緯度
     * @param {*} lng　経度
     */
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

    /**
     * 時刻情報を取得する
     *
     * @param {*} lat 緯度
     * @param {*} lng 経度
     * @returns 時刻情報
     */
    async function fetchCurrentTime(lat, lng) {
      const url = `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lng}&username=${geonamesUsername}`;
      return await fetch(url);
    }

    loadJsonMaps();

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
  }, []);

  return (
    <div id="container">
      <div id="map"></div>
      <div id="info-panel">
        <h2>🌍 選択地点の情報</h2>
        <div>
          <span className="info-title">緯度:</span>
          <span id="lat" className="info-value">
            -
          </span>
        </div>
        <div>
          <span className="info-title">経度:</span>
          <span id="lng" className="info-value">
            -
          </span>
        </div>
        <div>
          <span className="info-title">国:</span>
          <span id="country" className="info-value">
            -
          </span>
        </div>
        <div>
          <span className="info-title">地域:</span>
          <span id="region" className="info-value">
            -
          </span>
        </div>
        <div>
          <span className="info-title">通貨:</span>
          <span id="currency" className="info-value">
            -
          </span>
        </div>
        <div>
          <span className="info-title">言語:</span>
          <span id="language" className="info-value">
            -
          </span>
        </div>
        <div>
          <span className="info-title">国旗:</span>{" "}
          <span id="flag" className="info-value">
            -
          </span>
        </div>
        <div>
          <span className="info-title">天気:</span>
          <span id="weather" className="info-value">
            -
          </span>
        </div>
        <div>
          <span className="info-title">現地時刻:</span>
          <span id="time" className="info-value">
            -
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
