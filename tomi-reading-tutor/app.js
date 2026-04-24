const lessonTitleEl = document.getElementById("lesson-title");
const stepCounterEl = document.getElementById("step-counter");
const statusMessageEl = document.getElementById("status-message");
const stepTitleEl = document.getElementById("step-title");
const stepTextEl = document.getElementById("step-text");
const choiceGridEl = document.getElementById("choice-grid");
const writingPromptEl = document.getElementById("writing-prompt");

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

const STORAGE_KEYS = {
  progress: "tomiTutorProgress",
  recordings: "tomiTutorRecordings",
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
    "אני גאה בך תומי 🌟",
    "איזה יופי, ממשיכים לאט ובכיף 😊",
    "כל ניסיון עוזר לך ללמוד 💛",
    "עבודה נהדרת, תומי!",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function updateStepUi() {
  const step = currentStep();
  lessonTitleEl.textContent = lessonData.title;
  stepCounterEl.textContent = `שלב ${currentStepIndex + 1} מתוך ${lessonData.steps.length}`;
  stepTitleEl.textContent = step.title;
  stepTextEl.textContent = step.text;

  if (step.choices?.length) {
    choiceGridEl.hidden = false;
    choiceGridEl.innerHTML = "";
    step.choices.forEach((choice) => {
      const card = document.createElement("div");
      card.className = "choice-card";
      card.innerHTML = `${choice.emoji}<span>${choice.label}</span>`;
      choiceGridEl.appendChild(card);
    });
  } else {
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
    statusMessageEl.textContent = "סיימת את השיעור הראשון. כל הכבוד, תומי! 🎉";
    speak("סיימת את השיעור הראשון. כל הכבוד, תומי!");
  }
}

async function setupRecorder() {
  if (!navigator.mediaDevices?.getUserMedia) {
    statusMessageEl.textContent = "המכשיר לא תומך בהקלטה כרגע.";
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
  const step = currentStep();
  speak(step.voiceText || step.text);
});

readyBtn.addEventListener("click", () => {
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
    statusMessageEl.textContent = "לא הצלחתי לפתוח מיקרופון. אפשר לנסות שוב.";
  }
});

playRecordingBtn.addEventListener("click", () => {
  if (!activeRecordingUrl) return;
  const audio = new Audio(activeRecordingUrl);
  audio.play();
});

successBtn.addEventListener("click", () => {
  saveProgress(currentStep().id, "success");
  statusMessageEl.textContent = `${encouragement()} (סומן: הצלחתי)`;
});

hardBtn.addEventListener("click", () => {
  saveProgress(currentStep().id, "difficulty");
  statusMessageEl.textContent = "זה בסדר שהיה קשה. ננסה שוב יחד 💛";
});

async function init() {
  const response = await fetch("lessons/lesson-01.json");
  lessonData = await response.json();
  updateStepUi();
}

init();
