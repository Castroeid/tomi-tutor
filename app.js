const elements = {
  entryScreen: document.getElementById("entry-screen"),
  enterBtn: document.getElementById("enter-btn"),
  leoAvatar: document.getElementById("leo-avatar"),
  preLesson: document.getElementById("pre-lesson"),
  talkYesBtn: document.getElementById("talk-yes-btn"),
  talkNoBtn: document.getElementById("talk-no-btn"),
  talkPanel: document.getElementById("talk-panel"),
  talkRecordBtn: document.getElementById("talk-record-btn"),
  talkStatus: document.getElementById("talk-status"),
  toLessonBtn: document.getElementById("to-lesson-btn"),
  voiceWarning: document.getElementById("voice-warning"),
  lessonMenu: document.getElementById("lesson-menu"),
  lessonTitle: document.getElementById("lesson-title"),
  exerciseList: document.getElementById("exercise-list"),
  exercisePanel: document.getElementById("exercise-panel"),
  exerciseTitle: document.getElementById("exercise-title"),
  exerciseText: document.getElementById("exercise-text"),
  statusMessage: document.getElementById("status-message"),
  matchArea: document.getElementById("match-area"),
  matchInstruction: document.getElementById("match-instruction"),
  matchProgress: document.getElementById("match-progress"),
  soundGrid: document.getElementById("sound-grid"),
  pictureGrid: document.getElementById("picture-grid"),
  choiceArea: document.getElementById("choice-area"),
  readArea: document.getElementById("read-area"),
  readSyllables: document.getElementById("read-syllables"),
  writingArea: document.getElementById("writing-area"),
  writingInstruction: document.getElementById("writing-instruction"),
  writingExample: document.getElementById("writing-example"),
  writingInputs: document.getElementById("writing-inputs"),
  speakAgainBtn: document.getElementById("speak-again"),
  successBtn: document.getElementById("success-btn"),
  hardBtn: document.getElementById("hard-btn"),
  endingPanel: document.getElementById("ending-panel"),
  endingBtns: document.querySelectorAll(".ending-btn"),
  parentPanel: document.getElementById("parent-panel"),
  parentStats: document.getElementById("parent-stats"),
  parentToggleBtn: document.getElementById("parent-toggle-btn"),
  parentContent: document.getElementById("parent-content"),
  parentProgressLabel: document.getElementById("parent-progress-label"),
  parentProgressFill: document.getElementById("parent-progress-fill"),
  parentResetBtn: document.getElementById("parent-reset-btn"),
  parentFeedback: document.getElementById("parent-feedback"),
};

const STORAGE_KEYS = {
  progress: "tomiTutorProgress",
  recordings: "tomiTutorRecordings",
};
const AI_BACKEND_URL = "https://tomi-tutor.onrender.com";

const NO_HEBREW_VOICE_WARNING = "בַּמַּכְשִׁיר הַזֶּה לֹא נִמְצָא קוֹל עִבְרִי.";
const NO_MALE_HEBREW_VOICE_WARNING = "במכשיר הזה לא נמצא קול עברי גברי. אפשר להחליף קול בהגדרות המכשיר.";
const NEXT_EXERCISE_LINE = "כָּל הַכָּבוֹד טוֹמִי, סִיַּמְתָּ אֶת הַתַּרְגִּיל.";
const ALMOST_DONE_LINE = "כִּמְעַט סִיַּמְנוּ. נִשְׁאַרוּ עוֹד כַּמָּה כַּרְטִיסִים.";
const CORRECT_LINE = "כָּל הַכָּבוֹד!";
const WRONG_LINE = "לֹא נָכוֹן, נְנַסֶּה שׁוּב.";
const SPEECH_FALLBACK_LINE = "לֹא שָׁמַעְתִּי. נַנְסֶּה שׁוּב?";
const LISTENING_LINE = "לִיאוֹ מַקְשִׁיב...";
const RESISTANT_SOFT_CHOICE =
  "אֲנִי מֵבִין. לֹא חַיָּבִים הַרְבֵּה. נַעֲשֶׂה רַק כַּרְטִיס אֶחָד אוֹ שֶׁתִּבְחַר מִשְׂחָק קָטָן?";

let lessonData = { title: "", exercises: [] };
let currentExerciseIndex = 0;
let selectedSound = null;
let matchedItems = new Set();
let currentChoiceItemIndex = 0;
let writingDrafts = [];
let lastSpokenText = "";
let hasHebrewVoice = true;
let hasMaleHebrewVoice = true;
let recognitionInProgress = false;
let activeMediaRecorder = null;
let activeRecorderChunks = [];
let silenceTimeoutId = null;
let activeAudioContext = null;
let activeAnalyser = null;
let activeMediaStream = null;
let offlineAudioMode = false;

