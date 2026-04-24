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
  speakAgainBtn: document.getElementById("speak-again"),
  successBtn: document.getElementById("success-btn"),
  hardBtn: document.getElementById("hard-btn"),
  endingPanel: document.getElementById("ending-panel"),
  endingBtns: document.querySelectorAll(".ending-btn"),
  parentPanel: document.getElementById("parent-panel"),
  parentStats: document.getElementById("parent-stats"),
};

const STORAGE_KEYS = {
  progress: "tomiTutorProgress",
  recordings: "tomiTutorRecordings",
};

const FALLBACK_VOICE_WARNING = "לא נמצא קול עברי במכשיר הזה.";
const NEXT_EXERCISE_LINE = "כָּל הַכָּבוֹד טוֹמִי. עָבַרְנוּ לַתַּרְגִּיל הַבָּא.";
const ALMOST_DONE_LINE = "כִּמְעַט סִיַּמְנוּ. נִשְׁאַרוּ עוֹד כַּמָּה כַּרְטִיסִים.";

let lessonData = { title: "", exercises: [] };
let currentExerciseIndex = 0;
let selectedSound = null;
let matchedItems = new Set();
let currentChoiceItemIndex = 0;
let lastSpokenText = "";
let hasHebrewVoice = true;

let preLessonRecorder = null;
let preLessonChunks = [];
let isPreLessonRecording = false;

function getAiConversationHelper() {
  if (window.AIConversation && typeof window.AIConversation.createLeoReply === "function") {
    return window.AIConversation;
  }
  return null;
}

function setTalkStatusFromAi(context) {
  const helper = getAiConversationHelper();
  if (!helper) return;
  elements.talkStatus.textContent = helper.createLeoReply(context);
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
  const hebrewVoice = voices.find((voice) => voice.lang?.toLowerCase().startsWith("he"));
  hasHebrewVoice = Boolean(hebrewVoice);

  if (!hasHebrewVoice) {
    elements.voiceWarning.hidden = false;
    elements.voiceWarning.textContent = FALLBACK_VOICE_WARNING;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  utterance.rate = 0.92;
  if (hebrewVoice) utterance.voice = hebrewVoice;
  speechSynthesis.speak(utterance);
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

    const statusLabel = status === "done" ? "הֻשְׁלַם ✓" : status === "current" ? "עַכְשָׁיו" : "בַּקָּרוֹב";

    card.innerHTML = `
      <span class="exercise-name">${exercise.title}</span>
      <span class="exercise-badge">${statusLabel}</span>
    `;

    card.addEventListener("click", () => {
      if (exercise.type === "future") {
        elements.statusMessage.textContent = "מִשְׂחָק קָטָן בַּסּוֹף — בַּקָּרוֹב";
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

  return isCorrect ? "כָּל הַכָּבוֹד!" : "כְּדַאי לְנַסּוֹת שׁוּב.";
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
        return;
      }

      if (selectedSound === pair.sound && !matchedItems.has(pair.sound)) {
        matchedItems.add(pair.sound);
        pictureButton.classList.add("matched");
        elements.soundGrid.querySelector(`[data-sound="${CSS.escape(pair.sound)}"]`)?.classList.add("matched");
        elements.statusMessage.textContent = "נָכוֹן!";
      } else {
        elements.statusMessage.textContent = "נִסָּיוֹן יָפֶה, בּוֹא נְנַסֶּה שׁוּב.";
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

function openExercise() {
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
    elements.writingArea.hidden = false;
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
  const nextIndex = lessonData.exercises.findIndex((exercise, index) => index > currentExerciseIndex && exercise.type !== "future" && !isExerciseCompleted(exercise.id));
  if (nextIndex !== -1) {
    currentExerciseIndex = nextIndex;
    renderLessonMenu();
    openExercise();
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

  elements.parentStats.innerHTML = `
    <li>תַּרְגִּילִים שֶׁהֻשְׁלְמוּ: ${completed}</li>
    <li>תַּרְגִּילִים מְאַתְגְּרִים: ${difficult}</li>
    <li>מַצָּב רוּחַ אַחֲרוֹן: ${lastMood}</li>
    <li>מִסְפַּר הַקְלָטוֹת שֶׁנִּשְׁמְרוּ: ${recordings}</li>
  `;
}

async function preparePreLessonRecorder() {
  if (!navigator.mediaDevices?.getUserMedia) {
    elements.talkStatus.textContent = "אֵין מִיקְרוֹפוֹן זָמִין בַּמַּכְשִׁיר.";
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) preLessonChunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(preLessonChunks, { type: "audio/webm" });
      const metadata = {
        id: crypto.randomUUID(),
        type: "pre-lesson",
        createdAt: new Date().toISOString(),
        size: blob.size,
      };
      progress.voiceReflections.push(metadata);
      saveProgress();
      saveRecordingMetadata(metadata);
      preLessonChunks = [];
      setTalkStatusFromAi({
        type: "recording-saved",
        recordingSize: blob.size,
        completedExercises: progress.completedExercises.length,
      });
      renderParentPanel();
    };

    return recorder;
  } catch {
    elements.talkStatus.textContent = "לֹא הִצְלַחְנוּ לְהַפְעִיל אֶת הַמִּיקְרוֹפוֹן.";
    return null;
  }
}

async function loadLesson() {
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
  await speak("שָׁלוֹם טוֹמִי. בּוֹא נַתְחִיל יַחַד.");
});

elements.talkYesBtn.addEventListener("click", async () => {
  elements.preLesson.hidden = true;
  elements.talkPanel.hidden = false;
  setTalkStatusFromAi({ type: "conversation-start" });
  await speak("מָה אַתָּה רוֹצֶה לְסַפֵּר לִי?");
});

elements.talkNoBtn.addEventListener("click", () => {
  elements.preLesson.hidden = true;
  showLessonFlow();
});

elements.toLessonBtn.addEventListener("click", () => {
  elements.talkPanel.hidden = true;
  showLessonFlow();
});

elements.talkRecordBtn.addEventListener("click", async () => {
  if (!preLessonRecorder) {
    preLessonRecorder = await preparePreLessonRecorder();
  }
  if (!preLessonRecorder) return;

  if (!isPreLessonRecording) {
    preLessonRecorder.start();
    isPreLessonRecording = true;
    elements.talkRecordBtn.textContent = "עֲצוֹר הַקְלָטָה";
    elements.talkStatus.textContent = "מַקְלִיטִים…";
  } else {
    preLessonRecorder.stop();
    isPreLessonRecording = false;
    elements.talkRecordBtn.textContent = "הַקְלֵט";
  }
});

elements.speakAgainBtn.addEventListener("click", () => speak(lastSpokenText));

elements.hardBtn.addEventListener("click", () => {
  markDifficult(currentExercise().id);
  elements.statusMessage.textContent = "זֶה בְּסֵדֶר. נִתְאַמֵּן עוֹד פַּעַם.";
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
}

init();
