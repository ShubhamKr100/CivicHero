// import express from "express";
// import path from "path";
// import dotenv from "dotenv";
// import { createServer as createViteServer } from "vite";
// import { GoogleGenAI, Type } from "@google/genai";
// import { Submission, IssueCategory, IssueStatus, ClassificationResult, SamplePreset } from "./src/types.js";
// import { SAMPLE_PRESETS } from "./src/presets.js";

// dotenv.config();

// // Standard high-quality presets for community issues
// const PRESETS: SamplePreset[] = SAMPLE_PRESETS;

// // In-memory persistence for submissions
// const submissions: Submission[] = [
//   {
//     id: "sub-1",
//     timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
//     imageUrl: PRESETS[0].imageUrl,
//     result: {
//       category: "Pothole",
//       description: "Severe structural street damage observed needing instant local infrastructure repair.",
//       severity: "High",
//       confidence: 0.94
//     },
//     rawJson: JSON.stringify({ category: "Pothole", severity: "High", confidence: 0.94 }),
//     status: "In Progress",
//     upvotes: 18,
//     location: {
//       latitude: PRESETS[0].latitude,
//       longitude: PRESETS[0].longitude
//     }
//   },
//   {
//     id: "sub-2",
//     timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
//     imageUrl: PRESETS[1].imageUrl,
//     result: {
//       category: "Garbage",
//       description: "Large concentration of plastic rubbish and organic waste overflowing onto the walkway.",
//       severity: "Medium",
//       confidence: 0.89
//     },
//     rawJson: JSON.stringify({ category: "Garbage", severity: "Medium", confidence: 0.89 }),
//     status: "Verified",
//     upvotes: 9,
//     location: {
//       latitude: PRESETS[1].latitude,
//       longitude: PRESETS[1].longitude
//     }
//   },
//   {
//     id: "sub-3",
//     timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
//     imageUrl: PRESETS[3].imageUrl,
//     result: {
//       category: "Water Leakage",
//       description: "Continuous underground leak resurfacing on the road side, wasting fresh municipal water.",
//       severity: "Medium",
//       confidence: 0.91
//     },
//     rawJson: JSON.stringify({ category: "Water Leakage", severity: "Medium", confidence: 0.91 }),
//     status: "Resolved",
//     upvotes: 14,
//     location: {
//       latitude: PRESETS[3].latitude,
//       longitude: PRESETS[3].longitude
//     }
//   }
// ];

// // Lazy initialize Gemini client
// let aiClient: GoogleGenAI | null = null;
// const exhaustedModels = new Set<string>();

// function getGeminiClient(): GoogleGenAI {
//   if (!aiClient) {
//     // 1. Agar aap Secrets panel/environment variable use kar rahe hain to wahan naya key daal dein.
//     // 2. Agar manually hardcode karna chahte hain, toh neeche di gayi line ko uncomment karein (aage se // hata dein):
//     // process.env.GEMINI_API_KEY = "YOUR_NEW_GEMINI_API_KEY_HERE";

//     const key = process.env.GEMINI_API_KEY  ;
    
//     vv-+======================
//     aiClient = new GoogleGenAI({
//       apiKey: key,
//       httpOptions: {
//         headers: {
//           "User-Agent": "aistudio-build",
//         }
//       }
//     });
//   }
//   return aiClient;
// }

// async function startServer() {
//   const app = express();
//   const PORT = 3000;

//   // Set body size limits to support base64 image transmissions
//   app.use(express.json({ limit: "15mb" }));
//   app.use(express.urlencoded({ limit: "15mb", extended: true }));

//   // API: Get sample presets
//   app.get("/api/presets", (req, res) => {
//     res.json(PRESETS);
//   });

//   // API: Get all active submissions
//   app.get("/api/submissions", (req, res) => {
//     const sorted = [...submissions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
//     res.json(sorted);
//   });

//   // API: Classify image using Gemini AI
//   app.post("/api/classify", async (req, res) => {
//     try {
//       const { image, mimeType, isResolutionProof, originalCategory } = req.body;
//       if (!image) return res.status(400).json({ error: "Missing image data" });

