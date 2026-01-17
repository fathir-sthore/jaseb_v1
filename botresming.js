const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");

// Buat folder database jika belum ada
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const bot = new Telegraf(process.env.BOT_TOKEN || "8592407821:AAGLS0NVlggw7S_3MVKAFqipQmah46fJGz4");

// Path file database
const blacklistFile = path.join(dbDir, "blacklist.json");
const groupFile = path.join(dbDir, "grub.json");
const presetFile = path.join(dbDir, "preset.json");
const premiumFile = path.join(dbDir, "premium.json");
const groupStatFile = path.join(dbDir, "groupstats.json");
const userFile = path.join(dbDir, "users.json");
const autoShareFile = path.join(dbDir, "autoshare.json");
const ownerFile = path.join(dbDir, "owner.json");
const autoKirimFile = path.join(dbDir, "autokirim.json");

const ownerId = [6210345140]; // id owner
const channelWajib = ["@infoupdetscfsxdxy"];
const channelGimick = "@infoupdetscfsxdxy";

let autoKirimInterval = null;
let autoShareInterval = null;

// Fungsi untuk inisialisasi file JSON
function initFile(filePath, defaultValue = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

// Inisialisasi semua file database
initFile(ownerFile, ownerId);
initFile(blacklistFile);
initFile(groupFile);
initFile(presetFile, Array(20).fill(""));
initFile(premiumFile);
initFile(groupStatFile, {});
initFile(userFile);
initFile(autoShareFile, { interval: 10 });
initFile(autoKirimFile, { status: false, text: "" });

// Fungsi cek join channel
async function cekJoinChannel(userId, ctx) {
  for (const ch of channelWajib) {
    try {
      const m = await ctx.telegram.getChatMember(ch, userId);
      if (!["member", "administrator", "creator"].includes(m.status)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

// Middleware global -> wajib join dulu
bot.use(async (ctx, next) => {
  const uid = ctx.from?.id;
  if (!uid) return;

  // blacklist check
  const bl = JSON.parse(fs.readFileSync(blacklistFile));
  if (bl.includes(uid)) return;

  const ok = await cekJoinChannel(uid, ctx);
  if (!ok) {
    return ctx.reply(
      `❌ Kamu harus join channel berikut dulu:\n` +
      channelWajib.map(c => `📢 ${c}`).join("\n") +
      `\n\nSetelah join, klik /start lagi.`,
      Markup.inlineKeyboard([
        ...channelWajib.map(c =>
          Markup.button.url(`Wajib Join ${c}`, `https://t.me/${c.replace("@", "")}`)
        ),
        Markup.button.url("WAJIB Join Developer & Info SC no enc", `https://t.me/${channelGimick.replace("@", "")}`)
      ], { columns: 1 })
    );
  }
  return next();
});

// FUNGSI DATA GRUP
bot.on("new_chat_members", async ctx => {
  const botId = (await ctx.telegram.getMe()).id;
  const newMembers = ctx.message.new_chat_members;

  const isBotAdded = newMembers.some(member => member.id === botId);
  if (!isBotAdded) return; // ⛔ Bukan bot yang ditambahkan, abaikan

  const groupId = ctx.chat.id;
  const groupName = ctx.chat.title || "Tanpa Nama";
  const adder = ctx.message.from;
  const adderId = adder.id;
  const username = adder.username ? `@${adder.username}` : "(tanpa username)";

  // === Tambahkan ke grub.json jika belum ada
  let groups = JSON.parse(fs.readFileSync(groupFile));
  if (!groups.includes(groupId)) {
    groups.push(groupId);
    fs.writeFileSync(groupFile, JSON.stringify(groups, null, 2));
  }

  // === Hitung jumlah grup yang ditambahkan oleh user
  let stats = JSON.parse(fs.readFileSync(groupStatFile));
  stats[adderId] = (stats[adderId] || 0) + 1;
  fs.writeFileSync(groupStatFile, JSON.stringify(stats, null, 2));

  const totalUserAdded = stats[adderId];

  // === Tambahkan ke premium jika pertama kali (grup ke-2)
  let premiumUsers = JSON.parse(fs.readFileSync(premiumFile));
  if (totalUserAdded === 2 && !premiumUsers.includes(adderId)) {
    premiumUsers.push(adderId);
    fs.writeFileSync(premiumFile, JSON.stringify(premiumUsers, null, 2));
  }

  // === Kirim notifikasi setiap kali user menambahkan grup ke-2, 3, dst.
  if (totalUserAdded >= 2) {
    for (const owner of ownerId) {
      ctx.telegram.sendMessage(owner, `➕ Bot Ditambahkan ke grup baru!

👤 Oleh: ${username}
🆔 ID: \`${adderId}\`
🏷 Nama Grup: *${groupName}*
🔢 Total Grup oleh User: *${totalUserAdded}*
📦 Total Grup Bot: *${groups.length}*`, {
        parse_mode: "Markdown"
      }).catch(e => console.log("Gagal kirim notifikasi:", e.message));
    }
  }
});

const randomImages = [
  "https://files.catbox.moe/c45jek.jpg",
  "https://files.catbox.moe/cw3o8i.jpg",
  "https://files.catbox.moe/uvegiv.jpg"
];

const getRandomImage = () => randomImages[Math.floor(Math.random() * randomImages.length)];

async function editMenu(ctx, caption, buttons) {
  try {
    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: getRandomImage(),
        caption,
        parse_mode: 'HTML',
      },
      {
        reply_markup: buttons.reply_markup,
      }
    );
  } catch (error) {
    console.error('Error editing menu:', error);
    await ctx.reply('Maaf, terjadi kesalahan saat mengedit pesan.').catch(() => {});
  }
}

// FUNC auto backup
async function kirimBackup(ctx) {
  const owners = JSON.parse(fs.readFileSync(ownerFile));
  const files = [
    "./database/grub.json",
    "./database/groupstats.json",
    "./database/users.json",
    "./database/premium.json",
    "./database/owner.json",
    "./database/blacklist.json",
    "./database/preset.json",
    "./database/autoshare.json",
    "./database/autokirim.json"
  ];

  for (const ownerId of owners) {
    try {
      for (const file of files) {
        if (fs.existsSync(file)) {
          await ctx.telegram.sendDocument(ownerId, { source: file }).catch(() => {});
        }
      }
      console.log(`✅ Backup terkirim ke owner ${ownerId}`);
    } catch (e) {
      console.log(`❌ Gagal kirim backup ke ${ownerId}: ${e.message}`);
    }
  }
}

// PERINTAH START
bot.command('start', async (ctx) => {
  const username = ctx.from.username ? `@${ctx.from.username}` : 'Tidak tersedia';
  const userId = ctx.from.id;
  const RandomBgtJir = getRandomImage();

  // === Simpan ID user ke users.json ===
  let users = JSON.parse(fs.readFileSync(userFile));
  if (!users.includes(userId)) {
    users.push(userId);
    fs.writeFileSync(userFile, JSON.stringify(users, null, 2));
  }

  await ctx.replyWithPhoto(RandomBgtJir, {
    caption: `
<blockquote>
╭──( 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 )──╮
╰──( 𝗕𝗢𝗧  𝗝𝗔𝗦𝗦𝗘𝗕  )──╯

╭─────( 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐒𝐈  )──────╮
│✧ Developer : 𝗙𝗔𝗧𝗛𝗜𝗥 𝗦𝗧𝗛𝗢𝗥𝗘 
│✧ Author : 𝗙𝗔𝗧𝗛𝗜𝗥 𝗦𝗧𝗛𝗢𝗥𝗘 
│✧ Version : 1.0
│✧ encourager : [all buyer, ortu] 
│✧ Deskripsi : ⤸ 
│✧ Language 𝖩𝖤𝖯𝖠𝖭𝖦  🇯🇵
│
│‎<b>このボットは<b>
│<b>ルーム/グループにメッセージを配信するサービス<b>
│<b>ボットです。これにより、<b>
│<b>ユーザーはボット内のすべてのルーム/<b>
│<b>グループにメッセージを素早く共有できます。<b>
│<b>ボットアクセスを<b>
│<b>取得するには、<b>
│<b>ボットをルーム/グループに2回入力すると、自動的<b>
│<b>にプレミアムアクセスが付与されます。<b>
│
│✧ Language INDONESIA 🇮🇩
│ 𝘽𝙤𝙩 𝙞𝙣𝙞 𝙖𝙙𝙖𝙡𝙖𝙝 𝙗𝙤𝙩 𝙟𝙖𝙨𝙖 𝙨𝙚𝙗𝙖𝙧 𝙠𝙚
│     𝙧𝙤𝙤𝙢/𝙜𝙧𝙪𝙗 𝙪𝙣𝙩𝙪𝙠 𝙢𝙚𝙢𝙥𝙚𝙧𝙢𝙪𝙙𝙖𝙝 
│     𝙥𝙚𝙣𝙜𝙜𝙪𝙣𝙖 𝙖𝙜𝙖𝙧 𝙘𝙚𝙥𝙖𝙩 𝙢𝙚𝙢𝙗𝙖𝙜𝙞 𝙥𝙚𝙨𝙖𝙣
│     𝙠𝙚𝙨𝙚𝙢𝙪𝙖 𝙧𝙤𝙤𝙢/𝙜𝙧𝙪𝙗 𝙮𝙖𝙣𝙜 𝙖𝙙𝙖 𝙙𝙞 𝙗𝙤𝙩
│     𝙙𝙖𝙣 𝙟𝙞𝙠𝙖 𝙖𝙣𝙙𝙖 𝙞𝙣𝙜𝙞𝙣 𝙢𝙚𝙣𝙙𝙖𝙥𝙖𝙩𝙠𝙖𝙣
│     𝙖𝙠𝙨𝙚𝙨 𝙗𝙤𝙩 𝙢𝙖𝙨𝙪𝙠𝙞𝙣 𝙗𝙤𝙩 𝙠𝙚 
│     𝙧𝙤𝙤𝙢/𝙜𝙧𝙪𝙗 𝙨𝙚𝙗𝙖𝙣𝙮𝙖𝙠 2𝙭 𝙤𝙩𝙤𝙢𝙖𝙩𝙞𝙨
│     𝙖𝙠𝙖𝙣 𝙢𝙚𝙣𝙙𝙖𝙥𝙖𝙩𝙠𝙖𝙣 𝙖𝙠𝙨𝙚𝙨 𝙥𝙧𝙚𝙢𝙞𝙪𝙢
╰─────────────────────╯
</blockquote>
`,
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('𝙈𝙀𝙉𝙐 𝙐𝙏𝘼𝙈𝘼', 'Daxingnot1'),
        Markup.button.callback('𝗞𝗛𝗨𝗦𝗨𝗦 𝗙𝗔𝗧𝗛𝗜𝗥 𝗦𝗧𝗛𝗢𝗥𝗘', 'fathirofsc2'),
      ],
      [
        Markup.button.url('𝘿𝙀𝙑𝙀𝙇𝙊𝙋𝙀𝙍', 'https://t.me/fathirsthore'),
      ]
    ])
  }).catch(e => console.log("Gagal kirim start:", e.message));
});

