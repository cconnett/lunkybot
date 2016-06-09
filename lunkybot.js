const discord = require('discord.js');
const get = require('request-promise');
const twitch = require('twitch-api');

const auth = require('./auth');
const matcher = require('./matcher');

const actions = [
  {
    pattern: /!stats (\w+)/,
    reply: function(message, groups) {
      let arg = groups[1];
      get('http://mossranking.mooo.com/api/userlist.php')
          .then(function(json) {
            let players;
            try {
              bot.reply(message, statsMessage(JSON.parse(json), arg));
            } catch (e) {
              bot.reply(message, 'Something went wrong.');
            }
          });
    }
  },
  {
    pattern: /!wr (\S+)/,
    reply: function(message, groups) {
      let category = groups[1];
      let categories = [];
      let matches = matcher.getClosestMatch(category, categories);
      if (!matches) {
        bot.reply(message, `What category is ${category}?`);
      }
      let cat = matches[0];
      return;
      var [time, spelunker] = lookupWr(cat);
      bot.reply(message,
                `World record for ${cat} is ${time} by ${spelunker}.`);
    }
  },
  {
    pattern: /!death/,
    reply: 'Those damn aliens in a pot get me every time ¯\_(ツ)_/¯'
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
  for (let[id, name, country, sprite, twitch] of players.slice(1)) {
    lowerPlayerToId[name.toLowerCase()] = id;
  }
  let match =
      matcher.getClosestMatch(arg.toLowerCase(), Object.keys(lowerPlayerToId));
  return '<http://mossranking.mooo.com/stats.php?id_user=' +
         `${lowerPlayerToId[match]}>`;
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
