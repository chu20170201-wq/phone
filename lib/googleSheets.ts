import { google } from 'googleapis';

// Google Sheets API 客户端初始化
export async function getSheetsClient() {
  // 处理私钥格式：Vercel 环境变量中的换行符可能是 \n 字符串或实际换行符
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  
  if (!privateKey) {
    throw new Error('GOOGLE_PRIVATE_KEY environment variable is not set');
  }

  // 处理换行符：Vercel 中可能存储为 \n 字符串
  if (privateKey.includes('\\n')) {
    // 替换 \\n 为实际换行符
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  // 验证私钥格式
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    throw new Error('Invalid private key format: missing BEGIN or END PRIVATE KEY');
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!clientEmail) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable is not set');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets', // 添加寫入權限
    ],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// 获取电话查询记录（Sheet1）
export async function getPhoneRecords() {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('Missing required parameters: spreadsheetId');
  }

  // 读取 Sheet1 的数据（从第 2 行开始，第 1 行是标题）
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!A2:AV', // 根据实际列数调整
  });

  const rows = response.data.values || [];
  
  // 將數據轉換為對象數組
  // 根據表頭映射：
  // A=phoneNumber(0), B=prefix(1), C=riskLevel(2), D=headers(3), E=replyToken(4)
  // F=params(5), G=query(6), H=body(7), I=webhookUrl(8), J=executionMode(9)
  // K=riskLevel(10), L=userId(11), M=timestamp(12), N=isPigeon(13), etc.
  const records = rows.map((row, index) => ({
    rowNumber: index + 2, // 實際行號（從 2 開始）
    phoneNumber: row[0] || '',      // A列 (索引0)
    prefix: row[1] || '',            // B列 (索引1)
    riskLevel: row[2] || '',         // C列 (索引2)
    headers: row[3] || '',           // D列 (索引3)
    replyToken: row[4] || '',        // E列 (索引4)
    params: row[5] || '',            // F列 (索引5)
    query: row[6] || '',             // G列 (索引6)
    body: row[7] || '',              // H列 (索引7)
    webhookUrl: row[8] || '',        // I列 (索引8)
    executionMode: row[9] || '',     // J列 (索引9)
    userId: row[11] || '',           // L列 (索引11) - 修正！
    timestamp: row[12] || '',        // M列 (索引12) - 修正！
    isPigeon: row[13] === 'TRUE',    // N列 (索引13)
    pigeonPhone: row[14] || '',      // O列 (索引14)
    isPigeonListed: row[15] === 'TRUE',  // P列 (索引15)
    type: row[16] || '',             // Q列 (索引16)
    category: row[17] || '',          // R列 (索引17)
    source: row[18] || '',           // S列 (索引18)
    overrideBlocked: row[19] === 'TRUE',  // T列 (索引19)
    type_from_sheet: row[20] || '',  // U列 (索引20)
    replyBody: row[21] || '',        // V列 (索引21)
    displayName: row[22] || '',      // W列 (索引22)
    action: row[23] || '',           // X列 (索引23)
    memberProfile: row[24] || '',    // Y列 (索引24)
    isMember: row[25] === 'TRUE',    // Z列 (索引25)
    plan: row[26] || '',             // AA列 (索引26)
    status: row[27] || '',            // BA列 (索引27) - 修正！
    rootReplyToken: row[28] || '',   // CA列 (索引28)
    rootUserId: row[29] || '',       // DA列 (索引29)
    hasMemberRow: row[30] === 'TRUE',  // EA列 (索引30)
    memberState: row[31] || '',      // FA列 (索引31)
    hasUserId: row[32] === 'TRUE',   // GA列 (索引32)
    noUserId: row[33] === 'TRUE',    // HA列 (索引33)
    hasNoUserId: row[34] === 'TRUE', // IA列 (索引34)
    startAt: row[35] || '',          // JA列 (索引35)
    expireAt: row[36] || '',         // KA列 (索引36)
    lineName: row[37] || '',         // LA列 (索引37)
    contactPhone: row[38] || '',     // MA列 (索引38)
    paymentMethod: row[39] || '',    // NA列 (索引39)
    paymentTime: row[41] || '',      // PA列 (索引41) - 跳過 col_7
    state: row[45] || '',            // TA列 (索引45)
    profileUrl: row[46] || '',       // UA列 (索引46)
    needProfile: row[47] === 'TRUE', // VA列 (索引47)
  }));

  return records;
}

