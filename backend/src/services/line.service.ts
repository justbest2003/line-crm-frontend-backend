import crypto from 'crypto';
import axios from 'axios';
import type { LineProfile } from '../types';

const LINE_API = 'https://api.line.me/v2';

function getToken(): string {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
}

function getSecret(): string {
  return process.env.LINE_CHANNEL_SECRET || '';
}

/** Verify LINE webhook signature using HMAC-SHA256 */
export function verifySignature(body: Buffer, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', getSecret())
    .update(body)
    .digest('base64');
  return hash === signature;
}

/** Fetch LINE user profile */
export async function getProfile(userId: string): Promise<LineProfile> {
  const res = await axios.get<LineProfile>(`${LINE_API}/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data;
}

/** Reply to a message using the reply token (one-time use) */
export async function replyMessage(replyToken: string, text: string): Promise<void> {
  await axios.post(
    `${LINE_API}/bot/message/reply`,
    {
      replyToken,
      messages: [{ type: 'text', text }],
    },
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
}

/** Push a message to a specific user (no reply token needed) */
export async function pushMessage(userId: string, text: string): Promise<void> {
  await axios.post(
    `${LINE_API}/bot/message/push`,
    {
      to: userId,
      messages: [{ type: 'text', text }],
    },
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
}
