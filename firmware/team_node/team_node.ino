/*
 * SkyBridge Team Node: ESP32 + SX1278 (LoRa) + Wi-Fi
 *
 * The same sketch runs on Team A and Team B. Change the CONFIG block for each node.
 *
 * Libraries (Arduino Library Manager):
 *   - "LoRa" by Sandeep Mistry
 *   - "ArduinoJson" by Benoit Blanchon (v7)
 *
 * Flow:
 *   Serial line typed  -> POST /messages/send        (backend stores it: pending)
 *                      -> LoRa "MSG|<id>|<to>|<text>" broadcast to the drone relay
 *                      -> POST /messages/<id>/status (sent, or failed on LoRa error)
 *   Receiving node hears a packet addressed to itself -> POST /messages/receive {ackIds:[id]} -> delivered
 *   Every 15 s the node also pulls its inbox (catches anything missed over LoRa).
 *
 * Wiring (ESP32 VSPI -> SX1278): SCK 18, MISO 19, MOSI 23, NSS 5, RST 14, DIO0 26, 3V3, GND.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>

// ---------------- CONFIG (per node) ----------------
const char* WIFI_SSID      = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* API_BASE       = "https://your-backend.onrender.com/api";
const char* DEVICE_ID      = "TEAM-A-XXXXXX";      // from scripts/register-device.js
const char* DEVICE_TOKEN   = "PASTE_64_HEX_TOKEN"; // shown once at registration
const char* TARGET_DEVICE  = "TEAM-B-XXXXXX";      // the other team's device ID
const long  LORA_FREQUENCY = 433E6;                // use the band you are licensed for

const int LORA_SS   = 5;
const int LORA_RST  = 14;
const int LORA_DIO0 = 26;

const unsigned long HEARTBEAT_MS = 15000;
const unsigned long INBOX_MS     = 15000;
const size_t MAX_BODY = 240;
// ---------------------------------------------------

unsigned long lastHeartbeat = 0;
unsigned long lastInbox = 0;
int   lastRssi = 0;
float lastSnr = 0;
bool  haveLoRaStats = false;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("WiFi connecting");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) {
    delay(250);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " failed (will retry)");
}

// POST JSON with the device token. Returns true on HTTP 2xx.
bool apiPost(const String& path, const String& json, String& response) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure(); // prototype only: pin your server's CA certificate before field use

  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(client, String(API_BASE) + path)) return false;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);

  int code = http.POST(json);
  response = http.getString();
  http.end();

  if (code < 200 || code >= 300) {
    Serial.printf("[API] %s -> %d %s\n", path.c_str(), code, response.c_str());
    return false;
  }
  return true;
}

void sendHeartbeat() {
  JsonDocument doc;
  if (haveLoRaStats) {
    doc["rssi"] = lastRssi;
    doc["snr"] = lastSnr;
  }
  doc["firmware"] = "team-node-1.0";

  String body, res;
  serializeJson(doc, body);
  Serial.println(apiPost("/devices/heartbeat", body, res) ? "[HB] ok" : "[HB] failed");
}

void ackMessage(const String& id) {
  String body = String("{\"ackIds\":[\"") + id + "\"]}";
  String res;
  apiPost("/messages/receive", body, res);
}

// Pull inbox from the backend, print each message, then acknowledge it.
void pollInbox() {
  String res;
  if (!apiPost("/messages/receive", "{}", res)) return;

  JsonDocument doc;
  if (deserializeJson(doc, res)) return;

  for (JsonObject m : doc["data"].as<JsonArray>()) {
    const char* id = m["id"];
    const char* body = m["body"];
    const char* from = m["from"];
    if (!id || !body) continue;
    Serial.printf("[INBOX from %s] %s\n", from ? from : "?", body);
    ackMessage(String(id));
  }
}

// Receive LoRa packets from the drone relay. Packets not addressed to this node are ignored.
void readLoRa() {
  int size = LoRa.parsePacket();
  if (size == 0) return;

  String packet;
  while (LoRa.available()) packet += (char)LoRa.read();

  lastRssi = LoRa.packetRssi();
  lastSnr = LoRa.packetSnr();
  haveLoRaStats = true;

  // Format: MSG|<messageId>|<toDeviceId>|<text>
  if (!packet.startsWith("MSG|")) return;
  int p2 = packet.indexOf('|', 4);
  if (p2 < 0) return;
  int p3 = packet.indexOf('|', p2 + 1);
  if (p3 < 0) return;

  String id = packet.substring(4, p2);
  String to = packet.substring(p2 + 1, p3);
  String text = packet.substring(p3 + 1);

  if (to != DEVICE_ID) return;

  Serial.printf("[LoRa %d dBm] %s\n", lastRssi, text.c_str());
  ackMessage(id);
}

// Serial input: create the message in the backend, then transmit it over LoRa.
void handleSerial() {
  if (!Serial.available()) return;

  String text = Serial.readStringUntil('\n');
  text.trim();
  if (text.length() == 0) return;
  if (text.length() > MAX_BODY) {
    Serial.println("Message too long (max 240 characters)");
    return;
  }

  JsonDocument req;
  req["to"] = TARGET_DEVICE;
  req["body"] = text;
  String reqBody, res;
  serializeJson(req, reqBody);

  if (!apiPost("/messages/send", reqBody, res)) {
    Serial.println("Backend unreachable: message NOT created. This node needs internet access.");
    return;
  }

  JsonDocument r;
  if (deserializeJson(r, res)) {
    Serial.println("Bad API response");
    return;
  }
  String id = r["data"]["id"].as<String>();
  if (id.length() != 24) {
    Serial.println("No message id returned");
    return;
  }

  String packet = "MSG|" + id + "|" + TARGET_DEVICE + "|" + text;
  LoRa.beginPacket();
  LoRa.print(packet);
  bool ok = LoRa.endPacket() == 1;

  String statusBody = ok
      ? "{\"status\":\"sent\"}"
      : "{\"status\":\"failed\",\"reason\":\"LoRa transmit error\"}";
  apiPost("/messages/" + id + "/status", statusBody, res);

  Serial.println(ok ? "[TX] sent over LoRa" : "[TX] LoRa transmit failed");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\nSkyBridge Team Node starting");

  connectWiFi();

  SPI.begin(18, 19, 23, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("LoRa init FAILED. Check wiring and frequency.");
    while (true) delay(1000);
  }
  Serial.println("LoRa ready. Type a message and press Enter.");
}

void loop() {
  connectWiFi();

  unsigned long now = millis();
  if (now - lastHeartbeat >= HEARTBEAT_MS) {
    lastHeartbeat = now;
    sendHeartbeat();
  }
  if (now - lastInbox >= INBOX_MS) {
    lastInbox = now;
    pollInbox();
  }

  readLoRa();
  handleSerial();
}
