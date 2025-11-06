// index.js

Console.clear();
const { Client, Collection, GatewayIntentBits, Partials, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, Events, PermissionsBitField, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, createCanvas, loadImage, InteractionType } = require("discord.js");
const mongoose = require('mongoose');
const { readdirSync } = require("fs");
const ascii = require('ascii-table');
const { token, prefix, mongoURI } = require('./config.json'); // **زێدەکرنا mongoURI بوو پەیوەندیا MongoDB**
const { EventEmitter } = require('events');
const { Database } = require("st.db");
const discordTranscripts = require('discord-html-transcripts');
const path = require("path");
const axios = require("axios");

// Schema Modules
const CountingSchema = require('./Schemas/CountingSchema.js');
const BlacklistSchema = require('./Schemas/BlacklistSchema');
let afkSchema = require("./Schemas/afkSchema.js");
const EmojiChannel = require('./Schemas/EmojiChannelSchema.js'); 
const InvitesSchema = require('./Schemas/InvitesSchema');
const Level = require('./Schemas/LevelSchema');
const AutoReply = require('./Schemas/AutoReply.js'); 

// st.db Instances
const dbTicket = new Database(path.join(__dirname, "Database", "Ticket")); // گۆهارتن ژ "/Database/Ticket"
const dbChannelConfig = new Database(path.join(__dirname, "Database", "ChannelConfig")); // گۆهارتن ژ "./Database/ChannelConfig"
const shortcutDB = new Database(path.join(__dirname, "Database", "ShortcutConfig")); 
const badWordsDB = new Database(path.join(__dirname, "Database", "badwords.json"));
const autoRoleDB = new Database(path.join(__dirname, "Database", "autorole.json"));
const calculatorDB = new Database(path.join(__dirname, "Database", "calculator.json"));
const fontChannelDB = new Database(path.join(__dirname, "Database", "fontChannels.json"));
const autoReactDB = new Database(path.join(__dirname, "Database", "autoreact.json"));
const tempVoiceDB = new Database(path.join(__dirname, "Database", "tempvoice.json"));
const logsDB = new Database(path.join(__dirname, "Database", "logs.json"));
const feedbackDB = new Database(path.join(__dirname, "Database", "feedback.json"));
const levelDB = new Database(path.join(__dirname, "Database", "levels.json"));
const canvasDB = new Database(path.join(__dirname, "Database", "canvas.json"));

const DecorativeFont = require("decorative-fonts.js");

const emitter = new EventEmitter();
emitter.setMaxListeners(999);

// 1. پێناسەکرنا Client و Intents
const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((intent) => GatewayIntentBits[intent]), // تمامێ Intents
  shards: "auto",
  partials: Object.keys(Partials).map((partial) => Partials[partial]) // تمامێ Partials
});

client.login(token);

// 2. زێدەکرنا DB-ێن تە بوو Client
client.dbTicket = dbTicket;
client.dbChannelConfig = dbChannelConfig;
client.shortcutDB = shortcutDB;
client.badWordsDB = badWordsDB;
client.autoRoleDB = autoRoleDB;
client.calculatorDB = calculatorDB;
client.fontChannelDB = fontChannelDB;
client.autoReactDB = autoReactDB;
client.tempVoiceDB = tempVoiceDB;
client.logsDB = logsDB;
client.feedbackDB = feedbackDB;
client.levelDB = levelDB;
client.canvasDB = canvasDB;
client.prefix = prefix;

// 3. دروستکرنا Collections
client.slashcommands = new Collection();
client.commandaliases = new Collection();
client.commands = new Collection();
client.invites = new Collection();

// 4. پەیوەندی ب MongoDB ڤە
mongoose.set('strictQuery', true);
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('🚀 MongoDB Connection: سەرکەفتی');
  console.log('🔗 هاتە گریدان ب داتابەیسێ MongoDB ڤە');
}).catch(err => console.error('❌ MongoDB Connection: شکەست\n', err));


// 5. هندێ (REST)
const rest = new REST({ version: '10' }).setToken(token);


// 6. Event: Ready (بۆ بارکرنا Slash Commands)
client.on("ready", async () => {
  try {
      await rest.put(Routes.applicationCommands(client.user.id), { body: slashcommands });
      const table = new ascii();
      const totalCommands = slashcommands.length;
      table.addRow(`${totalCommands} </> Slash Commands`);
      console.log(table.toString());
  } catch (error) {
      console.error(error);
  }
});;

const fs = require("fs");

// 7. Event: Ready (بۆ پەیاما دەستپێکرنێ)
client.once("ready", () => {
  const line = '━'.repeat(50);
  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  console.log('');
  console.log(' '.repeat(10) + '╔' + '═'.repeat(30) + '╗');
  console.log(' '.repeat(10) + '║' + ' '.repeat(30) + '║');
  console.log(' '.repeat(10) + '║' + ' '.repeat(8) + '🎉 MAYOR STUDIO 🎉' + ' '.repeat(8) + '║');
  console.log(' '.repeat(10) + '║' + ' '.repeat(30) + '║');
  console.log(' '.repeat(10) + '╚' + '═'.repeat(30) + '╝');
  console.log('');

  console.log(`${line}`);
  console.log(`✅ | دۆخ (STATUS): ئۆنلاین (ONLINE)`);
  console.log(`${line}`);
  console.log(`🤖 | بووت:     ${client.user.tag}`);
  console.log(`🆔 | ئایدی:      ${client.user.id}`);
  console.log(`🌐 | پالاڤتی (SUPPORT): https://discord.gg/mayor`);
  console.log(`🕒 | ئامادە:   ${timestamp}`);
  console.log(`📚 | سێرڤەر:  ${client.guilds.cache.size.toLocaleString()} سێرڤەر`);
  console.log(`${line}`);
  
  console.log(`✨ | **${client.user.username}** نوکە ئامادەیە بوو خزمەتکرنێ!`);
  console.log('');
});


// 8. Command Handlers: Slash, Prefix, Events
// **Slash Command Handler**
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.slashcommands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: "**خەلەتیەک چێبوو دەمێ جێبەجێکرنا فەرمانێ.**", ephemeral: true });
  }
});


// **Prefix Command (font - $font)**
client.on("messageCreate", async message => {
    if (message.content.startsWith('$font')) {
      let words = message.content.split(" ").slice(1).join(" ");
      let words2 = words.replaceAll("a", "𝐚").replaceAll("A", "𝐀").replaceAll("b", "𝐛").replaceAll("B", "𝐁").replaceAll('c', "𝐜").replaceAll("C", "𝐂").replaceAll("d", "𝐝").replaceAll("D", "𝐃").replaceAll("e", "𝐞").replaceAll("E", "𝐄").replaceAll("f", "𝐟").replaceAll("F", "𝐅").replaceAll("g", "𝐠").replaceAll("G", "𝐆").replaceAll("h", "𝐡").replaceAll("H", "𝐇").replaceAll("i", "𝐢").replaceAll("I", "𝐈").replaceAll("j", "𝐣").replaceAll("J", "𝐉").replaceAll("k", "𝐤").replaceAll("K", "𝐊").replaceAll("l", "𝐥").replaceAll("L", "𝐋").replaceAll("m", "𝐦").replaceAll("M", "𝐌").replaceAll("n", "𝐧").replaceAll("N", "𝐍").replaceAll("o", "𝐨").replaceAll("O", "𝐎").replaceAll("p", "𝐩").replaceAll("P", "𝐏").replaceAll("q", "𝐪").replaceAll("Q", "𝐐").replaceAll("r", "𝐫").replaceAll("R", "𝐑").replaceAll("s", "𝐬").replaceAll("S", "𝐒").replaceAll("t", "𝐭").replaceAll("T", "𝐓").replaceAll("u", "𝐮").replaceAll("U", "𝐔").replaceAll("v", "𝐯").replaceAll("V", "𝐕").replaceAll("w", "𝐰").replaceAll("W", "𝐖").replaceAll("x", "𝐱").replaceAll("X", "𝐗").replaceAll("y", "𝐲").replaceAll("Y", "𝐘").replaceAll("z", "𝐳").replaceAll("Z", "𝐙").replaceAll("1","𝟏").replaceAll("2","𝟐").replaceAll("3","𝟑").replaceAll("4","𝟒").replaceAll("5","𝟓").replaceAll("6","𝟔").replaceAll("7","𝟕").replaceAll("8","𝟖").replaceAll("9","𝟗").replaceAll("0","𝟎")
      if (!words) return message.channel.send('> **تکایە پەیڤەکێ بنڤیسە** ❌ !')
      message.reply(`${words2}`);
    }
    
    // **Prefix Command (delete - $delete)**
    if (message.content.startsWith('$delete')) {
       
        if (!message.channel.name.startsWith('ticket-')) {
            return message.reply('**ئەڤ فەرمانە تەنها د ناڤ چانێلێن تیکێتێ دا دهێتە بکارئینان.**');
        }

       
        let ticketData = dbChannelConfig.get("ticketData_" + message.guild.id + "_" + message.channel.id);
        if (!ticketData) {
            return message.reply({ content: '**داتایا تیکێتێ نەهاتە دیتن!**', ephemeral: true });
        }

        
        const author = await message.guild.members.fetch(message.author.id);

        const hasRole = author.roles.cache.some(role => role.id === ticketData.support_role);
        if (!hasRole) {
            return message.reply({ content: '**توو ڕۆلێ پێدڤی نینی بوو ژێبرنا ڤێ تیکێتێ!**', ephemeral: true });
        }

       
        const TranChannelID = dbTicket.get(`tranScript_${message.guild.id}`);
        const TranChannel = message.guild.channels.cache.get(TranChannelID) || await message.guild.channels.fetch(TranChannelID).catch();

        if (!TranChannel) {
            return message.reply('**چانێلا Transcript نەهاتە دیتن.**');
        }

       
        const embedStart = new EmbedBuilder().setColor("#FFFF00").setDescription('**دێ Transcript دروست کەم...**');
        const sentMessage = await message.channel.send({ embeds: [embedStart] });

        try {
            const attachment = await discordTranscripts.createTranscript(message.channel, {
                returnType: 'attachment',
                filename: `${message.channel.name}.html`,
                saveImages: true,
            });

            const embedComplete = new EmbedBuilder()
                .setColor("#8D33FF")
                .setTitle('Transcript ئامادەیە')
                .setDescription('**Transcript ب سەرکەفتی هاتە دروستکرن.**')
                .setFooter({ text: `هاتە داخوازکرن ژلایێ ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://mahto.id/chat-exporter?url=${attachment.url}`)
                    .setLabel('بینینا Transcript')
            );

            await TranChannel.send({ embeds: [embedComplete], files: [attachment] }); // زێدەکرنا attachment
            await sentMessage.edit({ embeds: [embedComplete], components: [actionRow] });

            
            const deleteEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("**دێ تیکێت د ماوێ 10 چرکەیان دا هێتە ژێبرن...**");

            await message.channel.send({ embeds: [deleteEmbed] });
            setTimeout(async () => {
                await message.channel.delete().catch(e => console.error("Error deleting channel:", e));
            }, 10000);

        } catch (error) {
            console.error(error);
            await message.reply('**خەلەتیەک چێبوو دەمێ دروستکرنا Transcript.**');
        }
    }
});    


