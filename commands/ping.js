const { CommandBuilder } = require("../Commands");

module.exports = {
  command: new CommandBuilder()
    .setName("ping")
    .setDescription("Ping. :01G81ME4AKAPCJV79V7QFBK62T:"),
    run: function(msg) {
      this.reply("Pong. :01G81KSS4CMV69XJQ65C1AKX61:", msg);
    }
}
