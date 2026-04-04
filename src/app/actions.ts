'use server';

import { GoogleGenAI } from '@google/genai';

// Initialize the API client
// It will automatically use the GEMINI_API_KEY from the environment variables
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generateTextAction(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });
    return { success: true, text: response.text };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateAudioAction(prompt: string) {
  try {
    // Note: Audio generation might require a specific model or API parameter
    // Gemini 1.5 or newer models handling audio output. Adjust model name as needed.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `[Generate audio simulation/TTS script for]: ${prompt}`,
      // If the API supports config for audio output, it would go here.
    });
    
    // As of latest updates, if the API returns an audio blob, we can pass it back
    // Placeholder implementation for audio generation response structure
    return { success: true, text: 'Audio generation logic goes here! The model responded with: ' + response.text };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
