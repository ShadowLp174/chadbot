// https://autumn.revolt.chat/emojis/01GQJ0E43B2D0QK7CTDGQ2JD1H

const { CommandBuilder } = require('../Commands.js');
const { Client } = require("revolt.js");
const https = require("node:https");

function getId(url, uploader) {
  return new Promise(res => {
    https.get(url, async response => {
      res(await uploader.upload(response, "", "emojis"));
    })
  });
}

module.exports = {
  command: new CommandBuilder()
    .setName("steal-emoji")
    .setDescription("Steal an emoji :>")
    .addStringOption((c) =>
      c.setName("emoji")
        .setDescription("The id/emoji you want to upload to your server.")
        .setRequired(true)
    ).addStringOption(c =>
      c.setName("server")
        .setDescription("The id of the server, the emoji should be uploaded to.")
        .setRequired(true)
    ).addStringOption(c =>
      c.setName("name")
        .setDescription("The new name of the emoji.")
        .setRequired(true)),
  run: async function(msg, data) {
    const emojiRegex = /:[A-Z0-9]+:/;//g;
    let emoji = data.get("emoji").value.match(emojiRegex)[0];
    let server = data.get("server").value;
    let name = data.get("name").value;

    const emojiUrl ="https://autumn.revolt.chat/emojis/" + emoji.replace(/:/g, "");
    msg.reply("original: " + emojiUrl)
    const id = await getId(emojiUrl, this.uploader);
    console.log(id);
    await msg.channel.server.client.api.put(`/custom/emoji/${id}`, {
      name: name,
      parent: {
        type: "Server",
        id: server
      },
      nsfw: false
    })
    //msg.reply("https://autumn.revolt.chat/emojis/" + id)
  }
}