// **Slash Command Loader**
const slashcommands = [];
const slashTable = new ascii('SlashCommands').setJustify();

readdirSync('./SlashCommands/')
  .filter(folder => !folder.includes('.'))
  .forEach(folder => {
    readdirSync(`./SlashCommands/${folder}`)
      .filter(file => file.endsWith('.js'))
      .forEach(file => {
        const command = require(`./SlashCommands/${folder}/${file}`);
        if (command && command.data) {
          slashcommands.push(command.data.toJSON());
          client.slashcommands.set(command.data.name, command);
          slashTable.addRow(`/${command.data.name}`, '🟢 کار دکەت');
        }
      });
  });

console.log(slashTable.toString());


// **Event Loader**
['Events', 'Rows'].forEach(category => {
  readdirSync(`./${category}/`)
      .filter(folder => !folder.includes('.'))
      .forEach(folder => {
          readdirSync(`./${category}/${folder}`)
              .filter(file => file.endsWith('.js'))
              .forEach(file => {
                  const event = require(`./${category}/${folder}/${file}`);
                  if (event.name) {
                      if (event.once) {
                          client.once(event.name, (...args) => event.execute(client, ...args)); // زێدەکرنا client
                      } else {
                          client.on(event.name, (...args) => event.execute(client, ...args)); // زێدەکرنا client
                      }
                  }
              });
      });

  readdirSync(`./${category}/`)
      .filter(file => file.endsWith('.js'))
      .forEach(file => {
          // ئەڤە تەنها بوو Events-ێن ڕاستەوخۆ د ناڤ فۆلدەرێ Events دا
          // require(`./${category}/${file}`); // بێهنا ڤێ قەتارا دکەم دا دووبارە نەبیت
      });
});


// **Prefix Command Loader**
const commands = []; 
const table2 = new ascii('Prefix Commands').setJustify();
for (let folder of readdirSync('./Commands/').filter(folder => !folder.includes('.'))) {
  for (let file of readdirSync('./Commands/' + folder).filter(f => f.endsWith('.js'))) {
	  let command = require(`./Commands/${folder}/${file}`);
	  if(command) {
		commands.push(command);
  client.commands.set(command.name, command);
		  if(command.name) {
			  table2.addRow(`${command.name}` , '🟢 کار دکەت')
		  }
		  if(!command.name) {
			  table2.addRow(`${command.name}` , '🔴 کار ناکەت')
		  }
	  }
  }
}
console.log(table2.toString())

// 9. Interaction: Help Menu (گۆهارتنا پەیاما پاشڤەدایی)
client.on('interactionCreate', async(interaction) => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'help_menu') return;

    try {

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }

        const selectedOption = interaction.values[0];
        let responseContent = '';

        switch (selectedOption) {
            case 'owner_commands':
                responseContent = `**> فەرمانێن خودانی (Owner Commands):**\n\n\`*\` /bot-cotrol\n\`*\` /join-voice \n\`*\` /cmd-shortcut \n\`*\` /calculator setchannel\n\`*\` /calculator removechannel\n\`*\` /create-room\n\`*\` /change-server name\n\`*\` /change-server avatar\n\`*\` /change-server banner\n\`*\` /fonts setchannel\n\`*\` /fonts removechannel\n`;
                break;
            case 'admin_commands':
                responseContent = ` ** > فەرمانێن ئەدمینێ (Admin Commands):** \n\n\`*\` ${prefix}unban\n\`*\` ${prefix}come \n\`*\` ${prefix}clear \n\`*\` ${prefix}say \n\`*\` ${prefix}ban \n\`*\` ${prefix}user \n\`*\` ${prefix}avatar\n\`*\` ${prefix}lock\n\`*\` ${prefix}unlock\n\`*\` ${prefix}hide\n\`*\` ${prefix}unhide\n\`*\` ${prefix}server\n\`*\` ${prefix}hide-all\n\`*\` ${prefix}unhide-all\n\`*\` ${prefix}lock-all\n\`*\` ${prefix}unlock-all\n\`*\` ${prefix}unban-all\n-----------------------------------------\n\`*\` /ban\n\`*\` /ban-list\n\`*\` /embed send\n\`*\` /embed edit\n\`*\` /category hide\n\`*\` /category unhide\n\`*\` /category hidechannel\n\`*\` /category unhidechannel\n\`*\` /category delete\n\`*\` /kick\n\`*\` /lock\n\`*\` /unlock\n\`*\` /mute\n\`*\` /unmute\n\`*\` /mute list\n\`*\` /say\n\`*\` /slowmode set\n\`*\` /slowmode list\n\`*\` /timeout add\n\`*\` /timeout remove\n\`*\` /timeout list\n\`*\` /unban-all\n\`*\` /voice-move all\n\`*\` /voice-move user\n\`*\` /warn add\n\`*\` /warn remove\n\`*\` /warn list\n`;
                break;
            case 'public_commands':
                responseContent = `**> فەرمانێن گشتی (Public Commands):**\n\n\`*\` ${prefix}avatar \n\`*\` /avatar \n\`*\` /avatar-server \n\`*\` /afk \n\`*\` /big-name \n\`*\` /bot-invite \n\`*\` ${prefix}fonts\n`;
                break;
                case 'giveaway_commands':
                responseContent = `**> فەرمانێن Giveaway:**\n\n\`*\` ${prefix}drop \n\`*\` /g-start \n\`*\` /g-roll \n\`*\` /g-end **`;
                break;
                 case 'ticket_commands':
                responseContent = `**> فەرمانێن تیکێتێ (Ticket Commands):**\n\n\`*\` /ticket-setup\n\`*\` /ticket-manage\n\`*\` /transcrip-setup\n\`*\` /rename\n\`*\` /add\n\`*\` /remove\n\`*\` ${prefix}delete\n`;

                         break;
                 case 'invites_commands':
                responseContent = `**> فەرمانێن سیستەمێ دوعەتکرنێ (Invites System):**\n\n\`*\` /invites check\n\`*\` /invites add\n\`*\` /invites channel\n\`*\` /invites remove-channel\n\`*\` /invites reset-all\n\`*\` /invites reset-user\n`;

                       break;
                 case 'bad_commands':
           responseContent = `**> فەرمانێن پەیڤێن نەهەژان (Bad Words System):**\n\n\`*\` /bad-word add \n\`*\` /bad-word remove \n\`*\` /bad-word list **`;

                     break;
               case 'emoji_commands':
               responseContent = `**> فەرمانێن ئیمۆجی (Emoji System):**\n\n\`*\` ${prefix}add-emoji\n\`*\` /add-sticker\n\`*\` /add-emoji  \n\`*\` /emoji-channel set \n\`*\` /emoji-channel remove **`;

                      break;
                      case 'reply_commands':
                     responseContent = `**> فەرمانێن بەرسڤدانا خۆکار (Auto Reply):**\n\n\`*\` /autorelpy add\n\`*\` /autoreply remove\n\`*\` /autorelpy list\n`;

                        break;
                case 'react_commands':
         responseContent = `**> فەرمانێن ئۆتۆ-ریاکشن (Auto Reaction):**\n\n\`*\` /autoreact setchannel\n\`*\` /autoreact removechannel\n\`*\` /autoreact list\n`;

                              break;
                          case 'feedback_commands':
                    responseContent = `**> فەرمانێن Feedback:**\n\n\`*\` /feedback-room\n\`*\` /remove-feedback\n\`*\` /feedback-mode\n\`*\` /feedback-line\n`;

                        break;
                       case 'temp_commands':
                     responseContent = `**> فەرمانێن کێنتڕۆلا چانێلێن دەمکی (Temp Voice):**\n\n\`*\` /temp-voice setup\n\`*\` /temp-voice disable\n\`*\` /temp-voice panel\n\`*\` ${prefix}temp\n`;

                        break;
                    case 'welcome_commands':
                 responseContent = `**> فەرمانێن سیستەمێ پێشوازیێ (Welcome - Auto Role):**\n\n\`*\` /auto-role add\n\`*\` /auto-role remove\n\`*\` /auto-role list\n`;

                           break;
                          case 'webhook_commands':
                          responseContent = `**> فەرمانێن Webhook:**\n\n\`*\` /webhook create\n\`*\` /webhook delete\n\`*\` /webhook list\n\`*\` /webhook deleteall\n`;

                           break;
                        case 'count_commands':
                       responseContent = `**> فەرمانێن سیستەمێ هەژمارتنێ (Counting):**\n\n\`*\` /counting setup\n\`*\` /counting top\n\`*\` /counting leaderboard\n\`*\` /counting remove\n\`*\` /counting reset\n\`*\` /counting emoji\n`;

                                 break;
                           case 'security_commands':
                 responseContent = `**> فەرمانێن پاراستنێ (Security):**\n\n\`*\` /security antilinks\n\`*\` /security antidelete-channels\n\`*\` /security antidelete-roles\n\`*\` /security antidelete-categories\n\`*\` /security antiban\n\`*\` /security antikick\n\`*\` /security whitelist\n`;

                                 break;
                         case 'logs_commands':
                   responseContent = `**> فەرمانێن تۆمارکرنێ (Logs):**\n\n\`*\` /setup-logs create\n\`*\` /setup-logs delete\n`;

                             break;
                       case 'black_commands':
                    responseContent = `**> فەرمانێن Blacklist:**\n\n\`*\` /blacklist setup\n\`*\` /blacklist add\n\`*\` /blacklist remove\n`;

                             break;
                           case 'level_commands':
                    responseContent = `**> فەرمانێن ئاستی (Level):**\n\n\`*\` /level setup\n\`*\` /level add\n\`*\` /level remove\n\`*\` /level reset\n\`*\` /level channel\n\`*\` /level requirements\n\`*\` ${prefix}profile\n`;

                     break;
                    case 'roles_commands':
                responseContent = `**> فەرمانێن ڕۆلان (Roles):**\n\n\`*\` /color-roles create\n\`*\` /color-roles panel\n\`*\` /color-roles delete\n\`*\` /role create\n\`*\` /role rename\n\`*\` /temp-role\n\`*\` /role multiple\n\`*\` /role user\n\`*\` /role remove_user\n`;
        }


        await interaction.followUp({ content: responseContent, ephemeral: true }).catch(console.error);
    } catch (error) {
        console.error("خەلەتی د Interaction-ێ دا:", error);
    }
});

