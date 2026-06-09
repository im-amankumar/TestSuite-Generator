import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create application
const app = express();
const PORT = 3000;

// Set up body size limits since user stories might be large
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Google Gemini Client lazily or safely
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY workspace environment variable is missing. Please select and add your secret in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Test Cases Generation Endpoint
app.post("/api/generate-tests", async (req, res): Promise<any> => {
  try {
    const {
      userStory,
      acceptanceCriteria,
      requirementSpec,
      customSpecs,
      attachments // Array of { name, mimeType, base64 }
    } = req.body;

    if (
      (!userStory || !userStory.trim()) &&
      (!acceptanceCriteria || !acceptanceCriteria.trim()) &&
      (!requirementSpec || !requirementSpec.trim()) &&
      (!customSpecs || !customSpecs.trim())
    ) {
      return res.status(400).json({ error: "At least one requirements or criteria field must be filled out to generate cases." });
    }

    const ai = getGenAI();

    // Set up standard system instruction for an SDET/QA Architect focusing purely on manual & automated execution steps
    const systemPrompt = `You are a Principal Test Architect. Your task is to analyze user stories, specifications, and uploaded files and generate meticulous Test Objectives, step-by-step Test Cases, detailed Actions/Steps, and precise Expected Outputs. Do not output configuration or programming code unless requested inside a step - focus purely on direct QA validation actions.`;

    // Map attachments safely
    const promptParts: any[] = [];

    // Add a helper header for raw text inputs
    let sourceText = "=== SYSTEM SPECIFICATIONS ===\n";
    if (userStory && userStory.trim()) {
      sourceText += `[User Story Description]\n${userStory.trim()}\n\n`;
    }
    if (acceptanceCriteria && acceptanceCriteria.trim()) {
      sourceText += `[Acceptance Criteria]\n${acceptanceCriteria.trim()}\n\n`;
    }
    if (requirementSpec && requirementSpec.trim()) {
      sourceText += `[User Requirement Specification]\n${requirementSpec.trim()}\n\n`;
    }
    if (customSpecs && customSpecs.trim()) {
      sourceText += `[Optional/Custom Parameters]\n${customSpecs.trim()}\n\n`;
    }

    if (attachments && attachments.length > 0) {
      sourceText += `=== UPLOADED ATTACHMENTS CONTEXT ===\n`;
      attachments.forEach((att: any, idx: number) => {
        // If it's a simple text file, we can decode it directly for perfect text-ingestion
        if (att.mimeType.startsWith("text/") || att.name.endsWith(".txt") || att.name.endsWith(".json") || att.name.endsWith(".csv") || att.name.endsWith(".md")) {
          try {
            const decoded = Buffer.from(att.base64, "base64").toString("utf-8");
            sourceText += `[File: ${att.name} (Decoded Text Content)]\n${decoded}\n\n`;
          } catch (e) {
            sourceText += `[File: ${att.name} (Mime: ${att.mimeType}) - Failed to decode text]\n`;
          }
        } else {
          sourceText += `[Attached File: ${att.name} (Mime: ${att.mimeType}) - Ingested as binary part]\n`;
          
          // Pass as inlineData parts for native Gemini understanding (Images, PDFs, etc.)
          promptParts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.base64
            }
          });
        }
      });
    }

    const modelPrompt = `
Analyze the provided system specifications and generate:
- An overall system **Test Objective** (summarizing what needs verification, key workflows, and comprehensive goals).
- A complete, rigorous list of detailed **Test Cases** tracking both happy path, edge-cases, validation checks, negative exceptions, and bounds.

CRITICAL STEP FORMATTING RULE:
For each testCase.testSteps array, each step must be a simple, clean, command action text.
Do NOT write redundant words like "Step X:", "Step 1:", "Then", or "Verification:".
Each step should look like: "Open the cart page" or "Enter 15 items in the quantity field".
Example valid testSteps array elements:
"Navigate to the dashboard input view"
"Input 'Aman Kumar' inside the creator name input field"
"Verify that the system stores and renders the profile data correctly without errors"

${sourceText}

Please structure your response matching the output schema.
`;

    // Push the text part as the final prompt content
    promptParts.push({ text: modelPrompt });

    // Strict schema structure using Type from @google/genai
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        testObjective: {
          type: Type.STRING,
          description: "Detailed description of the testing objectives, scope, and validation parameters based on the requirements and files."
        },
        testCases: {
          type: Type.ARRAY,
          description: "Meticulous lists of manual/automated test cases covering functional flows, validation states, edge cases, and unexpected errors.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique Test Case ID, e.g., TC-001, TC-002" },
              name: { type: Type.STRING, description: "Descriptive name of what this test case verifies" },
              scenarioType: { type: Type.STRING, description: "Category/Flow type (e.g., Happy Path, Boundary Limit, Input Validation, Exception Flow)" },
              testObjective: { type: Type.STRING, description: "Specific Test Objective / Verification Target of this case" },
              testSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of detailed sequential actions the tester or automation tool must execute. DO NOT prefix with 'Step 1:' or repeat numbering."
              },
              expectedOutput: { type: Type.STRING, description: "Expected Output / Outcome of this test case." }
            },
            required: ["id", "name", "scenarioType", "testObjective", "testSteps", "expectedOutput"]
          }
        }
      },
      required: ["testObjective", "testCases"]
    };

    // Call Gemini 3.5 Flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptParts,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No output text returned from the generation engine.");
    }

    try {
      const parsedData = JSON.parse(outputText.trim());
      res.json(parsedData);
    } catch (parseErr) {
      console.error("Failed to parse JSON reply from model. Raw text:\n", outputText);
      res.status(500).json({
        error: "Generation completed but output could not be parsed. Please retry.",
        raw: outputText
      });
    }

  } catch (error: any) {
    console.error("Test generation error:", error);
    res.status(500).json({
      error: error.message || "An internal error occurred during Gemini test cases generation."
    });
  }
});

// Initialize Express routing to either Vite (development) or static static folder (production)
async function start() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    console.log("Setting up Vite developer middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    console.log("Serving static production assets from client dist directory...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Test Case Generator full-stack application running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to startup Express Vite bridge server:", err);
});
