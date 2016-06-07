const discord = require('discord.js');
const difflib = require('difflib');
const twitch = require('twitch-api');

const auth = require('./auth');

const bot = new discord.Client();

const actions = [
  {
    pattern: /!stats (\w+)/,
    reply: function(message, groups) {
      let name = groups[1];
      return null;
      let spelunkers = getSpelunkersFromMossranking();
      let matches = difflib.getCloseMatches(name, spelunkers);
      if (!matches) {
        bot.reply(
            message,
            `I couldn't find a spelunker named ${name}`);
      }
      let spelunker = matches[0];
      bot.reply(message, `mossrankingurl`);
    }
  },
  {
    pattern: /!wr (\S+)/,
    reply: function(message, groups) {
      let category = groups[1];
      let categories = [];
      let matches = difflib.getCloseMatches(category, categories);
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
module.exports.bot = bot;
