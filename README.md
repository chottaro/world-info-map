# 世界の天気・国情報マップ

## 📖 概要
このアプリは、世界中の任意の場所をクリックすることで、以下の情報を表示するWeb地図アプリです。

- 国名
- 地域名（都道府県・州など）
- 通貨
- 言語
- 国旗
- 天気
- 現地時刻


地図上の国や地域を可視化し、天気や言語など多角的な情報を取得できるインタラクティブなツールです。

## ▶️ デモ
https://chottaro.github.io/world-info-map

## 🛠️ 使用技術
| 概要  | API |
| ------------- | ------------- |
| 地図ライブラリ  | [Leafletjs](https://leafletjs.com/)  |
| 地図データ  | [OpenStreetMap](https://www.openstreetmap.org/)  |
| 地域情報(ISOコード・国名・地域名)  | [Nominatim](https://nominatim.org/)  |
| 国情報(通貨・言語・国旗)  | [REST Countries](https://restcountries.com/)  |
| 天気情報  | [OpenWeather](https://openweathermap.org/)  |
| 日時情報  | [GeoNames](https://www.geonames.org/)  |


## 🚀 機能
- 地図上をクリックして以下の情報を取得します。
  - 緯度
  - 経度
  - 天気
  - 国
  - 地域
  - 通貨
  - 言語
  - 国旗
  - 現在時刻
- 海や南極は国の情報や現在時刻は取得できません。

## ⚙️ はじめに
### 1. リポジトリをクローンする
```
git clone https://github.com/chottaro/world-info-map.git
```

### 2. アカウント登録する
本アプリを動かすためには、[OpenWeather](https://openweathermap.org/)と[GeoNames](https://www.geonames.org/)にユーザー登録する必要があります。\
どちらも無料で利用できます。

### 3. 設定ファイルを準備する
以下のように `script/config.js` を作成します。
```
const CONFIG = {
  OPENWEATHER_API_KEY: "OpenWeatherのAPIキー",
  GEONAMES_USERNAME: "GeoNamesのユーザー名",
};
```
※ `.gitignore` により `config.js` はリポジトリに含まれません。

### 📘 利用方法
```
cd world-info-map
docker-compose up --build
```
起動後、ブラウザで http://localhost:8080 にアクセス。

### 📂 プロジェクト構成
```
├─.vscode                   # VS Codeの設定フォルダ
├─nginx                     # nginxのフォルダ
└─public
    │  index.html            # メインの画面
    │
    ├─assets
    │      currency_ja.json  # 通貨の日本語表記用JSonファイル
    │      language_ja.json  # 言語の日本語表記用JSonファイル
    │
    ├─css
    │      index.css
    │
    └─script
            config.js         # APIキーなど設定用のJS
            index.js          # メインロジック用のJS
```

## 🔐 ライセンス
MIT License
