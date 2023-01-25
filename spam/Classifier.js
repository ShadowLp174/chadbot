const natural = require("natural");
const BayesClassifier = natural.BayesClassifier;
const PorterStemmer = natural.PorterStemmer;
const EventEmitter = require("stream");
const fs = require("fs");

class SpamClassifier extends EventEmitter {
  classifier = new BayesClassifier();
  mentionRegex = /(?<mention>(<@[A-Z0-9]+>))/gi;
  mentionLength = 29;
  specialCharRegex = /[^a-zA-Z\d\s:\/]/gi;
  codeRegex = /```(.*)```/gis;

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
  tokenize(string, mentionLimit=Number.POSITIVE_INFINITY) {
    string = string.trim();
    string = string.replace(this.codeRegex, "");

    let stemmed = PorterStemmer.stem(string);

    let mentions = stemmed.matchAll(this.mentionRegex);
    let result = mentions.next();
    let indexOffset = 0;
    for (let i = 0; !result.done; i++) {
      if (mentionLimit != Infinity && i >= mentionLimit) break;

      let lws = (result.value.input.charAt(result.value.index - 1) == " ") ? "" : " ";
      let rws = (result.value.input.charAt(result.value.index + result.value[0].length) == " ") ? "" : " ";
      let subs = lws + "mentionedmention" + rws;

      stemmed = this.replaceAt(stemmed, subs, result.value.index + indexOffset, result.value[0].length);
      indexOffset += subs.length - result.value[0].length;
      result = mentions.next();
    }

    let chars = stemmed.matchAll(this.specialCharRegex);
    indexOffset = 0;
    result = chars.next();
    for (let i = 0; !result.done; i++) {
      let lws = (result.value.input.charAt(result.value.index - 1) == " ") ? "" : " ";
      let rws = (result.value.input.charAt(result.value.index + result.value[0].length) == " ") ? "" : " ";
      let subs = lws + result.value[0] + rws;

      stemmed = this.replaceAt(stemmed, subs, result.value.index + indexOffset, result.value[0].length);
      indexOffset += subs.length - result.value[0].length;
      result = chars.next();
    }
    return stemmed.split(" ");
  }
  addDocument(string, label, mentionCount) {
    return this.classifier.addDocument(this.tokenize(string, mentionCount), label);
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
console.log(c.tokenize("Hi, how ```\ndwadadawd\ndwadawd\n```are <@01GAX96NH5KMHCR3KW8PHMHSGA> you? <@01G9MCW5KZFKT2CRAD3G3B9JN5>dwad"))*/

module.exports = SpamClassifier;
