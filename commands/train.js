const { CommandBuilder } = require("../Commands.js");

module.exports = {
  command: new CommandBuilder()
    .setName("train")
    .addAlias("t")
    .setDescription("Save the new classifications and train the model."),
  run: function(msg) {
    this.classifier.train();
    msg.reply(this.em("Trained!"));
  }
}