function getAiConversationHelper() {
  if (window.AIConversation && typeof window.AIConversation.createLeoReply === "function") {
    return window.AIConversation;
  }
  return null;
}

function fallbackLeoReply(context) {
  const helper = getAiConversationHelper();
  if (!helper) {
    return {
      reply: SPEECH_FALLBACK_LINE,
      emotion: "unknown",
      nextAction: "encourage",
    };
  }
  return helper.createLeoReply(context);
}

function buildLeoPrompt(mode, recognizedText, exercise, learnerProgress) {
  const exerciseTitle = exercise?.title || "לֹא נִבְחַר תַּרְגִּיל";
  const completedCount = learnerProgress?.completedExercises?.length || 0;
  const difficultCount = learnerProgress?.difficultExercises?.length || 0;
  const emotionalHints =
    "אם הילד אומר 'עייף' תגיב בעדינות ותציע הפסקה קצרה. " +
    "אם הילד אומר 'קשה' פשט את המשימה בצעד קטן. " +
    "אם הילד אומר 'לא רוצה' תעודד בעדינות וללא לחץ.";

  return [
    "אַתָּה לֵיאוֹ, מוֹרֶה עִבְרִית חַם לְיַלְדֵי כִּתָּה א׳.",
    "תַּעֲנֶה רַק בְּעִבְרִית עִם נִקּוּד מָלֵא.",
    "מִשְׁפָּטִים קְצָרִים. טוֹן רָגוּעַ וְיְלָדוּתִי.",
    "אַל תִּשְׁתַּמֵּשׁ בְּתַבְנִית קְבוּעָה. תְּגוּבָה חַיֶּבֶת לְהִתְבַּסֵּס עַל מִלּוֹת הַיֶּלֶד.",
    emotionalHints,
    `הֶקְשֵׁר: ${mode}.`,
    `תַּרְגִּיל נוֹכְחִי: ${exerciseTitle}.`,
    `הִתְקַדְּמוּת: הֻשְׁלְמוּ ${completedCount}, מְאַתְגְּרִים ${difficultCount}.`,
    `מִלִּים שֶׁהַיֶּלֶד אָמַר: "${recognizedText || "..." }".`,
    "הַחְזֵר מִשְׁפָּט אוֹ שְׁנַיִם לְכָל הַיּוֹתֵר.",
  ].join(" ");
}

