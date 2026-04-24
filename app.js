const lessonTitleEl = document.getElementById("lesson-title");
const stepCounterEl = document.getElementById("step-counter");
const statusMessageEl = document.getElementById("status-message");
const stepTitleEl = document.getElementById("step-title");
const stepTextEl = document.getElementById("step-text");
const choiceGridEl = document.getElementById("choice-grid");
const writingPromptEl = document.getElementById("writing-prompt");
const worksheetEl = document.getElementById("worksheet");
const worksheetInstructionEl = document.getElementById("worksheet-instruction");
const syllableGridEl = document.getElementById("syllable-grid");
const pictureGridEl = document.getElementById("picture-grid");
const worksheetProgressEl = document.getElementById("worksheet-progress");

const speakAgainBtn = document.getElementById("speak-again");
const readyBtn = document.getElementById("ready-btn");
const recordBtn = document.getElementById("record-btn");
const playRecordingBtn = document.getElementById("play-recording-btn");
const successBtn = document.getElementById("success-btn");
const hardBtn = document.getElementById("hard-btn");

const entryScreenEl = document.getElementById("entry-screen");
const enterBtn = document.getElementById("enter-btn");
const emotionFlowEl = document.getElementById("emotion-flow");
const reflectionRecordBtn = document.getElementById("reflection-record-btn");
const reflectionStatusEl = document.getElementById("reflection-status");
const startLessonBtn = document.getElementById("start-lesson-btn");
const lessonProgressEl = document.getElementById("lesson-progress");
const lessonControlsEl = document.getElementById("lesson-controls");
const stepContainerEl = document.getElementById("step-container");
const exerciseTrackerEl = document.getElementById("exercise-tracker");
const exerciseListEl = document.getElementById("exercise-list");

let lessonData = null;
let currentStepIndex = 0;
let lastSpokenText = "";
let selectedSyllable = null;
let matchedItems = new Set();
let activeRecordingUrl = null;
let isLessonRecording = false;
let isReflectionRecording = false;

let lessonRecorder = null;
let reflectionRecorder = null;
let lessonChunks = [];
let reflectionChunks = [];

const STORAGE_KEYS = {
  session: "tomiTutorSession",
  recordings: "tomiTutorRecordings",
};

const TEACHER = {
  name: "לִיאוֹ",
  opening: "שָׁלוֹם טוֹמִי, אֲנִי לִיאוֹ. אֲנִי אֶהְיֶה הַמּוֹרָה שֶׁלְּךָ הַיּוֹם.",
  moodQuestion: "אֵיךְ אַתָּה מַרְגִּישׁ עַכְשָׁיו?",
  moodResponse: {
    happy: "אֵיזֶה יֹפִי! הַשִּׂמְחָה שֶׁלְּךָ מְמַלֵּאת אֶת הַכִּתָּה.",
    tired: "תּוֹדָה שֶׁשִּׁתַּפְתָּ. נִלְמַד לְאַט וּבְנֹעַם.",
    hard: "אֲנִי אִתְּךָ. נִתְקַדֵּם בְּיַחַד צַעַד אַחַר צַעַד.",
    ready: "מְצוּיָן! אֲנַחְנוּ מוּכָנִים לְהַרְפַּתְקַת הַלְּמִידָה.",
  },
};

