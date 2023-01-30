const natural = require("natural");
const BayesClassifier = natural.BayesClassifier;
const PorterStemmer = natural.PorterStemmer;
const EventEmitter = require("stream");
const fs = require("fs");
const isSpam = require("spam-detector");

class SpamClassifier extends EventEmitter {
  classifier = new BayesClassifier();
  mentionRegex = /(?<mention>(<@[A-Z0-9]+>))/gi;
  mentionLength = 29;
  specialCharRegex = /(?<!\\)[^a-zA-Z\d\s:\/\\]/gi;
  emojiRegex = /(?<emoji>(:[A-Z0-9]+:))/gi;
  codeRegex = /```(.*)```/gis;
  urlRegex = /(https?:\/\/[^\s]+)/gi;

  store = null;
  scheduledSave = null;
  saveTimeout = 1000;

  constructor(savePath) {
    super();

    this.store = savePath;
  }

  restore(data) {
    this.classifier = BayesClassifier.restore(data);
    return this.classifier;
  }
  scheduleSave() {
    console.log("schedule");
    if (!this.store) return;
    if (this.scheduledSave) return;
    console.log("scheduling");

    this.scheduledSave = setTimeout(() => {
      this.scheduledSave = null;
      console.log("save");
      fs.writeFile(this.store, JSON.stringify(this.classifier), () => {});
    }, this.saveTimeout);
  }
  replaceAt(string, substr, index, length) {
    return string.slice(0, index) + substr + string.slice(index + length);
  }
  async tokenizePattern(string, pattern, tokenized, matchLimit=Number.POSITIVE_INFINITY) {
    let matches = string.matchAll(pattern);
    let result = matches.next();
    let indexOffset = 0;
    for (let i = 0; !result.done; i++) {
      if (matchLimit != Infinity && i >= matchLimit) break;

      if (typeof tokenized == "function") {
        tokenized = await tokenized(result.value[0]);
      }

      let lws = (result.value.input.charAt(result.value.index - 1) == " ") ? "" : " ";
      let rws = (result.value.input.charAt(result.value.index + result.value[0].length) == " ") ? "" : " ";
      let subs = lws + tokenized.replace(/\%value/g, result.value[0]) + rws;

      string = this.replaceAt(string, subs, result.value.index + indexOffset, result.value[0].length);
      indexOffset += subs.length - result.value[0].length;
      result = matches.next();
    }
    return string;
  }
  async tokenize(string, mentionLimit=Number.POSITIVE_INFINITY) { // TODO: add more context (through replies for example)
    string = string.trim();
    string = string.replace(this.codeRegex, "");
    string = string.replace(/\\/g, "");

    let stemmed = PorterStemmer.stem(string);

    stemmed = await this.tokenizePattern(stemmed, this.mentionRegex, "\\@mentionedmention\\@", mentionLimit);
    stemmed = await this.tokenizePattern(stemmed, this.emojiRegex, "\\@emoji\\@");
    /*stemmed = await this.tokenizePattern(stemmed, this.urlRegex, (match) => {
      return new Promise(res => {
        isSpam(match, (err, spam) => {
          console.log(err);
          if (err) return res("\\@errorurl\\@");
          if (spam) {
            return res("\\@goodurl\\@");
          }
          return res("\\@badurl\\@");
        })
      });
    });
    console.log(stemmed);*/
    stemmed = await this.tokenizePattern(stemmed, this.urlRegex, "\\@url\\@");
    stemmed = (await this.tokenizePattern(stemmed, this.specialCharRegex, "%value")).replace(/\\/g, "");

    return stemmed.trim().split(" ");
  }
  async addDocument(string, label, mentionCount) {
    return this.classifier.addDocument(await this.tokenize(string, mentionCount), label);
  }
  classify(document) {
    return this.classifier.classify(document);
  }
  getClassifications(document) {
    return this.classifier.getClassifications(document);
  }
  train() {
    let training = this.classifier.train();
    this.scheduleSave();
    return training;
  }
}

/*let c = new SpamClassifier();
console.log(c.tokenize("Hi, how ```\ndwadadawd\ndwadawd\n```are <@01GAX96NH5KMHCR3KW8PHMHSGA> you? <@01G9MCW5KZFKT2CRAD3G3B9JN5>dwad :01G81KSS4CMV69XJQ65C1AKX61:"))*/

module.exports = SpamClassifier;
