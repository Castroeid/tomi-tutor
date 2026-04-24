require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const multer = require("multer");
const { toFile } = require("openai/uploads");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
const upload = multer({ storage: multer.memoryStorage() });

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function missingApiKeyResponse(res) {
  return res.status(500).json({
    error: "OPENAI_API_KEY is not configured on the server. Add it to the environment variables before using AI endpoints.",
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/leo-chat", async (req, res) => {
  const client = getClient();

  if (!client) {
    return missingApiKeyResponse(res);
  }

  const userMessage = req.body?.message;
  const transcribedText = req.body?.transcribedText;
  const activeText = typeof transcribedText === "string" && transcribedText.trim() ? transcribedText : userMessage;

  if (!activeText || typeof activeText !== "string") {
    return res.status(400).json({ error: "message or transcribedText (string) is required." });
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
            "Leo is a warm male Hebrew corrective-reading tutor for first grade.",
            "Answer the actual child message, never a fixed template.",
            "Reply in Hebrew only, with nikud when possible.",
            "Keep replies short: 1-3 sentences.",
            "Never shame, pressure, or argue.",
            "Always validate emotion first, then offer one tiny next step.",
            "If resistant, offer a small choice.",
            "If child says \"אני יודע\", respond respectfully and ask for one tiny proof.",
            "If angry/frustrated, reduce difficulty and offer a break.",
            "Teach reading precisely: sound = letter + nikud.",
            "Classify emotion as one of: tired|frustrated|resistant|proud|ready|unknown.",
            "Classify nextAction as one of: continue|pause|simplify|encourage|offer_choice.",
            "Return strict JSON only in this shape:",
            '{"reply":"string","emotion":"...","nextAction":"..."}',
          ].join(" "),
        },
        {
          role: "user",
          content: activeText,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "leo_reply",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              reply: { type: "string" },
              emotion: {
                type: "string",
                enum: ["tired", "frustrated", "resistant", "proud", "ready", "unknown"],
              },
              nextAction: {
                type: "string",
                enum: ["continue", "pause", "simplify", "encourage", "offer_choice"],
              },
            },
            required: ["reply", "emotion", "nextAction"],
          },
        },
      },
      temperature: 0.6,
    });

    const rawContent = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent);
    const payload = {
      reply: parsed.reply || "",
      emotion: parsed.emotion || "unknown",
      nextAction: parsed.nextAction || "encourage",
    };

    console.log("/api/leo-chat debug:", {
      transcribedText: activeText,
      aiReply: payload.reply,
      nextAction: payload.nextAction,
    });

    return res.json(payload);
  } catch (error) {
    console.error("/api/leo-chat error:", error);
    return res.status(500).json({ error: "Failed to generate Leo chat response." });
  }
});

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  const client = getClient();
  if (!client) {
    return missingApiKeyResponse(res);
  }

  if (!req.file?.buffer) {
    return res.status(400).json({ error: "audio (form-data file) is required." });
  }

  try {
    const filename = req.file.originalname || "recording.webm";
    const audioFile = await toFile(req.file.buffer, filename, { type: req.file.mimetype || "audio/webm" });

    const transcription = await client.audio.transcriptions.create({
      model: process.env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe",
      file: audioFile,
      language: "he",
    });

    return res.json({ text: (transcription.text || "").trim() });
  } catch (error) {
    console.error("/api/transcribe error:", error);
    return res.status(500).json({ error: "Failed to transcribe audio." });
  }
});

app.post("/api/leo-speech", async (req, res) => {
  const client = getClient();
  if (!client) {
    return missingApiKeyResponse(res);
  }

  const text = req.body?.text;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text (string) is required." });
  }

  try {
    const speech = await client.audio.speech.create({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE || "alloy",
      input: text,
      format: "mp3",
      instructions: "Warm male Hebrew tutor voice for a first-grade child.",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.send(buffer);
  } catch (error) {
    console.error("/api/leo-speech error:", error);
    return res.status(500).json({ error: "Failed to synthesize speech." });
  }
});

app.post("/api/generate-exercises", async (req, res) => {
  const client = getClient();

  if (!client) {
    return missingApiKeyResponse(res);
  }

  const topic = req.body?.topic || "Hebrew letter and syllable practice";
  const level = req.body?.level || "grade-1";

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "Generate 5 short Hebrew literacy exercises for first graders. Return JSON only with this shape: { exercises: [{ title: string, instruction: string }] }",
        },
        {
          role: "user",
          content: `Topic: ${String(topic)}. Level: ${String(level)}.`,
        },
      ],
      temperature: 0.4,
    });

    let parsed;
    try {
      parsed = JSON.parse(response.output_text || "{}");
    } catch {
      parsed = { exercises: [] };
    }

    return res.json(parsed);
  } catch (error) {
    console.error("/api/generate-exercises error:", error);
    return res.status(500).json({ error: "Failed to generate exercises." });
  }
});

app.listen(port, () => {
  console.log(`Tomi Tutor backend listening on port ${port}`);
});
