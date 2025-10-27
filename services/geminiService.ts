import { GoogleGenAI } from "@google/genai";
import { ReportRow, EmailDraft } from '../types';

const dataToHtmlTable = (data: ReportRow[]): string => {
  if (!data || data.length === 0) {
    return '<p>No data available for this report.</p>';
  }

  const headers = Object.keys(data[0]);
  const headerRow = `<tr>${headers.map(h => `<th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; color: #333;">${h}</th>`).join('')}</tr>`;

  const bodyRows = data.map(row => {
    return `<tr>${headers.map(h => `<td style="border: 1px solid #ddd; padding: 8px;">${row[h]}</td>`).join('')}</tr>`;
  }).join('');

  return `<table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 14px;"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
};

/**
 * Cleans the AI-generated response by removing markdown code fences for HTML.
 * This makes the output more robust if the model wraps the HTML in ```html ... ```.
 * @param rawBody The raw string response from the AI.
 * @returns A cleaned HTML string.
 */
const cleanHtmlBody = (rawBody: string): string => {
  // Removes ```html at the start and ``` at the end, trimming whitespace.
  const cleaned = rawBody.replace(/^```html\s*/, '').replace(/\s*```$/, '').trim();
  return cleaned;
};


export const generateEmailDraft = async (subBottlerName: string, data: ReportRow[]): Promise<EmailDraft> => {
  // 1. Use import.meta.env.VITE_GEMINI_API_KEY
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  // 2. Update the error message to be correct
  throw new Error("VITE_GEMINI_API_KEY environment variable not set. Please configure it before proceeding.");
}

// 3. Pass the apiKey variable to the client
const ai = new GoogleGenAI({ apiKey: apiKey });

  // --- NEW SORTING LOGIC ---
  // Sort the data by "days from last hit" in descending order
  // We use [...data] to create a copy and not mutate the original array.
  const sortedData = [...data].sort((a, b) => {
    // Column name is normalized to lowercase in App.tsx, so we use that.
    const key = "days from last hit"; 
    
    // Default to 0 if the value is missing or not a number
    const valA = Number(a[key]) || 0; 
    const valB = Number(b[key]) || 0;
    
    // (b - a) gives descending order
    return valB - valA;
  });
  // --- END OF NEW LOGIC ---

  // Pass the newly sortedData to the table builder
  const htmlTable = dataToHtmlTable(sortedData);
  const subject = `Weekly Report for ${subBottlerName}`;

  const prompt = `
    You are a professional business operations assistant. Your task is to compose the body of a professional email.

    **Instructions:**
    1.  Start with a polite and friendly greeting addressed to the ${subBottlerName} team.
    2.  State clearly that their weekly report data is included in this email.
    3.  Keep the tone professional and concise.
    4.  End with a professional closing (e.g., "Best regards,"). Do not add a name or signature line.
    5.  After your written text, include the provided HTML table.
    6.  The final output should be a single block of HTML, starting with your written paragraphs inside <p> tags, followed by the table. Do not wrap the entire response in markdown backticks.

    **HTML Table to include:**
    ${htmlTable}
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt
    });
    
    const rawBody = response.text;
    const body = cleanHtmlBody(rawBody);

    return { subject, body };
  } catch (error: any) {
    console.error("Error generating email draft with Gemini:", error);
    let errorMessage = "Failed to generate AI-powered email draft.";
    if (error.message) {
      if (error.message.includes('API key not valid')) {
        errorMessage = "The provided API Key is invalid. Please check and try again.";
      } else if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "You've exceeded your API quota. Please check your plan and billing details or wait a minute before retrying.";
      } else if (error.message.includes('fetch')) {
         errorMessage = "A network error occurred. Please check your internet connection.";
      } else {
        errorMessage = `An unexpected error occurred with the AI service: ${error.message}`;
      }
    }
    throw new Error(errorMessage);
  }
};