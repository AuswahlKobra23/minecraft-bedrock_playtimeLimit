console.info("[PlaytimeLimit] Script geladen");

/* ====================
   IMPORTS
==================== */
import {
  world,
  system,
  Player,
  CustomCommandStatus,
  CommandPermissionLevel,
  CustomCommandParamType
} from "@minecraft/server";

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { playtimeConfig } from "./playtimeConfig.js";

/* ====================
   KONSTANTEN
==================== */
const PLAYTIME_PROP = "playtimeData";
const CONFIG_PROP = "playtimeConfig";
const KNOWN_PLAYERS_PROP = "knownPlayers";

const INTERVAL_TICKS = 20 * 60; // 1 Minute

const knownPlayers = new Set();

/* ====================
   KONFIGURATION
==================== */
let CONFIG = { ...playtimeConfig };

// Defaults setzen
CONFIG.LimitMinutes ??= 120;
CONFIG.allowIngameChange ??= true;
CONFIG.warningMinutesBeforeEnd ??= 10;
CONFIG.admins ??= [];  // leer → nur Operatoren
CONFIG.debug ??= false;

const DEBUG = CONFIG.debug === true;


/* ====================
   HILFSFUNKTIONEN
==================== */
function debugLog(msg, level = "info") {
  if (!DEBUG) return;
  switch (level) {
    case "warn":  console.warn(`[Debug PTL] ${msg}`);  break;
    case "error": console.error(`[Debug PTL] ${msg}`); break;
    default:      console.info(`[Debug PTL] ${msg}`);
  }
}

// Aktuelles Datum als yyyy-mm-dd
function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Aktuellen Zeitstempel als ISO-String
function nowString() {
  return new Date().toISOString();
}

// Sicheres JSON-Parsing
function safeParse(str, fallback = {}) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// Normalisiert Spielerdaten (wird beim Laden aufgerufen, z.B. beim Login/Spawn)
function normalizeData(data) {
  if (!data || typeof data !== "object") {
    return { date: today(), minutes: 0, showRespawnMessage: true };
  }

  // Sekunden → Minuten konvertieren (Legacy)
  if (data.seconds !== undefined && data.minutes === undefined) {
    data.minutes = Math.floor(data.seconds / 60);
    delete data.seconds;
  }

  data.showRespawnMessage = typeof data.showRespawnMessage === "boolean" ? data.showRespawnMessage : true;
  data.minutes = typeof data.minutes === "number" ? data.minutes : 0;

  // Tageswechsel prüfen (greift beim Login/Spawn nach Mitternacht)
  const currentDay = today();
  if (data.date !== currentDay) {
    debugLog(`Neuer Tag erkannt (Login), Minuten zurücksetzen`);
    data.date = currentDay;
    data.minutes = 0;
  }

  return data;
}

// Prüft, ob Spieler Admin ist
function isAdmin(player) {
  if (CONFIG.admins.length === 0) return player.playerPermissionLevel === 2;
  const result = CONFIG.admins.includes(player.name);
  debugLog(`[isAdmin] ${player.name}: ${result}`);
  return result;
}

// Prüft, ob Tageslimit erreicht ist
function isOverLimit(player) {
  return getPlayerData(player).minutes >= CONFIG.LimitMinutes;
}

// Zeigt Titel mit verbleibender Spielzeit
function showTitle(player) {
  const data = getPlayerData(player);
  const remaining = Math.max(0, CONFIG.LimitMinutes - data.minutes);
  player.runCommand(`title @s title §6Playtime Limit`);
  player.runCommand(`title @s subtitle §eNoch ${remaining} Minuten übrig`);
  debugLog(`Title angezeigt: ${player.name}, verbleibend ${remaining} Minuten`);
}

// Spielerdaten aus DynamicProperty laden
function getPlayerData(player) {
  const raw = player.getDynamicProperty(PLAYTIME_PROP);
  const data = normalizeData(safeParse(raw, null));
  debugLog(`Daten geladen für ${player.name}: ${JSON.stringify(data)}`);
  return data;
}

