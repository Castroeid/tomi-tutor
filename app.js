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
const lessonEndingEl = document.getElementById("lesson-ending");

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
let lessonEndingOpen = false;

const STORAGE_KEYS = {
  progress: "tomiTutorProgress",
  recordings: "tomiTutorRecordings",
};

const TEACHER_LINES = {
  fallbackGreeting: "שָׁלוֹם טוֹמִי, אֵיזֶה כֵּיף שֶׁבָּאתָ.",
  clickHelp: "אֲנִי אִתְּךָ. נַעֲשֶׂה אֶת זֶה בְּיַחַד.",
  clickSuccess: "אֵיזֶה יוֹפִי טוֹמִי, הִצְלַחְתָּ!",
  clickDifficulty: "זֶה בְּסֵדֶר שֶׁקָּשֶׁה. אֲנַחְנוּ מִתְקַדְּמִים צַעַד צַעַד.",
  clickCorrect: "נָכוֹן מְאֹד, כָּל הַכָּבוֹד!",
  clickWrong: "נִסָּיוֹן יָפֶה. בּוֹא נְנַסֶּה שׁוּב לְאַט.",
  endingPrompt: "אֵיךְ הָיָה לְךָ הַיּוֹם?",
  endingResponses: {
    easy: "מְעֻלֶּה, אֲנִי גֵּאָה בְּךָ.",
    ok: "יָפֶה מְאֹד, עָשִׂיתָ דֶּרֶךְ חֲשׁוּבָה.",
    hard: "אֲנִי יוֹדַעַת שֶׁהָיָה קָשֶׁה, וַעֲדַיִן נִסִּיתָ. זֶה מְעֻלֶּה.",
    fun: "אֵיזֶה כֵּיף! נַמְשִׁיךְ גַּם בַּפַּעַם הַבָּאָה.",
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

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "בֹּקֶר טוֹב טוֹמִי, אֵיזֶה כֵּיף שֶׁבָּאתָ לִלְמֹד אִתִּי.";
  }
  if (hour >= 12 && hour < 18) {
    return "צָהֳרַיִם טוֹבִים טוֹמִי, אֵיזֶה כֵּיף שֶׁבָּאתָ לִלְמֹד אִתִּי.";
  }
  if (hour >= 18 && hour <= 23) {
    return "עֶרֶב טוֹב טוֹמִי, אֵיזֶה כֵּיף שֶׁבָּאתָ לִלְמֹד אִתִּי.";
  }
  return TEACHER_LINES.fallbackGreeting;
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
    "אֲנִי גֵּאָה בְּךָ טוֹמִי 🌟",
    "אֵיזֶה יוֹפִי, מַמְשִׁיכִים לְאַט וּבְכֵיף 😊",
    "כָּל נִסָּיוֹן עוֹזֵר לְךָ לִלְמֹד 💛",
    "עֲבוֹדָה נֶהְדֶּרֶת, טוֹמִי!",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function resetWorksheetState() {
  selectedSyllable = null;
  matchedItems = new Set();
}

function toggleLessonEnding(show) {
  lessonEndingOpen = show;
  lessonEndingEl.hidden = !show;
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

  updateWorksheetProgress(step);
}

function updateWorksheetProgress(step) {
  worksheetProgressEl.textContent = `הַתְאָמָה: ${matchedItems.size}/${step.pairs.length}`;
}

function checkWorksheetMatch(step, pictureCard) {
  if (!selectedSyllable) {
    statusMessageEl.textContent = "בְּחַר קוֹדֶם כַּרְטִיס צְלִיל גָּדוֹל, וְאָז תְּמוּנָה.";
    speak(TEACHER_LINES.clickWrong);
    return;
  }

  const cardSyllable = pictureCard.dataset.syllable;
  if (selectedSyllable === cardSyllable && !matchedItems.has(cardSyllable)) {
    matchedItems.add(cardSyllable);
    pictureCard.classList.add("matched");
    document
      .querySelector(`.syllable-card[data-syllable="${CSS.escape(cardSyllable)}"]`)
      ?.classList.add("matched");
    statusMessageEl.textContent = TEACHER_LINES.clickCorrect;
    speak(TEACHER_LINES.clickCorrect);
  } else if (matchedItems.has(cardSyllable)) {
    statusMessageEl.textContent = "אֶת הַכַּרְטִיס הַזֶּה כְּבָר הִתְאַמְתָּ. נִבְחַר אַחֵר.";
    speak(TEACHER_LINES.clickWrong);
  } else {
    statusMessageEl.textContent = TEACHER_LINES.clickWrong;
    speak(TEACHER_LINES.clickWrong);
  }

  updateWorksheetProgress(step);

  if (matchedItems.size === step.pairs.length) {
    statusMessageEl.textContent = `${step.encouragement} אֶפְשָׁר לִלְחוֹץ "אֲנִי מוּכָן" לַשָּׁלָב הַבָּא.`;
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
  toggleLessonEnding(false);

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

function openLessonEndingFlow() {
  toggleLessonEnding(true);
  statusMessageEl.textContent = TEACHER_LINES.endingPrompt;
  speak(TEACHER_LINES.endingPrompt);
}

function nextStep() {
  if (currentStepIndex < lessonData.steps.length - 1) {
    currentStepIndex += 1;
    updateStepUi();
  } else {
    stepCounterEl.textContent = `סִיַּמְתָּ ${lessonData.steps.length}/${lessonData.steps.length}`;
    statusMessageEl.textContent = "סִיַּמְתָּ אֶת הַשִּׁעוּר. כָּל הַכָּבוֹד, טוֹמִי! 🎉";
    openLessonEndingFlow();
  }
}

async function setupRecorder() {
  if (!navigator.mediaDevices?.getUserMedia) {
    statusMessageEl.textContent = "אֶפְשָׁר לְהַמְשִׁיךְ גַּם בְּלִי מִיקְרוֹפוֹן. נַמְשִׁיךְ בְּיַחַד.";
    return;
  }

  try {
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

      statusMessageEl.textContent = "הַהַקְלָטָה נִשְׁמְרָה. אֶפְשָׁר לִלְחוֹץ עַל שְׁמַע אוֹתִי.";
    };
  } catch (error) {
    statusMessageEl.textContent = "אֶפְשָׁר לְהַמְשִׁיךְ גַּם בְּלִי מִיקְרוֹפוֹן. נַמְשִׁיךְ בְּיַחַד.";
  }
}

speakAgainBtn.addEventListener("click", () => {
  const helpLine = TEACHER_LINES.clickHelp;
  statusMessageEl.textContent = helpLine;
  speak(helpLine);
});

readyBtn.addEventListener("click", () => {
  if (lessonEndingOpen) return;

  if (!hasStartedLesson) {
    hasStartedLesson = true;
    updateStepUi();
    return;
  }

  statusMessageEl.textContent = encouragement();
  nextStep();
});

recordBtn.addEventListener("click", async () => {
  if (lessonEndingOpen) return;

  if (!recorder) await setupRecorder();
  if (!recorder) return;

  if (!isRecording) {
    recorder.start();
    isRecording = true;
    recordBtn.textContent = "עֲצוֹר הַקְלָטָה";
    statusMessageEl.textContent = "אֲנִי מַקְלִיטָה אוֹתְךָ…";
  } else {
    recorder.stop();
    isRecording = false;
    recordBtn.textContent = "הַקְלֵט אוֹתִי";
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
  statusMessageEl.textContent = TEACHER_LINES.clickSuccess;
  speak(TEACHER_LINES.clickSuccess);
  openLessonEndingFlow();
});

hardBtn.addEventListener("click", () => {
  if (!hasStartedLesson || !lessonData) return;
  saveProgress(currentStep().id, "difficulty");
  statusMessageEl.textContent = TEACHER_LINES.clickDifficulty;
  speak(TEACHER_LINES.clickDifficulty);
});

lessonEndingEl.addEventListener("click", (event) => {
  const button = event.target.closest(".ending-btn");
  if (!button) return;

  const feeling = button.dataset.feeling;
  const response = TEACHER_LINES.endingResponses[feeling] || TEACHER_LINES.fallbackGreeting;
  statusMessageEl.textContent = response;
  speak(response);
});

function showWelcomeState() {
  const greeting = getTimeGreeting();
  lessonTitleEl.textContent = "בָּרוּךְ הַבָּא";
  stepCounterEl.textContent = "לִפְנֵי שֶׁמַּתְחִילִים";
  stepTitleEl.textContent = "שָׁלוֹם טוֹמִי";
  stepTextEl.textContent = "הַמּוֹרָה תְּדַבֵּר עַכְשָׁיו. כְּשֶׁתִּהְיֶה מוּכָן, לְחַץ עַל \"אֲנִי מוּכָן\".";
  choiceGridEl.hidden = true;
  choiceGridEl.innerHTML = "";
  hideWorksheet();
  writingPromptEl.hidden = true;
  playRecordingBtn.disabled = true;
  statusMessageEl.textContent = greeting;
  toggleLessonEnding(false);
  speak(greeting);
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
