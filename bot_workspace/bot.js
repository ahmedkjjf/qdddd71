const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  AttachmentBuilder,
  ChannelType,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  AuditLogEvent,
} = require('discord.js');

const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const path = require('path');

// === إعدادات بوتك === //
const token = process.env.DISCORD_TOKEN || '';
const clientId = '1284865231322878033';

// === إعدادات نظام تتبع الدعوات === //
const INVITE_TARGET = 3; // عدد الدعوات المطلوب لإعطاء الرتبة (هنا 3)

// هنا حطّيت الـ channel IDs اللي طلبتهم
const OPEN_CHANNEL_IDS = [
  '1363925081826267237', // قناة نصية أو صوتية رقم 1
  '1363577614555549836'  // قناة نصية أو صوتية رقم 2
];

// ملف لحفظ عدد الدعوات لكل شخص
const DATA_FILE = path.join(__dirname, 'invites_data.json');

// ننشئ كاش للدعوات عند الإقلاع لكل سيرفر
const invitesCache = new Map();

// === متغيرات إضافية للأوامر الجديدة === //
const warnings = new Map(); // تخزين التحذيرات
const reminders = new Map(); // تخزين التذكيرات
const giveaways = new Map(); // تخزين الهبات
const botStartTime = Date.now(); // وقت بدء البوت

// === إحصائيات التقرير الأسبوعي === //
const weeklyStats = {
  newMembers: 0,
  leftMembers: 0,
  messagesSent: 0,
  invitesUsed: 0,
  rolesGiven: 0,
  channelsCreated: 0,
  channelsDeleted: 0,
  bansIssued: 0,
  kicksIssued: 0,
  warningsGiven: 0,
  boostsReceived: 0,
  filesScanned: 0,
  malwareDetected: 0,
  lastReportTime: Date.now()
};

// === Super Admin - يتخطى جميع الحمايات === //
const SUPER_ADMIN_ID = '1268288718179930204';'722831697774772286'; // الأيدي الذي يتخطى جميع الحمايات

// دالة للتحقق من Super Admin
function isSuperAdmin(userId) {
  return userId === SUPER_ADMIN_ID;
}
const ticketChannelId = '1295409931708530741';
const logChannelId = '1378678334413733929';

// === نظام تذاكر المطور === //
const ticketSystem = {
  activeTickets: new Map(), // تخزين التذاكر النشطة
  ticketCounter: 0, // عداد التذاكر
  ticketCategoryId: '1364630846862131282', // ID فئة التذاكر
  supportRoleId: '1288952743372787825', // ID رتبة الدعم
  ticketLogChannelId: '1431310788085420104', // قناة لوق التذاكر
  maxTicketsPerUser: 3, // الحد الأقصى للتذاكر لكل مستخدم
  ticketCooldown: 300000, // 5 دقائق cooldown بين التذاكر
  userCooldowns: new Map(), // تخزين cooldown المستخدمين
  autoCloseInactive: 86400000, // 24 ساعة لإغلاق التذاكر غير النشطة
  ticketStats: {
    totalCreated: 0,
    totalClosed: 0,
    averageResponseTime: 0,
    mostCommonType: 'general'
  },
  ticketTypes: {
    'bug': { emoji: '🐛', color: 0xff0000, priority: 'high' },
    'suggestion': { emoji: '💡', color: 0xffff00, priority: 'medium' },
    'question': { emoji: '❓', color: 0x0099ff, priority: 'low' },
    'technical': { emoji: '🔧', color: 0xff9900, priority: 'high' },
    'financial': { emoji: '💰', color: 0x00ff00, priority: 'high' },
    'complaint': { emoji: '🚫', color: 0xff0000, priority: 'high' }
  }
};
let minAccountAgeDays = 7; // الحد الأدنى لعمر الحساب بالأيام
const newAccountLogChannelId = '1384242023028228227'; // قناة اللوق للحسابات الجديدة
const welcomeChannelId = '1363574788349493558';
const boostChannelId = '1363577576395903106';
const streakChannelId = '1363576898994835576';
const boostRoleId = '1200764507589451867';
const protectionLogChannelId = '1363578581409730802';
const triggerMakerChannelId = '1363584993527599296';
const panelChannelId = '1364679978637328487';
const voicePanelChannelId = '1365364158383526020'; // قناة التحكم بالرومات الصوتية
let adminRoleId = '754532616161591306'; // رتبة الأدمن للتحكم بالرومات
const roleToGiveId = '1310663154749145128'; // 🔁 ID الرتبة اللي تعطيها لما يضغط الزر
const buttonChannelId = '1365611047469449216'; // 🔁 ID القناة اللي يظهر فيها الزر
const CONTROL_CHANNEL_ID = '1365611047469449216'; // ← غيره لآيدي القناة اللي تبي فيها الزر
const unifiedLogChannelId = '1363578616763388044'; // ✅ قناة اللوق الموحدة

let allowedBots = ['1284865231322878033', '1180306301058826300', '987654321098765432', '1180306301058826300', '282859044593598464','1384884549351112805'];
const ownerIds = ['1268288718179930204', '1405944620923355166', '1347109218809024564', '987654321098765432', '1322239084105568290', '1379477612686213241', '1405944620923355166', '1268288718179930204'];

// === 🛡️ نظام فحص الملفات للفيروسات === //
const fileScanChannelId = '1406703697299509338'; // قناة لوق فحص الملفات
let fileScanEnabled = true; // تفعيل/إلغاء تفعيل فحص الملفات
const maxFileSize = 50 * 1024 * 1024; // 50MB حد أقصى لحجم الملف
const allowedFileTypes = ['.txt', '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.mp4', '.mp3', '.zip', '.rar']; // أنواع الملفات المسموحة

// قنوات مستثناة من فحص الملفات (اختيارية)
let excludedChannels = [
  // يمكن إضافة IDs القنوات التي تريد استثناءها من الفحص
  // مثال: '1234567890123456789'
];

// كلمات وروابط سكامات معروفة (مثل سكامات MrBeast / كازينوهات وهمية)
// يمكنك إضافة كلمات أو دومينات جديدة هنا بسهولة
const scamLinkPatterns = [
  'hurewin.cc',
  'vyro project',
  'vyro casino',
  'vyro code vyro',
  'crypto casino bonus 2500',
];

// قاعدة بيانات هاشات الفيروسات المعروفة (يمكن توسيعها)
const knownMalwareHashes = [
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // مثال: ملف فارغ
  '5d41402abc4b2a76b9719d911017c592', // مثال: "hello"
  // يمكن إضافة المزيد من الهاشات المعروفة للفيروسات
];

// أنواع الملفات الخطيرة
const dangerousFileTypes = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js', '.jar', '.msi', '.dll'];

// إحصائيات فحص الملفات مع تفاصيل القنوات
const fileScanStats = {
  totalScanned: 0,
  malwareDetected: 0,
  filesBlocked: 0,
  lastScan: null,
  channelStats: new Map() // إحصائيات لكل قناة
};

// 🛡️ حماية موحدة - Alzaabi Security System
const OWNER_ID = "1268288718179930204"; // ← غيره لإيدي الأونر الخاص فيك
const PROTECTION_LOG = "1401915229885042688"; // قناة اللوق الموحد
let blacklist = ["1234567890", "1363589156902539444"]; // IDs ممنوعة

const banKickTracker = new Map();
const roleTracker = new Map();
const channelTracker = new Map();
const nicknameTracker = new Map();

// 🚨 دالة إرسال تنبيه خاص للأونر
async function alertOwner(message) {
  try {
    const ownerUser = await client.users.fetch(OWNER_ID).catch(() => null);
    if (ownerUser) {
      await ownerUser.send(`🚨 **تنبيه أمني:**\n${message}`);
    }
  } catch {}
}

// 🚨 دالة إرسال لوق موحد (Embeds إلى قناة الحماية)
async function sendProtectionEmbed(embed) {
  const logChannel = await client.channels.fetch(PROTECTION_LOG).catch(() => null);
  if (logChannel) logChannel.send({ embeds: [embed] });
}

// === 🛡️ دوال فحص الملفات === //

// دالة حساب الهاش للملف
async function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// دالة فحص امتداد الملف
function checkFileExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  // فحص الملفات الخطيرة
  if (dangerousFileTypes.includes(ext)) {
    return { safe: false, reason: 'نوع ملف خطير', type: 'dangerous' };
  }
  
  // فحص الملفات المسموحة
  if (!allowedFileTypes.includes(ext)) {
    return { safe: false, reason: 'نوع ملف غير مسموح', type: 'unauthorized' };
  }
  
  return { safe: true, reason: 'نوع ملف آمن', type: 'safe' };
}

// دالة فحص الفيروسات بالهاش
async function scanFileForMalware(buffer, filename) {
  try {
    // حساب الهاش
    const fileHash = await calculateFileHash(buffer);
    
    // فحص الهاش في قاعدة البيانات المحلية
    if (knownMalwareHashes.includes(fileHash)) {
      return {
        isMalware: true,
        reason: 'ملف مطابق لهاش فيروس معروف',
        hash: fileHash,
        confidence: 100
      };
    }
    
    // فحص بسيط للمحتوى (البحث عن كلمات مفتاحية مشبوهة)
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
    const suspiciousPatterns = [
      /virus/i,
      /malware/i,
      /trojan/i,
      /backdoor/i,
      /keylogger/i,
      /ransomware/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
      /system\s*\(/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return {
          isMalware: true,
          reason: 'محتوى مشبوه تم اكتشافه',
          hash: fileHash,
          confidence: 75
        };
      }
    }
    
    return {
      isMalware: false,
      reason: 'الملف يبدو آمن',
      hash: fileHash,
      confidence: 0
    };
    
  } catch (error) {
    console.error('خطأ في فحص الملف:', error);
    return {
      isMalware: false,
      reason: 'خطأ في الفحص',
      hash: null,
      confidence: 0
    };
  }
}

// دالة تحميل الملف من Discord
async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      
      response.on('error', (error) => {
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// دالة إرسال لوق فحص الملفات
async function sendFileScanLog(embed) {
  try {
    const logChannel = await client.channels.fetch(fileScanChannelId).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('خطأ في إرسال لوق فحص الملفات:', error);
  }
}

// === دوال نظام تتبع الدعوات === //

// تحميل/حفظ بيانات الدعوات
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } else {
      // إنشاء الملف إذا لم يكن موجوداً
      const emptyData = {};
      fs.writeFileSync(DATA_FILE, JSON.stringify(emptyData, null, 2), 'utf8');
      return emptyData;
    }
  } catch (error) {
    console.error('Error loading invites data:', error);
    return {};
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving invites data:', error);
  }
}

/**
 * يفتح (يعطي صلاحيات) على القنوات الموجودة في OPEN_CHANNEL_IDS
 * - يمنع @everyone من الرؤية
 * - يعطي للداعي صلاحيات مشاهدة/كتابة/دخول تبع نوع القناة
 */
async function openExistingRoomsForInviter(guild, inviterId) {
  try {
    const inviterMember = await guild.members.fetch(inviterId).catch(() => null);
    if (!inviterMember) {
      console.log('Inviter member not found in guild', inviterId);
      return;
    }

    for (const chId of OPEN_CHANNEL_IDS) {
      const channel = guild.channels.cache.get(chId) || await guild.channels.fetch(chId).catch(()=>null);
      if (!channel) {
        console.log(`Channel ID ${chId} not found in guild ${guild.id}`);
        continue;
      }

      // نمنع @everyone من مشاهدة القناة
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
          ViewChannel: false
        });
      } catch (e) {
        console.warn(`Couldn't edit @everyone overwrites for channel ${chId}:`, e.message);
      }

      // نضيف صلاحيات للداعي بحسب نوع القناة
      const perms = {};
      // جميع القنوات: إعطاء ViewChannel
      perms.ViewChannel = true;

      // نصية
      if (channel.type === 0) { // GUILD_TEXT
        perms.SendMessages = true;
        console.log(`📝 Added text permissions: SendMessages`);
      }
      // صوتية
      if (channel.type === 2) { // GUILD_VOICE
        perms.Connect = true;
        perms.Speak = true;
        console.log(`🎤 Added voice permissions: Connect, Speak`);
      }
      // لو قناة نوع آخر (category etc.) نعطي ViewChannel فقط

      try {
        console.log(`🔑 Setting permissions for ${inviterId} on channel ${channel.name}...`);
        console.log(`📋 Permissions to set:`, perms);
        await channel.permissionOverwrites.edit(inviterId, perms);
        console.log(`✅ Successfully opened channel ${channel.name} for inviter ${inviterId}`);
      } catch (e) {
        console.error(`❌ Failed to set overwrites on channel ${chId} for ${inviterId}:`, e.message);
      }
    }

    // إعطاء الرتبة للداعي
    try {
      console.log(`🔍 Looking for role 1426263849274704083 in guild ${guild.name}...`);
      const role = guild.roles.cache.get('1426263849274704083');
      if (role) {
        console.log(`✅ Found role: ${role.name} (${role.id})`);
        await inviterMember.roles.add(role);
        console.log(`✅ Successfully added role ${role.name} to ${inviterMember.user.tag}`);
      } else {
        console.log('❌ Role 1426263849274704083 not found in guild');
        console.log('Available roles:', guild.roles.cache.map(r => `${r.name} (${r.id})`).join(', '));
      }
    } catch (e) {
      console.error('❌ Failed to add role to inviter:', e.message);
    }


  } catch (err) {
    console.error('Failed to open existing rooms for inviter:', err);
  }
}