const FALLBACK_LESSON = {
  id: "lesson-01",
  title: "שִׁעוּר 1: צְלִילִים רִאשׁוֹנִים וְהַבָּרוֹת",
  steps: [
    {
      id: "worksheet-opening",
      type: "worksheet",
      title: "תַּרְגִּיל פְּתִיחָה",
      text: "בַּמָּה מַתְחִילָה כָּל מִלָּה? נִבְחַר יַחַד.",
      voiceText: "בַּמָּה מַתְחִילָה כָּל מִלָּה? נִבְחַר יַחַד.",
      instruction: "בַּמָּה מַתְחִילָה כָּל מִלָּה? נִבְחַר יַחַד.",
      pairs: [
        { syllable: "מ", emoji: "🫓", label: "מַצָּה" },
        { syllable: "סִי", emoji: "🚣", label: "סִירָה" },
        { syllable: "נִי", emoji: "📄", label: "נְיָר" },
        { syllable: "שׁ", emoji: "☀️", label: "שֶׁמֶשׁ" },
        { syllable: "צ", emoji: "🐢", label: "צָב" },
        { syllable: "א", emoji: "🦁", label: "אַרְיֵה" },
        { syllable: "ח", emoji: "🐌", label: "חִלָּזוֹן" },
        { syllable: "תִּי", emoji: "👜", label: "תִּיק" },
        { syllable: "ו", emoji: "🌹", label: "וֶרֶד" },
      ],
      encouragement: "יוֹפִי! מָצָאתָ הַרְבֵּה צְלִילִים פּוֹתְחִים.",
    },
    {
      id: "missing-letter",
      type: "choices",
      title: "אוֹת חֲסֵרָה",
      text: "הַשְׁלֵם אֶת הָאוֹת הַחֲסֵרָה: _ימוֹן. אֵיזוֹ אוֹת מַתְאִימָה?",
      voiceText: "הַשְׁלֵם אֶת הָאוֹת הַחֲסֵרָה: לִימוֹן.",
      choices: [
        { emoji: "🍋", label: "ל" },
        { emoji: "🍋", label: "ש" },
        { emoji: "🍋", label: "צ" },
        { emoji: "🍋", label: "א" },
      ],
      encouragement: "אַלּוּף! מָצָאתָ אֶת הָאוֹת הַנְּכוֹנָה.",
    },
    {
      id: "read-aloud",
      type: "read",
      title: "קְרִיאָה בְּקוֹל",
      text: "קְרָא בְּקוֹל: מָה שָׁם? נִיָּה שָׂמָה תִּיק.",
      voiceText: "עַכְשָׁיו נִקְרָא בְּקוֹל יַחַד: מָה שָׁם? נִיָּה שָׂמָה תִּיק.",
      encouragement: "יוֹפִי שֶׁל קְרִיאָה!",
    },
    {
      id: "recording",
      type: "recording",
      title: "הַקְלָטָה",
      text: "לְחַץ עַל 'הַקְלֵט אוֹתִי', קְרָא אֶת הַצְּלִילִים: מ, שׁ, צ, א, ח, ו. וְאָז עֲצוֹר.",
      voiceText: "לְחַץ עַל הַקְלֵט אוֹתִי, קְרָא אֶת הַצְּלִילִים מ, שׁ, צ, א, ח, ו, וְאָז עֲצוֹר.",
      encouragement: "תּוֹדָה שֶׁהִקְלַטְתָּ! אֶפְשָׁר לִשְׁמֹעַ אוֹתְךָ שׁוּב.",
    },
    {
      id: "writing",
      type: "writing",
      title: "כְּתִיבָה בַּמַּחְבֶּרֶת",
      text: "כְּתוֹב בַּמַּחְבֶּרֶת שָׁלוֹשׁ שׁוּרוֹת קְצָרוֹת: מ, נִי, תִּי, וְאָז מִלָּה אַחַת שֶׁמַּתְחִילָה בְּ־שׁ.",
      voiceText: "עַכְשָׁיו כְּתִיבָה בַּמַּחְבֶּרֶת: מ, נִי, תִּי, וְאָז מִלָּה שֶׁמַּתְחִילָה בְּשׁ.",
      encouragement: "הַכְּתִיבָה שֶׁלְּךָ חֲשׁוּבָה וְיָפָה ✍️",
    },
  ],
};

function defaultSessionState() {
  return {
    lessonId: null,
    startedAt: null,
    timestamps: [],
    moodAnswer: null,
    completedExercises: [],
    difficultExercises: [],
    voiceReflectionsCount: 0,
  };
}

let sessionState = defaultSessionState();

function readSessionState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    if (!raw) return defaultSessionState();
    return { ...defaultSessionState(), ...JSON.parse(raw) };
  } catch (error) {
    return defaultSessionState();
  }
}

function addTimestamp(type, stepId = null) {
  sessionState.timestamps.push({ type, stepId, at: new Date().toISOString() });
}

function saveSessionState() {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(sessionState));
}

function saveRecording(kind, stepId, base64Audio) {
  const raw = localStorage.getItem(STORAGE_KEYS.recordings);
  const recordings = raw ? JSON.parse(raw) : [];
  recordings.push({ lessonId: lessonData?.id || "lesson-01", kind, stepId, timestamp: new Date().toISOString(), audioData: base64Audio });
  localStorage.setItem(STORAGE_KEYS.recordings, JSON.stringify(recordings));
}

