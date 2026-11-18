import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { QualificationResult, LeadStatus } from './db.ts';

const GEMINI_MODEL = 'gemini-4-hydrogen';

export function isGeminiConfigured(): boolean {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

function getGeminiClient(): GoogleGenAI {
  if (!isGeminiConfigured()) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets to enable AI qualification and live responses.'
    );
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function normalizeLeadStatus(raw: unknown): LeadStatus {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'hot') return 'Hot';
  if (val === 'warm') return 'Warm';
  return 'Cold';
}

export async function qualifyLeadWithGemini(transcript: string): Promise<QualificationResult> {
  const ai = getGeminiClient();

  const systemInstruction =
    'You are an expert B2B sales operations analyst. Analyze the call transcript and extract structured lead qualification fields strictly from what the customer said. ' +
    'Do NOT invent or assume missing customer information; use "Not provided" when unavailable.\n\n' +
    'Classification rules:\n' +
    '- Hot: Strong purchase interest, clear requirements, budget identified, ready to purchase soon.\n' +
    '- Warm: Interested but needs more information, purchase decision not immediate, partial requirements known.\n' +
    '- Cold: Little or no purchase interest, no clear requirement, not planning to purchase.';

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Analyze this voice call transcript and return structured lead qualification JSON:\n\n${transcript}`,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          customer_name: {
            type: Type.STRING,
            description: 'Customer name if stated in the transcript, otherwise "Not provided".',
          },
          customer_requirements: {
            type: Type.STRING,
            description: 'Product or service requirements stated by the customer, or "Not provided".',
          },
          budget: {
            type: Type.STRING,
            description: 'Approximate budget mentioned by the customer, or "Not provided".',
          },
          purchase_timeline: {
            type: Type.STRING,
            description: 'When the customer plans to purchase, or "Not provided".',
          },
          interest_level: {
            type: Type.STRING,
            description: 'Concise assessment such as High, Medium-High, Medium, or Low.',
          },
          lead_status: {
            type: Type.STRING,
            description: 'Must be exactly one of: Hot, Warm, Cold.',
          },
          summary: {
            type: Type.STRING,
            description: 'Concise 2-3 sentence executive summary of the conversation.',
          },
          follow_up_recommendation: {
            type: Type.STRING,
            description: 'Specific next step for the sales team.',
          },
          qualification_reasoning: {
            type: Type.STRING,
            description: 'Brief explanation justifying the Hot/Warm/Cold classification.',
          },
        },
        required: [
          'customer_name',
          'customer_requirements',
          'budget',
          'purchase_timeline',
          'interest_level',
          'lead_status',
          'summary',
          'follow_up_recommendation',
          'qualification_reasoning',
        ],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty response during lead qualification.');
  }

  const parsed = JSON.parse(rawText) as Record<string, unknown>;
  return {
    customer_name: String(parsed.customer_name || 'Not provided'),
    customer_requirements: String(parsed.customer_requirements || 'Not provided'),
    budget: String(parsed.budget || 'Not provided'),
    purchase_timeline: String(parsed.purchase_timeline || 'Not provided'),
    interest_level: String(parsed.interest_level || 'Medium'),
    lead_status: normalizeLeadStatus(parsed.lead_status),
    summary: String(parsed.summary || 'Call transcript analyzed.'),
    follow_up_recommendation: String(
      parsed.follow_up_recommendation || 'Review transcript and schedule a follow-up.'
    ),
    qualification_reasoning: String(
      parsed.qualification_reasoning || 'Classified based on requirements, budget, and timeline.'
    ),
  };
}

export async function summarizeCallWithGemini(transcript: string): Promise<string> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents:
      'Summarize the following sales qualification call in 2-3 clear sentences. ' +
      'Highlight customer requirements, budget, timeline, and outcome without fabricating facts:\n\n' +
      transcript,
  });

  const text = (response.text ?? '').trim();
  if (!text) {
    throw new Error('Gemini returned an empty call summary.');
  }
  return text;
}

export async function generateVoiceAgentReply(params: {
  systemPrompt: string;
  language: string;
  history: Array<{ role: 'assistant' | 'user'; content: string }>;
  userMessage: string;
}): Promise<{ reply: string; should_end_call: boolean }> {
  const ai = getGeminiClient();

  const conversationLog = params.history
    .map((m) => `${m.role === 'assistant' ? 'AI' : 'Customer'}: ${m.content}`)
    .join('\n');

  const prompt =
    `${params.systemPrompt}\n\n` +
    `Language: ${params.language}\n` +
    `Instructions:\n` +
    `- Respond naturally as a polite voice assistant in at most 2 concise spoken sentences.\n` +
    `- Do not repeat questions the customer has already answered.\n` +
    `- Aim to collect: requirements/interest, approximate budget, and buying timeline (and name if natural).\n` +
    `- Set should_end_call to true ONLY once the customer has answered those key qualification points or asks to end the call, and provide a polite closing sentence.\n\n` +
    `Conversation so far:\n${conversationLog}\nCustomer: ${params.userMessage}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'The AI voice assistant next spoken response.',
          },
          should_end_call: {
            type: Type.BOOLEAN,
            description: 'Whether the conversation has reached a natural polite conclusion.',
          },
        },
        required: ['reply', 'should_end_call'],
      },
    },
  });

  const raw = (response.text ?? '{}').trim();
  const parsed = JSON.parse(raw) as { reply?: string; should_end_call?: boolean };
  return {
    reply: String(parsed.reply || 'Thank you for sharing that. Could you let me know your target timeline?'),
    should_end_call: Boolean(parsed.should_end_call),
  };
}
