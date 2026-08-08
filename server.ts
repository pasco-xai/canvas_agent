import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Google GenAI on server
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. Gemini features will return fallback response if unconfigured.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "dummy-key",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// ---------------------------
// API ENDPOINTS
// ---------------------------

// 1. General text generation / prompt workspace
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are Remix Gridscape AI, an expert analytical co-thought partner helping users map and connect complex concepts on a spatial canvas. Keep responses insightful, crisp, and well-structured using markdown.",
      },
    });

    return res.json({ text: response.text || "No response generated." });
  } catch (error: any) {
    console.error("Error in /api/gemini/generate:", error);
    return res.status(500).json({ error: error.message || "Failed to generate content" });
  }
});

// 2. Expand Concept (Branching 3-4 linked child nodes)
app.post("/api/gemini/expand", async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Node title is required" });
    }

    const ai = getGenAI();
    const prompt = `Given the core concept node:
Title: "${title}"
Content: "${content || "N/A"}"
Tags: ${tags ? tags.join(", ") : "None"}

Generate 3 to 4 logical sub-concepts or derivative ideas that naturally extend from this concept on a spatial mind-map.
For each sub-concept, provide:
- title: concise heading (3-6 words)
- summary: detailed description (2-4 sentences, informative markdown)
- relationshipLabel: how it relates to the parent node (e.g., "Evolves into", "Prerequisite for", "Alternative view", "Key Component", "Impact on")
- colorAccent: one of ["cyan", "emerald", "purple", "amber", "rose"]
- tags: 2-3 relevant topic tags`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of child concept nodes",
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              relationshipLabel: { type: Type.STRING },
              colorAccent: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["title", "summary", "relationshipLabel", "colorAccent", "tags"],
          },
        },
      },
    });

    const jsonText = response.text || "[]";
    const childrenNodes = JSON.parse(jsonText);
    return res.json({ childrenNodes });
  } catch (error: any) {
    console.error("Error in /api/gemini/expand:", error);
    return res.status(500).json({ error: error.message || "Failed to expand node" });
  }
});

// 3. Synthesize Multiple Selected Nodes into a Unified Super-Node
app.post("/api/gemini/synthesize", async (req, res) => {
  try {
    const { nodes } = req.body;
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({ error: "At least one node is required for synthesis" });
    }

    const nodeDescriptions = nodes
      .map((n: any, idx: number) => `Node ${idx + 1}: "${n.title}"\nContent: ${n.content}`)
      .join("\n---\n");

    const prompt = `Synthesize these interconnected concept nodes into a cohesive, high-level summary concept node:
${nodeDescriptions}

Provide a JSON object containing:
- title: A synthesis title
- content: Comprehensive summary synthesized from all inputs with markdown structure and key bullet points
- keyTakeaways: array of 3 concise insights
- tags: array of 3 relevant tags`;

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["title", "content", "keyTakeaways", "tags"],
        },
      },
    });

    const synthesis = JSON.parse(response.text || "{}");
    return res.json({ synthesis });
  } catch (error: any) {
    console.error("Error in /api/gemini/synthesize:", error);
    return res.status(500).json({ error: error.message || "Failed to synthesize nodes" });
  }
});

// 4. Generate Contextual Image Banner for a Node
app.post("/api/gemini/image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Image prompt is required" });
    }

    let imageUrl = "";

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [
              {
                text: `Minimalist futuristic technical illustration, glowing neon lines on obsidian dark background, spatial concept diagram, high resolution, clean architectural design: ${prompt}`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: "16:9",
            },
          },
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || "image/png";
              imageUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      }
    } catch (genError: any) {
      console.log("Note: Gemini image generation API quota or model unavailable. Using curated spatial concept visual fallback.");
    }

    if (!imageUrl) {
      // High-quality dark cybernetic / spatial concept background image pool
      const darkTechImages = [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop"
      ];
      const imgIdx = Math.abs((prompt || "default").length) % darkTechImages.length;
      imageUrl = darkTechImages[imgIdx];
    }

    return res.json({ imageUrl });
  } catch (error: any) {
    console.log("Error handling /api/gemini/image, serving fallback image.");
    const fallback = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop";
    return res.json({ imageUrl: fallback });
  }
});

// 5. Auto-Relate (Find connections between unconnected nodes)
app.post("/api/gemini/auto-relate", async (req, res) => {
  try {
    const { nodes } = req.body;
    if (!nodes || nodes.length < 2) {
      return res.json({ relationships: [] });
    }

    const ai = getGenAI();
    const prompt = `Analyze these spatial concept nodes and suggest up to 3 non-obvious meaningful connections between pairs that aren't already connected:
${JSON.stringify(nodes.map((n: any) => ({ id: n.id, title: n.title, content: n.content })))}

Return a JSON array of connections:
- fromId: string
- toId: string
- label: short relation phrase (2-4 words, e.g., "Powers Architecture", "Catalyzes Growth", "Provides Foundation")
- reasoning: 1 sentence justification`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fromId: { type: Type.STRING },
              toId: { type: Type.STRING },
              label: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: ["fromId", "toId", "label", "reasoning"],
          },
        },
      },
    });

    const relationships = JSON.parse(response.text || "[]");
    return res.json({ relationships });
  } catch (error: any) {
    console.error("Error in /api/gemini/auto-relate:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze connections" });
  }
});

// ---------------------------
// VITE MIDDLEWARE & SERVER START
// ---------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Remix Gridscape Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