bot.action('Daxingnot1', async (ctx) => {
  const username = ctx.from.username ? `@${ctx.from.username}` : 'Tidak tersedia';
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('BACK', 'startback')],
  ]);

  const caption = `
<blockquote>
✦━━━━━━[  𝗕𝗢𝗧 𝗝𝗔𝗦𝗦𝗘𝗕  ]━━━━━━✦
  ⌬  𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝗙𝗔𝗧𝗛𝗜𝗥 𝗦𝗧𝗛𝗢𝗥𝗘 ⌬
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⟡ 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗦𝗜 𝗕𝗢𝗧 ⟡
› 𝖣𝖾𝗏𝖾𝗅𝗈𝗉𝖾𝗋 : FATHIR STHORE
› 𝖠𝗎𝗍𝗁𝗈𝗋    : Daxyinz
› 𝖵𝖾𝗋𝗌𝗂𝗈𝗇   : 1.0
› 𝖲𝗎𝗉𝗉𝗈𝗋𝗍   : [all buyer, ortu,] 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⟡ 𝙈𝙀𝙉𝙐 𝙐𝙏𝘼𝙈𝘼 ⟡
▣ /share       ⇢  𝖡𝗋𝗈𝖺𝖽𝖼𝖺𝗌𝗍 𝖥𝗈𝗋𝗐𝖺𝗋𝖽
▣ /autoshare   ⇢  𝖠𝗎𝗍𝗈 𝖡𝗋𝗈𝖺𝖽𝖼𝖺𝗌𝗍 𝖥𝗈𝗋𝗐𝖺𝗋𝖽
▣ /pinggrub    ⇢  𝖳𝗈𝗍𝖺𝗅 𝖦𝗋𝗈𝗎𝗉
▣ /bcuser      ⇢  𝖡𝗋𝗈𝖺𝖽𝖼𝖺𝗌𝗍 𝖴𝗌𝖾𝗋 𝖥𝗈𝗋𝗐𝖺𝗋𝖽
▣ /top         ⇢  𝖱𝖺𝗇𝗄𝗂𝗇𝗀 𝖯𝖾𝗇𝗀𝗎𝗇𝖽𝖺𝗇𝗀
▣ /set         ⇢  𝖲𝗂𝗆𝗉𝖺𝗇 𝖳𝖷𝖳 → 𝖩𝖲𝖮𝖭
▣ /del         ⇢  𝖧𝖺𝗉𝗎𝗌 𝖳𝖷𝖳 𝖽𝖺𝗋𝗂 𝖩𝖲𝖮𝖭
▣ /list        ⇢  𝖣𝖺𝖿𝗍𝖺𝗋 𝖳𝖷𝖳 𝖽𝖺𝗅𝖺𝗆 𝖩𝖲𝖮𝖭
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          『🦋』 𝘼𝙡𝙡 𝙃𝙚𝙥𝙥𝙮 𝙀𝙣𝙙𝙨
</blockquote>
  `;

  await editMenu(ctx, caption, buttons);
});

