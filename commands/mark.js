const { CommandBuilder } = require("../Commands.js");

module.exports = {
  command: new CommandBuilder()
    .setName("mark")
    .addAliases("m")
    .setDescription("Mark the first item in the queue as spam or ham.")
    .addRequirement(e => e.addPermission("ManageServer"))
    .addChoiceOption((o) =>
      o.setName("type")
        .setDescription("Wether the message is spam or ham. Use 'x' to dismiss a message.")
        .addChoices("s", "h", "x")
        .setRequired(true)),
  run: function(msg, data) {
    if (data.get("type").value == "x") {
      this.checkQueue.shift();
      return msg.reply(this.em("Message dismissed!"));
    }
    let type = (data.get("type").value == "s") ? "spam" : "ham";
    let item = this.checkQueue.shift();
    this.classifier.addDocument(item.content, type);
    msg.reply(this.em("Marked as " + type));
  }
}