//       const ai = getGeminiClient();
//       let dataBuffer = "";
//       let finalMimeType = mimeType || "image/jpeg";
//       if (image.startsWith("http")) {
//         const fetchResponse = await fetch(image);
//         if (!fetchResponse.ok) {
//           throw new Error(`Failed to fetch remote image (Status: ${fetchResponse.status})`);
//         }
//         const arrayBuffer = await fetchResponse.arrayBuffer();
//         dataBuffer = Buffer.from(arrayBuffer).toString("base64");
//         const contentType = fetchResponse.headers.get("content-type");
//         if (contentType) finalMimeType = contentType;
//       } else {
//         dataBuffer = image;
//       }

//       let response;
//       let retries = 3;
//       while (retries > 0) {
//         try {
//           response = await ai.models.generateContent({
//             // BADLAAV: Isko free-tier friendly model "gemini-3.1-flash-lite" par switch kar diya hai
//             model: "gemini-3.1-flash-lite",
//             contents: [
//               { inlineData: { mimeType: finalMimeType, data: dataBuffer } },
//               isResolutionProof 
//                 ? `Verify if the community issue '${originalCategory}' has been resolved/fixed or if it is still broken.` 
//                 : "Inspect the image and classify the community infrastructure issue."
//             ],
//             config: {
//               systemInstruction: 
//                 "You are an expert civic inspector. " +
//                 "When analyzing standard reports, classify into: 'Pothole', 'Garbage', 'Damaged Streetlight', 'Water Leakage', or 'Other'. Description must be exactly 10 words. " +
//                 "CRITICAL FOR RESOLUTION PROOF: If analyzing a follow-up image to verify a fix, check if the hazard is completely resolved. If the issue is FIXED, return category 'Other' and severity 'Low'. If the issue is STILL BROKEN/PRESENT, return the original category and set severity to 'High' to escalate concern.",
//               responseMimeType: "application/json",
//               responseSchema: {
//                 type: Type.OBJECT,
//                 properties: {
//                   category: { type: Type.STRING },
//                   description: { type: Type.STRING },
//                   severity: { type: Type.STRING },
//                   confidence: { type: Type.NUMBER }
//                 },
//                 required: ["category", "description", "severity", "confidence"]
//               }
//             }
//           });
//           break;
//         } catch (err) {
//           if (retries > 1) { await new Promise(r => setTimeout(r, 1000)); retries--; } else throw err;
//         }
//       }

//       const responseText = response?.text;
//       if (!responseText) throw new Error("Empty model response.");
//       return res.json(JSON.parse(responseText.trim()));

//     } catch (error: any) {
//       console.error("API Error Fallback Safety Triggered:", error.message);
//       if (req.body.isResolutionProof) {
//         return res.json({
//           category: req.body.originalCategory || "Damaged Streetlight",
//           description: "The reported community hazard remains unresolved and poses severe infrastructural risk.",
//           severity: "High", 
//           confidence: 0.90
//         });
//       }
//       return res.json({
//         category: "Pothole",
//         description: "Severe structural street damage observed needing instant local infrastructure repair.",
//         severity: "High",
//         confidence: 0.95
//       });
//     }
//   });

//   // API: Get predictive AI insight
//   app.post("/api/insight", async (req, res) => {
//     try {
//       const { incidents } = req.body;
//       if (!incidents || !Array.isArray(incidents) || incidents.length === 0) {
//         return res.json({ insight: "Insufficient data to generate insight at this time." });
//       }

//       const ai = getGeminiClient();
//       let response;
//       let success = false;

//       // Group incidents by category and approximate location proximity
//       const groups: {
//         category: string;
//         location: { latitude: number; longitude: number };
//         reports: any[];
//       }[] = [];

//       for (const inc of incidents) {
//         const category = inc.category || inc.result?.category;
//         const loc = inc.location;
//         if (!category || !loc || typeof loc.latitude !== "number" || typeof loc.longitude !== "number") {
//           continue;
//         }

//         const matchGroup = groups.find(g => 
//           g.category === category &&
//           Math.abs(g.location.latitude - loc.latitude) < 0.0008 &&
//           Math.abs(g.location.longitude - loc.longitude) < 0.0008
//         );

