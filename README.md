# CalTrack - Österreichischer Kalorie-Tracker mit Barcode-Scanner

Ein moderner Kalorie- und Nährstoff-Tracker mit **QuaggaJS Barcode-Scanner** und **FatSecret API** Integration.

## 🚀 Installation & Start

### Voraussetzungen
- **Node.js** (v14+)
- **npm** oder yarn

### 1. Dependencies installieren
```bash
npm install
```

### 2. Backend starten
```bash
npm start
```

Das Backend läuft dann auf **http://localhost:3000**

### 3. App im Browser öffnen
```
http://localhost:3000
```

## 📱 Features

✅ **Barcode-Scanner** - EAN-13, EAN-8, Code 128, UPC Scanner
✅ **FatSecret Integration** - Österreichische & internationale Produktdatenbank
✅ **Nährstoff-Tracking** - Kalorien, Protein, Kohlenhydrate, Fett
✅ **Tägliches Logging** - Speichert Einträge lokal (localStorage)
✅ **Manueller Eintrag** - Fallback für nicht erkannte Produkte

## 🔧 Konfiguration

### Backend API
Die Frontend App sucht das Backend unter:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

Zu ändern in: `Scan.html` (Zeile ~318)

### FatSecret API Keys
Die API Keys sind im Backend (`server.js`) gespeichert:
```javascript
const CONSUMER_KEY = '9eb7611656d846028cc2700962470d8f';
const CONSUMER_SECRET = '8710a195255345efb35584b2bf08f0d4';
```

⚠️ **WICHTIG**: Diese Keys sind gespeichert und sollten in Production in `.env` Datei verschoben werden!

## 📋 API Endpoints

### 1. Nach Barcode suchen
```
GET /api/food/barcode/:barcode
```

**Beispiel**: `GET /api/food/barcode/4006381039138`

**Response**:
```json
{
  "foods": {
    "food": [
      {
        "food_id": "12345",
        "food_name": "Apfel",
        "food_calories": 52,
        "food_protein": 0.3,
        "food_carbohydrate": 14,
        "food_fat": 0.2
      }
    ]
  }
}
```

### 2. Nach Produktname suchen
```
GET /api/food/search/:query
```

**Beispiel**: `GET /api/food/search/apfel`

### 3. Produktdetails abrufen
```
GET /api/food/:foodId
```

**Beispiel**: `GET /api/food/12345`

## 🏗️ Projekt-Struktur

```
CALTRACK/
├── app.js                 # Kalorie-Tracker App Logik
├── server.js              # Express Backend mit FatSecret API
├── package.json           # Node.js Dependencies
├── Main.html              # Tägliches Tracker Dashboard
├── Scan.html              # Barcode Scanner Interface
├── History.html           # Verlauf/Statistiken
└── README.md              # Diese Datei
```

## 🔐 Security Notes

- ⚠️ **API Keys sind hardcoded** - Für Production in `.env` verschieben!
- CORS ist aktiviert für lokale Entwicklung
- Verwende in Production HTTPS
- Implementiere Rate Limiting

## 📚 Technologie Stack

- **Frontend**: HTML5, TailwindCSS, Lucide Icons, QuaggaJS
- **Backend**: Node.js, Express.js, OAuth 1.0a
- **API**: FatSecret REST API
- **Storage**: Browser localStorage (Frontend)

## 🐛 Troubleshooting

### Backend läuft nicht
```bash
# Logs prüfen
npm start

# Node.js Version prüfen
node --version
```

### Barcode Scanner funktioniert nicht
- 📱 **Camera Permission** - Browser braucht Kamera-Zugriff
- 💡 **Lighting** - Gute Beleuchtung für Scanner nötig
- 📸 **Browser Support** - Chrome/Edge/Firefox empfohlen

### FatSecret API Fehler
- 🔌 Internetverbindung prüfen
- 🔑 API Keys gültig?
- ⏱️ Rate Limit erreicht? (FatSecret: 50 Requests/Day in Free Tier)

## 📞 Support

Fragen? Kontaktiere den Entwickler oder öffne ein Issue im Projekt-Repository.

---

**Made with ❤️ for tracking calories efficiently** 🇦🇹
"# Intakemaxx" 