// 获取会员信息（Members 工作表）
export async function getMembers() {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 读取 Members 工作表的数据
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Members / Subscriptions!A2:Z', // 根据实际列数调整
  });

  const rows = response.data.values || [];
  
  // 將數據轉換為對象數組
  // Members / Subscriptions 工作表列結構：
  // A=userId(0), B=plan(1), C=status(2), D=startAt(3), E=expireAt(4)
  // F=LINE名稱(5), G=狀態(6), H=聯絡電話(7), I=繳費方式(8), J=繳費時間(9)
  const members = rows.map((row, index) => ({
    rowNumber: index + 2,
    userId: row[0] || '',           // A列 (索引0)
    plan: row[1] || '',             // B列 (索引1)
    status: row[2] || '',          // C列 (索引2)
    startAt: row[3] || '',         // D列 (索引3)
    expireAt: row[4] || '',        // E列 (索引4)
    lineName: row[5] || '',        // F列 (索引5) - LINE名稱
    state: row[6] || '',           // G列 (索引6) - 狀態
    contactPhone: row[7] || '',    // H列 (索引7) - 聯絡電話
    paymentMethod: row[8] || '',   // I列 (索引8) - 繳費方式
    paymentTime: row[9] || '',     // J列 (索引9) - 繳費時間
  }));

  // 從 Sheet1 獲取會員的 profileUrl 和 displayName
  const records = await getPhoneRecords();
  const memberProfiles = new Map<string, { profileUrl?: string; displayName?: string }>();
  
  records.forEach(record => {
    if (record.userId && !memberProfiles.has(record.userId)) {
      memberProfiles.set(record.userId, {
        profileUrl: record.profileUrl,
        displayName: record.displayName,
      });
    }
  });

  // 合併 profileUrl 和 displayName 到會員資料
  return members.map(member => ({
    ...member,
    profileUrl: memberProfiles.get(member.userId)?.profileUrl || '',
    displayName: memberProfiles.get(member.userId)?.displayName || member.lineName,
  }));

  return members;
}

// 根據 User ID 獲取會員信息
export async function getMemberByUserId(userId: string) {
  const members = await getMembers();
  return members.find(member => member.userId === userId);
}

// 加值時間選項類型
export type ValueTimeOption = '30days' | '90days' | 'halfyear' | 'oneyear' | 'trial7days';

// 計算加值時間的到期日期
function calculateExpireDate(startDate: Date, option: ValueTimeOption): Date {
  const result = new Date(startDate);
  
  switch (option) {
    case '30days':
      result.setDate(result.getDate() + 30);
      break;
    case '90days':
      result.setDate(result.getDate() + 90);
      break;
    case 'halfyear':
      result.setMonth(result.getMonth() + 6);
      break;
    case 'oneyear':
      result.setFullYear(result.getFullYear() + 1);
      break;
    case 'trial7days':
      result.setDate(result.getDate() + 7);
      break;
  }
  
  return result;
}

