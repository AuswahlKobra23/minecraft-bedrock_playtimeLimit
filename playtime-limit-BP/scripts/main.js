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

CONFIG.LimitMinutes ??= 120;
CONFIG.allowIngameChange ??= true;
CONFIG.warningMinutesBeforeEnd ??= 10;
CONFIG.admins ??= [];
CONFIG.debug ??= false;

const DEBUG = CONFIG.debug === true;

/* ====================
   I18N
==================== */
const STRINGS = {
  de: {
    titleMain:            () => `§6Playtime Limit`,
    titleSub:             (rem) => `§eNoch ${rem} Minuten übrig`,
    kickMsg:              (min) => `§cDein Tageslimit von ${min} Minuten wurde erreicht.`,
    menuTitle:            () => `Playtime Menü`,
    menuShowLimit:        () => `Limit anzeigen`,
    menuChangeLimit:      () => `Tageslimit anpassen`,
    menuToggleRespawn:    () => `Respawn-Message umschalten`,
    menuChangeWarning:    () => `Warnzeit anpassen`,
    menuManageAdmins:     () => `Admins verwalten`,
    respawnOn:            () => `Respawn-Message aktiviert`,
    respawnOff:           () => `Respawn-Message deaktiviert`,
    limitFormTitle:       () => `Neues Tageslimit`,
    limitFormField:       () => `Gib das Limit in Minuten ein`,
    limitDisabled:        () => `§cIngame-Konfiguration ist deaktiviert.`,
    limitInvalid:         () => `§cUngültige Eingabe, bitte positive Zahl eingeben.`,
    limitSet:             (min) => `§aNeues Limit: ${min} Minuten`,
    warningFormTitle:     () => `Warnzeit vor Limit`,
    warningFormField:     () => `Minuten vor Ende eingeben`,
    warningSet:           (min) => `§aWarnzeit auf ${min} Minuten gesetzt.`,
    limitInfo:            (rem) => `§eNoch ${rem} Minuten übrig.`,
    adminFormTitle:       () => `Admins verwalten`,
    adminToggleAllOps:    () => `Alle Operatoren`,
    adminAddField:        () => `Neuen Spieler hinzufügen`,
    adminSetAllOps:       () => `§aAdmins gesetzt: Alle Operatoren`,
    adminSetList:         (list) => `§aAdmins aktiv: ${list.length > 0 ? list.join(", ") : "Keine"}`,
    cmdOnlyPlayer:        () => `Nur Spieler.`,
    cmdDisabled:          () => `Ingame-Konfiguration deaktiviert.`,
    cmdInvalidMinutes:    () => `Ungültige Minutenangabe.`,
    cmdLimitSet:          (min) => `Limit wurde auf ${min} Minuten gesetzt.`,
    cmdWarningSet:        (min) => `Vorwarnzeit wurde auf ${min} Minuten gesetzt.`,
    cmdStatus:            (rem) => `Noch ${rem} Minuten übrig`,
    cmdRespawnOn:         () => `Respawn-Message aktiviert`,
    cmdRespawnOff:        () => `Respawn-Message deaktiviert`,
    cmdPlayerNotFound:    () => `Spieler nicht gefunden.`,
  },
  en: {
    titleMain:            () => `§6Playtime Limit`,
    titleSub:             (rem) => `§e${rem} minutes remaining`,
    kickMsg:              (min) => `§cYour daily limit of ${min} minutes has been reached.`,
    menuTitle:            () => `Playtime Menu`,
    menuShowLimit:        () => `Show limit`,
    menuChangeLimit:      () => `Change daily limit`,
    menuToggleRespawn:    () => `Toggle respawn message`,
    menuChangeWarning:    () => `Change warning time`,
    menuManageAdmins:     () => `Manage admins`,
    respawnOn:            () => `Respawn message enabled`,
    respawnOff:           () => `Respawn message disabled`,
    limitFormTitle:       () => `New daily limit`,
    limitFormField:       () => `Enter limit in minutes`,
    limitDisabled:        () => `§cIn-game configuration is disabled.`,
    limitInvalid:         () => `§cInvalid input, please enter a positive number.`,
    limitSet:             (min) => `§aNew limit: ${min} minutes`,
    warningFormTitle:     () => `Warning time before limit`,
    warningFormField:     () => `Enter minutes before end`,
    warningSet:           (min) => `§aWarning time set to ${min} minutes.`,
    limitInfo:            (rem) => `§e${rem} minutes remaining.`,
    adminFormTitle:       () => `Manage admins`,
    adminToggleAllOps:    () => `All operators`,
    adminAddField:        () => `Add new player`,
    adminSetAllOps:       () => `§aAdmins set: all operators`,
    adminSetList:         (list) => `§aActive admins: ${list.length > 0 ? list.join(", ") : "None"}`,
    cmdOnlyPlayer:        () => `Players only.`,
    cmdDisabled:          () => `In-game configuration is disabled.`,
    cmdInvalidMinutes:    () => `Invalid minutes value.`,
    cmdLimitSet:          (min) => `Limit set to ${min} minutes.`,
    cmdWarningSet:        (min) => `Warning time set to ${min} minutes.`,
    cmdStatus:            (rem) => `${rem} minutes remaining`,
    cmdRespawnOn:         () => `Respawn message enabled`,
    cmdRespawnOff:        () => `Respawn message disabled`,
    cmdPlayerNotFound:    () => `Player not found.`,
  },
  fr: {
    titleMain:            () => `§6Playtime Limit`,
    titleSub:             (rem) => `§eEncore ${rem} minutes restantes`,
    kickMsg:              (min) => `§cVotre limite journalière de ${min} minutes a été atteinte.`,
    menuTitle:            () => `Menu Playtime`,
    menuShowLimit:        () => `Afficher la limite`,
    menuChangeLimit:      () => `Modifier la limite journalière`,
    menuToggleRespawn:    () => `Activer/désactiver le message de respawn`,
    menuChangeWarning:    () => `Modifier l'avertissement`,
    menuManageAdmins:     () => `Gérer les admins`,
    respawnOn:            () => `Message de respawn activé`,
    respawnOff:           () => `Message de respawn désactivé`,
    limitFormTitle:       () => `Nouvelle limite journalière`,
    limitFormField:       () => `Entrez la limite en minutes`,
    limitDisabled:        () => `§cLa configuration en jeu est désactivée.`,
    limitInvalid:         () => `§cEntrée invalide, veuillez entrer un nombre positif.`,
    limitSet:             (min) => `§aNouvelle limite : ${min} minutes`,
    warningFormTitle:     () => `Temps d'avertissement`,
    warningFormField:     () => `Entrez les minutes avant la fin`,
    warningSet:           (min) => `§aAvertissement défini à ${min} minutes.`,
    limitInfo:            (rem) => `§eEncore ${rem} minutes restantes.`,
    adminFormTitle:       () => `Gérer les admins`,
    adminToggleAllOps:    () => `Tous les opérateurs`,
    adminAddField:        () => `Ajouter un joueur`,
    adminSetAllOps:       () => `§aAdmins définis : tous les opérateurs`,
    adminSetList:         (list) => `§aAdmins actifs : ${list.length > 0 ? list.join(", ") : "Aucun"}`,
    cmdOnlyPlayer:        () => `Joueurs uniquement.`,
    cmdDisabled:          () => `Configuration en jeu désactivée.`,
    cmdInvalidMinutes:    () => `Valeur de minutes invalide.`,
    cmdLimitSet:          (min) => `Limite définie à ${min} minutes.`,
    cmdWarningSet:        (min) => `Avertissement défini à ${min} minutes.`,
    cmdStatus:            (rem) => `Encore ${rem} minutes restantes`,
    cmdRespawnOn:         () => `Message de respawn activé`,
    cmdRespawnOff:        () => `Message de respawn désactivé`,
    cmdPlayerNotFound:    () => `Joueur introuvable.`,
  },
  es: {
    titleMain:            () => `§6Playtime Limit`,
    titleSub:             (rem) => `§eQuedan ${rem} minutos`,
    kickMsg:              (min) => `§cHas alcanzado el límite diario de ${min} minutos.`,
    menuTitle:            () => `Menú Playtime`,
    menuShowLimit:        () => `Ver límite`,
    menuChangeLimit:      () => `Cambiar límite diario`,
    menuToggleRespawn:    () => `Activar/desactivar mensaje de respawn`,
    menuChangeWarning:    () => `Cambiar tiempo de aviso`,
    menuManageAdmins:     () => `Gestionar admins`,
    respawnOn:            () => `Mensaje de respawn activado`,
    respawnOff:           () => `Mensaje de respawn desactivado`,
    limitFormTitle:       () => `Nuevo límite diario`,
    limitFormField:       () => `Introduce el límite en minutos`,
    limitDisabled:        () => `§cLa configuración en juego está desactivada.`,
    limitInvalid:         () => `§cEntrada inválida, por favor introduce un número positivo.`,
    limitSet:             (min) => `§aNuevo límite: ${min} minutos`,
    warningFormTitle:     () => `Tiempo de aviso`,
    warningFormField:     () => `Introduce los minutos antes del fin`,
    warningSet:           (min) => `§aAviso establecido en ${min} minutos.`,
    limitInfo:            (rem) => `§eQuedan ${rem} minutos.`,
    adminFormTitle:       () => `Gestionar admins`,
    adminToggleAllOps:    () => `Todos los operadores`,
    adminAddField:        () => `Añadir jugador`,
    adminSetAllOps:       () => `§aAdmins: todos los operadores`,
    adminSetList:         (list) => `§aAdmins activos: ${list.length > 0 ? list.join(", ") : "Ninguno"}`,
    cmdOnlyPlayer:        () => `Solo jugadores.`,
    cmdDisabled:          () => `Configuración en juego desactivada.`,
    cmdInvalidMinutes:    () => `Valor de minutos inválido.`,
    cmdLimitSet:          (min) => `Límite establecido en ${min} minutos.`,
    cmdWarningSet:        (min) => `Aviso establecido en ${min} minutos.`,
    cmdStatus:            (rem) => `Quedan ${rem} minutos`,
    cmdRespawnOn:         () => `Mensaje de respawn activado`,
    cmdRespawnOff:        () => `Mensaje de respawn desactivado`,
    cmdPlayerNotFound:    () => `Jugador no encontrado.`,
  },
  ru: {
    titleMain:            () => `§6Playtime Limit`,
    titleSub:             (rem) => `§eОсталось ${rem} минут`,
    kickMsg:              (min) => `§cВы достигли дневного лимита ${min} минут.`,
    menuTitle:            () => `Меню Playtime`,
    menuShowLimit:        () => `Показать лимит`,
    menuChangeLimit:      () => `Изменить дневной лимит`,
    menuToggleRespawn:    () => `Вкл/выкл сообщение respawn`,
    menuChangeWarning:    () => `Изменить время предупреждения`,
    menuManageAdmins:     () => `Управление админами`,
    respawnOn:            () => `Сообщение respawn включено`,
    respawnOff:           () => `Сообщение respawn выключено`,
    limitFormTitle:       () => `Новый дневной лимит`,
    limitFormField:       () => `Введите лимит в минутах`,
    limitDisabled:        () => `§cИзменение настроек в игре отключено.`,
    limitInvalid:         () => `§cНеверный ввод, введите положительное число.`,
    limitSet:             (min) => `§aНовый лимит: ${min} минут`,
    warningFormTitle:     () => `Время предупреждения`,
    warningFormField:     () => `Введите минуты до конца`,
    warningSet:           (min) => `§aПредупреждение установлено: ${min} минут.`,
    limitInfo:            (rem) => `§eОсталось ${rem} минут.`,
    adminFormTitle:       () => `Управление админами`,
    adminToggleAllOps:    () => `Все операторы`,
    adminAddField:        () => `Добавить игрока`,
    adminSetAllOps:       () => `§aАдмины: все операторы`,
    adminSetList:         (list) => `§aАктивные админы: ${list.length > 0 ? list.join(", ") : "Нет"}`,
    cmdOnlyPlayer:        () => `Только для игроков.`,
    cmdDisabled:          () => `Изменение настроек в игре отключено.`,
    cmdInvalidMinutes:    () => `Неверное значение минут.`,
    cmdLimitSet:          (min) => `Лимит установлен: ${min} минут.`,
    cmdWarningSet:        (min) => `Предупреждение: ${min} минут.`,
    cmdStatus:            (rem) => `Осталось ${rem} минут`,
    cmdRespawnOn:         () => `Сообщение respawn включено`,
    cmdRespawnOff:        () => `Сообщение respawn выключено`,
    cmdPlayerNotFound:    () => `Игрок не найден.`,
  },
  pl: {
    titleMain:            () => `§6Playtime Limit`,
    titleSub:             (rem) => `§ePozostało ${rem} minut`,
    kickMsg:              (min) => `§cOsiągnąłeś dzienny limit ${min} minut.`,
    menuTitle:            () => `Menu Playtime`,
    menuShowLimit:        () => `Pokaż limit`,
    menuChangeLimit:      () => `Zmień dzienny limit`,
    menuToggleRespawn:    () => `Włącz/wyłącz wiadomość respawn`,
    menuChangeWarning:    () => `Zmień czas ostrzeżenia`,
    menuManageAdmins:     () => `Zarządzaj adminami`,
    respawnOn:            () => `Wiadomość respawn włączona`,
    respawnOff:           () => `Wiadomość respawn wyłączona`,
    limitFormTitle:       () => `Nowy dzienny limit`,
    limitFormField:       () => `Podaj limit w minutach`,
    limitDisabled:        () => `§cKonfiguracja w grze jest wyłączona.`,
    limitInvalid:         () => `§cNieprawidłowy wpis, podaj liczbę dodatnią.`,
    limitSet:             (min) => `§aNowy limit: ${min} minut`,
    warningFormTitle:     () => `Czas ostrzeżenia`,
    warningFormField:     () => `Podaj minuty przed końcem`,
    warningSet:           (min) => `§aOstrzeżenie ustawione na ${min} minut.`,
    limitInfo:            (rem) => `§ePozostało ${rem} minut.`,
    adminFormTitle:       () => `Zarządzaj adminami`,
    adminToggleAllOps:    () => `Wszyscy operatorzy`,
    adminAddField:        () => `Dodaj gracza`,
    adminSetAllOps:       () => `§aAdmini: wszyscy operatorzy`,
    adminSetList:         (list) => `§aAktywni admini: ${list.length > 0 ? list.join(", ") : "Brak"}`,
    cmdOnlyPlayer:        () => `Tylko gracze.`,
    cmdDisabled:          () => `Konfiguracja w grze wyłączona.`,
    cmdInvalidMinutes:    () => `Nieprawidłowa wartość minut.`,
    cmdLimitSet:          (min) => `Limit ustawiony na ${min} minut.`,
    cmdWarningSet:        (min) => `Ostrzeżenie ustawione na ${min} minut.`,
    cmdStatus:            (rem) => `Pozostało ${rem} minut`,
    cmdRespawnOn:         () => `Wiadomość respawn włączona`,
    cmdRespawnOff:        () => `Wiadomość respawn wyłączona`,
    cmdPlayerNotFound:    () => `Gracz nie znaleziony.`,
  },
  nl: {
    titleMain:            () => `§6Playtime Limit`,
    titleSub:             (rem) => `§eNog ${rem} minuten over`,
    kickMsg:              (min) => `§cJe dagelijkse limiet van ${min} minuten is bereikt.`,
    menuTitle:            () => `Playtime Menu`,
    menuShowLimit:        () => `Limiet tonen`,
    menuChangeLimit:      () => `Daglimiet aanpassen`,
    menuToggleRespawn:    () => `Respawn-bericht aan/uit`,
    menuChangeWarning:    () => `Waarschuwingstijd aanpassen`,
    menuManageAdmins:     () => `Admins beheren`,
    respawnOn:            () => `Respawn-bericht ingeschakeld`,
    respawnOff:           () => `Respawn-bericht uitgeschakeld`,
    limitFormTitle:       () => `Nieuwe daglimiet`,
    limitFormField:       () => `Voer de limiet in minuten in`,
    limitDisabled:        () => `§cIn-game configuratie is uitgeschakeld.`,
    limitInvalid:         () => `§cOngeldige invoer, voer een positief getal in.`,
    limitSet:             (min) => `§aNieuwe limiet: ${min} minuten`,
    warningFormTitle:     () => `Waarschuwingstijd`,
    warningFormField:     () => `Voer minuten voor het einde in`,
    warningSet:           (min) => `§aWaarschuwing ingesteld op ${min} minuten.`,
    limitInfo:            (rem) => `§eNog ${rem} minuten over.`,
    adminFormTitle:       () => `Admins beheren`,
    adminToggleAllOps:    () => `Alle operators`,
    adminAddField:        () => `Nieuwe speler toevoegen`,
    adminSetAllOps:       () => `§aAdmins ingesteld: alle operators`,
    adminSetList:         (list) => `§aActieve admins: ${list.length > 0 ? list.join(", ") : "Geen"}`,
    cmdOnlyPlayer:        () => `Alleen spelers.`,
    cmdDisabled:          () => `In-game configuratie uitgeschakeld.`,
    cmdInvalidMinutes:    () => `Ongeldige minutenwaarde.`,
    cmdLimitSet:          (min) => `Limiet ingesteld op ${min} minuten.`,
    cmdWarningSet:        (min) => `Waarschuwing ingesteld op ${min} minuten.`,
    cmdStatus:            (rem) => `Nog ${rem} minuten over`,
    cmdRespawnOn:         () => `Respawn-bericht ingeschakeld`,
    cmdRespawnOff:        () => `Respawn-bericht uitgeschakeld`,
    cmdPlayerNotFound:    () => `Speler niet gevonden.`,
  },
  pt: {
    titleMain:            () => `§6Playtime Limit`,
    titleSub:             (rem) => `§eRestam ${rem} minutos`,
    kickMsg:              (min) => `§cVocê atingiu o limite diário de ${min} minutos.`,
    menuTitle:            () => `Menu Playtime`,
    menuShowLimit:        () => `Ver limite`,
    menuChangeLimit:      () => `Alterar limite diário`,
    menuToggleRespawn:    () => `Ativar/desativar mensagem de respawn`,
    menuChangeWarning:    () => `Alterar tempo de aviso`,
    menuManageAdmins:     () => `Gerenciar admins`,
    respawnOn:            () => `Mensagem de respawn ativada`,
    respawnOff:           () => `Mensagem de respawn desativada`,
    limitFormTitle:       () => `Novo limite diário`,
    limitFormField:       () => `Digite o limite em minutos`,
    limitDisabled:        () => `§cA configuração no jogo está desativada.`,
    limitInvalid:         () => `§cEntrada inválida, por favor digite um número positivo.`,
    limitSet:             (min) => `§aNovo limite: ${min} minutos`,
    warningFormTitle:     () => `Tempo de aviso`,
    warningFormField:     () => `Digite os minutos antes do fim`,
    warningSet:           (min) => `§aAviso definido para ${min} minutos.`,
    limitInfo:            (rem) => `§eRestam ${rem} minutos.`,
    adminFormTitle:       () => `Gerenciar admins`,
    adminToggleAllOps:    () => `Todos os operadores`,
    adminAddField:        () => `Adicionar jogador`,
    adminSetAllOps:       () => `§aAdmins: todos os operadores`,
    adminSetList:         (list) => `§aAdmins ativos: ${list.length > 0 ? list.join(", ") : "Nenhum"}`,
    cmdOnlyPlayer:        () => `Apenas jogadores.`,
    cmdDisabled:          () => `Configuração no jogo desativada.`,
    cmdInvalidMinutes:    () => `Valor de minutos inválido.`,
    cmdLimitSet:          (min) => `Limite definido para ${min} minutos.`,
    cmdWarningSet:        (min) => `Aviso definido para ${min} minutos.`,
    cmdStatus:            (rem) => `Restam ${rem} minutos`,
    cmdRespawnOn:         () => `Mensagem de respawn ativada`,
    cmdRespawnOff:        () => `Mensagem de respawn desativada`,
    cmdPlayerNotFound:    () => `Jogador não encontrado.`,
  },
};