bot.action('fathirofsc2', async (ctx) => {
  const username = ctx.from.username ? `@${ctx.from.username}` : 'Tidak tersedia';
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('BACK', 'startback')],
  ]);

  const caption = `
<blockquote>
╭──( 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 )──╮
╰──( 𝗕𝗢𝗧  𝗝𝗔𝗦𝗦𝗘𝗕 𝗩𝟭  )──╯

╭─────( 𝗗𝗔𝗙𝗧𝗔𝗥  )──────╮
│✧ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 : 𝖥𝖠𝖳𝖧𝖨𝖱 𝖲𝖳𝖧𝖮𝖱𝖤
│✧ 𝗔𝘂𝘁𝗵𝗼𝗿 : Daxyinz
│✧ 𝗩𝗲𝗿𝘀𝗶𝗼𝗻 : 𝟣.𝟢
│✧ 𝗲𝗻𝗰𝗼𝘂𝗿𝗮𝗴𝗲𝗿 : [all buyer, ortu,] 
│✧ 𝗗𝗲𝘀𝗸𝗿𝗶𝗽𝘀𝗶 : ⤸ 
│✧ Language 𝖩𝖤𝖯𝖠𝖭𝖦  🇯🇵
│✧ /addprem id ( 𝘢𝘥𝘥 𝘭𝘪𝘴𝘵 𝘱𝘳𝘦𝘮𝘪𝘶𝘮 )
│✧ /delprem id ( 𝘥𝘦𝘭𝘦𝘵𝘦 𝘭𝘪𝘴𝘵 𝘱𝘳𝘦𝘮𝘪𝘶𝘮 )
│✧ /auto on/off teks ( 𝘢𝘶𝘵𝘰 𝘬𝘪𝘳𝘪𝘮 1/𝘫𝘢𝘮 )
│✧ /blokir id (𝘬𝘩𝘶𝘴𝘶𝘴 𝘰𝘸𝘯𝘦𝘳 𝘥𝘢𝘯 𝘩𝘢𝘳𝘶𝘴 𝘢𝘥𝘥 𝘰𝘸𝘯𝘦𝘳)
│✧ /unblokir id (𝘬𝘩𝘶𝘴𝘶𝘴 𝘰𝘸𝘯𝘦𝘳 𝘥𝘢𝘯 𝘩𝘢𝘳𝘶𝘴 𝘢𝘥𝘥 𝘰𝘸𝘯𝘦𝘳)
╰─────────────────────╯
</blockquote>
  `;

  await editMenu(ctx, caption, buttons);
});

