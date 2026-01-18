# 安装和配置指南

## 1. 安装依赖

```bash
cd phone-query-admin
npm install
```

## 2. 配置 Google Sheets API

### 步骤 1: 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google Sheets API

### 步骤 2: 创建服务账号

1. 在 Google Cloud Console 中，转到「IAM 和管理」>「服务账号」
2. 点击「创建服务账号」
3. 填写服务账号名称和描述
4. 点击「创建并继续」
5. 授予角色（可选，如果只需要读取权限）
6. 点击「完成」

### 步骤 3: 创建密钥

1. 在服务账号列表中，点击刚创建的服务账号
2. 转到「密钥」标签
3. 点击「添加密钥」>「创建新密钥」
4. 选择「JSON」格式
5. 下载 JSON 文件

### 步骤 4: 分享 Google Sheets

1. 打开你的 Google Sheets 文档
2. 点击右上角的「分享」按钮
3. 将服务账号的邮箱地址（在 JSON 文件中找到 `client_email`）添加为查看者或编辑者
4. 保存

### 步骤 5: 配置环境变量

1. 复制 `.env.local.example` 为 `.env.local`：
   ```bash
   cp .env.local.example .env.local
   ```

2. 编辑 `.env.local`，填入以下信息：
   - `GOOGLE_SHEETS_SPREADSHEET_ID`: 从 Google Sheets URL 中获取（`/d/` 和 `/edit` 之间的部分）
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: 从下载的 JSON 文件中的 `client_email`
   - `GOOGLE_PRIVATE_KEY`: 从下载的 JSON 文件中的 `private_key`（需要保留换行符）

示例：
```env
GOOGLE_SHEETS_SPREADSHEET_ID=1MP5c2rwID7gLfX7ZtxbHUYHF0JaJ8DUZcp0lklE56fk
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## 3. 运行项目

```bash
npm run dev
```

访问 http://localhost:3000

## 4. 工作表结构说明

### Sheet1 (电话查询记录)
- 列 A: phoneNumber (电话号码)
- 列 B: prefix (前缀)
- 列 C: riskLevel (风险等级)
- 列 I: userId (LINE User ID)
- 列 J: timestamp (时间戳)
- 其他列根据实际数据结构调整

### Members / Subscriptions (会员信息)
- 列 A: userId (LINE User ID)
- 列 B: LINE名称
- 列 C: 联络电话
- 列 D: plan (方案)
- 列 E: status (状态)
- 其他列根据实际数据结构调整

## 5. 功能说明

### 电话查询记录
- 查看所有电话查询记录
- 根据电话号码或 User ID 搜索
- 查看记录详情
- 风险等级标识（高/中/低）
- 会员状态显示

### 会员管理
- 查看所有会员信息
- 查看会员详情
- 方案和状态管理
- 关联查询记录

### 数据统计
- 总查询记录数
- 总会员数
- 风险等级统计
- 会员状态统计

## 故障排除

### 错误：无法访问 Google Sheets
- 检查服务账号是否已分享到 Google Sheets
- 检查环境变量是否正确配置
- 检查 Google Sheets API 是否已启用

### 错误：认证失败
- 检查 `GOOGLE_PRIVATE_KEY` 是否正确（需要包含换行符）
- 检查 `GOOGLE_SERVICE_ACCOUNT_EMAIL` 是否正确

### 数据不显示
- 检查工作表名称是否正确（Sheet1, Members / Subscriptions）
- 检查列索引是否正确
- 查看浏览器控制台的错误信息
