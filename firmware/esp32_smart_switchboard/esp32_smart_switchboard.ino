/**
 * =========================================================================
 * Project: Smart Switchboard - Appliance-Level Energy Monitoring (ESP32)
 * Module:  Dual PZEM-004T V3.0 Ingestion & Wi-Fi HTTP Telemetry
 * =========================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include "config.h"

// =========================================================================
// Hardware PZEM Object Instantiation
// =========================================================================
// PZEM #1 connected via Hardware Serial2
PZEM004Tv30 pzem1(Serial2, PZEM1_RX_PIN, PZEM1_TX_PIN);

// PZEM #2 connected via Hardware Serial1
PZEM004Tv30 pzem2(Serial1, PZEM2_RX_PIN, PZEM2_TX_PIN);

// Data structure to hold parsed electrical metrics
struct PzemReading {
  uint8_t channel;
  float voltage;
  float current;
  float power;
  float energy;
  float frequency;
  float powerFactor;
  bool isValid;
};

// Timing tracking for non-blocking telemetry loop
unsigned long lastTelemetryTime = 0;
unsigned long lastWifiCheckTime = 0;

// =========================================================================
// Function Prototypes
// =========================================================================
void connectToWiFi();
void checkWiFiConnection();
bool readPzemChannel(PZEM004Tv30 &pzem, uint8_t channelNumber, PzemReading &out);
void transmitTelemetry(const PzemReading &r1, const PzemReading &r2);

// =========================================================================
// Setup Function
// =========================================================================
void setup() {
  // Initialize USB Debug Serial Monitor
  Serial.begin(DEBUG_SERIAL_BAUD);
  delay(1000);

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F(" Smart Switchboard ESP32 Telemetry Node Starting "));
  Serial.println(F("=================================================="));
  Serial.printf("Device ID: %s\n", DEVICE_ID);
  Serial.printf("PZEM #1 Pins: RX=GPIO%d (TX on sensor), TX=GPIO%d (RX on sensor)\n", PZEM1_RX_PIN, PZEM1_TX_PIN);
  Serial.printf("PZEM #2 Pins: RX=GPIO%d (TX on sensor), TX=GPIO%d (RX on sensor)\n", PZEM2_RX_PIN, PZEM2_TX_PIN);
  Serial.printf("Telemetry Interval: %d ms\n", TELEMETRY_INTERVAL_MS);
  // Initialize Hardware UARTs for PZEM modules
  Serial1.begin(PZEM_BAUD_RATE, SERIAL_8N1, PZEM2_RX_PIN, PZEM2_TX_PIN);
  Serial2.begin(PZEM_BAUD_RATE, SERIAL_8N1, PZEM1_RX_PIN, PZEM1_TX_PIN);

  // Connect to Local Wi-Fi Network
  connectToWiFi();

  Serial.println(F("[System] Setup complete. Entering telemetry monitoring loop.\n"));
}

// =========================================================================
// Main Loop (Non-blocking)
// =========================================================================
void loop() {
  unsigned long currentMillis = millis();

  // 1. Periodically verify Wi-Fi connectivity (every 10 seconds)
  if (currentMillis - lastWifiCheckTime >= 10000) {
    lastWifiCheckTime = currentMillis;
    checkWiFiConnection();
  }

  // 2. Transmit Telemetry at defined interval (e.g. every 3000 ms)
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = currentMillis;

    // Read both PZEM channels
    PzemReading reading1;
    PzemReading reading2;

    bool r1Ok = readPzemChannel(pzem1, 1, reading1);
    bool r2Ok = readPzemChannel(pzem2, 2, reading2);

    // If at least one channel has valid readings, or simulation fallback is enabled
    if (r1Ok || r2Ok || SIMULATE_IF_PZEM_NAN) {
      transmitTelemetry(reading1, reading2);
    } else {
      Serial.println(F("[Warning] Both PZEM modules returned invalid readings (no AC mains power or wiring issue). Telemetry skipped."));
    }
  }
}

// =========================================================================
// Wi-Fi Connection Helpers
// =========================================================================
void connectToWiFi() {
  Serial.printf("[Wi-Fi] Connecting to SSID: %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttemptTime = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(F("."));
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.printf("[Wi-Fi] Connected successfully! IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[Wi-Fi] Signal Strength (RSSI): %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println();
    Serial.println(F("[Wi-Fi] Initial connection timeout. Will continue retrying in background loop."));
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[Wi-Fi] Connection lost. Attempting auto-reconnect..."));
    WiFi.disconnect();
    WiFi.reconnect();
  }
}

// =========================================================================
// PZEM-004T Channel Reader
// =========================================================================
bool readPzemChannel(PZEM004Tv30 &pzem, uint8_t channelNumber, PzemReading &out) {
  out.channel = channelNumber;
  out.isValid = false;

  // Read electrical parameters from PZEM module
  float v = pzem.voltage();
  float i = pzem.current();
  float p = pzem.power();
  float e = pzem.energy();
  float f = pzem.frequency();
  float pf = pzem.pf();

  // Check if any reading returned NaN (indicates disconnected sensor or unpowered AC line)
  if (isnan(v) || isnan(i) || isnan(p) || isnan(e) || isnan(f) || isnan(pf)) {
    if (SIMULATE_IF_PZEM_NAN) {
      // Fallback values for bench testing without live 230V AC load
      out.voltage = 236.5 + (channelNumber * 1.2);
      out.current = 0.11 + (channelNumber * 0.02);
      out.power = out.voltage * out.current * 0.45;
      out.energy = 0.01;
      out.frequency = 50.0;
      out.powerFactor = 0.44;
      out.isValid = true;
      Serial.printf("[PZEM #%d] [SIMULATION] V=%.1fV, I=%.2fA, P=%.1fW, E=%.2fkWh, F=%.1fHz, PF=%.2f\n",
                    channelNumber, out.voltage, out.current, out.power, out.energy, out.frequency, out.powerFactor);
      return true;
    }

    Serial.printf("[PZEM #%d] Reading error: Sensor not responding or AC voltage missing.\n", channelNumber);
    return false;
  }

  // Assign valid measurements
  out.voltage = v;
  out.current = i;
  out.power = p;
  out.energy = e;
  out.frequency = f;
  out.powerFactor = pf;
  out.isValid = true;

  Serial.printf("[PZEM #%d] Real: V=%.1fV | I=%.2fA | P=%.1fW | E=%.2fkWh | F=%.1fHz | PF=%.2f\n",
                channelNumber, out.voltage, out.current, out.power, out.energy, out.frequency, out.powerFactor);

  return true;
}

// =========================================================================
// HTTP Telemetry Transmitter
// =========================================================================
void transmitTelemetry(const PzemReading &r1, const PzemReading &r2) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[HTTP] Cannot send telemetry: Wi-Fi not connected."));
    return;
  }

  // Construct JSON Document matching backend schema (ArduinoJson 7)
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;

  JsonArray readingsArray = doc["readings"].to<JsonArray>();

  // Add PZEM 1 reading if valid
  if (r1.isValid) {
    JsonObject obj1 = readingsArray.add<JsonObject>();
    obj1["channel"] = 1;
    obj1["voltage"] = serialized(String(r1.voltage, 1));
    obj1["current"] = serialized(String(r1.current, 2));
    obj1["power"] = serialized(String(r1.power, 1));
    obj1["energy"] = serialized(String(r1.energy, 2));
    obj1["frequency"] = serialized(String(r1.frequency, 1));
    obj1["power_factor"] = serialized(String(r1.powerFactor, 2));
  }

  // Add PZEM 2 reading if valid
  if (r2.isValid) {
    JsonObject obj2 = readingsArray.add<JsonObject>();
    obj2["channel"] = 2;
    obj2["voltage"] = serialized(String(r2.voltage, 1));
    obj2["current"] = serialized(String(r2.current, 2));
    obj2["power"] = serialized(String(r2.power, 1));
    obj2["energy"] = serialized(String(r2.energy, 2));
    obj2["frequency"] = serialized(String(r2.frequency, 1));
    obj2["power_factor"] = serialized(String(r2.powerFactor, 2));
  }

  // Serialize JSON to String
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Prepare HTTP POST Request
  HTTPClient http;
  String targetUrl = String("http://") + SERVER_HOST + ":" + String(SERVER_PORT) + TELEMETRY_PATH;

  http.begin(targetUrl);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");

  unsigned long tStart = millis();
  int httpResponseCode = http.POST(jsonPayload);
  unsigned long tDuration = millis() - tStart;

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] POST %s -> Response Code: %d (in %lu ms)\n", targetUrl.c_str(), httpResponseCode, tDuration);
    Serial.printf("[HTTP] Server Response: %s\n\n", response.c_str());
  } else {
    Serial.printf("[HTTP] POST Failed! Error: %s (Code: %d)\n\n", http.errorToString(httpResponseCode).c_str(), httpResponseCode);
  }

  http.end();
}
