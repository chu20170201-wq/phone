import type { NextApiRequest, NextApiResponse } from 'next';
import { getMembers, getMemberByUserId, updateMember, addValueTime, deleteMemberByRowNumber, ValueTimeOption, syncMembers, ensureMemberExists } from '@/lib/googleSheets';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { userId, sync } = req.query;

      // 如果請求同步會員，則先執行同步
      if (sync === 'true') {
        try {
          const syncResult = await syncMembers();
          console.log('自動同步會員完成:', syncResult);
        } catch (syncError) {
          console.error('自動同步會員失敗:', syncError);
        }
      }

      if (userId) {
        // 根據 User ID 查詢單個會員
        const member = await getMemberByUserId(userId as string);
        return res.status(200).json({ success: true, data: member || null });
      }

      // 獲取所有會員（自動同步會員）
      const members = await getMembers();
      
      // 在後台自動同步會員（不阻塞響應）
      syncMembers().catch(error => {
        console.error('後台自動同步會員失敗:', error);
      });
      
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
      return res.status(200).json({ success: true, message: '更新成功' });
    }

    if (req.method === 'POST') {
      const { action, rowNumber, option, userId } = req.body;

      // 確保會員存在（如果不存在則創建）
      if (action === 'ensure-member' && userId) {
        try {
          const result = await ensureMemberExists(userId as string);
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
