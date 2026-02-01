import { GoogleGenAI, Type } from "@google/genai";
import { StyleMetrics, AiAnalysisResponse, RubricCriterion, PlagiarismResult, WritingSample } from "../types";

// Initialize Gemini
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_MODEL = 'gemini-3-pro-preview'; // Supports complex JSON schema and reasoning
const PLAGIARISM_MODEL = 'gemini-3-pro-preview'; // Supports search grounding

/**
 * Analyzes a text to extract a "Style Fingerprint", detect AI markers, AND score against a rubric.
 */
export const analyzeWritingStyle = async (text: string, rubric: RubricCriterion[]): Promise<AiAnalysisResponse> => {
  if (!text || text.length < 50) {
     return {
         metrics: {
            vocabularyRichness: 0,
            sentenceComplexity: 0,
            passiveVoiceUsage: 0,
            tone: 'N/A',
            detectedAiProbability: 0,
            consistencyScore: 0,
            keyTraits: []
         },
         rubricScores: rubric.map(r => ({ criterionId: r.id, score: 0, comments: "Insufficient text" })),
         feedback: "Text too short to analyze.",
         summary: "Insufficient data."
     }
  }

  // Construct Rubric Text for Prompt
  const rubricText = rubric.map(r => `- ID ${r.id}: ${r.category} (${r.maxPoints} pts) - ${r.description}`).join('\n');

  const prompt = `
    Analyze the following text.
    
    1. STYLE & AI DETECTION:
    Assess vocabulary, sentence structure, passive voice, and tone.
    Estimate the likelihood of AI generation (0-100).
    
    2. RUBRIC SCORING:
    Score the text based on the following rubric criteria. Provide a score up to the max points for each.
    ${rubricText}
    
    Text to analyze:
    "${text.substring(0, 4000)}..."
  `;

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            metrics: {
              type: Type.OBJECT,
              properties: {
                vocabularyRichness: { type: Type.NUMBER, description: "Score 0-100" },
                sentenceComplexity: { type: Type.NUMBER, description: "Score 0-100" },
                passiveVoiceUsage: { type: Type.NUMBER, description: "Percentage estimation 0-100" },
                tone: { type: Type.STRING },
                detectedAiProbability: { type: Type.NUMBER, description: "0-100 probability of being AI generated" },
                consistencyScore: { type: Type.NUMBER, description: "Internal consistency 0-100" },
                keyTraits: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            rubricScores: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        criterionId: { type: Type.STRING },
                        score: { type: Type.NUMBER },
                        comments: { type: Type.STRING }
                    }
                }
            },
            feedback: { type: Type.STRING },
            summary: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as AiAnalysisResponse;
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

/**
 * Checks for plagiarism using Google Search Grounding.
 */
export const checkPlagiarism = async (text: string): Promise<PlagiarismResult> => {
    if (!text || text.length < 50) return { score: 0, sources: [], analysis: "Text too short to check." };

    const prompt = `
      Search the web to determine if the following text is original or plagiarized.
      If you find exact matches or very close paraphrasing, report them.
      
      Text snippet:
      "${text.substring(0, 1000)}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: PLAGIARISM_MODEL,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        // Extract grounding sources
        const sources: { title: string; uri: string }[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        chunks.forEach((chunk: any) => {
            if (chunk.web) {
                sources.push({ title: chunk.web.title, uri: chunk.web.uri });
            }
        });

        // We ask Gemini to interpret its own search results for a score
        // Since we can't chain easily in one go with pure JSON + Grounding effectively in all cases,
        // we'll parse the text response for analysis and deduce a score based on grounding presence.
        
        const analysisText = response.text || "No analysis provided.";
        
        // Simple heuristic: if grounding chunks exist and the model says it found matches, score is high.
        // We will do a second quick pass to formalize the score if needed, but for efficiency:
        // If sources > 0, we assume some similarity.
        let calculatedScore = sources.length > 0 ? 50 + (sources.length * 10) : 0;
        calculatedScore = Math.min(calculatedScore, 100);

        return {
            score: calculatedScore,
            sources: sources,
            analysis: analysisText
        };

    } catch (e) {
        console.error("Plagiarism Check Error:", e);
        return { score: 0, sources: [], analysis: "Error during plagiarism check." };
    }
};

/**
 * Compares a new text (Assessment) against a baseline of previous samples
 * to check for authorship consistency.
 */
export const compareAuthorship = async (samples: WritingSample[], newText: string): Promise<{ matchScore: number; reason: string }> => {
    if (!samples || samples.length === 0) return { matchScore: 100, reason: "No baseline to compare against." };

    const formattedSamples = samples.map((s, i) => 
        `[Sample ${i + 1} (${s.type})]\n${s.content.substring(0, 1500)}`
    ).join('\n\n--- NEXT SAMPLE ---\n\n');

    const prompt = `
      You are a forensic linguist. Compare the 'Target Assessment Text' against the 'Baseline Writing Samples' provided below.
      Determine if the 'Target Assessment Text' was likely written by the same person as the 'Baseline Writing Samples'.
      
      Look for:
      - Idiosyncrasies in punctuation or grammar.
      - Common spelling errors or specific vocabulary choices.
      - Sentence length distribution.
      - Formatting habits.
      - Tone and voice consistencies.

      Baseline Writing Samples:
      ${formattedSamples}

      ==========================================

      Target Assessment Text:
      "${newText.substring(0, 3000)}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: ANALYSIS_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        matchScore: { type: Type.NUMBER, description: "0-100 likelihood of same author" },
                        reason: { type: Type.STRING, description: "Detailed explanation of findings" }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("No response from AI");
    } catch (e) {
        console.error(e);
        return { matchScore: 0, reason: "Analysis failed" };
    }
}