// Action untuk BugMenu
bot.action('startback', async (ctx) => {
  const username = ctx.from.username ? `@${ctx.from.username}` : 'Tidak tersedia';
  const buttons = Markup.inlineKeyboard([
    [
      Markup.button.callback('𝙈𝙀𝙉𝙐 𝙐𝙏𝘼𝙈𝘼', 'Daxingnot1'),
      Markup.button.callback('𝗞𝗛𝗨𝗦𝗨𝗦 𝗙𝗔𝗧𝗛𝗜𝗥 𝗦𝗧𝗛𝗢𝗥𝗘', 'fathirofsc2'),
    ],
    [
      Markup.button.url('𝘿𝙀𝙑𝙀𝙇𝙊𝙋𝙀𝙍', 'https://t.me/fathirsthore'),
    ]
  ]);

  const caption = `
<blockquote>
╭──( 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 )──╮
╰──( 𝗕𝗢𝗧  𝗝𝗔𝗦𝗦𝗘𝗕  )──╯

╭─────( 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐒𝐈  )──────╮
│✧ Developer : FATHIR STHORE
│✧ Author : Daxyinz
│✧ Version : 1.0
│✧ Language kode : 𝖩𝖺𝗏𝖺𝖲𝖼𝗋𝗂𝗉𝗍 
│✧ Deskripsi : ⤸ 
│✧ Language 𝖩𝖤𝖯𝖠𝖭𝖦  🇯🇵
│
│‎<b>このボットは<b>
│<b>ルーム/グループにメッセージを配信するサービス<b>
│<b>ボットです。これにより、<b>
│<b>ユーザーはボット内のすべてのルーム/<b>
│<b>グループにメッセージを素早く共有できます。<b>
│<b>ボットアクセスを<b>
│<b>取得するには、<b>
│<b>ボットをルーム/グループに2回入力すると、自動的<b>
│<b>にプレミアムアクセスが付与されます。<b>
│
│✧Language INDONESIA 🇮🇩
│<b>Bot ini adalah Bot Jasa sebar ke<b>
│     <b>room/grub untuk mempermudah<b> 
│     <b>Pengguna agar cepat membagi pesan<b>
│     <b>Kesemua room/grub yang ada di BOT<b>
│     <b>dan jika anda ingin mendapatkan<b>
│     <b>Akses BOT Masukin BOT Ke<b> 
│     <b>room/grub sebanyak 2x otomatis<b>
│     <b>akan mendapatkan akses premium<b>
╰─────────────────────╯
</blockquote>
`;
  await editMenu(ctx, caption, buttons);
});