// 10. Event: MessageCreate (AFK System)
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const check = await afkSchema.findOne({
      Guild: message.guild.id,
      User: message.author.id,
  });
  if (check) {
      await afkSchema.deleteMany({
          Guild: message.guild.id,
          User: message.author.id,
      });
      const m1 = await message.reply({
          content: `**ب خێر هاتیڤە، ${message.author}! ئەزێ AFK ل سەر تە ژێبەم.**`,
      });
  } else {
      const members = message.mentions.users.first();
      if (!members) return;
      const Data = await afkSchema.findOne({
          Guild: message.guild.id,
          User: members.id,
      });
      if (!Data) return;

      const member = message.guild.members.cache.get(members.id);
      const msg = Data.Message || "ئەز AFK مە!";
      if (message.content.includes(members)) {
          const m = await message.reply({
              content: `${member.user.tag} نوکە AFK یە! - ئەگەر: **${msg}**`,
          });
      }
  }
});


// 11. Event: MessageCreate (Auto Reply System)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

   
    const autoReplies = await AutoReply.find({ Guild: message.guild.id });

    for (const autoReply of autoReplies) {
        if (autoReply.Search && message.content.includes(autoReply.Message)) {
            
            if (autoReply.Type === 'reply') {
                return message.reply(autoReply.Reply);
            } else if (autoReply.Type === 'send') {
                return message.channel.send(autoReply.Reply);
            }
        } else if (!autoReply.Search && message.content === autoReply.Message) {
           
            if (autoReply.Type === 'reply') {
                return message.reply(autoReply.Reply);
            } else if (autoReply.Type === 'send') {
                return message.channel.send(autoReply.Reply);
            }
        }
    }
});


// 12. Prefix Command: clear
client.on('messageCreate', async message => {
  const cmd = shortcutDB.get(`clear_cmd_${message.guild.id}`) || null;
    if (message.author.bot) return;
    if (message.content.startsWith(`${prefix}clear`) || message.content.startsWith(`${cmd}`)) {
     if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('**پێدڤیە دەستهەلاتا (Manage Messages) هەبیت.**');
        const args = message.content.split(' ').slice(1);
        const amount = args[0] ? parseInt(args[0]) : 99;
        if (isNaN(amount) || amount <= 0 || amount > 100) return message.reply('**پێدڤیە ژمارەیەک بێ ئێک و سەدێ (1-100) بنڤیسی.**');
        try {
            const fetchedMessages = await message.channel.messages.fetch({ limit: amount });
            const messagesToDelete = fetchedMessages.filter(msg => {
                const fourteenDays = 14 * 24 * 60 * 60 * 1000;
                return (Date.now() - msg.createdTimestamp) < fourteenDays;
            });
            await message.channel.bulkDelete(messagesToDelete, true);
            await message.channel.send(`**${messagesToDelete.size} پەیام هاتنە ژێبرن.**`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
        } catch (error) {
            message.reply('**نەشێم پەیامان بژێمم یان پەیام ژ 14 ڕۆژان کەڤنترن.**');
        }
    }
});

// 13. Prefix Command: come
client.on('messageCreate', async message => {
const cmd = await shortcutDB.get(`come_cmd_${message.guild.id}`) || null;  
    if (message.content.startsWith(`${prefix}come`) || message.content.startsWith(`${cmd}`)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('**پێدڤیە دەستهەلاتا (Manage Messages) هەبیت.**');
        }

        const mentionOrID = message.content.split(/\s+/)[1];
        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(mentionOrID);

        if (!targetMember) {
            return message.reply('**تکایە ناڤێ یان ئایدیێ ئەندامی بنڤیسە.**');
        }

        const directMessageContent = `**تۆ هاتى گازی کرن ژلایێ : ${message.author}\nل : ${message.channel}**`;

        try {
            await targetMember.send(directMessageContent);
            await message.reply('**پەیام بوو ئەندامی هاتە رەوانەکرن ب سەرکەفتی.**');
        } catch (error) {
            await message.reply('**نەشیام پەیامی بوو ئەندامی فڕێ بکەم (Private Message-ا وی گرتە).**');
        }
    }
});

// 14. Prefix Command: lock
client.on("messageCreate", async (message) => {
  const cmd = await shortcutDB.get(`lock_cmd_${message.guild.id}`) || null;
  
  if (message.content === `${prefix}lock` || message.content === `${cmd}`) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply({ content: `**پێدڤیە دەستهەلاتا (Manage Channels) هەبیت.**` });
      }
      await message.channel.permissionOverwrites.edit(
        message.channel.guild.roles.everyone, 
        { SendMessages: false }
      );
      return message.reply({ content: `**${message.channel} هاتە قفلکرن (Locked).**` });
    } catch (error) {
      message.reply({ content: `**خەلەتیەک چێبوو، پەیوەندی ب گەشەپێدەران ڤە بکە.**` });
      console.log(error);
    }
  }
});

// 15. Prefix Command: unlock
client.on("messageCreate", async (message) => {
const cmd = await shortcutDB.get(`unlock_cmd_${message.guild.id}`) || null;  
  if (message.content === `${prefix}unlock` || message.content === `${cmd}`) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply({ content: `**پێدڤیە دەستهەلاتا (Manage Channels) هەبیت.**` });
    }
      await message.channel.permissionOverwrites.edit(
      message.channel.guild.roles.everyone, 
      { SendMessages: true }
    );
    return message.reply({ content: `**${message.channel} هاتە ڤەکرن (Unlocked).**` });
  }
});

// 16. Prefix Command: hide
client.on("messageCreate", async (message) => {
const cmd = await shortcutDB.get(`hide_cmd_${message.guild.id}`) || null;  
  if (message.content === `${prefix}hide` || message.content === `${cmd}`) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply({ content: `**پێدڤیە دەستهەلاتا (Manage Channels) هەبیت.**` });
    }
      await message.channel.permissionOverwrites.edit(
      message.channel.guild.roles.everyone, 
      { ViewChannel: false }
    );
    return message.reply({ content: `**${message.channel} هاتە ڤەشارتن (Hidden).**` });
  }
});

// 17. Prefix Command: unhide
client.on("messageCreate", async (message) => {
const cmd = await shortcutDB.get(`unhide_cmd_${message.guild.id}`) || null; 
  if (message.content === `${prefix}unhide` || message.content === `${cmd}`) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply({ content: `**پێدڤیە دەستهەلاتا (Manage Channels) هەبیت.**` });
    }
      await message.channel.permissionOverwrites.edit(
      message.channel.guild.roles.everyone, 
      { ViewChannel: true }
    );
    return message.reply({ content: `**${message.channel} هاتە ئاشکەراکرن (Unhidden).**` });
  }
});

// 18. Prefix Command: server
client.on("messageCreate", async (message) => {
const cmd = await shortcutDB.get(`server_cmd_${message.guild.id}`) || null;
  if (message.content === `${prefix}server` || message.content === `${cmd}`) {
    const embedser = new EmbedBuilder()
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setColor('Random')
      .addFields(
        {
          name: `**🆔 ئایدیێ سێرڤەری:**`, 
          value: message.guild.id, 
          inline: false
        },
        {
          name: `**📆 دەمێ دروستکرنێ:**`, 
          value: `**<t:${parseInt(message.guild.createdTimestamp / 1000)}:R>**`, 
          inline: false
        },
        {
          name: `**👑 خودان:**`, 
          value: `**<@${message.guild.ownerId}>**`, 
          inline: false
        },
        {
          name: `**👥 ئەندام (${message.guild.memberCount})**`, 
          value: `**${message.guild.premiumSubscriptionCount} بۆوست ✨**`, 
          inline: false
        },
        {
          name: `**💬 چانێل (${message.guild.channels.cache.size})**`, 
          value: `**${message.guild.channels.cache.filter(r => r.type === ChannelType.GuildText).size}** Text | **${
              message.guild.channels.cache.filter(r => r.type === ChannelType.GuildVoice).size
            }** Voice | **${message.guild.channels.cache.filter(r => r.type === ChannelType.GuildCategory).size}** Category`,
          inline: false
        },
        {
          name: '🌍 زانیاریێن دی',
          value: `**ئاستێ پشتڕاستکرنێ:** ${message.guild.verificationLevel}`,
          inline: false
        }
      )
      .setThumbnail(message.guild.iconURL({ dynamic: true }));
    return message.reply({ embeds: [embedser] });
  }
});