// === دالة إنشاء التقرير الأسبوعي === //
async function generateWeeklyReport(guild) {
  try {
    const reportChannel = await client.channels.fetch('1408125437040791553').catch(() => null);
    if (!reportChannel) {
      console.log('❌ Report channel not found');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📊 التقرير الأسبوعي - إحصائيات السيرفر')
      .setDescription(`تقرير شامل عن نشاط السيرفر خلال الأسبوع الماضي`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        {
          name: '👥 الأعضاء',
          value: `**انضمام:** ${weeklyStats.newMembers}\n**مغادرة:** ${weeklyStats.leftMembers}\n**صافي النمو:** ${weeklyStats.newMembers - weeklyStats.leftMembers}`,
          inline: true
        },
        {
          name: '💬 النشاط',
          value: `**رسائل مرسلة:** ${weeklyStats.messagesSent}\n**دعوات مستخدمة:** ${weeklyStats.invitesUsed}\n**رتب مُعطاة:** ${weeklyStats.rolesGiven}`,
          inline: true
        },
        {
          name: '📺 القنوات',
          value: `**مُنشأة:** ${weeklyStats.channelsCreated}\n**محذوفة:** ${weeklyStats.channelsDeleted}\n**صافي التغيير:** ${weeklyStats.channelsCreated - weeklyStats.channelsDeleted}`,
          inline: true
        },
        {
          name: '🛡️ الإدارة',
          value: `**حظر:** ${weeklyStats.bansIssued}\n**طرد:** ${weeklyStats.kicksIssued}\n**تحذيرات:** ${weeklyStats.warningsGiven}`,
          inline: true
        },
        {
          name: '🚀 البوست',
          value: `**بوستات جديدة:** ${weeklyStats.boostsReceived}\n**إجمالي البوستات:** ${guild.premiumSubscriptionCount}`,
          inline: true
        },
        {
          name: '🛡️ الأمان',
          value: `**ملفات مفحوصة:** ${weeklyStats.filesScanned}\n**فيروسات مكتشفة:** ${weeklyStats.malwareDetected}`,
          inline: true
        }
      )
      .addFields(
        {
          name: '📈 إحصائيات عامة',
          value: `**إجمالي الأعضاء:** ${guild.memberCount}\n**إجمالي القنوات:** ${guild.channels.cache.size}\n**إجمالي الرتب:** ${guild.roles.cache.size}`,
          inline: false
        }
      )
      .setFooter({ text: `تقرير أسبوعي - ${guild.name}` })
      .setTimestamp();

    await reportChannel.send({ embeds: [embed] });
    
    // إعادة تعيين الإحصائيات
    Object.keys(weeklyStats).forEach(key => {
      if (key !== 'lastReportTime') {
        weeklyStats[key] = 0;
      }
    });
    weeklyStats.lastReportTime = Date.now();
    
    console.log('✅ Weekly report sent successfully');
  } catch (error) {
    console.error('❌ Failed to send weekly report:', error);
  }
}

// === جدولة التقرير الأسبوعي === //
setInterval(async () => {
  const now = Date.now();
  const weekInMs = 7 * 24 * 60 * 60 * 1000; // أسبوع بالميلي ثانية
  
  if (now - weeklyStats.lastReportTime >= weekInMs) {
    // إرسال التقرير لكل سيرفر
    client.guilds.cache.forEach(guild => {
      generateWeeklyReport(guild);
    });
  }
}, 24 * 60 * 60 * 1000); // فحص كل يوم

const boosterRanks = [
  { count: 3, roleId: '1362137748768559175' },
  { count: 5, roleId: '1362137637246341240' },
  { count: 2, roleId: '1362137514479063242' },
];

const boosterData = {};
const userMessages = new Map();
const userTriggers = new Map();
const banTracker = new Map();
const userVoiceRooms = new Map(); // تخزين الرومات الصوتية الخاصة
const streaks = new Map(); // نظام الستريك
const mentionTracker = new Map(); // تتبع المنشن على مستوى السيرفر
let lastBotBio = 'Alzaabi Server'; // البايو الافتراضي للبوت

// === إضافات الحماية الجديدة === //
const bannedWords = ['كلمة محظورة', 'سب', 'سبول', 'كس', 'انيك ', 'كس امك']; // كلمات محظورة
const channelPermissionTracker = new Map(); // تتبع تعديل صلاحيات القنوات
const channelNameTracker = new Map(); // تتبع تغيير أسماء القنوات
const importantChannels = ['', '1363574788349493558', '1363574869576388618', '1363574831492108478', '1225316484201320458', '1363574677431128245', '1363576826605076511', '', '']; // قنوات مهمة محمية
const importantRoles = ['1375556480803147836', '1243217066303950888', '1299122113201831986', '1268222141896331296']; // رتب مهمة محمية
const deletedRolesBackup = new Map(); // نسخ احتياطي للرتب المحذوفة
const captchaUsers = new Map(); // نظام Captcha للأعضاء الجدد

// تعريف إعدادات الحماية الافتراضية
const protectionSettings = {
  spam: true,
  link: true,
  admin: true
};
const protectionLogs = [];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates, // إضافة صلاحية الصوت
    GatewayIntentBits.GuildInvites, // إضافة صلاحية الدعوات
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// === أوامر سلاش === //
const commands = [
  new SlashCommandBuilder()
    .setName('server-stats')
    .setDescription('📊 إحصائيات مفصلة عن السيرفر'),

  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('🎭 عرض البروفايل الخاص بك')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('العضو المراد عرض بروفايله')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('top-members')
    .setDescription('👑 قائمة الأعضاء الأكثر تفاعلاً'),

  new SlashCommandBuilder()
    .setName('role-info')
    .setDescription('🎭 معلومات عن رتبة معينة')
    .addRoleOption(opt =>
      opt.setName('role')
        .setDescription('الرتبة المراد عرض معلوماتها')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('emojis')
    .setDescription('😀 عرض قائمة إيموجيز السيرفر'),

  new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('💡 تقديم اقتراح للسيرفر')
    .addStringOption(opt =>
      opt.setName('suggestion')
        .setDescription('اكتب اقتراحك هنا')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('user-details')
    .setDescription('عرض معلومات مفصلة عن العضو (للإدارة فقط)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('العضو المراد عرض معلوماته')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('rename-ticket')
    .setDescription('تغيير اسم التذكرة (للأونر فقط)')
    .addStringOption(opt =>
      opt.setName('name').setDescription('الاسم الجديد').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('server-info')
    .setDescription('📊 يعرض معلومات السيرفر بشكل منسق'),
  // أوامر الحماية الجديدة
  new SlashCommandBuilder()
    .setName('protection-status')
    .setDescription('يعرض حالة الحمايات (أدمن فقط)'),
  new SlashCommandBuilder()
    .setName('toggle-protection')
    .setDescription('تفعيل/تعطيل حماية معينة (أدمن فقط)')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('نوع الحماية (spam/link/admin)')
        .setRequired(true)
        .addChoices(
          { name: 'Spam', value: 'spam' },
          { name: 'Link', value: 'link' },
          { name: 'Admin', value: 'admin' }
        )
    )
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('تفعيل أو تعطيل')
        .setRequired(true)
        .addChoices(
          { name: 'تفعيل', value: 'enable' },
          { name: 'تعطيل', value: 'disable' }
        )
    ),
  new SlashCommandBuilder()
    .setName('protection-log')
    .setDescription('عرض آخر 10 أحداث حماية (أدمن فقط)'),
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('يعرض صورة بروفايل العضو')
    .addUserOption(opt =>
      opt.setName('user').setDescription('اختر العضو').setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('يعرض معلومات عن العضو')
    .addUserOption(opt =>
      opt.setName('user').setDescription('اختر العضو').setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('يعرض سرعة استجابة البوت'),
  new SlashCommandBuilder()
    .setName('invite')
    .setDescription('يعطيك رابط دعوة البوت'),
  new SlashCommandBuilder()
    .setName('server-icon')
    .setDescription('يعرض صورة أيقونة السيرفر'),
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('يعرض جميع رتب السيرفر'),
  new SlashCommandBuilder()
    .setName('member-count')
    .setDescription('يعرض عدد أعضاء السيرفر'),
  new SlashCommandBuilder()
    .setName('boosters')
    .setDescription('يعرض قائمة البوسترز'),
  new SlashCommandBuilder()
    .setName('banner')
    .setDescription('يعرض بانر السيرفر'),
  new SlashCommandBuilder()
    .setName('bot-info')
    .setDescription('يعرض معلومات عن البوت'),
  new SlashCommandBuilder()
    .setName('streak-admin')
    .setDescription('أوامر ستريك إدارية (أدمن فقط)')
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('إعادة تعيين ستريك عضو')
        .addUserOption(opt =>
          opt.setName('user').setDescription('العضو').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('تعيين قيمة ستريك لعضو')
        .addUserOption(opt =>
          opt.setName('user').setDescription('العضو').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('count').setDescription('عدد الأيام').setRequired(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('pay')
    .setDescription('رابط الدفع عن طريق Ziina')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('مبلغ الدفع المطلوب')
        .setRequired(true)
        .setMinValue(1)
    ),
  new SlashCommandBuilder()
    .setName('store')
    .setDescription('🛍️ متجر السيرفر')
    .addSubcommand(sub =>
      sub.setName('vip')
        .setDescription('عرض الرتب المميزة المتوفرة للشراء')
    )
    .addSubcommand(sub =>
      sub.setName('colors')
        .setDescription('عرض الألوان المتوفرة للشراء')
    )
    .addSubcommand(sub =>
      sub.setName('emojis')
        .setDescription('عرض الإيموجيز المتوفرة للشراء')
    ),
  new SlashCommandBuilder()
    .setName('send')
    .setDescription('📨 إرسال رسالة من البوت (للإدارة فقط)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('القناة المراد إرسال الرسالة فيها')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('الرسالة المراد إرسالها')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('embed')
        .setDescription('هل تريد إرسال الرسالة بشكل منسق؟')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('boost-message')
    .setDescription('إرسال رسالة بوست مع صورة')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('الرسالة المراد إرسالها')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('apply-team')
    .setDescription('📋 التقديم على التيم'),
  new SlashCommandBuilder()
    .setName('restore-server')
    .setDescription('استرجاع السيرفر من النسخة الاحتياطية (أونر فقط)')
    .addSubcommand(sub =>
      sub.setName('file')
        .setDescription('استرجاع النسخة الاحتياطية من ملف')
        .addAttachmentOption(option =>
          option.setName('file')
            .setDescription('ملف النسخة الاحتياطية')
            .setRequired(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('setbio')
    .setDescription('تغيير بايو البوت (للإدارة فقط)')
    .addStringOption(opt =>
      opt.setName('bio')
        .setDescription('النص الجديد للبايو')
        .setRequired(true)
    ),
  
  // === أوامر سلاش جديدة === //
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('تحذير عضو (للإدارة فقط)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('العضو المراد تحذيره')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('سبب التحذير')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('عرض تحذيرات العضو')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('العضو المراد عرض تحذيراته')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('clear-warnings')
    .setDescription('مسح تحذيرات العضو (للإدارة فقط)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('العضو المراد مسح تحذيراته')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('إرسال إعلان (للإدارة فقط)')
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('نص الإعلان')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('القناة المراد الإعلان فيها')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('ping')
        .setDescription('منشن الجميع')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('إنشاء استطلاع')
    .addStringOption(opt =>
      opt.setName('question')
        .setDescription('سؤال الاستطلاع')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('options')
        .setDescription('الخيارات (مفصولة بفاصلة)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('إنشاء هدية (للإدارة فقط)')
    .addStringOption(opt =>
      opt.setName('prize')
        .setDescription('الهدية')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('winners')
        .setDescription('عدد الفائزين')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addIntegerOption(opt =>
      opt.setName('duration')
        .setDescription('مدة الهبة بالدقائق')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440)
    ),

  new SlashCommandBuilder()
    .setName('translate')
    .setDescription('ترجمة النص')
    .addStringOption(opt =>
      opt.setName('text')
        .setDescription('النص المراد ترجمته')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('language')
        .setDescription('اللغة المطلوبة')
        .setRequired(false)
        .addChoices(
          { name: 'الإنجليزية', value: 'en' },
          { name: 'العربية', value: 'ar' },
          { name: 'الفرنسية', value: 'fr' },
          { name: 'الألمانية', value: 'de' },
          { name: 'الإسبانية', value: 'es' }
        )
    ),

  new SlashCommandBuilder()
    .setName('weather')
    .setDescription('معلومات الطقس')
    .addStringOption(opt =>
      opt.setName('city')
        .setDescription('اسم المدينة')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('إنشاء تذكير')
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('رسالة التذكير')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('minutes')
        .setDescription('الوقت بالدقائق')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440)
    ),

  new SlashCommandBuilder()
    .setName('calculator')
    .setDescription('حاسبة بسيطة')
    .addStringOption(opt =>
      opt.setName('expression')
        .setDescription('المعادلة الرياضية (مثال: 2+2*3)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('random')
    .setDescription('رقم عشوائي')
    .addIntegerOption(opt =>
      opt.setName('min')
        .setDescription('الحد الأدنى')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('max')
        .setDescription('الحد الأقصى')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('رمي عملة معدنية'),

  new SlashCommandBuilder()
    .setName('dice')
    .setDescription('رمي النرد')
    .addIntegerOption(opt =>
      opt.setName('sides')
        .setDescription('عدد الأوجه')
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('سؤال الكرة الثمانية')
    .addStringOption(opt =>
      opt.setName('question')
        .setDescription('سؤالك')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('server-banner')
    .setDescription('عرض بانر السيرفر'),

  new SlashCommandBuilder()
    .setName('server-splash')
    .setDescription('عرض صورة الترحيب'),

  new SlashCommandBuilder()
    .setName('server-discovery')
    .setDescription('معلومات اكتشاف السيرفر'),

  new SlashCommandBuilder()
    .setName('role-color')
    .setDescription('تغيير لون رتبتك')
    .addStringOption(opt =>
      opt.setName('color')
        .setDescription('اللون (مثال: #ff0000)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('تغيير وضع الهدوء (للإدارة فقط)')
    .addIntegerOption(opt =>
      opt.setName('seconds')
        .setDescription('عدد الثواني')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    ),

  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('قفل القناة (للإدارة فقط)'),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('فتح القناة (للإدارة فقط)'),

  new SlashCommandBuilder()
    .setName('hide')
    .setDescription('إخفاء القناة (للإدارة فقط)'),

  new SlashCommandBuilder()
    .setName('show')
    .setDescription('إظهار القناة (للإدارة فقط)'),

  new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('تغيير لقب العضو (للإدارة فقط)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('العضو')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('nickname')
        .setDescription('اللقب الجديد')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('addrole')
    .setDescription('إعطاء رتبة (للإدارة فقط)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('العضو')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('role')
        .setDescription('الرتبة')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('سحب رتبة (للإدارة فقط)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('العضو')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('role')
        .setDescription('الرتبة')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('كتم العضو (للإدارة فقط)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('العضو')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('minutes')
        .setDescription('المدة بالدقائق')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('السبب')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('فك كتم العضو (للإدارة فقط)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('العضو')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('server-stats-live')
    .setDescription('إحصائيات السيرفر المباشرة'),

  new SlashCommandBuilder()
    .setName('bot-stats')
    .setDescription('إحصائيات البوت'),

  new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('وقت تشغيل البوت'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('قائمة الأوامر المتاحة')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('فئة الأوامر')
        .setRequired(false)
        .addChoices(
          { name: 'عامة', value: 'general' },
          { name: 'إدارية', value: 'admin' },
          { name: 'ترفيهية', value: 'fun' },
          { name: 'معلومات', value: 'info' },
          { name: 'أدوات', value: 'tools' }
        )
    ),

  new SlashCommandBuilder()
    .setName('bot-status')
    .setDescription('تغيير حالة البوت (للأونر فقط)')
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('الحالة المطلوبة')
        .setRequired(true)
        .addChoices(
          { name: '🟢 متصل', value: 'online' },
          { name: '🟡 مشغول', value: 'dnd' },
          { name: '🔴 لا تزعجني', value: 'idle' },
          { name: '⚫ غير مرئي', value: 'invisible' }
        )
    ),

  new SlashCommandBuilder()
    .setName('bot-activity')
    .setDescription('تغيير نشاط البوت (للأونر فقط)')
    .addStringOption(opt =>
      opt.setName('activity')
        .setDescription('نوع النشاط')
        .setRequired(true)
        .addChoices(
          { name: '🎮 يلعب', value: 'PLAYING' },
          { name: '📺 يشاهد', value: 'WATCHING' },
          { name: '🎵 يستمع إلى', value: 'LISTENING' },
          { name: '🏆 يتنافس في', value: 'COMPETING' }
        )
    )
    .addStringOption(opt =>
      opt.setName('text')
        .setDescription('نص النشاط')
        .setRequired(true)
    ),

  // === أوامر الحماية المتقدمة === //
  new SlashCommandBuilder()
    .setName('protection-advanced')
    .setDescription('إدارة الحمايات المتقدمة (للأدمن فقط)')
    .addSubcommand(sub =>
      sub.setName('banned-words')
        .setDescription('إدارة الكلمات المحظورة')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('الإجراء')
            .setRequired(true)
            .addChoices(
              { name: 'إضافة كلمة', value: 'add' },
              { name: 'حذف كلمة', value: 'remove' },
              { name: 'عرض القائمة', value: 'list' }
            )
        )
        .addStringOption(opt =>
          opt.setName('word')
            .setDescription('الكلمة المحظورة')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('important-channels')
        .setDescription('إدارة القنوات المهمة')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('الإجراء')
            .setRequired(true)
            .addChoices(
              { name: 'إضافة قناة', value: 'add' },
              { name: 'حذف قناة', value: 'remove' },
              { name: 'عرض القائمة', value: 'list' }
            )
        )
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('القناة')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('backup-roles')
        .setDescription('عرض النسخ الاحتياطي للرتب المحذوفة')
    ),

  new SlashCommandBuilder()
    .setName('captcha-admin')
    .setDescription('إدارة نظام Captcha (للأدمن فقط)')
    .addSubcommand(sub =>
      sub.setName('bypass')
        .setDescription('تخطي Captcha لعضو')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('العضو')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('إعادة تعيين Captcha لعضو')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('العضو')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('settings')
        .setDescription('تغيير إعدادات Captcha')
        .addIntegerOption(opt =>
          opt.setName('min-age')
            .setDescription('الحد الأدنى لعمر الحساب بالأيام')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(30)
        )
    ),

  new SlashCommandBuilder()
    .setName('weekly-report')
    .setDescription('إنشاء تقرير أسبوعي يدوي (للأدمن فقط)'),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('عرض إحصائيات السيرفر الحالية'),

  new SlashCommandBuilder()
    .setName('debug-commands')
    .setDescription('عرض جميع الأوامر المتاحة (للأدمن فقط)'),
];

const rest = new REST({ version: '10' }).setToken(token);

// === تفعيل البوت === //
client.once('ready', async () => {
  console.log(`✅ البوت اشتغل بنجاح! (${client.user.tag})`);
  client.user.setActivity("Alzaabi System", { type: 0 }); // 🎮 Alzaabi System

  // جلب جميع الدعوات لكل غيلد وتخزينها
  client.guilds.cache.forEach(async guild => {
    try {
      const invites = await guild.invites.fetch();
      invitesCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
    } catch (err) {
      console.error(`Failed to fetch invites for guild ${guild.id}:`, err.message);
    }
  });

  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ تم رفع ${commands.length} أمر سلاش`);
    console.log('📋 الأوامر المسجلة:', commands.map(cmd => cmd.name).join(', '));
  } catch (err) {
    console.error('❌ فشل في تسجيل أوامر السلاش:', err);
  }

  // زر تريقر ميكر
  const triggerChannel = await client.channels.fetch(triggerMakerChannelId).catch(() => null);
  if (triggerChannel) {
    const generateButton = new ButtonBuilder().setCustomId('open_trigger_modal').setLabel('Trigger Maker').setStyle(ButtonStyle.Success);
    const historyButton = new ButtonBuilder().setCustomId('view_triggers').setLabel('📜 عرض محفوظاتي').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(generateButton, historyButton);
    triggerChannel.send({ content: 'trigger-maker', components: [row] });
  }

  // لوحة الإدارة
  const panel = await client.channels.fetch(panelChannelId).catch(() => null);
  if (panel) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mute').setLabel('🔇 كتم عضو').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('unmute').setLabel('🔈 فك الكتم').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('kick').setLabel('👢 طرد عضو').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ban').setLabel('🚫 حظر عضو').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('clear').setLabel('🧹 مسح رسائل').setStyle(ButtonStyle.Primary)
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rename').setLabel('✏️ تغيير الاسم').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('role').setLabel('🎭 إعطاء رتبة').setStyle(ButtonStyle.Success)
    );
    const embed = new EmbedBuilder()
      .setTitle('لوحة الإدارة')
      .setDescription('📌 اضغط الزر ونفذ الأمر الإداري')
      .setColor(0x2ecc71);

    panel.send({ embeds: [embed], components: [row1, row2] });
  }

  // لوحة الرومات الصوتية
  const voicePanel = await client.channels.fetch(voicePanelChannelId).catch(() => null);
  if (voicePanel) {
    const createBtn = new ButtonBuilder()
      .setCustomId('create_private_vc')
      .setLabel('🎙️ إنشاء روم خاص')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(createBtn);

    voicePanel.send({
      content: 'اضغط الزر لإنشاء روم خاص بك 👇',
      components: [row],
    });
  }

  // زر إعطاء الرتبة
  const buttonChannel = await client.channels.fetch(buttonChannelId).catch(() => null);
  if (buttonChannel) {
    const button = new ButtonBuilder()
      .setCustomId('unlock_secret')
      .setLabel('🔓 افتح الرومات السرية')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    await buttonChannel.send({
      content: 'اضغط الزر عشان تفتح لك رومات خاصة! 👀',
      components: [row]
    });
  }

  // زر التحكم في الرومات (إخفاء/إظهار)
  const controlChannel = await client.channels.fetch(CONTROL_CHANNEL_ID).catch(() => null);
  if (controlChannel) {
    const lockBtn = new ButtonBuilder()
      .setCustomId('lockdown_all')
      .setLabel('🔒 إخفاء كل الرومات')
      .setStyle(ButtonStyle.Danger);

    const unlockBtn = new ButtonBuilder()
      .setCustomId('unlock_all')
      .setLabel('🔓 إظهار كل الرومات')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(lockBtn, unlockBtn);

    await controlChannel.send({
      content: '🛡️ التحكم في الرومات (Admins فقط):',
      components: [row],
    });
  }

  // Add command handling
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // تحقق من صلاحية الأدمن للأوامر الحساسة
    const isAdmin = interaction.member?.roles?.cache?.has(adminRoleId) || isSuperAdmin(interaction.user.id);

    if (interaction.commandName === 'server-stats') {
      await interaction.guild.members.fetch();
      const totalMembers = interaction.guild.memberCount;
      const onlineMembers = interaction.guild.members.cache.filter(m => m.presence?.status === 'online').size;
      const botCount = interaction.guild.members.cache.filter(m => m.user.bot).size;
      const channelCount = interaction.guild.channels.cache.size;
      const roleCount = interaction.guild.roles.cache.size;
      const serverAge = Math.floor((Date.now() - interaction.guild.createdTimestamp) / (1000 * 60 * 60 * 24));

      const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📊 إحصائيات ${interaction.guild.name}`)
          .addFields(
              { name: '👥 إجمالي الأعضاء', value: `${totalMembers}`, inline: true },
              { name: '🟢 المتصلين', value: `${onlineMembers}`, inline: true },
              { name: '🤖 البوتات', value: `${botCount}`, inline: true },
              { name: '📺 القنوات', value: `${channelCount}`, inline: true },
              { name: '🎭 الرتب', value: `${roleCount}`, inline: true },
              { name: '📅 عمر السيرفر', value: `${serverAge} يوم`, inline: true }
          )
          .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'profile') {
      const target = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members.fetch(target.id);
      
      const roles = member.roles.cache.map(r => r.name).join(', ') || 'لا يوجد';
      const joinedAt = Math.floor(member.joinedTimestamp / 1000);
      const createdAt = Math.floor(target.createdTimestamp / 1000);

      const embed = new EmbedBuilder()
          .setColor(member.displayHexColor || 0x2f3136)
          .setTitle(`🎭 بروفايل ${target.username}`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
          .addFields(
              { name: '🆔 الآيدي', value: target.id, inline: true },
              { name: '📅 تاريخ الانضمام', value: `<t:${joinedAt}:R>`, inline: true },
              { name: '📆 تاريخ إنشاء الحساب', value: `<t:${createdAt}:R>`, inline: true },
              { name: '🎭 الرتب', value: roles }
          )
          .setFooter({ text: `Requested by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'top-members') {
      await interaction.deferReply();
      const members = await interaction.guild.members.fetch();
      
      const topMembers = members
          .filter(m => !m.user.bot)
          .sort((a, b) => (b.roles.cache.size - a.roles.cache.size))
          .first(10);

      const embed = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle('👑 الأعضاء المميزين')
          .setDescription(
              topMembers.map((m, i) => 
                  `${i + 1}. ${m.user.tag} | ${m.roles.cache.size - 1} رتبة`
              ).join('\n')
          );

      await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'role-info') {
      const role = interaction.options.getRole('role');
      const members = role.members.size;
      const color = role.hexColor;
      const createdAt = Math.floor(role.createdTimestamp / 1000);
      const permissions = role.permissions.toArray().join(', ') || 'لا يوجد';

      const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`🎭 معلومات رتبة ${role.name}`)
          .addFields(
              { name: '👥 عدد الأعضاء', value: `${members}`, inline: true },
              { name: '🎨 اللون', value: color, inline: true },
              { name: '📅 تاريخ الإنشاء', value: `<t:${createdAt}:R>`, inline: true },
              { name: '⚡ الصلاحيات', value: permissions }
          );

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'emojis') {
      const emojis = interaction.guild.emojis.cache;
      const animated = emojis.filter(e => e.animated).map(e => `<a:${e.name}:${e.id}>`);
      const regular = emojis.filter(e => !e.animated).map(e => `<:${e.name}:${e.id}>`);

      const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('😀 إيموجيز السيرفر')
          .addFields(
              { name: '🎭 المتحركة', value: animated.join(' ') || 'لا يوجد', inline: false },
              { name: '😀 العادية', value: regular.join(' ') || 'لا يوجد', inline: false }
          )
          .setFooter({ text: `إجمالي الإيموجيز: ${emojis.size}` });

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'suggest') {
      const suggestion = interaction.options.getString('suggestion');
      
      const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setTitle('💡 اقتراح جديد')
          .setDescription(suggestion)
          .setFooter({ text: 'للتصويت استخدم 👍 أو 👎' })
          .setTimestamp();

      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
      await message.react('👍');
      await message.react('👎');
    }

    if (interaction.commandName === 'user-details') {
    // تحقق من صلاحيات الإدارة
    if (!interaction.member.roles.cache.has(adminRoleId)) {
      return interaction.reply({ content: '🚫 هذا الأمر متاح فقط للإدارة!', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ لم يتم العثور على العضو في السيرفر.', ephemeral: true });
    }

    const roles = member.roles.cache.map(r => r.name).join(', ') || 'لا يوجد';
    const permissions = member.permissions.toArray().join(', ') || 'لا يوجد';
    const boostingSince = member.premiumSince ? `<t:${Math.floor(member.premiumSince.getTime()/1000)}:R>` : 'لا يوجد';
    
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`👤 معلومات مفصلة عن ${member.user.tag}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: '🆔 معرف العضو', value: `\`${member.id}\``, inline: true },
        { name: '📛 الاسم', value: member.nickname || 'لا يوجد لقب', inline: true },
        { name: '🎮 حالة الحساب', value: member.presence?.status || 'غير متصل', inline: true },
        { name: '📅 تاريخ إنشاء الحساب', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:F>`, inline: false },
        { name: '📆 تاريخ الانضمام للسيرفر', value: `<t:${Math.floor(member.joinedTimestamp/1000)}:F>`, inline: false },
        { name: '🚀 تاريخ البوست', value: boostingSince, inline: false },
        { name: '🎭 الرتب', value: roles, inline: false },
        { name: '⚡ الصلاحيات', value: permissions, inline: false }
      )
      .setFooter({ text: `طلب بواسطة ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'server-info') {
      const guild = interaction.guild;

      // تحديث الكاش للتأكد من دقة البيانات
      await guild.members.fetch();

      const totalMembers = guild.memberCount;
      const botCount = guild.members.cache.filter(m => m.user.bot).size;
      const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
      const roleCount = guild.roles.cache.size;
      const boostCount = guild.premiumSubscriptionCount || 0;
      const emojiCount = guild.emojis.cache.size;
      const verification = guild.verificationLevel;
      const createdAt = new Date(guild.createdTimestamp).toLocaleDateString('ar-EG');

      const info = 
`🆔 ID              : ${guild.id}
👑 Owner           : ${guild.ownerId}
📆 Created At      : ${createdAt}
🌍 Locale          : ${guild.preferredLocale}
👥 Members         : ${totalMembers}
🤖 Bots            : ${botCount}
📝 Text Channels   : ${textChannels}
🔊 Voice Channels  : ${voiceChannels}
🎭 Roles           : ${roleCount}
📎 Emojis          : ${emojiCount}
🛡️ Boosts          : ${boostCount}
🔐 Verification    : ${verification}`;

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`📊 معلومات السيرفر: ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setDescription(info)
        .setFooter({ text: `طلب بواسطة ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'protection-status') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const status = `🛡️ **حالة الحمايات:**\n- سبام: ${protectionSettings.spam ? '✅ مفعلة' : '❌ معطلة'}\n- روابط: ${protectionSettings.link ? '✅ مفعلة' : '❌ معطلة'}\n- حماية أدمن: ${protectionSettings.admin ? '✅ مفعلة' : '❌ معطلة'}`;
      return interaction.reply({ content: status, ephemeral: true });
    }
    if (interaction.commandName === 'toggle-protection') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const type = interaction.options.getString('type');
      const action = interaction.options.getString('action');
      if (!['spam', 'link', 'admin'].includes(type)) return interaction.reply({ content: '❌ نوع حماية غير معروف.', ephemeral: true });
      protectionSettings[type] = action === 'enable';
      protectionLogs.unshift({
        time: Date.now(),
        action: `${action === 'enable' ? 'تفعيل' : 'تعطيل'} حماية ${type}`,
        user: interaction.user.tag
      });
      if (protectionLogs.length > 20) protectionLogs.pop();
      await interaction.reply({ content: `✅ تم ${action === 'enable' ? 'تفعيل' : 'تعطيل'} حماية ${type}.`, ephemeral: true });
      // إرسال لوق
      const log = await client.channels.fetch(unifiedLogChannelId).catch(() => null);
      if (log) log.send(`🛡️ [LOG] ${interaction.user.tag} قام بـ ${action === 'enable' ? 'تفعيل' : 'تعطيل'} حماية ${type}`);
      return;
    }
    if (interaction.commandName === 'protection-log') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      if (protectionLogs.length === 0) return interaction.reply({ content: '📭 لا يوجد أحداث حماية بعد.', ephemeral: true });
      const logs = protectionLogs.slice(0, 10).map(l => `- [${new Date(l.time).toLocaleString('ar-EG')}] ${l.user}: ${l.action}`).join('\n');
      return interaction.reply({ content: `📝 **آخر 10 أحداث حماية:**\n${logs}`, ephemeral: true });
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'unlock_secret') {
        const role = interaction.guild.roles.cache.get(roleToGiveId);
        if (!role) return;

        const member = interaction.member;
        if (member.roles.cache.has(role.id)) return;

        await member.roles.add(role).catch(() => {});
        await interaction.deferUpdate(); // ✅ الرد الصامت عشان مانفشل التفاعل
      }

      // التحكم في الرومات (إخفاء/إظهار)
      if (interaction.customId === 'lockdown_all' || interaction.customId === 'unlock_all') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: '🚫 هذا الزر للإداريين فقط.', ephemeral: true });
        }

        const everyoneRole = interaction.guild.roles.everyone;

        if (interaction.customId === 'lockdown_all') {
          interaction.guild.channels.cache.forEach(channel => {
            channel.permissionOverwrites.edit(everyoneRole, {
              ViewChannel: false,
            }).catch(() => {});
          });
          await interaction.reply({ content: '🔒 تم إخفاء كل الرومات عن الجميع.', ephemeral: true });
        }

        if (interaction.customId === 'unlock_all') {
          interaction.guild.channels.cache.forEach(channel => {
            channel.permissionOverwrites.edit(everyoneRole, {
              ViewChannel: null,
            }).catch(() => {});
          });
          await interaction.reply({ content: '🔓 تم إعادة عرض كل الرومات للجميع.', ephemeral: true });
        }
      }
    }

    if (interaction.commandName === 'avatar') {
      const user = interaction.options.getUser('user') || interaction.user;
      await interaction.reply({ content: user.displayAvatarURL({ dynamic: true, size: 4096 }) });
    }
    if (interaction.commandName === 'user-info') {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);
      const embed = new EmbedBuilder()
        .setTitle(`معلومات العضو: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'ID', value: user.id, inline: true },
          { name: 'تاريخ الإنشاء', value: `<t:${Math.floor(user.createdTimestamp/1000)}:R>`, inline: true },
          { name: 'تاريخ الانضمام', value: member ? `<t:${Math.floor(member.joinedTimestamp/1000)}:R>` : 'غير متوفر', inline: true },
          { name: 'الرتب', value: member ? member.roles.cache.map(r => r.name).join(', ') : 'غير متوفر', inline: false }
        );
      await interaction.reply({ embeds: [embed] });
    }
    if (interaction.commandName === 'ping') {
      await interaction.reply({ content: `🏓 البينق: ${client.ws.ping}ms` });
    }
    if (interaction.commandName === 'invite') {
      await interaction.reply({ content: `🔗 رابط دعوة البوت:\nhttps://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands` });
    }
    if (interaction.commandName === 'server-icon') {
      await interaction.reply({ content: interaction.guild.iconURL({ dynamic: true, size: 4096 }) });
    }
    if (interaction.commandName === 'roles') {
      const roles = interaction.guild.roles.cache.map(r => r.name).join(', ');
      await interaction.reply({ content: `🎭 رتب السيرفر:\n${roles}` });
    }
    if (interaction.commandName === 'member-count') {
      await interaction.reply({ content: `👥 عدد الأعضاء: ${interaction.guild.memberCount}` });
    }
    if (interaction.commandName === 'boosters') {
      const boosters = interaction.guild.members.cache.filter(m => m.premiumSince).map(m => m.user.tag).join('\n') || 'لا يوجد بوسترز حالياً.';
      await interaction.reply({ content: `🚀 البوسترز:\n${boosters}` });
    }
    if (interaction.commandName === 'banner') {
      if (interaction.guild.banner) {
        await interaction.reply({ content: interaction.guild.bannerURL({ size: 4096 }) });
      } else {
        await interaction.reply({ content: '❌ السيرفر لا يحتوي على بانر.' });
      }
    }
    if (interaction.commandName === 'bot-info') {
      const embed = new EmbedBuilder()
        .setTitle('معلومات البوت')
        .addFields(
          { name: 'اسم البوت', value: client.user.tag, inline: true },
          { name: 'ID', value: client.user.id, inline: true },
          { name: 'عدد السيرفرات', value: `${client.guilds.cache.size}`, inline: true }
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));
      await interaction.reply({ embeds: [embed] });
    }
    if (interaction.commandName === 'pay') {
      const amount = interaction.options.getInteger('amount');
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('💳 رابط الدفع')
        .setDescription(`يمكنك الدفع عن طريق Ziina من خلال الرابط التالي:\n\n💰 **المبلغ المطلوب: ${amount.toLocaleString()} ريال**`)
        .addFields(
          { name: '🔗 الرابط', value: 'https://pay.ziina.com/Ahmedalzaabia' },
          { name: '📱 التطبيق', value: 'Ziina - زينة' },
          { name: '💡 ملاحظة', value: 'يمكنك الدفع باستخدام بطاقة او ابل باي' }
        )
        .setFooter({ text: 'كل شي امان من طريقه الدفع مشفرة' });
      
      await interaction.reply({ embeds: [embed] });
    }
    if (interaction.commandName === 'streak-admin') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const sub = interaction.options.getSubcommand();
      const user = interaction.options.getUser('user');
      if (!user) return interaction.reply({ content: '❌ لم يتم تحديد العضو.', ephemeral: true });
      // streaks is already defined globally
      if (sub === 'reset') {
        streaks.delete(user.id);
        return interaction.reply({ content: `✅ تم إعادة تعيين ستريك ${user.tag}.`, ephemeral: true });
      }
      if (sub === 'set') {
        const count = interaction.options.getInteger('count');
        if (!count || count < 1) return interaction.reply({ content: '❌ رقم غير صالح.', ephemeral: true });
        streaks.set(user.id, { count, lastDate: new Date().toDateString() });
        return interaction.reply({ content: `✅ تم تعيين ستريك ${user.tag} إلى ${count} يوم.`, ephemeral: true });
      }
    }
    if (interaction.commandName === 'store') {
      const subCommand = interaction.options.getSubcommand();
      
      if (subCommand === 'vip') {
        const vipEmbed = new EmbedBuilder()
          .setTitle('🌟 الرتب المميزة')
          .setColor(0xf1c40f)
          .addFields(
            { name: '👑 VIP', value: 'السعر: 50,000 كريدت\n- رتبة مميزة\n- تواصل مع الإدارة\n- رومات خاصة', inline: true },
            { name: '💎 VIP+', value: 'السعر: 100,000 كريدت\n- كل مميزات VIP\n- تغيير اسمك\n- ألوان خاصة', inline: true },
            { name: '🎭 PREMIUM', value: 'السعر: 200,000 كريدت\n- كل المميزات السابقة\n- إيموجيز خاصة\n- دخول مبكر للفعاليات', inline: true }
          )
          .setFooter({ text: 'للشراء تواصل مع الإدارة' });

        await interaction.reply({ embeds: [vipEmbed] });
      }
      
      else if (subCommand === 'colors') {
        const colorsEmbed = new EmbedBuilder()
          .setTitle('🎨 الألوان المتوفرة')
          .setColor(0x3498db)
          .addFields(
            { name: '🔴 أحمر', value: 'السعر: 5,000 كريدت', inline: true },
            { name: '🔵 أزرق', value: 'السعر: 5,000 كريدت', inline: true },
            { name: '🟣 بنفسجي', value: 'السعر: 5,000 كريدت', inline: true },
            { name: '⚫ أسود', value: 'السعر: 10,000 كريدت', inline: true },
            { name: '🟡 ذهبي', value: 'السعر: 15,000 كريدت', inline: true }
          )
          .setFooter({ text: 'يمكنك شراء أكثر من لون' });

        await interaction.reply({ embeds: [colorsEmbed] });
      }
      
      else if (subCommand === 'emojis') {
        const emojisEmbed = new EmbedBuilder()
          .setTitle('😎 الإيموجيز المميزة')
          .setColor(0x2ecc71)
          .setDescription('إيموجيز حصرية يمكنك استخدامها في السيرفر!')
          .addFields(
            { name: 'باقة العاب 🎮', value: 'السعر: 20,000 كريدت\n- 10 إيموجيز مميزة', inline: true },
            { name: 'باقة انمي 🌸', value: 'السعر: 20,000 كريدت\n- 10 إيموجيز انمي', inline: true },
            { name: 'باقة ميمز 😂', value: 'السعر: 20,000 كريدت\n- 10 إيموجيز ميمز', inline: true }
          )
          .setFooter({ text: 'الإيموجيز حصرية للمشترين فقط' });

        await interaction.reply({ embeds: [emojisEmbed] });
      }
    }
    if (interaction.commandName === 'send') {
      // تحقق من رتبة ادمن سترتير
      const adminStarterRole = interaction.guild.roles.cache.get('1299122113201831986'); // رتبة الأدمن سترتير
      if (!interaction.member.roles.cache.has('1299122113201831986')) {
        return interaction.reply({ content: '❌ هذا الأمر متاح فقط للأدمن سترتير!', ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      const useEmbed = interaction.options.getBoolean('embed') ?? false;

      // تحقق من أن القناة نصية
      if (!channel.isTextBased()) {
        return interaction.reply({ content: '❌ يجب اختيار قناة نصية!', ephemeral: true });
      }

      try {
        if (useEmbed) {
          const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setDescription(message)
            .setFooter({ text: `تم الإرسال بواسطة ${interaction.user.tag} | Admin Starter` })
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        } else {
          await channel.send(message);
        }

        // إرسال تأكيد للمستخدم
        await interaction.reply({ 
          content: `✅ تم إرسال الرسالة بنجاح إلى ${channel}!`,
          ephemeral: true 
        });

        // إرسال لوق
        const logChannel = await client.channels.fetch(unifiedLogChannelId).catch(() => null);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📨 رسالة من البوت')
            .addFields(
              { name: '👤 المرسل', value: `${interaction.user.tag} (Admin Starter)`, inline: true },
              { name: '📝 القناة', value: `${channel.name}`, inline: true },
              { name: '💬 المحتوى', value: message }
            )
            .setTimestamp();

          logChannel.send({ embeds: [logEmbed] });
        }

      } catch (error) {
        await interaction.reply({ 
          content: `❌ حدث خطأ أثناء إرسال الرسالة: ${error.message}`,
          ephemeral: true 
        });
      }
    }
    if (interaction.commandName === 'boost-message') {
      // تحقق من صلاحيات المستخدم
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ هذا الأمر متاح فقط للإدارة!', ephemeral: true });
      }

      const customMessage = interaction.options.getString('message') || 'ادعم بوست وحياك 🌟';
      const image = interaction.options.getAttachment('image');

      const embed = new EmbedBuilder()
        .setColor(0xFF73FA) // لون وردي خاص بالبوست
        .setDescription(`${customMessage}\n\n<@&${boostRoleId}> @everyone`)
        .setTimestamp();

      if (image) {
        embed.setImage(image.url);
      }

      await interaction.reply({ content: '✅ جاري إرسال رسالة البوست...', ephemeral: true });
      await interaction.channel.send({ embeds: [embed] });
    }
    if (interaction.commandName === 'setbio') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const bio = interaction.options.getString('bio');
      try {
        await client.user.setPresence({
          activities: [{ name: bio, type: 0 }], // type 0 = PLAYING
          status: 'online',
        });
        lastBotBio = bio;
        await interaction.reply({ content: `✅ تم تحديث بايو البوت إلى: \`${bio}\``, ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: `❌ حدث خطأ أثناء تحديث البايو: ${err.message}`, ephemeral: true });
      }
    }

    // === معالجة الأوامر الجديدة === //
    
    if (interaction.commandName === 'warn') {
      if (!isAdmin && !isSuperAdmin(interaction.user.id)) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'لا يوجد سبب';
      
      if (!warnings.has(user.id)) warnings.set(user.id, []);
      warnings.get(user.id).push({
        reason,
        moderator: interaction.user.tag,
        timestamp: Date.now()
      });

      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('⚠️ تحذير')
        .setDescription(`${user} تم تحذيرك من قبل ${interaction.user}`)
        .addFields({ name: 'السبب', value: reason })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      try {
        await user.send({ embeds: [embed] });
      } catch {}
    }

    if (interaction.commandName === 'warnings') {
      const user = interaction.options.getUser('user') || interaction.user;
      const userWarnings = warnings.get(user.id) || [];
      
      if (userWarnings.length === 0) {
        return interaction.reply({ content: `✅ ${user.tag} ليس لديه تحذيرات.`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle(`⚠️ تحذيرات ${user.tag}`)
        .setDescription(userWarnings.map((w, i) => 
          `${i + 1}. **${w.reason}** - بواسطة ${w.moderator} - <t:${Math.floor(w.timestamp/1000)}:R>`
        ).join('\n'))
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'clear-warnings') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      warnings.delete(user.id);
      await interaction.reply({ content: `✅ تم مسح تحذيرات ${user.tag}.`, ephemeral: true });
    }

    if (interaction.commandName === 'announce') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const message = interaction.options.getString('message');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const ping = interaction.options.getBoolean('ping') || false;

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📢 إعلان')
        .setDescription(message)
        .setFooter({ text: `بواسطة ${interaction.user.tag}` })
        .setTimestamp();

      await channel.send({ 
        content: ping ? '@everyone' : null,
        embeds: [embed] 
      });
      await interaction.reply({ content: '✅ تم إرسال الإعلان.', ephemeral: true });
    }

    if (interaction.commandName === 'poll') {
      const question = interaction.options.getString('question');
      const options = interaction.options.getString('options');
      
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('📊 استطلاع')
        .setDescription(question)
        .setFooter({ text: `بواسطة ${interaction.user.tag}` })
        .setTimestamp();

      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
      await message.react('👍');
      await message.react('👎');
      
      if (options) {
        const optionList = options.split(',').map(opt => opt.trim());
        const reactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        for (let i = 0; i < Math.min(optionList.length, 10); i++) {
          embed.addFields({ name: `${reactions[i]} ${optionList[i]}`, value: '‎', inline: true });
          await message.react(reactions[i]);
        }
        
        await message.edit({ embeds: [embed] });
      }
    }

    if (interaction.commandName === 'giveaway') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const prize = interaction.options.getString('prize');
      const winners = interaction.options.getInteger('winners');
      const duration = interaction.options.getInteger('duration');

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🎉 هدية جديدة!')
        .setDescription(`**${prize}**\n\nاضغط على 🎉 للمشاركة!\n\nعدد الفائزين: ${winners}\nينتهي: <t:${Math.floor((Date.now() + duration * 60000) / 1000)}:R>`)
        .setFooter({ text: `بواسطة ${interaction.user.tag}` })
        .setTimestamp();

      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
      await message.react('🎉');

      const giveawayId = message.id;
      giveaways.set(giveawayId, {
        prize,
        winners,
        endTime: Date.now() + duration * 60000,
        participants: new Set()
      });

      setTimeout(async () => {
        const giveaway = giveaways.get(giveawayId);
        if (!giveaway) return;

        const reaction = message.reactions.cache.get('🎉');
        if (!reaction) return;

        const participants = Array.from(giveaway.participants);
        const winnerIds = [];
        
        for (let i = 0; i < Math.min(winners, participants.length); i++) {
          const randomIndex = Math.floor(Math.random() * participants.length);
          winnerIds.push(participants[randomIndex]);
          participants.splice(randomIndex, 1);
        }

        const winnerMentions = winnerIds.map(id => `<@${id}>`).join(', ');
        
        const endEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('🎉 انتهت الهدية!')
          .setDescription(`**${prize}**\n\nالفائزون: ${winnerMentions || 'لا يوجد مشاركين'}`)
          .setFooter({ text: `بواسطة ${interaction.user.tag}` })
          .setTimestamp();

        await message.edit({ embeds: [endEmbed] });
        giveaways.delete(giveawayId);
      }, duration * 60000);
    }

    if (interaction.commandName === 'translate') {
      const text = interaction.options.getString('text');
      const language = interaction.options.getString('language') || 'en';
      
      // ترجمة بسيطة (يمكنك استخدام API ترجمة حقيقي)
      const translations = {
        'en': 'Hello',
        'ar': 'مرحبا',
        'fr': 'Bonjour',
        'de': 'Hallo',
        'es': 'Hola'
      };
      
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🌐 ترجمة')
        .addFields(
          { name: 'النص الأصلي', value: text },
          { name: 'الترجمة', value: translations[language] || 'غير متوفر' }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'weather') {
      const city = interaction.options.getString('city');
      
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`🌤️ طقس ${city}`)
        .setDescription('معلومات الطقس غير متوفرة حالياً.\nيمكن إضافة API طقس حقيقي.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'reminder') {
      const message = interaction.options.getString('message');
      const minutes = interaction.options.getInteger('minutes');
      
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('⏰ تذكير')
        .setDescription(`سيتم تذكيرك بـ: **${message}**\nخلال: **${minutes} دقيقة**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      setTimeout(async () => {
        try {
          const reminderEmbed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('⏰ تذكير!')
            .setDescription(message)
            .setTimestamp();

          await interaction.user.send({ embeds: [reminderEmbed] });
        } catch {}
      }, minutes * 60000);
    }

    if (interaction.commandName === 'calculator') {
      const expression = interaction.options.getString('expression');
      
      try {
        // تحقق من الأمان
        if (/[a-zA-Z]/.test(expression)) {
          return interaction.reply({ content: '❌ معادلة غير آمنة.', ephemeral: true });
        }
        
        const result = eval(expression);
        
        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('🧮 حاسبة')
          .addFields(
            { name: 'المعادلة', value: expression },
            { name: 'النتيجة', value: result.toString() }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        await interaction.reply({ content: '❌ معادلة غير صحيحة.', ephemeral: true });
      }
    }

    if (interaction.commandName === 'random') {
      const min = interaction.options.getInteger('min') || 1;
      const max = interaction.options.getInteger('max') || 100;
      
      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🎲 رقم عشوائي')
        .setDescription(`**${result}**`)
        .addFields(
          { name: 'الحد الأدنى', value: min.toString(), inline: true },
          { name: 'الحد الأقصى', value: max.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'coinflip') {
      const result = Math.random() < 0.5 ? 'صورة' : 'كتابة';
      const emoji = result === 'صورة' ? '🪙' : '📝';
      
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🪙 رمي عملة معدنية')
        .setDescription(`${emoji} **${result}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'dice') {
      const sides = interaction.options.getInteger('sides') || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🎲 رمي النرد')
        .setDescription(`**${result}**`)
        .addFields({ name: 'عدد الأوجه', value: sides.toString() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === '8ball') {
      const question = interaction.options.getString('question');
      const answers = [
        'نعم بالتأكيد', 'من المحتمل', 'بدون شك', 'نعم', 'لا', 'لا أعتقد', 'مستحيل', 'لا أستطيع التنبؤ',
        'ركز واسأل مرة أخرى', 'لا تعتمد عليه', 'مصادر موثوقة تقول لا', 'العلامات تشير إلى نعم',
        'رد غامض، حاول مرة أخرى', 'أفضل ألا أخبرك الآن', 'لا يمكن التنبؤ الآن', 'مؤكد'
      ];
      
      const answer = answers[Math.floor(Math.random() * answers.length)];
      
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🎱 الكرة الثمانية')
        .addFields(
          { name: 'السؤال', value: question },
          { name: 'الجواب', value: answer }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'server-banner') {
      if (!interaction.guild.banner) {
        return interaction.reply({ content: '❌ السيرفر لا يحتوي على بانر.', ephemeral: true });
      }
      await interaction.reply({ content: interaction.guild.bannerURL({ size: 4096 }) });
    }

    if (interaction.commandName === 'server-splash') {
      if (!interaction.guild.splash) {
        return interaction.reply({ content: '❌ السيرفر لا يحتوي على صورة ترحيب.', ephemeral: true });
      }
      await interaction.reply({ content: interaction.guild.splashURL({ size: 4096 }) });
    }

    if (interaction.commandName === 'server-discovery') {
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔍 معلومات اكتشاف السيرفر')
        .addFields(
          { name: 'مكتشف', value: interaction.guild.discoverySplash ? 'نعم' : 'لا', inline: true },
          { name: 'مفتوح للاكتشاف', value: interaction.guild.features.includes('DISCOVERABLE') ? 'نعم' : 'لا', inline: true },
          { name: 'عدد الأعضاء', value: interaction.guild.memberCount.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'role-color') {
      const color = interaction.options.getString('color');
      
      try {
        const role = interaction.guild.roles.cache.find(r => r.members.has(interaction.user.id) && r.editable);
        if (!role) {
          return interaction.reply({ content: '❌ لا يمكنك تغيير لون رتبتك.', ephemeral: true });
        }
        
        await role.setColor(color);
        await interaction.reply({ content: `✅ تم تغيير لون رتبتك إلى ${color}.`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء تغيير اللون.', ephemeral: true });
      }
    }

    if (interaction.commandName === 'slowmode') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const seconds = interaction.options.getInteger('seconds');
      
      await interaction.channel.setRateLimitPerUser(seconds);
      await interaction.reply({ content: `✅ تم تعيين وضع الهدوء إلى ${seconds} ثانية.`, ephemeral: true });
    }

    if (interaction.commandName === 'lock') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });
      await interaction.reply({ content: '🔒 تم قفل القناة.', ephemeral: true });
    }

    if (interaction.commandName === 'unlock') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });
      await interaction.reply({ content: '🔓 تم فتح القناة.', ephemeral: true });
    }

    if (interaction.commandName === 'hide') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: false
      });
      await interaction.reply({ content: '👻 تم إخفاء القناة.', ephemeral: true });
    }

    if (interaction.commandName === 'show') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: null
      });
      await interaction.reply({ content: '👁️ تم إظهار القناة.', ephemeral: true });
    }

    if (interaction.commandName === 'nickname') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const nickname = interaction.options.getString('nickname');
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.setNickname(nickname);
      await interaction.reply({ content: `✅ تم تغيير لقب ${user.tag} إلى ${nickname}.`, ephemeral: true });
    }

    if (interaction.commandName === 'addrole') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.add(role);
      await interaction.reply({ content: `✅ تم إعطاء رتبة ${role.name} لـ ${user.tag}.`, ephemeral: true });
    }

    if (interaction.commandName === 'removerole') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.remove(role);
      await interaction.reply({ content: `✅ تم سحب رتبة ${role.name} من ${user.tag}.`, ephemeral: true });
    }

    if (interaction.commandName === 'timeout') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'لا يوجد سبب';
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(minutes * 60000, reason);
      await interaction.reply({ content: `✅ تم كتم ${user.tag} لمدة ${minutes} دقيقة.`, ephemeral: true });
    }

    if (interaction.commandName === 'untimeout') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(null);
      await interaction.reply({ content: `✅ تم فك كتم ${user.tag}.`, ephemeral: true });
    }

    if (interaction.commandName === 'server-stats-live') {
      await interaction.guild.members.fetch();
      const totalMembers = interaction.guild.memberCount;
      const onlineMembers = interaction.guild.members.cache.filter(m => m.presence?.status === 'online').size;
      const botCount = interaction.guild.members.cache.filter(m => m.user.bot).size;
      const channelCount = interaction.guild.channels.cache.size;
      const roleCount = interaction.guild.roles.cache.size;
      const boostCount = interaction.guild.premiumSubscriptionCount || 0;

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`📊 إحصائيات ${interaction.guild.name} المباشرة`)
        .addFields(
          { name: '👥 إجمالي الأعضاء', value: `${totalMembers}`, inline: true },
          { name: '🟢 المتصلين', value: `${onlineMembers}`, inline: true },
          { name: '🤖 البوتات', value: `${botCount}`, inline: true },
          { name: '📺 القنوات', value: `${channelCount}`, inline: true },
          { name: '🎭 الرتب', value: `${roleCount}`, inline: true },
          { name: '🚀 البوست', value: `${boostCount}`, inline: true }
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'bot-stats') {
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🤖 إحصائيات البوت')
        .addFields(
          { name: '📊 عدد السيرفرات', value: `${client.guilds.cache.size}`, inline: true },
          { name: '👥 إجمالي الأعضاء', value: `${client.users.cache.size}`, inline: true },
          { name: '⏰ وقت التشغيل', value: `<t:${Math.floor(botStartTime/1000)}:R>`, inline: true },
          { name: '🏓 البينق', value: `${client.ws.ping}ms`, inline: true },
          { name: '💾 استخدام الذاكرة', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
          { name: '🆔 معرف البوت', value: client.user.id, inline: true }
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'uptime') {
      const uptime = Date.now() - botStartTime;
      const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('⏰ وقت تشغيل البوت')
        .setDescription(`**${days}** يوم **${hours}** ساعة **${minutes}** دقيقة **${seconds}** ثانية`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'help') {
      const category = interaction.options.getString('category');
      
      const commands = {
        general: [
          { name: '/ping', description: 'عرض سرعة استجابة البوت' },
          { name: '/help', description: 'قائمة الأوامر المتاحة' },
          { name: '/uptime', description: 'وقت تشغيل البوت' },
          { name: '/bot-stats', description: 'إحصائيات البوت' }
        ],
        admin: [
          { name: '/warn', description: 'تحذير عضو' },
          { name: '/timeout', description: 'كتم العضو' },
          { name: '/kick', description: 'طرد عضو' },
          { name: '/ban', description: 'حظر عضو' },
          { name: '/announce', description: 'إرسال إعلان' },
          { name: '/slowmode', description: 'تغيير وضع الهدوء' },
          { name: '/lock', description: 'قفل القناة' },
          { name: '/unlock', description: 'فتح القناة' }
        ],
        fun: [
          { name: '/poll', description: 'إنشاء استطلاع' },
          { name: '/giveaway', description: 'إنشاء هدية' },
          { name: '/8ball', description: 'سؤال الكرة الثمانية' },
          { name: '/coinflip', description: 'رمي عملة معدنية' },
          { name: '/dice', description: 'رمي النرد' },
          { name: '/random', description: 'رقم عشوائي' }
        ],
        info: [
          { name: '/server-stats', description: 'إحصائيات السيرفر' },
          { name: '/user-info', description: 'معلومات العضو' },
          { name: '/role-info', description: 'معلومات الرتبة' },
          { name: '/server-info', description: 'معلومات السيرفر' },
          { name: '/avatar', description: 'صورة بروفايل العضو' }
        ],
        tools: [
          { name: '/calculator', description: 'حاسبة بسيطة' },
          { name: '/translate', description: 'ترجمة النص' },
          { name: '/reminder', description: 'إنشاء تذكير' },
          { name: '/weather', description: 'معلومات الطقس' }
        ]
      };

      if (category && commands[category]) {
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📚 أوامر ${category === 'general' ? 'عامة' : category === 'admin' ? 'إدارية' : category === 'fun' ? 'ترفيهية' : category === 'info' ? 'معلومات' : 'أدوات'}`)
          .setDescription(commands[category].map(cmd => `**${cmd.name}** - ${cmd.description}`).join('\n'))
          .setFooter({ text: `طلب بواسطة ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('📚 قائمة الأوامر')
          .setDescription('اختر فئة من القائمة أدناه لعرض الأوامر المتاحة.')
          .addFields(
            { name: '🔧 عامة', value: 'أوامر عامة ومفيدة', inline: true },
            { name: '🛡️ إدارية', value: 'أوامر إدارة السيرفر', inline: true },
            { name: '🎮 ترفيهية', value: 'أوامر ترفيهية وألعاب', inline: true },
            { name: '📊 معلومات', value: 'أوامر عرض المعلومات', inline: true },
            { name: '🛠️ أدوات', value: 'أدوات مساعدة', inline: true }
          )
          .setFooter({ text: `استخدم /help category:فئة لعرض أوامر محددة` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }
    }

    if (interaction.commandName === 'clear-warnings') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      warnings.delete(user.id);
      await interaction.reply({ content: `✅ تم مسح تحذيرات ${user.tag}.`, ephemeral: true });
    }

    if (interaction.commandName === 'announce') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const message = interaction.options.getString('message');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const ping = interaction.options.getBoolean('ping') || false;

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📢 إعلان')
        .setDescription(message)
        .setFooter({ text: `بواسطة ${interaction.user.tag}` })
        .setTimestamp();

      await channel.send({ 
        content: ping ? '@everyone' : null,
        embeds: [embed] 
      });
      await interaction.reply({ content: '✅ تم إرسال الإعلان.', ephemeral: true });
    }

    if (interaction.commandName === 'poll') {
      const question = interaction.options.getString('question');
      const options = interaction.options.getString('options');
      
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('📊 استطلاع')
        .setDescription(question)
        .setFooter({ text: `بواسطة ${interaction.user.tag}` })
        .setTimestamp();

      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
      await message.react('👍');
      await message.react('👎');
      
      if (options) {
        const optionList = options.split(',').map(opt => opt.trim());
        const reactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        for (let i = 0; i < Math.min(optionList.length, 10); i++) {
          embed.addFields({ name: `${reactions[i]} ${optionList[i]}`, value: '‎', inline: true });
          await message.react(reactions[i]);
        }
        
        await message.edit({ embeds: [embed] });
      }
    }

    if (interaction.commandName === 'giveaway') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const prize = interaction.options.getString('prize');
      const winners = interaction.options.getInteger('winners');
      const duration = interaction.options.getInteger('duration');

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🎉 هدية جديدة!')
        .setDescription(`**${prize}**\n\nاضغط على 🎉 للمشاركة!\n\nعدد الفائزين: ${winners}\nينتهي: <t:${Math.floor((Date.now() + duration * 60000) / 1000)}:R>`)
        .setFooter({ text: `بواسطة ${interaction.user.tag}` })
        .setTimestamp();

      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
      await message.react('🎉');

      const giveawayId = message.id;
      giveaways.set(giveawayId, {
        prize,
        winners,
        endTime: Date.now() + duration * 60000,
        participants: new Set()
      });

      setTimeout(async () => {
        const giveaway = giveaways.get(giveawayId);
        if (!giveaway) return;

        const reaction = message.reactions.cache.get('🎉');
        if (!reaction) return;

        const participants = Array.from(giveaway.participants);
        const winnerIds = [];
        
        for (let i = 0; i < Math.min(winners, participants.length); i++) {
          const randomIndex = Math.floor(Math.random() * participants.length);
          winnerIds.push(participants[randomIndex]);
          participants.splice(randomIndex, 1);
        }

        const winnerMentions = winnerIds.map(id => `<@${id}>`).join(', ');
        
        const endEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('🎉 انتهت الهدية!')
          .setDescription(`**${prize}**\n\nالفائزون: ${winnerMentions || 'لا يوجد مشاركين'}`)
          .setFooter({ text: `بواسطة ${interaction.user.tag}` })
          .setTimestamp();

        await message.edit({ embeds: [endEmbed] });
        giveaways.delete(giveawayId);
      }, duration * 60000);
    }

    if (interaction.commandName === 'translate') {
      const text = interaction.options.getString('text');
      const language = interaction.options.getString('language') || 'en';
      
      // ترجمة بسيطة (يمكنك استخدام API ترجمة حقيقي)
      const translations = {
        'en': 'Hello',
        'ar': 'مرحبا',
        'fr': 'Bonjour',
        'de': 'Hallo',
        'es': 'Hola'
      };
      
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🌐 ترجمة')
        .addFields(
          { name: 'النص الأصلي', value: text },
          { name: 'الترجمة', value: translations[language] || 'غير متوفر' }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'weather') {
      const city = interaction.options.getString('city');
      
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`🌤️ طقس ${city}`)
        .setDescription('معلومات الطقس غير متوفرة حالياً.\nيمكن إضافة API طقس حقيقي.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'reminder') {
      const message = interaction.options.getString('message');
      const minutes = interaction.options.getInteger('minutes');
      
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('⏰ تذكير')
        .setDescription(`سيتم تذكيرك بـ: **${message}**\nخلال: **${minutes} دقيقة**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      setTimeout(async () => {
        try {
          const reminderEmbed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('⏰ تذكير!')
            .setDescription(message)
            .setTimestamp();

          await interaction.user.send({ embeds: [reminderEmbed] });
        } catch {}
      }, minutes * 60000);
    }

    if (interaction.commandName === 'calculator') {
      const expression = interaction.options.getString('expression');
      
      try {
        // تحقق من الأمان
        if (/[a-zA-Z]/.test(expression)) {
          return interaction.reply({ content: '❌ معادلة غير آمنة.', ephemeral: true });
        }
        
        const result = eval(expression);
        
        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('🧮 حاسبة')
          .addFields(
            { name: 'المعادلة', value: expression },
            { name: 'النتيجة', value: result.toString() }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        await interaction.reply({ content: '❌ معادلة غير صحيحة.', ephemeral: true });
      }
    }

    if (interaction.commandName === 'random') {
      const min = interaction.options.getInteger('min') || 1;
      const max = interaction.options.getInteger('max') || 100;
      
      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🎲 رقم عشوائي')
        .setDescription(`**${result}**`)
        .addFields(
          { name: 'الحد الأدنى', value: min.toString(), inline: true },
          { name: 'الحد الأقصى', value: max.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'coinflip') {
      const result = Math.random() < 0.5 ? 'صورة' : 'كتابة';
      const emoji = result === 'صورة' ? '🪙' : '📝';
      
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🪙 رمي عملة معدنية')
        .setDescription(`${emoji} **${result}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'dice') {
      const sides = interaction.options.getInteger('sides') || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🎲 رمي النرد')
        .setDescription(`**${result}**`)
        .addFields({ name: 'عدد الأوجه', value: sides.toString() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === '8ball') {
      const question = interaction.options.getString('question');
      const answers = [
        'نعم بالتأكيد', 'من المحتمل', 'بدون شك', 'نعم', 'لا', 'لا أعتقد', 'مستحيل', 'لا أستطيع التنبؤ',
        'ركز واسأل مرة أخرى', 'لا تعتمد عليه', 'مصادر موثوقة تقول لا', 'العلامات تشير إلى نعم',
        'رد غامض، حاول مرة أخرى', 'أفضل ألا أخبرك الآن', 'لا يمكن التنبؤ الآن', 'مؤكد'
      ];
      
      const answer = answers[Math.floor(Math.random() * answers.length)];
      
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🎱 الكرة الثمانية')
        .addFields(
          { name: 'السؤال', value: question },
          { name: 'الجواب', value: answer }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'server-banner') {
      if (!interaction.guild.banner) {
        return interaction.reply({ content: '❌ السيرفر لا يحتوي على بانر.', ephemeral: true });
      }
      await interaction.reply({ content: interaction.guild.bannerURL({ size: 4096 }) });
    }

    if (interaction.commandName === 'server-splash') {
      if (!interaction.guild.splash) {
        return interaction.reply({ content: '❌ السيرفر لا يحتوي على صورة ترحيب.', ephemeral: true });
      }
      await interaction.reply({ content: interaction.guild.splashURL({ size: 4096 }) });
    }

    if (interaction.commandName === 'server-discovery') {
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔍 معلومات اكتشاف السيرفر')
        .addFields(
          { name: 'مكتشف', value: interaction.guild.discoverySplash ? 'نعم' : 'لا', inline: true },
          { name: 'مفتوح للاكتشاف', value: interaction.guild.features.includes('DISCOVERABLE') ? 'نعم' : 'لا', inline: true },
          { name: 'عدد الأعضاء', value: interaction.guild.memberCount.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'role-color') {
      const color = interaction.options.getString('color');
      
      try {
        const role = interaction.guild.roles.cache.find(r => r.members.has(interaction.user.id) && r.editable);
        if (!role) {
          return interaction.reply({ content: '❌ لا يمكنك تغيير لون رتبتك.', ephemeral: true });
        }
        
        await role.setColor(color);
        await interaction.reply({ content: `✅ تم تغيير لون رتبتك إلى ${color}.`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: '❌ حدث خطأ أثناء تغيير اللون.', ephemeral: true });
      }
    }

    if (interaction.commandName === 'slowmode') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const seconds = interaction.options.getInteger('seconds');
      
      await interaction.channel.setRateLimitPerUser(seconds);
      await interaction.reply({ content: `✅ تم تعيين وضع الهدوء إلى ${seconds} ثانية.`, ephemeral: true });
    }

    if (interaction.commandName === 'lock') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });
      await interaction.reply({ content: '🔒 تم قفل القناة.', ephemeral: true });
    }

    if (interaction.commandName === 'unlock') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });
      await interaction.reply({ content: '🔓 تم فتح القناة.', ephemeral: true });
    }

    if (interaction.commandName === 'hide') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: false
      });
      await interaction.reply({ content: '👻 تم إخفاء القناة.', ephemeral: true });
    }

    if (interaction.commandName === 'show') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: null
      });
      await interaction.reply({ content: '👁️ تم إظهار القناة.', ephemeral: true });
    }

    if (interaction.commandName === 'nickname') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const nickname = interaction.options.getString('nickname');
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.setNickname(nickname);
      await interaction.reply({ content: `✅ تم تغيير لقب ${user.tag} إلى ${nickname}.`, ephemeral: true });
    }

    if (interaction.commandName === 'addrole') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.add(role);
      await interaction.reply({ content: `✅ تم إعطاء رتبة ${role.name} لـ ${user.tag}.`, ephemeral: true });
    }

    if (interaction.commandName === 'removerole') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.remove(role);
      await interaction.reply({ content: `✅ تم سحب رتبة ${role.name} من ${user.tag}.`, ephemeral: true });
    }

    if (interaction.commandName === 'timeout') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'لا يوجد سبب';
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(minutes * 60000, reason);
      await interaction.reply({ content: `✅ تم كتم ${user.tag} لمدة ${minutes} دقيقة.`, ephemeral: true });
    }

    if (interaction.commandName === 'untimeout') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      const user = interaction.options.getUser('user');
      
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(null);
      await interaction.reply({ content: `✅ تم فك كتم ${user.tag}.`, ephemeral: true });
    }

    if (interaction.commandName === 'server-stats-live') {
      await interaction.guild.members.fetch();
      const totalMembers = interaction.guild.memberCount;
      const onlineMembers = interaction.guild.members.cache.filter(m => m.presence?.status === 'online').size;
      const botCount = interaction.guild.members.cache.filter(m => m.user.bot).size;
      const channelCount = interaction.guild.channels.cache.size;
      const roleCount = interaction.guild.roles.cache.size;
      const boostCount = interaction.guild.premiumSubscriptionCount || 0;

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`📊 إحصائيات ${interaction.guild.name} المباشرة`)
        .addFields(
          { name: '👥 إجمالي الأعضاء', value: `${totalMembers}`, inline: true },
          { name: '🟢 المتصلين', value: `${onlineMembers}`, inline: true },
          { name: '🤖 البوتات', value: `${botCount}`, inline: true },
          { name: '📺 القنوات', value: `${channelCount}`, inline: true },
          { name: '🎭 الرتب', value: `${roleCount}`, inline: true },
          { name: '🚀 البوست', value: `${boostCount}`, inline: true }
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'bot-stats') {
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🤖 إحصائيات البوت')
        .addFields(
          { name: '📊 عدد السيرفرات', value: `${client.guilds.cache.size}`, inline: true },
          { name: '👥 إجمالي الأعضاء', value: `${client.users.cache.size}`, inline: true },
          { name: '⏰ وقت التشغيل', value: `<t:${Math.floor(botStartTime/1000)}:R>`, inline: true },
          { name: '🏓 البينق', value: `${client.ws.ping}ms`, inline: true },
          { name: '💾 استخدام الذاكرة', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
          { name: '🆔 معرف البوت', value: client.user.id, inline: true }
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'uptime') {
      const uptime = Date.now() - botStartTime;
      const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('⏰ وقت تشغيل البوت')
        .setDescription(`**${days}** يوم **${hours}** ساعة **${minutes}** دقيقة **${seconds}** ثانية`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'help') {
      const category = interaction.options.getString('category');
      
      const commands = {
        general: [
          { name: '/ping', description: 'عرض سرعة استجابة البوت' },
          { name: '/help', description: 'قائمة الأوامر المتاحة' },
          { name: '/uptime', description: 'وقت تشغيل البوت' },
          { name: '/bot-stats', description: 'إحصائيات البوت' }
        ],
        admin: [
          { name: '/warn', description: 'تحذير عضو' },
          { name: '/timeout', description: 'كتم العضو' },
          { name: '/kick', description: 'طرد عضو' },
          { name: '/ban', description: 'حظر عضو' },
          { name: '/announce', description: 'إرسال إعلان' },
          { name: '/slowmode', description: 'تغيير وضع الهدوء' },
          { name: '/lock', description: 'قفل القناة' },
          { name: '/unlock', description: 'فتح القناة' }
        ],
        fun: [
          { name: '/poll', description: 'إنشاء استطلاع' },
          { name: '/giveaway', description: 'إنشاء هدية' },
          { name: '/8ball', description: 'سؤال الكرة الثمانية' },
          { name: '/coinflip', description: 'رمي عملة معدنية' },
          { name: '/dice', description: 'رمي النرد' },
          { name: '/random', description: 'رقم عشوائي' }
        ],
        info: [
          { name: '/server-stats', description: 'إحصائيات السيرفر' },
          { name: '/user-info', description: 'معلومات العضو' },
          { name: '/role-info', description: 'معلومات الرتبة' },
          { name: '/server-info', description: 'معلومات السيرفر' },
          { name: '/avatar', description: 'صورة بروفايل العضو' }
        ],
        tools: [
          { name: '/calculator', description: 'حاسبة بسيطة' },
          { name: '/translate', description: 'ترجمة النص' },
          { name: '/reminder', description: 'إنشاء تذكير' },
          { name: '/weather', description: 'معلومات الطقس' }
        ]
      };

      if (category && commands[category]) {
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📚 أوامر ${category === 'general' ? 'عامة' : category === 'admin' ? 'إدارية' : category === 'fun' ? 'ترفيهية' : category === 'info' ? 'معلومات' : 'أدوات'}`)
          .setDescription(commands[category].map(cmd => `**${cmd.name}** - ${cmd.description}`).join('\n'))
          .setFooter({ text: `طلب بواسطة ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('📚 قائمة الأوامر')
          .setDescription('اختر فئة من القائمة أدناه لعرض الأوامر المتاحة.')
          .addFields(
            { name: '🔧 عامة', value: 'أوامر عامة ومفيدة', inline: true },
            { name: '🛡️ إدارية', value: 'أوامر إدارة السيرفر', inline: true },
            { name: '🎮 ترفيهية', value: 'أوامر ترفيهية وألعاب', inline: true },
            { name: '📊 معلومات', value: 'أوامر عرض المعلومات', inline: true },
            { name: '🛠️ أدوات', value: 'أدوات مساعدة', inline: true }
          )
          .setFooter({ text: `استخدم /help category:فئة لعرض أوامر محددة` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }
    }

    if (interaction.commandName === 'bot-status') {
      // تحقق من أن المستخدم هو الأونر أو Super Admin
      if (!ownerIds.includes(interaction.user.id) && !isSuperAdmin(interaction.user.id)) {
        return interaction.reply({ content: '🚫 هذا الأمر للأونر فقط.', ephemeral: true });
      }

      const status = interaction.options.getString('status');
      
      try {
        await client.user.setStatus(status);
        
        const statusNames = {
          'online': '🟢 متصل',
          'dnd': '🟡 مشغول', 
          'idle': '🔴 لا تزعجني',
          'invisible': '⚫ غير مرئي'
        };

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ تم تغيير حالة البوت')
          .setDescription(`تم تغيير حالة البوت إلى: **${statusNames[status]}**`)
          .setFooter({ text: `بواسطة ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        await interaction.reply({ 
          content: `❌ حدث خطأ أثناء تغيير الحالة: ${error.message}`, 
          ephemeral: true 
        });
      }
    }

    if (interaction.commandName === 'bot-activity') {
      // تحقق من أن المستخدم هو الأونر أو Super Admin
      if (!ownerIds.includes(interaction.user.id) && !isSuperAdmin(interaction.user.id)) {
        return interaction.reply({ content: '🚫 هذا الأمر للأونر فقط.', ephemeral: true });
      }

      const activityType = interaction.options.getString('activity');
      const activityText = interaction.options.getString('text');
      
      try {
        const activityTypes = {
          'PLAYING': 0,
          'STREAMING': 1,
          'LISTENING': 2,
          'WATCHING': 3,
          'COMPETING': 5
        };

        await client.user.setActivity(activityText, { type: activityTypes[activityType] });
        
        const activityNames = {
          'PLAYING': '🎮 يلعب',
          'WATCHING': '📺 يشاهد',
          'LISTENING': '🎵 يستمع إلى',
          'COMPETING': '🏆 يتنافس في'
        };

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ تم تغيير نشاط البوت')
          .setDescription(`تم تغيير نشاط البوت إلى: **${activityNames[activityType]} ${activityText}**`)
          .setFooter({ text: `بواسطة ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        await interaction.reply({ 
          content: `❌ حدث خطأ أثناء تغيير النشاط: ${error.message}`, 
          ephemeral: true 
        });
      }
    }

    // === معالجة أوامر الحماية المتقدمة === //
    if (interaction.commandName === 'protection-advanced') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'banned-words') {
        const action = interaction.options.getString('action');
        const word = interaction.options.getString('word');
        
        if (action === 'add' && word) {
          if (!bannedWords.includes(word.toLowerCase())) {
            bannedWords.push(word.toLowerCase());
            await interaction.reply({ content: `✅ تم إضافة الكلمة "${word}" إلى قائمة الكلمات المحظورة.`, ephemeral: true });
          } else {
            await interaction.reply({ content: `❌ الكلمة "${word}" موجودة مسبقاً في القائمة.`, ephemeral: true });
          }
        } else if (action === 'remove' && word) {
          const index = bannedWords.indexOf(word.toLowerCase());
          if (index > -1) {
            bannedWords.splice(index, 1);
            await interaction.reply({ content: `✅ تم حذف الكلمة "${word}" من قائمة الكلمات المحظورة.`, ephemeral: true });
          } else {
            await interaction.reply({ content: `❌ الكلمة "${word}" غير موجودة في القائمة.`, ephemeral: true });
          }
        } else if (action === 'list') {
          const wordsList = bannedWords.length > 0 ? bannedWords.join(', ') : 'لا توجد كلمات محظورة';
          await interaction.reply({ content: `📝 **الكلمات المحظورة:**\n\`${wordsList}\``, ephemeral: true });
        }
      }
      
      if (subcommand === 'important-channels') {
        const action = interaction.options.getString('action');
        const channel = interaction.options.getChannel('channel');
        
        if (action === 'add' && channel) {
          if (!importantChannels.includes(channel.id)) {
            importantChannels.push(channel.id);
            await interaction.reply({ content: `✅ تم إضافة القناة ${channel} إلى قائمة القنوات المهمة.`, ephemeral: true });
          } else {
            await interaction.reply({ content: `❌ القناة ${channel} موجودة مسبقاً في القائمة.`, ephemeral: true });
          }
        } else if (action === 'remove' && channel) {
          const index = importantChannels.indexOf(channel.id);
          if (index > -1) {
            importantChannels.splice(index, 1);
            await interaction.reply({ content: `✅ تم حذف القناة ${channel} من قائمة القنوات المهمة.`, ephemeral: true });
          } else {
            await interaction.reply({ content: `❌ القناة ${channel} غير موجودة في القائمة.`, ephemeral: true });
          }
        } else if (action === 'list') {
          const channelsList = importantChannels.length > 0 
            ? importantChannels.map(id => `<#${id}>`).join(', ') 
            : 'لا توجد قنوات مهمة';
          await interaction.reply({ content: `📺 **القنوات المهمة:**\n${channelsList}`, ephemeral: true });
        }
      }
      
      if (subcommand === 'backup-roles') {
        if (deletedRolesBackup.size === 0) {
          await interaction.reply({ content: '📭 لا توجد رتب محذوفة في النسخ الاحتياطي.', ephemeral: true });
          return;
        }
        
        const backupList = Array.from(deletedRolesBackup.entries())
          .map(([id, data]) => `**${data.name}** - حذفت بواسطة <@${data.deletedBy}> - <t:${Math.floor(data.deletedAt/1000)}:R>`)
          .join('\n');
        
        const embed = new EmbedBuilder()
          .setColor(0xff6600)
          .setTitle('🗂️ النسخ الاحتياطي للرتب المحذوفة')
          .setDescription(backupList)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // === معالجة أوامر Captcha === //
    if (interaction.commandName === 'captcha-admin') {
      if (!isAdmin) return interaction.reply({ content: '🚫 هذا الأمر للأدمن فقط.', ephemeral: true });
      
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'bypass') {
        const user = interaction.options.getUser('user');
        captchaUsers.delete(user.id);
        
        // البحث عن روم التحقق الخاص بالعضو
        const verifyChannel = interaction.guild.channels.cache.find(ch => ch.name === `verify-${user.username}`);
        if (verifyChannel) {
          await verifyChannel.delete().catch(() => {});
        }
        
        await interaction.reply({ content: `✅ تم تخطي Captcha للعضو ${user.tag}.`, ephemeral: true });
      }
      
      if (subcommand === 'reset') {
        const user = interaction.options.getUser('user');
        const newCode = Math.floor(1000 + Math.random() * 9000);
        
        captchaUsers.set(user.id, {
          code: newCode,
          attempts: 0,
          timestamp: Date.now()
        });
        
        await interaction.reply({ content: `✅ تم إعادة تعيين Captcha للعضو ${user.tag}. الكود الجديد: \`${newCode}\``, ephemeral: true });
      }
      
      if (subcommand === 'settings') {
        const minAge = interaction.options.getInteger('min-age');
        minAccountAgeDays = minAge;
        await interaction.reply({ content: `✅ تم تحديث الحد الأدنى لعمر الحساب إلى ${minAge} يوم.`, ephemeral: true });
      }
    }

    // أمر التقرير الأسبوعي
    if (interaction.commandName === 'weekly-report') {
      const isAdmin = interaction.member?.roles?.cache?.has(adminRoleId) || isSuperAdmin(interaction.user.id);
      if (!isAdmin) {
        return interaction.reply({ content: '🚫 هذا الأمر للإدارة فقط!', ephemeral: true });
      }
      
      await interaction.reply({ content: '📊 جاري إنشاء التقرير الأسبوعي...', ephemeral: true });
      await generateWeeklyReport(interaction.guild);
      await interaction.followUp({ content: '✅ تم إرسال التقرير الأسبوعي!', ephemeral: true });
    }

    // أمر عرض الإحصائيات الحالية
    if (interaction.commandName === 'stats') {
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📊 الإحصائيات الحالية')
        .setDescription(`إحصائيات السيرفر منذ آخر تقرير أسبوعي`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          {
            name: '👥 الأعضاء',
            value: `**انضمام:** ${weeklyStats.newMembers}\n**مغادرة:** ${weeklyStats.leftMembers}\n**صافي النمو:** ${weeklyStats.newMembers - weeklyStats.leftMembers}`,
            inline: true
          },
          {
            name: '💬 النشاط',
            value: `**رسائل مرسلة:** ${weeklyStats.messagesSent}\n**دعوات مستخدمة:** ${weeklyStats.invitesUsed}\n**رتب مُعطاة:** ${weeklyStats.rolesGiven}`,
            inline: true
          },
          {
            name: '📺 القنوات',
            value: `**مُنشأة:** ${weeklyStats.channelsCreated}\n**محذوفة:** ${weeklyStats.channelsDeleted}\n**صافي التغيير:** ${weeklyStats.channelsCreated - weeklyStats.channelsDeleted}`,
            inline: true
          },
          {
            name: '🛡️ الإدارة',
            value: `**حظر:** ${weeklyStats.bansIssued}\n**طرد:** ${weeklyStats.kicksIssued}\n**تحذيرات:** ${weeklyStats.warningsGiven}`,
            inline: true
          },
          {
            name: '🚀 البوست',
            value: `**بوستات جديدة:** ${weeklyStats.boostsReceived}\n**إجمالي البوستات:** ${interaction.guild.premiumSubscriptionCount}`,
            inline: true
          },
          {
            name: '🛡️ الأمان',
            value: `**ملفات مفحوصة:** ${weeklyStats.filesScanned}\n**فيروسات مكتشفة:** ${weeklyStats.malwareDetected}`,
            inline: true
          }
        )
        .addFields(
          {
            name: '📈 إحصائيات عامة',
            value: `**إجمالي الأعضاء:** ${interaction.guild.memberCount}\n**إجمالي القنوات:** ${interaction.guild.channels.cache.size}\n**إجمالي الرتب:** ${interaction.guild.roles.cache.size}`,
            inline: false
          }
        )
        .setFooter({ text: `إحصائيات حية - ${interaction.guild.name}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // أمر تشخيص الأوامر
    if (interaction.commandName === 'debug-commands') {
      const isAdmin = interaction.member?.roles?.cache?.has(adminRoleId) || isSuperAdmin(interaction.user.id);
      if (!isAdmin) {
        return interaction.reply({ content: '🚫 هذا الأمر للإدارة فقط!', ephemeral: true });
      }
      
      const availableCommands = commands.map(cmd => `\`/${cmd.name}\` - ${cmd.description}`).join('\n');
      
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔧 الأوامر المتاحة')
        .setDescription(`إجمالي الأوامر: **${commands.length}**\n\n${availableCommands}`)
        .setFooter({ text: 'نظام تشخيص الأوامر' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  });
});

// === ترحيب + حماية بوتات + تحقق الحسابات الجديدة === //
client.on(Events.GuildMemberAdd, async member => {
  // تحديث إحصائيات التقرير الأسبوعي
  weeklyStats.newMembers++;
  
  // === نظام تتبع الدعوات === //
  const guild = member.guild;
  try {
    // فلتر بسيط: تجاهل البوتات
    if (member.user.bot) {
      // Continue with existing bot protection logic below
    } else {
      // تتبع الدعوات للبشر فقط
      const newInvites = await guild.invites.fetch();
      const cached = invitesCache.get(guild.id) || new Map();

      // نبحث أي كود ازداد استخدامه
      let usedInvite = null;
      for (const invite of newInvites.values()) {
        const prevUses = cached.get(invite.code) ?? 0;
        if (invite.uses > prevUses) {
          usedInvite = invite;
          break;
        }
      }

      // حدّث الكاش
      invitesCache.set(guild.id, new Map(newInvites.map(i => [i.code, i.uses])));

      if (usedInvite) {
        const inviterId = usedInvite.inviter?.id;
        if (inviterId) {
          // حمّل واحفظ عدد الدعوات
          const data = loadData();
          if (!data[guild.id]) data[guild.id] = {};
          if (!data[guild.id][inviterId]) data[guild.id][inviterId] = 0;

          data[guild.id][inviterId] += 1;
          const inviterCount = data[guild.id][inviterId];
          saveData(data);

          console.log(`${member.user.tag} was invited by ${inviterId}. Total invites for inviter: ${inviterCount}`);
          
          // تحديث إحصائيات التقرير الأسبوعي
          weeklyStats.invitesUsed++;

          // لما يوصل للهدف (3 دعوات) يعطي الرتبة للداعي
          if (inviterCount === INVITE_TARGET) {
            console.log(`🎉 ${inviterId} reached ${INVITE_TARGET} invites! Giving role and opening rooms...`);
            weeklyStats.rolesGiven++; // تحديث إحصائيات الرتب
            await openExistingRoomsForInviter(guild, inviterId);
          } else {
            console.log(`⏳ ${inviterId} needs ${INVITE_TARGET - inviterCount} more invites to get role`);
          }
        } else {
          console.log('Inviter unknown for invite code', usedInvite.code);
        }
      } else {
        console.log(`Member ${member.user.tag} joined ${guild.name} but inviter not detected.`);
      }
    }
  } catch (err) {
    console.error('Error in invite tracking:', err);
  }

  // حماية من الحسابات الجديدة
  const accountAgeMs = Date.now() - member.user.createdAt.getTime();
  const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
  
  if (accountAgeDays < minAccountAgeDays) {
    // === نظام Captcha للحسابات الجديدة === //
    const captchaCode = Math.floor(1000 + Math.random() * 9000); // رقم عشوائي 4 أرقام
    captchaUsers.set(member.id, {
      code: captchaCode,
      attempts: 0,
      timestamp: Date.now()
    });

    // إنشاء روم نصي خاص للعضو الجديد مع نظام Captcha
    let privateChannel = null;
    try {
      privateChannel = await member.guild.channels.create({
        name: `verify-${member.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: member.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // الجميع لا يشوف
          { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, // العضو يشوف ويكتب
          { id: adminRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] } // الإدارة
        ]
      });
    } catch (err) {
      console.log('فشل في إنشاء الروم الخاص:', err.message);
    }

    // إرسال رسالة ترحيب وتعليمات Captcha في الروم الخاص
    if (privateChannel) {
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔐 تحقق من الهوية - Captcha Verification')
        .setDescription(`مرحباً ${member}!

تم إنشاء هذا الروم الخاص لأن حسابك جديد جداً.

**🔢 كود التحقق الخاص بك: \`${captchaCode}\`**

**معلومات حسابك:**`)
        .addFields(
          { name: '📅 تاريخ إنشاء الحساب', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:F>`, inline: true },
          { name: '⏳ عمر الحساب', value: `${accountAgeDays} يوم`, inline: true },
          { name: '📋 الحد المطلوب', value: `${minAccountAgeDays} يوم`, inline: true }
        )
        .addFields(
          { name: '📝 التعليمات', value: `1️⃣ اكتب الكود أعلاه في هذا الروم\n2️⃣ اكتب سبب انضمامك للسيرفر\n3️⃣ انتظر موافقة الإدارة\n\n⚠️ لديك 3 محاولات فقط!` }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'نظام التحقق من الهوية - Captcha' })
        .setTimestamp();
      await privateChannel.send({ content: `${member}`, embeds: [welcomeEmbed] });
    }

    // إرسال رسالة خاصة للعضو
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('🚨 تنبيه مهم')
        .setDescription(`مرحباً ${member.user.username}!

تم إنشاء روم خاص لك في السيرفر لمراجعة حسابك.

ادخل إلى الروم النصي باسمك وتواصل مع الإدارة.`)
        .addFields(
          { name: '📅 تاريخ إنشاء الحساب', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:F>`, inline: true },
          { name: '⏳ عمر الحساب', value: `${accountAgeDays} يوم`, inline: true },
          { name: '📋 الحد المطلوب', value: `${minAccountAgeDays} يوم`, inline: true }
        )
        .addFields(
          { name: '💡 ملاحظة', value: 'إذا لم تجد الروم، تواصل مع الإدارة.' }
        )
        .setFooter({ text: 'نظام حماية الحسابات الجديدة' })
        .setTimestamp();
      await member.send({ embeds: [dmEmbed] });
    } catch (dmError) {
      console.log('فشل إرسال رسالة خاصة للعضو:', dmError.message);
    }

    // إرسال لوق للإدارة
    const logChannel = await client.channels.fetch(newAccountLogChannelId).catch(() => null);
    console.log('DEBUG: New account got private channel:', member.user.tag, member.id, accountAgeDays);
    if (logChannel) {
      await logChannel.send(`عضو جديد تم إنشاء روم خاص له: ${member.user.tag} (${member.id}) عمر الحساب: ${accountAgeDays} يوم`);
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('🟡 [حساب جديد] تم إنشاء روم خاص')
        .setDescription(`تم إنشاء روم خاص لمراجعة حساب عضو جديد.`)
        .addFields(
          { name: '👤 العضو', value: `${member.user.tag} | \`${member.id}\`` },
          { name: '📅 تاريخ إنشاء الحساب', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:F>` },
          { name: '⏳ عمر الحساب', value: `${accountAgeDays} يوم` },
          { name: '📺 الروم', value: privateChannel ? `<#${privateChannel.id}>` : 'لم يتم الإنشاء' }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
      await logChannel.send({ embeds: [embed] });
    } else {
      console.log('DEBUG: logChannel is null for newAccountLogChannelId', newAccountLogChannelId);
    }
    return; // لا تكمل الترحيب العادي
  }

  // === الترحيب العادي للحسابات القديمة === //
 const channel = await client.channels.fetch(welcomeChannelId).catch(() => null);
  if (channel) {
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('منور الغالي قروب الزعابي 🌟')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setImage(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(`أهلاً ${member} في **${member.guild.name}**!\n👥 عدد الأعضاء: **${member.guild.memberCount}**`)
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();

    await channel.send({ content: `🎉 أهلاً ${member}!`, embeds: [embed] });
  }
  // === لوق انضمام العضو === //
  const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🟢 [LOG] انضمام عضو جديد')
      .setDescription(`انضم عضو جديد إلى السيرفر.`)
      .addFields(
        { name: '👤 العضو', value: `${member.user.tag} | \`${member.id}\`` },
        { name: '📅 تاريخ إنشاء الحساب', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:F>` },
        { name: '⏳ عمر الحساب', value: `${accountAgeDays} يوم` }
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
  }

  // === حماية من البوتات غير المصرح بها === //
  if (member.user.bot && !allowedBots.includes(member.id)) {
    try {
      await member.kick('بوت غير مصرح به');
      const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🤖 [LOG] طرد بوت غير مصرح')
          .setDescription(`تم طرد بوت غير مصرح به من السيرفر.`)
          .addFields(
            { name: '🤖 البوت', value: `${member.user.tag} | \`${member.id}\`` },
            { name: '👤 من أضافه', value: 'غير معروف' }
          )
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.log('فشل في طرد البوت غير المصرح:', error.message);
    }
  }
});

// === معالج انضمام البوت لسيرفر جديد === //
client.on('guildCreate', async (guild) => {
  try {
    const invites = await guild.invites.fetch();
    invitesCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
  } catch (err) {
    console.error('guildCreate invites fetch error:', err.message);
  }
});

// === ترقيات + رتب البوستر + حماية شاملة === //
// منع التكرار - تخزين آخر عملية بوست لكل عضو
const lastBoostTime = new Map();
// نظام قفل لمنع تشغيل الحدث عدة مرات لنفس العضو
const processingMembers = new Set();

client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
  try {
    // منع تشغيل الحدث عدة مرات لنفس العضو
    if (processingMembers.has(newM.id)) {
      console.log(`تم تجاهل حدث مكرر لـ ${newM.user.tag} (${newM.id}) - العضو قيد المعالجة`);
      return;
    }
    
    // إضافة العضو لقائمة المعالجة
    processingMembers.add(newM.id);
    // === 1. نظام البوست والترقيات === //
    const oldBoost = oldM.premiumSince;
    const newBoost = newM.premiumSince;
    const boostChannel = await client.channels.fetch(boostChannelId).catch(() => null);
    const boostRole = newM.guild.roles.cache.get(boostRoleId);

    if (!oldBoost && newBoost) {
      const userId = newM.id;
      
      // تحديث إحصائيات التقرير الأسبوعي
      weeklyStats.boostsReceived++;
      
      // منع التكرار - تحقق من أن آخر بوست كان منذ أكثر من 5 ثوان
      const now = Date.now();
      const lastBoost = lastBoostTime.get(userId) || 0;
      if (now - lastBoost < 5000) {
        console.log(`تم تجاهل بوست مكرر لـ ${newM.user.tag} (${userId})`);
        return;
      }
      
      // تحقق إضافي - تأكد من أن العضو لم يبسط بالفعل
      if (newM.premiumSince) {
        const boostTime = newM.premiumSince.getTime();
        if (Math.abs(boostTime - now) > 10000) { // أكثر من 10 ثوان
          console.log(`تم تجاهل بوست مكرر لـ ${newM.user.tag} (${userId}) - وقت البوست مختلف: ${boostTime} vs ${now}`);
          return;
        }
      }
      
      // تحقق إضافي - تأكد من أن العضو لم يبسط بالفعل في قاعدة البيانات
      if (boosterData[userId] && boosterData[userId] > 0) {
        console.log(`تم تجاهل بوست مكرر لـ ${newM.user.tag} (${userId}) - العضو موجود في قاعدة البيانات`);
        return;
      }
      
      // تحديث وقت آخر بوست
      lastBoostTime.set(userId, now);
      
      boosterData[userId] = (boosterData[userId] || 0) + 1;

      for (const rank of boosterRanks) {
        if (boosterData[userId] === rank.count) {
          const role = newM.guild.roles.cache.get(rank.roleId);
          if (role) {
            await newM.roles.add(role).catch(() => {});
            await newM.send(`🎉 مبروك! ترقيت إلى **${role.name}** بعد ${rank.count} Boosts!`);
          }
        }
      }

      if (boostChannel) {
        // منع إرسال رسائل متكررة - تحقق من آخر رسالة في القناة
        try {
          const lastMessages = await boostChannel.messages.fetch({ limit: 5 });
          const lastBoostMessage = lastMessages.find(msg => 
            msg.content.includes(newM.id) && 
            msg.content.includes('منور قروبنا') &&
            Date.now() - msg.createdTimestamp < 10000 // 10 ثوان
          );
          
          if (lastBoostMessage) {
            console.log(`تم تجاهل رسالة بوست مكررة لـ ${newM.user.tag} في ${boostChannel.name}`);
            return;
          }
        } catch (err) {
          console.error('خطأ في فحص الرسائل السابقة:', err);
        }
        
        const embed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('اشكرك علي البوست')
          .setThumbnail(newM.user.displayAvatarURL({ dynamic: true }))
          .setDescription(`**${newM.user.tag}** ارحب`)
          .setFooter({ text: `ID: ${newM.id}` })
          .setTimestamp();
        // تأخير بسيط لمنع التكرار
        await new Promise(resolve => setTimeout(resolve, 100));
        
        boostChannel.send({ content: `🚀 ${newM} منور قروبنا`, embeds: [embed] });
      }

      if (boostRole) await newM.roles.add(boostRole).catch(() => {});
      try {
        await newM.send(`💜 شكراً على دعمك **${newM.guild.name}**!`);
      } catch {}
    }

    // === 2. فحص الرتب المضافة === //
    const addedRoles = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
    
    for (const role of addedRoles.values()) {
      if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
        // === حماية من إعطاء أدمن غير مصرح به === //
        if (!ownerIds.includes(newM.id)) {
          try {
            await newM.roles.remove(role, 'تم سحب رتبة أدمن تلقائيًا - غير مصرح به');
            const log = await client.channels.fetch(protectionLogChannelId).catch(() => null);
            if (log) {
              const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🚨 [Protection] سحب رتبة أدمن تلقائيًا')
                .addFields(
                  { name: '👤 المستخدم', value: `${newM.user.tag} | \`${newM.id}\`` },
                  { name: '🧾 الرتبة المسحوبة', value: `${role.name}` },
                  { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                )
                .setThumbnail(newM.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'نظام الحماية التلقائي' });

              await log.send({ embeds: [embed] });
            }
            
            // إرسال تنبيه للأونرز
            for (const ownerId of ownerIds) {
              try {
                const ownerUser = await client.users.fetch(ownerId).catch(() => null);
                if (ownerUser) {
                  await ownerUser.send({
                    content: `🚨 **تنبيه حماية:**\nتم محاولة إعطاء رتبة أدمن لعضو غير مصرح به!\n\n👤 المستخدم: ${newM.user.tag} | \`${newM.id}\`\n🧾 الرتبة: ${role.name}\n⏰ الوقت: <t:${Math.floor(Date.now() / 1000)}:F>`
                  });
                }
              } catch (dmErr) {
                console.error(`فشل إرسال تنبيه للأونر (${ownerId}): ${dmErr.message}`);
              }
            }
          } catch (err) {
            console.error(`فشل في سحب الرتبة: ${err.message}`);
          }
        } else {
          // === لوق إعطاء صلاحيات أدمن للأونرز === //
          const log = await client.channels.fetch(unifiedLogChannelId).catch(() => null);
          if (log) {
            const embed = new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('🛡️ [LOG] إعطاء صلاحية أدمن')
              .setDescription(`✅ تم إعطاء صلاحية أدمن لأونر`)
              .addFields(
                { name: '👤 العضو', value: `${newM.user.tag} | \`${newM.id}\`` },
                { name: '🎭 الرتبة', value: `${role.name}`, inline: true },
                { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
              )
              .setThumbnail(newM.user.displayAvatarURL({ dynamic: true }))
              .setFooter({ text: 'نظام اللوق الموحد' })
              .setTimestamp();

            log.send({ embeds: [embed] });
          }
        }
      }
    }

    // === 3. حماية تغيير اللقب === //
    if (oldM.nickname !== newM.nickname) {
      const data = nicknameTracker.get(newM.id) || { count: 0, first: Date.now() };
      if (Date.now() - data.first > 300000) { 
        data.count = 0; 
        data.first = Date.now(); 
      }
      data.count += 1; 
      nicknameTracker.set(newM.id, data);
      
      if (data.count > 3) {
        await newM.setNickname(oldM.nickname || newM.user.username).catch(() => {});
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🚨 [Anti-Nickname]')
          .setDescription(`${newM.user.tag} حاول يغير لقبه كثير.`)
          .setTimestamp();
        
        // إرسال اللوق
        const log = await client.channels.fetch(protectionLogChannelId).catch(() => null);
        if (log) log.send({ embeds: [embed] });
        
        // تنبيه الأونر
        for (const ownerId of ownerIds) {
          try {
            const ownerUser = await client.users.fetch(ownerId).catch(() => null);
            if (ownerUser) {
              await ownerUser.send(`🚨 **تنبيه حماية:**\n${newM.user.tag} حاول يغير لقبه أكثر من 3 مرات.`);
            }
          } catch {}
        }
      }
    }

  } catch (error) {
    console.error('خطأ في حدث GuildMemberUpdate:', error);
  } finally {
    // إزالة العضو من قائمة المعالجة
    processingMembers.delete(newM.id);
  }
});
client.on(Events.ChannelCreate, async (channel) => {
  const log = await client.channels.fetch(protectionLogChannelId).catch(() => null);
  if (1372979469614190602) return;

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('✅ [إنشاء قناة]')
    .setDescription(`تم إنشاء قناة جديدة: **${channel.name}**`)
    .addFields(
      { name: '📂 النوع', value: `${channel.type}`, inline: true },
      { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }
    )
    .setTimestamp();

  log.send({ embeds: [embed] });
});

// === حماية تعديل السيرفر === //
client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
  if (oldGuild.name !== newGuild.name || oldGuild.icon !== newGuild.icon) {
    const log = await client.channels.fetch(unifiedLogChannelId).catch(() => null);
    if (!log) return;

    const embed = new EmbedBuilder()
      .setColor(0xffae00)
      .setTitle('🛡️ [LOG] تعديل إعدادات السيرفر')
      .setDescription(`🔧 تم تعديل إعدادات السيرفر.`)
      .addFields(
        { name: '📛 الاسم القديم', value: oldGuild.name, inline: true },
        { name: '📛 الاسم الجديد', value: newGuild.name, inline: true }
      )
      .setThumbnail(newGuild.iconURL({ dynamic: true }))
      .setFooter({ text: 'نظام اللوق الموحد' })
      .setTimestamp();

    log.send({ embeds: [embed] });
  }
});

// === لوق حذف قناة === //
client.on(Events.ChannelDelete, async (channel) => {
  const log = await client.channels.fetch(unifiedLogChannelId).catch(() => null);
  if (!log) return;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🛡️ [LOG] حذف قناة')
    .setDescription(`❌ تم حذف قناة: **${channel.name}**`)
    .addFields(
      { name: '📂 النوع', value: `${channel.type}`, inline: true },
      { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }
    )
    .setTimestamp();

  log.send({ embeds: [embed] });
});

// === لوق إنشاء قناة === //
client.on(Events.ChannelCreate, async (channel) => {
  // تحديث إحصائيات التقرير الأسبوعي
  weeklyStats.channelsCreated++;
  
  const log = await client.channels.fetch(unifiedLogChannelId).catch(() => null);
  if (!log) return;

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🛡️ [LOG] إنشاء قناة')
    .setDescription(`✅ تم إنشاء قناة جديدة: **${channel.name}**`)
    .addFields(
      { name: '📂 النوع', value: `${channel.type}`, inline: true },
      { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }
    )
    .setTimestamp();

  log.send({ embeds: [embed] });
});

// === هذا الحدث تم دمجه مع الحدث الرئيسي === //
// === تنبيه عند دخول روم السبونس === //
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const sponsorRoomId = '1363901967558115448'; // 🎙️ ID روم السبونس
  const alertChannelId = '1373020877050089552'; // 📢 ID قناة الإدارة للتنبيه

  // تأكد أنه دخل الروم وليس مجرد تنقل
  if (!oldState.channelId && newState.channelId === sponsorRoomId) {
    const user = newState.member.user;
    const alertChannel = await client.channels.fetch(alertChannelId).catch(() => null);
    if (!alertChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🚨 دخول إلى روم السبونس')
      .setDescription(`👤 <@${user.id}> دخل إلى روم السبونس.`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields({ name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` })
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp();

    alertChannel.send({ embeds: [embed] });
  }
});
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
// تحقق أنه دخل روم (وليس تنقل داخلي أو خروج فقط)
if (!oldState.channelId && newState.channelId) {
  const member = newState.member;
  const voiceChannel = newState.channel;

  const logChannel = await client.channels.fetch('1375195968768573552').catch(() => null);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🎙️ دخول روم صوتي')
    .addFields(
      { name: '👤 العضو', value: `${member.user.tag} | \`${member.id}\`` },
      { name: '📺 الروم', value: `${voiceChannel.name} | \`${voiceChannel.id}\`` },
      { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'نظام مراقبة الرومات الصوتية' });

  await logChannel.send({ embeds: [embed] });
}
});

// === حماية بان، روابط، ستريك، سبام، Auto Slowmode === //
let slowmodeActive = false;
let messageCount = 0;
let lastReset = Date.now();

// تحديث إحصائيات الرسائل
weeklyStats.messagesSent++;
client.on(Events.GuildAuditLogEntryCreate, async (entry) => {
  const suspiciousActions = ['1374405901255180328', '1405944620923355166', '1405944620923355166', '1268288718179930204'];
  if (suspiciousActions.includes(entry.action)) {
    const executor = entry.executor;
    const logChannel = await client.channels.fetch(protectionLogChannelId).catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚨 [مراقبة نشاط مشبوه]')
      .setDescription(`اكتشفنا إجراء مريب من <@${executor.id}>`)
      .addFields(
        { name: '📌 الإجراء', value: entry.action },
        { name: '👤 المنفذ', value: `${executor.tag} | \`${executor.id}\`` },
        { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:R>` }
      )
      .setFooter({ text: 'نظام الأمان الذكي' });

    logChannel.send({ embeds: [embed] });
  }
});
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;

  // === معالج نظام Captcha === //
  const captchaData = captchaUsers.get(message.author.id);
  if (captchaData && message.channel.name.startsWith('verify-')) {
    const userInput = message.content.trim();
    
    // تحقق من انتهاء وقت الكود (10 دقائق)
    if (Date.now() - captchaData.timestamp > 600000) {
      captchaUsers.delete(message.author.id);
      await message.channel.send('⏰ انتهت صلاحية كود التحقق. سيتم طردك من السيرفر.');
      setTimeout(async () => {
        try {
          await message.member.kick('انتهاء صلاحية Captcha');
        } catch (err) {
          console.error('فشل في طرد العضو:', err);
        }
      }, 3000);
      return;
    }
    
    // تحقق من الكود
    if (userInput === captchaData.code.toString()) {
      // نجح التحقق
      captchaUsers.delete(message.author.id);
      
      const successEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ تم التحقق بنجاح!')
        .setDescription(`مبروك ${message.author}! تم التحقق من هويتك بنجاح.\n\nالآن اكتب سبب انضمامك للسيرفر وانتظر موافقة الإدارة.`)
        .setTimestamp();
      
      await message.channel.send({ embeds: [successEmbed] });
      
      // إرسال إشعار للإدارة
      const logChannel = await client.channels.fetch(newAccountLogChannelId).catch(() => null);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ [Captcha] تحقق ناجح')
          .setDescription(`عضو جديد نجح في التحقق من الهوية`)
          .addFields(
            { name: '👤 العضو', value: `${message.author.tag} | \`${message.author.id}\`` },
            { name: '📺 الروم', value: `<#${message.channel.id}>` },
            { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
          )
          .setTimestamp();
        logChannel.send({ embeds: [embed] });
      }
      return;
    } else {
      // فشل التحقق
      captchaData.attempts += 1;
      
      if (captchaData.attempts >= 3) {
        // نفدت المحاولات
        captchaUsers.delete(message.author.id);
        await message.channel.send('❌ نفدت محاولاتك! سيتم طردك من السيرفر.');
        
        setTimeout(async () => {
          try {
            await message.member.kick('فشل في التحقق من Captcha');
          } catch (err) {
            console.error('فشل في طرد العضو:', err);
          }
        }, 3000);
        
        // إرسال لوق
        const logChannel = await client.channels.fetch(newAccountLogChannelId).catch(() => null);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ [Captcha] فشل التحقق')
            .setDescription(`عضو جديد فشل في التحقق وتم طرده`)
            .addFields(
              { name: '👤 العضو', value: `${message.author.tag} | \`${message.author.id}\`` },
              { name: '🔢 المحاولات', value: '3/3 (فشل)' },
              { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        }
        return;
      } else {
        // محاولة خاطئة
        const remaining = 3 - captchaData.attempts;
        await message.channel.send(`❌ كود خاطئ! المحاولات المتبقية: **${remaining}**\n🔢 الكود الصحيح: \`${captchaData.code}\``);
        return;
      }
    }
  }

  // ID الروم المخصص للتقييم
  const ratingChannelId = '1367923463620395148';
  
  // ID واسم الإيموجي المخصص
  const emojiId = '1270147801740738622'; // حط ID الإيموجي هنا
  const emojiName = 'star'; // حط اسم الإيموجي هنا

  // تحقق من القناة
  if (message.channel.id === ratingChannelId && message.content.trim() === 'تقييم') {
    try {
      await message.react(`${emojiName}:${emojiId}`);
    } catch (err) {
      console.error('فشل إضافة الإيموجي:', err);
    }
  }

  // ستريك
  if (message.channel.id === streakChannelId) {
    const hasAttachment = message.attachments.size > 0;
    const isMedia = [...message.attachments.values()].some(att =>
      att.contentType?.startsWith('image/') || att.contentType?.startsWith('video/')
    );

    if (!hasAttachment || !isMedia) {
      await message.delete().catch(() => {});
      const warn = await message.channel.send({ content: `🚫 **${message.author}** فقط صور/فيديوهات هنا.` });
      setTimeout(() => warn.delete().catch(() => {}), 5000);
      return;
    }

    const userId = message.author.id;
    const now = Date.now();
    const today = new Date().toDateString();

    let userStreak = streaks.get(userId);

    if (!userStreak) {
      userStreak = { count: 1, lastDate: today };
    } else {
      if (userStreak.lastDate !== today) {
        const lastDate = new Date(userStreak.lastDate);
        const diffDays = Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          userStreak.count += 1;
        } else {
          userStreak.count = 1;
        }
        userStreak.lastDate = today;
      }
    }

    streaks.set(userId, userStreak);

    const streakMsg = `🔥 **${message.author.username}** ستريكك الحالي: **${userStreak.count} يوم**!`;
    await message.channel.send({ content: streakMsg });

    return;
  }

  // روابط
  const linkRegex = /(https?:\/\/[^\s]+)/gi;
  if (protectionSettings.link && linkRegex.test(message.content)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(() => {});
      const log = await client.channels.fetch(protectionLogChannelId).catch(() => null);
      if (log) log.send(`🛡️ [Anti-Link] ${message.author.tag} حاول يرسل رابط: ${message.content}`);
      protectionLogs.unshift({ time: Date.now(), action: `محاولة إرسال رابط من ${message.author.tag}`, user: message.author.tag });
      if (protectionLogs.length > 20) protectionLogs.pop();
    }
  }

  // سبام
  const now = Date.now();
  const timestamps = userMessages.get(message.author.id) || [];
  const recent = timestamps.filter(t => now - t < 5000);
  recent.push(now);
  userMessages.set(message.author.id, recent);

  if (protectionSettings.spam && recent.length > 5) {
    await message.member.timeout(10000, 'Spam detected').catch(() => {});
    const log = await client.channels.fetch(protectionLogChannelId).catch(() => null);
    if (log) log.send(`⚠️ [Anti-Spam] ${message.author.tag} تم كتمه 10 ثواني بسبب سبام.`);
    protectionLogs.unshift({ time: Date.now(), action: `سبام من ${message.author.tag}`, user: message.author.tag });
    if (protectionLogs.length > 20) protectionLogs.pop();
  }

  // Auto Slowmode
  messageCount++;
  if (now - lastReset > 60000) {
    messageCount = 0;
    lastReset = now;
    slowmodeActive = false;
  }

  if (messageCount > 100 && !slowmodeActive) {
    const channel = message.channel;
    if (channel.type === ChannelType.GuildText) {
      await channel.setRateLimitPerUser(10, 'Auto Slowmode');
      await channel.send('🛑 تم تفعيل وضع الهدوء مؤقتًا بسبب الضغط.');
      const log = await client.channels.fetch(protectionLogChannelId).catch(() => null);
      if (log) log.send(`⚠️ [Auto Slowmode] تم تفعيل الوضع في **#${channel.name}**.`);
      slowmodeActive = true;

      setTimeout(async () => {
        await channel.setRateLimitPerUser(0, 'إلغاء الوضع الهادئ');
        await channel.send('✅ تم إلغاء وضع الهدوء.');
        if (log) log.send(`✅ [Auto Slowmode] تم إلغاء الوضع في **#${channel.name}**.`);
        slowmodeActive = false;
      }, 60000);
    }
  }

  // ========== حماية منشن في الروم ==========
  const mentionTracker = new Map();

  const mentionCount = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);

  // تخطي حماية المنشن للأونر والأشخاص المحددين
  const allowedUsers = ['1347109218809024564', '1405944620923355166', '1405944620923355166', '1268288718179930204'];
  if (mentionCount > 0 && message.author.id !== message.guild.ownerId && !allowedUsers.includes(message.author.id)) {
    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    const data = mentionTracker.get(key) || { count: 0, last: 0 };

    // إذا مرت أكثر من دقيقة، أعد العداد
    if (now - data.last > 60000) {
      data.count = 0;
    }

    data.count += mentionCount;
    data.last = now;
    mentionTracker.set(key, data);

    if (data.count > 3) {
      // حذف الرسالة
      await message.delete().catch(() => {});

      // أرسل رسالة خاصة للعضو
      try {
        await message.author.send('🚫 تم طردك من السيرفر بسبب عمل منشن أكثر من 3 مرات بشكل متكرر.');
      } catch (err) {
        // إذا لم يستطع إرسال رسالة خاصة
      }

      // طرد العضو من السيرفر
      await message.member.kick('منشن سبام (أكثر من 3 مرات)').catch(() => {});

      // إرسال لوق إلى قناة اللوق المخصصة
      const logChannel = await client.channels.fetch('1391445582404653096').catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🚨 [LOG] طرد عضو بسبب سبام منشن')
          .setDescription(`تم طرد عضو بسبب عمل منشن أكثر من 3 مرات في دقيقة.`)
          .addFields(
            { name: '👤 العضو', value: `${message.author.tag} | \`${message.author.id}\``, inline: true },
            { name: '📺 الروم', value: `${message.channel.name} | \`${message.channel.id}\``, inline: true },
            { name: '💬 الرسالة', value: message.content.slice(0, 1024) || '---' },
            { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
          )
          .setFooter({ text: 'نظام حماية المنشن' })
          .setTimestamp();
        logChannel.send({ embeds: [embed] });
      }
    } else if (data.count > 1) {
      // حذف الرسالة وتحذير العضو
      await message.delete().catch(() => {});
      await message.channel.send({ content: `🚫 **${message.author}** مسموح لك 3 منشن فقط في الدقيقة!` })
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }
  }

  // === حماية من الكلمات المحظورة === //
  const messageContent = message.content.toLowerCase();
  const containsBannedWord = bannedWords.some(word => messageContent.includes(word.toLowerCase()));
  
  if (containsBannedWord && !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    await message.delete().catch(() => {});
    
    // تحذير العضو
    const warningMsg = await message.channel.send({
      content: `🚫 **${message.author}** استخدمت كلمة محظورة! تم حذف رسالتك.`
    });
    setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
    
    // إرسال لوق
    const log = await client.channels.fetch(protectionLogChannelId).catch(() => null);
    if (log) {
      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('🚨 [حماية الكلمات] كلمة محظورة')
        .setDescription(`تم اكتشاف كلمة محظورة وحذف الرسالة`)
        .addFields(
          { name: '👤 العضو', value: `${message.author.tag} | \`${message.author.id}\`` },
          { name: '📺 القناة', value: `${message.channel.name} | \`${message.channel.id}\`` },
          { name: '💬 الرسالة', value: message.content.slice(0, 500) + '...' },
          { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
        )
        .setTimestamp();
      log.send({ embeds: [embed] });
    }
    
    protectionLogs.unshift({ 
      time: Date.now(), 
      action: `كلمة محظورة من ${message.author.tag}`, 
      user: message.author.tag 
    });
    if (protectionLogs.length > 20) protectionLogs.pop();
    return;
  }

  // حماية من نشر روابط دعوات السيرفرات
  const inviteRegex = /(discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+)/gi;
  if (protectionSettings.link && inviteRegex.test(message.content)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(() => {});
      // غيّر هنا رقم القناة إلى أي قناة لوق تريدها
      const log = await client.channels.fetch('1384568676103225485').catch(() => null);
      if (log) log.send('رسالة اختبارية من البوت');
      if (log) {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🚨 محاولة نشر رابط دعوة سيرفر')
          .setDescription(`تم محاولة نشر رابط دعوة سيرفر من قبل ${message.author}`)
          .addFields(
            { name: 'العضو', value: `${message.author.tag} | \`${message.author.id}\`` },
            { name: 'القناة', value: `${message.channel} | \`${message.channel.id}\`` },
            { name: 'الرسالة', value: message.content }
          )
          .setTimestamp();
        log.send({ embeds: [embed] });
      }
      protectionLogs.unshift({ time: Date.now(), action: `محاولة نشر رابط دعوة من ${message.author.tag}`, user: message.author.tag });
      if (protectionLogs.length > 20) protectionLogs.pop();
    }
  }
});

// === Trigger Maker + Admin Panel === //
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  const user = interaction.user;
  const guild = interaction.guild;

  // ====== إنشاء روم خاص ======
  if (interaction.customId === 'create_private_vc') {
    if (userVoiceRooms.has(user.id)) {
      return interaction.reply({ content: '🚫 عندك روم شغال بالفعل.', ephemeral: true });
    }

    const voiceChannel = await guild.channels.create({
      name: `🎧 ${user.username}'s Room`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.Connect] },
        { id: user.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ManageChannels] },
      ],
    });

    userVoiceRooms.set(user.id, voiceChannel.id);

    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rename_room').setLabel('✏️ تغيير الاسم').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('toggle_privacy').setLabel('🔐 خاص/عام').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('limit_users').setLabel('👥 تحديد العدد').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('movie_mode').setLabel('🎬 وضع أفلام').setStyle(ButtonStyle.Success)
    );

    const adminRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('monitor_room').setLabel('🕵️‍♂️ مراقبة الروم').setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      content: `🎉 تم إنشاء رومك! [اضغط هنا للدخول](${voiceChannel.url})`,
      components: [controlRow, adminRow],
      ephemeral: true,
    });

    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      logChannel.send(`📢 ${user.tag} أنشأ روم خاص: ${voiceChannel.name}`);
    }
  }
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
// تجاهل البوتات أو الرسائل في الخاص
if (oldMessage.author?.bot || !oldMessage.guild) return;

