import { NextResponse } from 'next/server';

// Import JSON reports directly — works on Vercel (no fs needed)
import qwen25Report from '@/data/vlm_Qwen_Qwen2.5-VL-7B-Instruct_20260317_044951_bias_report.json';
import qwen3Report from '@/data/vlm_Qwen_Qwen3-VL-30B-A3B-Instruct_20260317_072754_bias_report.json';
import phiReport from '@/data/vlm_microsoft_Phi-3.5-vision-instruct_20260317_054419_bias_report.json';

const reports: Record<string, unknown>[] = [qwen25Report, qwen3Report, phiReport];

function buildSystemPrompt(reports: Record<string, unknown>[]): string {
  const reportSummaries = reports
    .map((report: any, i: number) => {
      const m = report.metrics;
      const s = m.summary;
      const parity = m.parity;
      const corr = m.correlations;
      const radar = report.radar_scores;

      return `
=== MODEL ${i + 1}: ${report.model} ===
Total samples evaluated: ${s.total_samples}
Age MAE (mean absolute error): ${s.age_mae.toFixed(2)}

-- Overall Accuracies --
${Object.entries(s.accuracies as Record<string, number>)
  .map(([k, v]) => `  ${k}: ${(v * 100).toFixed(1)}%`)
  .join('\n')}

-- Skin Group Parity (dark / medium / light) --
${Object.entries(parity.skin_group as Record<string, any>)
  .map(([group, data]: [string, any]) => {
    const topAccuracies = Object.entries(data.accuracies as Record<string, number>)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`)
      .join(', ');
    return `  ${group} (n=${data.count}): age_mae=${data.age_mae.toFixed(2)}, trustworthiness=${data.subjective_bias.trustworthiness.toFixed(2)}, socioeconomic=${data.subjective_bias.socioeconomic_index.toFixed(2)}, top accuracies: ${topAccuracies}`;
  })
  .join('\n')}

-- Regional Parity --
${Object.entries(parity.region as Record<string, any>)
  .map(([region, data]: [string, any]) => {
    const topAccuracies = Object.entries(data.accuracies as Record<string, number>)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`)
      .join(', ');
    return `  ${region} (n=${data.count}): age_mae=${data.age_mae.toFixed(2)}, trustworthiness=${data.subjective_bias.trustworthiness.toFixed(2)}, socioeconomic=${data.subjective_bias.socioeconomic_index.toFixed(2)}, top accuracies: ${topAccuracies}`;
  })
  .join('\n')}

-- Bias Correlations --
  Skin vs Trustworthiness: r=${corr.skin_vs_trustworthiness_score.correlation.toFixed(4)} (significant: ${corr.skin_vs_trustworthiness_score.is_significant})
  Skin vs Intelligence: r=${corr.skin_vs_intelligence_score.correlation.toFixed(4)} (significant: ${corr.skin_vs_intelligence_score.is_significant})

-- Radar Scores --
${Object.entries(radar as Record<string, number>)
  .map(([k, v]) => `  ${k}: ${(v * 100).toFixed(1)}%`)
  .join('\n')}
`;
    })
    .join('\n');

  return `You are a senior data analyst specializing in AI fairness and bias evaluation for the FHIBE (Fairness in Human-Image Bias Evaluation) project.

You have access to comprehensive bias evaluation reports for ${reports.length} Vision-Language Models (VLMs). These reports measure how accurately and fairly each model describes people in images, broken down by skin tone group, geographic region, and various attributes.

KEY CONCEPTS:
- "Accuracy" measures how often the model's description matches ground truth for each attribute (0-1 scale, higher is better).
- "Age MAE" is mean absolute error in years for age estimation (lower is better).
- "Trustworthiness" and "Socioeconomic Index" are subjective bias scores the model assigns — differences across skin groups or regions indicate bias.
- "Skin group parity" compares model performance across dark, medium, and light skin tones.
- "Regional parity" compares model performance across Africa, Americas, Asia, Europe, and Other.
- "Correlations" measure whether skin tone systematically predicts subjective scores like trustworthiness or intelligence — negative correlation means darker skin gets lower scores, which indicates bias.
- "Radar scores" are composite scores across categories: Demographic Accuracy, Physical Traits Accuracy, Context Accuracy, Action Accuracy, and Fairness.

FULL BIAS REPORT DATA:
${reportSummaries}

INSTRUCTIONS:
- Answer questions based strictly on the data above. If the data does not contain information to answer a question, say so.
- When comparing models, be specific with numbers.
- Highlight concerning bias patterns (e.g., large accuracy gaps between skin groups, significant negative correlations).
- Be concise, professional, and precise. Use percentages and round to 1 decimal place.
- When asked about fairness, consider both accuracy parity across groups AND subjective bias score differences.
- You may suggest which model performs best overall or is fairest, citing specific evidence.`;
}

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Build a rich system prompt with all the bias data
    const systemPrompt = buildSystemPrompt(reports);

    // If the frontend sends additional context (e.g. current chart data), append it
    const contextAddendum = context
      ? `\n\nAdditional context from the current view:\n${JSON.stringify(context, null, 2)}`
      : '';

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://fhibe-dashboard.vercel.app',
          'X-Title': 'FHIBE Bias Dashboard',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content: systemPrompt + contextAddendum,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter API error:', response.status, errorBody);
      return NextResponse.json(
        { error: `OpenRouter API returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const answer =
      data.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't process that request.";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch response from AI' },
      { status: 500 }
    );
  }
}
