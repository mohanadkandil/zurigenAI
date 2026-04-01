import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const systemPrompt = `You are a data analyst for the FHIBE (Fairness in Human-Image Bias Evaluation) dataset. 
    You have access to regional bias data for different Vision-Language Models.
    
    Current Data Context:
    ${JSON.stringify(context, null, 2)}
    
    Analyze the user's query based strictly on this data. Be concise and professional.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
        }
      })
    });

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that request.";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: 'Failed to fetch response from Gemini' }, { status: 500 });
  }
}
