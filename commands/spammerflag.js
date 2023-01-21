const { MessageFlagBuilder } = require("../Commands.js");
const words = require("../storage/suspicious-words.json");
const spamcheck = require('spam-detection');

function check(msg) {
  const filter = [
    !(msg.author.avatar), // has no pfp
    (msg.author.createdAt + (1000 * 60 * 60 * 2) > Date.now()), // account newer than 2 hours
    words.filter(w => msg.content.toLowerCase().includes(w)).length >= 1, // uses flagged words
    words.filter(w => msg.content.toLowerCase().includes(w)).length >= 3,
    words.filter(w => msg.content.toLowerCase().includes(w)).length >= 4,
    (msg.mention_ids || []).length >= 2
  ];
  const ol = filter.length;

  let mentions = [];
  if (this.mentions.has(msg.author_id)) {
    let ms = this.mentions.get(msg.author_id);
    ms = ms.filter(m => {
      return m.time + (1000 * 60 * 2) > Date.now() // remove old ones
    });
    mentions.push(...ms);
  }
  if (msg.mention_ids) {
    msg.mention_ids.forEach(id => {
      mentions.push({
        time: Date.now(),
        data: id
      });
    });
  }
  if (mentions.length > 3) {
    filter.push(...Array.apply(null, {length: mentions.length - 3}).map(Function.call, () => true));
  }
  if (mentions.length > 0) {
    this.mentions.set(msg.author_id, mentions);
  }
  if (spamcheck.detect(msg.content) == "spam") filter.push(true, true);

  const score = filter.filter(e => e).length / ol;
  return !(score >= 0.75);
}

module.exports = {
  command: new MessageFlagBuilder()
    .addCheck(check),
  run: function(msg) {
    let id = this.settingsMgr.getServer(msg.channel.server_id).get("warningChannel");
    let channel = msg.channel.server.channels.find(c => c._id == id);
    channel.sendMessage("`" + msg.author.username + "` might be a spammer! " + msg.url);
  }
}
