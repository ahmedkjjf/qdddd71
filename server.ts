import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import { spawn, spawnSync } from "child_process";
import { GoogleGenAI } from "@google/genai";
import prettier from "prettier";

async function beautifyJs(codeStr: string): Promise<string> {
  if (!codeStr || typeof codeStr !== 'string') return codeStr;
  try {
    const formatted = await prettier.format(codeStr, {
      parser: "babel",
      semi: true,
      singleQuote: true,
      trailingComma: "none",
      printWidth: 90,
      tabWidth: 2,
    });
    return formatted;
  } catch (err) {
    return codeStr;
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Global State
let botProcess: any = null;
let botStatus: 'online' | 'offline' | 'starting' | 'error' = 'offline';
let botLogs: string[] = [];
let currentToken = "";
let activeEntrypoint = "bot.js";
let keepAlive24_7 = true;
let isIntentionalStop = false;
let watchdogRestartTimer: any = null;
let rapidCrashCount = 0;
let botStartTime = 0;

const DEFAULT_BOT_CODE = `import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenAI } from '@google/genai';

// تهيئة بوت ديسكورد مع الصلاحيات المطلوبة
// تنبيه: يجب تفعيل 'Message Content Intent' في صفحة المطورين بديسكورد لقراءة محتوى الرسائل!
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// تهيئة الذكاء الاصطناعي من جوجل (تلقائي باستعمال المفتاح المتاح في الخادم)
const aiKey = process.env.GEMINI_API_KEY;
let ai = null;
if (aiKey) {
  ai = new GoogleGenAI({ apiKey: aiKey });
  console.log("🤖 تم تفعيل ميزة الذكاء الاصطناعي Gemini للبوت!");
} else {
  console.log("⚠️ تنبيه: لم يتم العثور على مفتاح GEMINI_API_KEY في الخادم.");
}

client.on('ready', () => {
  console.log(\`🟢 تم تشغيل البوت بنجاح! مسجل كـ: \${client.user?.tag}\`);
  console.log("✨ البوت جاهز لاستقبال الأوامر في السيرفرات.");
});

client.on('messageCreate', async (message) => {
  // تجاهل رسائل البوتات لتفادي التكرار اللا نهائي
  if (message.author.bot) return;

  const content = message.content.trim();

  // أمر فحص الاتصال
  if (content === '!ping') {
    return message.reply('pong! 🏓');
  }

  // أمر المساعدة
  if (content === '!help') {
    const helpMessage = \`
**🤖 أهلاً بك في البوت المستضاف!**
الأوامر المتاحة:
• \`\\!ping\` - للتحقق من سرعة الاتصال.
• \`\\!ai [سؤالك]\` - للتحدث مع ذكاء Gemini الاصطناعي.
• \`\\!help\` - لعرض هذه القائمة.
\`;
    return message.reply(helpMessage);
  }

  // أمر الذكاء الاصطناعي
  if (content.startsWith('!ai ')) {
    const prompt = content.slice(4).trim();
    if (!prompt) {
      return message.reply('الرجاء كتابة سؤال بعد الأمر. مثال: \`!ai ما هي عاصمة السعودية؟\`');
    }

    if (!ai) {
      return message.reply('عذراً، ميزة الذكاء الاصطناعي غير مفعلة حالياً في الخادم لعدم توفر مفتاح API.');
    }

    try {
      // محاكاة جاري الكتابة لتجربة مستخدم أفضل
      await message.channel.sendTyping();

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const replyText = response.text || "لم أستطع معالجة السؤال.";
      
      if (replyText.length > 2000) {
        return message.reply(replyText.slice(0, 1990) + '...');
      }

      return message.reply(replyText);
    } catch (err) {
      console.error("خطأ الذكاء الاصطناعي:", err);
      return message.reply(\`حدث خطأ أثناء الاتصال بالذكاء الاصطناعي: \${err.message}\`);
    }
  }
});

// تسجيل الدخول بالرمز الممرر من لوحة التحكم تلقائياً
client.login(process.env.DISCORD_TOKEN);
`;

let currentCode = DEFAULT_BOT_CODE;

const CONFIG_PATH = './bot_workspace/config.json';

function addLog(text: string) {
  const time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  botLogs.push(`[${time}] ${text}`);
  if (botLogs.length > 500) {
    botLogs.shift();
  }
}

// Initial setup: Load saved bot code/token if available
async function initBotWorkspace() {
  try {
    await fs.mkdir('./bot_workspace', { recursive: true });
    // Ensure package.json exists inside bot_workspace with commonjs type
    await fs.writeFile('./bot_workspace/package.json', JSON.stringify({ type: "commonjs" }, null, 2), 'utf-8');
    
    let config: any = {};
    try {
      const data = await fs.readFile(CONFIG_PATH, 'utf-8');
      config = JSON.parse(data);
    } catch (err) {}

    currentCode = config.code || DEFAULT_BOT_CODE;
    currentToken = process.env.DISCORD_TOKEN || config.token || "";
    activeEntrypoint = config.activeEntrypoint || "bot.js";
    keepAlive24_7 = config.keepAlive24_7 !== undefined ? config.keepAlive24_7 : true;

    // Auto extract token from code if token is not set
    if (!currentToken && currentCode) {
      const tokenMatch = currentCode.match(/(?:token\s*=\s*['"]([^'"]{40,})['"]|client\.login\(['"]([^'"]{40,})['"]\))/i);
      if (tokenMatch) {
        currentToken = tokenMatch[1] || tokenMatch[2];
        addLog("🔑 تم استخراج رمز البوت (Discord Token) تلقائياً من الكود المحفوظ.");
      }
    }

    // If config.json doesn't match the DISCORD_TOKEN env, save it to sync
    if (process.env.DISCORD_TOKEN && config.token !== process.env.DISCORD_TOKEN) {
      config.token = process.env.DISCORD_TOKEN;
      await fs.writeFile(CONFIG_PATH, JSON.stringify({ token: currentToken, code: currentCode, activeEntrypoint, keepAlive24_7 }, null, 2), 'utf-8');
    }

    addLog("⚙️ تم استرداد كود وإعدادات البوت السابقة بنجاح من الخادم.");

    // Auto-start bot on server boot if we have a token or valid entrypoint and keepAlive24_7 is on!
    if ((currentToken || currentCode.includes('client.login')) && keepAlive24_7) {
      addLog("⚡ [استضافة سحابية 24/7] تم رصد وضع التشغيل الدائم، جاري تشغيل البوت تلقائياً في الخلفية...");
      setTimeout(() => {
        startBotProcess();
      }, 1200);
    }
  } catch (e) {
    currentCode = DEFAULT_BOT_CODE;
    currentToken = process.env.DISCORD_TOKEN || "";
    activeEntrypoint = "bot.js";
    keepAlive24_7 = true;
    addLog("ℹ️ لا توجد تهيئة سابقة. تم تحميل القالب الافتراضي الجاهز للبوت.");
    try {
      await fs.writeFile('./bot_workspace/package.json', JSON.stringify({ type: "commonjs" }, null, 2), 'utf-8');
      await fs.writeFile('./bot_workspace/bot.js', DEFAULT_BOT_CODE, 'utf-8');
      await fs.writeFile(CONFIG_PATH, JSON.stringify({ token: currentToken, code: currentCode, activeEntrypoint, keepAlive24_7 }, null, 2), 'utf-8');
    } catch (err) {}

    if (currentToken) {
      addLog("🚀 تم اكتشاف رمز بوت، جاري تشغيل البوت تلقائياً...");
      setTimeout(() => {
        startBotProcess();
      }, 1000);
    }
  }
}

// Save current code & token to disk
async function saveBotWorkspace(token: string, code: string) {
  try {
    await fs.mkdir('./bot_workspace', { recursive: true });
    await fs.writeFile(`./bot_workspace/${activeEntrypoint}`, code, 'utf-8');
    await fs.writeFile(CONFIG_PATH, JSON.stringify({ token, code, activeEntrypoint, keepAlive24_7 }, null, 2), 'utf-8');
    currentCode = code;
    currentToken = token;
  } catch (error: any) {
    addLog(`❌ خطأ أثناء حفظ الملفات: ${error.message}`);
  }
}

// Start Bot function with 24/7 Watchdog
async function startBotProcess() {
  if (watchdogRestartTimer) {
    clearTimeout(watchdogRestartTimer);
    watchdogRestartTimer = null;
  }
  isIntentionalStop = false;

  if (botProcess) {
    addLog("🔄 جاري إيقاف البوت النشط حالياً لإعادة تشغيله...");
    botProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1200));
    botProcess = null;
  }

  // Auto-detect token from code if currentToken is empty
  if (!currentToken && currentCode) {
    const tokenMatch = currentCode.match(/(?:token\s*=\s*['"]([^'"]{40,})['"]|client\.login\(['"]([^'"]{40,})['"]\))/i);
    if (tokenMatch) {
      currentToken = tokenMatch[1] || tokenMatch[2];
      addLog("🔑 تم استخراج رمز البوت تلقائياً من داخل الكود.");
    }
  }

  if (!currentToken && !currentCode.includes('client.login')) {
    botStatus = 'error';
    addLog("❌ خطأ: رمز البوت (Discord Token) غير مدخل. يرجى إدخاله في المربع لتشغيل البوت.");
    return;
  }

  botStatus = 'starting';
  addLog("🔌 جاري تحضير ملفات البوت وتشغيل العملية السحابية...");

  try {
    await saveBotWorkspace(currentToken, currentCode);

    // If JavaScript file, perform a fast syntax check before running to prevent crash loops
    if (activeEntrypoint.endsWith('.js')) {
      const check = spawnSync('node', ['-c', `./bot_workspace/${activeEntrypoint}`], { encoding: 'utf-8' });
      if (check.status !== 0) {
        botStatus = 'error';
        const errDetail = check.stderr?.trim() || check.stdout?.trim() || 'خطأ في بنية الكود';
        addLog(`❌ [خطأ في كود البوت]: لا يمكن تشغيل البوت لوجود خطأ نحوي في الكود (Syntax Error):`);
        addLog(`[ERR] ${errDetail}`);
        addLog(`💡 يرجى مراجعة الكود في المحرر وإصلاح الخطأ ثم الضغط على 'حفظ الكود' و 'تشغيل البوت'.`);
        return;
      }
    }

    // Determine runner: Use node natively for JS (completely eliminates tsx esbuild transform issues), tsx for TS
    const isTs = activeEntrypoint.endsWith('.ts');
    const runner = isTs ? 'npx' : 'node';
    const args = isTs ? ['tsx', `./bot_workspace/${activeEntrypoint}`] : ['--experimental-detect-module', `./bot_workspace/${activeEntrypoint}`];

    botStartTime = Date.now();
    botProcess = spawn(runner, args, {
      env: {
        ...process.env,
        DISCORD_TOKEN: currentToken,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      }
    });

    botStatus = 'online';
    addLog("🚀 تم تشغيل البوت بنجاح! البوت يعمل الآن في السيرفر السحابي 24/7.");

    botProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString('utf-8').trim();
      if (output) {
        if (output.toLowerCase().includes('error') || output.includes('thrown')) {
          botStatus = 'error';
        }
        addLog(`[CON] ${output}`);
      }
    });

    botProcess.stderr.on('data', (data: Buffer) => {
      const output = data.toString('utf-8').trim();
      if (output) {
        botStatus = 'error';
        addLog(`[ERR] ${output}`);
      }
    });

    botProcess.on('close', (code: number) => {
      addLog(`💤 توقفت عملية البوت (كود الإغلاق: ${code})`);
      botStatus = 'offline';
      botProcess = null;

      const runDurationSec = (Date.now() - botStartTime) / 1000;
      if (runDurationSec < 4) {
        rapidCrashCount++;
      } else {
        rapidCrashCount = 0; // Reset if bot stayed alive
      }

      // Check for rapid crash loop (e.g. invalid Discord Token or fatal error)
      if (rapidCrashCount >= 3) {
        addLog("⚠️ [مراقب 24/7] تم إيقاف إعادة التشغيل التلقائي مؤقتاً لتجنب تكرار الانهيار فور التشغيل (غالباً بسبب توكن ديسكورد غير صالح أو انتهاء صلاحيته).");
        addLog("💡 يرجى التأكد من وضع توكن ديسكورد صالح وجديد ثم الضغط على زر 'تشغيل البوت'.");
        return;
      }

      // 24/7 Watchdog: Auto-restart if not intentionally stopped by user
      if (!isIntentionalStop && keepAlive24_7 && (currentToken || currentCode.includes('client.login'))) {
        addLog("⚡ [مراقب 24/7] تم رصد انقطاع/توقف غير مقصود للبوت. جاري إعادة التشغيل تلقائياً بعد 4 ثوانٍ لضمان استمرار البوت 24/7...");
        if (watchdogRestartTimer) clearTimeout(watchdogRestartTimer);
        watchdogRestartTimer = setTimeout(() => {
          if (!isIntentionalStop && keepAlive24_7) {
            startBotProcess();
          }
        }, 4000);
      }
    });

    botProcess.on('error', (err: Error) => {
      botStatus = 'error';
      addLog(`❌ فشل في تشغيل خادم البوت: ${err.message}`);
      botProcess = null;
    });

  } catch (err: any) {
    botStatus = 'error';
    addLog(`❌ حدث خطأ أثناء تشغيل عملية البوت: ${err.message}`);
    botProcess = null;
  }
}