// Spieler kicken
function kickPlayer(player) {
  system.runTimeout(() => {
    try {
      player.runCommandAsync(`kick "${player.name}" §cDein Tageslimit von ${CONFIG.LimitMinutes} Minuten wurde erreicht.`);
    } catch (err) {
      debugLog(`Kick fehlgeschlagen für ${player.name}: ${err}`, "warn");
    }
  }, 1);
}

/* ====================
   KNOWN PLAYERS PERSISTENZ
==================== */
function loadKnownPlayers() {
  try {
    const raw = world.getDynamicProperty(KNOWN_PLAYERS_PROP);
    const list = safeParse(raw, []);
    if (Array.isArray(list)) {
      list.forEach(name => knownPlayers.add(name));
      debugLog(`knownPlayers geladen: ${list.length} Einträge`);
    }
  } catch (err) {
    debugLog(`loadKnownPlayers Fehler: ${err}`, "warn");
  }
}

function persistKnownPlayers() {
  try {
    world.setDynamicProperty(KNOWN_PLAYERS_PROP, JSON.stringify(Array.from(knownPlayers)));
    debugLog(`knownPlayers persistiert: ${knownPlayers.size} Einträge`);
  } catch (err) {
    debugLog(`persistKnownPlayers Fehler: ${err}`, "warn");
  }
}

// Spieler zur Liste hinzufügen und nur bei Änderung persistieren
function addKnownPlayer(name) {
  if (!knownPlayers.has(name)) {
    knownPlayers.add(name);
    persistKnownPlayers();
  }
}

/* ====================
   UI / MENÜ
==================== */

function openAdminMenu(player) {

  const admin = isAdmin(player);

  const buttons = [
    { label: "Limit anzeigen", action: () => showLimitInfo(player) },
    ...(admin ? [{ label: "Tageslimit anpassen", action: () => openLimitChangeForm(player, true) }] : []),
    {
      label: "Respawn-Message umschalten", action: () => {
        const state = updateRespawnMessage(player);
        player.sendMessage(`Respawn-Message ${state ? "aktiviert" : "deaktiviert"}`);
      }
    },
    ...(admin ? [{ label: "Warnzeit anpassen", action: () => openWarningChangeForm(player, true) }] : []),
    ...(admin ? [{ label: "Admins verwalten", action: () => openAdminListForm(player) }] : [])
  ];

  const form = new ActionFormData().title("Playtime Menü");
  buttons.forEach(btn => form.button(btn.label));

  form.show(player).then(res => {
    if (res.canceled) return;
    buttons[res.selection]?.action();
  }).catch(err => debugLog(`AdminMenu Fehler: ${err}`, "error"));
}

// Untermenü: Limit ändern
function openLimitChangeForm(player, returnToMenu = false) {
  new ModalFormData()
    .title("Neues Tageslimit")
    .textField("Gib das Limit in Minuten ein", String(CONFIG.LimitMinutes))
    .show(player)
    .then(res => {
      if (res.canceled) {
        if (returnToMenu) openAdminMenu(player);
        return debugLog(`Limit-Formular von ${player.name} abgebrochen`);
      }

      if (!CONFIG.allowIngameChange) {
        player.sendMessage("§cIngame-Konfiguration ist deaktiviert.");
        if (returnToMenu) openAdminMenu(player);
        return;
      }

      const minutes = parseInt(res.formValues[0]);
      if (isNaN(minutes) || minutes < 1) {
        player.sendMessage("§cUngültige Eingabe, bitte positive Zahl eingeben.");
        return openLimitChangeForm(player, returnToMenu);
      }

      CONFIG.LimitMinutes = minutes;
      CONFIG.lastUpdate = nowString();
      persistConfig({ LimitMinutes: minutes, lastUpdate: CONFIG.lastUpdate });
      player.sendMessage(`§aNeues Limit: ${minutes} Minuten`);
      if (returnToMenu) openAdminMenu(player);
    });
}