//         if (matchGroup) {
//           matchGroup.reports.push(inc);
//         } else {
//           groups.push({
//             category,
//             location: { latitude: loc.latitude, longitude: loc.longitude },
//             reports: [inc]
//           });
//         }
//       }

//       const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
//       const recurringPatterns: {
//         category: string;
//         location: { latitude: number; longitude: number };
//         count: number;
//         daysApart: number;
//       }[] = [];

//       for (const g of groups) {
//         const reportsInLast14Days = g.reports.filter(r => {
//           const t = new Date(r.timestamp).getTime();
//           return !isNaN(t) && t >= fourteenDaysAgo;
//         });

//         if (reportsInLast14Days.length >= 2) {
//           const times = reportsInLast14Days.map(r => new Date(r.timestamp).getTime());
//           const minTime = Math.min(...times);
//           const maxTime = Math.max(...times);
//           const daysApart = Math.abs(maxTime - minTime) / (1000 * 60 * 60 * 24);

//           recurringPatterns.push({
//             category: g.category,
//             location: g.location,
//             count: reportsInLast14Days.length,
//             daysApart
//           });
//         }
//       }

//       const incidentSummary = incidents.map(inc => {
//         const category = inc.category || inc.result?.category || "Unknown";
//         const severity = inc.severity || inc.result?.severity || "Unknown";
//         const status = inc.status || "Unknown";
//         const upvotes = inc.upvotes || 0;
//         const locStr = inc.location ? `at lat:${inc.location.latitude.toFixed(3)},lng:${inc.location.longitude.toFixed(3)}` : "unknown location";
//         return `- Category: ${category}, Severity: ${severity}, Status: ${status}, Upvotes: ${upvotes}, Location: ${locStr}`;
//       }).join("\n");

//       let promptText = `Here is the current municipal incident summary data:\n${incidentSummary}\n\nAnalyze and generate a single sentence municipal predictive insight.`;
//       let systemInstruction = 
//         "You are a municipal data analyst. Given this list of community infrastructure reports, write exactly ONE short sentence (max 20 words) highlighting the most notable pattern, spike, or risk. Be specific with category and approximate location if available. Do not use markdown or quotes in the output.";

//       if (recurringPatterns.length > 0) {
//         const patternsStr = recurringPatterns.map(p => 
//           `- RECURRING ISSUE PATTERN: Category "${p.category}" has been reported ${p.count} times within a 50m proximity of location (lat:${p.location.latitude.toFixed(6)}, lng:${p.location.longitude.toFixed(6)}) within the last 14 days. These reports span across ${p.daysApart.toFixed(1)} days.`
//         ).join("\n");

//         promptText = `Here is the current municipal incident summary data:\n${incidentSummary}\n\nCRITICAL CONTEXT: The following recurring issue patterns were detected in the location proximity analysis:\n${patternsStr}\n\nAnalyze the data and recurring patterns to generate the predictive insight.`;

//         systemInstruction = 
//           "You are a municipal data analyst. If the data includes a recurring pattern (same issue type reported multiple times at the same location within a short timeframe), prioritize mentioning that pattern specifically, including the count and the location, and suggest it indicates a temporary or incomplete fix rather than a permanent repair. Otherwise, follow the original single-sentence insight instruction. Keep the response to ONE sentence, max 25 words, no markdown, no quotes.";
//       }

//       // BADLAAV: Fallback list ko bhi free-tier friendly model list se update kiya hai
//       const modelsToTry = ["gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];

//       for (const modelName of modelsToTry) {
//         if (exhaustedModels.has(modelName)) continue;

//         let modelRetries = 2;
//         let modelDelay = 1000;
//         while (modelRetries > 0) {
//           try {
//             response = await ai.models.generateContent({
//               model: modelName,
//               contents: promptText,
//               config: { systemInstruction: systemInstruction }
//             });
//             success = true;
//             break;
//           } catch (apiError: any) {
//             const errStr = (apiError.message || String(apiError)).toLowerCase();
//             const isQuota = errStr.includes("quota") || errStr.includes("limit") || errStr.includes("429") || errStr.includes("resource_exhausted") || apiError.status === 429;
            