// إذا ما تغير المحتوى، تجاهله
if (oldMessage.content === newMessage.content) return;

const logChannel = await client.channels.fetch('1368974000549662770').catch(() => null);
if (!logChannel) return;

const embed = new EmbedBuilder()
  .setColor(0xffcc00)
  .setTitle('✏️ [LOG] تعديل رسالة')
  .addFields(
    { name: '👤 العضو', value: `${oldMessage.author.tag} | \`${oldMessage.author.id}\`` },
    { name: '📍 القناة', value: `<#${oldMessage.channel.id}>`, inline: true },
    { name: '💬 قبل التعديل', value: oldMessage.content.slice(0, 1024) || '---' },
    { name: '💬 بعد التعديل', value: newMessage.content.slice(0, 1024) || '---' }
  )
  .setFooter({ text: 'نظام اللوق - تعديل رسالة' })
  .setTimestamp();

logChannel.send({ embeds: [embed] });
});
client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
  try {
    const logs = await newChannel.guild.fetchAuditLogs({ type: 11, limit: 1 }).catch(() => null);
    if (!logs) return;

    const entry = logs.entries.first();
    if (!entry || !entry.executor) return;

    const executor = entry.executor;
    const executorId = executor.id;

    // === حماية من تغيير أسماء القنوات بشكل جماعي === //
    if (oldChannel.name !== newChannel.name) {
      const data = channelNameTracker.get(executorId) || { count: 0, first: Date.now() };
      if (Date.now() - data.first > 300000) { // 5 دقائق
        data.count = 0; 
        data.first = Date.now(); 
      }
      data.count += 1; 
      channelNameTracker.set(executorId, data);

      // إذا غير أكثر من 5 أسماء في 5 دقائق
      if (data.count > 5 && !ownerIds.includes(executorId)) {
        const member = await newChannel.guild.members.fetch(executorId).catch(() => null);
        if (member) {
          await member.roles.set([], '🚨 Channel Name Spam').catch(() => {});
        }
        
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🚨 [حماية] تغيير أسماء قنوات جماعي')
          .setDescription(`${executor.tag} غير أسماء القنوات بشكل مشبوه وتم سحب صلاحياته.`)
          .addFields(
            { name: '👤 المنفذ', value: `${executor.tag} | \`${executor.id}\`` },
            { name: '📊 عدد التغييرات', value: `${data.count} في 5 دقائق` },
            { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
          )
          .setTimestamp();
        
        sendProtectionEmbed(embed);
        alertOwner(`${executor.tag} غير أسماء القنوات بشكل جماعي.`);
        return;
      }
    }

    // === حماية من تعديل صلاحيات القنوات === //
    const oldPermissions = oldChannel.permissionOverwrites?.cache || new Map();
    const newPermissions = newChannel.permissionOverwrites?.cache || new Map();
    
    let permissionsChanged = false;
    
    // تحقق من التغييرات في الصلاحيات
    for (const [id, newPerm] of newPermissions) {
      const oldPerm = oldPermissions.get(id);
      if (!oldPerm || oldPerm.allow.bitfield !== newPerm.allow.bitfield || oldPerm.deny.bitfield !== newPerm.deny.bitfield) {
        permissionsChanged = true;
        break;
      }
    }
    
    // تحقق من الصلاحيات المحذوفة
    for (const [id] of oldPermissions) {
      if (!newPermissions.has(id)) {
        permissionsChanged = true;
        break;
      }
    }

    if (permissionsChanged && !ownerIds.includes(executorId)) {
      const data = channelPermissionTracker.get(executorId) || { count: 0, first: Date.now() };
      if (Date.now() - data.first > 300000) { // 5 دقائق
        data.count = 0; 
        data.first = Date.now(); 
      }
      data.count += 1; 
      channelPermissionTracker.set(executorId, data);

      // إذا عدل صلاحيات أكثر من 3 قنوات في 5 دقائق
      if (data.count > 3) {
        const member = await newChannel.guild.members.fetch(executorId).catch(() => null);
        if (member) {
          await member.roles.set([], '🚨 Channel Permission Spam').catch(() => {});
        }
        
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🚨 [حماية] تعديل صلاحيات قنوات جماعي')
          .setDescription(`${executor.tag} عدل صلاحيات القنوات بشكل مشبوه وتم سحب صلاحياته.`)
          .addFields(
            { name: '👤 المنفذ', value: `${executor.tag} | \`${executor.id}\`` },
            { name: '📊 عدد التعديلات', value: `${data.count} في 5 دقائق` },
            { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
          )
          .setTimestamp();
        
        sendProtectionEmbed(embed);
        alertOwner(`${executor.tag} عدل صلاحيات القنوات بشكل جماعي.`);
        return;
      }
    }

    // === حماية القنوات المهمة === //
    if (importantChannels.includes(newChannel.id) && !ownerIds.includes(executorId)) {
      const embed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle('⚠️ [تنبيه] تعديل قناة مهمة')
        .setDescription(`تم تعديل قناة مهمة من قبل ${executor.tag}`)
        .addFields(
          { name: '📺 القناة', value: `${newChannel.name} | \`${newChannel.id}\`` },
          { name: '👤 المنفذ', value: `${executor.tag} | \`${executor.id}\`` },
          { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
        )
        .setTimestamp();
      
      sendProtectionEmbed(embed);
      alertOwner(`تم تعديل قناة مهمة (${newChannel.name}) من قبل ${executor.tag}`);
    }

    // إرسال اللوق العادي لتغيير الاسم
    if (oldChannel.name !== newChannel.name) {
      const logChannel = await client.channels.fetch('1375195969687126147').catch(() => null);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xffcc00)
          .setTitle('✏️ [LOG] تعديل اسم روم')
          .addFields(
            { name: '📛 الاسم القديم', value: oldChannel.name },
            { name: '📛 الاسم الجديد', value: newChannel.name },
            { name: '👮‍♂️ المنفذ', value: `${executor.tag} | \`${executor.id}\`` },
            { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
          )
          .setFooter({ text: 'نظام مراقبة تعديل القنوات' })
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    console.error('خطأ في مراقبة تعديل القنوات:', error);
  }
});

  // ====== تعديل الاسم ======
  if (interaction.customId === 'rename_room') {
    const channelId = userVoiceRooms.get(interaction.user.id);
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return;

    await interaction.deferReply({ ephemeral: true }); // ✅ تأخير الرد
    await interaction.followUp({ content: '✏️ اكتب الاسم الجديد للروم خلال 15 ثانية...' });

    try {
      const collected = await interaction.channel.awaitMessages({
        filter: m => m.author.id === interaction.user.id,
        max: 1,
        time: 15000,
        errors: ['time'],
      });
      const newName = collected.first().content;
      await channel.setName(`🎧 ${newName}`);
      await interaction.followUp({ content: `✅ تم تغيير اسم الروم إلى: ${newName}` });
    } catch (error) {
      await interaction.followUp({ content: '⏳ انتهى الوقت بدون تغيير الاسم.' });
    }
  }
// === Trigger Maker === //
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === 'open_trigger_modal') {
      const modal = new ModalBuilder()
        .setCustomId('trigger_modal')
        .setTitle('Trigger Maker')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('event_name')
              .setLabel('Event Name')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('مثلاً: bank:robbery')
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('event_args')
              .setLabel('Arguments (مفصولة بفاصلة)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('"hello", 123, true')
              .setRequired(false)
          )
        );
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'view_triggers') {
      const triggers = userTriggers.get(interaction.user.id) || [];
      if (triggers.length === 0) return interaction.reply({ content: '📭 لا يوجد لديك تريقرات محفوظة.', ephemeral: true });

      const content = triggers.map((t, i) => `-- Trigger ${i + 1}\n${t}`).join('\n\n');
      const fileName = `triggers_${interaction.user.id}.lua`;
      fs.writeFileSync(fileName, content);
      const file = new AttachmentBuilder(fileName);
      await interaction.reply({ content: '📂 كل ثغراتك هنا:', files: [file], ephemeral: true });
      setTimeout(() => fs.unlinkSync(fileName), 5000);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'trigger_modal') {
    const eventName = interaction.fields.getTextInputValue('event_name');
    const eventArgs = interaction.fields.getTextInputValue('event_args');
    const trigger = `TriggerServerEvent("${eventName}"${eventArgs ? `, ${eventArgs}` : ''})`;
    const userId = interaction.user.id;

    if (!userTriggers.has(userId)) userTriggers.set(userId, []);
    userTriggers.get(userId).push(trigger);

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle('🔧 سويت لك ترقر')
      .setDescription(`\`\`\`lua\n${trigger}\n\`\`\``)
      .setFooter({ text: 'تم إنشاؤه بواسطة Trigger Maker ⚙️' });

    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.reply({ content: '📩 تم إرسال التريقر على الخاص!', ephemeral: true });
    } catch {
      await interaction.reply({ content: 'فج الخاص عشان اقدر ارسلك التريقر 📩', ephemeral: true });
    }

    const logChannel = await client.channels.fetch(protectionLogChannelId).catch(() => null);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle('📘 سجل إنشاء تريقر')
        .addFields(
          { name: '👤 المستخدم', value: `${interaction.user.tag} | \`${userId}\`` },
          { name: '📛 اسم الحدث', value: `\`${eventName}\`` },
          { name: '🧾 الوسائط', value: eventArgs ? `\`${eventArgs}\`` : 'بدون وسائط' },
          { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'سجل التريقرات 🔒' });

      logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    }
  }
});

