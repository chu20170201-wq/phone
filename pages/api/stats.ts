import type { NextApiRequest, NextApiResponse } from 'next';
import { getPhoneRecords, getMembers } from '@/lib/googleSheets';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const [records, members] = await Promise.all([
        getPhoneRecords(),
        getMembers(),
      ]);

      // 統計資料
      const stats = {
        totalRecords: records.length,
        totalMembers: members.length,
        highRiskRecords: records.filter(r => r.riskLevel === 'high').length,
        mediumRiskRecords: records.filter(r => r.riskLevel === 'medium').length,
        lowRiskRecords: records.filter(r => r.riskLevel === 'low').length,
        activeMembers: members.filter(m => m.status === 'active').length,
        proMembers: members.filter(m => m.plan === 'pro').length,
        pigeonRecords: records.filter(r => r.isPigeon).length,
        recordsWithMembers: records.filter(r => r.isMember).length,
      };

      return res.status(200).json({ success: true, data: stats });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