// Untermenü: Warnzeit ändern
function openWarningChangeForm(player, returnToMenu = false) {
  new ModalFormData()
    .title("Warnzeit vor Limit")
    .textField("Minuten vor Ende eingeben", String(CONFIG.warningMinutesBeforeEnd))
    .show(player)
    .then(res => {
      if (res.canceled) {
        if (returnToMenu) openAdminMenu(player);
        return debugLog(`Warnzeit-Formular von ${player.name} abgebrochen`);
      }

      if (!CONFIG.allowIngameChange) {
        player.sendMessage("§cIngame-Konfiguration ist deaktiviert.");
        if (returnToMenu) openAdminMenu(player);
        return;
      }

      const minutes = parseInt(res.formValues[0]);
      if (isNaN(minutes) || minutes < 1) {
        player.sendMessage("§cUngültige Eingabe, bitte positive Zahl eingeben.");
        return openWarningChangeForm(player, returnToMenu);
      }

      CONFIG.warningMinutesBeforeEnd = minutes;
      CONFIG.lastUpdate = nowString();
      persistConfig({ warningMinutesBeforeEnd: minutes, lastUpdate: CONFIG.lastUpdate });
      player.sendMessage(`§aWarnzeit auf ${minutes} Minuten gesetzt.`);
      if (returnToMenu) openAdminMenu(player);
    });
}

function showLimitInfo(player) {
  const data = getPlayerData(player);
  player.sendMessage(`§eNoch ${Math.max(0, CONFIG.LimitMinutes - data.minutes)} Minuten übrig.`);
}

// Umschalten der Respawn-Message
function updateRespawnMessage(player, enabled) {
  const data = getPlayerData(player);
  const old = data.showRespawnMessage;

  data.showRespawnMessage =
    typeof enabled === "boolean"
      ? enabled
      : !data.showRespawnMessage;

  persistPlayerData(player, data);
  debugLog(`RespawnMessage für ${player.name} geändert: ${old} -> ${data.showRespawnMessage}`);
  return data.showRespawnMessage;
}

// Admin-Liste verwalten
function openAdminListForm(player) {
  const knownPlayersArray = Array.from(knownPlayers).sort();

  const showSubMenu = () => {
    const allOpsActive = CONFIG.admins.length === 0;

    const form = new ModalFormData().title("Admins verwalten");

    // 0
    form.toggle("Alle Operatoren", { defaultValue: allOpsActive });

    // 1
    form.textField("Neuen Spieler hinzufügen", "");

    const displayedPlayers = [];

    // Aktive Admins zuerst
    CONFIG.admins.forEach(name => {
      displayedPlayers.push(name);
      form.toggle(name, { defaultValue: true });
    });

    // Bekannte Spieler, die noch keine Admins sind
    knownPlayersArray.forEach(name => {
      if (!CONFIG.admins.includes(name)) {
        displayedPlayers.push(name);
        form.toggle(name, { defaultValue: false });
      }
    });

    form.show(player).then(res => {
      if (res.canceled) return openAdminMenu(player);

      const values = res.formValues;
      const allOpsSelected = values[0] === true;
      const textValue = (values[1] || "").trim();
      const selectedPlayers = [];
      const playerOffset = 2;

      displayedPlayers.forEach((name, i) => {
        if (values[playerOffset + i] === true) selectedPlayers.push(name);
      });

      // Neuen Spieler aus Textfeld hinzufügen
      if (textValue && !selectedPlayers.includes(textValue)) {
        selectedPlayers.push(textValue);
        addKnownPlayer(textValue); // auch in knownPlayers persistieren
      }

      if (allOpsSelected && selectedPlayers.length === 0) {
        CONFIG.admins = [];
        persistConfig({ admins: CONFIG.admins });
        player.sendMessage("§aAdmins gesetzt: Alle Operatoren");
        return showSubMenu();
      }

      CONFIG.admins = selectedPlayers.sort((a, b) =>
        a.localeCompare(b, "de", { sensitivity: "base" })
      );

      persistConfig({ admins: CONFIG.admins });
      player.sendMessage(
        `§aAdmins aktiv: ${CONFIG.admins.length > 0 ? CONFIG.admins.join(", ") : "Keine"}`
      );

      showSubMenu();
    });
  };

  showSubMenu();
}

/* ====================
   CONFIG PERSISTENZ
==================== */
function persistConfig(newProps) {
  try {
    let stored = safeParse(world.getDynamicProperty(CONFIG_PROP));
    stored = { ...stored, ...newProps };
    world.setDynamicProperty(CONFIG_PROP, JSON.stringify(stored));
    debugLog(`DynamicProperty ${CONFIG_PROP} aktualisiert: ${JSON.stringify(stored)}`);
  } catch (err) {
    debugLog(`PersistConfig Fehler: ${err}`, "warn");
  }
}