const LANG_PROP = "playerLang";
const SUPPORTED_LANGS = ["en", "de", "fr", "es", "ru", "pl", "nl", "pt"];
const LANG_LABELS = {
  en: "English", de: "Deutsch", fr: "Français",
  es: "Español", ru: "Русский", pl: "Polski",
  nl: "Nederlands", pt: "Português"
};

function getLang(player) {
  try {
    const stored = player.getDynamicProperty(LANG_PROP);
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  } catch {}
  return "en";
}

function setLang(player, lang) {
  try {
    player.setDynamicProperty(LANG_PROP, lang);
  } catch (err) {
    debugLog(`setLang Fehler: ${err}`, "warn");
  }
}

function openLangMenu(player, returnToMenu = false) {
  const form = new ActionFormData().title("Language");
  SUPPORTED_LANGS.forEach(lang => form.button(LANG_LABELS[lang]));

  form.show(player).then(res => {
    if (res.canceled) {
      if (returnToMenu) openAdminMenu(player);
      return;
    }
    const selected = SUPPORTED_LANGS[res.selection];
    setLang(player, selected);
    player.sendMessage(`§aLanguage set to: ${LANG_LABELS[selected]}`);
    if (returnToMenu) openAdminMenu(player);
  }).catch(err => debugLog(`LangMenu Fehler: ${err}`, "error"));
}