async function askLeoAI(contextOrMode, recognizedText, exercise, learnerProgress) {
  const context =
    typeof contextOrMode === "object" && contextOrMode !== null
      ? contextOrMode
      : {
          type: contextOrMode,
          recognizedText,
          message: buildLeoPrompt(contextOrMode, recognizedText, exercise, learnerProgress),
        };
  try {
    const response = await fetch(`${AI_BACKEND_URL}/api/leo-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcribedText: context?.recognizedText,
        message:
          context?.message ||
          context?.prompt ||
          "תן תגובה קצרה, חמה ומעודדת לתלמיד בכיתה א׳ לפני או אחרי תרגיל.",
      }),
    });

    if (!response.ok) throw new Error(`Leo chat failed: ${response.status}`);

    const data = await response.json();
    if (typeof data?.reply === "string" && data.reply.trim().length > 0) {
      return {
        reply: data.reply,
        emotion: data.emotion || "unknown",
        nextAction: data.nextAction || "encourage",
      };
    }
  } catch (error) {
    console.warn("askLeoAI falling back to local AIConversation:", error);
  }

  return fallbackLeoReply(context);
}

async function setTalkStatusFromAi(context) {
  const aiResult = await askLeoAI(context);
  if (aiResult?.reply) elements.talkStatus.textContent = aiResult.reply;
}

function startSpeechRecognition(onResult) {
  const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionApi) {
    throw new Error("Speech recognition is not supported");
  }

  const recognition = new SpeechRecognitionApi();
  recognition.lang = "he-IL";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const recognizedText = event?.results?.[0]?.[0]?.transcript?.trim() || "";
    onResult(recognizedText);
  };

  recognition.onerror = () => onResult("");
  recognition.onnomatch = () => onResult("");
  recognition.start();

  return recognition;
}

async function generateExercisesFromBackend(payload = {}) {
  try {
    const response = await fetch(`${AI_BACKEND_URL}/api/generate-exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Generate exercises failed: ${response.status}`);
    const data = await response.json();

    if (data && typeof data.title === "string" && Array.isArray(data.exercises)) {
      return data;
    }

    return null;
  } catch (error) {
    console.warn("generateExercisesFromBackend failed, using offline lesson:", error);
    return null;
  }
}

function defaultProgress() {
  return {
    completedExercises: [],
    difficultExercises: [],
    lastMood: null,
    moodAnswers: [],
    voiceReflections: [],
  };
}

let progress = defaultProgress();

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress);
    return raw ? { ...defaultProgress(), ...JSON.parse(raw) } : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
}

function saveRecordingMetadata(record) {
  const raw = localStorage.getItem(STORAGE_KEYS.recordings);
  const list = raw ? JSON.parse(raw) : [];
  list.push(record);
  localStorage.setItem(STORAGE_KEYS.recordings, JSON.stringify(list));
}

function getSavedRecordingsCount() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.recordings);
    return raw ? JSON.parse(raw).length : 0;
  } catch {
    return 0;
  }
}

async function getVoices() {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
  });
}

async function speak(text) {
  if (!text) return;
  lastSpokenText = text;
  speechSynthesis.cancel();
  const voices = await getVoices();
  const hebrewVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("he"));
  const maleHebrewVoices = hebrewVoices.filter((voice) => isMaleVoice(voice));
  const preferredVoicePool = maleHebrewVoices.length > 0 ? maleHebrewVoices : hebrewVoices;
  const hebrewVoice = preferredVoicePool
    .slice()
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
  hasHebrewVoice = Boolean(hebrewVoice);
  hasMaleHebrewVoice = maleHebrewVoices.length > 0;

  if (!hasHebrewVoice) {
    elements.voiceWarning.hidden = false;
    elements.voiceWarning.textContent = NO_HEBREW_VOICE_WARNING;
  } else if (!hasMaleHebrewVoice) {
    elements.voiceWarning.hidden = false;
    elements.voiceWarning.textContent = NO_MALE_HEBREW_VOICE_WARNING;
  } else {
    elements.voiceWarning.hidden = true;
    elements.voiceWarning.textContent = "";
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  utterance.rate = 0.85;
  utterance.pitch = 0.92;
  if (hebrewVoice) utterance.voice = hebrewVoice;
  speechSynthesis.speak(utterance);
}

function scoreVoice(voice) {
  const name = (voice?.name || "").toLowerCase();
  let score = 0;
  if (isMaleVoice(voice)) score += 4;
  if (name.includes("carmit") || name.includes("female") || name.includes("woman")) score -= 2;
  if (voice?.localService) score += 1;
  return score;
}

function isMaleVoice(voice) {
  const name = (voice?.name || "").toLowerCase();
  return name.includes("male") || name.includes("man") || name.includes("guy") || name.includes("גבר");
}

function currentExercise() {
  return lessonData.exercises[currentExerciseIndex];
}

function isExerciseCompleted(id) {
  return progress.completedExercises.includes(id);
}

function markCompleted(id) {
  if (!progress.completedExercises.includes(id)) {
    progress.completedExercises.push(id);
    saveProgress();
  }
}

function markDifficult(id) {
  if (!progress.difficultExercises.includes(id)) {
    progress.difficultExercises.push(id);
    saveProgress();
  }
}

function getExerciseStatus(index) {
  const exercise = lessonData.exercises[index];
  if (exercise.type === "future") return "future";
  if (isExerciseCompleted(exercise.id)) return "done";
  if (index === currentExerciseIndex) return "current";
  if (index < currentExerciseIndex) return "locked";
  if (index === currentExerciseIndex + 1) return "next";
  return "future";
}

function renderLessonMenu() {
  elements.lessonTitle.textContent = lessonData.title;
  elements.exerciseList.innerHTML = "";

  lessonData.exercises.forEach((exercise, index) => {
    const status = getExerciseStatus(index);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `exercise-card ${status}`;

    const statusLabel =
      status === "done"
        ? "הֻשְׁלַם ✓"
        : status === "current"
          ? "עַכְשָׁיו"
          : status === "next"
            ? "הַתַּרְגִּיל הַבָּא"
            : status === "locked"
              ? "נָעוּל"
              : "בַּקָּרוֹב";

    card.innerHTML = `
      <span class="exercise-name">${exercise.title}</span>
      <span class="exercise-badge">${statusLabel}</span>
    `;

    card.disabled = status === "locked" || status === "future" || status === "done";
    card.addEventListener("click", () => {
      if (exercise.type === "future" || status === "locked" || status === "done") {
        elements.statusMessage.textContent = "מִשְׂחָק קָטָן בַּסּוֹף — בַּקָּרוֹב";
        speak("בּוֹא נַמְשִׁיךְ יַחַד.");
        return;
      }
      currentExerciseIndex = index;
      renderLessonMenu();
      openExercise();
    });

    elements.exerciseList.appendChild(card);
  });
}

function hideExerciseSubAreas() {
  elements.matchArea.hidden = true;
  elements.choiceArea.hidden = true;
  elements.readArea.hidden = true;
  elements.writingArea.hidden = true;
}

function addClickFeedback(target) {
  const button = target?.closest?.("button");
  if (!button) return;
  button.classList.add("button-clicked");
  setTimeout(() => button.classList.remove("button-clicked"), 150);
}

function leoReaction(type) {
  const line = type === "correct" ? CORRECT_LINE : type === "wrong" ? WRONG_LINE : "בּוֹא נַמְשִׁיךְ יַחַד.";
  elements.statusMessage.textContent = line;
  speak(line);
}

function resetExerciseState() {
  selectedSound = null;
  matchedItems = new Set();
  currentChoiceItemIndex = 0;
  writingDrafts = [];
  elements.matchInstruction.textContent = "";
  elements.matchProgress.textContent = "";
  elements.soundGrid.innerHTML = "";
  elements.pictureGrid.innerHTML = "";
  elements.choiceArea.innerHTML = "";
  elements.readSyllables.textContent = "";
  elements.writingInstruction.textContent = "";
  elements.writingExample.textContent = "";
  elements.writingInputs.innerHTML = "";
}

function getChoiceItems(exercise) {
  if (Array.isArray(exercise.items) && exercise.items.length > 0) {
    return exercise.items;
  }

  return [
    {
      ...exercise,
      prompt: exercise.prompt || exercise.text,
      expectedAnswer: exercise.expectedAnswer || exercise.answer,
      distractors: exercise.distractors || exercise.options || [],
    },
  ];
}

function updateChoicePrompt(exercise, item, index, total) {
  const promptParts = [item.prompt || exercise.text];
  if (item.emoji) promptParts.push(item.emoji);
  if (total > 1) promptParts.push(`(${index + 1}/${total})`);
  elements.exerciseText.textContent = promptParts.join(" ");
}

function getFeedbackByExerciseType(exerciseType, isCorrect) {
  if (exerciseType === "same-opening-sound") {
    return isCorrect
      ? "נָכוֹן מְאֹד. שָׁמַעְתָּ אֶת הַצְּלִיל הָרִאשׁוֹן בְּדִיּוּק."
      : "נִסָּיוֹן יָפֶה. שִׁים לֵב — כָּאן הַצְּלִיל הָרִאשׁוֹן שׁוֹנֶה, כִּי הַנִּקּוּד שׁוֹנֶה.";
  }

  return isCorrect ? CORRECT_LINE : WRONG_LINE;
}

function renderChoiceItem(exercise) {
  const items = getChoiceItems(exercise);
  const item = items[currentChoiceItemIndex];
  if (!item) return;

  const correctAnswer = item.expectedAnswer;
  const choices = [...item.distractors];
  if (!choices.includes(correctAnswer)) choices.push(correctAnswer);

  updateChoicePrompt(exercise, item, currentChoiceItemIndex, items.length);
  elements.choiceArea.innerHTML = "";

  choices.forEach((option) => {
    const optionBtn = document.createElement("button");
    optionBtn.type = "button";
    optionBtn.className = "choice-card";
    optionBtn.textContent = option;
    optionBtn.addEventListener("click", () => {
      const isCorrect = option === correctAnswer;
      elements.statusMessage.textContent = getFeedbackByExerciseType(exercise.type, isCorrect);
      leoReaction(isCorrect ? "correct" : "wrong");
      if (!isCorrect) return;

      if (currentChoiceItemIndex < items.length - 1) {
        currentChoiceItemIndex += 1;
        renderChoiceItem(exercise);
      }
    });
    elements.choiceArea.appendChild(optionBtn);
  });
}

function renderMatchExercise(exercise) {
  selectedSound = null;
  matchedItems = new Set();
  elements.matchArea.hidden = false;
  elements.matchInstruction.textContent = exercise.instruction;
  elements.soundGrid.innerHTML = "";
  elements.pictureGrid.innerHTML = "";

  exercise.pairs.forEach((pair) => {
    const soundButton = document.createElement("button");
    soundButton.type = "button";
    soundButton.className = "sound-card";
    soundButton.textContent = pair.sound;
    soundButton.dataset.sound = pair.sound;
    soundButton.addEventListener("click", () => {
      selectedSound = pair.sound;
      elements.soundGrid.querySelectorAll(".sound-card").forEach((card) => {
        card.classList.toggle("selected", card.dataset.sound === selectedSound);
      });
      elements.statusMessage.textContent = `בָּחַרְתָּ ${pair.sound}. עַכְשָׁיו בְּחַר תְּמוּנָה.`;
      leoReaction("interaction");
    });
    elements.soundGrid.appendChild(soundButton);

    const pictureButton = document.createElement("button");
    pictureButton.type = "button";
    pictureButton.className = "picture-card";
    pictureButton.dataset.sound = pair.sound;
    pictureButton.innerHTML = `<span>${pair.emoji}</span>`;
    pictureButton.setAttribute("aria-label", pair.displayWordWithNikud || pair.word || "");
    pictureButton.addEventListener("click", () => {
      if (!selectedSound) {
        elements.statusMessage.textContent = "בְּחַר צְלִיל וְאָז תְּמוּנָה.";
        leoReaction("interaction");
        return;
      }

      if (selectedSound === pair.sound && !matchedItems.has(pair.sound)) {
        matchedItems.add(pair.sound);
        pictureButton.classList.add("matched");
        elements.soundGrid.querySelector(`[data-sound="${CSS.escape(pair.sound)}"]`)?.classList.add("matched");
        leoReaction("correct");
      } else {
        leoReaction("wrong");
      }

      elements.matchProgress.textContent = `${matchedItems.size}/${exercise.pairs.length}`;
    });

    elements.pictureGrid.appendChild(pictureButton);
  });

  elements.matchProgress.textContent = `0/${exercise.pairs.length}`;
}

function renderChoiceExercise(exercise) {
  currentChoiceItemIndex = 0;
  elements.choiceArea.hidden = false;
  renderChoiceItem(exercise);
}

function renderWritingExercise(exercise) {
  elements.writingArea.hidden = false;
  const modelWord = exercise.modelWord || exercise.displayWordWithNikud || exercise.word || "שָׁ";
  const instruction = exercise.writingInstruction || `✍️ כְּתוֹב אֶת ${modelWord} שָׁלוֹשׁ פְּעָמִים.`;
  writingDrafts = ["", "", ""];
  elements.writingInstruction.textContent = instruction;
  elements.writingExample.textContent = `דֻּגְמָה: ${modelWord}`;
  elements.writingInputs.innerHTML = "";

  writingDrafts.forEach((_, index) => {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "writing-input";
    input.placeholder = `${index + 1}`;
    input.setAttribute("aria-label", `כְּתִיבָה ${index + 1}`);
    input.addEventListener("input", (event) => {
      writingDrafts[index] = event.target.value;
    });
    elements.writingInputs.appendChild(input);
  });
}

function openExercise() {
  resetExerciseState();
  const exercise = currentExercise();
  elements.exercisePanel.hidden = false;
  elements.exerciseTitle.textContent = exercise.title;
  elements.exerciseText.textContent = exercise.text;
  elements.statusMessage.textContent = "";
  hideExerciseSubAreas();

  if (exercise.type === "match-opening-sound") {
    renderMatchExercise(exercise);
  }

  if (["missing-syllable", "same-opening-sound", "complete-word-letter"].includes(exercise.type)) {
    renderChoiceExercise(exercise);
  }

  if (exercise.type === "read-aloud-syllables") {
    elements.readArea.hidden = false;
    elements.readSyllables.textContent = exercise.syllables.join(" • ");
  }

  if (exercise.type === "writing-prompt") {
    renderWritingExercise(exercise);
  }

  speak(exercise.voiceText || exercise.text);
}

function allRealExercisesCompleted() {
  const ids = lessonData.exercises.filter((exercise) => exercise.type !== "future").map((exercise) => exercise.id);
  return ids.every((id) => progress.completedExercises.includes(id));
}

function canCompleteCurrentExercise() {
  const exercise = currentExercise();
  if (exercise.type === "match-opening-sound") {
    return matchedItems.size === exercise.pairs.length;
  }
  return true;
}

function moveToNextExercise() {
  const nextIndex = lessonData.exercises.findIndex(
    (exercise, index) => index > currentExerciseIndex && exercise.type !== "future" && !isExerciseCompleted(exercise.id)
  );
  if (nextIndex !== -1) {
    currentExerciseIndex = nextIndex;
    renderLessonMenu();
    openExercise();
    elements.statusMessage.textContent = "הַתַּרְגִּיל הַבָּא מוּכָן.";
  }

  if (allRealExercisesCompleted()) {
    elements.endingPanel.hidden = false;
    speak("אֵיךְ הָיָה לְךָ הַיּוֹם?");
  }
}

function renderParentPanel() {
  elements.parentPanel.hidden = false;
  const completed = progress.completedExercises.length;
  const difficult = progress.difficultExercises.length;
  const recordings = getSavedRecordingsCount();
  const lastMood = progress.lastMood || "—";
  const debugConversations = (progress.voiceReflections || [])
    .slice(-3)
    .reverse()
    .map((entry) =>
      `🧾 ${entry.transcribedText || "—"}<br>🤖 ${entry.aiReply || "—"}<br>➡ ${entry.nextAction || "—"}`
    );
  const total = lessonData.exercises.filter((exercise) => exercise.type !== "future").length || 1;
  const completedPercent = Math.round((completed / total) * 100);
  const completedNames = lessonData.exercises
    .filter((exercise) => progress.completedExercises.includes(exercise.id))
    .map((exercise) => `✓ ${exercise.title}`);
  const difficultNames = lessonData.exercises
    .filter((exercise) => progress.difficultExercises.includes(exercise.id))
    .map((exercise) => `⚠ ${exercise.title}`);

  elements.parentProgressLabel.textContent = `הִתְקַדְּמוּת: ${completedPercent}%`;
  elements.parentProgressFill.style.width = `${completedPercent}%`;

  elements.parentStats.innerHTML = `
    <li>תַּרְגִּילִים שֶׁהֻשְׁלְמוּ: ${completed}<br>${completedNames.join("<br>") || "—"}</li>
    <li>תַּרְגִּילִים מְאַתְגְּרִים: ${difficult}<br>${difficultNames.join("<br>") || "—"}</li>
    <li>מַצָּב רוּחַ אַחֲרוֹן: ${lastMood}</li>
    <li>מִסְפַּר הַקְלָטוֹת שֶׁנִּשְׁמְרוּ: ${recordings}</li>
    <li>לוֹג שִׂיחוֹת (לְהוֹרִים/דִּיבַּג):<br>${debugConversations.join("<br><br>") || "—"}</li>
  `;
}

function clearTestingData() {
  progress = defaultProgress();
  localStorage.removeItem(STORAGE_KEYS.progress);
  localStorage.removeItem(STORAGE_KEYS.recordings);
  recognitionInProgress = false;
  if (elements.talkRecordBtn) {
    elements.talkRecordBtn.textContent = "דַּבֵּר עוֹד";
  }

  if (lessonData.exercises.length > 0) {
    const firstPlayableExerciseIndex = lessonData.exercises.findIndex((exercise) => exercise.type !== "future");
    currentExerciseIndex = firstPlayableExerciseIndex === -1 ? 0 : firstPlayableExerciseIndex;
  } else {
    currentExerciseIndex = 0;
  }

  renderLessonMenu();
  if (!elements.exercisePanel.hidden) {
    openExercise();
  }
  renderParentPanel();
}

async function handleSpeechInput() {
  if (activeMediaRecorder && activeMediaRecorder.state === "recording") {
    stopConversationRecording();
    return;
  }
  await startConversationRecording();
}

async function transcribeAudioBlob(audioBlob) {
  const form = new FormData();
  form.append("audio", audioBlob, "tomi-recording.webm");
  const response = await fetch(`${AI_BACKEND_URL}/api/transcribe`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error(`Transcribe failed: ${response.status}`);
  const data = await response.json();
  return String(data?.text || "").trim();
}

async function speakWithBackend(text) {
  const response = await fetch(`${AI_BACKEND_URL}/api/leo-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(`leo-speech failed: ${response.status}`);
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  audio.onended = () => URL.revokeObjectURL(audioUrl);
  await audio.play();
}

function setTalkRecordButton(isRecording) {
  elements.talkRecordBtn.textContent = isRecording ? "סִיַּמְתִּי" : "דַּבֵּר עוֹד";
}

function clearRecorderInternals() {
  if (silenceTimeoutId) {
    clearTimeout(silenceTimeoutId);
    silenceTimeoutId = null;
  }
  if (activeAudioContext) {
    activeAudioContext.close();
  }
  activeAudioContext = null;
  activeAnalyser = null;
  if (activeMediaStream) {
    activeMediaStream.getTracks().forEach((track) => track.stop());
  }
  activeMediaStream = null;
}

function stopConversationRecording() {
  if (!activeMediaRecorder || activeMediaRecorder.state !== "recording") return;
  activeMediaRecorder.stop();
  clearRecorderInternals();
}

function monitorSilence() {
  if (!activeAnalyser || !activeMediaRecorder || activeMediaRecorder.state !== "recording") return;
  const sample = new Uint8Array(activeAnalyser.fftSize);
  activeAnalyser.getByteTimeDomainData(sample);
  let peak = 0;
  for (const value of sample) {
    peak = Math.max(peak, Math.abs(value - 128));
  }
  if (peak < 4) {
    if (!silenceTimeoutId) {
      silenceTimeoutId = setTimeout(() => {
        stopConversationRecording();
      }, 1400);
    }
  } else if (silenceTimeoutId) {
    clearTimeout(silenceTimeoutId);
    silenceTimeoutId = null;
  }
  requestAnimationFrame(monitorSilence);
}

async function startConversationRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    offlineAudioMode = true;
    await startSpeechRecognitionFallback();
    return;
  }

  try {
    activeMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    activeRecorderChunks = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    activeMediaRecorder = new MediaRecorder(activeMediaStream, mimeType ? { mimeType } : undefined);
    activeMediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        activeRecorderChunks.push(event.data);
      }
    };
    activeMediaRecorder.onstop = async () => {
      const audioBlob = new Blob(activeRecorderChunks, { type: mimeType || "audio/webm" });
      activeMediaRecorder = null;
      setTalkRecordButton(false);
      await processRecordedAudio(audioBlob);
    };

    activeAudioContext = new window.AudioContext();
    const source = activeAudioContext.createMediaStreamSource(activeMediaStream);
    activeAnalyser = activeAudioContext.createAnalyser();
    activeAnalyser.fftSize = 256;
    source.connect(activeAnalyser);

    elements.talkStatus.textContent = LISTENING_LINE;
    setTalkRecordButton(true);
    activeMediaRecorder.start();
    monitorSilence();
  } catch (error) {
    console.warn("startConversationRecording failed, switching to offline speech mode", error);
    offlineAudioMode = true;
    setTalkRecordButton(false);
    clearRecorderInternals();
    await startSpeechRecognitionFallback();
  }
}

