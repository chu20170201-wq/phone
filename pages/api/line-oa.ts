import type { NextApiRequest, NextApiResponse } from 'next';
import { getLineOARecords } from '@/lib/googleSheets';
import { cacheGet, cacheSet } from '@/lib/cache';

const CACHE_TTL_MS = 30 * 1000; // 30 秒

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cached = cacheGet<unknown[]>('line-oa');
    if (cached !== null) return res.status(200).json({ success: true, data: cached });

    const records = await getLineOARecords();
    cacheSet('line-oa', records, CACHE_TTL_MS);
    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('GET line-oa error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '讀取失敗',
    });
  }
}