function persistPlayerData(player, data) {
  try {
    player.setDynamicProperty(PLAYTIME_PROP, JSON.stringify(data));
  } catch (err) {
    debugLog(`PersistPlayerData Fehler: ${err}`, "warn");
  }
}

/* ====================
   SPIELZEIT-INTERVAL
==================== */
system.runInterval(() => {

  const players = world.getPlayers();
  debugLog(`Intervall gestartet – ${players.length} Spieler online`);

  for (const player of players) {

    const data = getPlayerData(player);

    // Tageswechsel für Spieler, die über Mitternacht online sind
    const currentDay = today();
    if (data.date !== currentDay) {
      debugLog(`Neuer Tag (online) für ${player.name}, Minuten zurücksetzen`);
      data.date = currentDay;
      data.minutes = 0;
    }

    // Spielzeit erhöhen
    data.minutes++;
    debugLog(`Spielzeit erhöht: ${player.name} -> ${data.minutes} Minuten`);

    const remaining = CONFIG.LimitMinutes - data.minutes;

    // Warnung anzeigen
    if (remaining === CONFIG.warningMinutesBeforeEnd) {
      debugLog(`Warnung ausgelöst für ${player.name}`);
      showTitle(player);
    }

    // Limit erreicht → persistieren und kicken
    if (remaining <= 0) {
      debugLog(`Limit erreicht für ${player.name}`);
      persistPlayerData(player, data);
      kickPlayer(player);
      continue;
    }

    persistPlayerData(player, data);
  }

}, INTERVAL_TICKS);

/* ====================
   PLAYER EVENTS
==================== */
world.afterEvents.playerSpawn.subscribe(ev => {

  const player = ev.player;
  if (!(player instanceof Player)) return;

  addKnownPlayer(player.name);

  const data = getPlayerData(player);
  debugLog(`PlayerSpawn: ${player.name}, Daten: ${JSON.stringify(data)}`);

  if (isOverLimit(player)) {
    showTitle(player);
    kickPlayer(player);
    return;
  }

  if (ev.initialSpawn || data.showRespawnMessage) {
    showTitle(player);
  }
});

/* ====================
   CONFIG-LOADER
==================== */
function loadConfigOnStartup() {
  try {
    const fileConfig = { ...playtimeConfig };
    let stored = safeParse(world.getDynamicProperty(CONFIG_PROP), {}) || {};

    const fileTime   = fileConfig.lastUpdate ? new Date(fileConfig.lastUpdate) : null;
    const storedTime = stored.lastUpdate     ? new Date(stored.lastUpdate)     : null;

    // 1️⃣ Feature deaktiviert → Datei gewinnt komplett
    if (fileConfig.enabled === false) {
      debugLog("Config disabled → Datei gewinnt komplett");
      stored = { ...fileConfig };
    }
    // 2️⃣ Keine gespeicherte Config → Datei initial übernehmen
    else if (!storedTime && fileTime) {
      debugLog("Keine gespeicherte Config → Datei wird initial übernommen");
      stored = { ...fileConfig };
    }
    // 3️⃣ Datei ist neuer → Datei gewinnt komplett
    else if (fileTime && storedTime && fileTime > storedTime) {
      debugLog("Datei neuer als World → Datei überschreibt komplett");
      stored = { ...stored, ...fileConfig };
    }
    // 4️⃣ Sonst bleibt World führend
    else {
      debugLog("World Config bleibt führend");
    }

    world.setDynamicProperty(CONFIG_PROP, JSON.stringify(stored));
    CONFIG = stored;

    // Defaults sicherstellen (falls alte World-Config unvollständig ist)
    CONFIG.LimitMinutes ??= 120;
    CONFIG.allowIngameChange ??= true;
    CONFIG.warningMinutesBeforeEnd ??= 10;
    CONFIG.admins ??= [];

    debugLog(`Startup gültige Werte: ${JSON.stringify(stored)}`);

  } catch (err) {
    debugLog(`Fehler beim Laden der Config: ${err}`, "warn");
  }
}