// PERINTAH SHARE
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
bot.command("share", async ctx => {
  const senderId = ctx.from.id;
  const replyMsg = ctx.message.reply_to_message;

  const premiumUsers = JSON.parse(fs.readFileSync(premiumFile));
  if (!premiumUsers.includes(senderId)) {
    return ctx.reply("❌ Kamu belum menambahkan bot ini ke 2 grup telegram.\n\nJika ingin menggunakan fitur ini, kamu harus menambahkan bot ke dalam minimal 2 grup.", {
      parse_mode: "Markdown"
    }).catch(() => {});
  }

  if (!replyMsg) {
    return ctx.reply("🪧 ☇ Reply pesan yang ingin dibagikan / dipromosikan").catch(() => {});
  }

  const groups = JSON.parse(fs.readFileSync(groupFile));
  let sukses = 0;
  let gagal = 0;

  // Notifikasi awal
  await ctx.reply(`⏳ Mengirim ke total ${groups.length} grup/channel...`, { parse_mode: "Markdown" }).catch(() => {});

  for (const groupId of groups) {
    try {
      await ctx.telegram.forwardMessage(groupId, ctx.chat.id, replyMsg.message_id);
      sukses++;
    } catch (err) {
      gagal++;
    }

    await new Promise(resolve => setTimeout(resolve, 1500)); // jeda 1.5 detik per kirim
  }

  // Laporan akhir
  await ctx.reply(
    `✅ *Selesai:*\nSukses: *${sukses}*\nGagal: *${gagal}*`,
    { parse_mode: "Markdown" }
  ).catch(() => {});
});

