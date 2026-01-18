import type { NextApiRequest, NextApiResponse } from 'next';
import { getRiskList, updateRiskRecord, deleteRiskRecord } from '@/lib/googleSheets';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { type, phoneNumber } = req.query;

      let riskList = await getRiskList();

      // 根據風險類型篩選
      if (type && typeof type === 'string') {
        riskList = riskList.filter(record => record.type === type);
      }

      // 根據電話號碼篩選
      if (phoneNumber && typeof phoneNumber === 'string') {
        const normalizedPhone = phoneNumber.replace(/\D/g, '');
        riskList = riskList.filter(record => {
          const recordPhone = record.phoneNumber.replace(/\D/g, '');
          return recordPhone.includes(normalizedPhone) || normalizedPhone.includes(recordPhone);
        });
      }

      return res.status(200).json({ success: true, data: riskList });
    }

    if (req.method === 'PUT') {
      const { rowNumber, phoneNumber, userId, type, riskLevel, status } = req.body;

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

      const updates: {
        phoneNumber?: string;
        userId?: string;
        type?: string;
        riskLevel?: string;
        status?: string;
      } = {};

      if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
      if (userId !== undefined) updates.userId = userId;
      if (type !== undefined) updates.type = type;
      if (riskLevel !== undefined) updates.riskLevel = riskLevel;
      if (status !== undefined) updates.status = status;

      await updateRiskRecord(rowNum, updates);
      return res.status(200).json({ success: true, message: '更新成功' });
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

      await deleteRiskRecord(rowNum);
      return res.status(200).json({ success: true, message: '刪除成功' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in risk-list API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