async function processRecordedAudio(audioBlob) {
  try {
    const recognizedText = await transcribeAudioBlob(audioBlob);
    await processRecognizedSpeech(recognizedText);
  } catch (error) {
    console.warn("Recorded audio pipeline failed, switching to offline mode", error);
    offlineAudioMode = true;
    await startSpeechRecognitionFallback();
  }
}

async function processRecognizedSpeech(recognizedText) {
  if (!recognizedText) {
    elements.talkStatus.textContent = SPEECH_FALLBACK_LINE;
    await speak(SPEECH_FALLBACK_LINE);
    return;
  }

  const aiResult = await askLeoAI({
    type: "pre_lesson",
    recognizedText,
    message: buildLeoPrompt("pre_lesson", recognizedText, currentExercise(), progress),
  });
  const replyText = aiResult?.nextAction === "offer_choice" && aiResult?.emotion === "resistant"
    ? RESISTANT_SOFT_CHOICE
    : aiResult?.reply || SPEECH_FALLBACK_LINE;

  progress.voiceReflections.push({
    at: new Date().toISOString(),
    transcribedText: recognizedText,
    aiReply: replyText,
    nextAction: aiResult?.nextAction || "encourage",
    offline: offlineAudioMode,
  });
  saveProgress();
  renderParentPanel();

  elements.talkStatus.textContent = replyText;
  try {
    if (!offlineAudioMode) {
      await speakWithBackend(replyText);
      return;
    }
  } catch (error) {
    console.warn("leo-speech failed, falling back to speechSynthesis", error);
  }
  await speak(replyText);
}