function t(player, key, ...args) {
  const lang = getLang(player);
  const val = (STRINGS[lang] ?? STRINGS.en)[key] ?? STRINGS.en[key];
  if (!val) { debugLog(`Missing i18n key: ${key}`, "warn"); return key; }
  return typeof val === "function" ? val(...args) : val;
}

// Fallback für Commands ohne Spieler-Kontext (z.B. Konsolenbefehle)
function ts(key, ...args) {
  const val = STRINGS.en[key];
  if (!val) return key;
  return typeof val === "function" ? val(...args) : val;
}

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

function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nowString() {
  return new Date().toISOString();
}

function safeParse(str, fallback = {}) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function normalizeData(data) {
  if (!data || typeof data !== "object") {
    return { date: today(), minutes: 0, showRespawnMessage: true };
  }

  if (data.seconds !== undefined && data.minutes === undefined) {
    data.minutes = Math.floor(data.seconds / 60);
    delete data.seconds;
  }

  data.showRespawnMessage = typeof data.showRespawnMessage === "boolean" ? data.showRespawnMessage : true;
  data.minutes = typeof data.minutes === "number" ? data.minutes : 0;

  const currentDay = today();
  if (data.date !== currentDay) {
    debugLog(`Neuer Tag erkannt (Login), Minuten zurücksetzen`);
    data.date = currentDay;
    data.minutes = 0;
  }

  return data;
}