// 19. Prefix Command: ban
client.on('messageCreate', async message => {
    const cmd = await shortcutDB.get(`ban_cmd_${message.guild.id}`) || null;
    if (message.content.startsWith(`${prefix}ban`) || message.content.startsWith(`${cmd}`)) {
        
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply('**پێدڤیە دەستهەلاتا (Ban Members) هەبیت.**');
        }

        const args = message.content.split(' ');
        const targetUser = message.mentions.members.first() || 
            (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);

        if (!targetUser) {
            return message.reply('**تکایە ئەندامەکێ (منشن یان ئایدی) بنڤیسە بوو بانکرنێ.**');
        }

        if (!targetUser.bannable) {
            return message.reply('**نەشێم ئەڤی ئەندامی بان بکەم.**');
        }

        const reason = args.slice(2).join(' ') || 'ئەگەر نینە';

        try {
            // Send DM to user before banning
            try {
                await targetUser.send(`**تۆ هاتى بانکرن ژ سێرڤەرێ ${message.guild.name}\nئەگەر: ${reason}**`);
            } catch (err) {
                console.log(`نەشیام پەیام بوو ئەندامی (${targetUser.user.tag}) فڕێ بکەم.`);
            }

            // Ban the user
            await targetUser.ban({ reason: reason });

            // Send confirmation
            await message.reply(`**✅ ${targetUser.user.tag} هاتە بانکرن\nژلایێ: ${message.author.tag}\nئەگەر: ${reason}**`);

        } catch (error) {
            console.error(error);
            message.reply('**خەلەتیەک چێبوو دەمێ بانکرنێ.**');
        }
    }
});

// 20. Prefix Command: unban
client.on('messageCreate', async message => {
        const cmd = await shortcutDB.get(`unban_cmd_${message.guild.id}`) || null;
        if (message.content.startsWith(`${prefix}unban`) || message.content.startsWith(`${cmd}`)) {
         
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply('**پێدڤیە دەستهەلاتا (Ban Members) هەبیت.**');
            }
    
           
            const userId = message.content.split(' ')[1];
            if (!userId) {
                return message.reply('**تکایە ئایدیێ کەسی بنڤیسە.**');
            }
    
            try {
                
                const banList = await message.guild.bans.fetch();
                const bannedUser = banList.find(ban => ban.user.id === userId);
    
                if (!bannedUser) {
                    return message.reply('**ئەڤ کەسە بان نەهاتیە کرن.**');
                }
    
             
                await message.guild.members.unban(userId);
                
                
                await message.reply(`**✅ بان ل سەر ${bannedUser.user.tag} هاتە ڤەکرن.**`);
    
            } catch (error) {
                console.error(error);
                message.reply('**خەلەتیەک چێبوو دەمێ ڤەکرنا بانێ.**');
            }
        }
    });

// 21. Prefix Command: user
    client.on('messageCreate', async message => {
        const cmd = await shortcutDB.get(`user_cmd_${message.guild.id}`) || null;
        if (message.content.startsWith(`${prefix}user`) || message.content.startsWith(`${cmd}`)) {
            try {
                const member = message.mentions.members.first() 
                    || message.guild.members.cache.get(message.content.split(' ')[1]) 
                    || message.member;
    
                const joinPosition = Array.from(message.guild.members.cache
                    .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
                    .keys())
                    .indexOf(member.id) + 1;
    
                const avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 4096 });
    
                const embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: member.user.tag, 
                        iconURL: avatarURL
                    })
                    .setColor('Random')
                    .setThumbnail(avatarURL)
                    .addFields(
                        { 
                            name: '👤 زانیاریێن هەژماری',
                            value: [
                                `**• ناڤێ ئەندامی:** ${member.user.username}`,
                                `**• ناڤێ ئاشکەرا:** ${member.displayName}`,
                                `**• ئایدی (ID):** ${member.id}`,
                                `**• دەمێ دروستکرنا هەژمارێ:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '📋 زانیاریێن ئەندامێ سێرڤەری',
                            value: [
                                `**• دەمێ هاتنێ:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                                `**• ژمارا هاتنێ:** ${joinPosition}`,
                                `**• ناڤێ تایبەت (Nickname):** ${member.nickname || 'نینە'}`,
                                `**• بلندترین ڕۆل:** ${member.roles.highest}`,
                                `**• ڕۆلێن دی [${member.roles.cache.size - 1}]:** ${member.roles.cache
                                    .filter(r => r.id !== message.guild.id)
                                    .map(r => `${r}`)
                                    .join(', ') || 'نینە'}`
                            ].join('\n'),
                            inline: false
                        }
                    )
                    .setFooter({ 
                        text: `هاتە داخوازکرن ژلایێ ${message.author.tag}`, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTimestamp();
    
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`copy_id_${member.id}`)
                            .setLabel('کۆپی کرنا ID')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('📋')
                    );
    
                const response = await message.reply({
                    embeds: [embed],
                    components: [row]
                });
    
                const collector = response.createMessageComponentCollector({ time: 60000 });
    
                collector.on('collect', async i => {
                    if (i.customId === `copy_id_${member.id}`) {
                        await i.reply({
                            content: `\`${member.id}\``,
                            ephemeral: true
                        });
                    }
                });
    
                collector.on('end', () => {
                    row.components[0].setDisabled(true);
                    response.edit({ components: [row] }).catch(() => {});
                });
    
            } catch (error) {
                console.error(error);
                await message.reply('❌ خەلەتیەک چێبوو دەمێ هینان و نیشادانا زانیاریێن ئەندامی.');
            }
        }
    });

// 22. Prefix Command: tax
client.on('messageCreate', async message => {
  const cmd = await shortcutDB.get(`tax_cmd_${message.guild.id}`) || null; 
      if (message.content.startsWith(`${prefix}tax`) || message.content.startsWith(`${cmd}`)) {
          const args = message.content.startsWith(`${prefix}tax`) 
              ? message.content.slice(`${prefix}tax`.length).trim() 
              : message.content.slice(`${cmd}`.length).trim();
  
          let number = args;
          if (number.endsWith("k")) number = number.replace(/k/gi, "") * 1000;
          else if (number.endsWith("K")) number = number.replace(/K/gi, "") * 1000;
          else if (number.endsWith("m")) number = number.replace(/m/gi, "") * 1000000;
          else if (number.endsWith("M")) number = number.replace(/M/gi, "") * 1000000;
  
          let number2 = parseFloat(number);
  
          if (isNaN(number2)) {
              return message.reply('**تکایە ژمارەیەکێ دروست ل پاش فەرمانێ بنڤیسە.**');
          }
  
          let tax = Math.floor(number2 * (20) / (19) + 1); 
          let tax2 = Math.floor(tax - number2); 
  
          await message.reply(`**ژمارا ب تاکس (Tax): ${tax}**`);
      }
  });

// 23. Event: MessageCreate (Emoji Channel)
function parseEmoji(emoji) {
  const match = emoji.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
  if (!match) return null;

  return {
      animated: Boolean(match[1]),
      name: match[2],
      id: match[3],
  };
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  
  const emojiChannelConfig = await EmojiChannel.findOne({ Guild: message.guild.id });
  if (!emojiChannelConfig || message.channel.id !== emojiChannelConfig.Channel) return;

 
  const emojisRaw = message.content.split(' ').map(emoji => emoji.trim());
  const addedEmojis = [];
  const failedEmojis = [];

 
  const isImage = (url) => {
      const extension = url.split('.').pop().toLowerCase();
      return ['png', 'jpg', 'jpeg', 'gif'].includes(extension);
  };

  for (const emojiRaw of emojisRaw) {
      let link;
      let name;

      const emoteMatch = emojiRaw.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/i);
      if (emoteMatch) {
          const parsedEmoji = parseEmoji(emoteMatch[0]);
          if (parsedEmoji) {
              link = `https://cdn.discordapp.com/emojis/${parsedEmoji.id}.${parsedEmoji.animated ? 'gif' : 'png'}`;
              name = parsedEmoji.name; 
          }
      } else if (isImage(emojiRaw)) {
          link = emojiRaw;
          name = `emoji_${Date.now()}`; 
      } else {
          failedEmojis.push(emojiRaw);
          continue;
      }

      if (!link) continue;

      try {
          const emoji = await message.guild.emojis.create({ attachment: link, name: name });
          addedEmojis.push(emoji);
      } catch (error) {
          console.error(`خەلەتی د زێدەکرنا ئیمۆجیێ: ${name}`, error); 
          failedEmojis.push(emojiRaw);
      }
  }

  const responseMessage = [];
  if (addedEmojis.length) {
      responseMessage.push(`**✅ ${addedEmojis.length} ئیمۆجی هاتنە زێدەکرن: ${addedEmojis.join(', ')}**`);
  }
  if (failedEmojis.length) {
      responseMessage.push(`**❌ نەشیام ئەڤان ئیمۆجیان زێدە بکەم: ${failedEmojis.join(', ')}**`);
  }

  if (responseMessage.length) {
      await message.reply({ content: responseMessage.join('\n') });
  }
});


// 24. Prefix Command: ch (Channel ID)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  
  if (message.content.startsWith(`${prefix}ch`)) {
      const mentionedChannel = message.mentions.channels.first();

      if (!mentionedChannel) {
          return message.reply('**تکایە چانێلەکێ (Mention) بکە بوو هینانا ID.**');
      }

     
      return message.reply(`**ID-ێ چانێلێ:** \`${mentionedChannel.id}\``);
  }
});