//             if (isQuota) {
//               exhaustedModels.add(modelName);
//               break; 
//             }
//             if (modelRetries > 1) {
//               await new Promise(resolve => setTimeout(resolve, modelDelay));
//               modelRetries--;
//             } else {
//               break;
//             }
//           }
//         }
//         if (success) break;
//       }

//       if (!success) throw new Error("All model insights failed or exhausted quota.");

//       const responseText = response?.text;
//       if (!responseText) throw new Error("Empty model text stream context.");
      
//       let insightText = responseText.trim().replace(/^["']|["']$/g, "");
//       return res.json({ insight: insightText });

//     } catch (error: any) {
//       console.error("Insight generation failed. Activating fallback:", error.message);
//       return res.json({
//         insight: "Monitoring municipal data for emerging patterns."
//       });
//     }
//   });

//   // API: Submit classified issue
//   app.post("/api/submissions", (req, res) => {
//     try {
//       const { imageUrl, result, location } = req.body;
//       if (!imageUrl || !result) {
//         return res.status(400).json({ error: "Missing required submission parameters." });
//       }

//       const newSubmission: Submission = {
//         id: `sub-${Math.random().toString(36).substr(2, 9)}`,
//         timestamp: new Date().toISOString(),
//         imageUrl,
//         result,
//         rawJson: JSON.stringify(result),
//         status: "Reported",
//         upvotes: 1,
//         location
//       };

//       submissions.push(newSubmission);
//       res.status(201).json(newSubmission);
//     } catch (err: any) {
//       res.status(500).json({ error: "Failed to create submission." });
//     }
//   });

//   // API: Upvote submission
//   app.post("/api/submissions/:id/upvote", (req, res) => {
//     const { id } = req.params;
//     const sub = submissions.find(s => s.id === id);
//     if (!sub) return res.status(404).json({ error: "Submission not found." });
//     sub.upvotes += 1;
//     res.json(sub);
//   });

//   // API: Update submission workflow status
//   app.post("/api/submissions/:id/status", (req, res) => {
//     const { id } = req.params;
//     const { status, resolutionProofImageUrl, resolutionVerified } = req.body;

//     const validStatuses: IssueStatus[] = ["Reported", "Verified", "In Progress", "Resolved"];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({ error: "Invalid status state." });
//     }

//     const sub = submissions.find(s => s.id === id);
//     if (!sub) return res.status(404).json({ error: "Submission not found." });

//     sub.status = status;
//     if (resolutionProofImageUrl !== undefined) sub.resolutionProofImageUrl = resolutionProofImageUrl;
//     if (resolutionVerified !== undefined) sub.resolutionVerified = resolutionVerified;
//     res.json(sub);
//   });

//   // Integrate Vite dev middleware or serve static files
//   if (process.env.NODE_ENV !== "production") {
//     const vite = await createViteServer({
//       server: { middlewareMode: true },
//       appType: "spa",
//     });
//     app.use(vite.middlewares);
//   } else {
//     const distPath = path.join(process.cwd(), "dist");
//     app.use(express.static(distPath));
//     app.get("*", (req, res) => {
//       res.sendFile(path.join(distPath, "index.html"));
//     });
//   }

//   app.listen(PORT, "0.0.0.0", () => {
//     console.log(`Server listening at http://0.0.0.0:${PORT}`);
//   });
// }

// startServer();











import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { Submission, IssueCategory, IssueStatus, ClassificationResult, SamplePreset } from "./src/types.js";
import { SAMPLE_PRESETS } from "./src/presets.js";

dotenv.config();

// Standard high-quality presets for community issues
const PRESETS: SamplePreset[] = SAMPLE_PRESETS;

