require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

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

  if (!userMessage || typeof userMessage !== "string") {
    return res.status(400).json({ error: "message (string) is required." });
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You are Leo, a warm Hebrew reading tutor for first-grade children. Keep responses short, encouraging, and age-appropriate.",
        },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
    });

    return res.json({
      reply: response.output_text || "",
    });
  } catch (error) {
    console.error("/api/leo-chat error:", error);
    return res.status(500).json({ error: "Failed to generate Leo chat response." });
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
