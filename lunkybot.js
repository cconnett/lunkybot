require('es6-promise').polyfill();
require('promise.prototype.finally');

const discord = require('discord.js');
const get = require('request-promise');
const twitch = require('twitch-api');

const auth = require('./auth');
const matcher = require('./matcher');

const actions = [
  {
    pattern: /!(stats|wr) (.*)/,
    reply: function(message, groups) {
      var [_, command, arg] = groups;
      let params = {
        stats: {
          url: 'http://mossranking.mooo.com/api/userlist.php',
          fn: statsMessage
        },
        wr: {url: 'http://mossranking.mooo.com/api/catdef.php', fn: wrMessage}
      };
      get(params[command].url).then(function(json) {
        try {
          params[command]
              .fn(JSON.parse(json), arg)
              .then(text => bot.reply(message, text));
        } catch (e) {
          bot.reply(message, 'Something went wrong.');
        }
      });
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
];

function statsMessage(players, arg) {
  let lowerPlayerToId = {};
  for (let [id, name, country, sprite, twitch] of players.slice(1)) {
    lowerPlayerToId[name.toLowerCase()] = id;
  }
  let match =
      matcher.getClosestMatch(arg.toLowerCase(), Object.keys(lowerPlayerToId));
  return new Promise(
      (resolve, reject) => resolve(
          '<http://mossranking.mooo.com/stats.php?id_user=' +
          `${lowerPlayerToId[match]}>`));
}

function wrMessage(categories, arg) {
  let lowerCatToId = {};
  for (let [id, category, shortname] of categories.slice(1)) {
    lowerCatToId[category.toLowerCase()] = id;
  }
  let catId = lowerCatToId[matcher.getClosestMatch(
      arg.toLowerCase(), Object.keys(lowerCatToId))];
  return new Promise(function(resolve, reject) {
    let jsonPromise =
        get(`http://mossranking.mooo.com/api/getwr.php?cat=${catId}`);
    jsonPromise.then(function(json) {
      let catName = categories[catId][1];
      try {
        var [spelunker, score, time] = JSON.parse(json);
      } catch (e) {
        reject(`I don't know what the record is for ${catName}}.`);
      }
      resolve(`The world record for ${catName} is ${time} by ${spelunker}.`);
    });
  });
}

const bot = new discord.Client();
bot.on('message', function(message) {
  actions.forEach(function(action) {
    let groups = action.pattern.exec(message.content);
    if (groups) {
      if (typeof action.reply === 'string') {
        bot.reply(message, action.reply);
      } else {
        action.reply(message, groups);
      }
    }
  });
});

bot.loginWithToken(auth.token);
module.exports.actions = actions;
module.exports.statsMessage = statsMessage;
module.exports.wrMessage = wrMessage;
module.exports.get = get;
