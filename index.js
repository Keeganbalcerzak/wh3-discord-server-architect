require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  Events,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Test if the bot is working"),

  new SlashCommandBuilder()
    .setName("plan-server")
    .setDescription("Generate a Total War: Warhammer III server layout")
    .addStringOption(option =>
      option
        .setName("prompt")
        .setDescription("Describe the server you want")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("build-wh3-server")
    .setDescription("Actually create the WH3 H2H server layout")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addBooleanOption(option =>
      option
        .setName("confirm")
        .setDescription("Type true to confirm you want the bot to create channels/roles")
        .setRequired(true)
    )
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Guild slash commands registered.");
  } catch (error) {
    console.error("Failed to register slash commands:");
    console.error(error);
  }
}

async function askAI(userPrompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost",
      "X-Title": "WH3 Discord Server Formatter"
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b:free",
      messages: [
        {
          role: "system",
          content: `
You are a Discord server architect for Total War: Warhammer III communities.

Create clean, practical, copy-pasteable Discord server layouts.

Theme:
- Total War: Warhammer III
- Immortal Empires
- casual multiplayer head-to-head campaigns
- community matchmaking
- faction discussion
- campaign rulesets
- battle clips
- friendly gaming community

Avoid fake mechanics, fake mods, random tournament jargon, or nonsense.
Do not mention unrelated bots like MEE6 unless the user asks.
Keep under 1800 characters.
          `.trim()
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter error:", data);
    throw new Error("OpenRouter request failed.");
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error("Unexpected OpenRouter response:", data);
    throw new Error("Unexpected OpenRouter response.");
  }

  return data.choices[0].message.content;
}

async function getOrCreateRole(guild, name, options = {}) {
  const existing = guild.roles.cache.find(role => role.name === name);
  if (existing) return existing;

  return guild.roles.create({
    name,
    ...options,
    reason: "WH3 server formatter setup"
  });
}

async function getOrCreateCategory(guild, name, permissionOverwrites = undefined) {
  const existing = guild.channels.cache.find(
    channel =>
      channel.name === name &&
      channel.type === ChannelType.GuildCategory
  );

  if (existing) return existing;

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
    reason: "WH3 server formatter setup"
  });
}

async function getOrCreateTextChannel(guild, category, name, topic = "") {
  const existing = guild.channels.cache.find(
    channel =>
      channel.name === name &&
      channel.type === ChannelType.GuildText &&
      channel.parentId === category.id
  );

  if (existing) return existing;

  return guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
    topic,
    reason: "WH3 server formatter setup"
  });
}

async function getOrCreateVoiceChannel(guild, category, name) {
  const existing = guild.channels.cache.find(
    channel =>
      channel.name === name &&
      channel.type === ChannelType.GuildVoice &&
      channel.parentId === category.id
  );

  if (existing) return existing;

  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: category.id,
    reason: "WH3 server formatter setup"
  });
}

async function sendStarterMessage(channel, message) {
  const recentMessages = await channel.messages.fetch({ limit: 10 }).catch(() => null);

  if (recentMessages) {
    const alreadySent = recentMessages.some(msg =>
      msg.author.id === client.user.id &&
      msg.content.includes(message.slice(0, 40))
    );

    if (alreadySent) return;
  }

  const sent = await channel.send(message);
  await sent.pin().catch(() => null);
}

