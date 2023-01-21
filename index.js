// TODO: rename to index.js
const { CommandHandler, MessageFlagBuilder } = require("./Commands.js");
const { Client } = require("revolt.js");
const path = require("path");
const fs = require("fs");
const { SettingsManager } = require("./settings/Settings.js");
require('console-stamp')(console, '[HH:MM:ss.l]');

let config;
if (fs.existsSync("./config.json")) {
  config = require("./config.json");
} else {
  config = {
    token: process.env.TOKEN
  };
}

class Chad {
  constructor() {
    this.client = new Client();
    this.client.config = config;
    this.config = config;
    this.presenceInterval = config.presenceInterval || 7000;

    this.mentions = new Map();

    this.settingsMgr = new SettingsManager();
    this.settingsMgr.loadDefaultsSync("./storage/defaults.json");

    this.client.on("ready", () => {
      console.log("Logged in as " + this.client.user.username);
    });
    this.client.once("ready", () => {
      let state = 0;
      let texts = config.presenceContents || ["By RedTech", "Ping for something"]
      setInterval(() => {
          this.client.users.edit({
          status: {
            text: texts[state].replace(/\$serverCount/g, this.client.servers.size),
            presence: "Online"
          },
        });
        if (state == texts.length - 1) {state = 0} else {state++}
      }, this.presenceInterval);
    });

    this.handler = new CommandHandler(this.client, config.prefix);
    this.handler.setReplyHandler((t, msg) => {
      msg.reply({ content: "", embeds: [{
          type: "Text",
          description: t,
          colour: "gold",
        }
      ]});
    });
    this.handler.setRequestCallback((...data) => this.request(...data));
    this.handler.setOnPing(msg => {
      let pref = this.handler.getPrefix(msg.channel.server_id);
      let m = this.iconem(msg.channel.server.name, "My prefix is: `" + pref + "`", (msg.channel.server.icon) ? "https://autumn.revolt.chat/icons/" + msg.channel.server.icon._id : null);
      msg.reply(m)
    });
    const dir = path.join(__dirname, "commands");
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));
    this.runnables = new Map();

    // load command files
    files.forEach(commandFile => {
      const file = path.join(dir, commandFile);
      const cData = require(file);
      const builder = (typeof cData.command == "function") ? cData.command.call(this) : cData.command;
      if (cData.command instanceof MessageFlagBuilder) {this.handler.addFlag(builder)} else {this.handler.addCommand(builder);}
      if (cData.run) {
        this.runnables.set(builder.uid, cData.run);
        if (!builder.subcommands) return;
        builder.subcommands.forEach(sub => {
          this.runnables.set(sub.uid, cData.run);
        });
      }
    });
    this.handler.on("run", (data) => {
      if (this.runnables.has(data.command.uid)) {
        this.runnables.get(data.command.uid).call(this, data.message, data);
      }
    });
    this.handler.on("flag", (data) => {
      if (this.runnables.has(data.flag.uid)) {
        this.runnables.get(data.flag.uid).call(this, data.message, data);
      }
    })

    if (process.argv[2] == "usage") {
      fs.writeFile("cmdUsage.md", this.handler.generateCommandOverviewMD(),()=>{});
    }

    this.client.loginBot(config.token);

    this.setupJoinFlagging();

    return this;
  }
  request(d) {
    switch(d.type) {
      case "prefix":
        return this.settingsMgr.getServer(d.data.channel.server_id).get("prefix");
      case "context":
        return this;
    }
  }
  getSettings(message) {
    const serverId = message.channel.server_id;
    return this.settingsMgr.getServer(serverId);
  }
  embedify(text = "", color = "gold") {
    return {
      type: "Text",
      description: "" + text, // convert bools and numbers to strings
      colour: color,
    }
  }
  em(text) { // embedMessage
    return {
      content: " ",
      embeds: [this.embedify(text)],
    }
  }
  reply(txt, msg) {
    msg.reply(this.em(txt));
  }
  iconem(title, text, img) {
    let e = this.embedify(text);
    e.icon_url = img;
    e.title = title;
    return {
      content: " ",
      embeds: [e]
    }
  }
  prettifyMS(milliseconds) {
    const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil;

  	const parsed = {
  		days: roundTowardsZero(milliseconds / 86400000),
  		hours: roundTowardsZero(milliseconds / 3600000) % 24,
  		minutes: roundTowardsZero(milliseconds / 60000) % 60,
  		seconds: roundTowardsZero(milliseconds / 1000) % 60,
  		milliseconds: roundTowardsZero(milliseconds) % 1000,
  		microseconds: roundTowardsZero(milliseconds * 1000) % 1000,
  		nanoseconds: roundTowardsZero(milliseconds * 1e6) % 1000
  	};

    /*var selectNonEmpty = (p) => { // (way too complex) one liner to remove empty properties from an object
      return { ...Object.keys(p).filter(k => p[k]).map((k, i) => {
          return (i == 0) ? {[k]: p[k]} : {[k]: p[k], k: k}
        }).reduce((p, c) => ({ ...p, [c.k]: c[c.k]}))}
    }*/

    const units = {
      days: "d",
      hours: "h",
      minutes: "m",
      seconds: "s"
    }

    var result = "";
    for (let k in parsed) {
      if (!parsed[k] || !units[k]) continue;
      result += " " + parsed[k] + units[k];
    }
    return result.trim();
  }

  setupJoinFlagging() {
    this.client.on("member/join", (m) => {
      // check if user has no pfp and if the account is newer than an hour
      if (!(!m.avatar && m.user.createdAt + (1000 * 60 * 60) > Date.now())) return;

      const channel = this.settingsMgr.getServer(m.server._id).get("warningChannel");
      if (!channel) return;

      m.server.channels.find(c => c._id == channel).sendMessage(this.iconem("Suspicious User", "<@" + m._id.user + "> Might be a spammer!", this.client.user.avatarURL));
    });
  }
}

const chad = new Chad();

// God, please forgive us, this is just to keep the bot online at all cost
process.on("unhandledRejection", (reason, p) => {
  console.log(" [Error_Handling] :: Unhandled Rejection/Catch");
  console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
  console.log(" [Error_Handling] :: Uncaught Exception/Catch");
  console.log(err, origin);
});
process.on("uncaughtExceptionMonitor", (err, origin) => {
  console.log(" [Error_Handling] :: Uncaught Exception/Catch (MONITOR)");
  console.log(err, origin);
});
process.on("multipleResolves", (type, promise, reason) => {
  console.log(" [Error_Handling] :: Multiple Resolves");
  console.log(type, promise, reason);
});
