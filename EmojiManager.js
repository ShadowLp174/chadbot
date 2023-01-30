class EmojiManager {
  client;
  listeners = new Map();

  constructor(client) {
    this.client = client;

    this.client.on("message/update", (e) => {
      if (this.listeners.has(e._id)) {
        let ls = this.listeners.get(e._id);
        ls.forEach(l => {
          l.call(this, e.reactions);
        });
      }
    });
  }

  addMessageListener(mid, listener) {
    let m = this.client.messages.get(mid);
    if (!m) throw "Message not found!";
    const ls = (this.listeners.get(mid) || []);
    ls.push(listener);
    this.listeners.set(mid, ls);
  }
}

module.exports = EmojiManager;