// PERINTAH AUTOSHARE
bot.command("autoshare", async ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) {
    return ctx.reply("❌ Fitur ini hanya untuk owner.").catch(() => {});
  }

  const replyMsg = ctx.message.reply_to_message;
  if (!replyMsg) {
    return ctx.reply("🪧 ☇ Reply pesan yang ingin dibagikan / dipromosikan").catch(() => {});
  }

  const intervalConfig = JSON.parse(fs.readFileSync(autoShareFile));
  const jedaMenit = intervalConfig.interval || 10;

  if (autoShareInterval) clearInterval(autoShareInterval);

  ctx.reply(`✅ ☇ Autoshare dimulai. Pesan akan dikirim otomatis setiap ${jedaMenit} menit`).catch(() => {});

  const groups = JSON.parse(fs.readFileSync(groupFile));

  autoShareInterval = setInterval(async () => {
    let sukses = 0;
    let gagal = 0;

    for (const groupId of groups) {
      try {
        await ctx.telegram.forwardMessage(groupId, ctx.chat.id, replyMsg.message_id);
        sukses++;
      } catch (e) {
        gagal++;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[AutoShare] Sukses: ${sukses} | Gagal: ${gagal}`);
  }, jedaMenit * 60 * 1000);
});

bot.command("setjeda", async ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) {
    return ctx.reply("❌ Hanya owner yang bisa mengatur jeda autoshare.").catch(() => {});
  }

  const args = ctx.message.text.split(" ");
  const menit = parseInt(args[1]);

  if (isNaN(menit) || menit < 1) {
    return ctx.reply("❌ Format salah. Gunakan: /setjeda <menit>, contoh: /setjeda 15").catch(() => {});
  }

  const config = { interval: menit };
  fs.writeFileSync(autoShareFile, JSON.stringify(config, null, 2));

  ctx.reply(`✅ Jeda autoshare diubah menjadi setiap ${menit} menit`).catch(() => {});
});

// PERINTAH PINGGRUB
bot.command("pinggrub", async ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) return ctx.reply("❌ ☇ Akses perintah hanya untuk owner").catch(() => {});

  let groups = JSON.parse(fs.readFileSync(groupFile));
  let updatedGroups = [];
  let total = groups.length;
  let aktif = 0;
  let gagal = 0;
  let logText = `📡 ☇ Cek status grub, Total ${total} grub`;

  for (const groupId of groups) {
    try {
      await ctx.telegram.sendChatAction(groupId, "typing");
      updatedGroups.push(groupId);
      logText += `✅ ☇ ${groupId} Grub aktif`;
      aktif++;
    } catch (err) {
      logText += `❌ ☇ ${groupId} Grub tidak aktif`;
      gagal++;
    }
    await delay(1000);
  }

  fs.writeFileSync(groupFile, JSON.stringify(updatedGroups, null, 2));

  logText = `
☇ Total Grub: ${total}
☇ Grub Aktif: ${aktif}
☇ Grub Dihapus: ${gagal}

`;
  ctx.reply(logText, { parse_mode: "Markdown" }).catch(() => {});
});

// === FITUR BROADCAST USER ===
bot.command("bcuser", async ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) {
    return ctx.reply("❌ Akses hanya untuk owner.").catch(() => {});
  }

  const replyMsg = ctx.message.reply_to_message;
  if (!replyMsg) {
    return ctx.reply("❌ Balas pesan yang mau di-broadcast ke semua user.").catch(() => {});
  }

  const userList = JSON.parse(fs.readFileSync(userFile));
  let sukses = 0;
  let gagal = 0;

  for (const userId of userList) {
    try {
      await ctx.telegram.forwardMessage(userId, ctx.chat.id, replyMsg.message_id);
      sukses++;
    } catch (err) {
      gagal++;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Jeda 1 detik antar user
  }

  ctx.reply(`✅ Broadcast selesai!\nSukses: ${sukses}\nGagal: ${gagal}`).catch(() => {});
});

// === /set <1-20> ===
bot.command("set", ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) return ctx.reply("❌ Hanya owner yang bisa set.").catch(() => {});

  const args = ctx.message.text.split(" ");
  const index = parseInt(args[1]);
  const text = args.slice(2).join(" ");

  if (isNaN(index) || index < 1 || index > 20) return ctx.reply("❌ Nomor harus 1-20.\nContoh: /set 1 Pesan rahasia").catch(() => {});
  if (!text) return ctx.reply("❌ Teks tidak boleh kosong.").catch(() => {});

  let presets = JSON.parse(fs.readFileSync(presetFile));
  presets[index - 1] = text;
  fs.writeFileSync(presetFile, JSON.stringify(presets, null, 2));

  ctx.reply(`✅ Pesan slot ${index} disimpan:\n${text}`).catch(() => {});
});

// === /del <1-20> ===
bot.command("del", ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) return ctx.reply("❌ Hanya owner yang bisa hapus.").catch(() => {});

  const args = ctx.message.text.split(" ");
  const index = parseInt(args[1]);

  if (isNaN(index) || index < 1 || index > 20) return ctx.reply("❌ Nomor harus 1-20.\nContoh: /del 1").catch(() => {});

  let presets = JSON.parse(fs.readFileSync(presetFile));
  presets[index - 1] = "";
  fs.writeFileSync(presetFile, JSON.stringify(presets, null, 2));

  ctx.reply(`✅ Pesan slot ${index} dihapus.`).catch(() => {});
});

// === /list ===
bot.command("list", ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) return ctx.reply("❌ Hanya owner yang bisa melihat daftar.").catch(() => {});

  let presets = JSON.parse(fs.readFileSync(presetFile));
  let teks = "📑 *Daftar Pesan Tersimpan:*\n\n";
  presets.forEach((p, i) => {
    if (p) teks += `${i + 1}. ${p}\n`;
  });

  if (teks === "📑 *Daftar Pesan Tersimpan:*\n\n") teks = "❌ Belum ada pesan yang disimpan.";
  ctx.reply(teks, { parse_mode: "Markdown" }).catch(() => {});
});

bot.command("top", async ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) return ctx.reply("❌ Akses hanya untuk owner.").catch(() => {});

  let stats = JSON.parse(fs.readFileSync(groupStatFile));
  if (Object.keys(stats).length === 0) return ctx.reply("❌ Belum ada data statistik.").catch(() => {});

  // Ubah ke array dan sort
  let sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  let teks = "📊 *Statistik User yang Menambahkan Bot ke Grup:*\n\n";
  for (let [userId, count] of sorted) {
    teks += `👤 ID: \`${userId}\` ➜ ${count} grup\n`;
  }

  ctx.reply(teks, { parse_mode: "Markdown" }).catch(() => {});
});

// PERINTAH ADDPREM
bot.command("addprem", ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) return ctx.reply("❌ kamu belum menambah kan bot ini ke 2 group telegram, jika ingin menggunakan fitur ini kamu harus add group ini ke dalam 2 group di telegram").catch(() => {});

  const args = ctx.message.text.split(" ");
  const targetId = parseInt(args[1]);
  if (!targetId) return ctx.reply("❌ Masukan id user yang ingin di tambahkan").catch(() => {});

  let data = JSON.parse(fs.readFileSync(premiumFile));
  if (data.includes(targetId)) return ctx.reply("✅ Sudah premium.").catch(() => {});

  data.push(targetId);
  fs.writeFileSync(premiumFile, JSON.stringify(data));
  ctx.reply(`✅ ☇ Berhasil menambahkan ${targetId} ke daftar premium.`).catch(() => {});
});

