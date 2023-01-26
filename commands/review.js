const { CommandBuilder } = require("../Commands.js");

module.exports = {
  command: new CommandBuilder()
    .setName("reviewqueue")
    .addAliases("rq")
    .addRequirement(e => e.addPermission("ManageServer"))
    .setDescription("Display the messages that are in queue to be reviewed."),
  run: function(msg) {
    let list = "";
    this.checkQueue.forEach((item, i) => {
      list += (i + 1) + ". [MessageValidation](" + item.msg + ")\n";
    });
    list = list.slice(0, 1900);
    let m = ("Most of the current queue: \n\n" + list).trim();
    msg.reply(this.em(m));
  }
}