function currentStep() {
  return lessonData.steps[currentStepIndex];
}

async function getVoices() {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length) {
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
  const hebrewVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("he"));
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  utterance.rate = 0.9;
  if (hebrewVoice) utterance.voice = hebrewVoice;
  speechSynthesis.speak(utterance);
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function registerCompletedStep(stepId) {
  if (!sessionState.completedExercises.includes(stepId)) {
    sessionState.completedExercises.push(stepId);
    addTimestamp("completed", stepId);
    saveSessionState();
    renderExerciseTracker();
  }
}

function registerDifficultStep(stepId) {
  if (!sessionState.difficultExercises.includes(stepId)) {
    sessionState.difficultExercises.push(stepId);
  }
  addTimestamp("difficult", stepId);
  saveSessionState();
}

function renderExerciseTracker() {
  exerciseListEl.innerHTML = "";
  lessonData.steps.forEach((step, index) => {
    const item = document.createElement("div");
    const isDone = sessionState.completedExercises.includes(step.id);
    item.className = `exercise-item ${isDone ? "done" : ""}`;
    item.innerHTML = `
      <span class="exercise-index">${index + 1}</span>
      <span class="exercise-name">${step.title}</span>
      ${isDone ? '<span class="complete-badge">✓ הֻשְׁלַם</span>' : ""}
    `;
    exerciseListEl.appendChild(item);
  });
}

function resetWorksheetState() {
  selectedSyllable = null;
  matchedItems = new Set();
}

function renderWorksheet(step) {
  worksheetEl.hidden = false;
  worksheetInstructionEl.textContent = step.instruction;
  syllableGridEl.innerHTML = "";
  pictureGridEl.innerHTML = "";

  step.pairs.forEach((pair) => {
    const syllableCard = document.createElement("button");
    syllableCard.type = "button";
    syllableCard.className = "syllable-card";
    syllableCard.dataset.syllable = pair.syllable;
    syllableCard.textContent = pair.syllable;
    syllableCard.addEventListener("click", () => {
      selectedSyllable = pair.syllable;
      document.querySelectorAll(".syllable-card").forEach((card) => {
        card.classList.toggle("selected", card.dataset.syllable === selectedSyllable);
      });
      statusMessageEl.textContent = `בָּחַרְתָּ ${pair.syllable}. עַכְשָׁיו בְּחַר תְּמוּנָה מַתְאִימָה.`;
    });
    syllableGridEl.appendChild(syllableCard);

    const pictureCard = document.createElement("button");
    pictureCard.type = "button";
    pictureCard.className = "picture-card";
    pictureCard.dataset.syllable = pair.syllable;
    pictureCard.innerHTML = `<span class="emoji">${pair.emoji}</span>`;
    pictureCard.addEventListener("click", () => checkWorksheetMatch(step, pictureCard));
    pictureGridEl.appendChild(pictureCard);
  });

  worksheetProgressEl.textContent = `הַתְאָמָה: ${matchedItems.size}/${step.pairs.length}`;
}

function checkWorksheetMatch(step, pictureCard) {
  if (!selectedSyllable) {
    statusMessageEl.textContent = "בְּחַר קוֹדֶם כַּרְטִיס צְלִיל גָּדוֹל, וְאָז תְּמוּנָה.";
    return;
  }

  const cardSyllable = pictureCard.dataset.syllable;
  if (selectedSyllable === cardSyllable && !matchedItems.has(cardSyllable)) {
    matchedItems.add(cardSyllable);
    pictureCard.classList.add("matched");
    document.querySelector(`.syllable-card[data-syllable="${CSS.escape(cardSyllable)}"]`)?.classList.add("matched");
    statusMessageEl.textContent = "נָכוֹן מְאֹד, כָּל הַכָּבוֹד!";
  } else {
    statusMessageEl.textContent = "נִסָּיוֹן יָפֶה. בּוֹא נְנַסֶּה שׁוּב לְאַט.";
  }

  worksheetProgressEl.textContent = `הַתְאָמָה: ${matchedItems.size}/${step.pairs.length}`;
  if (matchedItems.size === step.pairs.length) {
    statusMessageEl.textContent = `${step.encouragement} אֶפְשָׁר לַעֲבוֹר לַשָּׁלָב הַבָּא.`;
  }
}

