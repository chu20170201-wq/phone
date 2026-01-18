import type { NextApiRequest, NextApiResponse } from 'next';
import { getPhoneRecords, getMembers } from '@/lib/googleSheets';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { type, limit } = req.query;
      const limitNum = limit ? parseInt(limit as string, 10) : 10;

      if (type === 'records') {
        // 獲取最新的電話記錄（按時間戳排序）
        const allRecords = await getPhoneRecords();
        
        // 過濾出有時間戳的記錄，並按時間戳降序排序（最新的在前）
        const sortedRecords = allRecords
          .filter(record => record.timestamp && record.timestamp.trim() !== '')
          .sort((a, b) => {
            try {
              const dateA = new Date(a.timestamp).getTime();
              const dateB = new Date(b.timestamp).getTime();
              
              // 如果無法解析日期，則排在後面
              if (isNaN(dateA)) return 1;
              if (isNaN(dateB)) return -1;
              
              // 降序排序（最新的在前）
              return dateB - dateA;
            } catch {
              return 0;
            }
          });

        // 取前 N 筆
        const recentRecords = sortedRecords.slice(0, limitNum);

        return res.status(200).json({ 
          success: true, 
          data: recentRecords,
          total: sortedRecords.length
        });
      }

      if (type === 'members') {
        // 獲取最新的會員記錄（按加入時間排序）
        const allMembers = await getMembers();
        
        // 過濾出有開始時間的會員，並按開始時間降序排序（最新的在前）
        const sortedMembers = allMembers
          .filter(member => member.startAt && member.startAt.trim() !== '')
          .sort((a, b) => {
            try {
              // 處理日期格式（可能是 YYYY/MM/DD 或 ISO 格式）
              let dateA: number;
              let dateB: number;
              
              if (a.startAt.includes('/')) {
                const [year, month, day] = a.startAt.split('/').map(Number);
                dateA = new Date(year, month - 1, day).getTime();
              } else {
                dateA = new Date(a.startAt).getTime();
              }
              
              if (b.startAt.includes('/')) {
                const [year, month, day] = b.startAt.split('/').map(Number);
                dateB = new Date(year, month - 1, day).getTime();
              } else {
                dateB = new Date(b.startAt).getTime();
              }
              
              // 如果無法解析日期，則排在後面
              if (isNaN(dateA)) return 1;
              if (isNaN(dateB)) return -1;
              
              // 降序排序（最新的在前）
              return dateB - dateA;
            } catch {
              return 0;
            }
          });

        // 取前 N 筆
        const recentMembers = sortedMembers.slice(0, limitNum);

        return res.status(200).json({ 
          success: true, 
          data: recentMembers,
          total: sortedMembers.length
        });
      }

      return res.status(400).json({ 
        success: false, 
        error: '無效的類型參數，請使用 records 或 members' 
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error fetching recent data:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