// PERINTAH ADDOWNER & DELLOWNER
bot.command("addowner", ctx => {
  if (!ownerId.includes(ctx.from.id)) return ctx.reply("❌ Cuma owner asli yang bisa tambah owner.").catch(() => {});
  const target = parseInt(ctx.message.text.split(" ")[1]);
  if (!target) return ctx.reply("❌ Format: /addowner <userId>").catch(() => {});
  const owners = JSON.parse(fs.readFileSync(ownerFile));
  if (owners.includes(target)) return ctx.reply("✅ Sudah owner.").catch(() => {});
  owners.push(target);
  fs.writeFileSync(ownerFile, JSON.stringify(owners, null, 2));
  ctx.reply(`✅ ${target} ditambahkan sebagai owner.`).catch(() => {});
});

bot.command("delowner", ctx => {
  if (!ownerId.includes(ctx.from.id)) return ctx.reply("❌ Cuma owner asli yang bisa hapus owner.").catch(() => {});
  const target = parseInt(ctx.message.text.split(" ")[1]);
  if (!target) return ctx.reply("❌ Format: /delowner <userId>").catch(() => {});
  let owners = JSON.parse(fs.readFileSync(ownerFile));
  owners = owners.filter(id => id !== target);
  fs.writeFileSync(ownerFile, JSON.stringify(owners, null, 2));
  ctx.reply(`✅ ${target} dihapus dari owner.`).catch(() => {});
});

// PERINTAH Blokir & Unblokir User
bot.command("blokir", ctx => {
  const owners = JSON.parse(fs.readFileSync(ownerFile));
  if (!owners.includes(ctx.from.id)) return ctx.reply("❌ Cuma owner.").catch(() => {});
  const target = parseInt(ctx.message.text.split(" ")[1]);
  if (!target) return ctx.reply("❌ Format: /blokir <userId>").catch(() => {});
  const blacklist = JSON.parse(fs.readFileSync(blacklistFile));
  if (blacklist.includes(target)) return ctx.reply("✅ Sudah diblokir.").catch(() => {});
  blacklist.push(target);
  fs.writeFileSync(blacklistFile, JSON.stringify(blacklist, null, 2));
  ctx.reply(`✅ ${target} diblokir.`).catch(() => {});
});

bot.command("unblokir", ctx => {
  const owners = JSON.parse(fs.readFileSync(ownerFile));
  if (!owners.includes(ctx.from.id)) return ctx.reply("❌ Cuma owner.").catch(() => {});
  const target = parseInt(ctx.message.text.split(" ")[1]);
  if (!target) return ctx.reply("❌ Format: /unblokir <userId>").catch(() => {});
  let blacklist = JSON.parse(fs.readFileSync(blacklistFile));
  blacklist = blacklist.filter(id => id !== target);
  fs.writeFileSync(blacklistFile, JSON.stringify(blacklist, null, 2));
  ctx.reply(`✅ ${target} diunblokir.`).catch(() => {});
});