async function startSpeechRecognitionFallback() {
  if (recognitionInProgress) return;
  recognitionInProgress = true;
  elements.talkStatus.textContent = LISTENING_LINE;

  try {
    startSpeechRecognition(async (recognizedText) => {
      recognitionInProgress = false;
      await processRecognizedSpeech(recognizedText);
    });
  } catch (error) {
    recognitionInProgress = false;
    console.warn("Speech recognition fallback unavailable", error);
    elements.talkStatus.textContent = SPEECH_FALLBACK_LINE;
    await speak(SPEECH_FALLBACK_LINE);
  }
}

async function loadLesson() {
  const generated = await generateExercisesFromBackend({
    topic: "Hebrew letter and syllable practice",
    level: "grade-1",
  });
  const isCompatibleGeneratedLesson =
    generated &&
    typeof generated.title === "string" &&
    Array.isArray(generated.exercises) &&
    generated.exercises.every((exercise) => exercise?.id && exercise?.type);

  if (isCompatibleGeneratedLesson) {
    return generated;
  }

  const response = await fetch("lessons/lesson-01.json");
  if (!response.ok) throw new Error("Could not load lesson");
  return response.json();
}

function showLessonFlow() {
  elements.lessonMenu.hidden = false;
  elements.exercisePanel.hidden = false;
  renderLessonMenu();
  openExercise();
  renderParentPanel();
}

