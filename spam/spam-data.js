const fs = require("fs");

const docs = require("./store.json").docs;

const spam = docs.filter(e => e.label == "spam");
var file = "";
spam.forEach(s => {
  file += s.text.join(" ").replace(/\\n/g, "\\n") + "\n";
});
fs.writeFileSync("./spam-data", file, "utf8");
