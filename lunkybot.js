require('es6-promise').polyfill();
require('promise.prototype.finally');

const discord = require('discord.io');
const get = require('request-promise');
const irc = require('irc');
const simplequeue = require('simplequeue');
const sqlite = require('sqlite');
const twitch = require('twitch-api');

const auth = require('./auth');
const matcher = require('./matcher');


const recentRunsChannelId = '190522354114363392';

// class Bot {
//   constructor(actions) { this.actions = actions; }
// }

// class DiscordBot extends Bot {
//   constructor(actions) {
//     super(actions);
//     this.client = thing;
//   }
// }

// class IrcBot extends Bot {}


class Lunkybot {
  constructor(actions) {
    this.actions = actions;
    this.db = null;
    this.discord = null;
    this.irc = null;
    this._loginHandle = null;
    this._postNewRunsHandle = null;
    this._discordMessageQueue = simplequeue.createQueue();
  }

  start() {
    process.addListener('SIGINT', this.stop);

    sqlite.open('lunkybot.db')
        .then(db => { this.db = db; })
        .then(() => {
          return this.db.run(
              'CREATE TABLE IF NOT EXISTS ircChannels (channel TEXT)');
        })
        .then(() => {
          return this.db.run(
              'CREATE TABLE IF NOT EXISTS runsNotified (signature TEXT)');
        })
        .then(() => {
          return this.db.run(
              'CREATE INDEX IF NOT EXISTS runsSigs ON runsNotified (signature)');
        })
        .then(() => this.fetchAndPost())
        .catch(console.error);
    this._postNewRunsHandle =
        setInterval(() => this.fetchAndPost(), 1000 * 60 * 15);

    this.discord = new discord.Client({
      autorun: true,
      token: auth.discordToken,
    });

    this.irc = new irc.Client('irc.twitch.tv', 'Lunkybot', {
      floodProtetion: true,
      floodProtetionDelay: 1.5,
      secure: false,
      debug: true,
      password: auth.ircToken,
      autoConnect: false,
    });
    this.addDiscordHandler();
    this.addIrcHandler();
    this.sendOne();
  }

  stop() {
    clearInterval(this._postNewRunsHandle);
    clearInterval(this._loginHandle);
  }

  sendOne() {
    this._discordMessageQueue.getMessage((err, msg) => {
      if (msg) {
        this.discord.sendMessage(msg);
      }
    });
    setTimeout(() => this.sendOne(), 1500);
  }

  addDiscordHandler() {
    this.discord.on('message', (user, userId, channelId, message, event) => {
      this.actions.forEach(action => {
        let groups = action.pattern.exec(message);
        if (groups) {
          if (typeof action.reply === 'string') {
            this.discord.sendMessage({
              to: channelId,
              message: action.reply,
            });
          } else {
            action.reply(groups).then(answer => this.discord.sendMessage({
              to: channelId,
              message: answer,
            }));
          }
        }
      });
    });
  }

  addIrcHandler() {
    this.irc.addListener('message', (from, to, message) => {
      this.actions.forEach(action => {
        let groups = action.pattern.exec(message);
        if (groups) {
          if (typeof action.reply === 'string') {
            this.irc.say(to, action.reply);
          } else {
            action.reply(groups).then(answer => this.irc.say(to, answer));
          }
        }
      });
    });
    this.irc.addListener('pm', (from, message) => {
      if (message == 'join') {
        this.db.run(
            'INSERT OR REPLACE INTO irc VALUES (?)', '#' + from, error => {
              if (!error) {
                self.irc.say(
                    from, 'OK, got it. To get rid of me, say \'part\'.');
              } else {
                self.irc.say(from, 'I had an error: ' + error);
              }
            });
      } else if (message == 'part') {
        let self = this;
        this.db.run('DELETE FROM irc WHERE channel = ?', '#' + from, error => {
          if (!error) {
            self.irc.say(from, 'OK, I\'m out.');
          } else {
            self.irc.say(from, 'I had an error: ' + error);
          }
        });
      }
    });
  }

  fetch(url) {
    return get(url).then(JSON.parse).catch(e => {
      console.log(e);
      return Promise.reject(e);
    });
  }

  statsMessage(players, arg) {
    let lowerPlayerToId = {};
    for (let [id, name, country, sprite, twitch] of players.slice(1)) {
      lowerPlayerToId[name.toLowerCase()] = id;
    }
    let match = matcher.getClosestMatch(
        arg.toLowerCase(), Object.keys(lowerPlayerToId));
    return Promise.resolve(
        `<http://mossranking.com/stats.php?id_user=${lowerPlayerToId[match]}>`);
  }

