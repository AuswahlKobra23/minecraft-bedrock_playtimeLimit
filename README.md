# Playtime Limit — Minecraft Bedrock Addon

🇬🇧 [English version](README_en.md)

> NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

Begrenze die tägliche Spielzeit auf deinem Minecraft-Bedrock-Server oder in deiner Welt – automatisch, fair und einfach einzurichten.

---

## Für wen ist dieses Addon?

**👨‍👩‍👧 Eltern**
Dein Kind spielt Minecraft länger als dir lieb ist? Mit diesem Addon legst du ein tägliches Zeitlimit fest – danach wird es automatisch aus der Welt geworfen. Kein Technikwissen nötig, einmal einrichten und fertig. Das Limit setzt sich jeden Tag um Mitternacht automatisch zurück.

**🎮 Serverbesitzer**
Als Challenge: Erreicht euer Ziel innerhalb eines Zeitlimits!

Für Chancengleicheit: Freunde oder Mitspieler farmen deinen Server leer, weil sie nichts Besseres zu tun haben? Mit Playtime Limit steuerst du, wie lange jemand täglich online sein darf. Du behältst die volle Kontrolle.

---

## Features

- ⏱ Konfigurierbares Tageslimit pro Spieler
- 🔔 Vorwarnung kurz vor Ablauf des Limits
- 🌙 Automatischer Reset um Mitternacht – funktioniert auch wenn Spieler über Mitternacht online bleiben
- 💾 Daten bleiben nach Serverneustart erhalten
- 🛠 Einstellungen per Datei, Ingame-Menü oder Befehl
- 👁 Respawn-Nachricht mit verbleibender Zeit (kann pro Spieler deaktiviert werden)
- 👮 Flexible Admin-Verwaltung: Operatoren oder bestimmte Spielernamen

---

## Installation

### Einzelspieler / Realm / eigene Welt (Windows)

1. `.mcaddon`-Datei von der [Releases-Seite](../../releases) herunterladen
2. Doppelklick auf die Datei – Minecraft importiert sie automatisch
3. Behavior Pack in den Welteinstellungen aktivieren

### Dedicated Server (BDS)

1. `.mcaddon` herunterladen und als `.zip` entpacken
2. Den Ordner `playtime-limit-BP` nach `behavior_packs/` auf dem Server kopieren
3. In `worlds/<Weltname>/world_behavior_packs.json` das Pack eintragen:
```json
[
  {
    "pack_id": "19518de4-6a60-41ff-b819-f9f6979d0eee",
    "version": [1, 0, 0]
  }
]
```
4. Server neu starten

---

## Einstellungen anpassen

Es gibt drei Wege, das Addon zu konfigurieren – von einfach bis technisch:

### 🎮 Ingame-Menü (empfohlen)
```
/playtimelimit:menu
```
Öffnet ein grafisches Menü direkt im Spiel. Admins können dort Limit, Warnzeit und Admin-Liste verwalten – ohne die Welt verlassen zu müssen.

> **Wichtig:** Stelle via Befehl, Menü oder Datei ein, wer die Zeiten ändern darf! 
Du kannst nur bestimmte Playernamen zulassen oder alle Operatoren (Default) oder die Anpassung "IN-Game" deaktivieren.

![Menu](assets/Menu.gif)

### 💬 Befehle
Schnelle Anpassungen direkt per Chat:
```
/playtimelimit:set 90        → Tageslimit auf 90 Minuten setzen
/playtimelimit:warning 5     → Vorwarnung 5 Minuten vor Ablauf
/playtimelimit:status        → Eigene verbleibende Zeit anzeigen
/playtimelimit:respawnmsg false  → Respawn-Nachricht deaktivieren
```

| Befehl | Berechtigung | Beschreibung |
|---|---|---|
| `/playtimelimit:status` | Alle | Zeigt verbleibende Spielzeit |
| `/playtimelimit:menu` | Alle | Öffnet das Menü (Admin-Funktionen nur für Admins) |
| `/playtimelimit:set <Minuten>` | Operatoren | Setzt das Tageslimit |
| `/playtimelimit:warning <Minuten>` | Operatoren | Setzt die Vorwarnzeit |
| `/playtimelimit:respawnmsg <true\|false>` | Alle | Respawn-Nachricht an/aus |

### 📄 Konfigurationsdatei
Die Datei `scripts/playtimeConfig.js` befindet sich im Pack-Ordner:

**Windows (Einzelspieler):**
```
%APPDATA%\Minecraft Bedrock\Users\Shared\games\com.mojang\behavior_packs\PlaytimeLi\scripts\playtimeConfig.js
```
> **Wichtig:** Nach jeder Änderung an der Datei den Wert `lastUpdate` auf den aktuellen Zeitstempel aktualisieren (ISO-Format, z.B. `"2026-03-14T10:00:00.000Z"`). Nur so erkennt das Addon, dass die Datei neuer ist als die gespeicherten Ingame-Einstellungen.

**Dedicated Server:**
```
behavior_packs/playtime-limit-BP/scripts/playtimeConfig.js
```

```js
export const playtimeConfig = {
  LimitMinutes: 120,            // Tageslimit in Minuten (Standard: 2 Stunden)
  allowIngameChange: true,      // Admins dürfen Einstellungen im Spiel ändern
  warningMinutesBeforeEnd: 10,  // Vorwarnung X Minuten vor Ablauf
  lastUpdate: "2026-03-13T00:00:00.000Z", // Bitte bei jeder Änderung aktualisieren!
  admins: [],                   // Leer = nur Operatoren, oder: ["Spieler1", "Spieler2"]
  debug: false,                 // Nur für Fehlersuche auf true setzen
};
```

> **Wichtig:** Nach jeder Änderung an der Datei den Wert `lastUpdate` auf den aktuellen Zeitstempel aktualisieren (ISO-Format, z.B. `"2026-03-14T10:00:00.000Z"`). Nur so erkennt das Addon, dass die Datei neuer ist als die gespeicherten Ingame-Einstellungen.

---

## Wie die Konfigurationspriorität funktioniert

Beim Serverstart entscheidet das Addon, welche Einstellungen gelten:

1. Wenn `enabled: false` in der Datei → Datei gewinnt immer
2. Noch keine gespeicherten Ingame-Einstellungen → Datei wird als Basis übernommen
3. `lastUpdate` in der Datei ist neuer → Datei überschreibt die gespeicherten Einstellungen
4. Sonst → gespeicherte Ingame-Einstellungen bleiben erhalten

---

## Voraussetzungen

- Minecraft Bedrock Edition **1.21+**
- Keine experimentellen Einstellungen erforderlich

---

## Lizenz

Dieses Addon ist kostenlos und darf weitergegeben und modifiziert werden. Eine Nennung des ursprünglichen Autors ist erwünscht.

Dies ist kein offizielles Minecraft-Produkt und steht in keiner Verbindung zu Mojang oder Microsoft.