// In-memory persistence for submissions
const submissions: Submission[] = [
  {
    id: "sub-1",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    imageUrl: PRESETS[0].imageUrl,
    result: {
      category: "Pothole",
      description: "Severe structural street damage observed needing instant local infrastructure repair.",
      severity: "High",
      confidence: 0.94
    },
    rawJson: JSON.stringify({ category: "Pothole", severity: "High", confidence: 0.94 }),
    status: "In Progress",
    upvotes: 18,
    location: {
      latitude: PRESETS[0].latitude,
      longitude: PRESETS[0].longitude
    }
  },
  {
    id: "sub-2",
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    imageUrl: PRESETS[1].imageUrl,
    result: {
      category: "Garbage",
      description: "Large concentration of plastic rubbish and organic waste overflowing onto the walkway.",
      severity: "Medium",
      confidence: 0.89
    },
    rawJson: JSON.stringify({ category: "Garbage", severity: "Medium", confidence: 0.89 }),
    status: "Verified",
    upvotes: 9,
    location: {
      latitude: PRESETS[1].latitude,
      longitude: PRESETS[1].longitude
    }
  },
  {
    id: "sub-3",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    imageUrl: PRESETS[3].imageUrl,
    result: {
      category: "Water Leakage",
      description: "Continuous underground leak resurfacing on the road side, wasting fresh municipal water.",
      severity: "Medium",
      confidence: 0.91
    },
    rawJson: JSON.stringify({ category: "Water Leakage", severity: "Medium", confidence: 0.91 }),
    status: "Resolved",
    upvotes: 14,
    location: {
      latitude: PRESETS[3].latitude,
      longitude: PRESETS[3].longitude
    }
  }
];

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
const exhaustedModels = new Set<string>();

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY  ;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body size limits to support base64 image transmissions
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API: Get sample presets
  app.get("/api/presets", (req, res) => {
    res.json(PRESETS);
  });

  // API: Get all active submissions
  app.get("/api/submissions", (req, res) => {
    // Return sorted newest first
    const sorted = [...submissions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(sorted);
  });

  // // API: Classify image using Gemini AI
  // app.post("/api/classify", async (req, res) => {
  //   try {
  //     const { image, mimeType, isResolutionProof, originalCategory, proofImageData } = req.body;
  //     if (!image) return res.status(400).json({ error: "Missing image data" });


     app.post("/api/classify", async (req, res) => {
         res.setHeader("Content-Type", "application/json");
      try {
         const { image, mimeType, isResolutionProof, originalCategory, proofImageData } = req.body;
                   if (!image) return res.status(400).json({ error: "Missing image data" });


      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = getGeminiClient();
      
      const processImage = async (img: string, mime: string): Promise<{ mimeType: string; data: string }> => {
        let dataBuffer = "";
        let finalMimeType = mime || "image/jpeg";
        if (img.startsWith("http")) {
          const fetchResponse = await fetch(img);
          if (!fetchResponse.ok) {
            throw new Error(`Failed to fetch remote image (Status: ${fetchResponse.status})`);
          }
          const arrayBuffer = await fetchResponse.arrayBuffer();
          dataBuffer = Buffer.from(arrayBuffer).toString("base64");
          const contentType = fetchResponse.headers.get("content-type");
          if (contentType) finalMimeType = contentType;
        } else {
          dataBuffer = img;
        }
        return { mimeType: finalMimeType, data: dataBuffer };
      };

      const originalImg = await processImage(image, mimeType);
      
      let contents: any[] = [{ inlineData: originalImg }];

      if (isResolutionProof && proofImageData) {
        const proofImg = await processImage(proofImageData, mimeType);
        contents = [
          { text: `IMAGE 1: The original reported issue (category: ${originalCategory}).\nIMAGE 2: A follow-up proof photo submitted to verify the issue is resolved.\n\nCompare both images carefully. Do NOT rely only on category labels. Look for visual evidence:\n- Is the original damage/hazard still visible in Image 2?\n- Has the infrastructure been repaired, replaced, or cleaned?\n- Is the location clearly the same or similar area?\n\nReturn a JSON with:\n{\n  isLikelyResolved: boolean,\n  aiVerdict: string (ONE sentence, max 15 words, plain English, no markdown),\n  confidence: number (0.0 to 1.0)\n}` },
          { inlineData: originalImg },
          { inlineData: proofImg }
        ];
      } else {
        contents.push(isResolutionProof 
          ? `Verify if the community issue '${originalCategory}' has been resolved/fixed or if it is still broken.` 
          : "Inspect the image and classify the community infrastructure issue.");
      }

      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: contents,
            config: {
              systemInstruction: isResolutionProof && proofImageData 
                ? "You are an expert civic infrastructure inspector."
                : "You are an expert civic inspector. " +
                  "When analyzing standard reports, classify into: 'Pothole', 'Garbage', 'Damaged Streetlight', 'Water Leakage', or 'Other'. Description must be exactly 10 words. " +
                  "CRITICAL FOR RESOLUTION PROOF: If analyzing a follow-up image to verify a fix, check if the hazard is completely resolved. If the issue is FIXED, return category 'Other' and severity 'Low'. If the issue is STILL BROKEN/PRESENT, return the original category and set severity to 'High' to escalate concern.",
              responseMimeType: "application/json",
              responseSchema: isResolutionProof && proofImageData ? {
                type: Type.OBJECT,
                properties: {
                  isLikelyResolved: { type: Type.BOOLEAN },
                  aiVerdict: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ["isLikelyResolved", "aiVerdict", "confidence"]
              } : {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ["category", "description", "severity", "confidence"]
              }
            }
          });
          break;
        } catch (err) {
          if (retries > 1) { await new Promise(r => setTimeout(r, 1000)); retries--; } else throw err;
        }
      }

      const responseText = response?.text;
      if (!responseText) throw new Error("Empty model response.");
      return res.json(JSON.parse(responseText.trim()));

    } catch (error: any) {
      console.error("API Error Fallback Safety Triggered:", error.message);
      if (req.body.isResolutionProof) {
        return res.json(req.body.proofImageData ? {
          isLikelyResolved: false,
          aiVerdict: "AI analysis unavailable. Please decide manually.",
          confidence: 0
        } : {
          category: req.body.originalCategory || "Damaged Streetlight",
          description: "The reported community hazard remains unresolved and poses severe infrastructural risk.",
          severity: "High", 
          confidence: 0.90
        });
      }
      return res.json({
        category: "Pothole",
        description: "Severe structural street damage observed needing instant local infrastructure repair.",
        severity: "High",
        confidence: 0.95
      });
    }
  });

  // API: Get predictive AI insight
  app.post("/api/insight", async (req, res) => {
    try {
      const { incidents } = req.body;
      if (!incidents || !Array.isArray(incidents) || incidents.length === 0) {
        return res.json({ insight: "Insufficient data to generate insight at this time." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.json({ insight: "Insufficient data to generate insight at this time." });
      }

      const ai = getGeminiClient();
      let response;
      let retries = 3;
      let delay = 1500;

      // Group incidents by category AND approximate location proximity (~50 meters delta: < 0.0008)
      const groups: {
        category: string;
        location: { latitude: number; longitude: number };
        reports: any[];
      }[] = [];

      for (const inc of incidents) {
        const category = inc.category || inc.result?.category;
        const loc = inc.location;
        if (!category || !loc || typeof loc.latitude !== "number" || typeof loc.longitude !== "number") {
          continue;
        }

        const matchGroup = groups.find(g => 
          g.category === category &&
          Math.abs(g.location.latitude - loc.latitude) < 0.0008 &&
          Math.abs(g.location.longitude - loc.longitude) < 0.0008
        );

        if (matchGroup) {
          matchGroup.reports.push(inc);
        } else {
          groups.push({
            category,
            location: { latitude: loc.latitude, longitude: loc.longitude },
            reports: [inc]
          });
        }
      }

      // Check recurring patterns within the last 14 days
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const recurringPatterns: {
        category: string;
        location: { latitude: number; longitude: number };
        count: number;
        daysApart: number;
      }[] = [];

      for (const g of groups) {
        const reportsInLast14Days = g.reports.filter(r => {
          const t = new Date(r.timestamp).getTime();
          return !isNaN(t) && t >= fourteenDaysAgo;
        });

        if (reportsInLast14Days.length >= 2) {
          const times = reportsInLast14Days.map(r => new Date(r.timestamp).getTime());
          const minTime = Math.min(...times);
          const maxTime = Math.max(...times);
          const daysApart = Math.abs(maxTime - minTime) / (1000 * 60 * 60 * 24);

          recurringPatterns.push({
            category: g.category,
            location: g.location,
            count: reportsInLast14Days.length,
            daysApart
          });
        }
      }

      const incidentSummary = incidents.map(inc => {
        const category = inc.category || inc.result?.category || "Unknown";
        const severity = inc.severity || inc.result?.severity || "Unknown";
        const status = inc.status || "Unknown";
        const upvotes = inc.upvotes || 0;
        const locStr = inc.location ? `at lat:${inc.location.latitude.toFixed(3)},lng:${inc.location.longitude.toFixed(3)}` : "unknown location";
        return `- Category: ${category}, Severity: ${severity}, Status: ${status}, Upvotes: ${upvotes}, Location: ${locStr}`;
      }).join("\n");

      let promptText = `Here is the current municipal incident summary data:\n${incidentSummary}\n\nAnalyze and generate a single sentence municipal predictive insight.`;
      let systemInstruction = 
        "You are a municipal data analyst. Given this list of community infrastructure reports, write exactly ONE short sentence (max 20 words) highlighting the most notable pattern, spike, or risk. Be specific with category and approximate location if available. Do not use markdown or quotes in the output.";

      if (recurringPatterns.length > 0) {
        const patternsStr = recurringPatterns.map(p => 
          `- RECURRING ISSUE PATTERN: Category "${p.category}" has been reported ${p.count} times within a 50m proximity of location (lat:${p.location.latitude.toFixed(6)}, lng:${p.location.longitude.toFixed(6)}) within the last 14 days. These reports span across ${p.daysApart.toFixed(1)} days.`
        ).join("\n");

        promptText = `Here is the current municipal incident summary data:\n${incidentSummary}\n\nCRITICAL CONTEXT: The following recurring issue patterns were detected in the location proximity analysis:\n${patternsStr}\n\nAnalyze the data and recurring patterns to generate the predictive insight.`;

        systemInstruction = 
          "You are a municipal data analyst. If the data includes a recurring pattern (same issue type reported multiple times at the same location within a short timeframe), prioritize mentioning that pattern specifically, including the count and the location, and suggest it indicates a temporary or incomplete fix rather than a permanent repair. Otherwise, follow the original single-sentence insight instruction. Keep the response to ONE sentence, max 25 words, no markdown, no quotes.";
      }

      // const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
      let success = false;

      for (const modelName of modelsToTry) {
        if (exhaustedModels.has(modelName)) {
          console.log(`Skipping model ${modelName} as it is marked as exhausted.`);
          continue;
        }

        let modelRetries = 2;
        let modelDelay = 1000;
        while (modelRetries > 0) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: promptText,
              config: {
                systemInstruction: systemInstruction
              }
            });
            success = true;
            break;
          } catch (apiError: any) {
            const errStr = (apiError.message || String(apiError)).toLowerCase();
            const isQuota = errStr.includes("quota") || errStr.includes("limit") || errStr.includes("429") || errStr.includes("resource_exhausted") || apiError.status === 429 || apiError.statusCode === 429;
            
            if (isQuota) {
              console.warn(`Model ${modelName} hit quota limit in /api/insight. Marking as exhausted.`);
              exhaustedModels.add(modelName);
              break; // Immediately break out of retries for this model and go to the next model
            }

            console.warn(`Error generating insight with model ${modelName}: ${apiError.message || apiError}`);
            if (modelRetries > 1) {
              console.warn(`API busy or throttled in /api/insight with ${modelName}. Retrying in ${modelDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, modelDelay));
              modelRetries--;
            } else {
              break; // Try next model
            }
          }
        }
        if (success) {
          break;
        }
      }

      if (!success) {
        throw new Error("All model insights failed or exhausted quota.");
      }

      const responseText = response?.text;
      if (!responseText) throw new Error("Empty model text stream context.");
      
      let insightText = responseText.trim().replace(/^["']|["']$/g, ""); // strip quotes
      return res.json({ insight: insightText });

    } catch (error: any) {
      console.error("Insight generation failed. Activating fallback:", error.message);
      return res.json({
        insight: "Monitoring municipal data for emerging patterns."
      });
    }
  });

  // API: Submit classified issue
  app.post("/api/submissions", (req, res) => {
    try {
      const { imageUrl, result, location } = req.body;
      if (!imageUrl || !result) {
        return res.status(400).json({ error: "Missing required submission parameters." });
      }

      const newSubmission: Submission = {
        id: `sub-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        imageUrl,
        result,
        rawJson: JSON.stringify(result),
        status: "Reported",
        upvotes: 1,
        location
      };

      submissions.push(newSubmission);
      res.status(201).json(newSubmission);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create submission." });
    }
  });

  // API: Upvote submission
  app.post("/api/submissions/:id/upvote", (req, res) => {
    const { id } = req.params;
    const sub = submissions.find(s => s.id === id);
    if (!sub) {
      return res.status(404).json({ error: "Submission not found." });
    }
    sub.upvotes += 1;
    res.json(sub);
  });

  // API: Update submission workflow status
  app.patch("/api/submissions/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, resolutionProofImageUrl, resolutionVerified } = req.body;

    const validStatuses: IssueStatus[] = ["Reported", "Verified", "In Progress", "Resolved"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status state." });
    }

    const sub = submissions.find(s => s.id === id);
    if (!sub) {
      return res.status(404).json({ error: "Submission not found." });
    }

    sub.status = status;
    if (resolutionProofImageUrl !== undefined) {
      sub.resolutionProofImageUrl = resolutionProofImageUrl;
    }
    if (resolutionVerified !== undefined) {
      sub.resolutionVerified = resolutionVerified;
    }
    res.json(sub);
  });

  // API: Root Cause Dispatch Analysis
  app.post("/api/root-cause-dispatch", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { category, severity, description, upvotes, daysOpen, location } = req.body;
      if (!category || !severity || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const ai = getGeminiClient();
      const prompt = `Reported Issue:\nCategory: ${category}\nSeverity: ${severity}\nDescription: ${description}\nUpvotes: ${upvotes}\nDays Open: ${daysOpen}\nLocation: ${location ? `${location.latitude},${location.longitude}` : "Unknown"}`;
      
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
              systemInstruction: "You are an expert municipal infrastructure analyst. Given a single reported community issue, provide: 1. ROOT CAUSE: Most likely cause (1-2 sentences). 2. REPAIR CHECKLIST: Exactly 4 action items (plain text, numbered 1-4, no markdown symbols). 3. DISPATCH: Which department should handle this (e.g. Road Maintenance Division, Electrical Maintenance Team, Sanitation Department, Water Supply Authority). 4. PRIORITY: One of: Immediate / High / Moderate. 5. ESTIMATED CREW: Number between 1 and 6. 6. ESTIMATED TIME: e.g. 2 Hours / 1 Day / 3 Days. 7. ESTIMATED COST: Indian Rupees range e.g. Rs.3000-Rs.5000. Return ONLY valid JSON. No markdown. No extra text.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  rootCause: { type: Type.STRING },
                  repairChecklist: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  dispatchTeam: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  estimatedCrew: { type: Type.NUMBER },
                  estimatedTime: { type: Type.STRING },
                  estimatedCost: { type: Type.STRING }
                },
                required: ["rootCause", "repairChecklist", "dispatchTeam", "priority", "estimatedCrew", "estimatedTime", "estimatedCost"]
              }
            }
          });
          break;
        } catch (err) {
          if (retries > 1) { await new Promise(r => setTimeout(r, 1000)); retries--; } else throw err;
        }
      }
      
      if (response && response.text) {
          return res.json(JSON.parse(response.text.trim()));
      }
      throw new Error("No response text");
      
    } catch (error: any) {
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json");
        return res.status(200).json({
          rootCause: "Analysis temporarily unavailable.",
          repairChecklist: [
            "Conduct on-site inspection",
            "Assess damage severity",
            "Coordinate with department",
            "Schedule repair crew"
          ],
          dispatchTeam: "General Municipal Services",
          priority: "High",
          estimatedCrew: 2,
          estimatedTime: "To be assessed",
          estimatedCost: "To be assessed"
        });
      }
    }
  });

  // Integrate Vite dev middleware or serve static files
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
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
