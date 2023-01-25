const { CommandBuilder } = require("../Commands.js");

module.exports = {
  command: new CommandBuilder()
    .setName("mark")
    .addAliases("m")
    .setDescription("Mark the first item in the queue as spam or ham.")
    .addChoiceOption((o) =>
      o.setName("type")
        .setDescription("Wether the message is spam or ham.")
        .addChoices("s", "h")
        .setRequired(true)),
  run: function(msg, data) {
    let type = (data.get("type").value == "s") ? "spam" : "ham";
    let item = this.checkQueue.shift();
    this.classifier.addDocument(item.content, type);
    msg.reply(this.em("Marked as " + type));
  }
}