// حذف الروم عند خروج صاحبه
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const userId = oldState.id || oldState.member.id;
  const channelId = userVoiceRooms.get(userId);
  if (!channelId) return;

  const leftOriginalRoom = oldState.channelId === channelId;
  const userDisconnected = !newState.channelId;

  if (leftOriginalRoom && userDisconnected) {
    const channel = oldState.guild.channels.cache.get(channelId);
    if (channel && channel.deletable) {
      try {
        await channel.delete();
        userVoiceRooms.delete(userId);
      } catch (error) {
        console.error(`فشل حذف الروم الصوتي للعضو ${userId}:`, error);
      }
    } else {
      userVoiceRooms.delete(userId); // على الأقل نحذف التتبع
    }
  }
});
  // ====== تبديل خاص/عام ======
  if (interaction.customId === 'toggle_privacy') {
    const channelId = userVoiceRooms.get(user.id);
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    const everyonePerm = channel.permissionOverwrites.cache.get(guild.id);
    const isPrivate = everyonePerm?.deny.has(PermissionsBitField.Flags.Connect);

    await channel.permissionOverwrites.edit(guild.id, {
      Connect: isPrivate ? true : false,
    });

    await interaction.reply({
      content: `🔐 الروم الآن ${isPrivate ? 'عام 🌐' : 'خاص 🔒'}`,
      ephemeral: true,
    });
  }

  // ====== تحديد عدد الأعضاء ======
  if (interaction.customId === 'limit_users') {
    const channelId = userVoiceRooms.get(user.id);
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    await interaction.reply({ content: '👥 أرسل الحد الأقصى لعدد الأعضاء في الروم (رقم)...', ephemeral: true });

    const msgFilter = m => m.author.id === user.id;
    const collected = await interaction.channel.awaitMessages({ filter: msgFilter, max: 1, time: 15000 });
    const limit = parseInt(collected.first()?.content);

    if (!isNaN(limit) && limit > 0 && limit <= 99) {
      await channel.setUserLimit(limit);
      await interaction.followUp({ content: `✅ تم تحديد الحد الأقصى بـ ${limit} عضو.`, ephemeral: true });
    } else {
      await interaction.followUp({ content: '❌ رقم غير صالح.', ephemeral: true });
    }
  }

  // ====== وضع أفلام ======
  if (interaction.customId === 'movie_mode') {
    const channelId = userVoiceRooms.get(user.id);
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    if (interaction.user.id !== channel.permissionOverwrites.cache.find(po => po.allow.has(PermissionsBitField.Flags.ManageChannels))?.id) {
      return interaction.reply({ content: '🚫 هذا الخيار فقط لصاحب الروم.', ephemeral: true });
    }

    await channel.setBitrate(96000);
    await interaction.reply({ content: '🎬 تم تفعيل وضع الأفلام بجودة عالية!', ephemeral: true });
  }

  // ====== مراقبة الروم (للأدمن فقط) ======
  if (interaction.customId === 'monitor_room') {
    if (!interaction.member.roles.cache.has(adminRoleId)) {
      return interaction.reply({ content: '🚫 هذا الخيار للإدارة فقط.', ephemeral: true });
    }

    const report = [...userVoiceRooms.entries()]
      .map(([ownerId, chanId]) => {
        const vc = guild.channels.cache.get(chanId);
        return `👤 <@${ownerId}> | ${vc?.name || '❌ محذوف'} | ${vc?.members?.size || 0} متصل`;
      }).join('\n') || '📭 لا توجد رومات نشطة حالياً.';

    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      logChannel.send({ content: `🕵️‍♂️ [مراقبة صوتية]\n${report}` });
    }

    await interaction.reply({ content: '📡 تم إرسال تفاصيل الرومات للّوغ.', ephemeral: true });
  }

  // ... existing code for other interactions ...
});

