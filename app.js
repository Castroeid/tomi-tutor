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

let lessonData = null;
let currentStepIndex = 0;
let recorder = null;
let recordingChunks = [];
let activeRecordingUrl = null;
let isRecording = false;
let hasStartedLesson = false;
let lastSpokenText = "";
let selectedSyllable = null;
let matchedItems = new Set();

const STORAGE_KEYS = {
  progress: "tomiTutorProgress",
  recordings: "tomiTutorRecordings",
};

const FALLBACK_LESSON = {
  id: "lesson-01",
  title: "שיעור 1: צלילים ראשונים והברות",
  steps: [
    {
      id: "worksheet-opening",
      type: "worksheet",
      title: "תרגיל פתיחה",
      text: "במה מתחילה כל מילה? נבחר יחד.",
      voiceText: "במה מתחילה כל מילה? נבחר יחד.",
      instruction: "במה מתחילה כל מילה? נבחר יחד.",
      pairs: [
        { syllable: "מ", emoji: "🫓", label: "מצה" },
        { syllable: "סי", emoji: "🚣", label: "סירה" },
        { syllable: "ני", emoji: "📄", label: "נייר" },
        { syllable: "ש", emoji: "☀️", label: "שמש" },
        { syllable: "צ", emoji: "🐢", label: "צב" },
        { syllable: "א", emoji: "🦁", label: "אריה" },
        { syllable: "ח", emoji: "🐌", label: "חילזון" },
        { syllable: "תי", emoji: "👜", label: "תיק" },
        { syllable: "ו", emoji: "🌹", label: "ורד" }
      ],
      encouragement: "יופי! מצאת הרבה צלילים פותחים."
    },
    {
      id: "missing-letter",
      type: "choices",
      title: "אות חסרה",
      text: "השלם את האות החסרה: _ימון. איזו אות מתאימה?",
      voiceText: "השלם את האות החסרה: לימון.",
      choices: [
        { emoji: "🍋", label: "ל" },
        { emoji: "🍋", label: "ש" },
        { emoji: "🍋", label: "צ" },
        { emoji: "🍋", label: "א" }
      ],
      encouragement: "אלוף! מצאת את האות הנכונה."
    },
    {
      id: "read-aloud",
      type: "read",
      title: "קריאה בקול",
      text: "קרא בקול: מָה שָׁם? נִיָה שָׂמָה תִיק.",
      voiceText: "עכשיו נקרא בקול יחד: מה שם? ניה שמה תיק.",
      encouragement: "יופי של קריאה!"
    },
    {
      id: "recording",
      type: "recording",
      title: "הקלט אותי",
      text: "לחץ על 'הקלט אותי', קרא את הצלילים: מ, ש, צ, א, ח, ו. ואז עצור.",
      voiceText: "לחץ על הקלט אותי, קרא את הצלילים מ, ש, צ, א, ח, ו, ואז עצור.",
      encouragement: "תודה שהקלטת! אפשר לשמוע אותך שוב."
    },
    {
      id: "writing",
      type: "writing",
      title: "כתיבה במחברת",
      text: "כתוב במחברת שלוש שורות קצרות: מ, ני, תי, ואז מילה אחת שמתחילה ב-ש.",
      voiceText: "עכשיו כתיבה במחברת: מ, ני, תי, ואז מילה שמתחילה בש.",
      encouragement: "הכתיבה שלך חשובה ויפה ✍️"
    }
  ]
};

