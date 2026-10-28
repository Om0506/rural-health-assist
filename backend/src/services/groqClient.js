import OpenAI from 'openai';

let groqInstance = null;
const invalidModels = new Set();

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
export const GROQ_FALLBACK_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

export const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }
  if (!groqInstance) {
    groqInstance = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      maxRetries: 0,
    });
  }
  return groqInstance;
};

export const markModelInvalid = (model) => {
  if (model) {
    invalidModels.add(model);
  }
};

export const isModelInvalid = (model) => {
  return model ? invalidModels.has(model) : false;
};

export const getGroqModel = () => {
  const configured = process.env.GROQ_MODEL;
  if (configured && !invalidModels.has(configured)) {
    return configured;
  }
  for (const fallback of GROQ_FALLBACK_MODELS) {
    if (!invalidModels.has(fallback)) {
      return fallback;
    }
  }
  return DEFAULT_GROQ_MODEL;
};

export const GROQ_CHAT_MODEL = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

