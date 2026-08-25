#ifndef CONFIG_H
#define CONFIG_H

// =========================================================================
// 1. Device Identification
// =========================================================================
#define DEVICE_ID "esp32_switchboard_01"

// =========================================================================
// 2. Wi-Fi Configuration
// =========================================================================
#define WIFI_SSID     "x"
#define WIFI_PASSWORD "mugil2025"

// Wi-Fi Connection Timeout (milliseconds)
#define WIFI_TIMEOUT_MS 15000

// =========================================================================
// 3. Backend API Server Configuration
// =========================================================================
// Set this to your computer's local LAN IP address where the Node.js backend runs
#define SERVER_HOST     "10.37.195.37"
#define SERVER_PORT     5000
#define TELEMETRY_PATH  "/api/telemetry"

// Telemetry Transmission Interval (milliseconds) - Recommended: 2000 to 5000 ms
#define TELEMETRY_INTERVAL_MS 3000

// HTTP Request Timeout (milliseconds)
#define HTTP_TIMEOUT_MS 4000

// =========================================================================
// 4. Hardware UART & Pin Assignments (DO NOT MODIFY)
// =========================================================================
// PZEM #1: Serial2 (UART2)
// ESP32 RX2 (GPIO 26) connects to PZEM1 TX
// ESP32 TX2 (GPIO 27) connects to PZEM1 RX
#define PZEM1_RX_PIN 26
#define PZEM1_TX_PIN 27

// PZEM #2: Serial1 (UART1)
// ESP32 RX1 (GPIO 16) connects to PZEM2 TX
// ESP32 TX1 (GPIO 17) connects to PZEM2 RX
#define PZEM2_RX_PIN 16
#define PZEM2_TX_PIN 17

#define PZEM_BAUD_RATE 9600

// =========================================================================
// 5. Diagnostics & Debugging
// =========================================================================
#define DEBUG_SERIAL_BAUD 115200

// Set to true only if testing the firmware logic when AC mains are turned off
#define SIMULATE_IF_PZEM_NAN false

#endif // CONFIG_H