elements.enterBtn.addEventListener("click", async () => {
  elements.entryScreen.hidden = true;
  elements.preLesson.hidden = false;
  await speak("שָׁלוֹם טוֹמִי, אֲנִי לִיאוֹ, הַמּוֹרֶה הַפְּרָטִי שֶׁלְּךָ.");
});

elements.talkYesBtn.addEventListener("click", async () => {
  elements.preLesson.hidden = true;
  elements.talkPanel.hidden = false;
  elements.talkStatus.textContent = LISTENING_LINE;
  await speak("מְעוּלֶּה, אֲנִי מַקְשִׁיב.");
  await startConversationRecording();
});

elements.talkNoBtn.addEventListener("click", () => {
  stopConversationRecording();
  elements.preLesson.hidden = true;
  leoReaction("interaction");
  showLessonFlow();
});

elements.toLessonBtn.addEventListener("click", () => {
  stopConversationRecording();
  elements.talkPanel.hidden = true;
  leoReaction("interaction");
  showLessonFlow();
});

elements.talkRecordBtn.addEventListener("click", handleSpeechInput);

elements.speakAgainBtn.addEventListener("click", () => speak(lastSpokenText));

elements.hardBtn.addEventListener("click", () => {
  markDifficult(currentExercise().id);
  elements.statusMessage.textContent = WRONG_LINE;
  leoReaction("wrong");
  renderParentPanel();
});

