const rewire = require('rewire');
const lunkybot = rewire('./lunkybot');

// Get unexported symbols for testing and spying.
const statsMessage = lunkybot.__get__('statsMessage');
const wrMessage = lunkybot.__get__('wrMessage');
const recentRunsChannelId = lunkybot.__get__('recentRunsChannelId');

let statsData = [
  'headers', [1, 'kinnijup', null, null, null],
  [2, 'saturnin55', null, null, null], [3, 'samots', null, null, null]
];

let catData = [
  ["cat", "name", "acronym"], ["1", "Score", "score"], ["2", "Any%", "any"],
  ["3", "Hell%", "hell"], ["4", "Low%", "low"], ["5", "No Gold", "no-gold"],
  ["6", "Eggplant%", "eggplant"], ["7", "Low% Hell", "lowhell"]
];

describe('The matching algorithm', function() {
  it(`should match 'sat' to 'saturnin55'`, function(done) {
    statsMessage(statsData, 'sat')
        .then(
            msg => expect(msg).toEqual(
                '<http://mossranking.mooo.com/stats.php?id_user=2>'))
        .finally(done);
  });
  it(`should match 'kinni' to 'kinnijup'`, function(done) {
    statsMessage(statsData, 'kinni')
        .then(
            msg => expect(msg).toEqual(
                '<http://mossranking.mooo.com/stats.php?id_user=1>'))
        .finally(done);
  });

  beforeEach(function() {
    spyOn(lunkybot.bot, 'fetch')
        .and.returnValue(
            new Promise((res, rej) => res('["Kinnijup","99716","1:39.716"]')));
  });
  it(`should match 'egg' to 'Eggplant%`, function(done) {
    wrMessage(catData, 'egg')
        .then(msg => expect(msg).toMatch('The world record for Eggplant% is'))
        .finally(done);
  });
  it(`should match 'low' to 'Low%`, function(done) {
    wrMessage(catData, 'low')
        .then(msg => expect(msg).toMatch('The world record for Low% is'))
        .finally(done);
  });
  it(`should match 'lowhell' to 'Low% Hell`, function(done) {
    wrMessage(catData, 'lowhell')
        .then(msg => expect(msg).toMatch('The world record for Low% Hell is'))
        .finally(done);
  });
  it(`should match 'lh' to 'Low% Hell`, function(done) {
    wrMessage(catData, 'lh')
        .then(msg => expect(msg).toMatch('The world record for Low% Hell is'))
        .finally(done);
  });
  it(`should match 'no gold' to 'No Gold`, function(done) {
    wrMessage(catData, 'no gold')
        .then(msg => expect(msg).toMatch('The world record for No Gold is'))
        .finally(done);
  });
});

let runsData = [
  [
    "id_user", "username", "cat", "category", "submitted", "scorerun",
    "timerun", "timerun_hf", "world", "level", "flag_wr", "link", "comment"
  ],
  [
    "102", "theZaxanator", "12", "All Shortcuts + Olmec", "2016-06-14 17:32:50",
    "0", "1382096", "23:02.096", "4", "4", "0",
    "https:\/\/www.youtube.com\/watch?v=bfK6aALjm_E&feature=youtu.be",
    "Stupid Category + Olmec"
  ],
  [
    "73", "Brutwarst", "4", "Low%", "2016-06-14 16:01:06", "0", "100419",
    "1:40.419", "4", "4", "1", "", "fake run"
  ],
  [
    "71", "krille71", "1", "Score", "2016-06-14 16:01:06", "3000000", "0", "",
    "4", "4", "0", "", "fake run"
  ],
];

fdescribe('Recent runs handler', function() {
  let zaxMessage = 'theZaxanator completed a All Shortcuts + Olmec run! ' +
      'The time was 23:02.096.';
  let brutMessage = 'Brutwarst set a new World Record for Low%! ' +
      'The time was 1:40.419.';
  let krilleMessage = 'krille71 completed a Score run! ' +
      'The score was $3,000,000.';

  beforeEach(function(done) {
    spyOn(lunkybot.bot, 'fetch');
    lunkybot.bot.client = jasmine.createSpyObj('client', [
      'loginWithToken', 'channels', 'sendMessage', 'on', 'reply',
      'getChannelLogs'
    ]);
    lunkybot.bot.client.channels = [{name: 'recent-runs'}];
    lunkybot.bot.client.getChannelLogs = () => Promise.resolve([]);
    lunkybot.bot.client.loginWithToken.and.returnValue(Promise.resolve(null));
    lunkybot.bot.start().then(lunkybot.bot.postNewRuns([])).then(done);
    lunkybot.bot.fetch.and.returnValue(Promise.resolve(runsData));
  });
  it(`should post a new run`, function(done) {
    lunkybot.bot.fetchAndPost()
        .then(() => {
          expect(lunkybot.bot.client.sendMessage)
              .toHaveBeenCalledWith(recentRunsChannelId, zaxMessage);
        })
        .then(done);
  });
  it(`should say if it's a world record`, function(done) {
    lunkybot.bot.fetchAndPost()
        .then(() => {
          expect(lunkybot.bot.client.sendMessage)
              .toHaveBeenCalledWith(recentRunsChannelId, brutMessage);
        })
        .then(done);
  });
  it(`shouldn't post duplicate run`, function(done) {
    lunkybot.bot.client.getChannelLogs = () => Promise.resolve([
      {content: zaxMessage}, {content: brutMessage}, {content: krilleMessage}
    ]);
    lunkybot.bot.fetchAndPost()
        .then(() => {
          expect(lunkybot.bot.client.sendMessage).not.toHaveBeenCalled();
        })
        .then(done);
  });
  it(`should format score`, function(done) {
    lunkybot.bot.client.channels[0].getChannelLogs = () =>
        Promise.resolve([{content: zaxMessage}, {content: brutMessage}]);
    lunkybot.bot.fetchAndPost()
        .then(() => {
          expect(lunkybot.bot.client.sendMessage)
              .toHaveBeenCalledWith(recentRunsChannelId, krilleMessage);
        })
        .then(done);
  });
});
