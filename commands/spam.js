const { CommandBuilder } = require("../Commands.js");

module.exports = {
  command: new CommandBuilder()
    .setName("spam")
    .setDescription("Add spam data to the dataset")
    .addTextOption(o =>
      o.setName("message")
        .setDescription("The spam message.")
        .setRequired(true)),
  run: function(msg, data) {
    let content = data.get("message").value;
    this.classifier.addDocument(content, "spam");
    msg.reply(this.em("Added to future training."));
  }
}
