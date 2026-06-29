const DB_URL = "https://johnshedb-233f8-default-rtdb.firebaseio.com";

let currentUser=null, lastData="";
let currentChatUser=null, lastChatData="";
let currentChatType = "direct";
let currentChatGroupId = null;
let typingTimeout;
let currentActiveNoteId = null;
let currentCommentsStringState = ""; 
let currentAttachedFileBase64 = { feed: null, profile: null };
let feedLoadToken = 0;
let profileLoadToken = 0;
let lastProfilePostsSignature = "";
let feedFilterTimer = null;
let profileActivePrivacy = "";
let currentEditingNoteId = null;
let currentSharingNoteId = null;
let currentActiveFolderId = null;
let currentFolderTargetNoteId = null;
let feedMode = "all";
let toastCounter = 0;
let notificationItems = [];
let lastNotificationSignature = "";
let notificationScanInProgress = false;
const APP_TITLE = "Notes Social WebApp";
let baseFaviconHref = "";
let lastBrowserNotificationSignature = "";
let lastBrowserNotificationTotal = 0;
let lastAudioNotificationSignature = "";
let notificationAudioContext = null;
let notificationAudioUnlocked = false;
let incomingCallRingtoneTimer = null;
let incomingCallRingtoneActive = false;
const CHAT_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const CHAT_EMOJI_PICKER_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
  "😊", "😇", "🙂", "😉", "😍", "😘", "😜", "🤪",
  "😎", "🥳", "🤩", "😋", "😢", "😭", "😡", "😤",
  "👍", "👎", "👏", "🙌", "🙏", "🤝", "💪", "🔥",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💔",
  "✨", "⭐", "🎉", "💯", "✅", "❌", "👀", "💬",
  "🍕", "☕", "🎮", "🎵", "📷", "🖼️", "🚀", "🌙"
];
const chatAvatarCache = {};
let activeReactionMessageId = null;
let activeChatMessageActionId = null;
let activeReplyMessage = null;
let pendingChatMessageAnimationId = null;
let videoCallPeerConnection = null;
let videoCallLocalStream = null;
let currentVideoCallId = null;
let currentVideoCallPeer = null;
let currentVideoCallRole = null;
let currentIncomingVideoCall = null;
let videoCallPollTimer = null;
let incomingVideoCallPollTimer = null;
let videoCallSeenRemoteCandidates = new Set();
let videoCallRemoteDescriptionSet = false;
let videoCallRemoteStream = null;
let videoCallPendingRemoteCandidates = [];
let videoCallHasRemoteVideoTrack = false;
let videoCallRemotePlayRetryTimer = null;
let videoCallMuted = false;
let videoCallCameraOff = false;
let localVideoPreviewDragState = null;
let localVideoPreviewDragSetup = false;
let forceChatScrollToBottomOnNextLoad = false;
let chatSmoothScrollTimer = null;
let chatScrollFrameId = null;
let chatForceBottomUntil = 0;
let bottomNavScrollTimer = null;
let lastBottomNavScrollY = 0;
let bottomNavLockedHidden = false;
const USER_INACTIVITY_LIMIT_MS = 1 * 60 * 1000;
const PRESENCE_PUSH_THROTTLE_MS = 15000;
let lastLocalActivityAt = Date.now();
let lastPresencePushAt = 0;
let isLocallyOnline = false;
let presenceTrackingStarted = false;
let presenceInactivityTimer = null;


function ensureAppFaviconLink() {
  let link = document.getElementById("dynamicFaviconLink");
  if (!link) {
    link = document.querySelector('link[rel="icon"]') || document.createElement("link");
    link.id = "dynamicFaviconLink";
    link.rel = "icon";
    document.head.appendChild(link);
  }

  if (!baseFaviconHref) {
    baseFaviconHref = link.href || createNotificationFavicon(0);
  }

  return link;
}

function createNotificationFavicon(count = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = "#1877f2";
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 32, 34);

  if (count > 0) {
    const label = count > 99 ? "99+" : String(count);
    ctx.fillStyle = "#e41e3f";
    ctx.beginPath();
    ctx.arc(47, 17, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = label.length > 2 ? "bold 13px Arial, sans-serif" : "bold 17px Arial, sans-serif";
    ctx.fillText(label, 47, 17);
  }

  return canvas.toDataURL("image/png");
}

function updateBrowserNotificationIndicator(total = 0) {
  const safeTotal = Math.max(0, Number(total) || 0);
  document.title = safeTotal > 0 ? `(${safeTotal}) ${APP_TITLE}` : APP_TITLE;

  try {
    const link = ensureAppFaviconLink();
    link.href = safeTotal > 0 ? createNotificationFavicon(safeTotal) : (baseFaviconHref || createNotificationFavicon(0));
  } catch (error) {
    console.warn("Could not update browser tab icon", error);
  }
}

function browserNotificationsSupported() {
  return "Notification" in window;
}

function browserNotificationNeedsSecureOrigin() {
  return location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1" && location.protocol !== "file:";
}

function buildSystemNotificationIcon(count = 1) {
  // Windows/Edge/Chrome notifications are more reliable with a larger PNG icon.
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1877f2";
  ctx.beginPath();
  ctx.arc(96, 96, 82, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 88px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 96, 105);

  if (count > 0) {
    const label = count > 99 ? "99+" : String(count);
    ctx.fillStyle = "#e41e3f";
    ctx.beginPath();
    ctx.arc(142, 50, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = label.length > 2 ? "bold 25px Arial, sans-serif" : "bold 34px Arial, sans-serif";
    ctx.fillText(label, 142, 51);
  }

  return canvas.toDataURL("image/png");
}

function showWindowsCompatibleNotification(title, options = {}) {
  if (!browserNotificationsSupported() || Notification.permission !== "granted") return null;

  const safeOptions = {
    body: options.body || "Open Notes Social WebApp to view it.",
    icon: options.icon || buildSystemNotificationIcon(options.count || 1),
    badge: options.badge || buildSystemNotificationIcon(options.count || 1),
    tag: options.tag || `notes-social-webapp-${Date.now()}`,
    renotify: true,
    silent: false,
    requireInteraction: true,
    timestamp: Date.now(),
    data: options.data || {}
  };

  if (navigator.vibrate) navigator.vibrate(options.vibrate || [120, 60, 120]);

  try {
    return new Notification(title || "Notes Social WebApp", safeOptions);
  } catch (error) {
    console.warn("Windows/system notification failed", error);
    return null;
  }
}


const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  browserEnabled: true,
  soundEnabled: true,
  messageRingtone: "ding",
  callRingtone: "classic"
};

function getNotificationSettingsKey() {
  return `notes_social_notification_settings_${currentUser || "guest"}`;
}

function getNotificationSettings() {
  try {
    const raw = localStorage.getItem(getNotificationSettingsKey());
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch (error) {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

function saveNotificationSettings(settings = {}) {
  const merged = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };
  localStorage.setItem(getNotificationSettingsKey(), JSON.stringify(merged));
  renderNotificationSettingsUI();
  if (!merged.enabled) {
    stopIncomingCallRingtone();
    renderNotificationBar([]);
  } else {
    scanNotifications();
  }
  return merged;
}

function notificationAlertsEnabled() {
  return !!getNotificationSettings().enabled;
}

function notificationSoundsEnabled() {
  const settings = getNotificationSettings();
  return !!(settings.enabled && settings.soundEnabled);
}

function renderNotificationSettingsUI() {
  const settings = getNotificationSettings();
  const enabledToggle = document.getElementById("notificationsEnabledToggle");
  const browserToggle = document.getElementById("browserNotificationsToggle");
  const soundsToggle = document.getElementById("notificationSoundsToggle");
  const messageSelect = document.getElementById("messageRingtoneSelect");
  const callSelect = document.getElementById("callRingtoneSelect");
  const pill = document.getElementById("notificationStatusPill");
  const headerBtn = document.getElementById("notificationSettingsHeaderBtn");

  if (enabledToggle) enabledToggle.checked = !!settings.enabled;
  if (browserToggle) browserToggle.checked = !!settings.browserEnabled;
  if (soundsToggle) soundsToggle.checked = !!settings.soundEnabled;
  if (messageSelect) messageSelect.value = settings.messageRingtone || DEFAULT_NOTIFICATION_SETTINGS.messageRingtone;
  if (callSelect) callSelect.value = settings.callRingtone || DEFAULT_NOTIFICATION_SETTINGS.callRingtone;

  if (pill) {
    pill.textContent = settings.enabled ? "On" : "Off";
    pill.classList.toggle("is-off", !settings.enabled);
  }

  if (headerBtn) {
    headerBtn.textContent = settings.enabled ? "🔔" : "🔕";
    headerBtn.title = settings.enabled ? "Notification Settings" : "Notifications are off";
  }
}

function saveNotificationSettingsFromUI() {
  const enabledToggle = document.getElementById("notificationsEnabledToggle");
  const browserToggle = document.getElementById("browserNotificationsToggle");
  const soundsToggle = document.getElementById("notificationSoundsToggle");
  const messageSelect = document.getElementById("messageRingtoneSelect");
  const callSelect = document.getElementById("callRingtoneSelect");

  const settings = saveNotificationSettings({
    enabled: enabledToggle ? enabledToggle.checked : true,
    browserEnabled: browserToggle ? browserToggle.checked : true,
    soundEnabled: soundsToggle ? soundsToggle.checked : true,
    messageRingtone: messageSelect ? messageSelect.value : "ding",
    callRingtone: callSelect ? callSelect.value : "classic"
  });

  unlockNotificationAudio();
  showToast(settings.enabled ? "Notifications are on." : "Notifications are off.");
}

function openNotificationSettings() {
  const settingsPanel = document.getElementById("notificationSettingsCard");
  renderNotificationSettingsUI();
  if (settingsPanel) {
    switchView("friends");
    setTimeout(() => settingsPanel.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  } else {
    showCustomAlert("Open Friends > Settings to change notification and ringtone preferences.", "Notification Settings");
  }
}

function unlockNotificationAudio() {
  if (notificationAudioUnlocked) return true;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    notificationAudioContext = notificationAudioContext || new AudioContextClass();
    if (notificationAudioContext.state === "suspended") notificationAudioContext.resume();
    notificationAudioUnlocked = true;
    return true;
  } catch (error) {
    console.warn("Notification audio could not be unlocked", error);
    return false;
  }
}

function playTone(frequency = 880, duration = 0.16, startOffset = 0, volume = 0.08) {
  if (!notificationSoundsEnabled()) return;
  unlockNotificationAudio();
  const ctx = notificationAudioContext;
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + startOffset);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + startOffset + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(ctx.currentTime + startOffset);
  oscillator.stop(ctx.currentTime + startOffset + duration + 0.03);
}

function playNotificationSound(kind = "message", overrideRingtone = "") {
  if (!notificationSoundsEnabled()) return;

  const settings = getNotificationSettings();
  const ringtone = overrideRingtone || (kind === "call" ? settings.callRingtone : settings.messageRingtone);
  const patterns = {
    ding: [[880, 0.12, 0], [1175, 0.12, 0.14]],
    pop: [[520, 0.09, 0], [760, 0.08, 0.1]],
    chime: [[659, 0.14, 0], [880, 0.14, 0.16], [1046, 0.18, 0.33]],
    classic: [[784, 0.18, 0], [988, 0.18, 0.22], [784, 0.18, 0.48], [988, 0.18, 0.7]],
    pulse: [[660, 0.16, 0], [660, 0.16, 0.28], [660, 0.16, 0.56]],
    urgent: [[932, 0.12, 0], [932, 0.12, 0.18], [932, 0.12, 0.36], [740, 0.18, 0.58]]
  };

  (patterns[ringtone] || patterns.ding).forEach(([frequency, duration, offset]) => {
    playTone(frequency, duration, offset, kind === "call" ? 0.09 : 0.07);
  });
}

function testMessageRingtone() {
  unlockNotificationAudio();
  playNotificationSound("message");
}

function testCallRingtone() {
  unlockNotificationAudio();
  playNotificationSound("call");
}

function startIncomingCallRingtone() {
  if (!notificationSoundsEnabled() || incomingCallRingtoneActive) return;
  incomingCallRingtoneActive = true;
  playNotificationSound("call");
  incomingCallRingtoneTimer = setInterval(() => {
    if (!incomingCallRingtoneActive || !notificationSoundsEnabled()) {
      stopIncomingCallRingtone();
      return;
    }
    playNotificationSound("call");
  }, 2600);
}

function stopIncomingCallRingtone() {
  incomingCallRingtoneActive = false;
  clearInterval(incomingCallRingtoneTimer);
  incomingCallRingtoneTimer = null;
}

function playNotificationSoundForItems(items = [], total = 0, signature = "") {
  if (!notificationSoundsEnabled() || !items.length || !total || !signature || signature === lastAudioNotificationSignature) return;
  lastAudioNotificationSignature = signature;
  const hasChatMessage = items.some(item => item.type === "chat" || item.type === "groupChat");
  if (hasChatMessage) playNotificationSound("message");
}

function showTestSystemNotification() {
  const notice = showWindowsCompatibleNotification("Notes Social WebApp", {
    body: "System notifications are enabled. New chats, likes, and comments should appear here.",
    count: 1,
    tag: "notes-social-webapp-test",
    data: { test: true }
  });

  if (!notice) {
    showCustomAlert("The browser accepted the request, but the system notification could not be shown. Check Windows Settings > System > Notifications and make sure notifications are enabled for this browser.", "Notification Test Failed");
    return;
  }

  notice.onclick = () => {
    window.focus();
    notice.close();
  };
}

function getBrowserNotificationPromptKey() {
  return `notes_social_browser_notifications_prompted_${currentUser || "guest"}`;
}

async function requestBrowserNotificationPermission() {
  if (!browserNotificationsSupported()) {
    showCustomAlert("This browser does not support system notifications. The tab title badge will still work.", "Notifications");
    return false;
  }

  if (browserNotificationNeedsSecureOrigin()) {
    showCustomAlert("System notifications usually require HTTPS or localhost. The tab title badge will still work on this page, but Windows notifications may be blocked by the browser.", "Secure Site Needed");
    return false;
  }

  if (Notification.permission === "granted") {
    showTestSystemNotification();
    return true;
  }

  if (Notification.permission === "denied") {
    showCustomAlert("Notifications are blocked for this site. In Chrome/Edge, click the lock/tune icon beside the address bar, open Site settings, and set Notifications to Allow. Also check Windows Settings > System > Notifications for your browser.", "Notifications Blocked");
    return false;
  }

  try {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      showTestSystemNotification();
      return true;
    }

    showCustomAlert("Notifications were not allowed. The browser tab badge will still work, but Windows notifications will not appear until permission is allowed.", "Notifications Not Allowed");
    return false;
  } catch (error) {
    console.warn("Notification permission request failed", error);
    return false;
  }
}

function promptForBrowserNotificationsOnce() {
  if (!currentUser || !browserNotificationsSupported() || Notification.permission !== "default") return;

  const promptKey = getBrowserNotificationPromptKey();
  if (localStorage.getItem(promptKey)) return;
  localStorage.setItem(promptKey, "true");

  showCustomConfirm(
    "Allow this website to show desktop/mobile system notifications for new chats, likes, and comments? Your browser will ask for permission next.",
    () => requestBrowserNotificationPermission(),
    "Allow Notifications?"
  );
}

function showBrowserNotificationSummary(items = [], total = 0, signature = "") {
  const settings = getNotificationSettings();
  if (!settings.enabled || !settings.browserEnabled) return;
  if (!browserNotificationsSupported() || Notification.permission !== "granted") return;
  if (!items.length || !total || !signature || signature === lastBrowserNotificationSignature) return;

  lastBrowserNotificationSignature = signature;
  const first = items[0] || {};
  const title = total === 1 ? (first.title || "New notification") : `${total} new notifications`;
  const body = total === 1
    ? (first.text || "Open Notes Social WebApp to view it.")
    : (first.text ? `${first.text} +${total - 1} more` : "Open Notes Social WebApp to view them.");

  const notice = showWindowsCompatibleNotification(title, {
    body,
    tag: `notes-social-webapp-${signature.slice(0, 80)}`,
    count: total,
    vibrate: [120, 60, 120],
    data: { notificationIndex: 0 }
  });

  if (notice) {
    notice.onclick = () => {
      window.focus();
      notice.close();
      if (notificationItems && notificationItems.length) {
        openNotificationItem(0);
      }
    };
  }
}

function setBottomNavHidden(isHidden) {
  document.body.classList.toggle("nav-hidden", !!isHidden);
}

function toggleBottomNav() {
  setBottomNavHidden(!document.body.classList.contains("nav-hidden"));
}

function shouldAutoShowBottomNav() {
  return currentUser && !bottomNavLockedHidden && !currentChatUser && !document.body.classList.contains("form-modal-open");
}

function hideBottomNavForModal() {
  bottomNavLockedHidden = true;
  clearTimeout(bottomNavScrollTimer);
  setBottomNavHidden(true);
}

function releaseBottomNavFromModal() {
  bottomNavLockedHidden = false;
  if (!currentChatUser && !document.body.classList.contains("form-modal-open")) {
    setBottomNavHidden(false);
  }
}

function setupAutoHideBottomNav() {
  lastBottomNavScrollY = window.scrollY || document.documentElement.scrollTop || 0;

  window.addEventListener("scroll", () => {
    if (!currentUser || bottomNavLockedHidden || currentChatUser || document.body.classList.contains("form-modal-open")) return;

    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const moved = Math.abs(currentScrollY - lastBottomNavScrollY);

    if (moved > 6) {
      setBottomNavHidden(true);
      clearTimeout(bottomNavScrollTimer);
      bottomNavScrollTimer = setTimeout(() => {
        if (shouldAutoShowBottomNav()) setBottomNavHidden(false);
      }, 850);
    }

    lastBottomNavScrollY = currentScrollY;
  }, { passive: true });
}

document.addEventListener("DOMContentLoaded", () => {
  setBottomNavHidden(false);
  setupAutoHideBottomNav();
  updateBrowserNotificationIndicator(0);
  renderNotificationSettingsUI();
  renderChatEmojiPicker();
  initializeSavedLoginView();
  startIncomingVideoCallWatcher();
});

["click", "touchstart", "keydown"].forEach(eventName => {
  window.addEventListener(eventName, unlockNotificationAudio, { once: true, passive: true });
});

// Chat photo upload and text media support uses the user's camera/album plus normal message text.

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function linkifyText(text) {
  const escaped = escapeHTML(text);
  return escaped
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">$1</a>')
    .replace(/(^|[^\/])(www\.[^\s<]+)/gi, (match, prefix, url) => `${prefix}<a href="https://${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${url}</a>`);
}

function renderNoteText(text) {
  return `<div class="note-text">${linkifyText(String(text || ""))}</div>`;
}

function normalizeTags(value) {
  return String(value || "")
    .split(",")
    .map(tag => tag.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

function renderNoteBadges(note = {}) {
  const badges = [];
  if (note.priority && note.priority !== "normal") badges.push(`<span class="note-badge ${note.priority === "important" ? "important" : ""}">${escapeHTML(note.priority)}</span>`);
  if (note.privacy === "private") badges.push(`<span class="note-badge">🔒 Private</span>`);
  (note.tags || []).forEach(tag => badges.push(`<span class="note-badge">#${escapeHTML(tag)}</span>`));
  return badges.length ? `<div class="note-badges">${badges.join("")}</div>` : "";
}

function getNoteAccentClass(note = {}) {
  return note.privacy === "private" ? "note-accent-private" : "note-accent-public";
}

function showToast(message, type = "info") {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const toast = document.createElement("div");
  toast.className = `toast-item ${type === "danger" ? "danger" : ""}`;
  toast.textContent = message;
  const id = `toast-${++toastCounter}`;
  toast.id = id;
  stack.appendChild(toast);
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(-8px)";
      setTimeout(() => el.remove(), 250);
    }
  }, 2600);
}

function setFeedMode(mode) {
  feedMode = mode;
  ["all", "saved", "mine"].forEach(key => {
    const btn = document.getElementById(`mode${key.charAt(0).toUpperCase()+key.slice(1)}Btn`);
    if (btn) btn.classList.toggle("active", key === mode);
  });
  loadFeed();
}

function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  const maxHeight = Number.parseInt(getComputedStyle(el).maxHeight, 10) || 180;
  el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
}

function setupAutoResizeTextareas() {
  ["noteInput", "profileNoteInput", "chatInput", "modalCommentInput", "editNoteTextInput"].forEach(id => {
    const el = document.getElementById(id);
    if (el) autoResizeTextarea(el);
  });
}

function buildNoteCopyText(note) {
  const title = (note && note.title ? String(note.title).trim() : "");
  const text = (note && note.text ? String(note.text).trim() : "");
  const parts = [];

  if (title) parts.push(title);
  if (text) parts.push(text);

  return parts.join("\n\n");
}

async function copyTextToClipboard(text, successMessage = "Copied to clipboard.") {
  const value = String(text || "").trim();

  if (!value) {
    showCustomAlert("There is no text to copy yet.", "Nothing to Copy");
    return false;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      const tempTextArea = document.createElement("textarea");
      tempTextArea.value = value;
      tempTextArea.setAttribute("readonly", "");
      tempTextArea.style.position = "fixed";
      tempTextArea.style.left = "-9999px";
      tempTextArea.style.top = "-9999px";
      document.body.appendChild(tempTextArea);
      tempTextArea.focus();
      tempTextArea.select();
      document.execCommand("copy");
      document.body.removeChild(tempTextArea);
    }

    showCustomAlert(successMessage, "Copied");
    return true;
  } catch (error) {
    showCustomAlert("Copy failed. Please select the text and copy it manually.", "Copy Failed");
    return false;
  }
}

function showCopyFeedback(source, message) {
  const feedback = document.getElementById(source === "profile" ? "profileCopyFeedback" : "feedCopyFeedback");
  if (!feedback) return;

  feedback.innerText = message;
  setTimeout(() => {
    if (feedback.innerText === message) feedback.innerText = "";
  }, 1800);
}

function copyDraftNote(source = "feed") {
  const fields = getCreateNoteFields(source);
  const title = fields.titleInput ? fields.titleInput.value.trim() : "";
  const text = fields.textInput ? fields.textInput.value.trim() : "";
  const copyValue = buildNoteCopyText({ title, text });

  if (!copyValue) {
    showCopyFeedback(source, "Nothing to copy yet.");
    showCustomAlert("Write a title or note first before copying.", "Nothing to Copy");
    return;
  }

  copyTextToClipboard(copyValue, "Your draft note has been copied.").then((copied) => {
    if (copied) showCopyFeedback(source, "Draft copied.");
  });
}