async function buildWH3Server(interaction) {
  const guild = interaction.guild;

  const modRole = await getOrCreateRole(guild, "🛡️ Moderator", {
    permissions: [
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages
    ]
  });

  await getOrCreateRole(guild, "👑 Campaign Host");
  await getOrCreateRole(guild, "🧭 New Player");
  await getOrCreateRole(guild, "⚔️ Experienced");
  await getOrCreateRole(guild, "🏆 Veteran");
  await getOrCreateRole(guild, "🌎 NA Timezone");
  await getOrCreateRole(guild, "🌍 EU Timezone");
  await getOrCreateRole(guild, "🌏 Other Timezone");
  await getOrCreateRole(guild, "🐀 Skaven Enjoyer");
  await getOrCreateRole(guild, "🧛 Vampire Counts Enjoyer");
  await getOrCreateRole(guild, "🦎 Lizardmen Enjoyer");
  await getOrCreateRole(guild, "🧙 Chaos Enjoyer");
  await getOrCreateRole(guild, "🛡️ Order Enjoyer");

  const info = await getOrCreateCategory(guild, "📌 START HERE");
  const community = await getOrCreateCategory(guild, "💬 COMMUNITY");
  const matchmaking = await getOrCreateCategory(guild, "⚔️ H2H MATCHMAKING");
  const campaigns = await getOrCreateCategory(guild, "🗺️ CAMPAIGNS");
  const strategy = await getOrCreateCategory(guild, "📚 STRATEGY");
  const media = await getOrCreateCategory(guild, "🎬 MEDIA");
  const voice = await getOrCreateCategory(guild, "🔊 VOICE");

  const staff = await getOrCreateCategory(guild, "🛡️ STAFF", [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: modRole.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    }
  ]);

  const startHere = await getOrCreateTextChannel(
    guild,
    info,
    "start-here",
    "New member guide for the WH3 H2H community."
  );

  const rules = await getOrCreateTextChannel(
    guild,
    info,
    "rules",
    "Server rules and H2H campaign expectations."
  );

  await getOrCreateTextChannel(guild, info, "roles", "Pick timezone, skill, and faction roles.");
  await getOrCreateTextChannel(guild, info, "announcements", "Server updates and community events.");

  await getOrCreateTextChannel(guild, community, "general", "General chat.");
  await getOrCreateTextChannel(guild, community, "introductions", "New player introductions.");
  await getOrCreateTextChannel(guild, community, "memes", "Warhammer memes and casual posts.");

  const opponentFinder = await getOrCreateTextChannel(
    guild,
    matchmaking,
    "opponent-finder",
    "Find casual Immortal Empires H2H campaign opponents."
  );

  await getOrCreateTextChannel(guild, matchmaking, "looking-for-sub", "Find subs or replacements for campaigns.");
  await getOrCreateTextChannel(guild, matchmaking, "availability", "Post timezone and session availability.");

  const activeCampaigns = await getOrCreateTextChannel(
    guild,
    campaigns,
    "active-campaigns",
    "Track ongoing H2H campaigns."
  );

  const campaignRulesets = await getOrCreateTextChannel(
    guild,
    campaigns,
    "campaign-rulesets",
    "Post and discuss campaign rulesets."
  );

  const campaignTemplates = await getOrCreateTextChannel(
    guild,
    campaigns,
    "campaign-templates",
    "Copy-paste setup templates."
  );

  await getOrCreateTextChannel(guild, strategy, "faction-discussion", "Faction picks, matchups, and lord talk.");
  await getOrCreateTextChannel(guild, strategy, "army-comps", "Battle army comps and tactical advice.");
  await getOrCreateTextChannel(guild, strategy, "campaign-advice", "Strategic map advice and campaign planning.");

  await getOrCreateTextChannel(guild, media, "battle-clips", "Post battle clips and replays.");
  await getOrCreateTextChannel(guild, media, "screenshots", "Campaign screenshots and funny moments.");
  await getOrCreateTextChannel(guild, media, "campaign-stories", "Narrative recaps and grudges.");

  await getOrCreateTextChannel(guild, staff, "staff-chat", "Private staff discussion.");
  await getOrCreateTextChannel(guild, staff, "mod-log", "Manual moderation log.");
  await getOrCreateTextChannel(guild, staff, "reports", "Private report handling.");

  await getOrCreateVoiceChannel(guild, voice, "General VC");
  await getOrCreateVoiceChannel(guild, voice, "H2H Campaign 1");
  await getOrCreateVoiceChannel(guild, voice, "H2H Campaign 2");
  await getOrCreateVoiceChannel(guild, voice, "Battle Lobby");
  await getOrCreateVoiceChannel(guild, voice, "Study / Chill VC");
  await getOrCreateVoiceChannel(guild, voice, "Staff VC");

  await sendStarterMessage(
    startHere,
    `Welcome to the Total War: Warhammer III H2H community.

Start here:
1. Read #rules.
2. Pick roles in #roles.
3. Post in #opponent-finder if you want a campaign.
4. Use #campaign-rulesets before starting.
5. Track ongoing games in #active-campaigns.

Vibe: casual, strategic, community-first, and not sweaty.`
  );

  await sendStarterMessage(
    rules,
    `Server rules:
1. Don't be toxic.
2. Respect campaign rules before the campaign starts.
3. No harassment, slurs, or personal attacks.
4. Keep disputes in good faith.
5. Don't ragequit campaigns without communicating.
6. Use spoiler tags for campaign-sensitive screenshots.
7. Keep faction debate fun, not personal.
8. Staff can mediate unclear campaign rule issues.`
  );

  await sendStarterMessage(
    opponentFinder,
    `Opponent finder template:

Steam/Discord:
Timezone:
Experience: New / Experienced / Veteran
Preferred campaign length:
Preferred factions/lords:
Banned factions/lords:
Ruleset:
Availability:
Notes:`
  );

  await sendStarterMessage(
    campaignRulesets,
    `Campaign ruleset template:

Campaign name:
Players:
Factions/lords:
Victory condition:
Battle difficulty:
Campaign difficulty:
Aut0-resolve rules:
Concession rules:
Substitution rules:
Mods/DLC rules:
Banned exploits:
Dispute process:`
  );

  await sendStarterMessage(
    campaignTemplates,
    `Campaign setup template:

Campaign Name:
Player 1:
Player 2:
Start Date:
Session Schedule:
Faction Picks:
Ruleset Link:
Current Turn:
Status: Recruiting / Active / Paused / Finished`
  );

  await sendStarterMessage(
    activeCampaigns,
    `Active campaign tracker:

Campaign:
Players:
Factions:
Current turn:
Last session:
Next session:
Status:
Notes:`
  );
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Bot is working.");
    return;
  }

  if (interaction.commandName === "plan-server") {
    await interaction.deferReply();

    const prompt = interaction.options.getString("prompt");

    try {
      const result = await askAI(prompt);
      await interaction.editReply(result.slice(0, 1900));
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "AI request failed. Check your OpenRouter key, .env file, or free-model rate limits."
      );
    }

    return;
  }

  if (interaction.commandName === "build-wh3-server") {
    const confirmed = interaction.options.getBoolean("confirm");

    if (!confirmed) {
      await interaction.reply({
        content: "Cancelled. Run `/build-wh3-server confirm:true` when ready.",
        ephemeral: true
      });
      return;
    }

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
      await interaction.reply({
        content: "You need Manage Server permission to use this.",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await buildWH3Server(interaction);
      await interaction.editReply("WH3 server layout created. Existing matching channels/roles were reused, not duplicated.");
    } catch (error) {
      console.error(error);
      await interaction.editReply("Build failed. Check PowerShell for the error.");
    }
  }
});

registerCommands();
client.login(process.env.DISCORD_TOKEN);