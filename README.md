# 电话查询系统后台管理系统

基于 n8n 电话查询系统的后台管理界面，用于管理 LINE 官方账号的电话查询记录和会员信息。

## 功能特性

- 📞 电话查询记录管理
- 👥 会员信息管理
- 🔗 User ID 与电话号码关联
- 🔍 搜索和筛选功能
- 📊 数据统计和展示

## 技术栈

- Next.js 14
- React 18
- Google Sheets API
- TypeScript
- Tailwind CSS

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Google Sheets API

#### 方法 A: 自动配置（推荐）

1. 按照 `配置指南.md` 创建 Google 服务账号并下载 JSON 密钥文件
2. 运行自动配置脚本：

```bash
# 运行脚本（会提示输入 JSON 文件路径）
npm run setup

# 或直接指定 JSON 文件路径
npm run setup ~/Downloads/your-project-xxxxx.json
```

3. 将服务账号邮箱分享到你的 Google Sheets（脚本会显示邮箱地址）

#### 方法 B: 手动配置

创建 `.env.local` 文件：

```env
GOOGLE_SHEETS_SPREADSHEET_ID=1VulDP7Kk_Uirag_ggRb042FI4n0BV7ntEkjsyWSI9V0
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

详细配置步骤请参考 `配置指南.md` 或 `快速配置.md`

### 3. 运行项目

```bash
npm run dev
```

访问 http://localhost:3000

## 📚 更多文档

- `配置指南.md` - 详细的 Google Cloud 配置步骤
- `快速配置.md` - 快速自动配置指南
- `SETUP.md` - 完整的安装和配置说明
