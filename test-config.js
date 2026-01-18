#!/usr/bin/env node

/**
 * 自动测试配置和 API 连接
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  log('\n📋 检查配置文件...', 'cyan');
  const envPath = path.join(__dirname, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env.local 文件不存在', 'red');
    return { exists: false };
  }

  log('✅ .env.local 文件存在', 'green');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const config = {
    spreadsheetId: null,
    serviceAccountEmail: null,
    privateKey: null,
  };

  // 解析环境变量
  const spreadsheetMatch = envContent.match(/GOOGLE_SHEETS_SPREADSHEET_ID=(.+)/);
  const emailMatch = envContent.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.+)/);
  const keyMatch = envContent.match(/GOOGLE_PRIVATE_KEY="(.+?)"/s) || 
                   envContent.match(/GOOGLE_PRIVATE_KEY=(.+)/);

  if (spreadsheetMatch) {
    config.spreadsheetId = spreadsheetMatch[1].trim();
  }
  if (emailMatch) {
    config.serviceAccountEmail = emailMatch[1].trim();
  }
  if (keyMatch) {
    config.privateKey = keyMatch[1].trim();
  }

  // 验证配置
  log('\n📊 配置状态:', 'cyan');
  log(`   Spreadsheet ID: ${config.spreadsheetId || '❌ 未设置'}`, 
      config.spreadsheetId ? 'green' : 'red');
  log(`   服务账号邮箱: ${config.serviceAccountEmail || '❌ 未设置'}`, 
      config.serviceAccountEmail && !config.serviceAccountEmail.includes('your-service') 
        ? 'green' : 'yellow');
  log(`   私钥: ${config.privateKey ? '✅ 已设置' : '❌ 未设置'}`, 
      config.privateKey && !config.privateKey.includes('Your private key') 
        ? 'green' : 'yellow');

  const isValid = config.spreadsheetId && 
                  config.serviceAccountEmail && 
                  !config.serviceAccountEmail.includes('your-service') &&
                  config.privateKey && 
                  !config.privateKey.includes('Your private key');

  return { exists: true, config, isValid };
}

async function testAPI(endpoint = '/api/stats') {
  log('\n🌐 测试 API 连接...', 'cyan');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success) {
            log('✅ API 响应成功', 'green');
            log(`   数据: ${JSON.stringify(json.data).substring(0, 100)}...`, 'blue');
            resolve({ success: true, data: json });
          } else {
            log('⚠️  API 返回错误', 'yellow');
            log(`   错误: ${json.error}`, 'yellow');
            resolve({ success: false, error: json.error });
          }
        } catch (e) {
          log('❌ API 响应格式错误', 'red');
          log(`   响应: ${data.substring(0, 200)}`, 'red');
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        log('❌ 无法连接到服务器 (http://localhost:3000)', 'red');
        log('   请确保开发服务器正在运行: npm run dev', 'yellow');
      } else {
        log(`❌ 连接错误: ${error.message}`, 'red');
      }
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      log('❌ 请求超时', 'red');
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

function checkServerRunning() {
  log('\n🔍 检查服务器状态...', 'cyan');
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 2000,
    }, (res) => {
      log('✅ 开发服务器正在运行', 'green');
      resolve(true);
    });

    req.on('error', () => {
      log('❌ 开发服务器未运行', 'red');
      log('   请运行: npm run dev', 'yellow');
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      log('⚠️  服务器响应超时', 'yellow');
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  log('🚀 开始自动测试配置', 'cyan');
  log('='.repeat(50), 'cyan');

  // 1. 检查配置文件
  const envCheck = checkEnvFile();
  
  if (!envCheck.exists) {
    log('\n❌ 测试失败: 配置文件不存在', 'red');
    log('   请先运行: npm run setup', 'yellow');
    process.exit(1);
  }

  // 2. 检查服务器
  const serverRunning = await checkServerRunning();
  
  if (!serverRunning) {
    log('\n⚠️  无法测试 API: 服务器未运行', 'yellow');
    log('\n📋 配置检查结果:', 'cyan');
    if (envCheck.isValid) {
      log('✅ 配置文件格式正确', 'green');
      log('   下一步: 运行 npm run dev 启动服务器', 'blue');
    } else {
      log('❌ 配置文件不完整或使用示例值', 'red');
      log('   请运行: npm run setup 进行配置', 'yellow');
    }
    process.exit(0);
  }

  // 3. 测试 API
  const apiResult = await testAPI();

  // 4. 总结
  log('\n' + '='.repeat(50), 'cyan');
  log('📊 测试总结', 'cyan');
  log('='.repeat(50), 'cyan');
  
  if (envCheck.isValid) {
    log('✅ 配置文件: 正确', 'green');
  } else {
    log('⚠️  配置文件: 需要更新', 'yellow');
    log('   建议运行: npm run setup', 'yellow');
  }

  if (apiResult.success) {
    log('✅ API 连接: 成功', 'green');
    log('\n🎉 所有测试通过！系统可以正常使用。', 'green');
  } else {
    log('❌ API 连接: 失败', 'red');
    if (apiResult.error) {
      log(`   错误信息: ${apiResult.error}`, 'yellow');
      
      // 常见错误提示
      if (apiResult.error.includes('DECODER') || apiResult.error.includes('private key')) {
        log('\n💡 提示: 私钥格式可能不正确', 'yellow');
        log('   请检查 GOOGLE_PRIVATE_KEY 是否正确配置', 'yellow');
      } else if (apiResult.error.includes('permission') || apiResult.error.includes('access')) {
        log('\n💡 提示: 服务账号可能没有访问权限', 'yellow');
        log('   请确保已将服务账号邮箱分享到 Google Sheets', 'yellow');
      }
    }
    log('\n   请检查:', 'yellow');
    log('   1. 服务账号是否正确配置', 'yellow');
    log('   2. 服务账号是否已分享到 Google Sheets', 'yellow');
    log('   3. Google Sheets API 是否已启用', 'yellow');
  }
}

main().catch(error => {
  log(`\n❌ 测试过程出错: ${error.message}`, 'red');
  process.exit(1);
});
