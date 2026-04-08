import Anthropic from '@anthropic-ai/sdk';
import { StrategySpec, StrategySpecSchema } from '../core/types.js';
import { AnalysisResult } from './analyzer.js';

// ============================================================================
// LLM enrichment — only called when static confidence < 0.80
// Sends condensed extract (~150 tokens), NOT raw Pine Script
// ============================================================================

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a trading strategy analyst. You receive a partial StrategySpec JSON extracted from a Pine Script by a static analyzer.
Complete the missing fields to produce a valid StrategySpec.

Rules:
- Return ONLY valid JSON. No explanation, no markdown, no code fences.
- Keep all fields already present in the partial spec unchanged.
- strategyType options: "condition" | "pattern" | "scored" | "mtf_scored" | "session"
- entry.direction: "BUY" | "SELL" | "BOTH"
- conditions are human-readable strings like "RSI < 30" or "close > EMA(200)"
- parameters are numeric thresholds only (periods, multipliers, thresholds)
- If unsure about a field, omit it rather than guess`;

export async function enrichWithLLM(
  partial: Partial<StrategySpec>,
  pineSource: string,
  specId: string,
): Promise<StrategySpec | null> {
  // Send condensed info: partial spec + first 60 lines of Pine (for context on logic)
  const pineExcerpt = pineSource.split('\n').slice(0, 60).join('\n');

  const prompt = `Partial StrategySpec (from static analysis):
${JSON.stringify(partial, null, 2)}

Pine Script excerpt (first 60 lines for context):
${pineExcerpt}

Complete the StrategySpec JSON. Add id: "${specId}". Fill missing fields only.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',  // cheapest model — this is just JSON completion
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[parser] LLM did not return valid JSON');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return StrategySpecSchema.parse(parsed);
  } catch (err) {
    console.error('[parser] LLM enrichment failed:', String(err));
    return null;
  }
}

export function buildSpecFromStatic(
  analysis: AnalysisResult,
  specId: string,
): StrategySpec | null {
  try {
    return StrategySpecSchema.parse({
      id: specId,
      ...analysis.partial,
      parsedBy: 'static',
      confidence: analysis.confidence,
      rawHash: analysis.rawHash,
    });
  } catch {
    return null;
  }
}