/* ====================
   COMMANDS
==================== */
function registerCommands(customCommandRegistry) {

  // Status-Befehl
  customCommandRegistry.registerCommand({
    name: "playtimelimit:status",
    description: "Zeigt verbleibende Spielzeit",
    permissionLevel: CommandPermissionLevel.Any,
    cheatsRequired: false
  }, origin => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure, message: "Nur Spieler." };
    const minutes = getPlayerData(player).minutes;
    return { status: CustomCommandStatus.Success, message: `Noch ${Math.max(0, CONFIG.LimitMinutes - minutes)} Minuten übrig` };
  });

  // Limit setzen
  customCommandRegistry.registerCommand({
    name: "playtimelimit:set",
    description: "Setzt Tageslimit",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    cheatsRequired: false,
    mandatoryParameters: [{ name: "minutes", type: CustomCommandParamType.Integer }]
  }, (origin, minutes) => {
    if (!CONFIG.allowIngameChange) return { status: CustomCommandStatus.Failure, message: "Ingame-Konfiguration deaktiviert." };
    if (minutes === undefined || minutes < 1) return { status: CustomCommandStatus.Failure, message: "Ungültige Minutenangabe." };
    CONFIG.LimitMinutes = minutes;
    CONFIG.lastUpdate = nowString();
    persistConfig({ LimitMinutes: minutes, lastUpdate: CONFIG.lastUpdate });
    debugLog(`Limit via Command gesetzt: ${minutes}`);
    return { status: CustomCommandStatus.Success, message: `Limit wurde auf ${minutes} Minuten gesetzt.` };
  });

  // Warnung setzen
  customCommandRegistry.registerCommand({
    name: "playtimelimit:warning",
    description: "Setzt Zeit für Warnung (Operatoren)",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    cheatsRequired: false,
    mandatoryParameters: [{ name: "minutes", type: CustomCommandParamType.Integer }]
  }, (origin, minutes) => {
    if (!CONFIG.allowIngameChange) return { status: CustomCommandStatus.Failure, message: "Ingame-Konfiguration deaktiviert." };
    if (minutes === undefined || minutes < 1) return { status: CustomCommandStatus.Failure, message: "Ungültige Minutenangabe." };
    CONFIG.warningMinutesBeforeEnd = minutes;
    CONFIG.lastUpdate = nowString();
    persistConfig({ warningMinutesBeforeEnd: minutes, lastUpdate: CONFIG.lastUpdate });
    debugLog(`Vorwarnzeit via Command gesetzt: ${minutes}`);
    return { status: CustomCommandStatus.Success, message: `Vorwarnzeit wurde auf ${minutes} Minuten gesetzt.` };
  });

  // Respawn-Message an/aus
  customCommandRegistry.registerCommand({
    name: "playtimelimit:respawnmsg",
    description: "Respawn-Message an/aus",
    permissionLevel: CommandPermissionLevel.Any,
    cheatsRequired: false,
    mandatoryParameters: [{ name: "enabled", type: CustomCommandParamType.Boolean }]
  }, (origin, enabled) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure, message: "Nur Spieler." };
    updateRespawnMessage(player, enabled);
    return { status: CustomCommandStatus.Success, message: `Respawn-Message ${enabled ? "aktiviert" : "deaktiviert"}` };
  });

  // Admin-Menü
  customCommandRegistry.registerCommand({
    name: "playtimelimit:menu",
    description: "Öffnet das Admin-Menü",
    permissionLevel: CommandPermissionLevel.Any,
    cheatsRequired: false
  }, origin => {
    let player = origin.sourceEntity;
    if (!(player instanceof Player)) {
      const players = world.getPlayers();
      player = players.find(p => p.name === origin.senderName);
      if (!player) return { status: CustomCommandStatus.Failure, message: "Spieler nicht gefunden." };
    }
    system.run(() => openAdminMenu(player));
    return { status: CustomCommandStatus.Success };
  });

}

/* ====================
   SERVERSTART
==================== */
system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
  // Commands müssen synchron im Startup-Event registriert werden
  registerCommands(customCommandRegistry);

  // DynamicProperty-Zugriff erst nach dem ersten Tick möglich
  system.run(() => {
    loadConfigOnStartup();
    loadKnownPlayers();
  });
});
