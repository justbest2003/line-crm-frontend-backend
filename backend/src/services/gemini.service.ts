import { GoogleGenerativeAI } from '@google/generative-ai';

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

function getModel() {
  if (!model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
  }
  return model;
}

const SYSTEM_PROMPT = `คุณคือแอดมินตอบแชทของ [ชื่อธุรกิจ] หน้าที่ของคุณคือ:
1. ตอบคำถามลูกค้าเกี่ยวกับสินค้า/บริการอย่างสุภาพและกระชับ
2. ถ้าลูกค้าถามราคา/โปรโมชั่น ให้ตอบตามข้อมูลที่ให้ไว้ด้านล่าง
3. ถ้าลูกค้าต้องการคุยกับคนจริงๆ หรือคำถามซับซ้อนเกินไป ให้บอกว่าจะส่งต่อให้แอดมิน และตอบด้วยคำว่า [ESCALATE] นำหน้า
4. ตอบเป็นภาษาไทย ยกเว้นลูกค้าทักเป็นภาษาอื่น

ข้อมูลธุรกิจ:
[ใส่ FAQ, ราคา, โปรโมชั่น ฯลฯ ตรงนี้]`;

/**
 * Generate a chatbot reply using Gemini.
 * Returns the reply text. If the reply starts with [ESCALATE], the caller
 * should hand off to a human agent.
 */
export async function generateReply(
  conversationHistory: string,
  customerMessage: string,
): Promise<string> {
  const m = getModel();

  const prompt = `${SYSTEM_PROMPT}

ประวัติการสนทนาล่าสุด:
${conversationHistory}

ข้อความใหม่จากลูกค้า:
${customerMessage}

ตอบกลับ:`;

  const result = await m.generateContent(prompt);
  const text = result.response.text().trim();
  return text;
}

/**
 * Wraps generateReply with retry logic for rate-limit (429) errors.
 * Retries up to 2 times with exponential backoff.
 * Throws 'RATE_LIMITED' if all retries fail.
 */
export async function generateReplyWithRetry(
  conversationHistory: string,
  customerMessage: string,
): Promise<string> {
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateReply(conversationHistory, customerMessage);
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');

      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (isRateLimit) {
        throw new Error('RATE_LIMITED');
      }
      throw err;
    }
  }

  throw new Error('RATE_LIMITED');
}