// 25. Prefix Command: id (Member ID)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  
  if (message.content.startsWith(`${prefix}id`)) {
      const mentionedMember = message.mentions.members.first();

      if (!mentionedMember) {
          return message.reply('**تکایە ئەندامەکێ (Mention) بکە بوو هینانا ID.**');
      }

      
      return message.reply(`**ID-ێ ئەندامی:** \`${mentionedMember.id}\``);
  }
});

// 26. Event: MessageCreate (AFK Prefix Check)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;


  const afkCheck = await afkSchema.findOne({
      Guild: message.guild.id,
      User: message.author.id
  });

  if (afkCheck) {
      await afkSchema.findOneAndDelete({
          Guild: message.guild.id,
          User: message.author.id
      });

      const welcomeBack = new EmbedBuilder()
          .setColor('Green')
          .setDescription(`**ب خێر هاتیڤە ${message.author}! ئەزێ AFK ل سەر تە ژێبەم.**`);

      message.reply({ embeds: [welcomeBack] }).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
  }

  
  const mentionedUsers = message.mentions.users;
  if (mentionedUsers.size > 0) {
      for (const [, mentionedUser] of mentionedUsers) {
          // بکارئینانا afkSchema نە affkSchema (خەلەتیا نووسینێ چێکرن)
          const afkUser = await afkSchema.findOne({
              Guild: message.guild.id,
              User: mentionedUser.id
          });

          if (afkUser) {
              const afkEmbed = new EmbedBuilder()
                  .setColor('Yellow')
                  .setTitle(`${mentionedUser.tag} AFK یە`)
                  .addFields(
                      { name: 'ئەگەر', value: afkUser.Message || 'ئەگەر نەهاتیە نڤیسین.' },
                      { name: 'ژ وێ گاڤێ', value: `<t:${Math.floor(afkUser.Time / 1000)}:R>` }
                  );

              message.reply({ embeds: [afkEmbed] });
          }
      }
  }
});


// 27. Interaction: Banner Button (بۆ Prefix Avatar Command)
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  
  if (interaction.customId.startsWith('show_banner_')) {
      const userId = interaction.customId.split('_')[2]; 
      const user = await client.users.fetch(userId); 
      const bannerUrl = user.bannerURL({ dynamic: true, size: 1024 });

      if (bannerUrl) {
          const bannerEmbed = new EmbedBuilder()
              .setTitle(`بنەرێ (Banner) یێ ${user.username}`)
              .setImage(bannerUrl)
              .setColor('Random')
              .setFooter({ text: `هاتە داخوازکرن ژلایێ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

          await interaction.reply({ embeds: [bannerEmbed], ephemeral: true }); 
      } else {
          await interaction.reply({ content: '**ئەڤ ئەندامە بنەرێ (Banner) وی نینە.**', ephemeral: true });
      }
  }
});


// 28. Prefix Command: avatar
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(`${prefix}avatar`) || message.author.bot) return;

  const user = message.mentions.users.first() || message.author;
  const member = message.guild.members.cache.get(user.id);
  const userDetails = await user.fetch();

  const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 4096 });
  const bannerUrl = userDetails.bannerURL({ dynamic: true, size: 4096 });

  const embed = new EmbedBuilder()
      .setTitle(`زانیاریێن ${user.username}`)
      .setThumbnail(avatarUrl)
      .setColor('Random')
      .setTimestamp()
      .setFooter({ text: `هاتە داخوازکرن ژلایێ ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

  const row = new ActionRowBuilder()
      .addComponents(
          new ButtonBuilder()
              .setCustomId('show_avatar')
              .setLabel('ئەڤەتار')
              .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
              .setCustomId('show_banner')
              .setLabel('بنەر (Banner)')
              .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
              .setCustomId('show_userid')
              .setLabel('ئایدی (ID)')
              .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
              .setCustomId('show_serverid')
              .setLabel('ئایدیێ سێرڤەری')
              .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
              .setCustomId('show_invite')
              .setLabel('لینکێ سێرڤەری')
              .setStyle(ButtonStyle.Success)
      );

  const botMessage = await message.channel.send({ embeds: [embed], components: [row] });

  const collector = botMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id
  });

  collector.on('collect', async (interaction) => {
      const ephemeralEmbed = new EmbedBuilder()
          .setColor('Random')
          .setTimestamp()
          .setFooter({ text: `هاتە داخوازکرن ژلایێ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

      switch (interaction.customId) {
          case 'show_avatar':
              ephemeralEmbed
                  .setTitle(`ئەڤەتارێ ${user.username}`)
                  .setImage(avatarUrl)
                  .setDescription('ئەڤەتارێ ئەندامی');
              break;
          case 'show_banner':
              if (bannerUrl) {
                  ephemeralEmbed
                      .setTitle(`بنەرێ ${user.username}`)
                      .setImage(bannerUrl)
                      .setDescription('بنەرێ ئەندامی');
              } else {
                  ephemeralEmbed
                      .setDescription('**ئەڤ ئەندامە بنەرێ وی نینە.**');
              }
              break;
          case 'show_userid':
              ephemeralEmbed
                  .setTitle('ئایدیێ ئەندامی')
                  .setDescription(`🆔 **ئایدیێ ${user.username}:** \`${user.id}\``);
              break;
          case 'show_serverid':
              ephemeralEmbed
                  .setTitle('ئایدیێ سێرڤەری')
                  .setDescription(`**ئایدیێ سێرڤەری:** \`${message.guild.id}\``);
              break;
          case 'show_invite':
              try {
                  const invite = await message.channel.createInvite({
                      maxAge: 0,
                      maxUses: 0
                  });
                  ephemeralEmbed
                      .setTitle('لینكێ دوعەتێ')
                      .setDescription(`🔗 **لینكێ دوعەتکرنا سێرڤەری:** ${invite.url}`);
              } catch (error) {
                  ephemeralEmbed
                      .setDescription('**نەشیام لینکێ دوعەتکرنێ دروست بکەم.**');
              }
              break;
      }

      
      await interaction.reply({ embeds: [ephemeralEmbed], ephemeral: true });
  });

  collector.on('error', (error) => console.error(error));
});

// 29. Event: MessageCreate (Bad Words System)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const badWords = badWordsDB.get(`badwords_${message.guild.id}`) || [];
  const content = message.content.toLowerCase();

  for (const badWord of badWords) {
      if (content.includes(badWord.word.toLowerCase())) { // گۆهارتن بوو نڤیسینا بچویک
          try {
              
              await message.delete();

              
              await message.member.timeout(badWord.timeout * 1000, 'بکارئینانا پەیڤەکا نەهەژا');

              
              const embed = new EmbedBuilder()
                  .setColor('Red')
                  .setTitle('**پەیڤا نەهەژا**')
                  .setDescription(`${message.author} هاتە تایم-ئۆتکرن بوو ${badWord.timeout} چرکەیان ژبەر بکارئینانا پەیڤەکا نەهەژا.`)
                  .setTimestamp();

              const warningMsg = await message.channel.send({ embeds: [embed] });
              
              
              setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
              
              break; 
          } catch (error) {
              console.error('خەلەتی د سیستەمێ پەیڤێن نەهەژا:', error);
          }
      }
  }
});


// 30. Event: guildMemberAdd (Auto Role System)
client.on('guildMemberAdd', async (member) => {
  try {
      const autoRoles = autoRoleDB.get(`autoroles_${member.guild.id}`) || [];
      
      if (autoRoles.length > 0) {
          for (const roleId of autoRoles) {
              const role = member.guild.roles.cache.get(roleId);
              if (role) {
                  await member.roles.add(role);
              }
          }
          
          
          const logChannel = member.guild.systemChannel;
          if (logChannel) {
              const embed = new EmbedBuilder()
                  .setColor('Green')
                  .setTitle('رۆلێن خۆکار')
                  .setDescription(`رۆلێن خۆکار هاتنە دان ب ${member.user.tag}`)
                  .setTimestamp();
              
              await logChannel.send({ embeds: [embed] });
          }
      }
  } catch (error) {
      console.error('خەلەتی د دانانا رۆلێن خۆکار:', error);
  }
});


// 31. Event: MessageCreate (Calculator)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const calculatorChannel = calculatorDB.get(`calculator_${message.guild.id}`);
  if (message.channel.id !== calculatorChannel) return;

 
  const mathRegex = /^\s*(-?\d+(?:\.\d+)?)\s*([-+*/])\s*(-?\d+(?:\.\d+)?)\s*$/;
  const match = message.content.match(mathRegex);

  if (match) {
      const [, num1Str, operator, num2Str] = match;
      const num1 = parseFloat(num1Str);
      const num2 = parseFloat(num2Str);

      let result;
      switch (operator) {
          case '+':
              result = num1 + num2;
              break;
          case '-':
              result = num1 - num2;
              break;
          case '*':
              result = num1 * num2;
              break;
          case '/':
              if (num2 === 0) {
                  return message.reply('**نەشێت بهێتە دابەشکرن ل سەر سفرێ.**');
              }
              result = num1 / num2;
              break;
          default:
              return; 
      }

      message.reply({
          content: `🧮 **ئەنجام (Result):**\n\`${num1} ${operator} ${num2} = ${result}\``,
      });
  } else {
    // بژاردە: ژێبرنا پەیامێ ئەگەر ژمارە و ژمارەپێکرن نەبیت.
    // await message.delete().catch(() => {});
  }
});