async function copyNotePost(id, event) {
  if (event) event.stopPropagation();

  let r = await fetch(DB_URL+`/notes/${id}.json`);
  let note = await r.json();

  if (!note) {
    showCustomAlert("This note no longer exists.", "Copy Failed");
    return;
  }

  await copyTextToClipboard(buildNoteCopyText(note), "The note post has been copied.");
}

async function copyActiveModalNote(event) {
  if (event) event.stopPropagation();
  if (!currentActiveNoteId) return;
  await copyNotePost(currentActiveNoteId, event);
}

async function copySubNoteText(text, event) {
  if (event) event.stopPropagation();
  await copyTextToClipboard(text || "", "The subnote has been copied.");
}

async function openEditNoteModal(id, event) {
  if (event) event.stopPropagation();

  let r = await fetch(DB_URL+`/notes/${id}.json`);
  let note = await r.json();

  if (!note) {
    showCustomAlert("This note no longer exists.", "Edit Failed");
    return;
  }

  if (note.owner !== currentUser) {
    showCustomAlert("You can only edit your own note posts.", "Edit Not Allowed");
    return;
  }

  currentEditingNoteId = id;
  document.getElementById("editNoteTitleInput").value = note.title || "";
  document.getElementById("editNoteTextInput").value = note.text || "";
  document.getElementById("editNoteTagsInput").value = (note.tags || []).join(", ");
  document.getElementById("editNotePriorityInput").value = note.priority || "normal";
  document.getElementById("editNoteColorInput").value = note.color || "default";

  const privacy = note.privacy || "public";
  document.querySelectorAll('input[name="editPrivacy"]').forEach(input => {
    input.checked = input.value === privacy;
  });

  editNoteModal.style.display = "flex";
  autoResizeTextarea(document.getElementById("editNoteTextInput"));
  setTimeout(() => document.getElementById("editNoteTitleInput").focus(), 50);
}

function closeEditNoteModal() {
  editNoteModal.style.display = "none";
  currentEditingNoteId = null;
}

async function saveEditedNote() {
  if (!currentEditingNoteId) return;

  const title = document.getElementById("editNoteTitleInput").value.trim();
  const text = document.getElementById("editNoteTextInput").value.trim();
  const privacyInput = document.querySelector('input[name="editPrivacy"]:checked');
  const privacy = privacyInput ? privacyInput.value : "public";
  const tags = normalizeTags(document.getElementById("editNoteTagsInput").value);
  const priority = document.getElementById("editNotePriorityInput").value || "normal";
  const color = document.getElementById("editNoteColorInput").value || "default";

  if (!title && !text) {
    showCustomAlert("The edited note cannot be empty.", "Missing Note Content");
    return;
  }

  await fetch(DB_URL+`/notes/${currentEditingNoteId}.json`, {
    method: "PATCH",
    body: JSON.stringify({ title, text, privacy, tags, priority, color, updatedAt: Date.now() })
  });

  const editedId = currentEditingNoteId;
  closeEditNoteModal();

  if (currentActiveNoteId === editedId) {
    currentCommentsStringState = "";
    let r = await fetch(DB_URL+`/notes/${editedId}.json`);
    let updatedNote = await r.json();
    if (updatedNote) {
      modalPostTitle.innerText = updatedNote.title || "";
      modalPostTitle.style.display = updatedNote.title ? "block" : "none";
      modalPostText.innerHTML = linkifyText(updatedNote.text || "");
      syncModalDetails(editedId);
    }
  }

  loadFeed();
  loadProfilePosts();
  showCustomAlert("Your note post has been updated.", "Note Updated");
}


async function openCollaboratorModal(id, event) {
  if (event) event.stopPropagation();

  let r = await fetch(DB_URL+`/notes/${id}.json`);
  let note = await r.json();

  if (!note) {
    showCustomAlert("This note no longer exists.", "Share Failed");
    return;
  }

  if (note.owner !== currentUser) {
    showCustomAlert("Only the post owner can manage collaborators.", "Not Allowed");
    return;
  }

  if ((note.privacy || "public") !== "private") {
    showCustomAlert("Collaborators are only available for private notes.", "Private Notes Only");
    return;
  }

  currentSharingNoteId = id;
  document.getElementById("collaboratorUsernameInput").value = "";
  document.getElementById("collaboratorFeedback").innerText = "";
  renderCollaboratorList(note.sharedWith || {});
  collaboratorModal.style.display = "flex";
  setTimeout(() => document.getElementById("collaboratorUsernameInput").focus(), 50);
}

function closeCollaboratorModal() {
  collaboratorModal.style.display = "none";
  currentSharingNoteId = null;
}