// auto versi 2
bot.command("auto", async (ctx) => {
  // cek owner
  const owners = JSON.parse(fs.readFileSync(ownerFile));
  if (!owners.includes(ctx.from.id))
    return ctx.reply("❌ Hanya owner yang bisa pakai perintah ini.").catch(() => {});

  const args = ctx.message.text.slice(6).trim(); // "/auto on bla.."
  const onOff = args.split(" ")[0];               // "on" / "off"
  const text = args.slice(onOff.length).trim();  // sisa teks

  const cfg = JSON.parse(fs.readFileSync(autoKirimFile));

  /* ---------- OFF ---------- */
  if (onOff === "off") {
    if (!cfg.status) return ctx.reply("ℹ️ Auto-kirim sudah mati.").catch(() => {});
    clearInterval(autoKirimInterval);
    autoKirimInterval = null;
    cfg.status = false;
    fs.writeFileSync(autoKirimFile, JSON.stringify(cfg, null, 2));
    return ctx.reply("✅ Auto-kirim dimatikan.").catch(() => {});
  }

  /* ---------- ON ----------- */
  if (onOff === "on") {
    if (!text) return ctx.reply("❌ Format: /auto on <teks>").catch(() => {});
    if (cfg.status) return ctx.reply("ℹ️ Auto-kirim sudah aktif. /auto off dulu kalau mau ganti.").catch(() => {});

    cfg.status = true;
    cfg.text = text;
    fs.writeFileSync(autoKirimFile, JSON.stringify(cfg, null, 2));

    const kirim = async () => {
      const groups = JSON.parse(fs.readFileSync(groupFile));
      for (const g of groups) {
        try { await ctx.telegram.sendMessage(g, text); } catch { }
        await new Promise(r => setTimeout(r, 1000)); // jeda 1s antar-grup
      }
    };

    // langsung kirim sekali
    await kirim();
    ctx.reply("✅ Auto-kirim AKTIF (1x/jam).\n\nPesan:\n" + text).catch(() => {});

    // teruskan setiap 1 jam
    autoKirimInterval = setInterval(kirim, 60 * 60 * 1000);
    return;
  }

  /* ---------- SELAIN on/off */
  ctx.reply("❌ Format:\n/auto on <teks>\n/auto off").catch(() => {});
});

// PERINTAH AMBIL BACKUP 
bot.command("backup", async (ctx) => {
  const owners = JSON.parse(fs.readFileSync(ownerFile));
  if (!owners.includes(ctx.from.id)) return ctx.reply("❌ Hanya owner yang bisa ambil backup.").catch(() => {});

  const files = [
    "./database/grub.json",
    "./database/groupstats.json",
    "./database/users.json",
    "./database/premium.json",
    "./database/owner.json",
    "./database/blacklist.json",
    "./database/preset.json",
    "./database/autoshare.json",
    "./database/autokirim.json"
  ];

  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        await ctx.telegram.sendDocument(ctx.from.id, { source: file }).catch(() => {});
      }
    } catch (e) {
      console.log(`❌ Gagal kirim ${file}: ${e.message}`);
    }
  }

  ctx.reply("✅ Semua file backup telah dikirim.").catch(() => {});
});

// PERINTAH DELPREM
bot.command("delprem", ctx => {
  const senderId = ctx.from.id;
  if (!ownerId.includes(senderId)) return ctx.reply("❌ kamu belum menambah kan bot ini ke 2 group telegram, jika ingin menggunakan fitur ini kamu harus add group ini ke dalam 2 group di telegram").catch(() => {});

  const args = ctx.message.text.split(" ");
  const targetId = parseInt(args[1]);
  if (!targetId) return ctx.reply("❌ Masukan id user yang ingin di dihapus").catch(() => {});

  let data = JSON.parse(fs.readFileSync(premiumFile));
  if (!data.includes(targetId)) return ctx.reply("❌ ID tersebut tidak ada di daftar premium.").catch(() => {});

  data = data.filter(id => id !== targetId);
  fs.writeFileSync(premiumFile, JSON.stringify(data));
  ctx.reply(`✅ Berhasil menghapus ${targetId} dari daftar premium.`).catch(() => {});
});

// Fungsi untuk menjalankan bot
async function startBot() {
  try {
    // Cek apakah BOT_TOKEN tersedia
    if (!process.env.BOT_TOKEN && !"8592407821:AAGLS0NVlggw7S_3MVKAFqipQmah46fJGz4") {
      console.error("❌ BOT_TOKEN tidak ditemukan. Silakan set di Environment Variables.");
      return null;
    }

    await bot.launch();
    console.log('🤖 Bot berjalan di Vercel!');
    
    // Auto backup tiap 1 jam
    setInterval(() => {
      kirimBackup(bot);
    }, 60 * 60 * 1000);
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
    return bot;
  } catch (error) {
    console.error('Gagal memulai bot:', error);
    return null;
  }
}

// Ekspor untuk Vercel
module.exports = { bot, startBot };

// Jika file ini dijalankan langsung (bukan sebagai module)
if (require.main === module) {
  startBot().then(bot => {
    if (bot) {
      console.log('Bot telah berjalan dengan sukses!');
    }
  });
}