// 32. Interaction: Select Menu (Color Roles)
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'color_roles') return;

  try {
      const selectedRoleId = interaction.values[0];
      const member = interaction.member;

      
      const colorRoles = interaction.guild.roles.cache.filter(role => 
          role.name.includes('❤️') || role.name.includes('💙') || 
          role.name.includes('💚') || role.name.includes('💛') || 
          role.name.includes('💜') || role.name.includes('🤎') ||
          role.name.includes('🧡') || role.name.includes('💗') ||
          role.name.includes('🤍') || role.name.includes('🖤') ||
          role.name.includes('💠') || role.name.includes('🔮') ||
          role.name.includes('🌺') || role.name.includes('🌸') ||
          role.name.includes('🍏')
      );

      await member.roles.remove(colorRoles);

      
      const selectedRole = interaction.guild.roles.cache.get(selectedRoleId);
      await member.roles.add(selectedRole);

      await interaction.reply({
          content: `**✅ رەنگێ تە ب سەرکەفتی هاتە گۆهارتن بوو ${selectedRole.name}!**`,
          ephemeral: true
      });
  } catch (error) {
      console.error(error);
      await interaction.reply({
          content: '**❌ خەلەتیەک چێبوو دەمێ گۆهارتنا رەنگێ تە.**',
          ephemeral: true
      });
  }
});

// 33. Event: MessageCreate (Font Channel)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const fontChannel = fontChannelDB.get(`fontchannel_${message.guild.id}`);
  if (message.channel.id !== fontChannel) return;

  const text = message.content;
  let response = '';

 
  response += `**Serif:** ${DecorativeFont.serif(text)}\n`;
  response += `**Fraktur:** ${DecorativeFont.Fraktur(text)}\n`;
  response += `**Bold:** ${DecorativeFont.bold(text)}\n`;
  response += `**Italic:** ${DecorativeFont.Italic(text)}\n`;
  response += `**MT Bold:** ${DecorativeFont.MTBold(text)}\n`;
  response += `**Edwardian:** ${DecorativeFont.Edwardian(text)}\n`;
  response += `**Buckle:** ${DecorativeFont.buckle(text)}`;

  await message.reply({ content: `**فۆنتێن نوو بوو نڤیسینا تە:**\n${response}` });
});


// 34. Event: MessageCreate (Auto React)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const emoji = autoReactDB.get(`autoreact_${message.guild.id}_${message.channel.id}`);
  if (!emoji) return;

  try {
      await message.react(emoji);
  } catch (error) {
      console.error('خەلەتی د دانانا ریاکشن:', error);
  }
});


// 35. Event: voiceStateUpdate (Temp Voice System)
const tempChannels = new Map();

client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
      if (newState.member.user.bot) return; 

      const config = tempVoiceDB.get(`tempvoice_${newState.guild.id}`);
      if (!config) return;

      
      if (newState.channelId === config.joinChannelId) {
          const channel = await newState.guild.channels.create({
              name: `${newState.member.user.username}'s Channel`,
              type: ChannelType.GuildVoice,
              parent: config.categoryId,
              permissionOverwrites: [
                  {
                      id: newState.member.id,
                      allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers]
                  }
              ]
          });

          
          try {
              await newState.member.voice.setChannel(channel.id);
              tempChannels.set(channel.id, newState.member.id);
          } catch (moveError) {
              console.error('خەلەتی د ڤەگوهاستنا ئەندامی بوو چانێلێ نوو:', moveError);
              
              await channel.delete().catch(console.error);
          }
      }

      
      if (oldState.channel && tempChannels.has(oldState.channelId)) {
          if (oldState.channel.members.size === 0) {
              tempChannels.delete(oldState.channelId);
              await oldState.channel.delete().catch(console.error);
          }
      }
  } catch (error) {
      console.error('خەلەتی د سیستەمێ دەنگێ دەمکی:', error);
  }
});


// 36. Interaction: Button/Modal (Temp Voice Controls)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  try {
      if (interaction.isButton() && interaction.customId.startsWith('temp_')) {
          const member = interaction.member;
          const voiceChannel = member.voice.channel;

          if (!voiceChannel || !tempChannels.has(voiceChannel.id)) {
              return interaction.reply({
                  content: '**پێدڤیە تۆ د چانێلا دەنگی یا دەمکی یا خۆدا بی بوو بکارئینانا ڤان کۆنتڕۆلان!**',
                  ephemeral: true
              });
          }

          if (tempChannels.get(voiceChannel.id) !== member.id) {
              return interaction.reply({
                  content: '**تەنها خودانێ چانێلێ دشێت ڤان کۆنتڕۆلان بکاربینیت!**',
                  ephemeral: true
              });
          }

          switch (interaction.customId) {
              case 'temp_lock': {
                  const isLocked = voiceChannel.permissionsFor(interaction.guild.roles.everyone).has(PermissionsBitField.Flags.Connect);
                  await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                      Connect: !isLocked
                  });
                  await interaction.reply({
                      content: `🔒 **چانێل ${isLocked ? 'هاتە قفلکرن (Locked)' : 'هاتە ڤەکرن (Unlocked)'}!**`,
                      ephemeral: true
                  });
                  break;
              }

              case 'temp_limit': {
                  const modal = new ModalBuilder()
                      .setCustomId('temp_limit_modal')
                      .setTitle('دانانا سنورێ ئەندامی');

                  const limitInput = new TextInputBuilder()
                      .setCustomId('limit_input')
                      .setLabel('ژمارا ئەندامان بنڤیسە (0-99)')
                      .setStyle(TextInputStyle.Short)
                      .setPlaceholder('ژمارەکێ د ناڤبەرا 0 و 99 بنڤیسە')
                      .setMinLength(1)
                      .setMaxLength(2)
                      .setRequired(true);

                  modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                  await interaction.showModal(modal);
                  break;
              }

              case 'temp_rename': {
                  const modal = new ModalBuilder()
                      .setCustomId('temp_rename_modal')
                      .setTitle('ناڤ لێ نانانا چانێلێ') ;

                  const nameInput = new TextInputBuilder()
                      .setCustomId('name_input')
                      .setLabel('ناڤێ چانێلێ نوو بنڤیسە')
                      .setStyle(TextInputStyle.Short)
                      .setPlaceholder('ناڤەکێ نوو بوو چانێلا تە')
                      .setMinLength(1)
                      .setMaxLength(32)
                      .setRequired(true);

                  modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                  await interaction.showModal(modal);
                  break;
              }
              case 'temp_claim': {
                const currentOwner = tempChannels.get(voiceChannel.id);
                const currentOwnerMember = await interaction.guild.members.fetch(currentOwner).catch(() => null);
                const claimingMember = interaction.member;
            
                
                const isOwnerInChannel = currentOwnerMember?.voice?.channel?.id === voiceChannel.id;
            
                
                if (!isOwnerInChannel) {
                    
                    if (claimingMember.voice.channel?.id === voiceChannel.id) {
                       
                        tempChannels.set(voiceChannel.id, claimingMember.id);
            
                       
                        await voiceChannel.permissionOverwrites.edit(claimingMember.id, {
                            ManageChannels: true,
                            MoveMembers: true,
                            Connect: true,
                            Speak: true
                        });
            
                        
                        if (currentOwner && currentOwner !== claimingMember.id) {
                            await voiceChannel.permissionOverwrites.edit(currentOwner, {
                                ManageChannels: false,
                                MoveMembers: false
                            });
                        }
            
                        
                        await voiceChannel.setName(`${claimingMember.user.username}'s Channel`);
            
                        await interaction.reply({
                            content: '👑 **تۆ نوکە بوویە خودانێ چانێلێ!** ناڤێ چانێلێ هاتە گۆهارتن ب ناڤێ تە.',
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            content: '**پێدڤیە تۆ د چانێلێ دا بی بوو داخوازکرنا خودانیێ!**',
                            ephemeral: true
                        });
                    }
                } else {
                    await interaction.reply({
                        content: '**خودانێ نوکە هێژ د چانێلێ دایە!**',
                        ephemeral: true
                    });
                }
                break;
            }
              case 'temp_delete': {
                  await voiceChannel.delete();
                  tempChannels.delete(voiceChannel.id);
                  await interaction.reply({
                      content: '**چانێل هاتە ژێبرن!**',
                      ephemeral: true
                  });
                  break;
              }
          }
      }

      
      if (interaction.isModalSubmit()) {
          const voiceChannel = interaction.member.voice.channel;

          if (!voiceChannel || !tempChannels.has(voiceChannel.id)) {
              return interaction.reply({
                  content: '**پێدڤیە تۆ د چانێلا دەنگی یا دەمکی یا خۆدا بی!**',
                  ephemeral: true
              });
          }

          switch (interaction.customId) {
              case 'temp_limit_modal': {
                  const limit = parseInt(interaction.fields.getTextInputValue('limit_input'));

                  if (isNaN(limit) || limit < 0 || limit > 99) {
                      return interaction.reply({
                          content: '**تکایە ژمارەکێ دروست د ناڤبەرا 0 و 99 بنڤیسە!**',
                          ephemeral: true
                      });
                  }

                  await voiceChannel.setUserLimit(limit);
                  await interaction.reply({
                      content: `**سنورێ ئەندامان هاتە دانان ل سەر ${limit}!**`,
                      ephemeral: true
                  });
                  break;
              }

              case 'temp_rename_modal': {
                  const newName = interaction.fields.getTextInputValue('name_input');
                  await voiceChannel.setName(newName);
                  await interaction.reply({
                      content: '**ناڤێ چانێلێ ب سەرکەفتی هاتە گۆهارتن!**',
                      ephemeral: true
                  });
                  break;
              }
          }
      }
  } catch (error) {
      console.error('خەلەتی د Temp Voice Interaction:', error);
      if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
              content: '**خەلەتیەک چێبوو دەمێ جێبەجێکرنا داخوازا تە.**',
              ephemeral: true
          }).catch(() => {});
      }
  }
});