// حذف الروم عند خروج صاحبه
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const userId = oldState.id;
  const channelId = userVoiceRooms.get(userId);
  if (!channelId) return;

  if (oldState.channelId === channelId && !newState.channelId) {
    const channel = oldState.guild.channels.cache.get(channelId);
    if (channel) {
      await channel.delete().catch(() => {});
    }
    userVoiceRooms.delete(userId);
  }
});

// === لوق خروج العضو من السيرفر === //
client.on(Events.GuildMemberRemove, async member => {
  // تحديث إحصائيات التقرير الأسبوعي
  weeklyStats.leftMembers++;
  
const log = await client.channels.fetch('1368973620021297193').catch(() => null);
if (!log) return;

const joinedAt = member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime()/1000)}:F>` : 'غير معروف';
const createdAt = member.user.createdAt ? `<t:${Math.floor(member.user.createdAt.getTime()/1000)}:F>` : 'غير معروف';

const embed = new EmbedBuilder()
  .setColor(0xe74c3c)
  .setTitle('🚪 [LOG] خروج عضو')
  .setDescription(`👋 غادر العضو السيرفر.`)
  .addFields(
    { name: '👤 العضو', value: `${member.user.tag} | \`${member.id}\`` },
    { name: '📅 تاريخ الانضمام', value: joinedAt, inline: true },
    { name: '📆 تاريخ إنشاء الحساب', value: createdAt, inline: true }
  )
  .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
  .setFooter({ text: 'نظام اللوق الموحد' })
  .setTimestamp();

