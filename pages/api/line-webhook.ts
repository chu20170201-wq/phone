import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { appendLineOARecord } from '@/lib/googleSheets';
import { cacheDelete } from '@/lib/cache';

export const config = {
  api: { bodyParser: false },
};

function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function verifySignature(channelSecret: string, body: string, signature: string): boolean {
  const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
  return hash === signature;
}

async function getLineProfile(userId: string): Promise<{ displayName: string; pictureUrl: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { displayName: '', pictureUrl: '' };
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { displayName: '', pictureUrl: '' };
  const data = await res.json();
  return {
    displayName: data.displayName || '',
    pictureUrl: data.pictureUrl || '',
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    console.error('LINE_CHANNEL_SECRET 未設置');
    return res.status(500).json({ error: 'Server config error' });
  }

  const rawBody = await getRawBody(req);
  const signature = (req.headers['x-line-signature'] as string) || '';
  if (!verifySignature(channelSecret, rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload: { events?: Array<{ type: string; source?: { userId?: string }; message?: { type: string; text?: string }; timestamp?: number }> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const events = payload.events || [];
  for (const event of events) {
    if (event.type !== 'message' || !event.source?.userId || !event.message) continue;
    const userId = event.source.userId;
    const msg = event.message;
    const messageType = msg.type || 'text';
    const messageText = messageType === 'text' ? (msg.text || '') : `[${messageType}]`;

    try {
      const profile = await getLineProfile(userId);
      await appendLineOARecord({
        timestamp: new Date().toISOString(),
        userId,
        displayName: profile.displayName,
        profileUrl: profile.pictureUrl,
        messageType,
        messageText,
      });
      cacheDelete('line-oa');
    } catch (err) {
      console.error('LineOA append error:', err);
    }
  }

  return res.status(200).json({ ok: true });
}