// 格式化日期為 yyyy/M/d 格式（與 Google Sheets 格式一致）
function formatDateForSheets(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}/${month}/${day}`;
}

// 加值時間功能
export async function addValueTime(
  rowNumber: number,
  option: ValueTimeOption
) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 讀取當前的 startAt 和 expireAt
  const readRange = `Members / Subscriptions!D${rowNumber}:E${rowNumber}`;
  const readResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: readRange,
  });

  const existingValues = readResponse.data.values?.[0] || ['', ''];
  let currentStartAt = existingValues[0] || '';
  let currentExpireAt = existingValues[1] || '';

  // 確定開始日期
  let startDate: Date;
  if (currentStartAt && currentStartAt.trim() !== '') {
    // 如果有現有的開始日期，使用現有日期
    try {
      if (currentStartAt.includes('/')) {
        const [year, month, day] = currentStartAt.split('/').map(Number);
        startDate = new Date(year, month - 1, day);
      } else {
        startDate = new Date(currentStartAt);
      }
    } catch {
      startDate = new Date();
    }
  } else {
    // 如果沒有開始日期，使用當前日期
    startDate = new Date();
    currentStartAt = formatDateForSheets(startDate);
  }

  // 計算新的到期日期
  let newExpireDate: Date;
  if (currentExpireAt && currentExpireAt.trim() !== '' && option !== 'trial7days') {
    // 如果有現有的到期日期，從到期日期開始加值（延長）
    try {
      let existingExpireDate: Date;
      if (currentExpireAt.includes('/')) {
        const [year, month, day] = currentExpireAt.split('/').map(Number);
        existingExpireDate = new Date(year, month - 1, day);
      } else {
        existingExpireDate = new Date(currentExpireAt);
      }
      
      // 如果現有到期日期還沒過期，從到期日期開始加值
      if (existingExpireDate > new Date()) {
        newExpireDate = calculateExpireDate(existingExpireDate, option);
      } else {
        // 如果已過期，從今天開始加值
        newExpireDate = calculateExpireDate(new Date(), option);
      }
    } catch {
      // 如果解析失敗，從今天開始加值
      newExpireDate = calculateExpireDate(new Date(), option);
    }
  } else {
    // 如果沒有到期日期或是試用期，從開始日期加值
    newExpireDate = calculateExpireDate(startDate, option);
  }

  const newExpireAt = formatDateForSheets(newExpireDate);

  // 更新 startAt 和 expireAt
  const updateRange = `Members / Subscriptions!D${rowNumber}:E${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: updateRange,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[currentStartAt, newExpireAt]],
    },
  });

  return {
    startAt: currentStartAt,
    expireAt: newExpireAt,
  };
}

// 檢查單元格是否包含公式
async function cellHasFormula(
  spreadsheetId: string,
  sheetId: number,
  rowNumber: number,
  columnIndex: number
): Promise<boolean> {
  const sheets = await getSheetsClient();
  
  try {
    // 使用 get 方法獲取單元格數據，包括公式信息
    const columnLetter = String.fromCharCode(65 + columnIndex); // A=0, B=1, C=2...
    const range = `Members / Subscriptions!${columnLetter}${rowNumber}`;
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [range],
      includeGridData: true,
    });

    const sheet = response.data.sheets?.[0];
    if (!sheet?.data?.[0]?.rowData) {
      return false;
    }

    // rowData 數組索引：第 1 行（標題）是索引 0，第 2 行是索引 1，所以 rowNumber - 1
    const rowIndex = rowNumber - 1;
    const rowData = sheet.data[0].rowData[rowIndex];
    if (!rowData?.values?.[0]) {
      return false;
    }

    const cellData = rowData.values[0];
    
    // 檢查單元格是否有公式
    return !!cellData.userEnteredValue?.formulaValue;
  } catch (error) {
    console.error('Error checking formula:', error);
    return false;
  }
}