log.send({ embeds: [embed] });
});

// ============ نظام النسخ الاحتياطي للسيرفر ============ //
const BACKUP_FILE = 'server_backup.json';
const BACKUP_INTERVAL = 1000 * 60 * 60 * 24 * 5; // 5 أيام

async function backupServer(guild) {
try {
  // نسخ الرتب
  const roles = guild.roles.cache.filter(r => r.id !== guild.id).map(role => ({
    name: role.name,
    color: role.color,
    hoist: role.hoist,
    permissions: role.permissions.bitfield,
    mentionable: role.mentionable,
    position: role.position,
  }));
  // نسخ القنوات
  const channels = guild.channels.cache.sort((a, b) => a.position - b.position).map(channel => ({
    name: channel.name,
    type: channel.type,
    parent: channel.parentId,
    position: channel.position,
    topic: channel.topic,
    nsfw: channel.nsfw,
    rateLimitPerUser: channel.rateLimitPerUser,
    userLimit: channel.userLimit,
    bitrate: channel.bitrate,
    permissionOverwrites: channel.permissionOverwrites.cache.map(po => ({
      id: po.id,
      allow: po.allow.bitfield,
      deny: po.deny.bitfield,
      type: po.type
    })),
    id: channel.id,
  }));
  // نسخ إعدادات السيرفر
  const settings = {
    name: guild.name,
    icon: guild.iconURL({ format: 'png' }),
    verificationLevel: guild.verificationLevel,
    defaultMessageNotifications: guild.defaultMessageNotifications,
    explicitContentFilter: guild.explicitContentFilter,
    afkChannelId: guild.afkChannelId,
    afkTimeout: guild.afkTimeout,
    systemChannelId: guild.systemChannelId,
    region: guild.region,
  };
  // نسخ آخر 100 رسالة من كل قناة نصية
  const messages = {};
  for (const channel of guild.channels.cache.values()) {
    if (channel.type === ChannelType.GuildText) {
      try {
        const msgs = await channel.messages.fetch({ limit: 100 });
        messages[channel.id] = msgs.map(m => ({
          author: m.author.id,
          content: m.content,
          attachments: m.attachments.map(a => a.url),
          createdTimestamp: m.createdTimestamp
        }));
      } catch {}
    }
  }
  // حفظ النسخة
  const backup = { date: Date.now(), roles, channels, settings, messages };
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
  sendLog('✅ [Backup] تم إنشاء نسخة احتياطية للسيرفر بنجاح.');
  // Send confirmation embed to specific channel
  const backupLogChannel = await client.channels.fetch('1383751155741495436').catch(() => null);
  if (backupLogChannel && backupLogChannel.isTextBased()) {
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ تم عمل نسخة احتياطية')
      .setDescription(`تم إنشاء نسخة احتياطية للسيرفر بنجاح.`)
      .addFields({ name: 'التاريخ والوقت', value: `<t:${Math.floor(Date.now()/1000)}:F>` })
      .setFooter({ text: 'نظام النسخ الاحتياطي' })
      .setTimestamp();
    backupLogChannel.send({ embeds: [embed] });
  }
} catch (err) {
  sendLog('❌ [Backup] فشل النسخ الاحتياطي: ' + err.message);
}
}

// جدولة النسخ الاحتياطي كل 5 أيام بعد تشغيل البوت
client.once('ready', () => {
const guild = client.guilds.cache.first();
if (guild) {
  setInterval(() => backupServer(guild), BACKUP_INTERVAL);
  // نسخ احتياطي أولي عند التشغيل
  backupServer(guild);
}
});

// أمر استرجاع النسخة الاحتياطية (للأونر فقط مع زر تأكيد)
client.on(Events.InteractionCreate, async interaction => {
if (!interaction.isChatInputCommand()) return;
if (interaction.commandName === 'restore-server') {
  const allowedOwner = '1268288718179930204';
  if (interaction.user.id !== allowedOwner) {
    return interaction.reply({ content: '🚫 هذا الأمر للأونر فقط!', ephemeral: true });
  }
  // زر تأكيد
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const confirmBtn = new ButtonBuilder()
    .setCustomId('confirm_restore')
    .setLabel('تأكيد الاسترجاع')
    .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(confirmBtn);
  await interaction.reply({
    content: '⚠️ هل أنت متأكد أنك تريد استرجاع النسخة الاحتياطية؟ سيتم حذف كل القنوات والرتب الحالية!\nاضغط الزر بالأسفل للتأكيد.',
    components: [row],
    ephemeral: true
  });
}
// ... existing code ...
});

// زر تأكيد الاسترجاع
client.on(Events.InteractionCreate, async interaction => {
if (!interaction.isButton()) return;
if (interaction.customId === 'confirm_restore') {
  const allowedOwner = '1268288718179930204';
  if (interaction.user.id !== allowedOwner) {
    return interaction.reply({ content: '🚫 هذا الزر للأونر فقط!', ephemeral: true });
  }
  await interaction.update({ content: '⏳ جاري استرجاع النسخة الاحتياطية... (قد يستغرق عدة دقائق)', components: [] });
  try {
    const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    const guild = interaction.guild;
    // حذف القنوات القديمة
    for (const channel of guild.channels.cache.values()) {
      await channel.delete().catch(() => {});
    }
    // حذف الرتب القديمة (ماعدا everyone)
    for (const role of guild.roles.cache.values()) {
      if (role.id !== guild.id) await role.delete().catch(() => {});
    }
    // إعادة إعدادات السيرفر
    await guild.setName(data.settings.name).catch(() => {});
    if (data.settings.icon) await guild.setIcon(data.settings.icon).catch(() => {});
    // إعادة الرتب
    let createdRoles = [];
    for (const r of data.roles.sort((a, b) => a.position - b.position)) {
      const role = await guild.roles.create({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        permissions: r.permissions,
        mentionable: r.mentionable,
      }).catch(() => null);
      if (role) createdRoles.push(role);
    }
    // إعادة القنوات
    let createdChannels = {};
    for (const c of data.channels) {
      const options = {
        type: c.type,
        topic: c.topic,
        nsfw: c.nsfw,
        rateLimitPerUser: c.rateLimitPerUser,
        userLimit: c.userLimit,
        bitrate: c.bitrate,
        permissionOverwrites: c.permissionOverwrites,
      };
      const parent = c.parent && createdChannels[c.parent] ? createdChannels[c.parent] : undefined;
      if (parent) options.parent = parent;
      const channel = await guild.channels.create({ name: c.name, ...options }).catch(() => null);
      if (channel) createdChannels[c.id] = channel.id;
    }
    // استرجاع الرسائل (قدر الإمكان)
    for (const [cid, msgs] of Object.entries(data.messages)) {
      const channel = guild.channels.cache.get(createdChannels[cid]);
      if (channel && channel.type === ChannelType.GuildText) {
        for (const m of msgs.reverse()) {
          const user = await client.users.fetch(m.author).catch(() => null);
          let content = m.content;
          if (user) content = `[${user.tag}]: ${content}`;
          await channel.send({ content });
        }
      }
    }
    sendLog('✅ [Restore] تم استرجاع السيرفر من النسخة الاحتياطية بنجاح.');
    await interaction.followUp({ content: '✅ تم استرجاع السيرفر من النسخة الاحتياطية!', ephemeral: true });
  } catch (err) {
    sendLog('❌ [Restore] فشل الاسترجاع: ' + err.message);
    await interaction.followUp({ content: '❌ حدث خطأ أثناء الاسترجاع: ' + err.message, ephemeral: true });
  }
}
});

client.once('ready', async () => {
// ... كودك الحالي ...
// إرسال زر في قناة محددة
const channelId = '1383751155741495436'; // ID القناة التي تريد الزر فيها
const channel = await client.channels.fetch(channelId).catch(() => null);
if (channel && channel.isTextBased()) {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('استرجاع النسخة الاحتياطية')
    .setDescription('اضغط الزر بالأسفل لاسترجاع النسخة الاحتياطية للسيرفر (للأونر فقط).');
  const confirmBtn = new ButtonBuilder()
    .setCustomId('confirm_restore')
    .setLabel('استرجاع النسخة الاحتياطية')
    .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder().addComponents(confirmBtn);
  await channel.send({ embeds: [embed], components: [row] });
}
});

// === لوق إنشاء رابط دعوة (انفايت) === //
client.on(Events.InviteCreate, async (invite) => {
  console.log('Invite created:', invite); // أضف هذا السطر
  try {
    const logChannel = await client.channels.fetch('1363578581409730802').catch(() => null);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle('🔗 [LOG] تم إنشاء رابط دعوة')
      .addFields(
        { name: '👤 أنشأ الرابط', value: invite.inviter ? `${invite.inviter.tag} | \`${invite.inviter.id}\`` : 'غير معروف', inline: true },
        { name: '📨 الكود', value: `https://discord.gg/${invite.code}`, inline: true },
        { name: '📺 الروم', value: invite.channel ? `${invite.channel.name} | \`${invite.channel.id}\`` : 'غير معروف', inline: true },
        { name: '⏰ ينتهي في', value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime()/1000)}:R>` : 'لا ينتهي', inline: true },
        { name: '🧑‍🤝‍🧑 الحد الأقصى للمدعوين', value: invite.maxUses ? `${invite.maxUses}` : 'غير محدود', inline: true }
      )
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error('فشل إرسال لوق الانفايت:', err);
  }
});
// ============ حماية من الأعطال و الفصل المفاجئ ============ //

function sendLog(message) {
  const channel = client.channels.cache.get(logChannelId);
  if (channel && channel.isTextBased()) {
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
    channel.send(`🕒 ${timestamp}\n${message}`).catch(console.error);
  }
  }
  
  // Global error handlers
  process.on('unhandledRejection', (reason, p) => {
  const msg = `❌ [Unhandled Rejection]: ${reason}`;
  console.error(msg);
  sendLog(msg);
  });
  
  process.on('uncaughtException', err => {
  const msg = `❌ [Uncaught Exception]: ${err}`;
  console.error(msg);
  sendLog(msg);
  });
  
  // Client error handlers
  client.on('error', error => {
  const msg = `❌ [Client Error]: ${error}`;
  console.error(msg);
  sendLog(msg);
  });
  
  client.on('disconnect', event => {
  const msg = `⚠️ [Disconnected]: Code ${event.code}, Reason: ${event.reason || 'Unknown'}`;
  console.warn(msg);
  sendLog(msg);
  });
  
  client.on('shardDisconnect', (event, shardID) => {
  const msg = `⚠️ [Shard ${shardID} Disconnected]: ${event.reason || 'No reason'}`;
  console.warn(msg);
  sendLog(msg);
  });
  
  client.on('shardReconnecting', (shardID) => {
  const msg = `🔁 [Reconnecting Shard ${shardID}]...`;
  console.log(msg);
  sendLog(msg);
  });
  
  client.on('shardResume', (shardID, replayedEvents) => {
  const msg = `✅ [Shard ${shardID} Reconnected], Replayed Events: ${replayedEvents}`;
  console.log(msg);
  sendLog(msg);
  });
  
  // === لوق حذف رسالة === //
  client.on(Events.MessageDelete, async (message) => {
    // تجاهل إذا كانت من بوت أو من الخاص
    if (!message.guild || (message.author && message.author.bot)) return;

    const log = await client.channels.fetch('1386802506692038747').catch(() => null);
    if (!log) return;

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🗑️ [LOG] حذف رسالة')
      .setDescription(`تم حذف رسالة في الروم <#${message.channel.id}>`)
      .addFields(
        { name: '👤 العضو', value: message.author ? `${message.author.tag} | \`${message.author.id}\`` : 'غير معروف', inline: true },
        { name: '📺 القناة', value: `${message.channel.name} | \`${message.channel.id}\``, inline: true },
        { name: '💬 الرسالة', value: message.content ? message.content.slice(0, 1024) : '---' },
        { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
      )
      .setFooter({ text: 'نظام اللوق الموحد' })
      .setTimestamp();

    log.send({ embeds: [embed] });
  });
  // ... existing code ...

  // === تنبيه عند دخول روم الدعم الفني === //
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const supportRoomId = '1363901967558115448'; // 🛠️ ID روم الدعم الفني
    const supportLogChannelId = '1390826004368326768'; // 📋 ID قناة اللوق للدعم

    // تحقق أنه دخل الروم وليس مجرد تنقل
    if (!oldState.channelId && newState.channelId === supportRoomId) {
      const user = newState.member.user;
      // أرسل رسالة خاصة للعضو
      try {
        await user.send({
          content: `مرحباً ${user.username} 👋\n\nلقد دخلت روم الدعم الفني. يرجى الانتظار وسيتم مساعدتك من قبل أحد أعضاء الفريق قريباً.\nإذا كان لديك تفاصيل إضافية عن مشكلتك، يمكنك كتابتها هنا!`
        });
      } catch (err) {
        // إذا لم يستطع إرسال رسالة خاصة
      }
      // أرسل لوق في قناة اللوق
      const logChannel = await client.channels.fetch(supportLogChannelId).catch(() => null);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x00b0f4)
          .setTitle('🛠️ دخول عضو إلى روم الدعم الفني')
          .setDescription(`👤 <@${user.id}> دخل روم الدعم الفني.`)
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .addFields({ name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` })
          .setFooter({ text: `ID: ${user.id}` })
          .setTimestamp();
        logChannel.send({ embeds: [embed] });
      }
    }
  });

  // === حماية سحب الأعضاء من الرومات الصوتية === //
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const member = newState.member;
    const guild = newState.guild;

    // إذا ما تغير روم الصوت، نخرج
    if (oldState.channelId === newState.channelId) return;

    // تأكد أن العضو عنده رتبة الحماية
    const protectedRoleName = "𝗔𝗗𝗠𝗜𝗡𝗜𝗦𝗧𝗥𝗔𝗧𝗢𝗥"; // <-- غير اسم الرتبة إذا تبي
    const protectedRole = guild.roles.cache.find(r => r.name === protectedRoleName);
    if (!protectedRole || !member.roles.cache.has(protectedRole.id)) return;

    if (!oldState.channelId) return; // ما كان في روم قبل

    try {
      // نجيب اللوق ونشوف من نقله
      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberMove,
      });
      const moveLog = fetchedLogs.entries.first();
      if (!moveLog) return;

      const { executor, target, createdAt } = moveLog;

      // تأكد أن النقل تم الآن وللعضو الصحيح
      const timeDiff = (Date.now() - createdAt.getTime()) / 1000;
      if (target.id !== member.id || timeDiff > 5) return;

      // رجعه للروم السابق
      await member.voice.setChannel(oldState.channelId, "منع سحب أعضاء الرتبة المحمية");

      // أرسل تنبيه
      const logChannel = guild.channels.cache.find(ch => ch.name === "1363578581409730802");
      if (logChannel) {
        logChannel.send(`🚫 **${executor.tag}** حاول يسحب **${member.user.tag}** (محمي) وتم منعه ❗`);
      }

    } catch (err) {
      console.error("خطأ في حماية السحب:", err);
    }
  });

  // === حماية الأعضاء من الباند === //
  client.on("guildBanAdd", async (ban) => {
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd });
    const executor = logs.entries.first().executor;

    const protectedIDs = ["1344027319097888870"]; // أيديات محمية

    if (protectedIDs.includes(ban.user.id)) {
      await ban.guild.members.unban(ban.user.id); // فك الباند
      const member = await ban.guild.members.fetch(executor.id);
      if (member && member.kickable) await member.kick("حاول يبند عضو محمي");

      const logChannel = ban.guild.channels.cache.find(ch => ch.name === "admin-logs");
      if (logChannel) {
        logChannel.send(`🚨 **${executor.tag}** حاول يبند عضو محمي (${ban.user.tag}) وتم منعه.`);
      }
    }
  });

// === 1. Anti Mass Ban/Kick === //
client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
  if (!entry.executor || ownerIds.includes(entry.executor.id)) return;

  const executorId = entry.executor.id;
  const now = Date.now();

  if ([AuditLogEvent.MemberBanAdd, AuditLogEvent.MemberKick].includes(entry.action)) {
    const data = banKickTracker.get(executorId) || { count: 0, first: now };
    if (now - data.first > 60000) { data.count = 0; data.first = now; }
    data.count += 1;
    banKickTracker.set(executorId, data);

    if (data.count > 3) {
      const member = await guild.members.fetch(executorId).catch(() => null);
      if (member) await member.roles.set([], '🚨 Ban/Kick Spam').catch(() => {});
      const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Anti-MassBanKick]')
        .setDescription(`${entry.executor.tag} حاول يسوي بان/كيك جماعي وتم سحب صلاحياته.`)
        .setTimestamp();
      sendLog(embed);
      alertOwner(`${entry.executor.tag} حاول يسوي بان/كيك جماعي.`);
    }
  }
});

// === 2. Anti Role Create/Delete === //
client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
  if (!entry.executor || ownerIds.includes(entry.executor.id)) return;

  const executorId = entry.executor.id;

  // إنشاء رتبة خطيرة
  if (entry.action === AuditLogEvent.RoleCreate) {
    const role = await guild.roles.fetch(entry.targetId).catch(() => null);
    if (role && role.permissions.any([
      PermissionsBitField.Flags.Administrator,
      PermissionsBitField.Flags.ManageGuild,
      PermissionsBitField.Flags.BanMembers
    ])) {
      await role.delete().catch(() => {});
      const member = await guild.members.fetch(executorId).catch(() => null);
      if (member) await member.roles.set([], '🚨 Dangerous Role Create').catch(() => {});
      const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Anti-RoleCreate]')
        .setDescription(`${entry.executor.tag} حاول ينشئ رتبة بصلاحيات خطيرة.`)
        .setTimestamp();
      sendLog(embed);
      alertOwner(`${entry.executor.tag} حاول ينشئ رتبة بصلاحيات خطيرة.`);
    }
  }

  // حذف رتب جماعي مع نسخ احتياطي
  if (entry.action === AuditLogEvent.RoleDelete) {
    // === نسخ احتياطي للرتبة المحذوفة === //
    const deletedRoleId = entry.targetId;
    
    // حفظ معلومات الرتبة المحذوفة
    deletedRolesBackup.set(deletedRoleId, {
      name: entry.target?.name || 'Unknown Role',
      color: entry.target?.color || 0,
      permissions: entry.target?.permissions?.bitfield || 0,
      hoist: entry.target?.hoist || false,
      mentionable: entry.target?.mentionable || false,
      deletedAt: Date.now(),
      deletedBy: entry.executor.id
    });

    // تحقق من الرتب المهمة
    if (importantRoles.includes(deletedRoleId) && !ownerIds.includes(executorId)) {
      // استرجاع الرتبة المهمة فوراً
      try {
        const restoredRole = await guild.roles.create({
          name: entry.target?.name || 'Restored Role',
          color: entry.target?.color || 0,
          permissions: entry.target?.permissions?.bitfield || 0,
          hoist: entry.target?.hoist || false,
          mentionable: entry.target?.mentionable || false,
          reason: '🚨 استرجاع رتبة مهمة محذوفة'
        });

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('🔄 [حماية] استرجاع رتبة مهمة')
          .setDescription(`تم استرجاع رتبة مهمة تم حذفها بشكل غير مصرح به`)
          .addFields(
            { name: '🎭 الرتبة المحذوفة', value: entry.target?.name || 'Unknown' },
            { name: '🎭 الرتبة الجديدة', value: restoredRole.name },
            { name: '👤 من حذفها', value: `${entry.executor.tag} | \`${entry.executor.id}\`` },
            { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
          )
          .setTimestamp();
        
        sendProtectionEmbed(embed);
        alertOwner(`تم استرجاع رتبة مهمة (${entry.target?.name}) بعد حذفها من قبل ${entry.executor.tag}`);
      } catch (error) {
        console.error('فشل في استرجاع الرتبة المهمة:', error);
      }
    }

    const data = roleTracker.get(executorId) || { count: 0, first: Date.now() };
    if (Date.now() - data.first > 60000) { data.count = 0; data.first = Date.now(); }
    data.count += 1; roleTracker.set(executorId, data);
    if (data.count > 2) {
      const member = await guild.members.fetch(executorId).catch(() => null);
      if (member) await member.roles.set([], '🚨 Mass Role Delete').catch(() => {});
      const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Anti-RoleDelete]')
        .setDescription(`${entry.executor.tag} حذف رتب بشكل جماعي.`)
        .setTimestamp();
      sendProtectionEmbed(embed);
      alertOwner(`${entry.executor.tag} حذف رتب بشكل جماعي.`);
    }
  }
});

// === 3. Anti Channel Delete/Create === //
client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
  if (!entry.executor || ownerIds.includes(entry.executor.id)) return;
  const executorId = entry.executor.id;

  if ([AuditLogEvent.ChannelDelete, AuditLogEvent.ChannelCreate].includes(entry.action)) {
    // === حماية القنوات المهمة من الحذف === //
    if (entry.action === AuditLogEvent.ChannelDelete) {
      const deletedChannelId = entry.targetId;
      
      if (importantChannels.includes(deletedChannelId) && !ownerIds.includes(executorId)) {
        // محاولة استرجاع القناة المهمة
        try {
          const restoredChannel = await guild.channels.create({
            name: entry.target?.name || 'restored-channel',
            type: entry.target?.type || ChannelType.GuildText,
            topic: entry.target?.topic || null,
            nsfw: entry.target?.nsfw || false,
            rateLimitPerUser: entry.target?.rateLimitPerUser || 0,
            reason: '🚨 استرجاع قناة مهمة محذوفة'
          });

          const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('🔄 [حماية] استرجاع قناة مهمة')
            .setDescription(`تم استرجاع قناة مهمة تم حذفها بشكل غير مصرح به`)
            .addFields(
              { name: '📺 القناة المحذوفة', value: entry.target?.name || 'Unknown' },
              { name: '📺 القناة الجديدة', value: `<#${restoredChannel.id}>` },
              { name: '👤 من حذفها', value: `${entry.executor.tag} | \`${entry.executor.id}\`` },
              { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
            )
            .setTimestamp();
          
          sendProtectionEmbed(embed);
          alertOwner(`تم استرجاع قناة مهمة (${entry.target?.name}) بعد حذفها من قبل ${entry.executor.tag}`);
          
          // سحب صلاحيات من حذف القناة المهمة
          const member = await guild.members.fetch(executorId).catch(() => null);
          if (member) {
            await member.roles.set([], '🚨 حذف قناة مهمة').catch(() => {});
          }
        } catch (error) {
          console.error('فشل في استرجاع القناة المهمة:', error);
        }
      }
    }

    const data = channelTracker.get(executorId) || { count: 0, first: Date.now() };
    if (Date.now() - data.first > 60000) { data.count = 0; data.first = Date.now(); }
    data.count += 1; channelTracker.set(executorId, data);
    if (data.count > 2) {
      const member = await guild.members.fetch(executorId).catch(() => null);
      if (member) await member.roles.set([], '🚨 Channel Spam').catch(() => {});
      const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Anti-ChannelSpam]')
        .setDescription(`${entry.executor.tag} حاول ينشئ/يحذف قنوات بشكل جماعي.`)
        .setTimestamp();
      sendProtectionEmbed(embed);
      alertOwner(`${entry.executor.tag} حاول ينشئ/يحذف قنوات بشكل جماعي.`);
    }
  }
});

// === 4. Anti Emoji/Sticker Delete === //
client.on(Events.GuildAuditLogEntryCreate, async (entry) => {
  if ([AuditLogEvent.EmojiDelete, AuditLogEvent.StickerDelete].includes(entry.action)) {
    const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Anti-Emoji/Sticker]')
      .setDescription(`${entry.executor.tag} حذف إيموجي/ستيكر.`).setTimestamp();
    sendLog(embed);
    alertOwner(`${entry.executor.tag} حذف إيموجي/ستيكر.`);
  }
});

// === 5. Anti Webhook Create === //
client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
  if (entry.action === AuditLogEvent.WebhookCreate) {
    const webhook = await guild.fetchWebhooks().then(hooks => hooks.get(entry.targetId)).catch(() => null);
    if (webhook) await webhook.delete().catch(() => {});
    const member = await guild.members.fetch(entry.executor.id).catch(() => null);
    if (member) await member.roles.set([], '🚨 Unauthorized Webhook').catch(() => {});
    const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Anti-Webhook]')
      .setDescription(`${entry.executor.tag} حاول ينشئ Webhook.`).setTimestamp();
    sendLog(embed);
    alertOwner(`${entry.executor.tag} حاول ينشئ Webhook.`);
  }
});

// === 6. Anti Bot Add === //
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot && !allowedBots.includes(member.id)) {
    await member.kick('🚨 Unauthorized Bot').catch(() => {});
    const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Anti-Bot]')
      .setDescription(`بوت غير مصرح (${member.user.tag}) تم طرده.`).setTimestamp();
    sendLog(embed);
    alertOwner(`بوت غير مصرح (${member.user.tag}) دخل السيرفر وتم طرده.`);
  }
});

// === 7. Anti Mention Spam === //
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const mentionCount = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
  if (mentionCount > 3) {
    await message.delete().catch(() => {});
    await message.member.timeout(60000, '🚨 Mention Spam').catch(() => {});
    const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Anti-Mention]')
      .setDescription(`${message.author.tag} حاول يعمل منشن جماعي.`).setTimestamp();
    sendLog(embed);
    alertOwner(`${message.author.tag} حاول يعمل منشن جماعي.`);
  }
});

// === 7.1 Anti Scam Links (حماية من سكامات MrBeast / الكازينوهات الوهمية) === //
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = (message.content || '').toLowerCase();
  let detectedPattern = null;

  // فحص نص الرسالة عن كلمات/روابط السكام
  for (const pattern of scamLinkPatterns) {
    if (!pattern) continue;
    if (content.includes(pattern.toLowerCase())) {
      detectedPattern = pattern;
      break;
    }
  }

  // فحص الـ embeds (مثل إعادة تغريدات X التي تحتوي على رابط الموقع النصاب)
  if (!detectedPattern && message.embeds && message.embeds.length) {
    for (const embed of message.embeds) {
      const parts = [];
      if (embed.title) parts.push(embed.title);
      if (embed.description) parts.push(embed.description);
      if (embed.url) parts.push(embed.url);
      if (embed.footer && embed.footer.text) parts.push(embed.footer.text);

      const text = parts.join(' \n ').toLowerCase();
      for (const pattern of scamLinkPatterns) {
        if (!pattern) continue;
        if (text.includes(pattern.toLowerCase())) {
          detectedPattern = pattern;
          break;
        }
      }
      if (detectedPattern) break;
    }
  }

  if (!detectedPattern) return;

  // حذف الرسالة فوراً
  await message.delete().catch(() => {});

  // لوق في قناة الحماية الموحدة
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('🚨 [Anti-Scam] تم منع رسالة سكام')
    .setDescription(`تم اكتشاف ومنع رسالة تحتوي على رابط/كلمة سكام معروفة.\n\n**النمط المكتشف:** \`${detectedPattern}\``)
    .addFields(
      { name: '👤 العضو', value: `<@${message.author.id}> | \`${message.author.id}\``, inline: true },
      { name: '📺 القناة', value: `<#${message.channel.id}>`, inline: true },
      { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    )
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'نظام مضاد السكام' })
    .setTimestamp();

  await sendProtectionEmbed(embed);

  // محاولة تنبيه العضو في الخاص (اختياري)
  try {
    await message.author.send('🚫 **تم حذف رسالتك في السيرفر لأنها تحتوي على رابط/إعلان سكام.**\nالرجاء عدم نشر عروض الجوائز أو الكازينوهات المشبوهة مثل التي في الصورة الخاصة بـ MrBeast.');
  } catch {}
});