  wrMessage(categories, arg) {
    let lowerCatToId = {};
    for (let [id, category, shortname] of categories.slice(1)) {
      lowerCatToId[category.toLowerCase()] = id;
    }
    let catId = lowerCatToId[matcher.getClosestMatch(
        arg.toLowerCase(), Object.keys(lowerCatToId))];
    let catName = categories[catId][1];
    return this.fetch(`http://mossranking.com/api/getwr.php?cat=${catId}`)
        .then(data => {
          let [spelunker, score, time] = data;
          let scoreText = new Intl
                              .NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'usd',
                                minimumFractionDigits: 0
                              })
                              .format(parseInt(score));
          let value = time == -1 ? scoreText : time;
          return `The world record for ${catName} is ${value} by ${spelunker}.`;
        });
  }

  fetchAndPost() {
    return this.fetch('http://mossranking.com/api/recent_runs.php')
        .then(r => Promise.all(this.postNewRuns(r)));
  }
  sendMessage(messageObj) { this._discordMessageQueue.putMessage(messageObj); }
  postNewRuns(recentRuns) {
    let promises = [];

    for (let [id_user, username, cat, category, submitted, scorerun, timerun,
              timerun_hf, world, level, flag_wr, link, comment] of recentRuns
             .slice(1)) {
      let content = '';
      let article = /^[aeiou]/i.exec(category) ? 'an' : 'a';
      if (parseInt(flag_wr)) {
        content += `${username} set a new World Record for ${category}! `;
      } else {
        content += `${username} completed ${article} ${category} run! `;
      }
      if (parseInt(scorerun)) {
        let score = new Intl
                        .NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'usd',
                          minimumFractionDigits: 0
                        })
                        .format(parseInt(scorerun));
        content += `The score was ${score}.`;
      } else {
        content += `The time was ${timerun_hf}.`;
      }
      promises.push(
          this.db
              .get(
                  'SELECT signature FROM runsNotified WHERE signature = ?',
                  content)
              .then((row, err) => {
                if (!row) {
                  console.log('Sending message ' + content);
                  this.sendMessage({
                    to: recentRunsChannelId,
                    message: content,
                  });
                  return this.db.run(
                      'INSERT OR REPLACE INTO runsNotified VALUES (?)',
                      content);
                }
                return Promise.resolve();
              }));
    }
    return promises;
  }
}

const bot = new Lunkybot([
  {
    pattern: /!stats (\S+)/,
    reply: function(groups) {
      let [input, arg] = groups;
      return bot.fetch('http://mossranking.com/api/userlist.php')
          .then(categories => bot.statsMessage(categories, arg));
    }
  },
  {
    pattern: /!wr (.*)/,
    reply: function(groups) {
      let [input, arg] = groups;
      return bot.fetch('http://mossranking.com/api/catdef.php')
          .then(categories => bot.wrMessage(categories, arg));
    }
  },
  {
    pattern: /!death/,
    reply: 'Those damn aliens in a pot get me every time ¯\\_(ツ)_/¯'
  },
  {
    pattern: /!(info|commands)/,
    reply: '<https://github.com/cconnett/lunkybot#lunkybot>'
  },
  {
    pattern: /!discord/,
    reply:
        '<https://www.reddit.com/r/spelunky/comments/46n8q3/spelunky_discord_channel/>'
  },
  {pattern: /!reddit/, reply: '<https://www.reddit.com/r/spelunky>'},
  {pattern: /!mossranking/, reply: '<http://mossranking.com/>'},
  {pattern: /!news/, reply: '<http://mossranking.com/news/>'},
  {pattern: /!rng/, reply: 'ಠ\\_ಠ THIS GAME MAN ಠ\\_ಠ'},
  {pattern: /!cratechances/, reply: '<http://spelunky.wikia.com/wiki/Crate>'},
  {pattern: /!grooomp/, reply: 'ssssssssstop'},
  {pattern: /!curt/, reply: 'c:'},
  {pattern: /!brut /, reply: 'ʕ•ᴥ•ʔ meow ʕ•ᴥ•ʔ'},
  {pattern: /!kinni/, reply: 'O__O'},
  {pattern: /!leaderboards/, reply: '<http://mossranking.com/records.php>'},
]);

module.exports.Lunkybot = Lunkybot;
module.exports.bot = bot;

if (require.main === module) {
  bot.start();
}
