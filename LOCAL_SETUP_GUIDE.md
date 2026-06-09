# TestSuiteGen — Local Machine Execution & AI API Expansion Guide

Welcome, Aman! This guide explains exactly how to run **TestSuiteGen** on your local machine and how to easily integrate different AI engines (such as OpenAI, Anthropic Claude, or **local offline models via Ollama**) in the future.

---

## Part 1: How to Run on Your Local Machine

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js**: Version 18 or 20+ (Verify via `node -v`)
* **npm**: Installed automatically with Node.js (Verify via `npm -v`)

### 2. Installation Steps
1. **Download or Clone** your project directory to your local folder.
2. Open your terminal in the project directory root.
3. Run the following command to download and install all necessary dependencies (React, Express, Tailwind, Vite, Google GenAI, etc.):
   ```bash
   npm install
   ```

### 3. Configure Your Environment Variables
1. In the root of your project directory, copy `.env.example` to create a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file in your code editor and enter your Gemini API key:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   ```

### 4. Running the Development Server
Run the local dev server using the following command:
```bash
npm run dev
```
Awesome! The full-stack Express + Vite server is now running at:
👉 **`http://localhost:3000`**

Open this URL in any web browser. Any changes you make in your source code will trigger hot-restarts instantly!

---

## Part 2: How to Add Different AI APIs (OpenAI, Anthropic, Ollama, etc.)

Currently, the app's backend is handled by `/server.ts` which uses the `@google/genai` model `gemini-3.5-flash`. You can easily extend this file to support any other AI REST API or locally hosted model.

### 1. Future Multi-Model Request Flow
To let users choose which AI engine to use from the frontend, add an `"aiProvider"` parameter to the post request from `src/App.tsx`:

```typescript
// Inside handleGenerateCases inside src/App.tsx
const response = await fetch("/api/generate-tests", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userStory,
    acceptanceCriteria,
    requirementSpec,
    customSpecs,
    attachments,
    aiProvider: "ollama" // <-- Easy parameter to pass to the backend
  })
});
```

---

### 2. Implementing Different Providers in `server.ts`

Here are concrete, production-ready backend code examples you can drop directly into your `/server.ts` route logic to query other APIs:

#### Option A: Local Offline LLMs (Ollama with DeepSeek / Llama 3)
If you want to run completely offline models locally on your computer with zero API costs, download [Ollama](https://ollama.com/) and run a model (e.g. `ollama run deepseek-r1:8b` or `ollama run llama3`).

Add this section inside your `/api/generate-tests` route in `server.ts`:

```typescript
// Replace or switch inside app.post("/api/generate-tests", ...)
if (aiProvider === "ollama") {
  const ollamaResponse = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-r1:8b", // or llama3, mistral, etc.
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: modelPrompt }
      ],
      format: "json", // Instructs Ollama to output valid JSON
      stream: false
    })
  });
  
  const result: any = await ollamaResponse.json();
  const parsedData = JSON.parse(result.message.content.trim());
  return res.json(parsedData);
}
```

---

#### Option B: OpenAI API (GPT-4o or GPT-3.5-Turbo)
To add OpenAI support:
1. First, install the SDK locally:
   ```bash
   npm install openai
   ```
2. Add `OPENAI_API_KEY` to your local `.env`.
3. Add this code block to `/server.ts`:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (aiProvider === "openai") {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" }, // Forces structured JSON outputs
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: modelPrompt }
    ],
    temperature: 0.2
  });

  const parsedData = JSON.parse(response.choices[0].message.content || "{}");
  return res.json(parsedData);
}
```

---

#### Option C: Anthropic Claude (Claude 3.5 Sonnet)
To add Anthropic Claude support:
1. Install their SDK locally:
   ```bash
   npm install @anthropic-ai/sdk
   ```
2. Add `ANTHROPIC_API_KEY` to your local `.env`.
3. Add this block to `/server.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (aiProvider === "anthropic") {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      { role: "user", content: modelPrompt }
    ]
  });

  // Claude outputs text content, which you can parse as JSON safely
  const responseText = response.content[0].text;
  const parsedData = JSON.parse(responseText);
  return res.json(parsedData);
}
```

---

## Part 3: Compiling for Production or Sharing

When you are ready to bundle this application into a clean production release or run a build test, use:
```bash
npm run build
```
This produces optimized frontend code in `dist/` and compiles the backend into `dist/server.cjs` via highly optimized CJS bundle triggers.

To run the production-ready build locally:
```bash
npm run start
```
This runs the entire app in full performance productionmode!
