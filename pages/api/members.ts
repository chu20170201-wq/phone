import type { NextApiRequest, NextApiResponse } from 'next';
import { getMembers, getMemberByUserId, updateMember, addValueTime, deleteMemberByRowNumber, ValueTimeOption, syncMembers, ensureMemberExists } from '@/lib/googleSheets';
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from '@/lib/cache';

const CACHE_TTL_MS = 60 * 1000; // 60 秒

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { userId, sync } = req.query;

      if (sync === 'true') {
        try {
          await syncMembers();
        } catch (syncError) {
          console.error('自動同步會員失敗:', syncError);
        }
        cacheDeletePattern('members');
      }

      if (userId) {
        const cacheKey = `member:${userId}`;
        const cached = cacheGet<unknown>(cacheKey);
        if (cached !== null) return res.status(200).json({ success: true, data: cached });
        const member = await getMemberByUserId(userId as string);
        cacheSet(cacheKey, member || null, CACHE_TTL_MS);
        return res.status(200).json({ success: true, data: member || null });
      }

      const cached = cacheGet<unknown[]>('members');
      if (cached !== null) return res.status(200).json({ success: true, data: cached });

      const members = await getMembers();
      cacheSet('members', members, CACHE_TTL_MS);
      syncMembers().catch(() => {});
      return res.status(200).json({ success: true, data: members });
    }

    if (req.method === 'PUT') {
      const { rowNumber, plan, status, lineName, startAt, expireAt } = req.body;

      if (!rowNumber || !plan || !status) {
        return res.status(400).json({
          success: false,
          error: '缺少必要參數：rowNumber, plan, status',
        });
      }

      await updateMember(rowNumber, plan, status, lineName, startAt, expireAt);
      cacheDeletePattern('members');
      cacheDeletePattern('recent:');
      return res.status(200).json({ success: true, message: '更新成功' });
    }

    if (req.method === 'POST') {
      const { action, rowNumber, option, userId } = req.body;

      // 確保會員存在（如果不存在則創建）
      if (action === 'ensure-member' && userId) {
        try {
        const result = await ensureMemberExists(userId as string);
        cacheDeletePattern('members');
        cacheDeletePattern('recent:');
        return res.status(200).json({
            success: true, 
            message: result.created ? '會員已創建' : '會員已存在',
            data: result
          });
        } catch (error) {
          console.error('確保會員存在失敗:', error);
          return res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : '創建會員失敗' 
          });
        }
      }

      if (action === 'add-value' && rowNumber && option) {
        const validOptions: ValueTimeOption[] = ['30days', '90days', 'halfyear', 'oneyear', 'trial7days'];
        if (!validOptions.includes(option as ValueTimeOption)) {
          return res.status(400).json({ 
            success: false, 
            error: '無效的加值選項' 
          });
        }

        const result = await addValueTime(rowNumber, option as ValueTimeOption);
        cacheDeletePattern('members');
        cacheDeletePattern('recent:');
        return res.status(200).json({ 
          success: true, 
          message: '加值成功',
          data: result
        });
      }

      return res.status(400).json({ 
        success: false, 
        error: '缺少必要參數或無效的操作' 
      });
    }

    if (req.method === 'DELETE') {
      const { rowNumber } = req.query;

      if (!rowNumber) {
        return res.status(400).json({ 
          success: false, 
          error: '缺少必要參數：rowNumber' 
        });
      }

      const rowNum = parseInt(rowNumber as string, 10);
      if (isNaN(rowNum) || rowNum < 2) {
        return res.status(400).json({ 
          success: false, 
          error: '無效的行號' 
        });
      }

      await deleteMemberByRowNumber(rowNum);
      cacheDeletePattern('members');
      cacheDeletePattern('recent:');
      return res.status(200).json({ success: true, message: '刪除成功' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling members request:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