function isAdmin(player) {
  if (CONFIG.admins.length === 0) return player.playerPermissionLevel === 2;
  const result = CONFIG.admins.includes(player.name);
  debugLog(`[isAdmin] ${player.name}: ${result}`);
  return result;
}

function isOverLimit(player) {
  return getPlayerData(player).minutes >= CONFIG.LimitMinutes;
}

function showTitle(player) {
  const data = getPlayerData(player);
  const remaining = Math.max(0, CONFIG.LimitMinutes - data.minutes);
  player.runCommand(`title @s title ${t(player, "titleMain")}`);
  player.runCommand(`title @s subtitle ${t(player, "titleSub", remaining)}`);
  debugLog(`Title angezeigt: ${player.name}, verbleibend ${remaining} Minuten`);
}

function getPlayerData(player) {
  const raw = player.getDynamicProperty(PLAYTIME_PROP);
  const data = normalizeData(safeParse(raw, null));
  debugLog(`Daten geladen für ${player.name}: ${JSON.stringify(data)}`);
  return data;
}

function kickPlayer(player) {
  system.runTimeout(() => {
    try {
      player.runCommandAsync(`kick "${player.name}" ${t(player, "kickMsg", CONFIG.LimitMinutes)}`);
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
    { label: t(player, "menuShowLimit"),     action: () => showLimitInfo(player) },
    ...(admin ? [{ label: t(player, "menuChangeLimit"),   action: () => openLimitChangeForm(player, true) }] : []),
    { label: t(player, "menuToggleRespawn"), action: () => {
        const state = updateRespawnMessage(player);
        player.sendMessage(t(player, state ? "respawnOn" : "respawnOff"));
    }},
    ...(admin ? [{ label: t(player, "menuChangeWarning"), action: () => openWarningChangeForm(player, true) }] : []),
    ...(admin ? [{ label: t(player, "menuManageAdmins"),  action: () => openAdminListForm(player) }] : []),
    { label: `Language: ${LANG_LABELS[getLang(player)]}`,        action: () => openLangMenu(player, true) }
  ];

  const form = new ActionFormData().title(t(player, "menuTitle"));
  buttons.forEach(btn => form.button(btn.label));

  form.show(player).then(res => {
    if (res.canceled) return;
    buttons[res.selection]?.action();
  }).catch(err => debugLog(`AdminMenu Fehler: ${err}`, "error"));
}

function openLimitChangeForm(player, returnToMenu = false) {
  new ModalFormData()
    .title(t(player, "limitFormTitle"))
    .textField(t(player, "limitFormField"), String(CONFIG.LimitMinutes))
    .show(player)
    .then(res => {
      if (res.canceled) {
        if (returnToMenu) openAdminMenu(player);
        return debugLog(`Limit-Formular von ${player.name} abgebrochen`);
      }

      if (!CONFIG.allowIngameChange) {
        player.sendMessage(t(player, "limitDisabled"));
        if (returnToMenu) openAdminMenu(player);
        return;
      }

      const minutes = parseInt(res.formValues[0]);
      if (isNaN(minutes) || minutes < 1) {
        player.sendMessage(t(player, "limitInvalid"));
        return openLimitChangeForm(player, returnToMenu);
      }

      CONFIG.LimitMinutes = minutes;
      CONFIG.lastUpdate = nowString();
      persistConfig({ LimitMinutes: minutes, lastUpdate: CONFIG.lastUpdate });
      player.sendMessage(t(player, "limitSet", minutes));
      if (returnToMenu) openAdminMenu(player);
    });
}

function openWarningChangeForm(player, returnToMenu = false) {
  new ModalFormData()
    .title(t(player, "warningFormTitle"))
    .textField(t(player, "warningFormField"), String(CONFIG.warningMinutesBeforeEnd))
    .show(player)
    .then(res => {
      if (res.canceled) {
        if (returnToMenu) openAdminMenu(player);
        return debugLog(`Warnzeit-Formular von ${player.name} abgebrochen`);
      }

      if (!CONFIG.allowIngameChange) {
        player.sendMessage(t(player, "limitDisabled"));
        if (returnToMenu) openAdminMenu(player);
        return;
      }

      const minutes = parseInt(res.formValues[0]);
      if (isNaN(minutes) || minutes < 1) {
        player.sendMessage(t(player, "limitInvalid"));
        return openWarningChangeForm(player, returnToMenu);
      }

      CONFIG.warningMinutesBeforeEnd = minutes;
      CONFIG.lastUpdate = nowString();
      persistConfig({ warningMinutesBeforeEnd: minutes, lastUpdate: CONFIG.lastUpdate });
      player.sendMessage(t(player, "warningSet", minutes));
      if (returnToMenu) openAdminMenu(player);
    });
}

function showLimitInfo(player) {
  const data = getPlayerData(player);
  player.sendMessage(t(player, "limitInfo", Math.max(0, CONFIG.LimitMinutes - data.minutes)));
}

function updateRespawnMessage(player, enabled) {
  const data = getPlayerData(player);
  const old = data.showRespawnMessage;

  data.showRespawnMessage =
    typeof enabled === "boolean" ? enabled : !data.showRespawnMessage;

  persistPlayerData(player, data);
  debugLog(`RespawnMessage für ${player.name} geändert: ${old} -> ${data.showRespawnMessage}`);
  return data.showRespawnMessage;
}

function openAdminListForm(player) {
  const knownPlayersArray = Array.from(knownPlayers).sort();

  const showSubMenu = () => {
    const allOpsActive = CONFIG.admins.length === 0;

    const form = new ModalFormData().title(t(player, "adminFormTitle"));
    form.toggle(t(player, "adminToggleAllOps"), { defaultValue: allOpsActive });
    form.textField(t(player, "adminAddField"), "");

    const displayedPlayers = [];

    CONFIG.admins.forEach(name => {
      displayedPlayers.push(name);
      form.toggle(name, { defaultValue: true });
    });

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

      if (textValue && !selectedPlayers.includes(textValue)) {
        selectedPlayers.push(textValue);
        addKnownPlayer(textValue);
      }

      if (allOpsSelected && selectedPlayers.length === 0) {
        CONFIG.admins = [];
        persistConfig({ admins: CONFIG.admins });
        player.sendMessage(t(player, "adminSetAllOps"));
        return showSubMenu();
      }

      CONFIG.admins = selectedPlayers.sort((a, b) =>
        a.localeCompare(b, "de", { sensitivity: "base" })
      );

      persistConfig({ admins: CONFIG.admins });
      player.sendMessage(t(player, "adminSetList", CONFIG.admins));
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

    data.minutes++;
    debugLog(`Spielzeit erhöht: ${player.name} -> ${data.minutes} Minuten`);

    const remaining = CONFIG.LimitMinutes - data.minutes;

    if (remaining === CONFIG.warningMinutesBeforeEnd) {
      debugLog(`Warnung ausgelöst für ${player.name}`);
      showTitle(player);
    }

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

    if (fileConfig.enabled === false) {
      debugLog("Config disabled → Datei gewinnt komplett");
      stored = { ...fileConfig };
    } else if (!storedTime && fileTime) {
      debugLog("Keine gespeicherte Config → Datei wird initial übernommen");
      stored = { ...fileConfig };
    } else if (fileTime && storedTime && fileTime > storedTime) {
      debugLog("Datei neuer als World → Datei überschreibt komplett");
      stored = { ...stored, ...fileConfig };
    } else {
      debugLog("World Config bleibt führend");
    }

    world.setDynamicProperty(CONFIG_PROP, JSON.stringify(stored));
    CONFIG = stored;

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

  customCommandRegistry.registerCommand({
    name: "playtimelimit:status",
    description: "Show remaining playtime",
    permissionLevel: CommandPermissionLevel.Any,
    cheatsRequired: false
  }, origin => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure, message: ts("cmdOnlyPlayer") };
    const minutes = getPlayerData(player).minutes;
    return { status: CustomCommandStatus.Success, message: t(player, "cmdStatus", Math.max(0, CONFIG.LimitMinutes - minutes)) };
  });

  customCommandRegistry.registerCommand({
    name: "playtimelimit:set",
    description: "Set daily limit",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    cheatsRequired: false,
    mandatoryParameters: [{ name: "minutes", type: CustomCommandParamType.Integer }]
  }, (origin, minutes) => {
    const player = origin.sourceEntity instanceof Player ? origin.sourceEntity : null;
    if (!CONFIG.allowIngameChange) return { status: CustomCommandStatus.Failure, message: ts("cmdDisabled") };
    if (minutes === undefined || minutes < 1) return { status: CustomCommandStatus.Failure, message: ts("cmdInvalidMinutes") };
    CONFIG.LimitMinutes = minutes;
    CONFIG.lastUpdate = nowString();
    persistConfig({ LimitMinutes: minutes, lastUpdate: CONFIG.lastUpdate });
    debugLog(`Limit via Command gesetzt: ${minutes}`);
    const msg = player ? t(player, "cmdLimitSet", minutes) : ts("cmdLimitSet", minutes);
    return { status: CustomCommandStatus.Success, message: msg };
  });

  customCommandRegistry.registerCommand({
    name: "playtimelimit:warning",
    description: "Set warning time",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    cheatsRequired: false,
    mandatoryParameters: [{ name: "minutes", type: CustomCommandParamType.Integer }]
  }, (origin, minutes) => {
    const player = origin.sourceEntity instanceof Player ? origin.sourceEntity : null;
    if (!CONFIG.allowIngameChange) return { status: CustomCommandStatus.Failure, message: ts("cmdDisabled") };
    if (minutes === undefined || minutes < 1) return { status: CustomCommandStatus.Failure, message: ts("cmdInvalidMinutes") };
    CONFIG.warningMinutesBeforeEnd = minutes;
    CONFIG.lastUpdate = nowString();
    persistConfig({ warningMinutesBeforeEnd: minutes, lastUpdate: CONFIG.lastUpdate });
    debugLog(`Vorwarnzeit via Command gesetzt: ${minutes}`);
    const msg = player ? t(player, "cmdWarningSet", minutes) : ts("cmdWarningSet", minutes);
    return { status: CustomCommandStatus.Success, message: msg };
  });

  customCommandRegistry.registerCommand({
    name: "playtimelimit:respawnmsg",
    description: "Toggle respawn message",
    permissionLevel: CommandPermissionLevel.Any,
    cheatsRequired: false,
    mandatoryParameters: [{ name: "enabled", type: CustomCommandParamType.Boolean }]
  }, (origin, enabled) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure, message: ts("cmdOnlyPlayer") };
    updateRespawnMessage(player, enabled);
    return { status: CustomCommandStatus.Success, message: t(player, enabled ? "cmdRespawnOn" : "cmdRespawnOff") };
  });

  customCommandRegistry.registerCommand({
    name: "playtimelimit:menu",
    description: "Open playtime menu",
    permissionLevel: CommandPermissionLevel.Any,
    cheatsRequired: false
  }, origin => {
    let player = origin.sourceEntity;
    if (!(player instanceof Player)) {
      player = world.getPlayers().find(p => p.name === origin.senderName);
      if (!player) return { status: CustomCommandStatus.Failure, message: ts("cmdPlayerNotFound") };
    }
    system.run(() => openAdminMenu(player));
    return { status: CustomCommandStatus.Success };
  });

}

/* ====================
   SERVERSTART
==================== */
system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
  registerCommands(customCommandRegistry);

  system.run(() => {
    loadConfigOnStartup();
    loadKnownPlayers();
  });
});