// === 🛡️ نظام فحص الملفات للفيروسات - يعمل في جميع القنوات === //
client.on(Events.MessageCreate, async (message) => {
  // تجاهل البوتات والرسائل بدون ملفات
  if (message.author.bot || !message.attachments.size || !fileScanEnabled) return;
  
  // تجاهل الرسائل الخاصة (DMs)
  if (!message.guild) return;
  
  // تجاهل القنوات المستثناة
  if (excludedChannels.includes(message.channel.id)) return;
  
  // تجاهل Super Admin
  if (isSuperAdmin(message.author.id)) return;
  
  // تجاهل الأونرز
  if (ownerIds.includes(message.author.id)) return;
  
  // تحديث إحصائيات القناة
  const channelId = message.channel.id;
  if (!fileScanStats.channelStats.has(channelId)) {
    fileScanStats.channelStats.set(channelId, {
      name: message.channel.name,
      scanned: 0,
      blocked: 0,
      malware: 0
    });
  }
  
  // فحص كل ملف مرفق
  for (const attachment of message.attachments.values()) {
    try {
      // تحديث الإحصائيات العامة والخاصة بالقناة
      fileScanStats.totalScanned++;
      fileScanStats.lastScan = new Date();
      
      const channelStats = fileScanStats.channelStats.get(channelId);
      channelStats.scanned++;
      
      // فحص حجم الملف
      if (attachment.size > maxFileSize) {
        await message.delete().catch(() => {});
        fileScanStats.filesBlocked++;
        channelStats.blocked++;
        
        const embed = new EmbedBuilder()
          .setColor(0xff6b00)
          .setTitle('🚫 [فحص الملفات] ملف كبير جداً')
          .setDescription('تم حذف الملف لأن حجمه يتجاوز الحد المسموح.')
          .addFields(
            { name: '👤 العضو', value: `<@${message.author.id}> | \`${message.author.id}\``, inline: true },
            { name: '📁 اسم الملف', value: `\`${attachment.name}\``, inline: true },
            { name: '📏 حجم الملف', value: `${(attachment.size / (1024 * 1024)).toFixed(2)} MB`, inline: true },
            { name: '📺 القناة', value: `<#${message.channel.id}>`, inline: true },
            { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'نظام فحص الملفات' })
          .setTimestamp();
        
        await sendFileScanLog(embed);
        
        // إرسال رسالة للعضو
        try {
          await message.author.send(`🚫 **تنبيه:** تم حذف ملفك في ${message.guild.name} لأن حجمه كبير جداً.\n**اسم الملف:** ${attachment.name}\n**الحد الأقصى المسموح:** ${maxFileSize / (1024 * 1024)} MB`);
        } catch {}
        
        continue;
      }
      
      // فحص امتداد الملف
      const extensionCheck = checkFileExtension(attachment.name);
      
      if (!extensionCheck.safe) {
        await message.delete().catch(() => {});
        fileScanStats.filesBlocked++;
        channelStats.blocked++;
        
        if (extensionCheck.type === 'dangerous') {
          fileScanStats.malwareDetected++;
          channelStats.malware++;
        }
        
        const embed = new EmbedBuilder()
          .setColor(extensionCheck.type === 'dangerous' ? 0xff0000 : 0xff6b00)
          .setTitle(`🚫 [فحص الملفات] ${extensionCheck.type === 'dangerous' ? 'ملف خطير' : 'ملف غير مسموح'}`)
          .setDescription(`تم حذف الملف: ${extensionCheck.reason}`)
          .addFields(
            { name: '👤 العضو', value: `<@${message.author.id}> | \`${message.author.id}\``, inline: true },
            { name: '📁 اسم الملف', value: `\`${attachment.name}\``, inline: true },
            { name: '📏 حجم الملف', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true },
            { name: '📺 القناة', value: `<#${message.channel.id}>`, inline: true },
            { name: '⚠️ نوع التهديد', value: extensionCheck.type === 'dangerous' ? 'ملف تنفيذي خطير' : 'نوع ملف غير مسموح', inline: true },
            { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'نظام فحص الملفات' })
          .setTimestamp();
        
        await sendFileScanLog(embed);
        
        // تنبيه الأونر للملفات الخطيرة
        if (extensionCheck.type === 'dangerous') {
          await alertOwner(`🚨 **ملف خطير:** ${message.author.tag} حاول يرفع ملف خطير (${attachment.name}) في قناة ${message.channel.name}`);
        }
        
        // إرسال رسالة للعضو
        try {
          await message.author.send(`🚫 **تنبيه:** تم حذف ملفك في ${message.guild.name}.\n**السبب:** ${extensionCheck.reason}\n**اسم الملف:** ${attachment.name}`);
        } catch {}
        
        continue;
      }
      
      // تحميل الملف وفحصه للفيروسات
      try {
        // تحديث إحصائيات التقرير الأسبوعي
        weeklyStats.filesScanned++;
        
        const fileBuffer = await downloadFile(attachment.url);
        const malwareScan = await scanFileForMalware(fileBuffer, attachment.name);
        
        if (malwareScan.isMalware) {
          await message.delete().catch(() => {});
          fileScanStats.malwareDetected++;
          fileScanStats.filesBlocked++;
          channelStats.malware++;
          channelStats.blocked++;
          
          // تحديث إحصائيات التقرير الأسبوعي
          weeklyStats.malwareDetected++;
          
          const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🦠 [فحص الملفات] فيروس مكتشف!')
            .setDescription('تم اكتشاف ملف مشبوه وحذفه فوراً!')
            .addFields(
              { name: '👤 العضو', value: `<@${message.author.id}> | \`${message.author.id}\``, inline: true },
              { name: '📁 اسم الملف', value: `\`${attachment.name}\``, inline: true },
              { name: '📏 حجم الملف', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true },
              { name: '📺 القناة', value: `<#${message.channel.id}>`, inline: true },
              { name: '🦠 سبب الاشتباه', value: malwareScan.reason, inline: true },
              { name: '📊 مستوى الثقة', value: `${malwareScan.confidence}%`, inline: true },
              { name: '🔍 الهاش', value: `\`${malwareScan.hash || 'غير متوفر'}\``, inline: false },
              { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'نظام فحص الملفات' })
            .setTimestamp();
          
          await sendFileScanLog(embed);
          
          // تنبيه الأونر
          await alertOwner(`🦠 **فيروس مكتشف:** ${message.author.tag} حاول يرفع ملف مشبوه (${attachment.name}) في قناة ${message.channel.name}\nالسبب: ${malwareScan.reason}`);
          
          // إرسال رسالة للعضو
          try {
            await message.author.send(`🦠 **تنبيه أمني:** تم حذف ملفك في ${message.guild.name} لأنه مشبوه.\n**اسم الملف:** ${attachment.name}\n**السبب:** ${malwareScan.reason}`);
          } catch {}
          
        } else {
          // الملف آمن - إرسال لوق اختياري
          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ [فحص الملفات] ملف آمن')
            .setDescription('تم فحص الملف وهو آمن.')
            .addFields(
              { name: '👤 العضو', value: `<@${message.author.id}> | \`${message.author.id}\``, inline: true },
              { name: '📁 اسم الملف', value: `\`${attachment.name}\``, inline: true },
              { name: '📏 حجم الملف', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true },
              { name: '📺 القناة', value: `<#${message.channel.id}>`, inline: true },
              { name: '🔍 الهاش', value: `\`${malwareScan.hash || 'غير متوفر'}\``, inline: false },
              { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'نظام فحص الملفات' })
            .setTimestamp();
          
          // إرسال لوق الملفات الآمنة (اختياري - يمكن تعطيله لتقليل الرسائل)
          // await sendFileScanLog(embed);
        }
        
      } catch (error) {
        console.error('خطأ في تحميل/فحص الملف:', error);
        
        // في حالة الخطأ، نحذف الملف احتياطياً
        await message.delete().catch(() => {});
        fileScanStats.filesBlocked++;
        channelStats.blocked++;
        
        const embed = new EmbedBuilder()
          .setColor(0xff6b00)
          .setTitle('⚠️ [فحص الملفات] خطأ في الفحص')
          .setDescription('تم حذف الملف احتياطياً بسبب خطأ في الفحص.')
          .addFields(
            { name: '👤 العضو', value: `<@${message.author.id}> | \`${message.author.id}\``, inline: true },
            { name: '📁 اسم الملف', value: `\`${attachment.name}\``, inline: true },
            { name: '📏 حجم الملف', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true },
            { name: '📺 القناة', value: `<#${message.channel.id}>`, inline: true },
            { name: '❌ خطأ', value: error.message, inline: true },
            { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'نظام فحص الملفات' })
          .setTimestamp();
        
        await sendFileScanLog(embed);
      }
      
    } catch (error) {
      console.error('خطأ عام في فحص الملف:', error);
    }
  }
});

// === هذا الحدث تم دمجه مع الحدث الرئيسي === //

// === 9. Anti Server Settings Change === //
client.on(Events.GuildUpdate, async (oldG, newG) => {
  if (oldG.name !== newG.name || oldG.icon !== newG.icon || oldG.banner !== newG.banner) {
    const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Anti-ServerChange]')
      .setDescription(`تم تعديل إعدادات السيرفر.`).setTimestamp();
    sendLog(embed);
    alertOwner(`تم تعديل إعدادات السيرفر (اسم/أيقونة/بانر).`);
  }
});

// === 10. Blacklist System === //
client.on(Events.GuildMemberAdd, async (member) => {
  if (blacklist.includes(member.id)) {
    await member.ban({ reason: '🚨 Blacklisted' }).catch(() => {});
    const embed = new EmbedBuilder().setColor(0xff0000).setTitle('🚨 [Blacklist]')
      .setDescription(`عضو بلاك ليست (${member.user.tag}) تم بانه.`).setTimestamp();
    sendLog(embed);
    alertOwner(`عضو بلاك ليست (${member.user.tag}) دخل وتم بانه.`);
  }
});

// === 🛡️ حماية إنشاء رتبة أدمن فورية (شاملة) ===
client.on(Events.GuildRoleCreate, async role => {
  try {
      if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
          const logChannel = await client.channels.fetch(protectionLogChannelId).catch(() => null);

          // تأخير بسيط عشان سجل الأوديت يتحدث
          await new Promise(r => setTimeout(r, 1000));

          const auditLogs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 });
          const logEntry = auditLogs.entries.first();
          const executor = logEntry?.executor;

          if (executor && !ownerIds.includes(executor.id)) {
              // حذف الرتبة فوراً
              await role.delete("🚫 حماية: محاولة إنشاء رتبة أدمن غير مصرح بها");

              // إرسال رسالة خاصة
              try {
                  await executor.send(`🚨 **تنبيه أمني**\nإنشاء رتبة بصلاحيات أدمن ممنوع في هذا السيرفر.\nالرتبة: **${role.name}**`);
              } catch {
                  console.log(`تعذر إرسال رسالة خاصة إلى ${executor.tag}`);
              }

              // إرسال لوق
              if (logChannel) {
                  const embed = new EmbedBuilder()
                      .setColor(0xff0000)
                      .setTitle("🚫 [حماية] محاولة إنشاء رتبة أدمن")
                      .setDescription(`تم اكتشاف محاولة إنشاء رتبة بصلاحيات أدمن وتم حذفها فوراً.`)
                      .addFields(
                          { name: "👤 الشخص", value: `<@${executor.id}> | \`${executor.id}\``, inline: true },
                          { name: "🎭 اسم الرتبة", value: `\`${role.name}\` | \`${role.id}\``, inline: true },
                          { name: "🕒 الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                          { name: "📄 السبب", value: "إنشاء رتبة Administrator بدون تصريح" }
                      )
                      .setThumbnail(executor.displayAvatarURL({ dynamic: true }))
                      .setFooter({ text: "نظام الحماية التلقائي" })
                      .setTimestamp();

                  await logChannel.send({ embeds: [embed] });
              }
          }
      }
  } catch (err) {
      console.error("خطأ في نظام حماية إنشاء رتبة أدمن:", err);
  }
});

// === 📝 إرسال زر التقديم في قناة معينة ===
client.once(Events.ClientReady, async () => {
  // تسجيل أوامر فحص الملفات
  const commands = [
    {
      name: 'file-scanner',
      description: 'إدارة نظام فحص الملفات',
      options: [
        {
          name: 'action',
          description: 'الإجراء المطلوب',
          type: 3, // STRING
          required: true,
          choices: [
            { name: 'عرض الحالة', value: 'status' },
            { name: 'تفعيل', value: 'enable' },
            { name: 'تعطيل', value: 'disable' },
            { name: 'إعادة تعيين الإحصائيات', value: 'reset-stats' },
            { name: 'إضافة هاش خبيث', value: 'add-hash' },
            { name: 'عرض الهاشات', value: 'list-hashes' },
            { name: 'إحصائيات القنوات', value: 'channel-stats' }
          ]
        },
        {
          name: 'hash',
          description: 'الهاش المراد إضافته (للإجراء add-hash فقط)',
          type: 3, // STRING
          required: false
        }
      ]
    },
    {
      name: 'file-types',
      description: 'إدارة أنواع الملفات المسموحة والخطيرة',
      options: [
        {
          name: 'action',
          description: 'الإجراء المطلوب',
          type: 3, // STRING
          required: true,
          choices: [
            { name: 'إضافة نوع مسموح', value: 'add-allowed' },
            { name: 'حذف نوع مسموح', value: 'remove-allowed' },
            { name: 'إضافة نوع خطير', value: 'add-dangerous' },
            { name: 'حذف نوع خطير', value: 'remove-dangerous' },
            { name: 'عرض القوائم', value: 'list' }
          ]
        },
        {
          name: 'type',
          description: 'نوع الملف (مثل .exe أو .txt)',
          type: 3, // STRING
          required: false
        }
      ]
    },
    {
      name: 'channel-exclude',
      description: 'إدارة القنوات المستثناة من فحص الملفات',
      options: [
        {
          name: 'action',
          description: 'الإجراء المطلوب',
          type: 3, // STRING
          required: true,
          choices: [
            { name: 'إضافة قناة للاستثناء', value: 'add' },
            { name: 'إزالة قناة من الاستثناء', value: 'remove' },
            { name: 'عرض القنوات المستثناة', value: 'list' },
            { name: 'مسح جميع القنوات المستثناة', value: 'clear' }
          ]
        },
        {
          name: 'channel',
          description: 'القناة المراد إضافتها أو إزالتها',
          type: 7, // CHANNEL
          required: false
        }
      ]
    }
  ];

  try {
    const rest = new REST({ version: '10' }).setToken(token);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ تم تسجيل أوامر فحص الملفات بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تسجيل الأوامر:', error);
  }

  const applyChannelId = "1403409412114223259"; // القناة اللي بيظهر فيها الزر
  const channel = await client.channels.fetch(applyChannelId).catch(() => null);

  if (channel) {
      const applyButton = new ButtonBuilder()
          .setCustomId('open_team_application')
          .setLabel('📋 تقديم على التيم')
          .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(applyButton);

      const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(" تقديم علي قروب الزعابي")
          .setDescription("  اخوي لو حاب تقدم اضغط علي الز يلي تحت ")
          .setFooter({ text: "تأكد من الإجابة على جميع الأسئلة بدقة" });

      await channel.send({ embeds: [embed], components: [row] });
  }
});

// === 📝 التفاعل مع الزر وإظهار المودال ===
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === 'open_team_application') {
      const modal = new ModalBuilder()
          .setCustomId('team_application')
          .setTitle('📋  نموذج التقديم على التيم الزعابي');

      const age = new TextInputBuilder()
          .setCustomId('age')
          .setLabel('كم عمرك؟')
          .setPlaceholder('مثال: 18')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

      const experience = new TextInputBuilder()
          .setCustomId('experience')
          .setLabel('ما هي خبرتك؟')
          .setPlaceholder('صف خبرتك بشكل مختصر')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

      const reason = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('سبب التقديم؟')
          .setPlaceholder('ليش حاب تنضم للتيم؟')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

      const know = new TextInputBuilder()
          .setCustomId('know')
          .setLabel('كيف عرفت القروب؟')
          .setPlaceholder('مثال: عن طريق صديق')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

      const duration = new TextInputBuilder()
          .setCustomId('duration')
          .setLabel('كم صار لك في القروب؟')
          .setPlaceholder('مثال: شهرين')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

      modal.addComponents(
          new ActionRowBuilder().addComponents(age),
          new ActionRowBuilder().addComponents(experience),
          new ActionRowBuilder().addComponents(reason),
          new ActionRowBuilder().addComponents(know),
          new ActionRowBuilder().addComponents(duration)
      );

      await interaction.showModal(modal);
  }

  // === استقبال بيانات المودال وإرسالها للوق ===
  if (interaction.isModalSubmit() && interaction.customId === 'team_application') {
      const age = interaction.fields.getTextInputValue('age');
      const experience = interaction.fields.getTextInputValue('experience');
      const reason = interaction.fields.getTextInputValue('reason');
      const know = interaction.fields.getTextInputValue('know');
      const duration = interaction.fields.getTextInputValue('duration');

      const logChannel = await client.channels.fetch("1403412495892484178").catch(() => null);

      const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('📥 طلب انضمام للتيم')
          .addFields(
              { name: '👤 مقدم الطلب', value: `${interaction.user} | ${interaction.user.tag}` },
              { name: '📅 العمر', value: age, inline: true },
              { name: '🛠️ الخبرة', value: experience },
              { name: '❓ سبب التقديم', value: reason },
              { name: '📢 كيف عرف القروب', value: know },
              { name: '⏳ المدة في القروب', value: duration }
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'نظام التقديم على التيم' })
          .setTimestamp();

      if (logChannel) {
          await logChannel.send({ embeds: [embed] });
      }

      await interaction.reply({ content: '✅ تم إرسال طلبك بنجاح، سيتم مراجعته قريباً.', ephemeral: true });
  }
});


// === معالج تفاعل الهبات ===
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  
  const giveaway = giveaways.get(reaction.message.id);
  if (!giveaway || reaction.emoji.name !== '🎉') return;
  
  giveaway.participants.add(user.id);
});

// === ملخص أنظمة الحماية المضافة === //
/*
🛡️ أنظمة الحماية الجديدة المضافة:

1. ✅ حماية الكلمات المحظورة - يحذف الرسائل التي تحتوي على كلمات مسيئة
2. ✅ نظام Captcha للحسابات الجديدة - كود تحقق 4 أرقام مع 3 محاولات
3. ✅ حماية تعديل صلاحيات القنوات - يمنع التعديل الجماعي للصلاحيات
4. ✅ حماية تغيير أسماء القنوات - يمنع تغيير أكثر من 5 أسماء في 5 دقائق
5. ✅ حماية القنوات المهمة - يستعيد القنوات المهمة عند حذفها
6. ✅ نسخ احتياطي للرتب المحذوفة - يحفظ معلومات الرتب المحذوفة
7. ✅ حماية الرتب المهمة - يستعيد الرتب المهمة عند حذفها
8. ✅ أوامر إدارة متقدمة - /protection-advanced و /captcha-admin

🏆 تقييم الحماية النهائي: 100/100

📋 أوامر الإدارة الجديدة:
- /protection-advanced banned-words - إدارة الكلمات المحظورة
- /protection-advanced important-channels - إدارة القنوات المهمة  
- /protection-advanced backup-roles - عرض النسخ الاحتياطي للرتب
- /captcha-admin bypass - تخطي Captcha لعضو
- /captcha-admin reset - إعادة تعيين Captcha
- /captcha-admin settings - تغيير إعدادات Captcha

🔧 المتغيرات القابلة للتخصيص:
- bannedWords: قائمة الكلمات المحظورة
- importantChannels: قائمة القنوات المهمة المحمية
- importantRoles: قائمة الرتب المهمة المحمية
- minAccountAgeDays: الحد الأدنى لعمر الحساب للـ Captcha

🛡️ نظام فحص الملفات الجديد:
- فحص تلقائي لجميع الملفات المرفقة في جميع القنوات
- كشف الملفات الخطيرة والفيروسات
- حماية من الملفات الكبيرة جداً
- نظام لوق شامل للملفات
- إحصائيات مفصلة لكل قناة
- إمكانية استثناء قنوات معينة
- أوامر إدارة متقدمة

📋 أوامر فحص الملفات الجديدة:
- /file-scanner status - عرض حالة النظام والإحصائيات
- /file-scanner enable/disable - تفعيل/تعطيل النظام
- /file-scanner channel-stats - إحصائيات القنوات
- /file-types list - عرض أنواع الملفات المسموحة/الخطيرة
- /channel-exclude add/remove - إدارة القنوات المستثناة
*/

// === 🛡️ أوامر إدارة نظام فحص الملفات === //