// 37. Prefix Command: temp
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(`${prefix}temp`) || message.author.bot) return;

  
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('**پێدڤیە دەستهەلاتا (Administrator) هەبیت بوو بکارئینانا ڤێ فەرمانێ!**');
  }

  try {
      const config = tempVoiceDB.get(`tempvoice_${message.guild.id}`);
      if (!config) {
          return message.reply('**سیستەمێ دەنگێ دەمکی ئامادە نینە!** بکاربینە: `/temp-voice setup`.');
      }

     
      const embed = new EmbedBuilder()
          .setTitle('🎙️ کۆنتڕۆلێن چانێلێن دەنگی یێن دەمکی')
          .setDescription('بچوو د چانێلا دەنگی دا بوو دروستکرنا چانێلا خۆ یا تایبەت!\n\n**کۆنتڕۆل:**')
          .addFields(
              { name: '🔒 قفلکرن/ڤەکرن', value: 'کۆنتڕۆلکرنا کێ دشێت بێتە چانێلا تە' },
              { name: '👥 سنورێ ئەندامی', value: 'دانانا زێدەترین ژمارا ئەندامان' },
              { name: '✏️ ناڤ گۆهارتن', value: 'گۆهارتنا ناڤێ چانێلا تە' },
              { name: '👑 داخوازا خودانیێ', value: 'داخوازکرنا خودانیێ ئەگەر خودانێ بەرێ چانێل هێلا' },
              { name: '❌ ژێبرن', value: 'ژێبرنا چانێلا تە یا دەمکی' }
          )
          .setColor('Blue')
          .setTimestamp();

      
      const row = new ActionRowBuilder()
          .addComponents(
              new ButtonBuilder()
                  .setCustomId('temp_lock')
                  .setLabel('قفل/ڤەکرن')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🔒'),
              new ButtonBuilder()
                  .setCustomId('temp_limit')
                  .setLabel('سنورێ ئەندامی')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('👥'),
              new ButtonBuilder()
                  .setCustomId('temp_rename')
                  .setLabel('ناڤ گۆهارتن')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('✏️'),
              new ButtonBuilder()
                  .setCustomId('temp_claim')
                  .setLabel('داخوازا خودانیێ')
                  .setStyle(ButtonStyle.Success)
                  .setEmoji('👑'),
              new ButtonBuilder()
                  .setCustomId('temp_delete')
                  .setLabel('ژێبرن')
                  .setStyle(ButtonStyle.Danger)
                  .setEmoji('❌')
          );


          await message.channel.send({
          embeds: [embed],
          components: [row]
      });


      await message.delete().catch(() => {});

  } catch (error) {
      console.error('خەلەتی د فڕێکرنا پەنەلێ دەنگ:', error);
      await message.reply('**خەلەتیەک چێبوو دەمێ دروستکرنا پەنەلێ دەنگ.**');
  }
});

// 38. Event: ClientReady (Logs System - Requires external file)
client.on(Events.ClientReady, () => {
    // ئەڤە داخوازا فایلەکێ دەرەکی (external file) دکەت کو پێتڤیە ل جهێ خۆ هەبیت.
    // require('./Events/Channel/channelLogs.js').execute(client);
    console.log('💡 Channel Logs: پێدڤیە Channel Logs Events ل جهێ خۆ هەبن.');
});


