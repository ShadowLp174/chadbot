const { CommandBuilder } = require("../Commands.js");

module.exports = {
  command: new CommandBuilder()
    .setName("ham")
    .setDescription("Add ham data to the dataset")
    .addRequirement(e => e.addPermission("ManageServer"))
    .addTextOption(o =>
      o.setName("message")
        .setDescription("The ham message.")
        .setRequired(true)),
  run: function(msg, data) {
    let content = data.get("message").value;
    this.classifier.addDocument(content, "ham");
    msg.reply(this.em("Added to future training."));
  }
}
