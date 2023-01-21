const { CommandBuilder } = require("../Commands.js");
const runnables = require("../settings/runnables");

module.exports = {
  command: function() {
    return new CommandBuilder()
      .setName("settings")
      .setDescription("Change/Get settings in the current server.")
      .addAliases("s")
      .addRequirement(e => e.addPermission("ManageServer"))
      .addSubcommand(cmd =>
        cmd.setName("set")
          .setId("setSettings")
          .setDescription("Set the value of a specific setting.")
          .addChoiceOption(c =>
            c.addChoices(...Object.keys(this.settingsMgr.defaults))
              .setName("setting")
              .setDescription("The name of the setting you want to set.")
              .setRequired(true)
          ).addTextOption(c =>
            c.setName("value")
              .setDescription("The new value.")
              .setRequired(true))
      ).addSubcommand(cmd =>
        cmd.setName("get")
          .setDescription("Get the value of a specific setting or the settings of the server.")
          .setId("getSettings")
          .addChoiceOption(c =>
            c.addChoices(...Object.keys(this.settingsMgr.defaults))
              .setName("setting")
              .setDescription("Get the current value of a setting.")
              .setRequired(false)
            )
      )
  },
  run: function(message, data) {
    const set = this.getSettings(message);
    const cmd = data.commandId;
    switch(cmd) {
      case "setSettings":
        set.set(data.get("setting").value, data.get("value").value);
        if (runnables[data.get("setting").value]) runnables[data.get("setting").value].call(this, data.get("value").value, { msg: message, d: data })
        message.reply(this.em("Settings changed!"));
        this.settingsMgr.saveAsync();
      break;
      case "getSettings":
        const setting = data.get("setting").value;
        if (setting) return message.reply(this.em(`\`${setting}\` is set to \`${set.get(setting)}\``));
        const d = set.getAll();
        let msg = "The current config is set to: \n\n";
        for (key in d) {
          msg += "- " + key + ": `" + d[key] + "`\n";
        }
        message.reply(this.iconem("Settings", msg.trim(), (message.channel.server.icon) ? "https://autumn.revolt.chat/icons/" + message.channel.server.icon._id : null));
      break;
    }
  }
}