// 39. Prefix Command: drop (Giveaway)
client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'drop') {
        const prize = args.join(' ');
        if (!prize) return message.reply('**تکایە خەلاتێ دیاری بکە!**');

        const button = new ButtonBuilder()
            .setCustomId('claim_gift')
            .setLabel('🎁 وەرگرتنا خەلات')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        const embed = new EmbedBuilder()
            .setTitle('🎉 خەلات! (Gift Drop)')
            .setDescription(`**خەلات (Prize)**: ${prize}\n\n **پێشکێشکرن ژلایێ: ${message.author}**`)
            .setColor('#FF1493')
            .setTimestamp()
            .setFooter({ text: `پێشکێشکرن ژلایێ: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        const giftMessage = await message.channel.send({
            embeds: [embed],
            components: [row]
        });

        const filter = i => i.customId === 'claim_gift';
        const collector = giftMessage.createMessageComponentCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async i => {
            const winEmbed = new EmbedBuilder()
                .setTitle('🎉 خەلات هاتە وەرگرتن!')
                .setDescription(`${i.user} ئێکەم کەس بوو خەلات وەرگرت:\n\n**خەلات: ${prize}**`)
                .setColor('#00FF00')
                .setTimestamp();

            const disabledButton = new ButtonBuilder()
                .setCustomId('claimed_gift')
                .setLabel(`${message.guild.name}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

            await message.channel.send({
                content: `🎊 پیرۆزە ${i.user}! ، توو خەلاتێ **${prize}** وەرگرت`
            });

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎉 تۆ خەلات وەرگرت!')
                    .setDescription(`پیرۆزە! تۆ ئێکەم کەس بووی خەلات وەرگرت!\n\n**خەلات**: ${prize}`)
                    .setColor('#00FF00')
                    .setTimestamp();
                
                await i.user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.error('نەشیام پەیام بوو سەرکەفتی فڕێ بکەم:', error);
            }

            await i.update({
                embeds: [winEmbed],
                components: [disabledRow]
            });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const expiredEmbed = new EmbedBuilder()
                    .setTitle('خەلات بدووماهی هات')
                    .setDescription('چ کەسان خەلات د دەمێ دیارکری دا وەرنەگرت!')
                    .setColor('#FF0000')
                    .setTimestamp();

                const expiredButton = new ButtonBuilder()
                    .setCustomId('expired_gift')
                    .setLabel(`${message.guild.name}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const expiredRow = new ActionRowBuilder().addComponents(expiredButton);

                giftMessage.edit({
                    embeds: [expiredEmbed],
                    components: [expiredRow]
                });
            }
        });
    }
});


// 40. Event: MessageCreate (Counting System)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const countData = await CountingSchema.findOne({ guildId: message.guild.id });
    if (!countData || message.channel.id !== countData.channelId) return;

    const number = parseInt(message.content);
    if (isNaN(number)) {
        await message.delete();
        return;
    }

    if (message.author.id === countData.lastUserId) {
        await message.delete();
        return message.channel.send(`${message.author}، **نەشێی دوو جاران ل پشتێك بهێژمێری!**`).then(msg => {
            setTimeout(() => msg.delete(), 5000);
        });
    }

    if (number !== countData.currentCount + 1) {
        await message.delete();
        return message.channel.send(`**ژمارە خەلەتە!** ژمارا داهاتی دڤێت ببت **${countData.currentCount + 1}**`).then(msg => {
            setTimeout(() => msg.delete(), 5000);
        });
    }

  
    const userIndex = countData.users.findIndex(user => user.userId === message.author.id);
    if (userIndex === -1) {
        countData.users.push({
            userId: message.author.id,
            count: 1,
            highestCount: number
        });
    } else {
        countData.users[userIndex].count++;
        if (number > countData.users[userIndex].highestCount) {
            countData.users[userIndex].highestCount = number;
        }
    }

    countData.currentCount = number;
    countData.lastUserId = message.author.id;
    await countData.save();

    
    const reactionEmoji = countData.emoji || '✅';
    await message.react(reactionEmoji);
});


// 41. Event: MessageCreate (Anti-Link Spam)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    
    const linkRegex = /(https?:\/\/|discord\.gg\/)[^\s]+/gi;
    const links = message.content.match(linkRegex);
    
    if (links) {
        
        if (!client.linkSpam) client.linkSpam = new Map();
        
        const userData = client.linkSpam.get(message.author.id) || {
            count: 0,
            timer: null
        };

        userData.count++;
        
  
        if (userData.timer) clearTimeout(userData.timer);
        userData.timer = setTimeout(() => {
            client.linkSpam.delete(message.author.id);
        }, 3600000); 

        client.linkSpam.set(message.author.id, userData);

        if (userData.count >= 3) {
            try {
                await message.member.timeout(24 * 60 * 60 * 1000, 'زێدە بکارئینانا لینکێن عەشواهی');
                client.linkSpam.delete(message.author.id); 

                const embed = new EmbedBuilder()
                    .setColor('Red')
                    .setDescription(`${message.author} **هاتە تایم-ئۆتکرن بوو 24 دەمژمێر ژبەر زێدە بکارئینانا لینکێن عەشواهی.**`)
                    .setTimestamp();

                await message.channel.send({ embeds: [embed] })
                    .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
            } catch (error) {
                console.error('خەلەتی د تایم-ئۆتکرنا لینکێن عەشواهی:', error);
            }
        }
    }
});


// 42. Event: Ready, InviteCreate, guildMemberAdd/Remove (Invite Tracking)
// دێ پارچێن Invites نویکەم دا دگەل MongoDB کاربکەن ب شێوەیەکێ باشتر، ب گۆهارتنا ل ناڤ InvitesSchema دابوونێن نوو:

client.on('ready', async () => {
    
    for (const guild of client.guilds.cache.values()) {
        try {
            const guildInvites = await guild.invites.fetch();
            invitesCache.set(guild.id, new Collection(guildInvites.map(invite => [invite.code, invite.uses])));
        } catch (error) {
            console.error(`خەلەتی د هینانا دوعەتێن سێرڤەری ${guild.id}:`, error);
        }
    }
    console.log(`🔗 ${invitesCache.size} سێرڤەر هاتنە ڤەگۆهاستن بوو Invites Cache.`);
});


client.on('inviteCreate', async invite => {
    const guildInvites = invitesCache.get(invite.guild.id) || new Collection();
    guildInvites.set(invite.code, invite.uses);
    invitesCache.set(invite.guild.id, guildInvites);
});


client.on('guildMemberAdd', async member => {
    try {
        const oldInvites = invitesCache.get(member.guild.id) || new Collection();
        const newInvites = await member.guild.invites.fetch();
        invitesCache.set(member.guild.id, new Collection(newInvites.map(invite => [invite.code, invite.uses])));

       
        const usedInvite = newInvites.find(invite => (oldInvites.get(invite.code) || 0) < invite.uses);
        if (!usedInvite) return;

        
        await InvitesSchema.findOneAndUpdate(
            { 
                guildId: member.guild.id, 
                userId: usedInvite.inviter.id 
            },
            { 
                $inc: {
                    'invites.total': 1,
                    'invites.joins': 1
                }
            },
            { upsert: true }
        );

       
        const inviteData = await InvitesSchema.findOne({ guildId: member.guild.id });
        if (inviteData?.inviteChannel) {
            const channel = await member.guild.channels.fetch(inviteData.inviteChannel);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                    .setDescription(`**ب خێر هاتی ${member}!**\nهاتیە دوعەتکرن ژلایێ: ${usedInvite.inviter}\nکۆدێ دوعەتکرنێ: ${usedInvite.code}\nهەژمارا ئەندامان: ${member.guild.memberCount}`)
                    .setTimestamp();

                channel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('خەلەتی د گەهشتنا ئەندامی:', error);
    }
});


client.on('guildMemberRemove', async member => {
    try {
        // نڤیسین نویکرن بوو دیتنا هەمی داتایێن Inviter
        const allInviteData = await InvitesSchema.find({ guildId: member.guild.id });
        
        let inviterId = null;
        for(const data of allInviteData) {
             // بژاردە: دێ گەڕێم بوو Inviter-ی کو ژمارا هاتن (joins) زێدەتری چوونا دەرێ (left) بیت.
             if (data.invites.joins > data.invites.left) {
                 inviterId = data.userId;
                 break;
             }
        }

        if (inviterId) {
            await InvitesSchema.updateOne(
                { guildId: member.guild.id, userId: inviterId },
                { $inc: { 'invites.left': 1 } }
            );

            const config = await InvitesSchema.findOne({ guildId: member.guild.id });
            if (config?.inviteChannel) {
                const channel = await member.guild.channels.fetch(config.inviteChannel);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor('Red')
                        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                        .setDescription(`**${member.user.tag} سێرڤەر هێلا.**\nهاتیە دوعەتکرن ژلایێ: <@${inviterId}>\nهەژمارا ئەندامێن ماین: ${member.guild.memberCount}`)
                        .setTimestamp();

                    channel.send({ embeds: [embed] });
                }
            }
        }
    } catch (error) {
        console.error('خەلەتی د چوونەدەرێ ئەندامی:', error);
    }
});


// 43. Event: MessageCreate (Feedback System)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  
  const line = feedbackDB.get(`line_${message.guild.id}`);
  const chan = feedbackDB.get(`feedback_room_${message.guild.id}`);
  const feedbackMode = feedbackDB.get(`feedback_mode_${message.guild.id}`) || 'embed'; 
  const feedbackEmoji = feedbackDB.get(`feedback_emoji_${message.guild.id}`) || "❤️"; // گۆهارتن بوو ❤️

  if (chan) {
    if (message.channel.id !== chan) return;

    const embed = new EmbedBuilder()
      .setColor('Random')
      .setTimestamp()
      .setTitle(`** > ${message.content} **`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) });

    if (feedbackMode === 'embed') {
      await message.delete();
      const themsg = await message.channel.send({ content: `**<@${message.author.id}> سوپاس بوو پێشکێشکرنا بیروباوەرێن تە! :tulip:**`, embeds: [embed] });
      await themsg.react("❤️");
      await themsg.react("❤️‍🔥");
      if (line) {
        await message.channel.send({ files: [line] });
      }
    } else if (feedbackMode === 'reactions') {
      await message.delete(); // دژێبرم دا تەنها ریاکشن بمینیت
      await message.react(feedbackEmoji);
      if (line) {
        await message.channel.send({ files: [line] });
      }
    }
  }
});


// 44. Event: MessageCreate (Text Leveling System)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    try {
        let userData = await Level.findOne({ 
            guildId: message.guild.id, 
            userId: message.author.id 
        });

        if (!userData) {
            userData = new Level({
                guildId: message.guild.id,
                userId: message.author.id,
                textLevel: 1,
                textXP: 0,
                messagesCount: 0,
                voiceLevel: 1, // زێدەکرن بوو دەنگ
                voiceXP: 0
            });
        }

     
        userData.messagesCount += 1;

    
        const earnedXP = Math.floor(Math.random() * 30) + 1;
        userData.textXP += earnedXP;


        const requiredXP = userData.textLevel * 100;

        if (userData.textXP >= requiredXP) {
            userData.textLevel += 1;
            userData.textXP = 0;

  
            const channel = message.guild.channels.cache.get(levelDB.get(`levelchannel_${message.guild.id}`));
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor('Gold')
                    .setTitle('ئاست نوو! 🎉 (Level Up)')
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .setDescription(`**پیرۆزە ${message.author}!**`)
                    .addFields(
                        { name: 'ئاستێ نوو (New Level)', value: `${userData.textLevel}`, inline: true },
                        { name: 'هەژمارا پەیامان (Total Messages)', value: `${userData.messagesCount}`, inline: true }
                    )
                    .setTimestamp();

                channel.send({ embeds: [embed] });
            }
        }

        await userData.save();
    } catch (error) {
        console.error('خەلەتی د سیستەمێ ئاستێ نڤیسینێ:', error);
    }
});


// 45. Event: voiceStateUpdate (Voice Leveling System)
const voiceStates = new Map();
const VOICE_LEVEL_REQUIREMENTS = {
    1: 30,     // Level 1: 30 خولەک
    2: 60,     
    3: 120,    
    4: 180,    
    5: 240,    
    6: 300,    
    7: 360,    
    8: 420,    
    9: 480,    
    10: 540,   
    11: 600,   
    12: 720,   
    13: 840,   
    14: 960,   
    15: 1080,  
    16: 1200,  
    17: 1320,  
    18: 1440,  
    19: 1680,  
    20: 1920,  
    21: 2160,  
    22: 2400,  
    23: 2640,  
    24: 2880,  
    25: 3120,  
    26: 3360,  
    27: 3600,  
    28: 3840,  
    29: 4080,  
    30: 4320   
};


client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.member.user.bot) return;

    try {
        if (!oldState.channelId && newState.channelId) {
            // ئەندام هاتە د چانێلێ دا
            voiceStates.set(newState.id, Date.now());
        } else if (oldState.channelId && !newState.channelId) {
            // ئەندام ژ چانێلێ چوو دەرێ
            const joinTime = voiceStates.get(oldState.id);
            if (!joinTime) return;

            const timeSpent = Math.floor((Date.now() - joinTime) / 60000); // ب خولەک (Minutes)
            voiceStates.delete(oldState.id);

            if (timeSpent < 1) return; // تەنها ئەگەر زێدەتری خولەکەکێ مای

            let userData = await Level.findOne({ 
                guildId: oldState.guild.id, 
                userId: oldState.member.id 
            }) || new Level({ 
                guildId: oldState.guild.id, 
                userId: oldState.member.id 
            });

            // بژاردە: ئەگەر هێژایێن voiceLevel و voiceXP نەبوون
            if (typeof userData.voiceLevel === 'undefined') userData.voiceLevel = 1;
            if (typeof userData.voiceXP === 'undefined') userData.voiceXP = 0;


            userData.voiceXP += timeSpent; 

           
            const nextLevel = userData.voiceLevel + 1;
            const requiredMinutes = VOICE_LEVEL_REQUIREMENTS[nextLevel];

            if (requiredMinutes && userData.voiceXP >= requiredMinutes) {
                userData.voiceLevel = nextLevel;
                userData.voiceXP = 0; 

                const channel = await oldState.guild.channels.fetch(levelDB.get(`levelchannel_${oldState.guild.id}`)).catch(() => null);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor('Purple')
                        .setTitle('ئاستێ دەنگی نوو! 🎙️ (Voice Level Up)')
                        .setThumbnail(oldState.member.user.displayAvatarURL({ dynamic: true }))
                        .setDescription(`**پیرۆزە ${oldState.member}!**`)
                        .addFields(
                            { name: 'ئاستێ دەنگی نوو', value: `${nextLevel}`, inline: true },
                            { name: 'دەمی پێدڤی', value: `${requiredMinutes} خولەک`, inline: true },
                            { name: 'ئاستێ داهاتی دڤێت', value: `${VOICE_LEVEL_REQUIREMENTS[nextLevel + 1] || 'بلندترین ئاست'} خولەک`, inline: true }
                        )
                        .setTimestamp();

                    channel.send({ embeds: [embed] });
                }
            }

            await userData.save();
        }
    } catch (error) {
        console.error('خەلەتی د سیستەمێ ئاستێ دەنگی:', error);
    }
});


// 46. Prefix Command: profile (Level Profile)
client.on('messageCreate', async message => {
    if (message.content.toLowerCase().startsWith(prefix + 'profile')) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        // ئەڤە داخوازا ڤێ فەرمانێ دکەت کو پێتڤیە ل SlashCommands/Levels/profile.js هەبیت
        // بژاردە: ئەگەر تۆ ڤێ فەرمانێ وەک فەرمانەکا Prefix دروست بکەی، پێتڤیە کۆدێ وێ ل ڤێرێ بنڤیسیت.
        try {
           const { handleProfileCommand } = require('./SlashCommands/Levels/profile.js');
           await handleProfileCommand(message, args);
        } catch (e) {
            console.error('نەشیام فەرمانا profile بار بکەم.', e);
            message.reply('**فەرمانا profile کار ناکەت یان فایلێ وێ نینە.**');
        }
    }
});


// 47. Interaction: Command (Final Slash Command Handler)
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.slashcommands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: '**خەلەتیەک چێبوو دەمێ جێبەجێکرنا ڤێ فەرمانێ!**', 
            ephemeral: true 
        });
    }
});


// 48. Handle Global Errors
process.on("unhandledRejection", (reason, promise) => console.error("❌ Unhandled Rejection:", reason));
process.on("uncaughtException", (err, origin) => console.error("❌ Uncaught Exception:", err, origin));
process.on("uncaughtExceptionMonitor", (err, origin) => console.error("❌ Uncaught Exception Monitor:", err, origin));

module.exports = client;