// Stop Bot function
async function stopBotProcess() {
  isIntentionalStop = true;
  if (watchdogRestartTimer) {
    clearTimeout(watchdogRestartTimer);
    watchdogRestartTimer = null;
  }
  if (botProcess) {
    botProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1000));
    botProcess = null;
    botStatus = 'offline';
    addLog("🛑 تم إيقاف البوت يدوياً بواسطة المستخدم.");
  } else {
    addLog("⚠️ البوت متوقف بالفعل.");
  }
}

// API Routes
app.get("/api/bot/status", (req, res) => {
  // Mask token for security in the client, but return the full token if they need to edit it
  const maskedToken = currentToken 
    ? `${currentToken.substring(0, 8)}...${currentToken.substring(currentToken.length - 8)}` 
    : "";
    
  res.json({
    status: botStatus,
    code: currentCode,
    token: currentToken,
    maskedToken,
    logs: botLogs,
    activeEntrypoint,
    keepAlive24_7,
  });
});

app.post("/api/bot/toggle-24-7", async (req, res) => {
  const { enabled } = req.body;
  keepAlive24_7 = enabled !== undefined ? Boolean(enabled) : !keepAlive24_7;
  await saveBotWorkspace(currentToken, currentCode);
  addLog(keepAlive24_7 ? "⚡ تم تفعيل وضع الاستضافة الدائمة 24/7 (إعادة تشغيل تلقائي للبوت)." : "⏸️ تم إيقاف وضع الاستضافة الدائمة 24/7.");
  res.json({ success: true, keepAlive24_7 });
});

