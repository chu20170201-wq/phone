#!/usr/bin/env node

/**
 * 自动配置 Google Sheets API 环境变量
 * 使用方法：
 * 1. 将下载的 JSON 密钥文件放在项目根目录
 * 2. 运行: node setup-config.js <json-file-path>
 * 例如: node setup-config.js ~/Downloads/your-project-xxxxx.json
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🚀 Google Sheets API 自动配置工具\n');
  console.log('=' .repeat(50));

  // 1. 获取 JSON 文件路径
  const jsonPath = process.argv[2];
  let jsonData;

  if (jsonPath && fs.existsSync(jsonPath)) {
    console.log(`\n✅ 找到 JSON 文件: ${jsonPath}`);
    try {
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      jsonData = JSON.parse(jsonContent);
      console.log('✅ JSON 文件解析成功');
    } catch (error) {
      console.error('❌ JSON 文件解析失败:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n📝 请提供 JSON 密钥文件路径');
    const inputPath = await question('JSON 文件路径（可以直接拖拽文件到终端）: ');
    const cleanPath = inputPath.trim().replace(/^["']|["']$/g, '');
    
    if (!fs.existsSync(cleanPath)) {
      console.error('❌ 文件不存在:', cleanPath);
      process.exit(1);
    }

    try {
      const jsonContent = fs.readFileSync(cleanPath, 'utf8');
      jsonData = JSON.parse(jsonContent);
      console.log('✅ JSON 文件解析成功');
    } catch (error) {
      console.error('❌ JSON 文件解析失败:', error.message);
      process.exit(1);
    }
  }

  // 2. 验证 JSON 文件结构
  if (!jsonData.client_email || !jsonData.private_key) {
    console.error('❌ JSON 文件格式不正确，缺少 client_email 或 private_key');
    process.exit(1);
  }

  // 3. 获取 Spreadsheet ID
  const currentEnvPath = path.join(__dirname, '.env.local');
  let spreadsheetId = '1VulDP7Kk_Uirag_ggRb042FI4n0BV7ntEkjsyWSI9V0'; // 默认值

  if (fs.existsSync(currentEnvPath)) {
    const currentEnv = fs.readFileSync(currentEnvPath, 'utf8');
    const match = currentEnv.match(/GOOGLE_SHEETS_SPREADSHEET_ID=(.+)/);
    if (match) {
      spreadsheetId = match[1].trim();
      console.log(`\n📊 使用现有的 Spreadsheet ID: ${spreadsheetId}`);
    }
  }

  const useDefault = await question(`\n使用默认 Spreadsheet ID (${spreadsheetId})? (Y/n): `);
  if (useDefault.trim().toLowerCase() === 'n') {
    const newId = await question('请输入新的 Spreadsheet ID: ');
    if (newId.trim()) {
      spreadsheetId = newId.trim();
    }
  }

  // 4. 生成 .env.local 内容
  const privateKey = jsonData.private_key.replace(/\n/g, '\\n');
  const envContent = `# Google Sheets API 配置
# 自动生成于: ${new Date().toLocaleString('zh-TW')}

GOOGLE_SHEETS_SPREADSHEET_ID=${spreadsheetId}
GOOGLE_SERVICE_ACCOUNT_EMAIL=${jsonData.client_email}
GOOGLE_PRIVATE_KEY="${privateKey}"
`;

  // 5. 确认覆盖
  if (fs.existsSync(currentEnvPath)) {
    console.log('\n⚠️  检测到已存在的 .env.local 文件');
    const overwrite = await question('是否覆盖? (y/N): ');
    if (overwrite.trim().toLowerCase() !== 'y') {
      console.log('❌ 已取消，未修改配置文件');
      rl.close();
      return;
    }
  }

  // 6. 写入文件
  try {
    fs.writeFileSync(currentEnvPath, envContent, 'utf8');
    console.log('\n✅ 配置已成功写入 .env.local 文件');
    console.log('\n📋 配置摘要:');
    console.log(`   Spreadsheet ID: ${spreadsheetId}`);
    console.log(`   服务账号邮箱: ${jsonData.client_email}`);
    console.log(`   私钥: ${jsonData.private_key.substring(0, 50)}...`);
  } catch (error) {
    console.error('❌ 写入文件失败:', error.message);
    process.exit(1);
  }

  // 7. 验证配置
  console.log('\n🔍 验证配置...');
  const envVars = {
    GOOGLE_SHEETS_SPREADSHEET_ID: spreadsheetId,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: jsonData.client_email,
    GOOGLE_PRIVATE_KEY: jsonData.private_key,
  };

  let isValid = true;
  for (const [key, value] of Object.entries(envVars)) {
    if (!value || value.trim() === '') {
      console.error(`❌ ${key} 为空`);
      isValid = false;
    }
  }

  if (isValid) {
    console.log('✅ 所有配置项验证通过');
    console.log('\n📌 下一步:');
    console.log('   1. 确保已将服务账号邮箱分享到 Google Sheets');
    console.log('   2. 重启开发服务器: npm run dev');
    console.log('   3. 访问 http://localhost:3000 测试');
  } else {
    console.error('❌ 配置验证失败，请检查');
  }

  rl.close();
}

main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