function renderCollaboratorList(sharedWith = {}) {
  const list = document.getElementById("collaboratorList");
  if (!list) return;

  const users = Object.keys(sharedWith || {});
  if (users.length === 0) {
    list.innerHTML = `<div class="collaborator-empty">No collaborators yet.</div>`;
    return;
  }

  list.innerHTML = "";
  users.sort().forEach(username => {
    const row = document.createElement("div");
    row.className = "collaborator-row";

    const name = document.createElement("span");
    name.textContent = `@${username}`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "danger small-action-btn";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => removeCollaborator(username);

    row.appendChild(name);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

async function refreshCollaboratorModal() {
  if (!currentSharingNoteId) return;

  let r = await fetch(DB_URL+`/notes/${currentSharingNoteId}.json`);
  let note = await r.json();
  if (!note) {
    closeCollaboratorModal();
    return;
  }

  renderCollaboratorList(note.sharedWith || {});
}

async function sharePrivateNoteWithUser() {
  if (!currentSharingNoteId) return;

  const input = document.getElementById("collaboratorUsernameInput");
  const feedback = document.getElementById("collaboratorFeedback");
  const username = input.value.trim();

  if (!username) {
    if (feedback) feedback.innerText = "Enter a username first.";
    return;
  }

  if (username === currentUser) {
    if (feedback) feedback.innerText = "You already own this private note.";
    return;
  }

  let userRes = await fetch(DB_URL+`/users/${username}.json`);
  let userData = await userRes.json();
  if (!userData) {
    showCustomAlert("That username does not exist.", "User Not Found");
    return;
  }

  let noteRes = await fetch(DB_URL+`/notes/${currentSharingNoteId}.json`);
  let note = await noteRes.json();
  if (!note || note.owner !== currentUser || (note.privacy || "public") !== "private") {
    showCustomAlert("This private note can no longer be shared.", "Share Failed");
    return;
  }

  await fetch(DB_URL+`/notes/${currentSharingNoteId}/sharedWith/${username}.json`, {
    method: "PUT",
    body: "true"
  });

  input.value = "";
  if (feedback) feedback.innerText = `Shared with @${username}.`;
  await refreshCollaboratorModal();
  loadFeed();
  loadProfilePosts();
  loadFolders();
}

async function removeCollaborator(username) {
  if (!currentSharingNoteId) return;

  showCustomConfirm(`Remove @${username} from this private note?`, async () => {
    await fetch(DB_URL+`/notes/${currentSharingNoteId}/sharedWith/${username}.json`, { method: "DELETE" });
    const feedback = document.getElementById("collaboratorFeedback");
    if (feedback) feedback.innerText = `Removed @${username}.`;
    await refreshCollaboratorModal();
    loadFeed();
    loadProfilePosts();
  }, "Remove Collaborator");
}

let activeFloatingFormState = null;

function ensureFloatingFormModal() {
  let overlay = document.getElementById("floatingFormOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "floatingFormOverlay";
  overlay.className = "form-modal-overlay";
  overlay.onclick = (event) => {
    if (event.target === overlay) closeFloatingFormModal();
  };

  const sheet = document.createElement("div");
  sheet.id = "floatingFormSheet";
  sheet.className = "form-modal-sheet";
  sheet.onclick = (event) => event.stopPropagation();

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  return overlay;
}

function openFloatingFormModal(formId, focusSelector = "input, textarea, select") {
  const form = document.getElementById(formId);
  if (!form) return;

  closeFloatingFormModal(false);

  const overlay = ensureFloatingFormModal();
  const sheet = document.getElementById("floatingFormSheet");
  const placeholder = document.createComment(`${formId}-placeholder`);
  const originalParent = form.parentNode;
  const originalNextSibling = form.nextSibling;

  originalParent.insertBefore(placeholder, form);
  sheet.replaceChildren(form);
  form.classList.remove("hidden");
  overlay.classList.add("show");
  document.body.classList.add("form-modal-open");

  activeFloatingFormState = { form, placeholder, originalParent, originalNextSibling };

  setTimeout(() => {
    const focusTarget = form.querySelector(focusSelector);
    if (focusTarget) focusTarget.focus();
  }, 40);
}

function closeFloatingFormModal(restoreHidden = true) {
  const overlay = document.getElementById("floatingFormOverlay");
  const sheet = document.getElementById("floatingFormSheet");

  if (activeFloatingFormState) {
    const { form, placeholder, originalParent, originalNextSibling } = activeFloatingFormState;
    if (restoreHidden) form.classList.add("hidden");

    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(form, placeholder);
      placeholder.remove();
    } else if (originalParent) {
      originalParent.insertBefore(form, originalNextSibling || null);
    }

    activeFloatingFormState = null;
  }

  if (sheet) sheet.replaceChildren();
  if (overlay) overlay.classList.remove("show");
  document.body.classList.remove("form-modal-open");
}

function toggleCreateNoteForm(source = "feed", forceOpen = null) {
  const formId = source === "profile" ? "profileCreateNoteForm" : "feedCreateNoteForm";
  const form = document.getElementById(formId);
  if (!form) return;

  const isActiveFloatingForm = activeFloatingFormState && activeFloatingFormState.form && activeFloatingFormState.form.id === formId;
  const shouldOpen = forceOpen === null ? !isActiveFloatingForm && form.classList.contains("hidden") : forceOpen;

  if (shouldOpen) {
    openFloatingFormModal(formId, source === "profile" ? "#profileNoteTitleInput" : "#noteTitleInput");
  } else if (isActiveFloatingForm) {
    closeFloatingFormModal(true);
  } else {
    form.classList.add("hidden");
  }
}

function getCreateNoteFields(source = "feed") {
  if (source === "profile") {
    return {
      titleInput: document.getElementById("profileNoteTitleInput"),
      textInput: document.getElementById("profileNoteInput"),
      privacySelector: 'input[name="profilePrivacy"]:checked',
      fileInput: document.getElementById("profileNoteFileElement"),
      previewBox: document.getElementById("profileFilePreviewBox"),
      previewImg: document.getElementById("profileFilePreviewImg"),
      previewInfo: document.getElementById("profileFilePreviewInfo"),
      tagsInput: document.getElementById("profileNoteTagsInput"),
      priorityInput: document.getElementById("profileNotePriorityInput"),
      colorInput: document.getElementById("profileNoteColorInput")
    };
  }

  return {
    titleInput: document.getElementById("noteTitleInput"),
    textInput: document.getElementById("noteInput"),
    privacySelector: 'input[name="feedPrivacy"]:checked',
    fileInput: document.getElementById("noteFileElement"),
    previewBox: document.getElementById("filePreviewBox"),
    previewImg: document.getElementById("filePreviewImg"),
    previewInfo: document.getElementById("filePreviewInfo"),
    tagsInput: document.getElementById("noteTagsInput"),
    priorityInput: document.getElementById("notePriorityInput"),
    colorInput: document.getElementById("noteColorInput")
  };
}


// --- CUSTOM MODAL HANDLERS ---
function showCustomAlert(msg, title = "Notification", onCloseCallback = null) {
  const overlay = document.getElementById('customAppModal');
  document.getElementById('customModalTitle').innerText = title;
  document.getElementById('customModalMsg').innerText = msg;
  
  // Attach the callback dynamically to the OK button window
  document.getElementById('customModalActions').innerHTML = `<button id="customAlertOkBtn">OK</button>`;
  
  document.getElementById('customAlertOkBtn').onclick = function() {
    closeCustomModal();
    if (typeof onCloseCallback === 'function') {
      onCloseCallback();
    }
  };
  
  overlay.classList.add('show');
}

function showCustomConfirm(msg, onConfirm, title = "Please Confirm") {
  const overlay = document.getElementById('customAppModal');
  document.getElementById('customModalTitle').innerText = title;
  document.getElementById('customModalMsg').innerText = msg;
  document.getElementById('customModalActions').innerHTML = `
    <button class="secondary" onclick="closeCustomModal()">Cancel</button>
    <button class="danger" onclick="closeCustomModal(); executeConfirmCallback()">Confirm</button>
  `;
  window.pendingConfirmCallback = onConfirm; // Store temporarily
  overlay.classList.add('show');
}

function closeCustomModal() {
  document.getElementById('customAppModal').classList.remove('show');
}

function executeConfirmCallback() {
  if (typeof window.pendingConfirmCallback === 'function') {
    window.pendingConfirmCallback();
    window.pendingConfirmCallback = null;
  }
}
// -----------------------------

// INITIALIZE THEME
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  document.getElementById('themeToggleBtn').innerText = '☀️';
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    document.getElementById('themeToggleBtn').innerText = '🌙';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    document.getElementById('themeToggleBtn').innerText = '☀️';
  }
}

// MANUAL REFRESH FUNCTION
function manualRefresh() {
  if (!currentUser) return;
  loadAll();
  if (currentActiveNoteId) {
    syncModalDetails(currentActiveNoteId);
  }
  let refreshBtn = document.querySelector('.refresh-btn');
  refreshBtn.style.transform = 'rotate(360deg)';
  refreshBtn.style.transition = 'transform 0.5s ease';
  setTimeout(() => {
    refreshBtn.style.transform = 'none';
    refreshBtn.style.transition = 'none';
  }, 500);
}

// TAB MANAGEMENT VIEW SWAPPING
function switchView(viewId, btnToken) {
  // Reset animation states dynamically to trigger slide-in properly
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.style.animation = 'none'; 
    panel.offsetHeight; // trigger reflow
    panel.style.animation = null; 
    panel.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
  
  document.getElementById(`view-${viewId}`).classList.add('active');
  if (btnToken) btnToken.classList.add('active');
  window.scrollTo({ top: 0, behavior: "smooth" });
  
  if (!bottomNavLockedHidden && viewId !== 'messages') setBottomNavHidden(false);
  if(viewId === 'feed') loadFeed();
  if(viewId === 'friends') { loadFriends(); loadRequests(); }
  if(viewId === 'messages') loadChatFriends();
  if(viewId === 'profile') { loadProfilePosts(); loadFolders(); loadProfileBio(); loadHiddenPostsList(); updateDashboardStats(); }
}

function toggleFilterForm(forceShow = null) {
  const form = document.getElementById("filterStreamForm");
  if (!form) return;

  const isActiveFloatingForm = activeFloatingFormState && activeFloatingFormState.form && activeFloatingFormState.form.id === "filterStreamForm";
  const shouldShow = forceShow === null ? !isActiveFloatingForm && form.classList.contains("hidden") : forceShow;

  if (shouldShow) {
    openFloatingFormModal("filterStreamForm", "#filterName");
  } else if (isActiveFloatingForm) {
    closeFloatingFormModal(true);
  } else {
    form.classList.add("hidden");
  }
}

function clearFeedFilters() {
  const nameInput = document.getElementById("filterName");
  const dateInput = document.getElementById("filterDate");
  const tagInput = document.getElementById("filterTag");
  const priorityInput = document.getElementById("filterPriority");
  const globalInput = document.getElementById("globalSearchInput");
  if (nameInput) nameInput.value = "";
  if (dateInput) dateInput.value = "";
  if (tagInput) tagInput.value = "";
  if (priorityInput) priorityInput.value = "";
  if (globalInput) globalInput.value = "";
  loadFeed();
  toggleFilterForm(false);
}

// FILE PROCESSING AND ENFORCEMENT RULES
const NOTE_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

function formatFileSize(bytes = 0) {
  const size = Number(bytes) || 0;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function getDataUrlMimeType(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:([^;,]+)[;,]/i);
  return match ? match[1] : "";
}

function normalizeAttachment(attachment) {
  if (!attachment) return null;

  // Backward-compatible support for older notes that stored only an image data URL string.
  if (typeof attachment === "string") {
    return {
      dataUrl: attachment,
      name: getDataUrlMimeType(attachment).startsWith("image/") ? "Image attachment" : "Attachment",
      type: getDataUrlMimeType(attachment),
      size: 0
    };
  }

  if (attachment.dataUrl) return attachment;
  return null;
}

function isImageAttachment(attachment) {
  const normalized = normalizeAttachment(attachment);
  if (!normalized) return false;
  const type = normalized.type || getDataUrlMimeType(normalized.dataUrl);
  return String(type || "").startsWith("image/") || String(normalized.dataUrl || "").startsWith("data:image/");
}

function getAttachmentIcon(type = "", name = "") {
  const lowerType = String(type || "").toLowerCase();
  const lowerName = String(name || "").toLowerCase();
  if (lowerType.includes("pdf") || lowerName.endsWith(".pdf")) return "📄";
  if (lowerType.includes("word") || /\.(doc|docx)$/i.test(lowerName)) return "📝";
  if (lowerType.includes("excel") || lowerType.includes("spreadsheet") || /\.(xls|xlsx|csv)$/i.test(lowerName)) return "📊";
  if (lowerType.includes("zip") || /\.(zip|rar|7z)$/i.test(lowerName)) return "🗜️";
  if (lowerType.startsWith("audio/")) return "🎵";
  if (lowerType.startsWith("video/")) return "🎬";
  return "📎";
}

function renderAttachmentHtml(attachmentValue, context = "feed") {
  const attachment = normalizeAttachment(attachmentValue);
  if (!attachment || !attachment.dataUrl) return "";

  const name = attachment.name || "Attachment";
  const type = attachment.type || getDataUrlMimeType(attachment.dataUrl) || "File";
  const size = attachment.size ? formatFileSize(attachment.size) : "";
  const safeName = escapeHTML(name);
  const safeType = escapeHTML(type);
  const safeSize = escapeHTML(size);
  const safeDataUrl = escapeHTML(attachment.dataUrl);

  if (isImageAttachment(attachment)) {
    return `<img src="${safeDataUrl}" class="attached-media" alt="${safeName}">`;
  }

  const label = `${safeType}${size ? ` • ${safeSize}` : ""}`;
  return `
    <a class="attachment-file-card" href="${safeDataUrl}" download="${safeName}" onclick="event.stopPropagation()">
      <span class="attachment-file-icon">${getAttachmentIcon(type, name)}</span>
      <span class="attachment-file-details">
        <span class="attachment-file-name">${safeName}</span>
        <span class="attachment-file-meta">${escapeHTML(label)}</span>
      </span>
      <span class="attachment-file-download">Download</span>
    </a>
  `;
}

function previewAttachedFile(event, source = "feed") {
  const input = event && event.target ? event.target : null;
  const file = input && input.files ? input.files[0] : null;
  if (!file) return;

  if (file.size > NOTE_ATTACHMENT_MAX_BYTES) {
    showCustomAlert(`This file is ${formatFileSize(file.size)}. Please upload a file up to ${formatFileSize(NOTE_ATTACHMENT_MAX_BYTES)}.`, "File Too Large");
    clearAttachedFile(null, source);
    return;
  }

  const fields = getCreateNoteFields(source);
  const reader = new FileReader();
  reader.onload = function(e) {
    const attachment = {
      dataUrl: e.target.result,
      name: file.name || "Attachment",
      type: file.type || "application/octet-stream",
      size: file.size || 0,
      uploadedAt: Date.now()
    };

    currentAttachedFileBase64[source] = attachment;

    if (fields.previewImg) {
      if (isImageAttachment(attachment)) {
        fields.previewImg.src = attachment.dataUrl;
        fields.previewImg.style.display = "block";
      } else {
        fields.previewImg.src = "";
        fields.previewImg.style.display = "none";
      }
    }

    if (fields.previewInfo) {
      fields.previewInfo.innerHTML = `
        <b>${getAttachmentIcon(attachment.type, attachment.name)} ${escapeHTML(attachment.name)}</b>
        <span>${escapeHTML(attachment.type || "File")} • ${escapeHTML(formatFileSize(attachment.size))}</span>
      `;
    }

    if (fields.previewBox) fields.previewBox.style.display = "flex";
  };
  reader.onerror = function() {
    showCustomAlert("This file could not be read. Please try another file.", "Attachment Failed");
    clearAttachedFile(null, source);
  };
  reader.readAsDataURL(file);
}

function clearAttachedFile(event, source = "feed") {
  if(event) event.preventDefault();
  const fields = getCreateNoteFields(source);
  currentAttachedFileBase64[source] = null;
  if (fields.fileInput) fields.fileInput.value = "";
  if (fields.previewBox) fields.previewBox.style.display = "none";
  if (fields.previewImg) {
    fields.previewImg.src = "";
    fields.previewImg.style.display = "block";
  }
  if (fields.previewInfo) fields.previewInfo.innerHTML = "";
}

// AUTHENTICATION
// SAVED LOGIN FEATURE
// Stores only the username locally so the app can reopen the same session after refresh.
// Passwords are not saved in localStorage.
const SAVED_LOGIN_KEY = "notes_social_saved_login_user";

function rememberSavedLogin(username) {
  if (!username) return;
  localStorage.setItem(SAVED_LOGIN_KEY, username);
}

function forgetSavedLogin() {
  localStorage.removeItem(SAVED_LOGIN_KEY);
}

function getSavedLoginUsername() {
  return localStorage.getItem(SAVED_LOGIN_KEY) || "";
}

async function finishLogin(u, d) {
  currentUser=u;
  auth.style.display="none";
  app.style.display="block";

  userDisplay.innerText=d.displayName||u;
  changeUsernameInput.value=d.displayName||u;
  avatar.innerText=d.avatar||"😀";
  if (document.getElementById("profileAvatar")) profileAvatar.innerText = d.avatar || "😀";
  if (document.getElementById("profileDisplayName")) profileDisplayName.innerText = d.displayName || u;
  if (document.getElementById("profileUsername")) profileUsername.innerText = `@${u}`;

  startPresenceTracking();
  await ensureCurrentUserPresenceFields();
  markUserActive(true);
  renderNotificationSettingsUI();
  loadAll();
  loadProfileBio();
  updateDashboardStats();
  promptForBrowserNotificationsOnce();
}

function promptToSaveLogin(u, d) {
  const overlay = document.getElementById('customAppModal');
  document.getElementById('customModalTitle').innerText = "Save Login?";
  document.getElementById('customModalMsg').innerText = `Welcome back, ${d.displayName || u}!\n\nDo you want to save this login on this device so you do not need to log in again after refreshing the site?`;
  document.getElementById('customModalActions').innerHTML = `
    <button class="secondary" id="saveLoginNoBtn">No</button>
    <button id="saveLoginYesBtn">Yes, Save</button>
  `;

  document.getElementById('saveLoginNoBtn').onclick = async function() {
    forgetSavedLogin();
    closeCustomModal();
    await finishLogin(u, d);
  };

  document.getElementById('saveLoginYesBtn').onclick = async function() {
    rememberSavedLogin(u);
    closeCustomModal();
    await finishLogin(u, d);
  };

  overlay.classList.add('show');
}

async function restoreSavedLogin() {
  const savedUsername = getSavedLoginUsername();
  if (!savedUsername || currentUser) return false;

  try {
    let r = await fetch(DB_URL+"/users/"+savedUsername+".json");
    let d = await r.json();

    if (!d) {
      forgetSavedLogin();
      return false;
    }

    await finishLogin(savedUsername, d);
    return true;
  } catch (error) {
    console.warn("Saved login restore failed", error);
    return false;
  }
}

async function initializeSavedLoginView() {
  const savedUsername = getSavedLoginUsername();

  // Keep the login card hidden while checking a saved login. This prevents the
  // login portal from flashing for a moment before the Feed opens on refresh.
  if (savedUsername) {
    auth.style.display = "none";
    app.style.display = "none";

    const restored = await restoreSavedLogin();
    if (restored) return;
  }

  if (!currentUser) {
    auth.style.display = "block";
    app.style.display = "none";
  }
}

async function signup(){
  const disp = (document.getElementById('signupDisplayName')||{}).value?.trim();
  const u = (document.getElementById('signupUsername')||{}).value?.trim();
  const p = (document.getElementById('signupPassword')||{}).value?.trim();
  const c = (document.getElementById('signupConfirm')||{}).value?.trim();

  if(!u||!p||!c) return showCustomAlert("Please fill in all signup fields.", "Missing Info");
  if(p !== c) return showCustomAlert("Passwords do not match.", "Validation Error");

  let r=await fetch(DB_URL+"/users/"+u+".json");
  if(await r.json()) return showCustomAlert("This username is already taken. Try another.", "Account Exists");

  await fetch(DB_URL+"/users/"+u+".json",{
    method:"PUT",
    body:JSON.stringify({password:p,avatar:"😀",displayName: disp || u})
  });

  // After creating account, switch back to login view and clear signup inputs after OK
  showCustomAlert("Your account has been created successfully! You can now log in.", "Success", () => {
    document.getElementById('signupDisplayName').value = "";
    document.getElementById('signupUsername').value = "";
    document.getElementById('signupPassword').value = "";
    document.getElementById('signupConfirm').value = "";
    showAuthTab('login');
  });
}

function showAuthTab(tab = 'login'){
  const loginView = document.getElementById('loginView');
  const signupView = document.getElementById('signupView');
  const loginBtn = document.getElementById('loginTabBtn');
  const signupBtn = document.getElementById('signupTabBtn');

  if(tab === 'signup'){
    if(loginView) loginView.classList.add('hidden');
    if(signupView) signupView.classList.remove('hidden');
    if(loginBtn) loginBtn.classList.remove('active');
    if(signupBtn) signupBtn.classList.add('active');
  } else {
    if(loginView) loginView.classList.remove('hidden');
    if(signupView) signupView.classList.add('hidden');
    if(loginBtn) loginBtn.classList.add('active');
    if(signupBtn) signupBtn.classList.remove('active');
  }
}

async function login(){
  let u=username.value.trim(), p=password.value.trim();
  if(!u||!p) return showCustomAlert("Please enter your username and password.", "Missing Info");

  let r=await fetch(DB_URL+"/users/"+u+".json");
  let d=await r.json();

  if(!d) return showCustomAlert("Account not found. Please check your username.", "Login Failed");
  if(d.password!==p) return showCustomAlert("Incorrect password provided.", "Login Failed");

  // Saved login prompt: user can choose whether this device should stay logged in after refresh.
  promptToSaveLogin(u, d);
}

// ONLINE / ACTIVITY PRESENCE
function formatPresenceAgo(lastActiveAt) {
  const timestamp = Number(lastActiveAt) || 0;
  if (!timestamp) return "Offline";

  const diffMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `Offline ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Offline ${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  return `Offline ${days} ${days === 1 ? "day" : "days"} ago`;
}

function getPresenceInfo(userData = {}) {
  const lastActiveAt = Number(userData.lastActiveAt || 0);
  const lastOfflineAt = Number(userData.lastOfflineAt || 0);
  const presenceTimestamp = lastActiveAt || lastOfflineAt;

  // New and migrated accounts use lastActiveAt as the source of truth.
  // Very old accounts may only have online:true, so keep that legacy fallback
  // until they open the updated app and receive lastActiveAt automatically.
  const hasRecentActivity = lastActiveAt > 0 && (Date.now() - lastActiveAt) < USER_INACTIVITY_LIMIT_MS;
  const legacyOnlineWithoutTimestamp = !lastActiveAt && userData.online === true;
  const isActiveNow = hasRecentActivity || legacyOnlineWithoutTimestamp;

  return {
    online: isActiveNow,
    label: isActiveNow ? "● Online" : `● ${formatPresenceAgo(presenceTimestamp)}`
  };
}

async function ensureCurrentUserPresenceFields() {
  if (!currentUser) return;

  try {
    // Always refresh these fields on login/app start, not only when missing.
    // This fixes legacy accounts whose old online:false value or stale timestamp
    // prevented the new activity-based presence from showing correctly.
    const now = Date.now();
    lastLocalActivityAt = now;
    isLocallyOnline = true;
    lastPresencePushAt = now;

    await fetch(DB_URL+`/users/${currentUser}.json`, {
      method: "PATCH",
      body: JSON.stringify({ online: true, lastActiveAt: now, lastOfflineAt: null })
    });
  } catch (error) {
    console.warn("Presence migration failed", error);
  }
}

async function setOnline(status, activeAt = Date.now()) {
  if (!currentUser) return;

  isLocallyOnline = !!status;
  lastPresencePushAt = Date.now();

  const payload = status
    ? { online: true, lastActiveAt: activeAt }
    : { online: false, lastActiveAt: activeAt, lastOfflineAt: Date.now() };

  await fetch(DB_URL+`/users/${currentUser}.json`,{
    method:"PATCH",
    body:JSON.stringify(payload)
  });
}

function markUserActive(forcePush = false) {
  if (!currentUser) return;

  lastLocalActivityAt = Date.now();
  const shouldPush = forcePush || !isLocallyOnline || (Date.now() - lastPresencePushAt) >= PRESENCE_PUSH_THROTTLE_MS;

  if (shouldPush) {
    setOnline(true, lastLocalActivityAt).catch(error => console.warn("Presence update failed", error));
  }
}

function startPresenceTracking() {
  if (presenceTrackingStarted) return;
  presenceTrackingStarted = true;

  const activityEvents = ["click", "keydown", "mousemove", "touchstart", "scroll", "input"];
  activityEvents.forEach(eventName => {
    window.addEventListener(eventName, () => markUserActive(false), { passive: true });
  });

  presenceInactivityTimer = setInterval(() => {
    if (!currentUser || !isLocallyOnline) return;

    if (Date.now() - lastLocalActivityAt >= USER_INACTIVITY_LIMIT_MS) {
      setOnline(false, lastLocalActivityAt).catch(error => console.warn("Presence idle update failed", error));
      loadFriends();
      loadChatFriends();
    }
  }, 10000);
}

// AVATAR HANDLER
async function changeAvatar(){
  let a=avatarSelect.value;
  await fetch(DB_URL+"/users/"+currentUser+".json",
    {method:"PATCH",body:JSON.stringify({avatar:a})});
  avatar.innerText=a;
  if (document.getElementById("profileAvatar")) profileAvatar.innerText = a;
}

// USERNAME/DISPLAY-NAME HANDLER
async function updateProfileName() {
  let newName = changeUsernameInput.value.trim();
  if(!newName) return showCustomAlert("Display name cannot be blank.", "Error");
  
  await fetch(DB_URL+`/users/${currentUser}.json`, {
    method: "PATCH",
    body: JSON.stringify({ displayName: newName })
  });
  
  userDisplay.innerText = newName;
  if (document.getElementById("profileDisplayName")) profileDisplayName.innerText = newName;
  showCustomAlert("Your profile name has been updated successfully!", "Profile Updated");
  loadFeed();
}

// CONNECTIONS & REQUEST HANDLING
function hideFriendSuggestions() {
  const box = document.getElementById("friendSuggestions");
  if (!box) return;
  box.classList.add("hidden");
  box.innerHTML = "";
}

function selectFriendSuggestion(username) {
  const input = document.getElementById("friendInput");
  if (input) input.value = username;
  hideFriendSuggestions();
}

async function showUserSuggestions() {
  const input = document.getElementById("friendInput");
  const box = document.getElementById("friendSuggestions");
  if (!input || !box || !currentUser) return;

  const query = input.value.trim().toLowerCase();
  if (!query) {
    hideFriendSuggestions();
    return;
  }

  const usersRes = await fetch(DB_URL + "/users.json");
  const users = await usersRes.json() || {};
  const friendsRes = await fetch(DB_URL + `/users/${currentUser}/friends.json`);
  const friends = await friendsRes.json() || {};

  const matches = Object.entries(users)
    .filter(([username]) => username !== currentUser)
    .filter(([username, data]) => {
      const display = String(data.displayName || "").toLowerCase();
      return username.toLowerCase().includes(query) || display.includes(query);
    })
    .slice(0, 6);

  box.classList.remove("hidden");
  box.innerHTML = "";

  if (!matches.length) {
    box.innerHTML = `<div class="suggestion-empty">No available users found.</div>`;
    return;
  }

  matches.forEach(([username, data]) => {
    const row = document.createElement("div");
    row.className = "friend-suggestion-row";

    const label = document.createElement("div");
    label.className = "friend-suggestion-name";
    label.textContent = `${data.avatar || "😀"} ${data.displayName || username}`;

    const meta = document.createElement("span");
    meta.className = "friend-suggestion-meta";
    meta.textContent = friends[username] ? `@${username} • already your friend` : `@${username}`;
    label.appendChild(meta);

    const btn = document.createElement("button");
    btn.className = friends[username] ? "secondary small-action-btn" : "small-action-btn";
    btn.type = "button";
    btn.textContent = friends[username] ? "Added" : "Choose";
    btn.disabled = !!friends[username];
    btn.onclick = () => selectFriendSuggestion(username);

    row.appendChild(label);
    row.appendChild(btn);
    box.appendChild(row);
  });
}

async function addFriend(){
  let f=friendInput.value.trim();
  if(!f) return;
  if(f === currentUser) return showCustomAlert("You cannot send a connection request to yourself.", "Action Denied");
  
  let r=await fetch(DB_URL+"/users/"+f+".json");
  if(!(await r.json())) return showCustomAlert("The user you are trying to add does not exist.", "Not Found");

  await fetch(DB_URL+"/users/"+f+"/requests/"+currentUser+".json",
    {method:"PUT",body:"true"});
  
  showCustomAlert(`Connection request sent to @${f}!`, "Request Sent");
  friendInput.value = "";
  hideFriendSuggestions();
}

async function loadRequests(){
  let r=await fetch(DB_URL+"/users/"+currentUser+"/requests.json");
  let data=await r.json() || {};
  let target = document.getElementById("requestsList");

  if(Object.keys(data).length === 0){ 
    target.innerHTML="None"; 
    return;
  }

  Array.from(target.children).forEach(child => {
    if(child.id && !data[child.id.replace('req-', '')]) child.remove();
  });

  if(target.innerHTML === "None") target.innerHTML = "";

  for(let u in data){
    let existing = document.getElementById(`req-${u}`);
    if(!existing) {
      let uRes = await fetch(DB_URL+"/users/"+u+".json");
      let userData = await uRes.json() || {};
      let nameToShow = userData.displayName || u;

      let div = document.createElement("div");
      div.className = "item-row";
      div.id = `req-${u}`;
      div.innerHTML = `
        <span>${nameToShow} (@${u})</span>
        <div>
          <button style="padding:4px 8px;" onclick="accept('${u}')">✔</button>
          <button class="danger" style="padding:4px 8px;" onclick="reject('${u}')">✖</button>
        </div>
      `;
      target.appendChild(div);
    }
  }
}

async function accept(u){
  await fetch(DB_URL+"/users/"+currentUser+"/friends/"+u+".json",{method:"PUT",body:"true"});
  await fetch(DB_URL+"/users/"+u+"/friends/"+currentUser+".json",{method:"PUT",body:"true"});
  await fetch(DB_URL+"/users/"+currentUser+"/requests/"+u+".json",{method:"DELETE"});
  loadAll();
}

async function reject(u){
  await fetch(DB_URL+"/users/"+currentUser+"/requests/"+u+".json",{method:"DELETE"});
  let existing = document.getElementById(`req-${u}`);
  if(existing) existing.remove();
  loadRequests();
}

async function loadFriends(){
  let r=await fetch(DB_URL+"/users/"+currentUser+"/friends.json");
  let f=await r.json() || {};

  if(Object.keys(f).length === 0){
    friendsList.innerHTML="None";
    return;
  }

  const fragment = document.createDocumentFragment();

  for(let x in f){
    let uRes = await fetch(DB_URL+"/users/"+x+".json");
    let userData = await uRes.json() || {};
    let nameToShow = userData.displayName || x;
    const presence = getPresenceInfo(userData);

    let div = document.createElement("div");
    div.className = "item-row";
    div.id = `friend-${x}`;
    div.innerHTML = `
      <span>${escapeHTML(nameToShow)} (@${escapeHTML(x)}) <span class="${presence.online ? "online" : "offline"}">${escapeHTML(presence.label)}</span></span>
      <button class="danger" style="padding: 4px 8px; font-size:12px;" onclick="unfriend('${x}')">Unfriend</button>
    `;
    fragment.appendChild(div);
  }

  friendsList.replaceChildren(fragment);
}

async function unfriend(f){
  await fetch(DB_URL+"/users/"+currentUser+"/friends/"+f+".json",{method:"DELETE"});
  await fetch(DB_URL+"/f/"+currentUser+".json",{method:"DELETE"});
  let existing = document.getElementById(`friend-${f}`);
  if(existing) existing.remove();
  loadFriends();
}

// FEED LOGIC
async function addNote(source = "feed"){
  const fields = getCreateNoteFields(source);
  if (!fields.titleInput || !fields.textInput) return;

  let title = fields.titleInput.value.trim();
  let text = fields.textInput.value.trim();
  let privacyInput = document.querySelector(fields.privacySelector);
  let privacy = privacyInput ? privacyInput.value : "public";
  let tags = normalizeTags(fields.tagsInput ? fields.tagsInput.value : "");
  let priority = fields.priorityInput ? fields.priorityInput.value : "normal";
  let color = fields.colorInput ? fields.colorInput.value : "default";

  if(!title && !text && !currentAttachedFileBase64[source]) return;

  let id=Date.now();
  let payload = { title, text, owner:currentUser, privacy, tags, priority, color, createdAt:id };

  if(currentAttachedFileBase64[source]) {
    payload.attachment = currentAttachedFileBase64[source];
  }

  await fetch(DB_URL+"/notes/"+id+".json",{method:"PUT", body:JSON.stringify(payload)});

  fields.titleInput.value = "";
  fields.textInput.value = "";
  if (fields.tagsInput) fields.tagsInput.value = "";
  if (fields.priorityInput) fields.priorityInput.value = "normal";
  if (fields.colorInput) fields.colorInput.value = "default";
  autoResizeTextarea(fields.textInput);
  clearAttachedFile(null, source);
  toggleCreateNoteForm(source, false);

  loadFeed();
  loadProfilePosts();
  loadProfileBio();
  updateDashboardStats();
}


async function toggleBookmarkNote(id, event) {
  if(event) event.stopPropagation();
  const path = DB_URL+`/users/${currentUser}/savedNotes/${id}.json`;
  const r = await fetch(path);
  const saved = await r.json();
  if (saved) {
    await fetch(path, { method:"DELETE" });
    showToast("Removed from saved.");
  } else {
    await fetch(path, { method:"PUT", body:"true" });
    showToast("Saved to bookmarks.");
  }
  loadFeed(); updateDashboardStats(); loadProfilePosts();
}

async function hideFeedPost(id, event) {
  if (event) event.stopPropagation();
  if (!currentUser || !id) return;

  await fetch(DB_URL+`/users/${currentUser}/hiddenFeedPosts/${id}.json`, {
    method: "PUT",
    body: "true"
  });

  showToast("Post hidden from your Feed.");
  loadFeed();
  loadHiddenPostsList();
}

async function unhideFeedPost(id, event) {
  if (event) event.stopPropagation();
  if (!currentUser || !id) return;

  await fetch(DB_URL+`/users/${currentUser}/hiddenFeedPosts/${id}.json`, { method: "DELETE" });
  showToast("Post restored to your Feed.");
  loadFeed();
  loadHiddenPostsList();
}

function toggleHiddenPostsPanel(forceOpen = null) {
  const panel = document.getElementById("hiddenPostsPanel");
  if (!panel) return;

  const shouldOpen = forceOpen === null ? panel.classList.contains("hidden") : forceOpen;
  panel.classList.toggle("hidden", !shouldOpen);

  if (shouldOpen) loadHiddenPostsList();
}

async function removeUnavailableHiddenPost(id, event) {
  if (event) event.stopPropagation();
  if (!currentUser || !id) return;

  await fetch(DB_URL+`/users/${currentUser}/hiddenFeedPosts/${id}.json`, { method: "DELETE" });
  await loadHiddenPostsList();
}

async function loadHiddenPostsList() {
  if (!currentUser) return;

  const list = document.getElementById("hiddenPostsList");
  if (!list) return;

  const hiddenRes = await fetch(DB_URL+`/users/${currentUser}/hiddenFeedPosts.json`);
  const hiddenPosts = await hiddenRes.json() || {};
  const ids = Object.keys(hiddenPosts).sort((a, b) => Number(b) - Number(a));

  if (ids.length === 0) {
    list.innerHTML = `<div class="folder-empty">No hidden posts yet. Tap 🙈 on a Feed post to hide it here.</div>`;
    return;
  }

  const notesRes = await fetch(DB_URL+"/notes.json");
  const notes = await notesRes.json() || {};
  const friendsRes = await fetch(DB_URL+`/users/${currentUser}/friends.json`);
  const friends = await friendsRes.json() || {};
  const fragment = document.createDocumentFragment();

  for (const noteId of ids) {
    const note = notes[noteId];

    if (!note) {
      const row = document.createElement("div");
      row.className = "folder-row";
      row.innerHTML = `
        <div class="folder-info">
          <div class="folder-name">Unavailable post</div>
          <div class="folder-count">This post may have been deleted.</div>
        </div>
        <div class="folder-actions">
          <button class="danger small-action-btn" onclick="removeUnavailableHiddenPost('${noteId}', event)">Remove</button>
        </div>
      `;
      fragment.appendChild(row);
      continue;
    }

    const isOwner = note.owner === currentUser;
    const isFriend = friends[note.owner];
    const isSharedPrivate = note.privacy === "private" && note.sharedWith && note.sharedWith[currentUser];
    const canOpen = isOwner || (note.privacy === "public" && isFriend) || isSharedPrivate;

    let userRes = await fetch(DB_URL+`/users/${note.owner}.json`);
    let user = await userRes.json() || {};
    const authorDisplayName = user.displayName || note.owner;
    const authorAvatar = user.avatar || "😀";
    const titleValue = note.title || "Untitled post";
    const textValue = String(note.text || "").trim();

    const box = document.createElement("div");
    box.className = `folder-mini-note ${getNoteAccentClass(note)}`;
    if (canOpen) box.onclick = () => openNoteModal(noteId, note, authorAvatar, authorDisplayName);

    box.innerHTML = `
      <div class="note-header" style="margin-bottom:8px;">
        <span class="avatar">${escapeHTML(authorAvatar)}</span>
        <div>
          <b>${escapeHTML(authorDisplayName)}</b> <span style="font-size:12px; color:var(--text-secondary);">@${escapeHTML(note.owner)}</span><br>
          <span style="font-size:12px; color:var(--text-secondary);">Hidden ${escapeHTML(formatDateTime(note.createdAt || noteId))}</span>
        </div>
      </div>
      <div class="folder-mini-title">${escapeHTML(titleValue)}</div>
      <div class="folder-mini-text">${escapeHTML(textValue || "No text content.")}</div>
      <div class="folder-active-actions" style="margin-top:10px;">
        ${canOpen ? `<button class="secondary small-action-btn" onclick="event.stopPropagation(); openNoteModal('${noteId}', ${JSON.stringify(note).replace(/"/g, "&quot;")}, '${escapeHTML(authorAvatar)}', '${escapeHTML(authorDisplayName)}')">Open</button>` : ""}
        ${canOpen ? `<button class="copy-btn small-action-btn" onclick="copyNotePost('${noteId}', event)">📋 Copy</button>` : ""}
        <button class="small-action-btn" onclick="unhideFeedPost('${noteId}', event)">Unhide</button>
      </div>
    `;

    fragment.appendChild(box);
  }

  list.replaceChildren(fragment);
}

async function deleteNote(id, event){
  if(event) event.stopPropagation(); 
  
  showCustomConfirm("Are you sure you want to permanently delete this post?", async () => {
    await fetch(DB_URL+`/notes/${id}.json`, { method: "DELETE" });
    if (currentActiveNoteId === id) {
      closeNoteModal();
    }
    loadFeed();
    loadProfilePosts();
  }, "Delete Post");
}

async function like(id, event){
  if(event) event.stopPropagation();
  
  let path=`/notes/${id}/likes/${currentUser}.json`;
  let r=await fetch(DB_URL+path);
  let liked=await r.json();

  if(liked)
    await fetch(DB_URL+path,{method:"DELETE"});
  else
    await fetch(DB_URL+path,{method:"PUT",body:"true"});
  
  let targetBtn = event ? event.currentTarget : null;
  if(targetBtn) {
    targetBtn.classList.add("liked-active-anim");
    setTimeout(() => targetBtn.classList.remove("liked-active-anim"), 350);
  }

  loadFeed();
  loadProfilePosts();
  loadHiddenPostsList();
  scanNotifications();
  if(currentActiveNoteId === id) {
    setTimeout(() => syncModalDetails(id), 100);
  }
}

function openNoteModal(id, noteObj, userAvatar, displayedAuthorName) {
  hideBottomNavForModal();
  currentActiveNoteId = id;
  currentCommentsStringState = "";
  noteModal.style.display = "flex";
  modalAuthor.innerText = `${userAvatar} ${displayedAuthorName}'s Post`;
  modalPostTitle.innerText = noteObj.title || "";
  modalPostTitle.style.display = noteObj.title ? "block" : "none";
  modalPostText.innerHTML = linkifyText(noteObj.text || "");
  
  let mediaArea = document.getElementById("modalAttachmentArea");
  mediaArea.innerHTML = renderAttachmentHtml(noteObj.attachment, "modal");

  modalCommentSubmitBtn.onclick = () => addModalComment(id);
  syncModalDetails(id);
}

function closeNoteModal() {
  noteModal.style.display = "none";
  currentActiveNoteId = null;
  releaseBottomNavFromModal();
}

async function syncModalDetails(id) {
  if (currentActiveNoteId !== id) return;
  
  let r = await fetch(DB_URL+`/notes/${id}.json`);
  let note = await r.json();
  if(!note) return;

  const modalEditBtn = document.getElementById("modalEditPostBtn");
  if (modalEditBtn) modalEditBtn.style.display = note.owner === currentUser ? "inline-flex" : "none";

  const modalShareBtn = document.getElementById("modalSharePrivateBtn");
  const isPrivateOwner = note.owner === currentUser && (note.privacy || "public") === "private";
  if (modalShareBtn) modalShareBtn.style.display = isPrivateOwner ? "inline-flex" : "none";

  let likesCount = note.likes ? Object.keys(note.likes).length : 0;
  let commentsCount = note.comments ? Object.keys(note.comments).length : 0;
  let sharedCount = note.sharedWith ? Object.keys(note.sharedWith).length : 0;
  let sharedMeta = (note.privacy || "public") === "private" ? ` &nbsp;•&nbsp; 👥 ${sharedCount} Shared` : "";

  modalPostMeta.innerHTML = `❤️ ${likesCount} Likes &nbsp;•&nbsp; 📝 ${commentsCount} Notes${sharedMeta}`;

  let newCommentsString = JSON.stringify(note.comments || {});
  if(newCommentsString === currentCommentsStringState) return; 
  currentCommentsStringState = newCommentsString;

  let container = document.getElementById("modalCommentsContainer");
  container.innerHTML = "";

  if(!note.comments) {
    container.innerHTML = "<div style='color:var(--text-secondary); font-style:italic; padding:10px 0;'>No notes yet. Be the first to add one!</div>";
    return;
  }

  for(let [cId, c] of Object.entries(note.comments)) {
    let commenterRes = await fetch(DB_URL+`/users/${c.user}.json`);
    let commenterData = await commenterRes.json() || {};
    let displayCommenterName = commenterData.displayName || c.user;

    let div = document.createElement("div");
    div.className = "comment-box";

    let content = document.createElement("div");
    content.className = "comment-content";

    let userLabel = document.createElement("span");
    userLabel.className = "comment-user";
    userLabel.textContent = `@${displayCommenterName}`;

    let textNode = document.createElement("div");
    textNode.textContent = c.text || "";

    content.appendChild(userLabel);
    content.appendChild(textNode);
    div.appendChild(content);

    let actionGroup = document.createElement("div");
    actionGroup.className = "comment-actions";

    let copyBtn = document.createElement("button");
    copyBtn.className = "comment-copy-btn";
    copyBtn.type = "button";
    copyBtn.title = "Copy this subnote";
    copyBtn.innerHTML = "📋";
    copyBtn.onclick = (event) => copySubNoteText(c.text || "", event);
    actionGroup.appendChild(copyBtn);

    if (c.user === currentUser || note.owner === currentUser) {
      let deleteBtn = document.createElement("button");
      deleteBtn.className = "comment-delete-btn";
      deleteBtn.type = "button";
      deleteBtn.title = "Delete this note";
      deleteBtn.innerHTML = "🗑️";
      deleteBtn.onclick = (event) => deleteModalComment(id, cId, event);
      actionGroup.appendChild(deleteBtn);
    }

    div.appendChild(actionGroup);
    container.appendChild(div);
  }
}

async function deleteModalComment(noteId, commentId, event) {
  if (event) event.stopPropagation();

  showCustomConfirm("Delete this note comment?", async () => {
    await fetch(DB_URL+`/notes/${noteId}/comments/${commentId}.json`, { method: "DELETE" });
    currentCommentsStringState = "";
    await syncModalDetails(noteId);
    loadFeed();
    loadProfilePosts();
  }, "Delete Note");
}

async function addModalComment(id) {
  let t = modalCommentInput.value.trim();
  if(!t) return;

  await fetch(DB_URL+`/notes/${id}/comments/${Date.now()}.json`,
    {method:"PUT",body:JSON.stringify({text:t,user:currentUser})});
  
  modalCommentInput.value = "";
  autoResizeTextarea(modalCommentInput);
  syncModalDetails(id);
  loadFeed();
  loadProfilePosts();
  scanNotifications();
}

async function loadFeed(){
  const loadToken = ++feedLoadToken;
  let r=await fetch(DB_URL+"/notes.json");
  let notes=await r.json();

  let fRes=await fetch(DB_URL+"/users/"+currentUser+"/friends.json");
  let friends=await fRes.json()||{};

  let filterN = filterName.value.trim().toLowerCase();
  let filterD = filterDate.value;
  let filterT = (document.getElementById("filterTag")?.value || "").trim().replace(/^#/, "").toLowerCase();
  let filterP = document.getElementById("filterPriority")?.value || "";
  let globalSearch = (document.getElementById("globalSearchInput")?.value || "").trim().toLowerCase();
  let savedRes = await fetch(DB_URL+`/users/${currentUser}/savedNotes.json`);
  let savedNotes = await savedRes.json() || {};
  let hiddenRes = await fetch(DB_URL+`/users/${currentUser}/hiddenFeedPosts.json`);
  let hiddenFeedPosts = await hiddenRes.json() || {};
  let nextFeed = document.createDocumentFragment();
  let renderedCount = 0;
  let entries = Object.entries(notes||{}).sort((a,b)=>Number(b[0]) - Number(a[0]));

  if(loadToken !== feedLoadToken) return;

  for(let [id,n] of entries){
    if (hiddenFeedPosts[id]) continue;

    let isOwner=n.owner===currentUser;
    let isFriend=friends[n.owner];
    let isSharedPrivate=n.privacy==="private" && n.sharedWith && n.sharedWith[currentUser];

    if(!(isOwner || (n.privacy==="public"&&isFriend) || isSharedPrivate)) continue;
    if (feedMode === "saved" && !savedNotes[id]) continue;
    if (feedMode === "mine" && !isOwner) continue;

    let userRes = await fetch(DB_URL+"/users/"+n.owner+".json");
    let user = await userRes.json() || {};
    if(loadToken !== feedLoadToken) return;

    let authorDisplayName = user.displayName || n.owner;
    let noteTitle = (n.title || "").toLowerCase();
    let noteText = (n.text || "").toLowerCase();
    let noteTags = (n.tags || []).map(t => String(t).toLowerCase());
    let authorSearch = `${authorDisplayName} ${n.owner}`.toLowerCase();

    if(filterN && !noteTitle.includes(filterN)) continue;
    if(globalSearch && !(`${noteTitle} ${noteText} ${noteTags.join(" ")} ${authorSearch}`.includes(globalSearch))) continue;
    if(filterT && !noteTags.includes(filterT)) continue;
    if(filterP && (n.priority || "normal") !== filterP) continue;
    if(filterD) {
      let postDate = new Date(Number(id)).toISOString().split('T')[0];
      if(postDate !== filterD) continue;
    }

    let div=document.createElement("div");
    div.className=`card note-item ${getNoteAccentClass(n)}`;
    
    div.onclick = () => openNoteModal(id, n, user.avatar || "😀", authorDisplayName);

    let likesCount = n.likes ? Object.keys(n.likes).length : 0;
    let commentsCount = n.comments ? Object.keys(n.comments).length : 0;
    let hasUserLiked = n.likes && n.likes[currentUser];
    let isSaved = !!savedNotes[id];

    let topActionsMarkup = `
      <div class="post-top-actions">
        <button class="post-top-btn" onclick="event.stopPropagation(); copyNotePost('${id}', event)" title="Copy">📋</button>
        <button class="post-top-btn" onclick="event.stopPropagation(); toggleBookmarkNote('${id}', event)" title="Save">🔖</button>
        <button class="post-top-btn" onclick="event.stopPropagation(); hideFeedPost('${id}', event)" title="Hide from my Feed">🙈</button>
        ${isOwner ? `<button class="post-top-btn" onclick="event.stopPropagation(); openEditNoteModal('${id}', event)" title="Edit">✏️</button>` : ""}
        ${isOwner ? `<button class="post-top-btn post-del-btn" onclick="event.stopPropagation(); deleteNote('${id}', event)" title="Delete">🗑️</button>` : ""}
      </div>
    `;

    let safeAuthorDisplayName = escapeHTML(authorDisplayName);
    let safeOwner = escapeHTML(n.owner);
    let safeTitle = escapeHTML(n.title || "");
    let safeAvatar = escapeHTML(user.avatar || "😀");
    let mediaMarkup = renderAttachmentHtml(n.attachment, "feed");
    let titleMarkup = n.title ? `<div class="note-title">${safeTitle}</div>` : "";
    let badgesMarkup = renderNoteBadges(n);
    let noteDate = formatDateTime(n.createdAt || id);
    let textMarkup = renderNoteText(n.text || "");

    div.innerHTML=`
      ${topActionsMarkup}
      <div class="note-header">
        <span class="avatar">${safeAvatar}</span>
        <div>
          <b>${safeAuthorDisplayName}</b> <span style="font-size:12px; color:var(--text-secondary);">@${safeOwner}</span>
        </div>
      </div>
      ${badgesMarkup}
      ${titleMarkup}
      ${textMarkup}
      ${mediaMarkup}
      <div class="note-meta">
        <span>${noteDate}</span>
        <span>❤️ ${likesCount} Likes</span>
        <span>📝 ${commentsCount} Notes</span>
      </div>
      <div class="note-actions">
        ${isOwner && n.privacy === "private" ? `<button class="collab-btn" onclick="openCollaboratorModal('${id}', event)">👥 Collaborators</button>` : ""}
        <button class="secondary ${hasUserLiked ? 'liked-active-anim' : ''}" onclick="like('${id}', event)">❤️ Like</button>
      </div>
    `;

    nextFeed.appendChild(div);
    renderedCount++;
  }

  if(loadToken !== feedLoadToken) return;
  if (renderedCount === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<div class="empty-state-icon">📝</div><b>No notes found</b><br><span>Try changing filters, creating a note, or adding friends.</span>`;
    nextFeed.appendChild(empty);
  }
  feed.replaceChildren(nextFeed);
  updateDashboardStats();
}


function switchProfilePrivacy(privacy) {
  profileActivePrivacy = privacy;

  const publicTab = document.getElementById("profilePublicTab");
  const privateTab = document.getElementById("profilePrivateTab");
  const target = document.getElementById("profilePosts");

  if (publicTab) publicTab.classList.toggle("active", privacy === "public");
  if (privateTab) privateTab.classList.toggle("active", privacy === "private");
  lastProfilePostsSignature = "";

  loadProfilePosts(privacy);
}

async function loadProfilePosts(requestedPrivacy = profileActivePrivacy){
  if(!currentUser) return;

  const target = document.getElementById("profilePosts");
  if(!target) return;

  const loadToken = ++profileLoadToken;
  const activePrivacy = requestedPrivacy || profileActivePrivacy;

  if (document.getElementById("profileAvatar")) profileAvatar.innerText = avatar.innerText || "😀";
  if (document.getElementById("profileDisplayName")) profileDisplayName.innerText = userDisplay.innerText || currentUser;
  if (document.getElementById("profileUsername")) profileUsername.innerText = `@${currentUser}`;

  if (!activePrivacy) {
    if (document.getElementById("profilePostCount")) {
      profilePostCount.innerText = "Choose Public or Private";
    }
    target.innerHTML = `<div class="profile-empty">Choose Public Notes or Private Notes to view your posts.</div>`;
    return;
  }

  let r = await fetch(DB_URL+"/notes.json");
  let notes = await r.json() || {};
  let savedRes = await fetch(DB_URL+`/users/${currentUser}/savedNotes.json`);
  let savedNotes = await savedRes.json() || {};
  if (loadToken !== profileLoadToken || activePrivacy !== profileActivePrivacy) return;

  let ownNotes = Object.entries(notes).filter(([id, n]) => n.owner === currentUser && n.privacy === activePrivacy);
  const profileSignature = JSON.stringify({
    privacy: activePrivacy,
    posts: ownNotes.map(([id, n]) => ({
      id,
      title: n.title || "",
      text: n.text || "",
      privacy: n.privacy || "public",
      attachment: !!n.attachment,
      tags: n.tags || "",
      priority: n.priority || "normal",
      color: n.color || "default",
      likes: n.likes ? Object.keys(n.likes).sort() : [],
      comments: n.comments ? Object.keys(n.comments).sort() : [],
      saved: !!savedNotes[id]
    }))
  });

  if (profileSignature === lastProfilePostsSignature && target.children.length > 0) {
    if (document.getElementById("profilePostCount")) {
      profilePostCount.innerText = `${ownNotes.length} ${activePrivacy} ${ownNotes.length === 1 ? "post" : "posts"}`;
    }
    return;
  }

  if (document.getElementById("profilePostCount")) {
    profilePostCount.innerText = `${ownNotes.length} ${activePrivacy} ${ownNotes.length === 1 ? "post" : "posts"}`;
  }

  if(ownNotes.length === 0){
    lastProfilePostsSignature = profileSignature;
    target.innerHTML = `<div class="profile-empty">No ${activePrivacy} notes yet.</div>`;
    return;
  }

  let userRes = await fetch(DB_URL+"/users/"+currentUser+".json");
  let user = await userRes.json() || {};
  if (loadToken !== profileLoadToken || activePrivacy !== profileActivePrivacy) return;

  let authorDisplayName = user.displayName || currentUser;
  let userAvatar = user.avatar || "😀";

  let nextProfilePosts = document.createDocumentFragment();

  for(let [id, n] of ownNotes.reverse()){
    let div = document.createElement("div");
    div.className = `card note-item ${getNoteAccentClass(n)}`;
    div.onclick = () => openNoteModal(id, n, userAvatar, authorDisplayName);

    let likesCount = n.likes ? Object.keys(n.likes).length : 0;
    let commentsCount = n.comments ? Object.keys(n.comments).length : 0;
    let hasUserLiked = n.likes && n.likes[currentUser];
    let isSaved = !!savedNotes[id];

    let safeAuthorDisplayName = escapeHTML(authorDisplayName);
    let safeOwner = escapeHTML(n.owner);
    let safeTitle = escapeHTML(n.title || "");
    let safeAvatar = escapeHTML(userAvatar);
    let safePrivacy = escapeHTML(n.privacy || "public");
    let mediaMarkup = renderAttachmentHtml(n.attachment, "profile");
    let titleMarkup = n.title ? `<div class="note-title">${safeTitle}</div>` : "";
    let badgeMarkup = renderNoteBadges(n);
    let noteDate = formatDateTime(n.createdAt || id);
    let textMarkup = renderNoteText(n.text || "");

    div.innerHTML = `
      <div class="post-top-actions">
        <button class="post-top-btn" onclick="event.stopPropagation(); copyNotePost('${id}', event)" title="Copy">📋</button>
        <button class="post-top-btn" onclick="event.stopPropagation(); openEditNoteModal('${id}', event)" title="Edit">✏️</button>
        <button class="post-top-btn" onclick="event.stopPropagation(); openAddToFolderModal('${id}', event)" title="Folder">📁</button>
        <button class="post-top-btn post-del-btn" onclick="event.stopPropagation(); deleteNote('${id}', event)" title="Delete">🗑️</button>
      </div>
      <div class="note-header">
        <span class="avatar">${safeAvatar}</span>
        <div>
          <b>${safeAuthorDisplayName}</b> <span style="font-size:12px; color:var(--text-secondary);">@${safeOwner}</span><br>
          <span style="font-size:12px; color:var(--text-secondary); text-transform:capitalize;">${safePrivacy} note</span>
        </div>
      </div>
      ${badgeMarkup}
      ${titleMarkup}
      ${textMarkup}
      ${mediaMarkup}
      <div class="note-meta">
        <span>${noteDate}</span>
        <span>❤️ ${likesCount} Likes</span>
        <span>📝 ${commentsCount} Notes</span>
      </div>
      <div class="note-actions">
        <button class="secondary" onclick="openAddToFolderModal('${id}', event)">📁 Folder</button>
        ${n.privacy === "private" ? `<button class="collab-btn" onclick="openCollaboratorModal('${id}', event)">👥 Collaborators</button>` : ""}
        <button class="secondary ${hasUserLiked ? 'liked-active-anim' : ''}" onclick="like('${id}', event)">❤️ Like</button>
      </div>
    `;

    nextProfilePosts.appendChild(div);
  }

  if (loadToken !== profileLoadToken || activePrivacy !== profileActivePrivacy) return;
  lastProfilePostsSignature = profileSignature;
  target.replaceChildren(nextProfilePosts);
}

function ensureFoldersModalStructure() {
  const panel = document.getElementById("foldersPanel");
  if (!panel) return null;

  let sheet = document.getElementById("foldersModalSheet");
  if (!sheet) {
    sheet = document.createElement("div");
    sheet.id = "foldersModalSheet";
    sheet.className = "folder-modal-sheet";
    sheet.onclick = (event) => event.stopPropagation();

    while (panel.firstChild) {
      sheet.appendChild(panel.firstChild);
    }

    panel.appendChild(sheet);
    panel.onclick = (event) => {
      if (event.target === panel) toggleFoldersPanel(false);
    };
  }

  return sheet;
}

function toggleFoldersPanel(forceOpen = null) {
  const panel = document.getElementById("foldersPanel");
  if (!panel) return;

  ensureFoldersModalStructure();
  const shouldOpen = forceOpen === null ? panel.classList.contains("hidden") : forceOpen;
  panel.classList.toggle("hidden", !shouldOpen);
  document.body.classList.toggle("folder-modal-open", !!shouldOpen);

  if (shouldOpen) {
    loadFolders();
  } else {
    toggleFolderCreateForm(false);
    closeActiveFolder();
  }
}

function toggleFolderCreateForm(forceOpen = null) {
  const form = document.getElementById("folderCreateForm");
  if (!form) return;

  const shouldOpen = forceOpen === null ? form.classList.contains("hidden") : forceOpen;
  form.classList.toggle("hidden", !shouldOpen);

  if (shouldOpen) {
    const input = document.getElementById("folderNameInput");
    if (input) setTimeout(() => input.focus(), 30);
  }
}


document.addEventListener("keydown", (event) => {
  const panel = document.getElementById("foldersPanel");
  if (event.key === "Escape" && panel && !panel.classList.contains("hidden")) {
    toggleFoldersPanel(false);
  }
});

async function createFolder() {
  const input = document.getElementById("folderNameInput");
  const name = input ? input.value.trim() : "";

  if (!name) {
    showCustomAlert("Please enter a folder name.", "Missing Folder Name");
    return;
  }

  const id = Date.now();
  await fetch(DB_URL+`/users/${currentUser}/folders/${id}.json`, {
    method: "PUT",
    body: JSON.stringify({ name, createdAt: id, notes: {} })
  });

  if (input) input.value = "";
  toggleFolderCreateForm(false);
  await loadFolders();
  showCustomAlert(`Folder \"${name}\" has been created.`, "Folder Created");
}

async function loadFolders() {
  if (!currentUser) return;

  const list = document.getElementById("foldersList");
  if (!list) return;

  const r = await fetch(DB_URL+`/users/${currentUser}/folders.json`);
  const folders = await r.json() || {};
  const entries = Object.entries(folders).sort((a, b) => Number(b[0]) - Number(a[0]));

  if (entries.length === 0) {
    list.innerHTML = `<div class="folder-empty">No folders yet. Create one to organize your notes.</div>`;
    closeActiveFolder();
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const [folderId, folder] of entries) {
    const noteCount = folder.notes ? Object.keys(folder.notes).length : 0;

    const row = document.createElement("div");
    row.className = "folder-row";

    const info = document.createElement("div");
    info.className = "folder-info";
    const name = document.createElement("div");
    name.className = "folder-name";
    name.textContent = `📁 ${folder.name || "Untitled Folder"}`;
    const count = document.createElement("div");
    count.className = "folder-count";
    count.textContent = `${noteCount} ${noteCount === 1 ? "note" : "notes"}`;
    info.appendChild(name);
    info.appendChild(count);

    const actions = document.createElement("div");
    actions.className = "folder-actions";

    const viewBtn = document.createElement("button");
    viewBtn.className = "secondary small-action-btn";
    viewBtn.type = "button";
    viewBtn.textContent = "Open";
    viewBtn.onclick = () => openFolder(folderId);
    actions.appendChild(viewBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger small-action-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => deleteFolder(folderId, folder.name || "Untitled Folder");
    actions.appendChild(deleteBtn);

    row.appendChild(info);
    row.appendChild(actions);
    fragment.appendChild(row);
  }

  list.replaceChildren(fragment);

  if (currentActiveFolderId) {
    if (folders[currentActiveFolderId]) {
      await loadFolderPosts(currentActiveFolderId);
    } else {
      closeActiveFolder();
    }
  }
}

function closeActiveFolder() {
  currentActiveFolderId = null;
  const panel = document.getElementById("activeFolderPanel");
  const posts = document.getElementById("folderPosts");
  if (panel) panel.classList.add("hidden");
  if (posts) posts.innerHTML = "";
}

async function openFolder(folderId) {
  currentActiveFolderId = folderId;
  await loadFolderPosts(folderId);
}

async function loadFolderPosts(folderId) {
  const panel = document.getElementById("activeFolderPanel");
  const title = document.getElementById("activeFolderTitle");
  const posts = document.getElementById("folderPosts");
  if (!panel || !title || !posts) return;

  const folderRes = await fetch(DB_URL+`/users/${currentUser}/folders/${folderId}.json`);
  const folder = await folderRes.json();

  if (!folder) {
    closeActiveFolder();
    return;
  }

  currentActiveFolderId = folderId;
  panel.classList.remove("hidden");
  title.textContent = `📁 ${folder.name || "Untitled Folder"}`;

  const noteIds = Object.keys(folder.notes || {});
  if (noteIds.length === 0) {
    posts.innerHTML = `<div class="folder-empty">This folder is empty. Use the 📁 Folder button on your posts to add notes here.</div>`;
    return;
  }

  const notesRes = await fetch(DB_URL+"/notes.json");
  const notes = await notesRes.json() || {};
  const userRes = await fetch(DB_URL+`/users/${currentUser}.json`);
  const user = await userRes.json() || {};
  const userAvatar = user.avatar || "😀";
  const displayName = user.displayName || currentUser;

  const fragment = document.createDocumentFragment();
  let added = 0;

  for (const noteId of noteIds.reverse()) {
    const n = notes[noteId];
    if (!n || n.owner !== currentUser) continue;

    added++;
    const noteBox = document.createElement("div");
    noteBox.className = "folder-mini-note";
    noteBox.onclick = () => openNoteModal(noteId, n, userAvatar, displayName);

    const titleValue = n.title || "Untitled note";
    const textValue = n.text || "";

    noteBox.innerHTML = `
      <div class="folder-mini-title">${escapeHTML(titleValue)}</div>
      <div class="folder-mini-text">${escapeHTML(textValue)}</div>
      <div class="note-meta" style="margin-top:8px; margin-bottom:8px;">
        <span>${escapeHTML(n.privacy || "public")} note</span>
      </div>
      <div class="folder-active-actions">
        <button class="copy-btn small-action-btn" onclick="copyNotePost('${noteId}', event)">📋 Copy</button>
        <button class="secondary small-action-btn" onclick="openEditNoteModal('${noteId}', event)">✏️ Edit</button>
        <button class="danger small-action-btn" onclick="removeNoteFromFolder('${folderId}', '${noteId}', event)">Remove</button>
      </div>
    `;

    fragment.appendChild(noteBox);
  }

  if (added === 0) {
    posts.innerHTML = `<div class="folder-empty">The notes in this folder are no longer available.</div>`;
    return;
  }

  posts.replaceChildren(fragment);
}

async function deleteFolder(folderId, folderName) {
  showCustomConfirm(`Delete the folder \"${folderName}\"? Notes inside it will not be deleted.`, async () => {
    await fetch(DB_URL+`/users/${currentUser}/folders/${folderId}.json`, { method: "DELETE" });
    if (currentActiveFolderId === folderId) closeActiveFolder();
    await loadFolders();
  }, "Delete Folder");
}

async function openAddToFolderModal(noteId, event) {
  if (event) event.stopPropagation();

  const noteRes = await fetch(DB_URL+`/notes/${noteId}.json`);
  const note = await noteRes.json();

  if (!note) {
    showCustomAlert("This note no longer exists.", "Folder Failed");
    return;
  }

  if (note.owner !== currentUser) {
    showCustomAlert("You can only organize your own posts into folders.", "Folder Not Allowed");
    return;
  }

  currentFolderTargetNoteId = noteId;
  const modal = document.getElementById("addToFolderModal");
  if (modal) modal.style.display = "flex";
  await refreshFolderPicker();
}

function closeAddToFolderModal() {
  const modal = document.getElementById("addToFolderModal");
  if (modal) modal.style.display = "none";
  currentFolderTargetNoteId = null;
}

async function refreshFolderPicker() {
  const list = document.getElementById("folderPickerList");
  if (!list) return;

  const r = await fetch(DB_URL+`/users/${currentUser}/folders.json`);
  const folders = await r.json() || {};
  const entries = Object.entries(folders).sort((a, b) => Number(b[0]) - Number(a[0]));

  if (entries.length === 0) {
    list.innerHTML = `<div class="folder-empty">No folders yet. Create a folder first in your Profile tab.</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const [folderId, folder] of entries) {
    const alreadyAdded = !!(folder.notes && currentFolderTargetNoteId && folder.notes[currentFolderTargetNoteId]);
    const row = document.createElement("div");
    row.className = "folder-picker-row";

    const info = document.createElement("div");
    info.className = "folder-info";
    info.innerHTML = `<div class="folder-name">📁 ${escapeHTML(folder.name || "Untitled Folder")}</div><div class="folder-count">${alreadyAdded ? "Already added" : "Ready to add"}</div>`;

    const action = document.createElement("button");
    action.className = alreadyAdded ? "secondary small-action-btn" : "small-action-btn";
    action.type = "button";
    action.textContent = alreadyAdded ? "Added" : "Add";
    action.disabled = alreadyAdded;
    action.onclick = () => addNoteToFolder(folderId);

    row.appendChild(info);
    row.appendChild(action);
    fragment.appendChild(row);
  }

  list.replaceChildren(fragment);
}

async function addNoteToFolder(folderId) {
  if (!currentFolderTargetNoteId) return;

  await fetch(DB_URL+`/users/${currentUser}/folders/${folderId}/notes/${currentFolderTargetNoteId}.json`, {
    method: "PUT",
    body: "true"
  });

  const addedNoteId = currentFolderTargetNoteId;
  closeAddToFolderModal();
  await loadFolders();
  if (currentActiveFolderId === folderId) await loadFolderPosts(folderId);
  showCustomAlert("This post has been added to the folder.", "Added to Folder");
}

async function removeNoteFromFolder(folderId, noteId, event) {
  if (event) event.stopPropagation();

  await fetch(DB_URL+`/users/${currentUser}/folders/${folderId}/notes/${noteId}.json`, { method: "DELETE" });
  await loadFolders();
  if (currentActiveFolderId === folderId) await loadFolderPosts(folderId);
}

function scheduleFeedFilter(){
  clearTimeout(feedFilterTimer);
  feedFilterTimer = setTimeout(loadFeed, 250);
}


// NOTIFICATION CENTER
function getNotificationStorageKey() {
  return `notes_social_seen_notifications_${currentUser}`;
}

function getNotificationSeenState() {
  if (!currentUser) return { likes: {}, comments: {} };
  try {
    const raw = localStorage.getItem(getNotificationStorageKey());
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      likes: parsed.likes || {},
      comments: parsed.comments || {}
    };
  } catch (error) {
    return { likes: {}, comments: {} };
  }
}

function saveNotificationSeenState(state) {
  if (!currentUser) return;
  localStorage.setItem(getNotificationStorageKey(), JSON.stringify({
    likes: state.likes || {},
    comments: state.comments || {}
  }));
}

function toggleNotificationPanel(forceOpen = null) {
  const bar = document.getElementById("notificationBar");
  if (!bar) return;
  const shouldOpen = forceOpen === null ? !bar.classList.contains("open") : forceOpen;
  bar.classList.toggle("open", shouldOpen);
}

function setTabBadge(id, count) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.textContent = count > 99 ? "99+" : String(count);
  badge.classList.toggle("show", count > 0);
}

function renderNotificationBar(items) {
  const shell = document.getElementById("notificationShell");
  const summary = document.getElementById("notificationSummaryText");
  const countBadge = document.getElementById("notificationCountBadge");
  const list = document.getElementById("notificationList");
  if (!shell || !summary || !countBadge || !list) return;

  const settings = getNotificationSettings();
  const total = settings.enabled ? items.reduce((sum, item) => sum + (item.count || 1), 0) : 0;
  const chatTotal = settings.enabled ? items.filter(item => item.type === "chat" || item.type === "groupChat").reduce((sum, item) => sum + (item.count || 1), 0) : 0;
  const noteTotal = total - chatTotal;

  setTabBadge("chatTabBadge", chatTotal);
  setTabBadge("profileTabBadge", noteTotal);

  updateBrowserNotificationIndicator(total);

  if (total === 0) {
    shell.classList.add("hidden");
    document.getElementById("notificationBar")?.classList.remove("open");
    lastBrowserNotificationTotal = 0;
    lastBrowserNotificationSignature = "";
    lastAudioNotificationSignature = "";
    return;
  }

  const browserSignature = JSON.stringify(items.map(item => `${item.type}:${item.user || item.groupId || item.key || item.noteId}:${item.count || 1}`));
  if (total > lastBrowserNotificationTotal || browserSignature !== lastBrowserNotificationSignature) {
    showBrowserNotificationSummary(items, total, browserSignature);
    playNotificationSoundForItems(items, total, browserSignature);
  }
  lastBrowserNotificationTotal = total;

  shell.classList.remove("hidden");
  summary.textContent = `${total} new ${total === 1 ? "notification" : "notifications"}`;
  countBadge.textContent = total > 99 ? "99+" : String(total);

  list.innerHTML = "";
  items.slice(0, 12).forEach((item, index) => {
    const btn = document.createElement("button");
    btn.className = "notification-item";
    btn.type = "button";
    btn.onclick = () => openNotificationItem(index);

    const content = document.createElement("div");
    const title = document.createElement("div");
    title.className = "notification-title";
    title.textContent = item.title;
    const text = document.createElement("div");
    text.className = "notification-text";
    text.textContent = item.text;
    content.appendChild(title);
    content.appendChild(text);

    const arrow = document.createElement("span");
    arrow.textContent = "›";
    arrow.style.fontSize = "22px";
    arrow.style.lineHeight = "1";

    btn.appendChild(content);
    btn.appendChild(arrow);
    list.appendChild(btn);
  });

  if (items.length > 12) {
    const more = document.createElement("div");
    more.className = "notification-text";
    more.style.padding = "4px 6px";
    more.textContent = `+${items.length - 12} more notifications`;
    list.appendChild(more);
  }
}

async function scanNotifications() {
  if (!currentUser || notificationScanInProgress) return;
  notificationScanInProgress = true;

  try {
    const seen = getNotificationSeenState();
    const items = [];

    const friendsRes = await fetch(DB_URL+`/users/${currentUser}/friends.json`);
    const friends = await friendsRes.json() || {};

    for (const friend of Object.keys(friends)) {
      const cid = chatId(currentUser, friend);
      const msgRes = await fetch(DB_URL+`/chats/${cid}/messages.json`);
      const messagesData = await msgRes.json() || {};
      const unreadIds = Object.entries(messagesData)
        .filter(([id, msg]) => msg && msg.sender !== currentUser && !msg.seen)
        .map(([id]) => id);

      if (unreadIds.length > 0) {
        const userRes = await fetch(DB_URL+`/users/${friend}.json`);
        const userData = await userRes.json() || {};
        const displayName = userData.displayName || friend;
        items.push({
          type: "chat",
          user: friend,
          count: unreadIds.length,
          messageIds: unreadIds,
          title: `💬 ${displayName}`,
          text: `${unreadIds.length} unread ${unreadIds.length === 1 ? "message" : "messages"}. Tap to open the chat.`
        });
      }
    }


    const groupRes = await fetch(DB_URL+"/groupChats.json");
    const groups = await groupRes.json() || {};

    for (const [groupId, group] of Object.entries(groups)) {
      if (!group || !group.members || !group.members[currentUser]) continue;

      const messagesData = group.messages || {};
      const unreadIds = Object.entries(messagesData)
        .filter(([id, msg]) => msg && msg.sender !== currentUser && !(msg.seenBy && msg.seenBy[currentUser]))
        .map(([id]) => id);

      if (unreadIds.length > 0) {
        items.push({
          type: "groupChat",
          groupId,
          count: unreadIds.length,
          messageIds: unreadIds,
          title: `👥 ${group.name || "Group Chat"}`,
          text: `${unreadIds.length} unread group ${unreadIds.length === 1 ? "message" : "messages"}. Tap to open the group.`
        });
      }
    }

    const notesRes = await fetch(DB_URL+"/notes.json");
    const notes = await notesRes.json() || {};

    for (const [noteId, note] of Object.entries(notes)) {
      if (!note || note.owner !== currentUser) continue;
      const noteLabel = note.title || (note.text ? String(note.text).slice(0, 34) : "your note");

      for (const liker of Object.keys(note.likes || {})) {
        if (liker === currentUser) continue;
        const key = `${noteId}_${liker}`;
        if (seen.likes[key]) continue;

        items.push({
          type: "like",
          noteId,
          key,
          actor: liker,
          count: 1,
          title: "❤️ New like",
          text: `@${liker} liked “${noteLabel}”.`
        });
      }

      for (const [commentId, comment] of Object.entries(note.comments || {})) {
        if (!comment || comment.user === currentUser) continue;
        const key = `${noteId}_${commentId}`;
        if (seen.comments[key]) continue;

        items.push({
          type: "comment",
          noteId,
          commentId,
          key,
          actor: comment.user,
          count: 1,
          title: "📝 New comment",
          text: `@${comment.user} commented on “${noteLabel}”.`
        });
      }
    }

    items.sort((a, b) => {
      const aTime = Number(a.commentId || a.noteId || 0);
      const bTime = Number(b.commentId || b.noteId || 0);
      if (a.type === "chat" && b.type !== "chat") return -1;
      if (a.type !== "chat" && b.type === "chat") return 1;
      return bTime - aTime;
    });

    const signature = JSON.stringify(items.map(item => `${item.type}:${item.user || item.key}:${item.count || 1}`));
    notificationItems = items;
    if (signature !== lastNotificationSignature) {
      lastNotificationSignature = signature;
      renderNotificationBar(items);
    }
  } catch (error) {
    console.warn("Notification scan failed", error);
  } finally {
    notificationScanInProgress = false;
  }
}

async function openNotificationItem(index) {
  const item = notificationItems[index];
  if (!item) return;

  if (item.type === "chat") {
    switchView("messages");
    await loadChatFriends();
    await openChat(item.user);
    toggleNotificationPanel(false);
    setTimeout(scanNotifications, 400);
    return;
  }

  if (item.type === "groupChat") {
    switchView("messages");
    await loadChatFriends();
    await openGroupChat(item.groupId);
    toggleNotificationPanel(false);
    setTimeout(scanNotifications, 400);
    return;
  }

  const seen = getNotificationSeenState();
  if (item.type === "like") seen.likes[item.key] = true;
  if (item.type === "comment") seen.comments[item.key] = true;
  saveNotificationSeenState(seen);

  const noteRes = await fetch(DB_URL+`/notes/${item.noteId}.json`);
  const note = await noteRes.json();
  if (!note) {
    showCustomAlert("This note no longer exists.", "Notification");
    await scanNotifications();
    return;
  }

  const userRes = await fetch(DB_URL+`/users/${note.owner}.json`);
  const user = await userRes.json() || {};
  openNoteModal(item.noteId, note, user.avatar || "😀", user.displayName || note.owner);
  toggleNotificationPanel(false);
  await scanNotifications();
}

async function markAllNotificationsRead() {
  const seen = getNotificationSeenState();

  for (const item of notificationItems) {
    if (item.type === "like") seen.likes[item.key] = true;
    if (item.type === "comment") seen.comments[item.key] = true;
    if (item.type === "chat" && item.user) {
      const cid = chatId(currentUser, item.user);
      for (const msgId of item.messageIds || []) {
        await fetch(DB_URL+`/chats/${cid}/messages/${msgId}.json`, {
          method: "PATCH",
          body: JSON.stringify({ seen: true })
        });
      }
    }

    if (item.type === "groupChat" && item.groupId) {
      for (const msgId of item.messageIds || []) {
        await fetch(DB_URL+`/groupChats/${item.groupId}/messages/${msgId}/seenBy/${currentUser}.json`, {
          method: "PUT",
          body: "true"
        });
      }
    }
  }

  saveNotificationSeenState(seen);
  notificationItems = [];
  lastNotificationSignature = "";
  renderNotificationBar([]);
  toggleNotificationPanel(false);
  loadChatFriends();
}


async function updateDashboardStats() {
  if (!currentUser) return;
  const notesRes = await fetch(DB_URL+"/notes.json");
  const notes = await notesRes.json() || {};
  const friendsRes = await fetch(DB_URL+`/users/${currentUser}/friends.json`);
  const friends = await friendsRes.json() || {};
  const savedRes = await fetch(DB_URL+`/users/${currentUser}/savedNotes.json`);
  const saved = await savedRes.json() || {};
  const ownNotes = Object.values(notes).filter(n => n.owner === currentUser);
  const totalLikes = ownNotes.reduce((sum,n)=>sum + Object.keys(n.likes || {}).length,0);
  const totalComments = ownNotes.reduce((sum,n)=>sum + Object.keys(n.comments || {}).length,0);
  if (document.getElementById("dashPostsCount")) dashPostsCount.textContent = ownNotes.length;
  if (document.getElementById("dashFriendsCount")) dashFriendsCount.textContent = Object.keys(friends).length;
  if (document.getElementById("dashSavedCount")) dashSavedCount.textContent = Object.keys(saved).length;
  if (document.getElementById("profileLikesMetric")) profileLikesMetric.textContent = totalLikes;
  if (document.getElementById("profileCommentsMetric")) profileCommentsMetric.textContent = totalComments;
  if (document.getElementById("profileSavedMetric")) profileSavedMetric.textContent = Object.keys(saved).length;
}

function toggleBioEditor(forceOpen = null) {
  const editor = document.getElementById("bioEditor");
  if (!editor) return;
  const shouldOpen = forceOpen === null ? editor.classList.contains("hidden") : forceOpen;
  editor.classList.toggle("hidden", !shouldOpen);
  if (shouldOpen) setTimeout(()=>document.getElementById("profileBioInput")?.focus(), 30);
}

async function loadProfileBio() {
  if (!currentUser) return;
  const r = await fetch(DB_URL+`/users/${currentUser}.json`);
  const user = await r.json() || {};
  const bio = user.bio || "";
  const text = document.getElementById("profileBioText");
  const input = document.getElementById("profileBioInput");
  if (text) text.textContent = bio || "No bio yet.";
  if (input) input.value = bio;
}

async function saveProfileBio() {
  const input = document.getElementById("profileBioInput");
  const bio = input ? input.value.trim().slice(0, 240) : "";
  await fetch(DB_URL+`/users/${currentUser}.json`, { method:"PATCH", body:JSON.stringify({ bio }) });
  toggleBioEditor(false);
  await loadProfileBio();
  showToast("Bio updated.");
}

// MESSENGER ARCHITECTURE
function chatId(u1,u2){
  return [u1,u2].sort().join("_");
}

function getCurrentChatMessagesUrl() {
  if (currentChatType === "group" && currentChatGroupId) {
    return DB_URL+`/groupChats/${currentChatGroupId}/messages`;
  }

  if (currentChatUser) {
    return DB_URL+`/chats/${chatId(currentUser,currentChatUser)}/messages`;
  }

  return "";
}

function getCurrentTypingUrl() {
  if (currentChatType === "group" && currentChatGroupId) {
    return DB_URL+`/groupChats/${currentChatGroupId}/typing`;
  }

  if (currentChatUser) {
    return DB_URL+`/chats/${chatId(currentUser,currentChatUser)}/typing`;
  }

  return "";
}



function clampLocalVideoPreviewValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getLocalVideoPreviewBounds() {
  const localVideo = document.getElementById("localVideo");
  const stage = document.querySelector(".video-call-stage");
  if (!localVideo || !stage) return null;

  const stageRect = stage.getBoundingClientRect();
  const videoRect = localVideo.getBoundingClientRect();
  const padding = window.innerWidth <= 700 ? 10 : 14;

  return {
    stage,
    localVideo,
    stageRect,
    videoRect,
    padding,
    minX: padding,
    minY: padding,
    maxX: Math.max(padding, stageRect.width - videoRect.width - padding),
    maxY: Math.max(padding, stageRect.height - videoRect.height - padding)
  };
}

function moveLocalVideoPreviewTo(x, y) {
  const bounds = getLocalVideoPreviewBounds();
  if (!bounds) return;

  const nextX = clampLocalVideoPreviewValue(x, bounds.minX, bounds.maxX);
  const nextY = clampLocalVideoPreviewValue(y, bounds.minY, bounds.maxY);

  bounds.localVideo.style.left = `${nextX}px`;
  bounds.localVideo.style.top = `${nextY}px`;
  bounds.localVideo.style.right = "auto";
  bounds.localVideo.style.bottom = "auto";
  bounds.localVideo.dataset.customPosition = "true";
}

function resetLocalVideoPreviewPosition() {
  const localVideo = document.getElementById("localVideo");
  if (!localVideo) return;

  localVideo.style.left = "";
  localVideo.style.top = "";
  localVideo.style.right = "";
  localVideo.style.bottom = "";
  delete localVideo.dataset.customPosition;
}

function keepLocalVideoPreviewInBounds() {
  const localVideo = document.getElementById("localVideo");
  const bounds = getLocalVideoPreviewBounds();
  if (!localVideo || !bounds || localVideo.dataset.customPosition !== "true") return;

  const currentX = Number.parseFloat(localVideo.style.left || "0");
  const currentY = Number.parseFloat(localVideo.style.top || "0");
  moveLocalVideoPreviewTo(currentX, currentY);
}

function setupLocalVideoPreviewDrag() {
  if (localVideoPreviewDragSetup) return;
  const localVideo = document.getElementById("localVideo");
  if (!localVideo) return;

  localVideoPreviewDragSetup = true;

  localVideo.addEventListener("pointerdown", (event) => {
    const modal = document.getElementById("videoCallModal");
    if (!modal || modal.classList.contains("hidden")) return;

    const bounds = getLocalVideoPreviewBounds();
    if (!bounds) return;

    event.preventDefault();
    event.stopPropagation();
    localVideo.setPointerCapture?.(event.pointerId);
    localVideo.classList.add("dragging");

    const startLeft = bounds.videoRect.left - bounds.stageRect.left;
    const startTop = bounds.videoRect.top - bounds.stageRect.top;

    localVideoPreviewDragState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft,
      startTop,
      moved: false
    };
  });

  localVideo.addEventListener("pointermove", (event) => {
    if (!localVideoPreviewDragState || localVideoPreviewDragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    const dx = event.clientX - localVideoPreviewDragState.startClientX;
    const dy = event.clientY - localVideoPreviewDragState.startClientY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) localVideoPreviewDragState.moved = true;
    moveLocalVideoPreviewTo(localVideoPreviewDragState.startLeft + dx, localVideoPreviewDragState.startTop + dy);
  });

  const finishDrag = (event) => {
    if (!localVideoPreviewDragState || localVideoPreviewDragState.pointerId !== event.pointerId) return;
    localVideo.releasePointerCapture?.(event.pointerId);
    localVideo.classList.remove("dragging");
    localVideoPreviewDragState = null;
  };

  localVideo.addEventListener("pointerup", finishDrag);
  localVideo.addEventListener("pointercancel", finishDrag);
  localVideo.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetLocalVideoPreviewPosition();
  });

  window.addEventListener("resize", keepLocalVideoPreviewInBounds);
  window.addEventListener("orientationchange", () => setTimeout(keepLocalVideoPreviewInBounds, 250));
}

// VIDEO CALLS (WebRTC + Firebase Realtime Database signaling)
function getVideoCallPath(callId = currentVideoCallId) {
  return callId ? `${DB_URL}/calls/${callId}` : "";
}

function getDirectVideoCallId(peerUsername) {
  return `direct_${chatId(currentUser, peerUsername)}`;
}

function getVideoCallPeerLabel(peerUsername) {
  return peerUsername ? `@${peerUsername}` : "this user";
}

function browserCanUseCameraAndMicrophone() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection);
}

function showVideoCallModal(title = "Video Call", status = "Connecting...") {
  const modal = document.getElementById("videoCallModal");
  if (!modal) return;
  document.getElementById("videoCallTitle").textContent = title;
  document.getElementById("videoCallStatus").textContent = status;
  modal.classList.remove("hidden");
  document.body.classList.add("video-call-open");
  setupLocalVideoPreviewDrag();
  setTimeout(keepLocalVideoPreviewInBounds, 60);
}

function hideVideoCallModalOnly() {
  const modal = document.getElementById("videoCallModal");
  if (modal) modal.classList.add("hidden");
  document.body.classList.remove("video-call-open");
}

function setVideoCallStatus(status) {
  const statusEl = document.getElementById("videoCallStatus");
  if (statusEl) statusEl.textContent = status;
}

function setVideoCallButtons(mode = "active") {
  const acceptBtn = document.getElementById("acceptVideoCallBtn");
  const declineBtn = document.getElementById("declineVideoCallBtn");
  const muteBtn = document.getElementById("muteVideoCallBtn");
  const cameraBtn = document.getElementById("cameraVideoCallBtn");
  const endBtn = document.getElementById("endVideoCallBtn");

  const incoming = mode === "incoming";
  if (acceptBtn) acceptBtn.style.display = incoming ? "inline-flex" : "none";
  if (declineBtn) declineBtn.style.display = incoming ? "inline-flex" : "none";
  if (muteBtn) muteBtn.style.display = incoming ? "none" : "inline-flex";
  if (cameraBtn) cameraBtn.style.display = incoming ? "none" : "inline-flex";
  if (endBtn) endBtn.style.display = incoming ? "none" : "inline-flex";
}

function getOrCreateRemoteVideoStream() {
  if (!videoCallRemoteStream) videoCallRemoteStream = new MediaStream();
  return videoCallRemoteStream;
}

function playVideoElement(videoElement, retries = 3) {
  if (!videoElement) return;

  const playPromise = videoElement.play?.();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(error => {
      // Some mobile browsers need a short delay after srcObject/track changes.
      if (retries > 0) {
        clearTimeout(videoCallRemotePlayRetryTimer);
        videoCallRemotePlayRetryTimer = setTimeout(() => playVideoElement(videoElement, retries - 1), 250);
      } else {
        console.warn("Video playback did not start automatically", error);
      }
    });
  }
}

function attachVideoStreams() {
  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");

  if (localVideo && videoCallLocalStream) {
    localVideo.muted = true;
    localVideo.playsInline = true;
    localVideo.autoplay = true;
    if (localVideo.srcObject !== videoCallLocalStream) localVideo.srcObject = videoCallLocalStream;
    playVideoElement(localVideo);
  }

  if (remoteVideo) {
    remoteVideo.playsInline = true;
    remoteVideo.autoplay = true;
    const remoteStream = getOrCreateRemoteVideoStream();
    if (remoteVideo.srcObject !== remoteStream) remoteVideo.srcObject = remoteStream;
    playVideoElement(remoteVideo);
  }
}

function updateRemoteVideoPlaceholder() {
  const remoteVideo = document.getElementById("remoteVideo");
  const placeholder = document.getElementById("remoteVideoPlaceholder");
  if (!remoteVideo || !placeholder) return;

  const remoteStream = remoteVideo.srcObject;
  const hasLiveVideo = !!(remoteStream && remoteStream.getVideoTracks().some(track => track.readyState === "live" && track.enabled));
  videoCallHasRemoteVideoTrack = hasLiveVideo;
  placeholder.style.display = hasLiveVideo ? "none" : "flex";
  placeholder.textContent = hasLiveVideo ? "" : "Connected. Waiting for the other camera video...";
}

async function flushPendingRemoteCandidates() {
  if (!videoCallPeerConnection || !videoCallRemoteDescriptionSet) return;
  const pending = videoCallPendingRemoteCandidates.splice(0);

  for (const candidate of pending) {
    try {
      await videoCallPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.warn("Could not add queued remote ICE candidate", error);
    }
  }
}

async function addRemoteIceCandidateSafely(candidate) {
  if (!candidate) return;

  if (!videoCallPeerConnection || !videoCallRemoteDescriptionSet) {
    videoCallPendingRemoteCandidates.push(candidate);
    return;
  }

  try {
    await videoCallPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.warn("Could not add remote ICE candidate", error);
  }
}

async function prepareLocalVideoStream() {
  if (!browserCanUseCameraAndMicrophone()) {
    showCustomAlert("Video calls need a browser that supports camera, microphone, and WebRTC.", "Video Call Not Supported");
    return null;
  }

  if (!window.isSecureContext && location.protocol !== "file:") {
    showCustomAlert("Video calls need HTTPS or localhost so the browser can allow camera and microphone access.", "Secure Site Needed");
    return null;
  }

  if (videoCallLocalStream) return videoCallLocalStream;

  try {
    videoCallLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    videoCallMuted = false;
    videoCallCameraOff = false;
    updateVideoCallToggleButtons();
    attachVideoStreams();
    return videoCallLocalStream;
  } catch (error) {
    console.warn("Camera/microphone request failed", error);
    showCustomAlert("Camera or microphone permission was not allowed, or no camera/microphone is available.", "Video Call Failed");
    return null;
  }
}

function createVideoPeerConnection(role) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  });

  pc.onicecandidate = async (event) => {
    if (!event.candidate || !currentVideoCallId || !role) return;
    const branch = role === "caller" ? "callerCandidates" : "calleeCandidates";
    const candidateKey = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await fetch(`${getVideoCallPath()}/${branch}/${candidateKey}.json`, {
      method: "PUT",
      body: JSON.stringify(event.candidate.toJSON ? event.candidate.toJSON() : event.candidate)
    }).catch(error => console.warn("Could not save ICE candidate", error));
  };

  pc.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");
    if (!remoteVideo) return;

    const remoteStream = getOrCreateRemoteVideoStream();
    const incomingTracks = event.streams && event.streams[0]
      ? event.streams[0].getTracks()
      : (event.track ? [event.track] : []);

    incomingTracks.forEach(track => {
      if (!remoteStream.getTracks().some(existing => existing.id === track.id)) {
        remoteStream.addTrack(track);
      }

      if (track.kind === "video") {
        track.onunmute = () => {
          updateRemoteVideoPlaceholder();
          playVideoElement(remoteVideo);
        };
        track.onended = updateRemoteVideoPlaceholder;
        track.onmute = updateRemoteVideoPlaceholder;
      }
    });

    if (remoteVideo.srcObject !== remoteStream) remoteVideo.srcObject = remoteStream;
    updateRemoteVideoPlaceholder();
    playVideoElement(remoteVideo);
    setVideoCallStatus(`Connected with ${getVideoCallPeerLabel(currentVideoCallPeer)}`);
  };

  pc.onconnectionstatechange = () => {
    if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
      setVideoCallStatus(pc.connectionState === "failed" ? "Call connection failed." : "Call ended.");
    }
  };

  if (videoCallLocalStream) {
    videoCallLocalStream.getTracks().forEach(track => pc.addTrack(track, videoCallLocalStream));
  }

  // If a browser/device gives only audio or only video, still negotiate receiving
  // both directions so the other user's camera can be displayed when available.
  try {
    if (!videoCallLocalStream || videoCallLocalStream.getVideoTracks().length === 0) {
      pc.addTransceiver("video", { direction: "recvonly" });
    }
    if (!videoCallLocalStream || videoCallLocalStream.getAudioTracks().length === 0) {
      pc.addTransceiver("audio", { direction: "recvonly" });
    }
  } catch (error) {
    // addTrack above is enough for browsers that do not allow extra transceivers.
  }

  return pc;
}

async function startVideoCall() {
  if (!currentUser) return;

  if (currentChatType === "group") {
    showCustomAlert("Video calls are available for direct messages first. Group video calls would need a separate room system.", "Direct Calls Only");
    return;
  }

  if (!currentChatUser) {
    showCustomAlert("Open a direct chat first, then tap the video button.", "No Chat Open");
    return;
  }

  const peer = currentChatUser;
  const stream = await prepareLocalVideoStream();
  if (!stream) return;

  currentVideoCallPeer = peer;
  currentVideoCallId = getDirectVideoCallId(peer);
  currentVideoCallRole = "caller";
  videoCallSeenRemoteCandidates = new Set();
  videoCallRemoteDescriptionSet = false;
  videoCallRemoteStream = new MediaStream();
  videoCallPendingRemoteCandidates = [];
  videoCallHasRemoteVideoTrack = false;
  currentIncomingVideoCall = null;

  showVideoCallModal(`Calling ${getVideoCallPeerLabel(peer)}`, "Starting call...");
  setVideoCallButtons("active");
  attachVideoStreams();

  videoCallPeerConnection = createVideoPeerConnection("caller");
  const offer = await videoCallPeerConnection.createOffer();
  await videoCallPeerConnection.setLocalDescription(offer);

  await fetch(`${getVideoCallPath()}.json`, {
    method: "PUT",
    body: JSON.stringify({
      type: "direct",
      caller: currentUser,
      receiver: peer,
      status: "ringing",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      offer: { type: offer.type, sdp: offer.sdp },
      callerName: getCurrentDisplayName(),
      callerAvatar: getCurrentAvatar()
    })
  });

  setVideoCallStatus(`Ringing ${getVideoCallPeerLabel(peer)}...`);
  startVideoCallPolling();
  await sendVideoCallSystemMessage("📹 Video call started.");
}

function showIncomingVideoCall(callId, call = {}) {
  if (!callId || currentVideoCallId || currentIncomingVideoCall) return;
  currentIncomingVideoCall = { callId, call };
  currentVideoCallId = callId;
  currentVideoCallPeer = call.caller || "";
  currentVideoCallRole = "callee";
  videoCallSeenRemoteCandidates = new Set();
  videoCallRemoteDescriptionSet = false;
  videoCallRemoteStream = new MediaStream();
  videoCallPendingRemoteCandidates = [];
  videoCallHasRemoteVideoTrack = false;

  showVideoCallModal("Incoming Video Call", `${getVideoCallPeerLabel(call.caller)} is calling...`);
  setVideoCallButtons("incoming");
  startIncomingCallRingtone();
}

async function acceptIncomingVideoCall() {
  stopIncomingCallRingtone();
  if (!currentIncomingVideoCall) return;
  const { callId, call } = currentIncomingVideoCall;
  const peer = call.caller;

  const stream = await prepareLocalVideoStream();
  if (!stream) return;

  currentVideoCallId = callId;
  currentVideoCallPeer = peer;
  currentVideoCallRole = "callee";
  currentIncomingVideoCall = null;
  videoCallRemoteStream = new MediaStream();
  videoCallPendingRemoteCandidates = [];
  videoCallHasRemoteVideoTrack = false;
  setVideoCallButtons("active");
  showVideoCallModal(`Video Call with ${getVideoCallPeerLabel(peer)}`, "Connecting...");
  attachVideoStreams();

  videoCallPeerConnection = createVideoPeerConnection("callee");

  if (!call.offer) {
    showCustomAlert("This call no longer has a valid connection offer.", "Call Failed");
    await endVideoCall(false);
    return;
  }

  await videoCallPeerConnection.setRemoteDescription(new RTCSessionDescription(call.offer));
  videoCallRemoteDescriptionSet = true;
  await flushPendingRemoteCandidates();
  const answer = await videoCallPeerConnection.createAnswer();
  await videoCallPeerConnection.setLocalDescription(answer);

  await fetch(`${getVideoCallPath(callId)}.json`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "connected",
      updatedAt: Date.now(),
      answer: { type: answer.type, sdp: answer.sdp }
    })
  });

  if (!currentChatUser || currentChatUser !== peer) {
    currentChatUser = peer;
  }

  startVideoCallPolling();
  setVideoCallStatus(`Connected with ${getVideoCallPeerLabel(peer)}`);
  await sendVideoCallSystemMessage("📹 Video call answered.");
}

async function declineIncomingVideoCall() {
  stopIncomingCallRingtone();
  if (!currentIncomingVideoCall) return;
  const { callId } = currentIncomingVideoCall;
  await fetch(`${getVideoCallPath(callId)}.json`, {
    method: "PATCH",
    body: JSON.stringify({ status: "declined", updatedAt: Date.now(), declinedBy: currentUser })
  }).catch(error => console.warn("Could not decline call", error));
  cleanupVideoCall(false);
}

async function pollVideoCallState() {
  if (!currentVideoCallId || !videoCallPeerConnection) return;

  const response = await fetch(`${getVideoCallPath()}.json`).catch(() => null);
  const call = response ? await response.json() : null;
  if (!call) {
    cleanupVideoCall(false);
    return;
  }

  if (["ended", "declined"].includes(call.status)) {
    setVideoCallStatus(call.status === "declined" ? "Call declined." : "Call ended.");
    cleanupVideoCall(false, true);
    return;
  }

  if (currentVideoCallRole === "caller" && call.answer && !videoCallRemoteDescriptionSet) {
    await videoCallPeerConnection.setRemoteDescription(new RTCSessionDescription(call.answer));
    videoCallRemoteDescriptionSet = true;
    await flushPendingRemoteCandidates();
    setVideoCallStatus(`Connected with ${getVideoCallPeerLabel(currentVideoCallPeer)}`);
  }

  const remoteBranch = currentVideoCallRole === "caller" ? "calleeCandidates" : "callerCandidates";
  const candidates = call[remoteBranch] || {};
  for (const [key, candidate] of Object.entries(candidates)) {
    if (videoCallSeenRemoteCandidates.has(key)) continue;
    videoCallSeenRemoteCandidates.add(key);
    await addRemoteIceCandidateSafely(candidate);
  }
}

function startVideoCallPolling() {
  clearInterval(videoCallPollTimer);
  videoCallPollTimer = setInterval(pollVideoCallState, 1100);
  pollVideoCallState();
}

function startIncomingVideoCallWatcher() {
  if (incomingVideoCallPollTimer) return;
  incomingVideoCallPollTimer = setInterval(scanIncomingVideoCalls, 2200);
}

async function scanIncomingVideoCalls() {
  if (!currentUser || currentVideoCallId || currentIncomingVideoCall) return;

  const response = await fetch(`${DB_URL}/calls.json`).catch(() => null);
  const calls = response ? await response.json() : null;
  if (!calls) return;

  const now = Date.now();
  for (const [callId, call] of Object.entries(calls)) {
    if (!call || call.receiver !== currentUser || call.status !== "ringing") continue;
    if (now - Number(call.createdAt || now) > 60000) {
      fetch(`${DB_URL}/calls/${callId}.json`, {
        method: "PATCH",
        body: JSON.stringify({ status: "missed", updatedAt: now })
      }).catch(() => {});
      continue;
    }
    showIncomingVideoCall(callId, call);
    break;
  }
}

async function endVideoCall(updateRemote = true) {
  if (updateRemote && currentVideoCallId) {
    await fetch(`${getVideoCallPath()}.json`, {
      method: "PATCH",
      body: JSON.stringify({ status: "ended", updatedAt: Date.now(), endedBy: currentUser })
    }).catch(error => console.warn("Could not end remote call", error));
    await sendVideoCallSystemMessage("📹 Video call ended.");
  }
  cleanupVideoCall(false);
}

function cleanupVideoCall(keepModalOpen = false, closeAfterDelay = false) {
  stopIncomingCallRingtone();
  clearInterval(videoCallPollTimer);
  videoCallPollTimer = null;

  if (videoCallPeerConnection) {
    videoCallPeerConnection.ontrack = null;
    videoCallPeerConnection.onicecandidate = null;
    videoCallPeerConnection.close();
  }

  if (videoCallLocalStream) {
    videoCallLocalStream.getTracks().forEach(track => track.stop());
  }

  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  const placeholder = document.getElementById("remoteVideoPlaceholder");
  if (localVideo) localVideo.srcObject = null;
  resetLocalVideoPreviewPosition();
  if (remoteVideo) remoteVideo.srcObject = null;
  if (placeholder) {
    placeholder.style.display = "flex";
    placeholder.textContent = "Waiting for video...";
  }
  clearTimeout(videoCallRemotePlayRetryTimer);
  videoCallRemotePlayRetryTimer = null;

  videoCallPeerConnection = null;
  videoCallLocalStream = null;
  currentVideoCallId = null;
  currentVideoCallPeer = null;
  currentVideoCallRole = null;
  currentIncomingVideoCall = null;
  videoCallSeenRemoteCandidates = new Set();
  videoCallRemoteDescriptionSet = false;
  videoCallRemoteStream = null;
  videoCallPendingRemoteCandidates = [];
  videoCallHasRemoteVideoTrack = false;
  videoCallMuted = false;
  videoCallCameraOff = false;
  setVideoCallButtons("active");
  updateVideoCallToggleButtons();

  if (keepModalOpen) return;
  if (closeAfterDelay) {
    setTimeout(hideVideoCallModalOnly, 1200);
  } else {
    hideVideoCallModalOnly();
  }
}

function updateVideoCallToggleButtons() {
  const muteBtn = document.getElementById("muteVideoCallBtn");
  const cameraBtn = document.getElementById("cameraVideoCallBtn");

  if (muteBtn) {
    muteBtn.textContent = videoCallMuted ? "🔇" : "🎙️";
    muteBtn.title = videoCallMuted ? "Unmute microphone" : "Mute microphone";
    muteBtn.setAttribute("aria-label", muteBtn.title);
    muteBtn.classList.toggle("is-off", videoCallMuted);
  }

  if (cameraBtn) {
    cameraBtn.textContent = videoCallCameraOff ? "🚫" : "📷";
    cameraBtn.title = videoCallCameraOff ? "Turn camera on" : "Turn camera off";
    cameraBtn.setAttribute("aria-label", cameraBtn.title);
    cameraBtn.classList.toggle("is-off", videoCallCameraOff);
  }
}

function toggleVideoCallMute() {
  if (!videoCallLocalStream) return;
  videoCallMuted = !videoCallMuted;
  videoCallLocalStream.getAudioTracks().forEach(track => { track.enabled = !videoCallMuted; });
  updateVideoCallToggleButtons();
}

function toggleVideoCallCamera() {
  if (!videoCallLocalStream) return;
  videoCallCameraOff = !videoCallCameraOff;
  videoCallLocalStream.getVideoTracks().forEach(track => { track.enabled = !videoCallCameraOff; });
  updateVideoCallToggleButtons();
}

async function sendVideoCallSystemMessage(text) {
  const peer = currentVideoCallPeer || currentChatUser;
  if (!currentUser || !peer || currentChatType === "group") return;
  const cid = chatId(currentUser, peer);
  const id = Date.now();
  await fetch(`${DB_URL}/chats/${cid}/messages/${id}.json`, {
    method: "PUT",
    body: JSON.stringify({
      type: "call",
      text,
      sender: currentUser,
      senderName: getCurrentDisplayName(),
      senderAvatar: getCurrentAvatar(),
      seen: false,
      createdAt: id,
      reactions: {}
    })
  }).catch(() => {});
  if (currentChatUser === peer) {
    forceChatScrollToBottomOnNextLoad = true;
    loadMessages();
  }
}

function getCurrentDisplayName() {
  const display = document.getElementById("userDisplay");
  return (display && display.innerText ? display.innerText : currentUser) || currentUser;
}

function getCurrentAvatar() {
  const avatarEl = document.getElementById("avatar");
  return (avatarEl && avatarEl.innerText ? avatarEl.innerText : "😀") || "😀";
}

async function loadChatAvatarForMessage(username, avatarElement) {
  if (!username || !avatarElement) return;

  if (chatAvatarCache[username]) {
    avatarElement.textContent = chatAvatarCache[username];
    return;
  }

  try {
    const userRes = await fetch(DB_URL+`/users/${username}.json`);
    const userData = await userRes.json() || {};
    const avatarValue = userData.avatar || "😀";
    chatAvatarCache[username] = avatarValue;

    if (avatarElement.dataset.sender === username) {
      avatarElement.textContent = avatarValue;
    }
  } catch (error) {
    avatarElement.textContent = "😀";
  }
}

function createChatMessageAvatar(message = {}) {
  const avatar = document.createElement("span");
  avatar.className = "chat-message-avatar";
  avatar.dataset.sender = message.sender || "";
  avatar.title = message.senderName || message.sender || "User";
  avatar.textContent = message.senderAvatar || chatAvatarCache[message.sender] || "😀";

  if (!message.senderAvatar && message.sender) {
    loadChatAvatarForMessage(message.sender, avatar);
  }

  return avatar;
}

function isCurrentGroupOwner(group = {}) {
  return currentChatType === "group" && group && group.owner === currentUser;
}

function toggleGroupChatForm(forceOpen = null) {
  const form = document.getElementById("groupChatCreateForm");
  if (!form) return;

  const shouldOpen = forceOpen === null ? form.classList.contains("hidden") : forceOpen;
  form.classList.toggle("hidden", !shouldOpen);

  if (shouldOpen) {
    const nameInput = document.getElementById("groupChatNameInput");
    if (nameInput) nameInput.value = "";
    loadGroupFriendSelector();
    setTimeout(() => nameInput?.focus(), 30);
  }
}

async function loadGroupFriendSelector() {
  const selector = document.getElementById("groupFriendSelector");
  if (!selector || !currentUser) return;

  const friendsRes = await fetch(DB_URL+"/users/"+currentUser+"/friends.json");
  const friends = await friendsRes.json() || {};
  const friendNames = Object.keys(friends);

  if (friendNames.length === 0) {
    selector.innerHTML = `<div class="folder-empty">Add friends first before creating a group chat.</div>`;
    return;
  }

  selector.innerHTML = "";
  for (const username of friendNames) {
    const userRes = await fetch(DB_URL+`/users/${username}.json`);
    const userData = await userRes.json() || {};
    const label = document.createElement("label");
    label.className = "group-friend-option";
    label.innerHTML = `
      <input type="checkbox" class="group-friend-checkbox" value="${escapeHTML(username)}">
      <span>${escapeHTML(userData.avatar || "😀")} ${escapeHTML(userData.displayName || username)} <span style="color:var(--text-secondary);">@${escapeHTML(username)}</span></span>
    `;
    selector.appendChild(label);
  }
}

async function createGroupChat() {
  const nameInput = document.getElementById("groupChatNameInput");
  const name = nameInput ? nameInput.value.trim() : "";
  const checked = Array.from(document.querySelectorAll(".group-friend-checkbox:checked")).map(input => input.value);

  if (!name) {
    showCustomAlert("Please enter a group chat name.", "Missing Group Name");
    return;
  }

  if (checked.length === 0) {
    showCustomAlert("Select at least one friend to add to the group chat.", "No Members Selected");
    return;
  }

  const id = Date.now();
  const members = { [currentUser]: true };
  checked.forEach(username => { members[username] = true; });

  await fetch(DB_URL+`/groupChats/${id}.json`, {
    method: "PUT",
    body: JSON.stringify({
      name,
      owner: currentUser,
      createdAt: id,
      members,
      messages: {}
    })
  });

  toggleGroupChatForm(false);
  await loadChatFriends();
  showCustomAlert(`Group chat "${name}" has been created.`, "Group Created");
}

async function loadChatFriends(){
  const container = document.getElementById("chatFriends");
  if (!container || !currentUser) return;

  const fragment = document.createDocumentFragment();

  const directTitle = document.createElement("div");
  directTitle.className = "group-chat-section-title";
  directTitle.textContent = "Direct Messages";
  fragment.appendChild(directTitle);

  let r = await fetch(DB_URL+"/users/"+currentUser+"/friends.json");
  let f = await r.json() || {};
  const directFriends = Object.keys(f);

  if(directFriends.length === 0){
    const empty = document.createElement("div");
    empty.style.color = "var(--text-secondary)";
    empty.style.padding = "10px";
    empty.textContent = "No friends yet. Add connections to chat!";
    fragment.appendChild(empty);
  } else {
    for(let x of directFriends){
      let uRes = await fetch(DB_URL+"/users/"+x+".json");
      let u = await uRes.json() || {};
      let friendDisplayName = u.displayName || x;

      let div = document.createElement("div");
      div.className = "chat-user-item";
      div.id = `chatuser-${x}`;
      div.onclick = () => openChat(x);

      let main = document.createElement("div");
      main.className = "chat-user-main";

      let nameSpan = document.createElement("span");
      nameSpan.className = "chat-user-name username-label";
      nameSpan.innerText = friendDisplayName;

      let subtitle = document.createElement("span");
      subtitle.className = "chat-user-subtitle";
      subtitle.innerText = `@${x}`;

      const presence = getPresenceInfo(u);
      let dot = document.createElement("span");
      dot.className = presence.online ? "online" : "offline";
      dot.innerText = ` ${presence.label}`;
      subtitle.appendChild(dot);

      main.appendChild(nameSpan);
      main.appendChild(subtitle);

      let actionGroup = document.createElement("div");
      actionGroup.className = "chat-user-actions";

      let deleteBtn = document.createElement("button");
      deleteBtn.className = "conversation-delete-btn";
      deleteBtn.type = "button";
      deleteBtn.title = "Delete full conversation";
      deleteBtn.innerHTML = "🗑️";
      deleteBtn.onclick = (event) => deleteConversation(x, event);

      let actionIndicator = document.createElement("span");
      actionIndicator.innerText = "💬";

      actionGroup.appendChild(deleteBtn);
      actionGroup.appendChild(actionIndicator);

      div.appendChild(main);
      div.appendChild(actionGroup);
      fragment.appendChild(div);
    }
  }

  const groupTitle = document.createElement("div");
  groupTitle.className = "group-chat-section-title";
  groupTitle.textContent = "Group Chats";
  fragment.appendChild(groupTitle);

  const groupsRes = await fetch(DB_URL+"/groupChats.json");
  const groups = await groupsRes.json() || {};
  const groupEntries = Object.entries(groups)
    .filter(([groupId, group]) => group && group.members && group.members[currentUser])
    .sort((a, b) => Number(b[1].updatedAt || b[1].createdAt || b[0]) - Number(a[1].updatedAt || a[1].createdAt || a[0]));

  if (groupEntries.length === 0) {
    const emptyGroup = document.createElement("div");
    emptyGroup.style.color = "var(--text-secondary)";
    emptyGroup.style.padding = "10px";
    emptyGroup.textContent = "No group chats yet. Create one above.";
    fragment.appendChild(emptyGroup);
  } else {
    for (const [groupId, group] of groupEntries) {
      const members = Object.keys(group.members || {});
      const memberPreview = members.slice(0, 4).map(username => username === currentUser ? "You" : `@${username}`).join(", ");
      const extraCount = members.length > 4 ? ` +${members.length - 4} more` : "";

      const div = document.createElement("div");
      div.className = "chat-user-item";
      div.id = `groupchat-${groupId}`;
      div.onclick = () => openGroupChat(groupId);

      const main = document.createElement("div");
      main.className = "chat-user-main";

      const nameSpan = document.createElement("span");
      nameSpan.className = "chat-user-name";
      nameSpan.innerHTML = `👥 ${escapeHTML(group.name || "Group Chat")} ${group.owner === currentUser ? '<span class="group-owner-badge">Owner</span>' : ""}`;

      const subtitle = document.createElement("span");
      subtitle.className = "group-member-preview";
      subtitle.textContent = `${members.length} members • ${memberPreview}${extraCount}`;

      main.appendChild(nameSpan);
      main.appendChild(subtitle);

      const actionGroup = document.createElement("div");
      actionGroup.className = "chat-user-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "conversation-delete-btn";
      deleteBtn.type = "button";
      deleteBtn.title = group.owner === currentUser ? "Delete group chat" : "Leave group chat";
      deleteBtn.innerHTML = group.owner === currentUser ? "🗑️" : "🚪";
      deleteBtn.onclick = (event) => deleteOrLeaveGroupChat(groupId, event);

      const actionIndicator = document.createElement("span");
      actionIndicator.innerText = "👥";

      actionGroup.appendChild(deleteBtn);
      actionGroup.appendChild(actionIndicator);

      div.appendChild(main);
      div.appendChild(actionGroup);
      fragment.appendChild(div);
    }
  }

  container.replaceChildren(fragment);
}

async function deleteConversation(user, event) {
  if (event) event.stopPropagation();

  const cid = chatId(currentUser, user);
  const userRes = await fetch(DB_URL+`/users/${user}.json`);
  const userData = await userRes.json() || {};
  const displayName = userData.displayName || user;

  showCustomConfirm(`Delete your full conversation with ${displayName}? This removes all messages in this chat.`, async () => {
    await fetch(DB_URL+`/chats/${cid}.json`, { method: "DELETE" });

    if (currentChatUser === user) {
      closeChat();
    }

    const row = document.getElementById(`chatuser-${user}`);
    if (row) row.remove();

    await loadChatFriends();
    scanNotifications();
    showCustomAlert("The full conversation has been deleted.", "Conversation Deleted");
  }, "Delete Conversation");
}

function deleteCurrentConversation(event) {
  if (currentChatType === "group" && currentChatGroupId) {
    deleteOrLeaveGroupChat(currentChatGroupId, event);
    return;
  }

  if (!currentChatUser) return;
  deleteConversation(currentChatUser, event);
}

async function deleteOrLeaveGroupChat(groupId, event) {
  if (event) event.stopPropagation();

  const groupRes = await fetch(DB_URL+`/groupChats/${groupId}.json`);
  const group = await groupRes.json();

  if (!group) {
    await loadChatFriends();
    return;
  }

  if (group.owner === currentUser) {
    showCustomConfirm(`Delete the group chat "${group.name || "Group Chat"}" for everyone?`, async () => {
      await fetch(DB_URL+`/groupChats/${groupId}.json`, { method: "DELETE" });
      if (currentChatType === "group" && currentChatGroupId === groupId) closeChat();
      await loadChatFriends();
      scanNotifications();
      showCustomAlert("The group chat has been deleted.", "Group Deleted");
    }, "Delete Group Chat");
    return;
  }

  showCustomConfirm(`Leave the group chat "${group.name || "Group Chat"}"?`, async () => {
    await fetch(DB_URL+`/groupChats/${groupId}/members/${currentUser}.json`, { method: "DELETE" });
    if (currentChatType === "group" && currentChatGroupId === groupId) closeChat();
    await loadChatFriends();
    scanNotifications();
    showCustomAlert("You left the group chat.", "Left Group");
  }, "Leave Group Chat");
}


function isChatScrolledNearBottom(threshold = 180) {
  const box = document.getElementById("messages");
  if (!box) return true;
  return (box.scrollHeight - box.scrollTop - box.clientHeight) <= threshold;
}

function scrollChatMessagesToBottom(behavior = "smooth", repeat = true) {
  const box = document.getElementById("messages");
  if (!box) return;

  const applyScroll = () => {
    // Setting scrollTop directly is the most reliable option on mobile browsers.
    // scrollTo is kept for smooth user-facing sends when supported.
    const target = box.scrollHeight;
    if (behavior === "smooth" && typeof box.scrollTo === "function") {
      box.scrollTo({ top: target, behavior: "smooth" });
    } else {
      box.scrollTop = target;
    }
  };

  clearTimeout(chatSmoothScrollTimer);
  if (chatScrollFrameId) cancelAnimationFrame(chatScrollFrameId);

  applyScroll();
  chatScrollFrameId = requestAnimationFrame(() => {
    applyScroll();

    if (repeat) {
      // Message images, GIFs, and browser layout can change height after the first render.
      // These follow-up passes prevent the chat from opening at the top.
      [80, 180, 360, 700].forEach((delay) => {
        chatSmoothScrollTimer = setTimeout(applyScroll, delay);
      });
    }
  });
}

function forceChatBottomForOpening() {
  forceChatScrollToBottomOnNextLoad = true;
  chatForceBottomUntil = Date.now() + 900;
}

function markOutgoingMessageForSmoothSend(messageId) {
  pendingChatMessageAnimationId = String(messageId);
  forceChatScrollToBottomOnNextLoad = true;
}

function animateNewChatMessage(wrapper, messageId, message = {}) {
  if (!wrapper) return;

  const isOutgoing = message && message.sender === currentUser;
  const isPendingOutgoing = isOutgoing && pendingChatMessageAnimationId && String(messageId) === pendingChatMessageAnimationId;

  wrapper.classList.remove("msg-send-animate", "msg-receive-animate", "msg-send-smooth", "msg-receive-smooth");

  if (isPendingOutgoing) {
    wrapper.classList.add("msg-send-smooth");
    wrapper.querySelector(".msg")?.classList.add("msg-bubble-smooth");
    pendingChatMessageAnimationId = null;
  } else if (!isOutgoing) {
    wrapper.classList.add("msg-receive-smooth");
  }

  setTimeout(() => {
    wrapper.classList.remove("msg-send-smooth", "msg-receive-smooth");
    wrapper.querySelector(".msg")?.classList.remove("msg-bubble-smooth");
  }, 700);
}

async function openChat(user){
  currentChatUser=user;
  currentChatType="direct";
  currentChatGroupId=null;
  clearReplyTarget();
  document.body.classList.add("chat-open");
  chatBox.style.display="flex";
  togglePhotoOptions(false);
  toggleEmojiOptions(false);
  
  let targetUserRes = await fetch(DB_URL+`/users/${user}.json`);
  let targetUserData = await targetUserRes.json() || {};
  chatWith.innerText = targetUserData.displayName || user;

  messages.innerHTML = ""; 
  lastChatData = "";
  forceChatBottomForOpening();
  await loadMessages();
  scrollChatMessagesToBottom("auto", true);
}

function closeChat() {
  setActiveChatMessageActions(null);
  chatBox.style.display="none";
  document.body.classList.remove("chat-open");
  currentChatUser=null;
  currentChatType="direct";
  currentChatGroupId=null;
  clearReplyTarget();
  toggleEmojiOptions(false);
  togglePhotoOptions(false);
  lastChatData = "";
}

// CHAT PHOTO ATTACHMENTS
function togglePhotoOptions(forceShow = null) {
  const drawer = document.getElementById("photoOptionsDrawer");
  if (!drawer) return;
  const shouldShow = forceShow === null ? !drawer.classList.contains("show") : forceShow;
  drawer.classList.toggle("show", shouldShow);
  if (shouldShow) toggleEmojiOptions(false);
}

function renderChatEmojiPicker() {
  const grid = document.getElementById("chatEmojiGrid");
  if (!grid || grid.children.length) return;

  CHAT_EMOJI_PICKER_EMOJIS.forEach(emoji => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    btn.title = `Add ${emoji}`;
    btn.onclick = () => insertChatEmoji(emoji);
    grid.appendChild(btn);
  });
}

function toggleEmojiOptions(forceShow = null) {
  const drawer = document.getElementById("emojiOptionsDrawer");
  if (!drawer) return;

  renderChatEmojiPicker();
  const shouldShow = forceShow === null ? !drawer.classList.contains("show") : forceShow;
  drawer.classList.toggle("show", shouldShow);
  if (shouldShow) togglePhotoOptions(false);
}

function insertChatEmoji(emoji) {
  const input = document.getElementById("chatInput");
  if (!input) return;

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  const nextPosition = start + emoji.length;
  input.focus();
  input.setSelectionRange(nextPosition, nextPosition);
  autoResizeTextarea(input);
  typing();
}

function triggerChatPhotoInput(source = "album") {
  const input = document.getElementById(source === "camera" ? "chatCameraInput" : "chatAlbumInput");
  if (!input) return;
  input.value = "";
  input.click();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImageForResize(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not prepare image preview."));
    img.src = dataUrl;
  });
}

async function prepareChatPhotoDataUrl(file) {
  const originalDataUrl = await readFileAsDataUrl(file);

  // Keep animated GIF/WebP files untouched so stickers/GIFs do not lose animation.
  if (/image\/(gif|webp)/i.test(file.type || "")) {
    return originalDataUrl;
  }

  try {
    const img = await loadImageForResize(originalDataUrl);
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(img.width || maxSide, img.height || maxSide));
    const width = Math.max(1, Math.round((img.width || maxSide) * scale));
    const height = Math.max(1, Math.round((img.height || maxSide) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.82);
  } catch (error) {
    return originalDataUrl;
  }
}

function getChatPhotoSource(message = {}) {
  const text = String(message.text || "").trim();

  if (message.photo) return message.photo;
  if (message.photoData) return message.photoData;
  if (message.image) return message.image;
  if (message.imageData) return message.imageData;
  if (message.attachment && String(message.attachment).startsWith("data:image/")) return message.attachment;
  if (message.mediaUrl && String(message.mediaUrl).startsWith("data:image/")) return message.mediaUrl;

  // Backward-compatible support for any older message that placed the data URL in text.
  if (text.startsWith("[PHOTO] data:image/")) return text.replace(/^\[PHOTO\]\s*/i, "");
  if (text.startsWith("data:image/")) return text;

  return "";
}

function getChatPhotoLabel(message = {}) {
  const text = String(message.text || "").trim();
  return message.photoName || message.fileName || text.replace(/^\[PHOTO\]\s*/i, "").trim() || "Photo";
}

async function handleChatPhotoInput(event, source = "album") {
  const input = event && event.target ? event.target : null;
  const file = input && input.files ? input.files[0] : null;
  if (!file) return;

  if (!file.type || !file.type.startsWith("image/")) {
    showCustomAlert("Please choose an image file only.", "Invalid File Type");
    input.value = "";
    return;
  }

  try {
    showToast("Preparing photo...");
    const dataUrl = await prepareChatPhotoDataUrl(file);
    await sendPhotoMessage(dataUrl, file.name || (source === "camera" ? "Captured photo" : "Photo"));
  } catch (error) {
    showCustomAlert("The photo could not be sent. Please try another image.", "Photo Failed");
  } finally {
    input.value = "";
    toggleEmojiOptions(false);
  }
}

async function sendPhotoMessage(photoDataUrl, fileName = "Photo") {
  const messagesUrl = getCurrentChatMessagesUrl();
  if (!messagesUrl || !photoDataUrl) return;

  const id = Date.now();
  const payload = {
    type: "photo",
    text: `[PHOTO] ${fileName}`,
    photo: photoDataUrl,
    photoName: fileName,
    sender: currentUser,
    senderName: getCurrentDisplayName(),
    senderAvatar: getCurrentAvatar(),
    seen: currentChatType === "direct" ? false : undefined,
    seenBy: currentChatType === "group" ? { [currentUser]: true } : undefined,
    createdAt: id,
    replyTo: getReplyPayloadForSending(),
    reactions: {}
  };

  const response = await fetch(`${messagesUrl}/${id}.json`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    showCustomAlert("The photo was too large or could not be uploaded. Try a smaller image.", "Photo Failed");
    return;
  }

  if (currentChatType === "group" && currentChatGroupId) {
    await fetch(DB_URL+`/groupChats/${currentChatGroupId}.json`, {
      method: "PATCH",
      body: JSON.stringify({ updatedAt: id })
    });
  }

  togglePhotoOptions(false);
  toggleEmojiOptions(false);
  clearReplyTarget();
  markOutgoingMessageForSmoothSend(id);
  await loadMessages();
  scrollChatMessagesToBottom("smooth");
  scanNotifications();
}

function getDirectChatImageUrl(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.startsWith("data:image/")) return value;
  if (/^https?:\/\/\S+\.(gif|png|jpe?g|webp)(\?\S*)?$/i.test(value)) return value;
  if (/^https?:\/\/(media\.giphy\.com|i\.giphy\.com|c\.tenor\.com|media\.tenor\.com)\/\S+/i.test(value)) return value;
  return "";
}

function handleChatInputKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

async function sendMessage(){
  let text=chatInput.value.trim();
  if(!text) return;

  const messagesUrl = getCurrentChatMessagesUrl();
  if (!messagesUrl) return;

  let id=Date.now();

  await fetch(`${messagesUrl}/${id}.json`,{
    method:"PUT",
    body:JSON.stringify({
      text,
      sender:currentUser,
      senderName:getCurrentDisplayName(),
      senderAvatar:getCurrentAvatar(),
      seen: currentChatType === "direct" ? false : undefined,
      seenBy: currentChatType === "group" ? { [currentUser]: true } : undefined,
      createdAt:id,
      replyTo: getReplyPayloadForSending(),
      reactions:{}
    })
  });

  if (currentChatType === "group" && currentChatGroupId) {
    await fetch(DB_URL+`/groupChats/${currentChatGroupId}.json`, {
      method: "PATCH",
      body: JSON.stringify({ updatedAt: id })
    });
  }

  chatInput.value="";
  clearReplyTarget();
  togglePhotoOptions(false);
  toggleEmojiOptions(false);
  autoResizeTextarea(chatInput);
  markOutgoingMessageForSmoothSend(id);
  await loadMessages();
  scrollChatMessagesToBottom("smooth");
  scanNotifications();
}


function formatChatTimestamp(value) {
  const date = new Date(Number(value) || Date.now());
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getReactionSummary(reactions = {}) {
  const summary = [];
  for (const emoji of CHAT_REACTION_EMOJIS) {
    const users = reactions && reactions[emoji] ? Object.keys(reactions[emoji]) : [];
    if (users.length > 0) summary.push({ emoji, count: users.length });
  }
  return summary;
}

function renderReactionPills(container, reactions = {}) {
  if (!container) return;
  const summary = getReactionSummary(reactions);
  container.innerHTML = "";
  container.style.display = summary.length ? "flex" : "none";

  summary.forEach(item => {
    const pill = document.createElement("span");
    pill.className = "msg-reaction-pill";
    pill.textContent = item.count > 1 ? `${item.emoji} ${item.count}` : item.emoji;
    container.appendChild(pill);
  });
}


function setActiveChatMessageActions(msgId = null) {
  activeChatMessageActionId = msgId ? String(msgId) : null;

  // Check every rendered chat row, not only rows that are already visible.
  // The previous selector only looked at .actions-visible rows, so the first
  // click could not reveal the + / delete controls when none were visible yet.
  document.querySelectorAll("#messages .msg-wrapper").forEach(wrapper => {
    wrapper.classList.toggle("actions-visible", wrapper.dataset.messageId === activeChatMessageActionId);
  });
}

function toggleChatMessageActions(msgId, event) {
  if (event) event.stopPropagation();
  const nextId = String(msgId);
  setActiveChatMessageActions(activeChatMessageActionId === nextId ? null : nextId);
}

function closeReactionPicker() {
  const picker = document.getElementById("chatReactionPicker");
  if (picker) picker.classList.remove("show");
  activeReactionMessageId = null;
}

function openReactionPicker(msgId, event) {
  if (event) event.stopPropagation();
  const picker = document.getElementById("chatReactionPicker");
  if (!picker) return;

  if (activeReactionMessageId === msgId && picker.classList.contains("show")) {
    closeReactionPicker();
    return;
  }

  activeReactionMessageId = msgId;
  picker.innerHTML = "";

  CHAT_REACTION_EMOJIS.forEach(emoji => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    btn.onclick = (emojiEvent) => reactToMessage(msgId, emoji, emojiEvent);
    picker.appendChild(btn);
  });

  const rect = event && event.currentTarget ? event.currentTarget.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0 };
  picker.classList.add("show");

  const pickerWidth = picker.offsetWidth || 260;
  const pickerHeight = picker.offsetHeight || 50;
  const left = Math.min(Math.max(8, rect.left + (rect.width / 2) - (pickerWidth / 2)), window.innerWidth - pickerWidth - 8);
  const top = Math.max(8, rect.top - pickerHeight - 8);

  picker.style.left = `${left}px`;
  picker.style.top = `${top}px`;
}

document.addEventListener("click", (event) => {
  const picker = document.getElementById("chatReactionPicker");
  const clickedMessage = event.target.closest(".msg-wrapper");
  const clickedMessageAction = event.target.closest(".msg-reaction-btn, .msg-del-btn");

  if (!clickedMessage && !clickedMessageAction && !event.target.closest(".reaction-picker")) {
    setActiveChatMessageActions(null);
  }

  if (!picker || !picker.classList.contains("show")) return;
  if (picker.contains(event.target) || clickedMessageAction) return;
  closeReactionPicker();
});

async function reactToMessage(msgId, emoji, event) {
  if (event) event.stopPropagation();
  if (!msgId || !emoji) return;

  const messagesUrl = getCurrentChatMessagesUrl();
  if (!messagesUrl) return;

  const msgRes = await fetch(`${messagesUrl}/${msgId}.json`);
  const message = await msgRes.json() || {};
  const reactions = message.reactions || {};
  const alreadyReacted = !!(reactions[emoji] && reactions[emoji][currentUser]);

  const cleanup = [];
  for (const existingEmoji of Object.keys(reactions)) {
    if (reactions[existingEmoji] && reactions[existingEmoji][currentUser]) {
      cleanup.push(fetch(`${messagesUrl}/${msgId}/reactions/${encodeURIComponent(existingEmoji)}/${currentUser}.json`, { method: "DELETE" }));
    }
  }
  await Promise.all(cleanup);

  if (!alreadyReacted) {
    await fetch(`${messagesUrl}/${msgId}/reactions/${encodeURIComponent(emoji)}/${currentUser}.json`, {
      method: "PUT",
      body: "true"
    });
  }

  closeReactionPicker();
  loadMessages();
}


function makeReplyPreviewText(message = {}) {
  const photoSource = getChatPhotoSource(message || {});
  const text = String(message.text || "").trim();

  if (photoSource || text.startsWith("[PHOTO] ")) return "📷 Photo";
  if (text.startsWith("[GIF] ")) return "GIF / animation";
  if (!text) return "Message";

  return text.replace(/\s+/g, " ").slice(0, 120);
}

function buildReplyPayload(msgId, message = {}) {
  return {
    id: String(msgId),
    sender: message.sender || "",
    senderName: message.senderName || message.sender || "User",
    text: makeReplyPreviewText(message),
    type: message.type || (getChatPhotoSource(message || {}) ? "photo" : "text")
  };
}

function setReplyTarget(msgId, message = {}) {
  activeReplyMessage = buildReplyPayload(msgId, message || {});
  renderActiveReplyPreview();
  const input = document.getElementById("chatInput");
  if (input) input.focus();
}

function clearReplyTarget() {
  activeReplyMessage = null;
  renderActiveReplyPreview();
}

function renderActiveReplyPreview() {
  const bar = document.getElementById("replyPreviewBar");
  const label = document.getElementById("replyPreviewLabel");
  const text = document.getElementById("replyPreviewText");
  if (!bar || !label || !text) return;

  if (!activeReplyMessage) {
    bar.classList.add("hidden");
    label.textContent = "Replying to message";
    text.textContent = "";
    return;
  }

  const author = activeReplyMessage.sender === currentUser ? "yourself" : (activeReplyMessage.senderName || activeReplyMessage.sender || "message");
  label.textContent = `Replying to ${author}`;
  text.textContent = activeReplyMessage.text || "Message";
  bar.classList.remove("hidden");
}

function renderMessageReplyQuoteHtml(reply = {}) {
  if (!reply || !reply.id) return "";
  const author = reply.sender === currentUser ? "You" : (reply.senderName || reply.sender || "User");
  const preview = reply.text || "Message";
  return `
    <div class="msg-reply-quote" onclick="event.stopPropagation(); scrollToRepliedMessage('${escapeHTML(reply.id)}')">
      <div class="msg-reply-author">${escapeHTML(author)}</div>
      <div class="msg-reply-text">${escapeHTML(preview)}</div>
    </div>
  `;
}

function scrollToRepliedMessage(msgId) {
  const target = document.getElementById(`msg-${msgId}`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("reply-highlight");
  setTimeout(() => target.classList.remove("reply-highlight"), 1200);
}

function attachSwipeReplyHandlers(wrapper, msgId, message = {}) {
  if (!wrapper) return;

  let startX = 0;
  let startY = 0;
  let dragging = false;
  let swipeReady = false;

  wrapper.onpointerdown = (event) => {
    if (event.target.closest("button, a, input, textarea, select")) return;
    startX = event.clientX;
    startY = event.clientY;
    dragging = true;
    swipeReady = false;
    wrapper.classList.remove("reply-snapback");
    wrapper.setPointerCapture?.(event.pointerId);
  };

  wrapper.onpointermove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) return;
    if (Math.abs(dx) < 8) return;

    event.preventDefault();
    const capped = Math.max(-82, Math.min(82, dx));
    wrapper.classList.add("reply-dragging");
    wrapper.style.transform = `translateX(${capped}px)`;
    swipeReady = Math.abs(dx) > 64;
  };

  const finishSwipe = () => {
    if (!dragging) return;
    dragging = false;
    wrapper.classList.remove("reply-dragging");
    wrapper.classList.add("reply-snapback");
    wrapper.style.transform = "";
    setTimeout(() => wrapper.classList.remove("reply-snapback"), 180);

    if (swipeReady) setReplyTarget(msgId, message || {});
    swipeReady = false;
  };

  wrapper.onpointerup = finishSwipe;
  wrapper.onpointercancel = finishSwipe;
}

function getReplyPayloadForSending() {
  return activeReplyMessage ? { ...activeReplyMessage } : null;
}

function getChatMessageRenderSignature(msgId, m = {}) {
  const isMe = m.sender === currentUser;
  return JSON.stringify({
    id: String(msgId),
    type: m.type || "text",
    sender: m.sender || "",
    senderName: m.senderName || "",
    senderAvatar: m.senderAvatar || "",
    text: m.text || "",
    photo: getChatPhotoSource(m || ""),
    photoName: getChatPhotoLabel(m || {}),
    createdAt: m.createdAt || msgId,
    replyTo: m.replyTo || null,
    seen: isMe ? !!m.seen : false,
    reactions: m.reactions || {}
  });
}

function renderChatMessageElement(msgId, m, existingWrapper = null) {
  const signature = getChatMessageRenderSignature(msgId, m || {});

  // Important: do not rebuild an existing message when nothing changed.
  // The chat refresh interval runs often; rebuilding the <img> node on each poll
  // makes photo messages reload visually, which looks like blinking/flickering.
  if (existingWrapper && existingWrapper.dataset.renderSignature === signature) {
    return existingWrapper;
  }

  const isMe = m.sender === currentUser;
  const wrapper = existingWrapper || document.createElement("div");
  wrapper.className = "msg-wrapper " + (isMe ? "me" : "them");
  wrapper.id = `msg-${msgId}`;
  wrapper.dataset.messageId = String(msgId);
  wrapper.dataset.renderSignature = signature;
  wrapper.classList.toggle("actions-visible", activeChatMessageActionId === String(msgId));
  wrapper.onclick = (event) => toggleChatMessageActions(msgId, event);
  attachSwipeReplyHandlers(wrapper, msgId, m || {});
  wrapper.innerHTML = "";

  let delBtn = null;
  if (isMe) {
    delBtn = document.createElement("button");
    delBtn.className = "msg-del-btn";
    delBtn.type = "button";
    delBtn.innerHTML = "🗑️";
    delBtn.onclick = (e) => { e.stopPropagation(); setActiveChatMessageActions(String(msgId)); deleteMessage(msgId); };
  }

  const avatarEl = createChatMessageAvatar(m || {});

  const stack = document.createElement("div");
  stack.className = "msg-content-stack";

  if (currentChatType === "group" && !isMe) {
    const senderLabel = document.createElement("div");
    senderLabel.className = "msg-sender-label";
    senderLabel.textContent = m.senderName || m.sender || "Group member";
    stack.appendChild(senderLabel);
  }

  const bubble = document.createElement("div");
  bubble.className = "msg";

  const messageText = String(m.text || "");
  const directImageUrl = getDirectChatImageUrl(messageText);
  const photoSource = getChatPhotoSource(m || {});
  if (photoSource) {
    const photoLabel = getChatPhotoLabel(m || {});
    bubble.innerHTML = `<span class="chat-media-caption">${escapeHTML(photoLabel)}</span><img src="${escapeHTML(photoSource)}" class="chat-media-view" alt="chat photo attachment" loading="lazy">`;
  } else if(messageText.startsWith("[PHOTO] ")) {
    const photoLabel = getChatPhotoLabel(m || {});
    bubble.innerHTML = `<span class="chat-media-caption">${escapeHTML(photoLabel)}</span><span style="font-size:12px; opacity:0.75;">Photo unavailable. Please ask the sender to resend the photo using the updated app.</span>`;
  } else if(messageText.startsWith("[GIF] ")) {
    const cleanUrl = messageText.replace("[GIF] ", "");
    bubble.innerHTML = `<span class="chat-media-caption">Sent animation</span><img src="${escapeHTML(cleanUrl)}" class="chat-media-view" alt="chat shared inline gif content" loading="lazy">`;
  } else if(directImageUrl) {
    bubble.innerHTML = `<span class="chat-media-caption">Sent media link</span><img src="${escapeHTML(directImageUrl)}" class="chat-media-view" alt="chat shared media link" loading="lazy"><span class="chat-media-link">${escapeHTML(messageText)}</span>`;
  } else if ((m.type || "") === "call") {
    bubble.classList.add("msg-call-bubble");
    bubble.textContent = messageText || "📹 Video call";
  } else {
    const messageTextNode = document.createElement("span");
    messageTextNode.textContent = messageText;
    bubble.appendChild(messageTextNode);
  }

  if (m.replyTo) {
    bubble.insertAdjacentHTML("afterbegin", renderMessageReplyQuoteHtml(m.replyTo));
  }

  if(isMe && m.seen) {
    const seenEye = document.createElement("span");
    seenEye.className = "seen-status";
    seenEye.style.fontSize = "10px";
    seenEye.style.marginLeft = "6px";
    seenEye.innerText = "👁️";
    bubble.appendChild(seenEye);
  }

  const time = document.createElement("div");
  time.className = "msg-time";
  time.textContent = formatChatTimestamp(m.createdAt || msgId);

  const reactionPills = document.createElement("div");
  reactionPills.className = "msg-reactions";
  renderReactionPills(reactionPills, m.reactions || {});

  stack.appendChild(bubble);
  stack.appendChild(time);
  stack.appendChild(reactionPills);

  const reactBtn = document.createElement("button");
  reactBtn.className = "msg-reaction-btn";
  reactBtn.type = "button";
  reactBtn.title = "React to message";
  reactBtn.innerText = "+";
  reactBtn.onclick = (event) => {
    event.stopPropagation();
    setActiveChatMessageActions(String(msgId));
    openReactionPicker(msgId, event);
  };

  if (isMe) {
    if (delBtn) wrapper.appendChild(delBtn);
    wrapper.appendChild(reactBtn);
    wrapper.appendChild(stack);
    wrapper.appendChild(avatarEl);
  } else {
    wrapper.appendChild(avatarEl);
    wrapper.appendChild(stack);
    wrapper.appendChild(reactBtn);
  }

  return wrapper;
}

async function deleteMessage(msgId) {
  showCustomConfirm("Do you really want to delete this message?", async () => {
    const messagesUrl = getCurrentChatMessagesUrl();
    if (!messagesUrl) return;
    await fetch(`${messagesUrl}/${msgId}.json`, {
      method: "DELETE"
    });
    let element = document.getElementById(`msg-${msgId}`);
    if(element) element.remove();
  }, "Delete Message");
}

async function loadMessages(){
  const messagesUrl = getCurrentChatMessagesUrl();
  if(!messagesUrl) return;

  const isOpeningChat = forceChatScrollToBottomOnNextLoad || Date.now() < chatForceBottomUntil;
  const shouldStayAtBottom = isOpeningChat || isChatScrolledNearBottom();
  const shouldUseSmoothScroll = !!pendingChatMessageAnimationId;

  let r=await fetch(`${messagesUrl}.json`);
  let data=await r.json() || {};

  if(Object.keys(data).length === 0){ 
    messages.innerHTML="<div style='text-align:center; color:var(--text-secondary); margin-top:20px;'>No messages. Say Hello!</div>"; 
    closeReactionPicker();
    forceChatScrollToBottomOnNextLoad = false;
    return;
  }

  if(messages.innerHTML.includes("No messages")) messages.innerHTML = "";

  Array.from(messages.children).forEach(child => {
    if(child.id && !data[child.id.replace('msg-', '')]) child.remove();
  });

  let addedNewMessage = false;
  const sortedEntries = Object.entries(data).sort((a, b) => Number(a[0]) - Number(b[0]));

  for(let [id,m] of sortedEntries){
    m = m || {};
    let existingMsg = document.getElementById(`msg-${id}`);
    let renderedMsg = renderChatMessageElement(id, m, existingMsg);

    if(!existingMsg) {
      messages.appendChild(renderedMsg);
      animateNewChatMessage(renderedMsg, id, m);
      addedNewMessage = true;
    } else if (messages.lastElementChild !== renderedMsg) {
      messages.appendChild(renderedMsg);
    }

    if(currentChatType === "direct" && m.sender !== currentUser && !m.seen){
      await fetch(`${messagesUrl}/${id}.json`,{
        method:"PATCH",
        body:JSON.stringify({seen:true})
      });
    }

    if(currentChatType === "group" && m.sender !== currentUser && !(m.seenBy && m.seenBy[currentUser])){
      await fetch(`${messagesUrl}/${id}/seenBy/${currentUser}.json`,{
        method:"PUT",
        body:"true"
      });
    }
  }

  if(shouldStayAtBottom) {
    scrollChatMessagesToBottom(shouldUseSmoothScroll ? "smooth" : "auto", isOpeningChat);
  }

  forceChatScrollToBottomOnNextLoad = false;
  if (isOpeningChat) chatForceBottomUntil = 0;
  scanNotifications();
}

// TYPING ENGINE INDICATORS
async function typing(){
  const typingUrl = getCurrentTypingUrl();
  if (!typingUrl) return;

  await fetch(`${typingUrl}/${currentUser}.json`,{
    method:"PUT", body:"true"
  });

  clearTimeout(typingTimeout);
  typingTimeout=setTimeout(async()=>{
    await fetch(`${typingUrl}/${currentUser}.json`,{
      method:"DELETE"
    });
  },1000);
}

async function loadTyping(){
  const typingUrl = getCurrentTypingUrl();
  if(!typingUrl) return;

  let r=await fetch(`${typingUrl}.json`);
  let d=await r.json() || {};
  const others = Object.keys(d).filter(username => username !== currentUser);

  if(others.length > 0) {
    const firstUser = others[0];
    typingStatus.innerText = currentChatType === "group"
      ? `${firstUser} is typing...`
      : `${firstUser} is typing...`;
  } else {
    typingStatus.innerText="";
  }
}

// LOOPS & SYNCHRONIZATION RUNTIMES
setInterval(async()=>{
  if(!currentChatUser) return;
  loadMessages();
  loadTyping();
},1200);

function loadAll(){
  loadFeed();
  loadFriends();
  loadRequests();
  loadChatFriends();
  loadProfilePosts();
  scanNotifications();
}

setInterval(async()=>{
  if(!currentUser) return;

  if(document.getElementById('view-feed').classList.contains('active')) {
    let r=await fetch(DB_URL+"/notes.json");
    let d=JSON.stringify(await r.json());
    if(d!==lastData){
      lastData=d;
      loadFeed();
    }
    if(currentActiveNoteId) {
      syncModalDetails(currentActiveNoteId);
    }
  }
  if(document.getElementById('view-friends').classList.contains('active')) {
    loadFriends();
    loadRequests();
  }
  if(document.getElementById('view-messages').classList.contains('active')) {
    loadChatFriends();
  }
  if(document.getElementById('view-profile').classList.contains('active')) {
    loadProfilePosts();
    loadFolders();
    loadHiddenPostsList();
  }

  scanNotifications();

},2000);

async function removeAccountData(username) {
  if (!username) return;

  const notesRes = await fetch(DB_URL + "/notes.json");
  const notes = await notesRes.json() || {};
  const usersRes = await fetch(DB_URL + "/users.json");
  const users = await usersRes.json() || {};

  const ownedNoteIds = [];

  for (const [noteId, note] of Object.entries(notes)) {
    if (!note) continue;

    if (note.owner === username) {
      ownedNoteIds.push(noteId);
      await fetch(DB_URL + `/notes/${noteId}.json`, { method: "DELETE" });
      continue;
    }

    const cleanupRequests = [];

    if (note.likes && note.likes[username]) {
      cleanupRequests.push(fetch(DB_URL + `/notes/${noteId}/likes/${username}.json`, { method: "DELETE" }));
    }

    for (const [commentId, comment] of Object.entries(note.comments || {})) {
      if (comment && comment.user === username) {
        cleanupRequests.push(fetch(DB_URL + `/notes/${noteId}/comments/${commentId}.json`, { method: "DELETE" }));
      }
    }

    if (note.sharedWith && note.sharedWith[username]) {
      cleanupRequests.push(fetch(DB_URL + `/notes/${noteId}/sharedWith/${username}.json`, { method: "DELETE" }));
    }

    await Promise.all(cleanupRequests);
  }

  const userCleanupRequests = [];

  for (const otherUsername of Object.keys(users)) {
    if (otherUsername === username) continue;

    userCleanupRequests.push(fetch(DB_URL + `/users/${otherUsername}/friends/${username}.json`, { method: "DELETE" }));
    userCleanupRequests.push(fetch(DB_URL + `/users/${otherUsername}/requests/${username}.json`, { method: "DELETE" }));

    for (const noteId of ownedNoteIds) {
      userCleanupRequests.push(fetch(DB_URL + `/users/${otherUsername}/savedNotes/${noteId}.json`, { method: "DELETE" }));
      userCleanupRequests.push(fetch(DB_URL + `/users/${otherUsername}/hiddenFeedPosts/${noteId}.json`, { method: "DELETE" }));
    }

    userCleanupRequests.push(fetch(DB_URL + `/chats/${chatId(username, otherUsername)}.json`, { method: "DELETE" }));
  }

  await Promise.all(userCleanupRequests);


  const groupsRes = await fetch(DB_URL + "/groupChats.json");
  const groups = await groupsRes.json() || {};
  const groupCleanupRequests = [];

  for (const [groupId, group] of Object.entries(groups)) {
    if (!group) continue;

    if (group.owner === username) {
      groupCleanupRequests.push(fetch(DB_URL + `/groupChats/${groupId}.json`, { method: "DELETE" }));
      continue;
    }

    if (group.members && group.members[username]) {
      groupCleanupRequests.push(fetch(DB_URL + `/groupChats/${groupId}/members/${username}.json`, { method: "DELETE" }));
    }

    for (const [msgId, msg] of Object.entries(group.messages || {})) {
      if (msg && msg.sender === username) {
        groupCleanupRequests.push(fetch(DB_URL + `/groupChats/${groupId}/messages/${msgId}.json`, { method: "DELETE" }));
        continue;
      }

      if (msg && msg.seenBy && msg.seenBy[username]) {
        groupCleanupRequests.push(fetch(DB_URL + `/groupChats/${groupId}/messages/${msgId}/seenBy/${username}.json`, { method: "DELETE" }));
      }

      for (const emoji of Object.keys((msg && msg.reactions) || {})) {
        if (msg.reactions[emoji] && msg.reactions[emoji][username]) {
          groupCleanupRequests.push(fetch(DB_URL + `/groupChats/${groupId}/messages/${msgId}/reactions/${encodeURIComponent(emoji)}/${username}.json`, { method: "DELETE" }));
        }
      }
    }

    if (group.typing && group.typing[username]) {
      groupCleanupRequests.push(fetch(DB_URL + `/groupChats/${groupId}/typing/${username}.json`, { method: "DELETE" }));
    }
  }

  await Promise.all(groupCleanupRequests);

  await fetch(DB_URL + `/users/${username}.json`, { method: "DELETE" });
  localStorage.removeItem(`notes_social_seen_notifications_${username}`);
  localStorage.removeItem("bottomNavHidden");
}

async function deleteAccount() {
  if (!currentUser) return;

  const usernameToDelete = currentUser;

  showCustomConfirm(
    "Delete your account permanently? This will remove your profile, posts, messages, friends, requests, saved items, folders, comments, likes, and shared-note access. This cannot be undone.",
    async () => {
      try {
        await removeAccountData(usernameToDelete);
        if (getSavedLoginUsername() === usernameToDelete) forgetSavedLogin();
        currentUser = null;
        currentChatUser = null;
        showCustomAlert("Your account and all related data have been deleted.", "Account Deleted", () => {
          location.reload();
        });
      } catch (error) {
        console.error("Account deletion failed", error);
        showCustomAlert("Account deletion failed. Please check your connection and try again.", "Delete Failed");
      }
    },
    "Delete Account"
  );
}

async function logout(){
  forgetSavedLogin();
  if(currentUser) {
    await setOnline(false, Date.now());
  }
  location.reload();
}

setupAutoResizeTextareas();

window.addEventListener('beforeunload', () => {
  if (currentVideoCallId) {
    fetch(`${getVideoCallPath()}.json`, {
      method: "PATCH",
      body: JSON.stringify({ status: "ended", updatedAt: Date.now(), endedBy: currentUser }),
      keepalive: true
    });
  }
  if(currentUser) {
    const offlineAt = Date.now();
    fetch(DB_URL+`/users/${currentUser}.json`, {
      method: "PATCH",
      body: JSON.stringify({ online: false, lastActiveAt: lastLocalActivityAt || offlineAt, lastOfflineAt: offlineAt }),
      keepalive: true
    });
  }
});