elements.successBtn.addEventListener("click", () => {
  const exercise = currentExercise();
  if (!canCompleteCurrentExercise()) {
    elements.statusMessage.textContent = ALMOST_DONE_LINE;
    speak(ALMOST_DONE_LINE);
    return;
  }

  markCompleted(exercise.id);
  renderLessonMenu();
  renderParentPanel();
  speak(NEXT_EXERCISE_LINE);
  elements.statusMessage.textContent = NEXT_EXERCISE_LINE;
  moveToNextExercise();
});

elements.endingBtns.forEach((button) => {
  button.addEventListener("click", () => {
    const mood = button.dataset.mood;
    progress.lastMood = mood;
    progress.moodAnswers.push({ mood, at: new Date().toISOString() });
    saveProgress();
    renderParentPanel();
    speak("תּוֹדָה שֶׁשִּׁתַּפְתָּ אוֹתִי.");
  });
});

elements.parentToggleBtn.addEventListener("click", () => {
  const isExpanded = elements.parentToggleBtn.getAttribute("aria-expanded") === "true";
  elements.parentToggleBtn.setAttribute("aria-expanded", String(!isExpanded));
  elements.parentContent.hidden = isExpanded;
});

elements.parentResetBtn?.addEventListener("click", () => {
  const shouldClear = window.confirm("לְאַשֵּׁר נִקּוּי נְתוּנֵי בְּדִיקָה?");
  if (!shouldClear) {
    elements.parentFeedback.textContent = "הַנִּקּוּי בֻּטַּל.";
    return;
  }
  clearTestingData();
  elements.parentFeedback.textContent = "נְתוּנֵי הַבְּדִיקָה נוּקּוּ.";
});

document.addEventListener("click", (event) => addClickFeedback(event.target), true);

async function setAvatar() {
  const imageUrl = "assets/leo/leo-avatar.png";
  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    if (response.ok) {
      elements.leoAvatar.style.backgroundImage = `url('${imageUrl}')`;
      elements.leoAvatar.classList.add("avatar-image");
      return;
    }
  } catch {
    // Keep fallback avatar
  }
  elements.leoAvatar.textContent = "לֵיאוֹ";
}

async function init() {
  progress = loadProgress();
  lessonData = await loadLesson();
  await setAvatar();
  setTalkRecordButton(false);
}

init();
