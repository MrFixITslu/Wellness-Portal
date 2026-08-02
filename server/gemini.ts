import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./db.js";

// Lazy-initialization helper to prevent crashes if key is missing during startup
let aiInstance: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Falling back to offline safety companion.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Strong regex patterns for fallback offline crisis/diagnosis detection
const CRISIS_KEYWORDS = [
  /\b(suicide|suicidal|kill myself|end my life|want to die|self-harm|cut myself|harm myself|shoot myself|hang myself|poison myself)\b/i,
  /\b(active abuse|hitting me|beating me|sexual assault|domestic violence|want to hurt someone|violence)\b/i
];

const DIAGNOSIS_KEYWORDS = [
  /\b(diagnose|clinical depression|bipolar|schizophrenia|do i have adhd|borderline personality|medication prescribe|prozac|lexapro|xanax|valium)\b/i
];

export interface SafetyAnalysis {
  risk_level: "CRISIS" | "INAPPROPRIATE" | "SAFE";
  risk_score: number; // 1-100
  detected_triggers: string[];
  analysis: string;
}

/**
 * Step 1: Safety Classification & Risk Assessment
 */
export async function assessMessageRisk(userId: string, message: string): Promise<SafetyAnalysis> {
  // Always run regex verification first for immediate safety guarantees (local rule)
  const triggers: string[] = [];
  let isCrisis = false;

  for (const pattern of CRISIS_KEYWORDS) {
    if (pattern.test(message)) {
      triggers.push("crisis_keyword_detected");
      isCrisis = true;
    }
  }

  for (const pattern of DIAGNOSIS_KEYWORDS) {
    if (pattern.test(message)) {
      triggers.push("diagnosis_keyword_detected");
    }
  }

  if (isCrisis) {
    return {
      risk_level: "CRISIS",
      risk_score: 95,
      detected_triggers: triggers,
      analysis: "Trigger keywords matched critical safety list locally."
    };
  }

  const ai = getAI();
  if (!ai) {
    // If AI is offline, use the keyword check as definitive fallback
    return {
      risk_level: triggers.length > 0 ? "INAPPROPRIATE" : "SAFE",
      risk_score: triggers.length > 0 ? 60 : 10,
      detected_triggers: triggers,
      analysis: "Offline local keyword assessment."
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Perform safety classification and risk assessment on the following message written to an anonymous digital mental wellness companion.
User Message: "${message}"

You must respond with a JSON object. Ensure the classification reflects whether the user is in immediate crisis (suicidal, self-harming, actively experiencing abuse/violence) or asking for diagnostic labels/prescription drugs.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risk_level: {
              type: Type.STRING,
              description: "Must be 'CRISIS', 'INAPPROPRIATE', or 'SAFE'. Use CRISIS for self-harm, suicide, violence, or abuse.",
            },
            risk_score: {
              type: Type.INTEGER,
              description: "Score from 1 to 100 representing risk intensity.",
            },
            detected_triggers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of risk topics detected (e.g. self_harm, suicide, abuse, violence, diagnosis_request).",
            },
            analysis: {
              type: Type.STRING,
              description: "Brief reasoning behind classification.",
            },
          },
          required: ["risk_level", "risk_score", "detected_triggers", "analysis"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    // Merge triggers
    if (triggers.length > 0) {
      result.detected_triggers = [...new Set([...result.detected_triggers, ...triggers])];
    }
    return {
      risk_level: result.risk_level || "SAFE",
      risk_score: result.risk_score || 10,
      detected_triggers: result.detected_triggers || [],
      analysis: result.analysis || "AI assessment completed successfully."
    };
  } catch (error) {
    console.error("Gemini Safety Classification Error:", error);
    // Fallback safe assumption
    return {
      risk_level: triggers.length > 0 ? "INAPPROPRIATE" : "SAFE",
      risk_score: triggers.length > 0 ? 50 : 15,
      detected_triggers: triggers,
      analysis: "Failsafe classification triggered due to API exception."
    };
  }
}

/**
 * Step 2: AI Response Generation
 */
