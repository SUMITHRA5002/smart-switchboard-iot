

````md

# ⚡ Smart Switchboard IoT



## Real-Time Appliance-Level Energy Monitoring and Intelligent Energy Management System



Smart Switchboard IoT is an IoT-enabled energy monitoring system designed to transform a conventional switchboard into an intelligent energy management platform.



The system monitors appliance-level electrical parameters in real time, including voltage, current, power, energy consumption, and estimated electricity cost. The collected data is processed through a backend system and displayed on an interactive web dashboard.



Beyond monitoring, the project includes intelligent analytics such as energy forecasting, budget tracking, appliance behaviour analysis, anomaly detection, and personalized energy-saving recommendations.



---



## 🚀 Key Features



- 📊 Real-time appliance-level energy monitoring

- ⚡ Voltage, current, power, and energy measurement

- 🏠 Monitoring of multiple appliances

- 📈 Interactive real-time dashboard

- 💰 Electricity cost estimation

- 📅 Energy usage analytics

- 🔮 Energy consumption forecasting

- 💳 Monthly energy budget tracking

- 🧠 Appliance behaviour analysis

- ⚠️ Abnormal energy usage detection

- 🤖 Intelligent energy-saving recommendations

- 📥 Downloadable energy reports

- 📡 ESP32-based IoT data collection



---



\## 💡 Project Novelty



Unlike a conventional IoT energy meter that only displays electricity consumption, Smart Switchboard IoT combines:



\*\*IoT Hardware + Cloud/Backend Processing + Data Analytics + Intelligent Energy Management\*\*



The system aims to help users not only understand their energy consumption but also identify unusual appliance behaviour, predict future energy usage, manage electricity budgets, and receive personalized recommendations to reduce energy consumption.



\---



\## 🏗️ System Architecture



```text

Appliances

&#x20;   │

&#x20;   ▼

PZEM-004T Energy Sensors

&#x20;   │

&#x20;   ▼

ESP32 Smart Switchboard

&#x20;   │

&#x20;   ▼

Backend API

&#x20;   │

&#x20;   ├── Real-Time Telemetry Processing

&#x20;   ├── Energy Analytics

&#x20;   ├── Behaviour Analysis

&#x20;   ├── Energy Forecasting

&#x20;   ├── Budget Management

&#x20;   └── Intelligent Recommendations

&#x20;   │

&#x20;   ▼

Web Dashboard

````



\---



\## 🔧 Hardware Components



| Component           | Purpose                     |

| ------------------- | --------------------------- |

| ESP32 DevKit        | Main IoT controller         |

| PZEM-004T V3.0      | Energy measurement          |

| Current Transformer | Current sensing             |

| Modular Switches    | Appliance control interface |

| MCB / Fuse          | Electrical protection       |

| ABS/PVC Enclosure   | Hardware protection         |

| Power Supply        | System power                |



\---



\## 💻 Software Stack



\### Frontend



\* React

\* Vite

\* JavaScript

\* CSS



\### Backend



\* Node.js

\* Express.js



\### Database



\* SQLite



\### IoT Firmware



\* Arduino Framework

\* ESP32



\---



\## 📂 Project Structure



```text

smart-switchboard/

│

├── backend/

│   ├── src/

│   │   ├── controllers/

│   │   ├── routes/

│   │   ├── services/

│   │   ├── middleware/

│   │   ├── db/

│   │   └── server.js

│   └── package.json

│

├── firmware/

│   └── esp32\_smart\_switchboard/

│

├── frontend/

│   ├── src/

│   │   ├── components/

│   │   ├── services/

│   │   ├── App.jsx

│   │   └── main.jsx

│   └── package.json

│

└── README.md

```



\---



\## ⚙️ Installation and Setup



\### 1. Clone the Repository



```bash

git clone https://github.com/SUMITHRA5002/smart-switchboard-iot.git

cd smart-switchboard-iot

```



\### 2. Backend Setup



```bash

cd backend

npm install

node src/server.js

```



The backend server runs on:



```text

http://localhost:5000

```



\### 3. Frontend Setup



Open another terminal:



```bash

cd frontend

npm install

npm run dev

```



\---



\## 📡 Data Flow



1\. PZEM-004T sensors measure electrical parameters.

2\. ESP32 collects appliance-level energy data.

3\. ESP32 sends telemetry data to the backend API.

4\. The backend validates and stores the data.

5\. Analytics services process energy consumption patterns.

6\. The system generates forecasts, budget estimates, and recommendations.

7\. The frontend dashboard displays real-time and analytical insights.



\---



\## 🔮 Future Enhancements



\* AI-based appliance health prediction

\* Advanced machine learning energy forecasting

\* Automatic appliance control

\* Mobile application

\* Full-house appliance monitoring

\* Cloud database integration

\* Voice assistant integration

\* Smart scheduling based on energy usage patterns



\---



\## 🎯 Project Goal



The goal of this project is to move beyond simple electricity monitoring and create an intelligent energy management system capable of understanding energy usage patterns and helping users make smarter energy decisions.



\---



\## 👩‍💻 Developed By



\*\*Sumithra T\*\*



Computer Science Engineering



\---



⭐ If you found this project interesting, consider giving the repository a star!



````