function hideWorksheet() {
  worksheetEl.hidden = true;
  worksheetInstructionEl.textContent = "";
  syllableGridEl.innerHTML = "";
  pictureGridEl.innerHTML = "";
  worksheetProgressEl.textContent = "";
}

function updateStepUi() {
  const step = currentStep();
  lessonTitleEl.textContent = lessonData.title;
  stepCounterEl.textContent = `שָׁלָב ${currentStepIndex + 1} מִתּוֹךְ ${lessonData.steps.length}`;
  stepTitleEl.textContent = step.title;
  stepTextEl.textContent = step.text;

  if (step.type === "worksheet" && step.pairs?.length) {
    resetWorksheetState();
    renderWorksheet(step);
    choiceGridEl.hidden = true;
    choiceGridEl.innerHTML = "";
  } else if (step.choices?.length) {
    hideWorksheet();
    choiceGridEl.hidden = false;
    choiceGridEl.innerHTML = "";
    step.choices.forEach((choice) => {
      const card = document.createElement("div");
      card.className = "choice-card";
      card.innerHTML = `${choice.emoji}<span>${choice.label}</span>`;
      choiceGridEl.appendChild(card);
    });
  } else {
    hideWorksheet();
    choiceGridEl.hidden = true;
    choiceGridEl.innerHTML = "";
  }

  writingPromptEl.hidden = step.type !== "writing";
  playRecordingBtn.disabled = !activeRecordingUrl;
  statusMessageEl.textContent = step.encouragement || "";
  speak(step.voiceText || step.text);
}

function goToNextStep() {
  if (currentStepIndex < lessonData.steps.length - 1) {
    registerCompletedStep(currentStep().id);
    currentStepIndex += 1;
    addTimestamp("step_opened", currentStep().id);
    saveSessionState();
    updateStepUi();
    return;
  }

  registerCompletedStep(currentStep().id);
  stepCounterEl.textContent = `סִיַּמְתָּ ${lessonData.steps.length}/${lessonData.steps.length}`;
  const doneText = "כָּל הַכָּבוֹד, טוֹמִי! סִיַּמְתָּ אֶת כָּל הַתַּרְגִּילִים. 🎉";
  statusMessageEl.textContent = doneText;
  speak(doneText);
}

async function setupRecorder(kind) {
  if (!navigator.mediaDevices?.getUserMedia) {
    const noMicText = "אֶפְשָׁר לְהַמְשִׁיךְ גַּם בְּלִי מִיקְרוֹפוֹן. נַמְשִׁיךְ בְּיַחַד.";
    statusMessageEl.textContent = noMicText;
    reflectionStatusEl.textContent = noMicText;
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size <= 0) return;
      if (kind === "reflection") {
        reflectionChunks.push(event.data);
      } else {
        lessonChunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const chunks = kind === "reflection" ? reflectionChunks : lessonChunks;
      const blob = new Blob(chunks, { type: "audio/webm" });
      if (kind === "reflection") {
        reflectionChunks = [];
      } else {
        lessonChunks = [];
      }

      if (kind === "lesson") {
        activeRecordingUrl = URL.createObjectURL(blob);
        playRecordingBtn.disabled = false;
      }

      const dataUrl = await blobToDataURL(blob);
      saveRecording(kind, kind === "lesson" ? currentStep().id : "voice-reflection", dataUrl);

      if (kind === "reflection") {
        sessionState.voiceReflectionsCount += 1;
        addTimestamp("reflection_saved");
        saveSessionState();
        reflectionStatusEl.textContent = "הַתְּשׁוּבָה נִשְׁמְרָה בַּמַּכְשִׁיר. תּוֹדָה!";
      } else {
        statusMessageEl.textContent = "הַהַקְלָטָה נִשְׁמְרָה. אֶפְשָׁר לִלְחוֹץ עַל שְׁמַע אוֹתִי.";
      }
    };

    return recorder;
  } catch (error) {
    const noMicText = "אֶפְשָׁר לְהַמְשִׁיךְ גַּם בְּלִי מִיקְרוֹפוֹן. נַמְשִׁיךְ בְּיַחַד.";
    statusMessageEl.textContent = noMicText;
    reflectionStatusEl.textContent = noMicText;
    return null;
  }
}