function getVoices() {
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
  if (hebrewVoice) utterance.voice = hebrewVoice;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

function readProgress() {
  const raw = localStorage.getItem(STORAGE_KEYS.progress);
  return raw ? JSON.parse(raw) : [];
}

function saveProgress(stepId, result) {
  const progress = readProgress();
  progress.push({
    lessonId: lessonData.id,
    stepId,
    result,
    recordingTimestamp: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
}

function readRecordings() {
  const raw = localStorage.getItem(STORAGE_KEYS.recordings);
  return raw ? JSON.parse(raw) : [];
}

function saveRecording(stepId, base64Audio) {
  const recordings = readRecordings();
  recordings.push({
    lessonId: lessonData.id,
    stepId,
    timestamp: new Date().toISOString(),
    audioData: base64Audio,
  });
  localStorage.setItem(STORAGE_KEYS.recordings, JSON.stringify(recordings));
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function currentStep() {
  return lessonData.steps[currentStepIndex];
}

function encouragement() {
  const lines = [
    "אני גאה בך טוֹמִי 🌟",
    "איזה יופי, ממשיכים לאט ובכיף 😊",
    "כל ניסיון עוזר לך ללמוד 💛",
    "עבודה נהדרת, טוֹמִי!",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
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
      statusMessageEl.textContent = `בחרת ${pair.syllable}. עכשיו בחר מילה מתאימה.`;
    });
    syllableGridEl.appendChild(syllableCard);

    const pictureCard = document.createElement("button");
    pictureCard.type = "button";
    pictureCard.className = "picture-card";
    pictureCard.dataset.syllable = pair.syllable;
    pictureCard.innerHTML = `<span class="emoji">${pair.emoji}</span><span>${pair.label}</span>`;
    pictureCard.addEventListener("click", () => checkWorksheetMatch(step, pictureCard));
    pictureGridEl.appendChild(pictureCard);
  });

  updateWorksheetProgress(step);
}

function updateWorksheetProgress(step) {
  worksheetProgressEl.textContent = `התאמות: ${matchedItems.size}/${step.pairs.length}`;
}

function checkWorksheetMatch(step, pictureCard) {
  if (!selectedSyllable) {
    statusMessageEl.textContent = "בחר קודם כרטיס צליל גדול, ואז תמונה.";
    return;
  }

  const cardSyllable = pictureCard.dataset.syllable;
  if (selectedSyllable === cardSyllable && !matchedItems.has(cardSyllable)) {
    matchedItems.add(cardSyllable);
    pictureCard.classList.add("matched");
    document
      .querySelector(`.syllable-card[data-syllable="${CSS.escape(cardSyllable)}"]`)
      ?.classList.add("matched");
    statusMessageEl.textContent = "מעולה! התאמה נכונה.";
  } else if (matchedItems.has(cardSyllable)) {
    statusMessageEl.textContent = "כבר התאמת את הכרטיס הזה. בחר כרטיס אחר.";
  } else {
    statusMessageEl.textContent = "כמעט. ננסה התאמה אחרת יחד.";
  }

  updateWorksheetProgress(step);

  if (matchedItems.size === step.pairs.length) {
    statusMessageEl.textContent = `${step.encouragement} אפשר ללחוץ "אני מוכן" לשלב הבא.`;
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
  stepCounterEl.textContent = `שלב ${currentStepIndex + 1} מתוך ${lessonData.steps.length}`;
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

function nextStep() {
  if (currentStepIndex < lessonData.steps.length - 1) {
    currentStepIndex += 1;
    updateStepUi();
  } else {
    statusMessageEl.textContent = "סיימת את השיעור הראשון. כל הכבוד, טוֹמִי! 🎉";
    speak("סיימת את השיעור הראשון. כל הכבוד, טוֹמִי!");
  }
}

async function setupRecorder() {
  if (!navigator.mediaDevices?.getUserMedia) {
    statusMessageEl.textContent = "נוכל להמשיך גם בלי הקלטה. כשתהיה מוכן, ננסה שוב.";
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(stream);

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordingChunks.push(event.data);
  };

  recorder.onstop = async () => {
    const blob = new Blob(recordingChunks, { type: "audio/webm" });
    recordingChunks = [];
    activeRecordingUrl = URL.createObjectURL(blob);
    playRecordingBtn.disabled = false;

    const dataUrl = await blobToDataURL(blob);
    saveRecording(currentStep().id, dataUrl);

    statusMessageEl.textContent = "הקלטה נשמרה. אפשר ללחוץ על שמע אותי.";
  };
}

speakAgainBtn.addEventListener("click", () => {
  speak(lastSpokenText || currentStep()?.voiceText || currentStep()?.text || "");
});

readyBtn.addEventListener("click", () => {
  if (!hasStartedLesson) {
    hasStartedLesson = true;
    updateStepUi();
    return;
  }
  statusMessageEl.textContent = encouragement();
  nextStep();
});

recordBtn.addEventListener("click", async () => {
  try {
    if (!recorder) await setupRecorder();
    if (!recorder) return;

    if (!isRecording) {
      recorder.start();
      isRecording = true;
      recordBtn.textContent = "עצור הקלטה";
      statusMessageEl.textContent = "מקליט אותך…";
    } else {
      recorder.stop();
      isRecording = false;
      recordBtn.textContent = "הקלט אותי";
    }
  } catch (error) {
    statusMessageEl.textContent = "נוכל להמשיך גם בלי הקלטה. כשתהיה מוכן, ננסה שוב.";
  }
});

playRecordingBtn.addEventListener("click", () => {
  if (!activeRecordingUrl) return;
  const audio = new Audio(activeRecordingUrl);
  audio.play();
});

successBtn.addEventListener("click", () => {
  if (!hasStartedLesson || !lessonData) return;
  saveProgress(currentStep().id, "success");
  statusMessageEl.textContent = `${encouragement()} (סומן: הצלחתי)`;
});

hardBtn.addEventListener("click", () => {
  if (!hasStartedLesson || !lessonData) return;
  saveProgress(currentStep().id, "difficulty");
  statusMessageEl.textContent = "זה בסדר שהיה קשה. ננסה שוב יחד 💛";
});

function showWelcomeState() {
  lessonTitleEl.textContent = "ברוך הבא";
  stepCounterEl.textContent = "לפני שמתחילים";
  stepTitleEl.textContent = "שלום טוֹמִי";
  stepTextEl.textContent = "המורה תדבר קודם, ואז תלחץ על \"אני מוכן\" כדי לפתוח את התרגיל הראשון.";
  choiceGridEl.hidden = true;
  choiceGridEl.innerHTML = "";
  hideWorksheet();
  writingPromptEl.hidden = true;
  playRecordingBtn.disabled = true;
  statusMessageEl.textContent = "שלום טוֹמִי, איזה כיף שבאת ללמוד איתי.";
  speak(statusMessageEl.textContent);
}

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
  showWelcomeState();
}

init();
