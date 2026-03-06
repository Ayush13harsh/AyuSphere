# 🌐 AyuSphere — Emergency Healthcare Platform

<div align="center">

**Real-time emergency health response system with diagnostics, ambulance tracking, and instant SOS alerts.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🚨 **SOS Emergency Alert** | One-tap SOS with 5-second countdown, GPS location tracking, and emergency contact notifications |
| 🚑 **Ambulance Tracking** | Real-time animated map with ambulance movement, route visualization, ETA countdown, and driver info |
| 🩺 **Dr. AyuSphere (Chatbot)** | Intelligent medical assistant with specialist recommendations |
| 🔍 **Symptom Checker** | Symptom analysis engine with condition matching and specialist routing |
| 📊 **Risk Assessment** | BMI-based health risk calculator with lifestyle factor analysis |
| 🪪 **Digital Medical ID** | 3D flip-card emergency health passport with blood type, allergies, and emergency contacts |
| 🏥 **Hospital Finder** | OpenStreetMap-powered nearby hospital search with call and route actions |
| 📍 **Share Location** | Native Web Share / WhatsApp integration for instant location sharing |
| 🌙 **Dark Mode** | System-wide dark theme with localStorage persistence |
| 📈 **Analytics Dashboard** | Health trends visualization with Chart.js |
| 🔔 **Notification System** | Animated emergency notification banners |

---

## 🛠️ Tech Stack

**Frontend:** Next.js 16, React 19, Leaflet Maps, Chart.js, CSS  
**Backend:** FastAPI, Python 3.11, Pydantic v2  
**Database:** MongoDB (Motor async driver)  
**NLP:** Hugging Face Inference API (Mistral-7B)  
**Auth:** JWT (access + refresh tokens), bcrypt  
**Maps:** OpenStreetMap Overpass API  
**SMS:** Twilio

---

## 📁 Project Structure

```
AyuSphere/
├── frontend/                  # Next.js Frontend
│   ├── app/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── AppLayout.js
│   │   │   ├── AmbulanceTracker.js
│   │   │   ├── LeafletMap.js
│   │   │   └── NotificationBanner.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   ├── lib/
│   │   │   └── api.js
│   │   ├── chatbot/page.js
│   │   ├── dashboard/page.js
│   │   ├── hospitals/page.js
│   │   ├── contacts/page.js
│   │   ├── profile/page.js
│   │   ├── risk-assessment/page.js
│   │   ├── analytics/page.js
│   │   ├── medical-id/page.js
│   │   ├── symptom-checker/page.js
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   ├── public/
│   │   └── logo.svg
│   ├── package.json
│   └── next.config.mjs
│
├── backend/                   # FastAPI Backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── chatbot.py
│   │   │   ├── contacts.py
│   │   │   ├── hospitals.py
│   │   │   ├── profile.py
│   │   │   ├── sos.py
│   │   │   └── symptoms.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   └── mongodb.py
│   │   ├── models/
│   │   │   └── models.py
│   │   ├── services/
│   │   │   ├── maps_service.py
│   │   │   └── sms_service.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
│
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **MongoDB** (optional — uses in-memory store if unavailable)

### 1. Clone & Setup Backend

```bash
git clone https://github.com/YOUR_USERNAME/AyuSphere.git
cd AyuSphere/backend

python3 -m venv venv
source venv/bin/activate    # macOS/Linux
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your keys

uvicorn app.main:app --reload --port 8000
```

### 2. Setup Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:3000`

---

## 🌍 Deployment

### Frontend → Vercel

1. Push code to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Root Directory: `frontend`
4. Add env: `NEXT_PUBLIC_API_URL` = your backend URL

### Backend → Render

1. Create Web Service on [render.com](https://render.com)
2. Root Directory: `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example`

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | JWT signing secret |
| `MONGODB_URL` | No | MongoDB URI |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | Twilio sender number |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps key |
| `HF_TOKEN` | No | Hugging Face token |

---

## 📄 License

MIT License

---

<div align="center">
Built by <strong>Ayush</strong>
</div>