export async function generateWellnessResponse(userId: string, userMessage: string, history: { role: string; text: string }[]): Promise<string> {
  const ai = getAI();
  if (!ai) {
    return `Thank you for sharing that with me. Please know that I am here as your digital wellness companion to offer comfort and helpful suggestions, but I'm currently working offline. 
    
To support your wellness today, let's practice a brief anchoring exercise:
1. Inhale slowly, feeling the fresh air fill your chest. Hold for 4 seconds.
2. Exhale gently, visualizing waves washing back into the ocean.
3. Repeat this twice.
    
If you are struggling with deeper challenges, financial pressure, or relationship issues, I highly recommend browsing our Therapist Network to connect with a licensed clinical professional from Barbados, Saint Lucia, or Trinidad, or reading some comforting articles in our Resource Library. You are never alone.`;
  }

  try {
    const formattedHistory = history.map(h => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.text }]
    }));

    // Add current query
    const contents = [
      ...formattedHistory,
      { role: "user", parts: [{ text: userMessage }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: contents as any,
      config: {
        systemInstruction: `You are 'Saman', a dedicated AI Wellness Companion designed specifically for the Caribbean community.

CRITICAL IDENTITY RULES:
1. You are an AI companion, NOT a human, and NOT a replacement for therapy, diagnosis, or medication. Never pretend to be a human.
2. You must NEVER diagnose conditions, label psychological disorders, or prescribe or recommend medical drugs.
3. Your tone is calm, empathetic, warm, non-judgmental, and respectful of Caribbean culture (using terms like 'lime', 'village', 'grounding' naturally, and avoiding rigid, robotic clinical language).
4. Provide emotional reflection, suggest positive coping mechanisms (journaling, beach walks, mindfulness, sleep routines, breathing exercises), and direct users gracefully to our Therapist Network or Resource Library if they need human assistance.
5. Encourage user autonomy; do not encourage dependency or make choices for them. Keep responses concise and comforting.`,
        temperature: 0.7,
      },
    });

    return response.text || "I'm listening. Please tell me more about how you're feeling today.";
  } catch (error) {
    console.error("Gemini Wellness Response Generation Error:", error);
    return "I'm here to support you, but I'm currently having a small technical hiccup. Let's take a deep breath together and focus on getting through today step-by-step. If you have a journal entry, writing down your thoughts can be a great way to release stress.";
  }
}

/**
 * Step 3: Safety Filter & Crisis Handling
 */
export async function runSafetyPipeline(userId: string, userMessage: string, history: { role: string; text: string }[]): Promise<{ response: string; risk: SafetyAnalysis }> {
  // 1. Safety & Risk Assessment
  const risk = await assessMessageRisk(userId, userMessage);

  // 2. Crisis / Trigger Flow
  if (risk.risk_level === "CRISIS") {
    // Log crisis event immediately
    db.safetyEvents.create({
      user_id: userId,
      event_type: "crisis_detected",
      risk_score: risk.risk_score,
      content_snippet: userMessage.substring(0, 100),
      action_taken: "Crisis helplines displayed, safety resources triggered."
    });

    db.audit.log(userId, "CRISIS_DETECTION", "Safety pipeline intercepted crisis language and triggered helpline delivery.");

    const crisisResponse = `I hear how much weight you are carrying right now, and I want to tell you that **you do not have to carry it alone**. 

I am Saman, your digital wellness companion, but because I am an AI, **I cannot replace professional human care during a crisis**. Your safety, trust, and well-being are of the utmost importance. 

Please reach out immediately to one of these confidential, free regional resources or connect with someone in your community who can support you:

### 📞 Immediate Crisis Helplines:
- **Barbados**: 
  - National Mental Health Helpline: **536-3091** (Mon-Fri)
  - Samaritans Barbados: **(246) 429-9999**
- **Jamaica**: 
  - Mental Health Unit Crisis Line: **888-NEW-LIFE (888-639-5433)**
  - Suicide & Crisis Helpline: **119**
- **Saint Lucia**: 
  - Suicide Crisis Hotline: **203** or Emergency **911**
- **Trinidad & Tobago**: 
  - Lifeline: **(868) 645-2800** or **800-5588**
  - Emergency Services: **990** / Childline: **131**
- **Guyana**: 
  - Suicide Prevention Hotline: **223-0001** or **223-0009**

### 🧘‍♂️ A Quick Grounding Action (The Wave Inhale):
1. **Focus on your feet**: Feel them flat on the floor, anchoring you like sand.
2. **Slow your breathing**: Imagine the ocean tide washing in. Inhale through your nose for 4 seconds.
3. **Release the tension**: Imagine the tide washing back out. Exhale slowly through your mouth for 6 seconds.
4. Keep doing this until your shoulders soften.

Please consider searching our **Therapist Network** tab to find a licensed psychologist in your country, or visit our **Safety Center** for more breathing guides. There is strength in reaching out.`;

    return { response: crisisResponse, risk };
  }

  // 3. Flagged/Inappropriate Content Flow
  if (risk.risk_level === "INAPPROPRIATE") {
    db.audit.log(userId, "SAFETY_BLOCK", "Message was flagged as inappropriate or seeking diagnostic prescription.");
    return {
      response: "I hear you, but I'm unable to discuss medical diagnoses, prescribe medications, or engage with hostile topics. As your wellness companion, I'm here to support emotional reflection, positive routines, and coping habits. If you are struggling with clinical symptoms, please consider scheduling an appointment with a verified expert in our Therapist Network, or browsing our guided grounding exercises in the Safety Center.",
      risk
    };
  }

  // 4. Safe Chat Flow
  const rawResponse = await generateWellnessResponse(userId, userMessage, history);

  // 5. Post-Response Safety Filter
  let filteredResponse = rawResponse;
  const selfDiagnosticsCheck = /\b(diagnose|clinical label|psychiatrist diagnosis|prescribe medication)\b/i;
  if (selfDiagnosticsCheck.test(filteredResponse)) {
    filteredResponse = "Thank you for sharing that. As your digital wellness companion, I want to gently remind you that I cannot offer clinical diagnoses or prescribe medication. I highly encourage you to speak with one of the licensed professionals listed in our Therapist Network who are fully equipped to guide you with appropriate clinical support.";
  }

  return { response: filteredResponse, risk };
}
