const { MessageFlagBuilder } = require("../Commands.js");
const words = require("../storage/suspicious-words.json");
const spamcheck = require('spam-detection');
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();

/*
var natural = require("natural");
console.log(natural.PorterStemmer.stem("I do coding! <@sdawdafawf>"))

const tokenize = (string) => {
    return natural.PorterStemmer.stem(string).split(" ").map(e => {
        if (e.startsWith("<@") && e.charAt(e.length - 1) == ">") return "mentionedmention";
        return e;
    });
}

console.log(tokenize("<@tets>"), tokenize("hello how are you <@wjnoafoaf>"))

const classifier = new natural.BayesClassifier();
classifier.addDocument(tokenize("I want to make my iPhone 14 pro anonymous and a safe phone and protected from threat like police and gov and I want to make this anonymous and me and ur friend in ur server were speaking last night"), "spam");
classifier.addDocument(tokenize("Hello guys, can someone please help me?"), "ham");
classifier.addDocument(tokenize("Hi, how are you?"), "ham");
classifier.addDocument(tokenize("I need help <@efsefsef>"), "spam");
classifier.addDocument(tokenize("Lmao fucking Iphone 14 pro"), "ham");
classifier.addDocument(tokenize("I have an iPhone 14 pro I want to make this a safe phone. I want to make this an Anonymous phone. I want to make this a locked down phone. What do I do?"), "spam");

classifier.train();

let string = "Hi guys :D <@dadqwfw>";
string = "Hello <@test> can you help me?";
let classifications = classifier.getClassifications(string);
let c = (classifications[0].value == classifications[1].value) ? "ham" : classifier.classify(string);
console.log(classifier.getClassifications(string), c);
*/  // messing around

const reactionMap = {
  "01GR218MFEJ77A3CQ1YKCM8BHX": "ham",
  "01GR2196W026BEFPA4D62GX3Z3": "spam",
  "01GR219PDEY3KSKPVQMKQV7RX4": "dismissed"
}

function check(msg) { // TODO: include if user is a potential spammer
  if (msg.bot) return true;
  const filter = [
    !(msg.author.avatar), // has no pfp
    (msg.author.createdAt + (1000 * 60 * 60 * 2) > Date.now()), // account newer than 2 hours
    words.filter(w => msg.content.toLowerCase().includes(w)).length >= 1, // uses flagged words
    words.filter(w => msg.content.toLowerCase().includes(w)).length >= 3,
    words.filter(w => msg.content.toLowerCase().includes(w)).length >= 4,
    (msg.mention_ids || []).length >= 2,
    lngDetector.detect(msg.content, 1)[0] != "english"
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
  //if (spamcheck.detect(msg.content) == "spam") filter.push(true, true);
  let isSpam = this.classifier.getClassifications(this.classifier.tokenize(msg.content));
  let diff = Math.abs(isSpam[0].value - isSpam[1].value);
  console.log(isSpam, diff);
  console.log(this.classifier.tokenize(msg.content), this.config.assistanceTreshold > diff);
  if (diff < this.config.assistanceTreshold) {
    // seek assistance;
    let logChannel = msg.channel.server.channels.find(c => c._id == this.settingsMgr.getServer(msg.channel.server_id).get("warningChannel"));
    let m = (msg.content.slice(0, 1920) + "\n[...]").split("\n").map(e => "> " + e).join("\n");
    let embed = this.em("Is this message spam? \n" + m);
    embed.interactions = {
      restrict_reactions: true,
      reactions: [ "01GR218MFEJ77A3CQ1YKCM8BHX", "01GR2196W026BEFPA4D62GX3Z3", "01GR219PDEY3KSKPVQMKQV7RX4" ]
    }
    var done = false;
    logChannel.sendMessage(embed).then(ms => {
      ms.reactions.observe_(async (change) => {
        if (done) return;
        if (change.type != "add") return;
        const reaction = change.name;
        let type = reactionMap[reaction];
        if (!type) return; // not a valid reaction anyway;

        const userId = change.newValue.values().next().value;
        // check permissions:
        const server = this.client.servers.get(ms.channel.server_id);
        const member = await server.fetchMember(userId);
        if (!member.hasPermission(server, "ManageServer")) return;

        done = true;
        ms.edit({ content: "Marked as " + type + "!" });

        if (type == "dismissed") return;

        console.log("change");

        this.classifier.addDocument(msg.content, type);
      });
    });
    this.checkQueue.unshift({
      msg: msg.url,
      content: msg.content
    });
  } else {
    if (isSpam[0].label == "spam") {
      filter.push(true, true);
    }
  }

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
