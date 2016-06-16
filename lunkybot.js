require('es6-promise').polyfill();
require('promise.prototype.finally');

const discord = require('discord.js');
const get = require('request-promise');
const twitch = require('twitch-api');

const auth = require('./auth');
const matcher = require('./matcher');


const recentRunsChannelId = '190522354114363392';

class Lunkybot {
  constructor(actions) {
    this.actions = actions;
    this.client = new discord.Client();
  }

  start() {
    this.client.on('message', message => {
      this.actions.forEach(action => {
        let groups = action.pattern.exec(message.content);
        if (groups) {
          if (typeof action.reply === 'string') {
            this.client.reply(message, action.reply);
          } else {
            action.reply(message, groups);
          }
        }
      });
    });
    this._postNewRunsHandle = setInterval(() => this.fetchAndPost(), 60000);
    return this.client.loginWithToken(auth.token);
  }


  stop() { clearInterval(this._postNewRunsHandle); }

  fetch(url) {
    return get(url).then(JSON.parse).catch(e => {
      console.log(e);
      return Promise.reject(e);
    });
  }

  fetchAndPost() {
    return this.fetch('http://mossranking.mooo.com/api/recent_runs.php')
        .then(r => Promise.all(this.postNewRuns(r)));
  }
  postNewRuns(recentRuns) {
    let results = [];
    let logs = this.client.getChannelLogs(recentRunsChannelId);
    for (let [id_user, username, cat, category, submitted, scorerun, timerun,
              timerun_hf, world, level, flag_wr, link, comment] of recentRuns
             .slice(1)) {
      let content = '';
      if (parseInt(flag_wr)) {
        content += `${username} set a new World Record for ${category}! `;
      } else {
        content += `${username} completed a ${category} run! `;
      }
      if (parseInt(scorerun)) {
        let score = new Intl
                        .NumberFormat('en-US', {
                          style: "currency",
                          currency: "usd",
                          minimumFractionDigits: 0
                        })
                        .format(parseInt(scorerun));
        content += `The score was ${score}.`;
      } else {
        content += `The time was ${timerun_hf}.`;
      }
      logs.then(logs => {
        let previousMessage =
            logs.filter(message => message.content == content);
        if (previousMessage.length == 0) {
          results.push(this.client.sendMessage(recentRunsChannelId, content));
        }
      });
    }
    return results;
  }
}

function statsMessage(players, arg) {
  let lowerPlayerToId = {};
  for (let [id, name, country, sprite, twitch] of players.slice(1)) {
    lowerPlayerToId[name.toLowerCase()] = id;
  }
  let match =
      matcher.getClosestMatch(arg.toLowerCase(), Object.keys(lowerPlayerToId));
  return Promise.resolve(
      `<http://mossranking.mooo.com/stats.php?id_user=${lowerPlayerToId[match]}>`);
}

function wrMessage(categories, arg) {
  let lowerCatToId = {};
  for (let [id, category, shortname] of categories.slice(1)) {
    lowerCatToId[category.toLowerCase()] = id;
  }
  let catId = lowerCatToId[matcher.getClosestMatch(
      arg.toLowerCase(), Object.keys(lowerCatToId))];
  let catName = categories[catId][1];
  return get(`http://mossranking.mooo.com/api/getwr.php?cat=${catId}`)
      .then(json => {
        var [spelunker, score, time] = JSON.parse(json);
        return `The world record for ${catName} is ${time} by ${spelunker}.`;
      })
      .catch(() => `I don't know what the record is for ${catName}}.`);
};

const bot = new Lunkybot([
  {
    pattern: /!stats (\S+)/,
    reply: function(groups) {
      var [_, arg] = groups;
      bot.fetch('http://mossranking.mooo.com/api/userlist.php')
          .then(statsMessage);
    }
  },
  {
    pattern: /!wr (.*)/,
    reply: function(groups) {
      var [_, arg] = groups;
      bot.fetch('http://mossranking.mooo.com/api/catdef.php')
          .then(categories => wrMessage(categories, arg));
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
  {pattern: /!mossranking/, reply: '<http://mossranking.mooo.com/>'},
  {pattern: /!news/, reply: '<http://mossranking.mooo.com/news/>'},
  {
    pattern: /!recentruns/,
    reply: '<http://mossranking.mooo.com/recent_runs.php>'
  },
  {pattern: /!rng/, reply: 'ಠ_ಠ THIS GAME MAN ಠ_ಠ'},
  {pattern: /!cratechances/, reply: '<http://spelunky.wikia.com/wiki/Crate>'},
  {pattern: /!grooomp/, reply: 'ssssssssstop'},
  {pattern: /!curt/, reply: 'c:'},
  {pattern: /!brut/, reply: 'ʕ•ᴥ•ʔ meow ʕ•ᴥ•ʔ'},
  {
    pattern: /!leaderboards/,
    reply: '<http://mossranking.mooo.com/records.php>'
  },
  {pattern: /!cat/, reply: function() {}},
]);

module.exports.Lunkybot = Lunkybot;
module.exports.bot = bot;

if (require.main === module) {
  bot.start().catch(console.log).then(() => bot.fetchAndPost());
}