function startLessonUi() {
  emotionFlowEl.hidden = true;
  lessonProgressEl.hidden = false;
  exerciseTrackerEl.hidden = false;
  stepContainerEl.hidden = false;
  lessonControlsEl.hidden = false;

  currentStepIndex = 0;
  addTimestamp("lesson_started", currentStep().id);
  saveSessionState();
  updateStepUi();
}

enterBtn.addEventListener("click", async () => {
  entryScreenEl.hidden = true;
  emotionFlowEl.hidden = false;

  sessionState.startedAt = sessionState.startedAt || new Date().toISOString();
  addTimestamp("entered");
  saveSessionState();

  await speak(TEACHER.opening);
  statusMessageEl.textContent = TEACHER.opening;
  await speak(TEACHER.moodQuestion);
});

document.querySelectorAll(".mood-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const mood = button.dataset.mood;
    sessionState.moodAnswer = mood;
    addTimestamp("mood_selected");
    saveSessionState();

    const line = TEACHER.moodResponse[mood];
    reflectionStatusEl.textContent = line;
    speak(line);
  });
});

startLessonBtn.addEventListener("click", () => {
  if (!sessionState.moodAnswer) {
    reflectionStatusEl.textContent = "בְּחַר רֶגֶשׁ קוֹדֶם, וְאָז נַתְחִיל לִלְמֹד.";
    return;
  }
  startLessonUi();
});

reflectionRecordBtn.addEventListener("click", async () => {
  if (!reflectionRecorder) {
    reflectionRecorder = await setupRecorder("reflection");
  }
  if (!reflectionRecorder) return;

  if (!isReflectionRecording) {
    reflectionRecorder.start();
    isReflectionRecording = true;
    reflectionRecordBtn.textContent = "עֲצוֹר הַקְלָטָה";
    reflectionStatusEl.textContent = "מַקְלִיטִים אֶת הַתְּשׁוּבָה…";
    return;
  }

  reflectionRecorder.stop();
  isReflectionRecording = false;
  reflectionRecordBtn.textContent = "הַקְלֵט תְּשׁוּבָה";
});

speakAgainBtn.addEventListener("click", () => {
  if (!lastSpokenText) return;
  speak(lastSpokenText);
});

readyBtn.addEventListener("click", () => {
  goToNextStep();
});

recordBtn.addEventListener("click", async () => {
  if (!lessonRecorder) {
    lessonRecorder = await setupRecorder("lesson");
  }
  if (!lessonRecorder) return;

  if (!isLessonRecording) {
    lessonRecorder.start();
    isLessonRecording = true;
    recordBtn.textContent = "עֲצוֹר הַקְלָטָה";
    statusMessageEl.textContent = "אֲנִי מַקְלִיטָה אוֹתְךָ…";
    return;
  }

  lessonRecorder.stop();
  isLessonRecording = false;
  recordBtn.textContent = "הַקְלֵט אוֹתִי";
});

playRecordingBtn.addEventListener("click", () => {
  if (!activeRecordingUrl) return;
  new Audio(activeRecordingUrl).play();
});

successBtn.addEventListener("click", () => {
  registerCompletedStep(currentStep().id);
  const msg = "אֵיזֶה יוֹפִי טוֹמִי, הִצְלַחְתָּ!";
  statusMessageEl.textContent = msg;
  speak(msg);
});

hardBtn.addEventListener("click", () => {
  registerDifficultStep(currentStep().id);
  const msg = "זֶה בְּסֵדֶר שֶׁקָּשֶׁה. אֲנַחְנוּ מִתְקַדְּמִים צַעַד צַעַד.";
  statusMessageEl.textContent = msg;
  speak(msg);
});

async function loadLesson() {
  try {
    const response = await fetch("lessons/lesson-01.json");
    if (!response.ok) throw new Error("Lesson fetch failed");
    return await response.json();
  } catch (error) {
    return FALLBACK_LESSON;
  }
}

async function init() {
  lessonData = await loadLesson();
  sessionState = readSessionState();
  sessionState.lessonId = lessonData.id;
  saveSessionState();

  lessonTitleEl.textContent = "מוּכָנִים לְהַתְחָלָה";
  stepCounterEl.textContent = "";
  stepTitleEl.textContent = "";
  stepTextEl.textContent = "";
  renderExerciseTracker();
}

init();