// File Management APIs
app.get("/api/files", async (req, res) => {
  try {
    const dirPath = './bot_workspace';
    await fs.mkdir(dirPath, { recursive: true });
    const files = await fs.readdir(dirPath);
    
    const fileList = [];
    for (const file of files) {
      if (file === 'config.json' || file === 'package.json') continue; // Hide metadata
      const filePath = path.join(dirPath, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          fileList.push({
            name: file,
            size: stat.size,
            isEntrypoint: file === activeEntrypoint,
          });
        }
      } catch (statErr) {}
    }
    res.json({ success: true, files: fileList, activeEntrypoint });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/files/content", async (req, res) => {
  const { name } = req.query;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: "اسم الملف مطلوب" });
  }
  try {
    const filePath = path.join('./bot_workspace', path.basename(name));
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ success: true, content });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/files/save", async (req, res) => {
  const { name, content } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: "اسم الملف مطلوب" });
  }
  if (name === 'package.json' || name === 'config.json') {
    return res.status(403).json({ success: false, error: "غير مسموح بتعديل ملفات النظام" });
  }
  try {
    const safeName = path.basename(name);
    const filePath = path.join('./bot_workspace', safeName);
    await fs.writeFile(filePath, content || "", 'utf-8');
    
    // If it's the active entrypoint file, we also update currentCode in memory
    if (safeName === activeEntrypoint) {
      currentCode = content || "";
    }
    
    // Update config.json
    await fs.writeFile(CONFIG_PATH, JSON.stringify({ token: currentToken, code: currentCode, activeEntrypoint }, null, 2), 'utf-8');
    
    addLog(`💾 تم حفظ تعديلات ملف "${safeName}" بنجاح.`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/files/create", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: "اسم الملف مطلوب" });
  }
  try {
    const safeName = path.basename(name);
    const filePath = path.join('./bot_workspace', safeName);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      return res.status(400).json({ success: false, error: "الملف موجود بالفعل" });
    } catch {
      // File doesn't exist, proceed
    }

    const initialContent = `// ملف جديد: ${safeName}\n// اكتب كود البوت أو الوحدات البرمجية هنا...\n`;
    await fs.writeFile(filePath, initialContent, 'utf-8');
    addLog(`📁 تم إنشاء ملف جديد باسم "${safeName}".`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/files/delete", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: "اسم الملف مطلوب" });
  }
  if (name === 'bot.js' || name === 'package.json' || name === 'config.json') {
    return res.status(400).json({ success: false, error: "لا يمكن حذف ملفات الإعداد والتشغيل المحمية" });
  }
  try {
    const safeName = path.basename(name);
    const filePath = path.join('./bot_workspace', safeName);
    await fs.unlink(filePath);
    addLog(`🗑️ تم حذف ملف "${safeName}".`);
    
    // If deleted file was the active entrypoint, reset active entrypoint to bot.js
    if (safeName === activeEntrypoint) {
      activeEntrypoint = "bot.js";
      await fs.writeFile(CONFIG_PATH, JSON.stringify({ token: currentToken, code: currentCode, activeEntrypoint: "bot.js" }, null, 2), 'utf-8');
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/files/set-entrypoint", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: "اسم الملف مطلوب" });
  }
  try {
    const safeName = path.basename(name);
    activeEntrypoint = safeName;
    
    // Read the file's content to update currentCode
    const filePath = path.join('./bot_workspace', safeName);
    const content = await fs.readFile(filePath, 'utf-8');
    currentCode = content;

    // Update config.json
    await fs.writeFile(CONFIG_PATH, JSON.stringify({ token: currentToken, code: currentCode, activeEntrypoint }, null, 2), 'utf-8');
    
    addLog(`🎯 تم تعيين ملف "${safeName}" كملف التشغيل الرئيسي للبوت.`);
    res.json({ success: true, activeEntrypoint });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/bot/save", async (req, res) => {
  const { code, token } = req.body;
  if (code !== undefined) currentCode = code;
  if (token !== undefined) currentToken = token;
  
  await saveBotWorkspace(currentToken, currentCode);
  addLog("💾 تم حفظ تعديلات كود البوت والإعدادات بنجاح.");
  res.json({ success: true, message: "تم الحفظ بنجاح" });
});

app.post("/api/bot/start", async (req, res) => {
  const { token, code } = req.body;
  if (token !== undefined) currentToken = token;
  if (code !== undefined) currentCode = code;

  // Reset crash loop counter when user explicitly clicks start
  rapidCrashCount = 0;

  // Run async but respond immediately so client doesn't hang
  startBotProcess();
  res.json({ success: true, message: "بدأت عملية التشغيل" });
});

app.post("/api/bot/stop", async (req, res) => {
  await stopBotProcess();
  res.json({ success: true, message: "تم إيقاف البوت" });
});

app.post("/api/bot/clear-logs", (req, res) => {
  botLogs = [];
  addLog("🧹 تم مسح سجل الكونسول.");
  res.json({ success: true });
});

// AI Code Feature Generator via Gemini
app.post("/api/bot/ai-generate", async (req, res) => {
  const { prompt, currentCode, fileName } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: "الوصف أو ميزة البوت مطلوبة" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: "لم يتم العثور على مفتاح GEMINI_API_KEY في النظام. تأكد من إضافته في إعدادات البيئة (Settings > Secrets)." 
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const targetFile = fileName || 'bot.js';
    const systemInstruction = `أنت مساعد ومطور ذكاء اصطناعي محترف متخصص في بناء وبوتات ديسكورد باللغة العربية بـ Node.js و discord.js v14.
تلقيت طلبًا من المستخدم لإضافة ميزة أو تعديل كود البوت.

اسم الملف الهدف: ${targetFile}

قواعد عمل حاسمة:
1. قم بدراسة الكود الحالي المرفق من قبل المستخدم واحتفظ بجميع المتغيرات، التوكن، واستدعاءات الأحداث وموجهات البوت السابقة لعدم كسر البوت.
2. أضف الميزة الجديدة المطلوبة بشكل متكامل وبدون أي نقص (كامل المنطق، الأحداث، الأزرار، القوائم أو الأوامر).
3. تأكد من إضافة كل الاستيرادات المطلوبة من discord.js أعلى الملف إذا كانت الميزة تتطلب ذلك (مثل EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, StringSelectMenuBuilder, GatewayIntentBits, PermissionsBitField, Events, إلخ).
4. استخدم لغة عربية فصيلة وأنيقة في جميع رسائل البوت مع إيموجيهات جذابة وتنسيق Embeds أنيق عند الامكان.
5. أعد النتيجة حتمًا بتنسيق JSON يحتوي على الحقول التالية فقط:
   - "code": الكود البرمجي الكامل والنهائي المعدل للكل، جاهز للنسخ والحفظ مباشرة بدون أي اقتطاع أو تعليقات توضيحية خارجية.
   - "explanation": شرح ملخص وبسيط باللغة العربية من 2-3 أسطر للميزة الجديدة وكيفية تجربة الأوامر.`;

    const userPrompt = `الكود الحالي للملف (${targetFile}):
\`\`\`javascript
${currentCode || '// لا يوجد كود حالي، أنشئ كود بوت ديسكورد كاملاً من البداية'}
\`\`\`

الميزة المطلوبة إضافتها وتطويرها في الكود:
${prompt}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text || "";
    let parsed: { code?: string; explanation?: string } = {};

    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = { code: responseText, explanation: "تم توليد وتحديث الكود بواسطة الذكاء الاصطناعي بنجاح." };
    }

    if (!parsed.code) {
      return res.status(500).json({ success: false, error: "لم يتمكن الذكاء الاصطناعي من توليد الكود المطلوبة." });
    }

    const formattedCode = await beautifyJs(parsed.code);

    addLog(`✨ قام الذكاء الاصطناعي بتوليد وتطوير ميزة جديدة في (${targetFile}): "${prompt.slice(0, 35)}..."`);
    res.json({
      success: true,
      code: formattedCode,
      explanation: parsed.explanation || "تم كتابة وتحديث الميزة في الكود بنجاح.",
    });

  } catch (error: any) {
    console.error("Gemini AI code generation error:", error);
    res.status(500).json({ success: false, error: error.message || "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي." });
  }
});

// AI Code Formatter & Beautifier
app.post("/api/bot/format-code", async (req, res) => {
  const { currentCode, fileName } = req.body;
  if (!currentCode || typeof currentCode !== 'string') {
    return res.status(400).json({ success: false, error: "الكود المراد تنسيقه غير موجود" });
  }

  try {
    const targetFile = fileName || 'bot.js';
    let formattedCode = await beautifyJs(currentCode);
    let explanation = "تم إعادة تنظيم الأقواس، الفواصل، والمسافات البادئة للأكواد كلياً بكود أسلوب نظيف أوتوماتيكياً.";

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const systemInstruction = `أنت خبير إعادة هيكلة وتنسيق أكواد Node.js و Discord.js.
تلقيت كودًا برمجياً وتحتاج لإعادة تنظيمه وتنسيقه بأسلوب أنيق ونظيف جداً.

القواعد المتبعة أثناء إعادة التنسيق:
1. ترتيب جميع الاستيرادات (imports/requires) أعلى الملف بشكل منظم.
2. إعادة ضبط المسافات البادئة (Indentation) والأقواس والفاصلة المنقوطة بشكل موحد.
3. إضافة تعليقات توضيحية جانبية باللغة العربية مقسمة بين الأقسام (مثلاً: // ───── الاستيرادات والإعدادات ─────، // ───── أحداث البوت ─────، // ───── الأوامر والأنظمة ─────).
4. الحفاظ الكامل على كافة الميزات والمنطق البرمجي والتوكنات بدون إزالة أي جزء شغّال.
5. أعد النتيجة بتنسيق JSON يحتوي على:
   - "code": الكود المنسق المرتب بالكامل.
   - "explanation": ملخص قصير باللغة العربية (سطرين) يوضح ما تم ترتيبه وتنسيقه.`;

        const userPrompt = `يرجى إعادة تنسيق وترتيب كود الملف (${targetFile}) بشكل أنيق ونظيف ومرتب:
\`\`\`javascript
${currentCode}
\`\`\``;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          }
        });

        const responseText = response.text || "";
        let parsed: { code?: string; explanation?: string } = {};

        try {
          parsed = JSON.parse(responseText);
        } catch {
          parsed = { code: responseText };
        }

        if (parsed.code) {
          formattedCode = await beautifyJs(parsed.code);
          explanation = parsed.explanation || explanation;
        }
      } catch (err) {
        console.warn("Gemini format warning, using prettier fallback:", err);
      }
    }

    addLog(`✨ تم إعادة تنسيق وترتيب كود (${targetFile}) بأسلوب أنيق بـ Prettier والذكاء الاصطناعي.`);
    res.json({
      success: true,
      code: formattedCode,
      explanation: explanation,
    });

  } catch (error: any) {
    console.error("Gemini AI code format error:", error);
    res.status(500).json({ success: false, error: error.message || "حدث خطأ أثناء تنسيق الكود." });
  }
});

// Setup workspace on startup
initBotWorkspace();

// Setup Vite Dev Middleware or Serve Production Build
async function startApp() {
  let isProduction = process.env.NODE_ENV === "production";
  
  // If not explicitly production, check if the compiled 'dist' directory exists.
  // This makes the app extremely resilient when deployed to Render/Heroku without manual env configuration!
  if (!isProduction) {
    try {
      await fs.access(path.join(process.cwd(), 'dist', 'index.html'));
      isProduction = true;
      console.log("📦 Detected production build directory. Running in Production mode automatically!");
    } catch {
      isProduction = false;
    }
  }

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Host server is running on http://localhost:${PORT}`);
  });
}

startApp().catch(err => {
  console.error("Failed to start server:", err);
});
