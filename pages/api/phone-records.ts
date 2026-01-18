import type { NextApiRequest, NextApiResponse } from 'next';
import { getPhoneRecords, getRecordsByPhone, getRecordsByUserId, syncMembers } from '@/lib/googleSheets';

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
          const syncResult = await syncMembers();
          console.log('自動同步會員完成:', syncResult);
          // 繼續執行正常的查詢流程
        } catch (syncError) {
          console.error('自動同步會員失敗:', syncError);
          // 同步失敗不影響查詢，繼續執行
        }
      }

      if (phone) {
        // 根據電話號碼查詢
        const records = await getRecordsByPhone(phone as string);
        return res.status(200).json({ success: true, data: records });
      }

      if (userId) {
        // 根據 User ID 查詢
        const records = await getRecordsByUserId(userId as string);
        return res.status(200).json({ success: true, data: records });
      }

      // 獲取所有記錄（自動同步會員）
      const records = await getPhoneRecords();
      
      // 在後台自動同步會員（不阻塞響應）
      syncMembers().catch(error => {
        console.error('後台自動同步會員失敗:', error);
      });
      
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

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error fetching phone records:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