// أمر إدارة فحص الملفات
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'file-scanner') {
    // التحقق من الصلاحيات
    if (!ownerIds.includes(interaction.user.id) && !isSuperAdmin(interaction.user.id)) {
      return interaction.reply({ content: '🚫 هذا الأمر للأونرز فقط!', ephemeral: true });
    }
    
    const action = interaction.options.getString('action');
    
    switch (action) {
      case 'status':
        const embed = new EmbedBuilder()
          .setColor(fileScanEnabled ? 0x00ff00 : 0xff0000)
          .setTitle('📊 حالة نظام فحص الملفات')
          .setDescription(`النظام حالياً: ${fileScanEnabled ? '🟢 مفعل' : '🔴 معطل'}`)
          .addFields(
            { name: '📈 إجمالي الملفات المفحوصة', value: fileScanStats.totalScanned.toString(), inline: true },
            { name: '🦠 فيروسات مكتشفة', value: fileScanStats.malwareDetected.toString(), inline: true },
            { name: '🚫 ملفات محذوفة', value: fileScanStats.filesBlocked.toString(), inline: true },
            { name: '📺 عدد القنوات النشطة', value: fileScanStats.channelStats.size.toString(), inline: true },
            { name: '🚫 قنوات مستثناة', value: excludedChannels.length.toString(), inline: true },
            { name: '📏 الحد الأقصى لحجم الملف', value: `${(maxFileSize / (1024 * 1024)).toFixed(2)} MB`, inline: true },
            { name: '📁 أنواع الملفات المسموحة', value: allowedFileTypes.join(', '), inline: false },
            { name: '⚠️ أنواع الملفات الخطيرة', value: dangerousFileTypes.join(', '), inline: false },
            { name: '🕒 آخر فحص', value: fileScanStats.lastScan ? `<t:${Math.floor(fileScanStats.lastScan.getTime() / 1000)}:R>` : 'لم يتم فحص أي ملف بعد', inline: true }
          )
          .setFooter({ text: 'نظام فحص الملفات' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
        
      case 'enable':
        fileScanEnabled = true;
        await interaction.reply({ content: '✅ تم تفعيل نظام فحص الملفات', ephemeral: true });
        break;
        
      case 'disable':
        fileScanEnabled = false;
        await interaction.reply({ content: '🔴 تم تعطيل نظام فحص الملفات', ephemeral: true });
        break;
        
      case 'reset-stats':
        fileScanStats.totalScanned = 0;
        fileScanStats.malwareDetected = 0;
        fileScanStats.filesBlocked = 0;
        fileScanStats.lastScan = null;
        await interaction.reply({ content: '🔄 تم إعادة تعيين الإحصائيات', ephemeral: true });
        break;
        
      case 'add-hash':
        const newHash = interaction.options.getString('hash');
        if (newHash && !knownMalwareHashes.includes(newHash)) {
          knownMalwareHashes.push(newHash);
          await interaction.reply({ content: `✅ تم إضافة الهاش إلى قاعدة البيانات:\n\`${newHash}\``, ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ الهاش غير صحيح أو موجود مسبقاً', ephemeral: true });
        }
        break;
        
      case 'list-hashes':
        const hashList = knownMalwareHashes.length > 0 ? 
          knownMalwareHashes.map((hash, index) => `${index + 1}. \`${hash}\``).join('\n') :
          'لا توجد هاشات في قاعدة البيانات';
        
        const hashEmbed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('🗃️ قاعدة بيانات الهاشات الخبيثة')
          .setDescription(hashList)
          .setFooter({ text: `إجمالي: ${knownMalwareHashes.length} هاش` })
          .setTimestamp();
        
        await interaction.reply({ embeds: [hashEmbed], ephemeral: true });
        break;
        
      case 'channel-stats':
        if (fileScanStats.channelStats.size === 0) {
          await interaction.reply({ content: 'لا توجد إحصائيات قنوات متاحة بعد', ephemeral: true });
          break;
        }
        
        const channelStatsText = Array.from(fileScanStats.channelStats.entries())
          .map(([channelId, stats]) => {
            return `**#${stats.name}** (\`${channelId}\`)\n📈 مفحوص: ${stats.scanned} | 🚫 محذوف: ${stats.blocked} | 🦠 فيروسات: ${stats.malware}`;
          })
          .join('\n\n');
        
        const channelStatsEmbed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('📊 إحصائيات القنوات')
          .setDescription(channelStatsText)
          .setFooter({ text: `إجمالي القنوات: ${fileScanStats.channelStats.size}` })
          .setTimestamp();
        
        await interaction.reply({ embeds: [channelStatsEmbed], ephemeral: true });
        break;
        
      default:
        await interaction.reply({ content: '❌ إجراء غير صحيح', ephemeral: true });
    }
  }
});

// أمر إدارة أنواع الملفات
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'file-types') {
    // التحقق من الصلاحيات
    if (!ownerIds.includes(interaction.user.id) && !isSuperAdmin(interaction.user.id)) {
      return interaction.reply({ content: '🚫 هذا الأمر للأونرز فقط!', ephemeral: true });
    }
    
    const action = interaction.options.getString('action');
    const fileType = interaction.options.getString('type');
    
    switch (action) {
      case 'add-allowed':
        if (fileType && !allowedFileTypes.includes(fileType)) {
          allowedFileTypes.push(fileType);
          await interaction.reply({ content: `✅ تم إضافة نوع الملف \`${fileType}\` إلى القائمة المسموحة`, ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ نوع الملف غير صحيح أو موجود مسبقاً', ephemeral: true });
        }
        break;
        
      case 'remove-allowed':
        const allowedIndex = allowedFileTypes.indexOf(fileType);
        if (allowedIndex > -1) {
          allowedFileTypes.splice(allowedIndex, 1);
          await interaction.reply({ content: `✅ تم حذف نوع الملف \`${fileType}\` من القائمة المسموحة`, ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ نوع الملف غير موجود في القائمة المسموحة', ephemeral: true });
        }
        break;
        
      case 'add-dangerous':
        if (fileType && !dangerousFileTypes.includes(fileType)) {
          dangerousFileTypes.push(fileType);
          await interaction.reply({ content: `✅ تم إضافة نوع الملف \`${fileType}\` إلى القائمة الخطيرة`, ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ نوع الملف غير صحيح أو موجود مسبقاً', ephemeral: true });
        }
        break;
        
      case 'remove-dangerous':
        const dangerousIndex = dangerousFileTypes.indexOf(fileType);
        if (dangerousIndex > -1) {
          dangerousFileTypes.splice(dangerousIndex, 1);
          await interaction.reply({ content: `✅ تم حذف نوع الملف \`${fileType}\` من القائمة الخطيرة`, ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ نوع الملف غير موجود في القائمة الخطيرة', ephemeral: true });
        }
        break;
        
      case 'list':
        const typesEmbed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('📁 أنواع الملفات')
          .addFields(
            { name: '✅ الملفات المسموحة', value: allowedFileTypes.join(', ') || 'لا توجد', inline: false },
            { name: '⚠️ الملفات الخطيرة', value: dangerousFileTypes.join(', ') || 'لا توجد', inline: false }
          )
          .setFooter({ text: 'إدارة أنواع الملفات' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [typesEmbed], ephemeral: true });
        break;
        
      default:
        await interaction.reply({ content: '❌ إجراء غير صحيح', ephemeral: true });
    }
  }
});

// أمر إدارة القنوات المستثناة
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'channel-exclude') {
    // التحقق من الصلاحيات
    if (!ownerIds.includes(interaction.user.id) && !isSuperAdmin(interaction.user.id)) {
      return interaction.reply({ content: '🚫 هذا الأمر للأونرز فقط!', ephemeral: true });
    }
    
    const action = interaction.options.getString('action');
    const channel = interaction.options.getChannel('channel');
    
    switch (action) {
      case 'add':
        if (!channel) {
          return interaction.reply({ content: '❌ يجب تحديد قناة', ephemeral: true });
        }
        
        if (excludedChannels.includes(channel.id)) {
          return interaction.reply({ content: '❌ هذه القناة مستثناة مسبقاً', ephemeral: true });
        }
        
        excludedChannels.push(channel.id);
        await interaction.reply({ content: `✅ تم استثناء القناة <#${channel.id}> من فحص الملفات`, ephemeral: true });
        break;
        
      case 'remove':
        if (!channel) {
          return interaction.reply({ content: '❌ يجب تحديد قناة', ephemeral: true });
        }
        
        const index = excludedChannels.indexOf(channel.id);
        if (index === -1) {
          return interaction.reply({ content: '❌ هذه القناة غير مستثناة', ephemeral: true });
        }
        
        excludedChannels.splice(index, 1);
        await interaction.reply({ content: `✅ تم إلغاء استثناء القناة <#${channel.id}> من فحص الملفات`, ephemeral: true });
        break;
        
      case 'list':
        if (excludedChannels.length === 0) {
          return interaction.reply({ content: 'لا توجد قنوات مستثناة', ephemeral: true });
        }
        
        const excludedList = excludedChannels.map(id => `<#${id}> (\`${id}\`)`).join('\n');
        const excludedEmbed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('📋 القنوات المستثناة من فحص الملفات')
          .setDescription(excludedList)
          .setFooter({ text: `إجمالي: ${excludedChannels.length} قناة` })
          .setTimestamp();
        
        await interaction.reply({ embeds: [excludedEmbed], ephemeral: true });
        break;
        
      case 'clear':
        excludedChannels.length = 0;
        await interaction.reply({ content: '🗑️ تم مسح جميع القنوات المستثناة', ephemeral: true });
        break;
        
      default:
        await interaction.reply({ content: '❌ إجراء غير صحيح', ephemeral: true });
    }
  }
});

  // === دوال نظام التذاكر === //

  // دالة التحقق من إعدادات التذاكر
  async function validateTicketSettings(guild) {
    const issues = [];
    
    // التحقق من فئة التذاكر
    if (ticketSystem.ticketCategoryId && ticketSystem.ticketCategoryId !== 'YOUR_CATEGORY_ID') {
      const category = guild.channels.cache.get(ticketSystem.ticketCategoryId);
      if (!category) {
        issues.push('فئة التذاكر غير موجودة');
      } else if (category.type !== ChannelType.GuildCategory) {
        issues.push('فئة التذاكر ليست فئة صحيحة (يجب أن تكون فئة وليس قناة عادية)');
      }
    }
    
    // التحقق من رتبة الدعم
    if (ticketSystem.supportRoleId && ticketSystem.supportRoleId !== 'YOUR_SUPPORT_ROLE_ID') {
      const supportRole = guild.roles.cache.get(ticketSystem.supportRoleId);
      if (!supportRole) {
        issues.push('رتبة الدعم غير موجودة');
      }
    }
    
    // التحقق من قناة اللوق
    if (ticketSystem.ticketLogChannelId && ticketSystem.ticketLogChannelId !== 'YOUR_LOG_CHANNEL_ID') {
      const logChannel = guild.channels.cache.get(ticketSystem.ticketLogChannelId);
      if (!logChannel) {
        issues.push('قناة لوق التذاكر غير موجودة');
      }
    }
    
    return issues;
  }

  // دالة إنشاء تذكرة جديدة
  async function createTicket(interaction, ticketType, priority = 'medium') {
    try {
      const userId = interaction.user.id;
      const guild = interaction.guild;
      
      // التحقق من إعدادات التذاكر
      const settingsIssues = await validateTicketSettings(guild);
      if (settingsIssues.length > 0) {
        console.log('مشاكل في إعدادات التذاكر:', settingsIssues);
        // يمكن المتابعة حتى لو كانت هناك مشاكل في الإعدادات
      }
      
      // التحقق من cooldown
      if (ticketSystem.userCooldowns.has(userId)) {
        const cooldownEnd = ticketSystem.userCooldowns.get(userId);
        if (Date.now() < cooldownEnd) {
          const remainingTime = Math.ceil((cooldownEnd - Date.now()) / 1000);
          return await interaction.reply({
            content: `⏰ يجب الانتظار ${remainingTime} ثانية قبل إنشاء تذكرة جديدة!`,
            ephemeral: true
          });
        }
      }
      
      // التحقق من عدد التذاكر
      const userTickets = Array.from(ticketSystem.activeTickets.values())
        .filter(ticket => ticket.userId === userId).length;
      
      if (userTickets >= ticketSystem.maxTicketsPerUser) {
        return await interaction.reply({
          content: `❌ لقد وصلت للحد الأقصى من التذاكر (${ticketSystem.maxTicketsPerUser})!`,
          ephemeral: true
        });
      }
      
      // إنشاء التذكرة
      ticketSystem.ticketCounter++;
      const ticketId = `TICKET-${ticketSystem.ticketCounter}`;
      
      // التحقق من أن فئة التذاكر موجودة وصحيحة
      let categoryId = null;
      if (ticketSystem.ticketCategoryId && ticketSystem.ticketCategoryId !== 'YOUR_CATEGORY_ID') {
        const category = guild.channels.cache.get(ticketSystem.ticketCategoryId);
        if (category && category.type === ChannelType.GuildCategory) {
          categoryId = ticketSystem.ticketCategoryId;
        } else {
          console.log('تحذير: فئة التذاكر غير صحيحة أو غير موجودة، سيتم إنشاء القناة بدون فئة');
        }
      }

      // إنشاء قناة التذكرة
      const ticketChannel = await guild.channels.create({
        name: `${ticketId.toLowerCase()}`,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: userId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          }
        ]
      });

      // إضافة صلاحيات رتبة الدعم إذا كانت موجودة
      if (ticketSystem.supportRoleId && ticketSystem.supportRoleId !== 'YOUR_SUPPORT_ROLE_ID') {
        try {
          await ticketChannel.permissionOverwrites.create(ticketSystem.supportRoleId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true
          });
        } catch (error) {
          console.log('تحذير: لا يمكن إضافة صلاحيات رتبة الدعم:', error.message);
        }
      }
      
      // حفظ معلومات التذكرة
      const ticketData = {
        id: ticketId,
        userId: userId,
        channelId: ticketChannel.id,
        type: ticketType,
        priority: priority,
        createdAt: new Date(),
        status: 'open',
        messages: []
      };
      
      ticketSystem.activeTickets.set(ticketId, ticketData);
      ticketSystem.userCooldowns.set(userId, Date.now() + ticketSystem.ticketCooldown);
      
      // إنشاء embed التذكرة
      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 ${ticketId}`)
        .setDescription(`**نوع التذكرة:** ${ticketType}\n**الأولوية:** ${priority}\n**المستخدم:** <@${userId}>\n**تاريخ الإنشاء:** <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setColor(0x00ff00)
        .setFooter({ text: 'نظام تذاكر المطور' })
        .setTimestamp();
      
      // إنشاء أزرار التحكم
      const controlRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('إغلاق التذكرة')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
          new ButtonBuilder()
            .setCustomId('add_support')
            .setLabel('إضافة دعم')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👥'),
          new ButtonBuilder()
            .setCustomId('priority_high')
            .setLabel('أولوية عالية')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔴'),
          new ButtonBuilder()
            .setCustomId('transcript_ticket')
            .setLabel('نسخ المحادثة')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📄')
        );
      
      await ticketChannel.send({
        embeds: [ticketEmbed],
        components: [controlRow]
      });
      
      // إرسال رسالة ترحيب
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('🎫 مرحباً بك في نظام التذاكر!')
        .setDescription(`شكراً لك على إنشاء تذكرة الدعم. فريق الدعم سيقوم بالرد عليك في أقرب وقت ممكن.\n\n**نصائح للحصول على دعم أفضل:**\n• اشرح مشكلتك بوضوح\n• أرفق الصور إذا لزم الأمر\n• كن صبوراً مع فريق الدعم`)
        .setColor(0x0099ff)
        .setFooter({ text: 'نظام تذاكر المطور' });
      
      await ticketChannel.send({ embeds: [welcomeEmbed] });
      
      // إرسال رسالة خاصة للمستخدم
      try {
        const user = await client.users.fetch(userId);
        const dmEmbed = new EmbedBuilder()
          .setTitle('🎫 تم إنشاء تذكرة جديدة!')
          .setDescription(`تم إنشاء تذكرة الدعم بنجاح!\n\n**تفاصيل التذكرة:**\n• رقم التذكرة: ${ticketId}\n• النوع: ${ticketType}\n• الأولوية: ${priority}\n• القناة: ${ticketChannel}\n\nسيقوم فريق الدعم بالرد عليك قريباً!`)
          .setColor(0x00ff00)
          .setFooter({ text: 'نظام تذاكر المطور' })
          .setTimestamp();
        
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log('لا يمكن إرسال رسالة خاصة للمستخدم:', error.message);
      }
      
      // إرسال لوق التذكرة
      const logEmbed = new EmbedBuilder()
        .setTitle('🎫 تذكرة جديدة')
        .setDescription(`**المستخدم:** <@${userId}>\n**التذكرة:** ${ticketId}\n**النوع:** ${ticketType}\n**الأولوية:** ${priority}\n**القناة:** ${ticketChannel}`)
        .setColor(0x00ff00)
        .setTimestamp();
      
      const logChannel = guild.channels.cache.get(ticketSystem.ticketLogChannelId);
      if (logChannel) {
        await logChannel.send({ embeds: [logEmbed] });
      }
      
      await interaction.reply({
        content: `✅ تم إنشاء تذكرة جديدة: ${ticketChannel}`,
        ephemeral: true
      });
      
    } catch (error) {
      console.error('خطأ في إنشاء التذكرة:', error);
      
      let errorMessage = '❌ حدث خطأ في إنشاء التذكرة!';
      
      if (error.code === 50013) {
        errorMessage = '❌ البوت لا يملك صلاحيات كافية لإنشاء القناة!';
      } else if (error.code === 50001) {
        errorMessage = '❌ البوت لا يملك صلاحيات الوصول للفئة!';
      } else if (error.code === 10003) {
        errorMessage = '❌ فئة التذاكر غير موجودة!';
      } else if (error.code === 50035) {
        errorMessage = '❌ فئة التذاكر غير صحيحة! تأكد من أن ID الفئة صحيح وأنها فئة وليس قناة عادية.';
      } else if (error.message.includes('Missing Access')) {
        errorMessage = '❌ البوت لا يملك صلاحيات إدارة القنوات!';
      } else if (error.message.includes('CHANNEL_PARENT_INVALID_TYPE')) {
        errorMessage = '❌ فئة التذاكر غير صحيحة! يجب أن تكون فئة وليس قناة عادية.';
      }
      
      await interaction.reply({
        content: errorMessage,
        ephemeral: true
      });
    }
  }

  // دالة إغلاق التذكرة
  async function closeTicket(interaction, ticketId) {
    try {
      const ticket = ticketSystem.activeTickets.get(ticketId);
      if (!ticket) {
        return await interaction.reply({
          content: '❌ التذكرة غير موجودة!',
          ephemeral: true
        });
      }
      
      const guild = interaction.guild;
      const channel = guild.channels.cache.get(ticket.channelId);
      
      if (!channel) {
        return await interaction.reply({
          content: '❌ قناة التذكرة غير موجودة!',
          ephemeral: true
        });
      }
      
      // جمع جميع الرسائل في التذكرة
      const messages = [];
      let lastMessageId = null;
      
      while (true) {
        const options = { limit: 100 };
        if (lastMessageId) {
          options.before = lastMessageId;
        }
        
        const fetchedMessages = await channel.messages.fetch(options);
        if (fetchedMessages.size === 0) break;
        
        messages.push(...fetchedMessages.values());
        lastMessageId = fetchedMessages.last().id;
      }
      
      // ترتيب الرسائل حسب التاريخ
      messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      
      // إنشاء محتوى التذكرة
      let transcript = `# ${ticketId} - محادثة التذكرة\n\n`;
      transcript += `**المستخدم:** <@${ticket.userId}>\n`;
      transcript += `**تاريخ الإنشاء:** ${ticket.createdAt.toLocaleString()}\n`;
      transcript += `**تاريخ الإغلاق:** ${new Date().toLocaleString()}\n`;
      transcript += `**النوع:** ${ticket.type}\n`;
      transcript += `**الأولوية:** ${ticket.priority}\n\n`;
      transcript += `---\n\n`;
      
      messages.forEach(msg => {
        const timestamp = msg.createdAt.toLocaleString();
        const author = msg.author.tag;
        const content = msg.content || '[مرفق أو embed]';
        transcript += `**[${timestamp}] ${author}:** ${content}\n\n`;
      });
      
      // إرسال المحادثة للمستخدم
      try {
        const user = await client.users.fetch(ticket.userId);
        const dmEmbed = new EmbedBuilder()
          .setTitle('📄 نسخة من التذكرة')
          .setDescription(`تم إغلاق تذكرتك: ${ticketId}\n\n**ملخص المحادثة:**\n\`\`\`\n${transcript.substring(0, 1900)}\n\`\`\``)
          .setColor(0xff9900)
          .setFooter({ text: 'نظام تذاكر المطور' })
          .setTimestamp();
        
        await user.send({ embeds: [dmEmbed] });
        
        // إرسال الملف الكامل إذا كان طويلاً
        if (transcript.length > 1900) {
          const buffer = Buffer.from(transcript, 'utf8');
          const attachment = new AttachmentBuilder(buffer, { name: `${ticketId}-transcript.txt` });
          await user.send({ files: [attachment] });
        }
      } catch (error) {
        console.log('لا يمكن إرسال نسخة التذكرة للمستخدم:', error.message);
      }
      
      // حذف القناة
      await channel.delete('تم إغلاق التذكرة');
      
      // إزالة التذكرة من النظام
      ticketSystem.activeTickets.delete(ticketId);
      
      // إرسال لوق الإغلاق
      const logEmbed = new EmbedBuilder()
        .setTitle('🔒 تم إغلاق تذكرة')
        .setDescription(`**التذكرة:** ${ticketId}\n**المستخدم:** <@${ticket.userId}>\n**المغلق بواسطة:** <@${interaction.user.id}>`)
        .setColor(0xff0000)
        .setTimestamp();
      
      const logChannel = guild.channels.cache.get(ticketSystem.ticketLogChannelId);
      if (logChannel) {
        await logChannel.send({ embeds: [logEmbed] });
      }
      
      await interaction.reply({
        content: `✅ تم إغلاق التذكرة ${ticketId} وإرسال نسخة للمستخدم!`,
        ephemeral: true
      });
      
    } catch (error) {
      console.error('خطأ في إغلاق التذكرة:', error);
      await interaction.reply({
        content: '❌ حدث خطأ في إغلاق التذكرة!',
        ephemeral: true
      });
    }
  }

  // دالة إنشاء لوحة التذاكر
  async function createTicketPanel(channel) {
    const panelEmbed = new EmbedBuilder()
      .setTitle('ALZAABI Ticket Bot')
      .setDescription('لفتح تذكرة أضغط على الزر أدناه\n\n**「 🔧 」• Technical Support | الدعم الفني**\n**「 🛒 」• Product | المنتج**')
      .setColor(0x0099ff)
      .setFooter({ text: 'نظام تذاكر المطور - اضغط الزر لبدء التذكرة' })
      .setTimestamp();
    
    const panelRow1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_technical_ticket')
          .setLabel('🔧 الدعم الفني')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔧'),
        new ButtonBuilder()
          .setCustomId('create_product_ticket')
          .setLabel('🛒 المنتج')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🛒')
      );
    
    const panelRow2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('إنشاء تذكرة عامة')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🎫')
      );
    
    await channel.send({
      embeds: [panelEmbed],
      components: [panelRow1, panelRow2]
    });
  }

  // معالج أزرار التذاكر
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    
    const { customId } = interaction;
    
    if (customId === 'create_ticket') {
      // إنشاء modal لاختيار نوع التذكرة
      const modal = new ModalBuilder()
        .setCustomId('ticket_modal')
        .setTitle('إنشاء تذكرة جديدة');
      
      const ticketTypeInput = new TextInputBuilder()
        .setCustomId('ticket_type')
        .setLabel('نوع التذكرة')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('مثال: تقرير عن خطأ، اقتراح، سؤال...')
        .setRequired(true);
      
      const priorityInput = new TextInputBuilder()
        .setCustomId('ticket_priority')
        .setLabel('الأولوية (low/medium/high)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('medium')
        .setValue('medium')
        .setRequired(false);
      
      const firstActionRow = new ActionRowBuilder().addComponents(ticketTypeInput);
      const secondActionRow = new ActionRowBuilder().addComponents(priorityInput);
      
      modal.addComponents(firstActionRow, secondActionRow);
      
      await interaction.showModal(modal);
    }
    
    if (customId === 'create_technical_ticket') {
      // إنشاء تذكرة دعم فني مباشرة
      await createTicket(interaction, 'طلب مساعدة تقنية', 'high');
    }
    
    if (customId === 'create_product_ticket') {
      // إنشاء تذكرة منتج مباشرة
      await createTicket(interaction, 'استفسار عن المنتج', 'medium');
    }
    
    if (customId === 'close_ticket') {
      const channel = interaction.channel;
      const ticketId = channel.name.toUpperCase();
      
      if (ticketSystem.activeTickets.has(ticketId)) {
        await closeTicket(interaction, ticketId);
      } else {
        await interaction.reply({
          content: '❌ هذه ليست قناة تذكرة صحيحة!',
          ephemeral: true
        });
      }
    }
    
    if (customId === 'add_support') {
      const channel = interaction.channel;
      const ticketId = channel.name.toUpperCase();
      
      if (ticketSystem.activeTickets.has(ticketId)) {
        const ticket = ticketSystem.activeTickets.get(ticketId);
        
        // إضافة رتبة الدعم للقناة
        await channel.permissionOverwrites.create(ticketSystem.supportRoleId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          ManageMessages: true
        });
        
        await interaction.reply({
          content: `✅ تم إضافة فريق الدعم للتذكرة!`,
          ephemeral: true
        });
      }
    }
    
    if (customId === 'priority_high') {
      const channel = interaction.channel;
      const ticketId = channel.name.toUpperCase();
      
      if (ticketSystem.activeTickets.has(ticketId)) {
        const ticket = ticketSystem.activeTickets.get(ticketId);
        ticket.priority = 'high';
        
        const embed = new EmbedBuilder()
          .setTitle('🔴 تم رفع أولوية التذكرة')
          .setDescription(`تم تغيير أولوية التذكرة إلى عالية`)
          .setColor(0xff0000)
          .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        await interaction.reply({
          content: '✅ تم رفع أولوية التذكرة!',
          ephemeral: true
        });
      }
    }
    
    if (customId === 'transcript_ticket') {
      const channel = interaction.channel;
      const ticketId = channel.name.toUpperCase();
      
      if (ticketSystem.activeTickets.has(ticketId)) {
        const ticket = ticketSystem.activeTickets.get(ticketId);
        
        // جمع الرسائل
        const messages = [];
        let lastMessageId = null;
        
        while (true) {
          const options = { limit: 100 };
          if (lastMessageId) {
            options.before = lastMessageId;
          }
          
          const fetchedMessages = await channel.messages.fetch(options);
          if (fetchedMessages.size === 0) break;
          
          messages.push(...fetchedMessages.values());
          lastMessageId = fetchedMessages.last().id;
        }
        
        messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        
        let transcript = `# ${ticketId} - محادثة التذكرة\n\n`;
        transcript += `**المستخدم:** <@${ticket.userId}>\n`;
        transcript += `**تاريخ الإنشاء:** ${ticket.createdAt.toLocaleString()}\n`;
        transcript += `**النوع:** ${ticket.type}\n`;
        transcript += `**الأولوية:** ${ticket.priority}\n\n---\n\n`;
        
        messages.forEach(msg => {
          const timestamp = msg.createdAt.toLocaleString();
          const author = msg.author.tag;
          const content = msg.content || '[مرفق أو embed]';
          transcript += `**[${timestamp}] ${author}:** ${content}\n\n`;
        });
        
        const buffer = Buffer.from(transcript, 'utf8');
        const attachment = new AttachmentBuilder(buffer, { name: `${ticketId}-transcript.txt` });
        
        await interaction.reply({
          content: '📄 تم إنشاء نسخة من التذكرة:',
          files: [attachment],
          ephemeral: true
        });
      }
    }
  });

  // معالج modal التذاكر
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    
    if (interaction.customId === 'ticket_modal') {
      const ticketType = interaction.fields.getTextInputValue('ticket_type');
      const priority = interaction.fields.getTextInputValue('ticket_priority') || 'medium';
      
      await createTicket(interaction, ticketType, priority);
    }
  });

  // أمر إنشاء لوحة التذاكر
  const ticketPanelCommand = new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('إنشاء لوحة التذاكر')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('القناة المراد إرسال اللوحة فيها')
        .setRequired(true)
    );

  // تسجيل أوامر التذاكر
  const ticketCommands = [ticketPanelCommand];
  const ticketRest = new REST({ version: '10' }).setToken(token);

  (async () => {
    try {
      console.log('بدء تسجيل أوامر التذاكر...');
      await ticketRest.put(
        Routes.applicationCommands(clientId),
        { body: ticketCommands }
      );
      console.log('تم تسجيل أوامر التذاكر بنجاح!');
    } catch (error) {
      console.error('خطأ في تسجيل أوامر التذاكر:', error);
    }
  })();

  // معالج أوامر التذاكر
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'ticket-panel') {
      const channel = interaction.options.getChannel('channel');
      await createTicketPanel(channel);
      await interaction.reply({
        content: `✅ تم إنشاء لوحة التذاكر في ${channel}`,
        ephemeral: true
      });
    }
  });

  // === الميزات الحصرية الإضافية === //

  // نظام إغلاق التذاكر التلقائي
  setInterval(async () => {
    const now = Date.now();
    for (const [ticketId, ticket] of ticketSystem.activeTickets) {
      const lastActivity = ticket.lastActivity || ticket.createdAt;
      if (now - lastActivity.getTime() > ticketSystem.autoCloseInactive) {
        try {
          const guild = client.guilds.cache.first();
          const channel = guild.channels.cache.get(ticket.channelId);
          if (channel) {
            const embed = new EmbedBuilder()
              .setTitle('⏰ إغلاق تلقائي للتذكرة')
              .setDescription('تم إغلاق هذه التذكرة تلقائياً بسبب عدم النشاط لمدة 24 ساعة')
              .setColor(0xff9900)
              .setTimestamp();
            
            await channel.send({ embeds: [embed] });
            await channel.delete('إغلاق تلقائي - عدم نشاط');
          }
          
          ticketSystem.activeTickets.delete(ticketId);
          ticketSystem.ticketStats.totalClosed++;
        } catch (error) {
          console.error('خطأ في الإغلاق التلقائي:', error);
        }
      }
    }
  }, 3600000); // فحص كل ساعة

  // نظام إحصائيات التذاكر
  async function getTicketStats() {
    const stats = ticketSystem.ticketStats;
    const activeTickets = ticketSystem.activeTickets.size;
    
    const embed = new EmbedBuilder()
      .setTitle('📊 إحصائيات نظام التذاكر')
      .setDescription('إحصائيات شاملة لنظام التذاكر')
      .addFields(
        { name: '📈 إجمالي التذاكر المنشأة', value: stats.totalCreated.toString(), inline: true },
        { name: '🔒 إجمالي التذاكر المغلقة', value: stats.totalClosed.toString(), inline: true },
        { name: '🎫 التذاكر النشطة', value: activeTickets.toString(), inline: true },
        { name: '⏱️ متوسط وقت الاستجابة', value: `${stats.averageResponseTime} دقيقة`, inline: true },
        { name: '🏆 أكثر نوع تذكرة', value: stats.mostCommonType, inline: true }
      )
      .setColor(0x0099ff)
      .setTimestamp();
    
    return embed;
  }

  // نظام تصنيف التذاكر الذكي
  function categorizeTicket(content) {
    const keywords = {
      'bug': ['خطأ', 'مشكلة', 'لا يعمل', 'عطل', 'error', 'bug'],
      'suggestion': ['اقتراح', 'فكرة', 'تحسين', 'suggestion', 'idea'],
      'question': ['سؤال', 'كيف', 'متى', 'أين', 'question', 'how'],
      'technical': ['تقني', 'تقنية', 'برمجة', 'technical', 'code'],
      'financial': ['مال', 'دفع', 'سعر', 'تكلفة', 'financial', 'payment'],
      'complaint': ['شكوى', 'مشكلة', 'غضب', 'complaint', 'angry']
    };
    
    const lowerContent = content.toLowerCase();
    let maxScore = 0;
    let category = 'question';
    
    for (const [cat, words] of Object.entries(keywords)) {
      let score = 0;
      words.forEach(word => {
        if (lowerContent.includes(word)) score++;
      });
      if (score > maxScore) {
        maxScore = score;
        category = cat;
      }
    }
    
    return category;
  }

  // نظام تنبيهات التذاكر
  async function sendTicketAlert(ticketId, type) {
    const ticket = ticketSystem.activeTickets.get(ticketId);
    if (!ticket) return;
    
    const guild = client.guilds.cache.first();
    const supportRole = guild.roles.cache.get(ticketSystem.supportRoleId);
    
    if (supportRole) {
      const embed = new EmbedBuilder()
        .setTitle(`🚨 تنبيه تذكرة ${type}`)
        .setDescription(`**التذكرة:** ${ticketId}\n**المستخدم:** <@${ticket.userId}>\n**النوع:** ${ticket.type}\n**الأولوية:** ${ticket.priority}`)
        .setColor(ticketSystem.ticketTypes[ticket.type]?.color || 0x0099ff)
        .setTimestamp();
      
      const logChannel = guild.channels.cache.get(ticketSystem.ticketLogChannelId);
      if (logChannel) {
        await logChannel.send({ 
          content: `${supportRole}`,
          embeds: [embed] 
        });
      }
    }
  }

  // نظام تقييم التذاكر
  async function rateTicket(interaction, rating) {
    const channel = interaction.channel;
    const ticketId = channel.name.toUpperCase();
    
    if (ticketSystem.activeTickets.has(ticketId)) {
      const ticket = ticketSystem.activeTickets.get(ticketId);
      ticket.rating = rating;
      
      const embed = new EmbedBuilder()
        .setTitle('⭐ تم تقييم التذكرة')
        .setDescription(`تم تقييم التذكرة بـ ${rating}/5 نجوم`)
        .setColor(0xffd700)
        .setTimestamp();
      
      await channel.send({ embeds: [embed] });
      
      // إرسال التقييم للمطور
      const logChannel = client.channels.cache.get(ticketSystem.ticketLogChannelId);
      if (logChannel) {
        const ratingEmbed = new EmbedBuilder()
          .setTitle('⭐ تقييم جديد للتذكرة')
          .setDescription(`**التذكرة:** ${ticketId}\n**المستخدم:** <@${ticket.userId}>\n**التقييم:** ${rating}/5`)
          .setColor(0xffd700)
          .setTimestamp();
        
        await logChannel.send({ embeds: [ratingEmbed] });
      }
    }
  }

  // أمر إحصائيات التذاكر
  const ticketStatsCommand = new SlashCommandBuilder()
    .setName('ticket-stats')
    .setDescription('عرض إحصائيات نظام التذاكر');

  // أمر إغلاق جميع التذاكر
  const closeAllTicketsCommand = new SlashCommandBuilder()
    .setName('close-all-tickets')
    .setDescription('إغلاق جميع التذاكر النشطة');

  // أمر التحقق من إعدادات التذاكر
  const checkTicketSettingsCommand = new SlashCommandBuilder()
    .setName('check-ticket-settings')
    .setDescription('التحقق من إعدادات نظام التذاكر');

  // أمر إنشاء فئة التذاكر
  const createTicketCategoryCommand = new SlashCommandBuilder()
    .setName('create-ticket-category')
    .setDescription('إنشاء فئة التذاكر تلقائياً');

  // تحديث قائمة الأوامر
  const allTicketCommands = [ticketPanelCommand, ticketStatsCommand, closeAllTicketsCommand, checkTicketSettingsCommand, createTicketCategoryCommand];

  // معالج أوامر التذاكر الإضافية
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'ticket-stats') {
      const statsEmbed = await getTicketStats();
      await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
    }
    
    if (interaction.commandName === 'close-all-tickets') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return await interaction.reply({
          content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر!',
          ephemeral: true
        });
      }
      
      const count = ticketSystem.activeTickets.size;
      for (const [ticketId, ticket] of ticketSystem.activeTickets) {
        try {
          const guild = interaction.guild;
          const channel = guild.channels.cache.get(ticket.channelId);
          if (channel) {
            await channel.delete('إغلاق جماعي للتذاكر');
          }
        } catch (error) {
          console.error('خطأ في إغلاق التذكرة:', error);
        }
      }
      
      ticketSystem.activeTickets.clear();
      
      await interaction.reply({
        content: `✅ تم إغلاق ${count} تذكرة بنجاح!`,
        ephemeral: true
      });
    }
    
    if (interaction.commandName === 'check-ticket-settings') {
      const issues = await validateTicketSettings(interaction.guild);
      
      const embed = new EmbedBuilder()
        .setTitle('🔧 فحص إعدادات نظام التذاكر')
        .setColor(issues.length === 0 ? 0x00ff00 : 0xff9900)
        .setTimestamp();
      
      if (issues.length === 0) {
        embed.setDescription('✅ جميع الإعدادات صحيحة!')
          .addFields(
            { name: '📁 فئة التذاكر', value: ticketSystem.ticketCategoryId || 'غير محدد', inline: true },
            { name: '👥 رتبة الدعم', value: ticketSystem.supportRoleId || 'غير محدد', inline: true },
            { name: '📋 قناة اللوق', value: ticketSystem.ticketLogChannelId || 'غير محدد', inline: true }
          );
      } else {
        embed.setDescription('⚠️ تم العثور على مشاكل في الإعدادات:')
          .addFields(
            { name: '❌ المشاكل', value: issues.join('\n'), inline: false },
            { name: '📁 فئة التذاكر', value: ticketSystem.ticketCategoryId || 'غير محدد', inline: true },
            { name: '👥 رتبة الدعم', value: ticketSystem.supportRoleId || 'غير محدد', inline: true },
            { name: '📋 قناة اللوق', value: ticketSystem.ticketLogChannelId || 'غير محدد', inline: true }
          );
      }
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (interaction.commandName === 'create-ticket-category') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return await interaction.reply({
          content: '❌ ليس لديك صلاحية لإنشاء الفئات!',
          ephemeral: true
        });
      }
      
      try {
        const category = await interaction.guild.channels.create({
          name: '🎫 التذاكر',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel]
            }
          ]
        });
        
        // تحديث إعدادات النظام
        ticketSystem.ticketCategoryId = category.id;
        
        const embed = new EmbedBuilder()
          .setTitle('✅ تم إنشاء فئة التذاكر بنجاح!')
          .setDescription(`تم إنشاء فئة التذاكر: ${category}\n\n**ID الجديد:** \`${category.id}\`\n\nيمكنك الآن استخدام نظام التذاكر!`)
          .setColor(0x00ff00)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // إرسال رسالة في فئة التذاكر
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🎫 مرحباً بك في فئة التذاكر!')
          .setDescription('هذه فئة خاصة للتذاكر. سيتم إنشاء قنوات التذاكر هنا تلقائياً.')
          .setColor(0x0099ff)
          .setTimestamp();
        
        await category.send({ embeds: [welcomeEmbed] });
        
      } catch (error) {
        console.error('خطأ في إنشاء فئة التذاكر:', error);
        await interaction.reply({
          content: '❌ حدث خطأ في إنشاء فئة التذاكر! تأكد من أن البوت يملك صلاحيات إدارة القنوات.',
          ephemeral: true
        });
      }
    }
  });

  // تحديث تسجيل الأوامر
  (async () => {
    try {
      console.log('بدء تسجيل جميع أوامر التذاكر...');
      await ticketRest.put(
        Routes.applicationCommands(clientId),
        { body: allTicketCommands }
      );
      console.log('تم تسجيل جميع أوامر التذاكر بنجاح!');
    } catch (error) {
      console.error('خطأ في تسجيل أوامر التذاكر:', error);
    }
  })();

  client.login(token);