// 更新會員信息（方案、狀態、LINE名稱）
export async function updateMember(
  rowNumber: number, 
  plan: string, 
  status: string, 
  lineName?: string
) {
  const sheets = await getSheetsClient();
  const spreadsheetIdEnv = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 獲取工作表 ID
  const sheetId = await getSheetId('Members / Subscriptions');
  if (!sheetId) {
    throw new Error('找不到 Members / Subscriptions 工作表');
  }

  // 檢查 B列（plan，索引 1）是否包含公式
  // rowNumber 是實際行號（從 2 開始，第 1 行是標題）
  if (!spreadsheetIdEnv) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID 未設置');
  }
  const spreadsheetId = spreadsheetIdEnv as string;
  const planHasFormula = await cellHasFormula(spreadsheetId, sheetId, rowNumber, 1);

  // 更新 Members 工作表的列：
  // B列=plan(1), C列=status(2), F列=LINE名稱(5)
  if (lineName !== undefined && lineName.trim() !== '') {
    // 同時更新狀態和 LINE 名稱
    // 如果 B列是公式，不更新 plan，讓公式自動計算
    if (planHasFormula) {
      // B列是公式，只更新 C列（status）和 F列（lineName），保留公式
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: [
            {
              range: `Members / Subscriptions!C${rowNumber}`,
              values: [[status]],
            },
            {
              range: `Members / Subscriptions!F${rowNumber}`,
              values: [[lineName.trim()]],
            },
          ],
        },
      });
    } else {
      // B列不是公式，可以更新 plan、status 和 lineName
      // 需要先讀取 D 和 E 列的值（startAt, expireAt）以保持不變
      const readRange = `Members / Subscriptions!D${rowNumber}:E${rowNumber}`;
      const readResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: readRange,
      });
      
      const existingValues = readResponse.data.values?.[0] || ['', ''];
      const startAt = existingValues[0] || '';
      const expireAt = existingValues[1] || '';
      
      const range = `Members / Subscriptions!B${rowNumber}:F${rowNumber}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[plan, status, startAt, expireAt, lineName.trim()]],
        },
      });
    }
  } else {
    // 只更新狀態（如果 B列是公式，不更新 plan）
    if (planHasFormula) {
      // B列是公式，只更新 C列（status），保留公式
      const range = `Members / Subscriptions!C${rowNumber}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[status]],
        },
      });
    } else {
      // B列不是公式，可以更新 plan 和 status
      const range = `Members / Subscriptions!B${rowNumber}:C${rowNumber}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[plan, status]],
        },
      });
    }
  }
}

// 根据电话号码获取相关记录
export async function getRecordsByPhone(phoneNumber: string) {
  const records = await getPhoneRecords();
  // 移除电话号码中的非数字字符进行比较
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  return records.filter(record => {
    const recordPhone = record.phoneNumber.replace(/\D/g, '');
    return recordPhone.includes(normalizedPhone) || normalizedPhone.includes(recordPhone);
  });
}

// 根據 User ID 獲取相關記錄
export async function getRecordsByUserId(userId: string) {
  const records = await getPhoneRecords();
  return records.filter(record => record.userId === userId);
}

// 刪除會員（Members 工作表）
export async function deleteMember(rowNumber: number) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 刪除 Members 工作表的指定行
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: 0, // Members / Subscriptions 工作表（需要先獲取 sheetId）
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // rowNumber 是實際行號（從 2 開始），需要減 1 轉換為索引
              endIndex: rowNumber, // 只刪除一行
            },
          },
        },
      ],
    },
  });
}

// 獲取工作表 ID
async function getSheetId(sheetName: string): Promise<number | null> {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = response.data.sheets?.find(
      s => s.properties?.title === sheetName
    );

    return sheet?.properties?.sheetId || null;
  } catch (error) {
    console.error('Error getting sheet ID:', error);
    return null;
  }
}

// 刪除會員（Members 工作表）- 改進版
export async function deleteMemberByRowNumber(rowNumber: number) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 獲取 Members / Subscriptions 工作表的 sheetId
  const sheetId = await getSheetId('Members / Subscriptions');
  
  if (!sheetId) {
    throw new Error('找不到 Members / Subscriptions 工作表');
  }

  // 刪除指定行（rowNumber 是實際行號，從 2 開始，需要減 1 轉換為索引）
  // 注意：Google Sheets API 的索引從 0 開始
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // 轉換為索引（從 0 開始）
              endIndex: rowNumber, // 只刪除一行
            },
          },
        },
      ],
    },
  });
}

// 自動同步會員：檢查並創建新會員
export async function syncMembers() {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 1. 獲取 Sheet1 中的所有 userId
  const recordsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!L2:L', // L列是 userId
  });

  const recordRows = recordsResponse.data.values || [];
  const userIdsFromRecords = new Set<string>();
  
  recordRows.forEach(row => {
    if (row[0] && row[0].trim() !== '') {
      userIdsFromRecords.add(row[0].trim());
    }
  });

  if (userIdsFromRecords.size === 0) {
    return { created: 0, existing: 0 };
  }

  // 2. 獲取 Members 工作表中已有的 userId
  const membersResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Members / Subscriptions!A2:A', // A列是 userId
  });

  const memberRows = membersResponse.data.values || [];
  const existingUserIds = new Set<string>();
  
  memberRows.forEach(row => {
    if (row[0] && row[0].trim() !== '') {
      existingUserIds.add(row[0].trim());
    }
  });

  // 3. 找出不在 Members 中的 userId
  const newUserIds = Array.from(userIdsFromRecords).filter(
    userId => !existingUserIds.has(userId)
  );

  if (newUserIds.length === 0) {
    return { created: 0, existing: existingUserIds.size };
  }

  // 4. 為新 userId 創建會員記錄（添加 7 天試用期）
  const today = new Date();
  const trialEndDate = new Date(today);
  trialEndDate.setDate(trialEndDate.getDate() + 7);

  const startAt = formatDateForSheets(today);
  const expireAt = formatDateForSheets(trialEndDate);

  // 準備要插入的新行數據
  // 注意：B列（plan）留空，讓公式自動計算（=IF(D191="","",IF(E191<TODAY(),"nopro","pro"))）
  const newRows = newUserIds.map(userId => [
    userId,           // A列: userId
    '',               // B列: plan（留空，由公式自動計算）
    'active',         // C列: status（啟用）
    startAt,          // D列: startAt
    expireAt,         // E列: expireAt（7天後）
    '',               // F列: LINE名稱（空）
    '',               // G列: 狀態（空）
    '',               // H列: 聯絡電話（空）
    '',               // I列: 繳費方式（空）
    '',               // J列: 繳費時間（空）
  ]);

  // 5. 追加新行到 Members 工作表
  const appendResponse = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Members / Subscriptions!A:J',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: newRows,
    },
  });

  // 6. 獲取新添加行的行號
  // appendResponse.data.updates?.updatedRange 格式: "Members / Subscriptions!A194:J194"
  // 提取行號（例如：194）
  const updatedRange = appendResponse.data.updates?.updatedRange || '';
  const rowMatch = updatedRange.match(/!A(\d+):/);
  const firstNewRowNumber = rowMatch ? parseInt(rowMatch[1], 10) : null;

  // 7. 為新添加的行設置 B列公式（如果成功獲取到行號）
  if (firstNewRowNumber) {
    const sheetId = await getSheetId('Members / Subscriptions');
    if (sheetId) {
      // 為每一行新添加的記錄設置公式
      const formulaRequests = [];
      
      for (let i = 0; i < newUserIds.length; i++) {
        const rowNumber = firstNewRowNumber + i;
        // 公式：=IF(D{rowNumber}="","",IF(E{rowNumber}<TODAY(),"nopro","pro"))
        const formula = `=IF(D${rowNumber}="","",IF(E${rowNumber}<TODAY(),"nopro","pro"))`;
        
        formulaRequests.push({
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowNumber - 1, // 轉換為 0-based 索引
              endRowIndex: rowNumber,
              startColumnIndex: 1, // B列（索引 1）
              endColumnIndex: 2,
            },
            rows: [{
              values: [{
                userEnteredValue: {
                  formulaValue: formula,
                },
              }],
            }],
            fields: 'userEnteredValue.formulaValue',
          },
        });
      }

      // 批量更新公式
      if (formulaRequests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: formulaRequests,
          },
        });
      }
    }
  }

  return { 
    created: newUserIds.length, 
    existing: existingUserIds.size,
    newUserIds: newUserIds,
  };
}

// 檢查並創建單個會員（如果不存在）
export async function ensureMemberExists(userId: string): Promise<{ created: boolean; member: any }> {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('ensureMemberExists: Missing spreadsheetId');
  }

  // 1. 檢查會員是否已存在
  const existingMember = await getMemberByUserId(userId);
  if (existingMember) {
    return { created: false, member: existingMember };
  }

  // 2. 如果不存在，創建新會員（7天試用期）
  const today = new Date();
  const trialEndDate = new Date(today);
  trialEndDate.setDate(trialEndDate.getDate() + 7);

  const startAt = formatDateForSheets(today);
  const expireAt = formatDateForSheets(trialEndDate);

  const newRow = [
    userId,           // A列: userId
    '',               // B列: plan（留空，由公式自動計算）
    'active',         // C列: status（啟用）
    startAt,          // D列: startAt
    expireAt,         // E列: expireAt（7天後）
    '',               // F列: LINE名稱（空）
    '',               // G列: 狀態（空）
    '',               // H列: 聯絡電話（空）
    '',               // I列: 繳費方式（空）
    '',               // J列: 繳費時間（空）
  ];

  // 3. 追加新行到 Members 工作表
  const appendResponse = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Members / Subscriptions!A:J',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [newRow],
    },
  });

  // 4. 獲取新添加行的行號並設置公式
  const updatedRange = appendResponse.data.updates?.updatedRange || '';
  const rowMatch = updatedRange.match(/!A(\d+):/);
  const newRowNumber = rowMatch ? parseInt(rowMatch[1], 10) : null;

  if (newRowNumber) {
    const sheetId = await getSheetId('Members / Subscriptions');
    if (sheetId) {
      const formula = `=IF(D${newRowNumber}="","",IF(E${newRowNumber}<TODAY(),"nopro","pro"))`;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateCells: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: newRowNumber - 1,
                  endRowIndex: newRowNumber,
                  startColumnIndex: 1, // B列 (索引 1)
                  endColumnIndex: 2,
                },
                rows: [{
                  values: [{
                    userEnteredValue: {
                      formulaValue: formula,
                    },
                  }],
                }],
                fields: 'userEnteredValue.formulaValue',
              },
            },
          ],
        },
      });
    }
  }

  // 5. 獲取新創建的會員資料
  const newMember = await getMemberByUserId(userId);
  return { created: true, member: newMember };
}

// 獲取風險名單（Sheet2）
export async function getRiskList() {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 讀取 Sheet2 的數據（從第 2 行開始，第 1 行是標題）
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet2!A2:Z', // 根據實際列數調整
  });

  const rows = response.data.values || [];
  
  // 將數據轉換為對象數組
  // Sheet2 列結構：
  // A=phoneNumber(0), B=userId(1), C=timestamp(2), ..., P=type(15)
  const riskRecords = rows.map((row, index) => ({
    rowNumber: index + 2, // 實際行號（從 2 開始）
    phoneNumber: row[0] || '',           // A列 (索引0)
    userId: row[1] || '',                // B列 (索引1)
    timestamp: row[2] || '',             // C列 (索引2)
    prefix: row[10] || '',               // K列 (索引10)
    riskLevel: row[11] || '',            // L列 (索引11)
    isPigeon: row[12] === 'TRUE',        // M列 (索引12)
    pigeonPhone: row[13] || '',          // N列 (索引13)
    category: row[14] || '',             // O列 (索引14)
    type: row[15] || '',                 // P列 (索引15) - 風險類型
    type_from_sheet: row[16] || '',      // Q列 (索引16)
    displayName: row[17] || '',          // R列 (索引17)
    memberProfile: row[18] || '',        // S列 (索引18)
    hasMemberRow: row[19] === 'TRUE',    // T列 (索引19)
    plan: row[20] || '',                 // U列 (索引20)
    memberState: row[21] || '',          // V列 (索引21)
    isMember: row[22] === 'TRUE',        // W列 (索引22)
    overrideBlocked: row[23] === 'TRUE', // X列 (索引23)
    hasUserId: row[24] === 'TRUE',       // Y列 (索引24)
    status: row[25] || '',               // Z列 (索引25)
  }));

  return riskRecords;
}

// 更新風險記錄（Sheet2）
export async function updateRiskRecord(
  rowNumber: number,
  updates: {
    phoneNumber?: string;
    userId?: string;
    type?: string;
    riskLevel?: string;
    status?: string;
  }
) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 先讀取現有的整行數據，以保留其他欄位
  const readRange = `Sheet2!A${rowNumber}:Z${rowNumber}`;
  const readResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: readRange,
  });

  const existingRow = readResponse.data.values?.[0] || [];
  
  // 更新對應的欄位
  // A=phoneNumber(0), B=userId(1), P=type(15), L=riskLevel(11), Z=status(25)
  if (updates.phoneNumber !== undefined) {
    existingRow[0] = updates.phoneNumber;
  }
  if (updates.userId !== undefined) {
    existingRow[1] = updates.userId;
  }
  if (updates.riskLevel !== undefined) {
    existingRow[11] = updates.riskLevel;
  }
  if (updates.type !== undefined) {
    existingRow[15] = updates.type;
  }
  if (updates.status !== undefined) {
    existingRow[25] = updates.status;
  }

  // 確保陣列長度足夠（至少 26 個元素，對應 A-Z）
  while (existingRow.length < 26) {
    existingRow.push('');
  }

  // 寫回更新後的數據
  const updateRange = `Sheet2!A${rowNumber}:Z${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: updateRange,
    valueInputOption: 'RAW',
    requestBody: {
      values: [existingRow],
    },
  });
}

// 刪除風險記錄（Sheet2）
export async function deleteRiskRecord(rowNumber: number) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // 獲取 Sheet2 工作表的 sheetId
  const sheetId = await getSheetId('Sheet2');
  
  if (!sheetId) {
    throw new Error('找不到 Sheet2 工作表');
  }

  // 刪除指定行（rowNumber 是實際行號，從 2 開始，需要減 1 轉換為索引）
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // 轉換為索引（從 0 開始）
              endIndex: rowNumber, // 只刪除一行
            },
          },
        },
      ],
    },
  });
}
