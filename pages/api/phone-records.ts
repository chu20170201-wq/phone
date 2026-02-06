import type { NextApiRequest, NextApiResponse } from 'next';
import { getPhoneRecords, getRecordsByPhone, getRecordsByUserId, syncMembers, deletePhoneRecordAndRelated } from '@/lib/googleSheets';
import { cacheGet, cacheSet, cacheDeletePattern } from '@/lib/cache';

const CACHE_TTL_MS = 60 * 1000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { phone, userId, sync } = req.query;

      // 如果請求同步會員，則先執行同步
      if (sync === 'true') {
        try {
          await syncMembers();
        } catch (syncError) {
          console.error('自動同步會員失敗:', syncError);
        }
        cacheDeletePattern('phone-records');
      }

      if (phone) {
        const cacheKey = `phone-records:phone:${phone}`;
        const cached = cacheGet<unknown>(cacheKey);
        if (cached !== null) return res.status(200).json({ success: true, data: cached });
        const records = await getRecordsByPhone(phone as string);
        cacheSet(cacheKey, records, CACHE_TTL_MS);
        return res.status(200).json({ success: true, data: records });
      }

      if (userId) {
        const cacheKey = `phone-records:userId:${userId}`;
        const cached = cacheGet<unknown>(cacheKey);
        if (cached !== null) return res.status(200).json({ success: true, data: cached });
        const records = await getRecordsByUserId(userId as string);
        cacheSet(cacheKey, records, CACHE_TTL_MS);
        return res.status(200).json({ success: true, data: records });
      }

      const cached = cacheGet<unknown[]>('phone-records');
      if (cached !== null) return res.status(200).json({ success: true, data: cached });

      const records = await getPhoneRecords();
      cacheSet('phone-records', records, CACHE_TTL_MS);
      syncMembers().catch(() => {});
      return res.status(200).json({ success: true, data: records });
    }

    // 手動觸發同步會員
    if (req.method === 'POST' && req.body?.action === 'sync-members') {
      const syncResult = await syncMembers();
      return res.status(200).json({ 
        success: true, 
        message: '會員同步完成',
        data: syncResult
      });
    }

    if (req.method === 'DELETE') {
      const { rowNumber } = req.query;

      if (!rowNumber) {
        return res.status(400).json({
          success: false,
          error: '缺少必要參數：rowNumber',
        });
      }

      const rowNum = parseInt(rowNumber as string, 10);
      if (isNaN(rowNum) || rowNum < 2) {
        return res.status(400).json({
          success: false,
          error: '無效的行號',
        });
      }

      await deletePhoneRecordAndRelated(rowNum);
      cacheDeletePattern('phone-records');
      cacheDeletePattern('recent:');
      return res.status(200).json({ success: true, message: '刪除成功' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error fetching phone records:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
