const rewire = require('rewire');
const lunkybot = rewire('./lunkybot');

// Get unexported symbols for testing and spying.
const recentRunsChannelId = lunkybot.__get__('recentRunsChannelId');

let userData = [
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
    lunkybot.bot.statsMessage(userData, 'sat')
        .then(
            msg => expect(msg).toEqual(
                '<http://mossranking.mooo.com/stats.php?id_user=2>'))
        .finally(done);
  });
  it(`should match 'kinni' to 'kinnijup'`, function(done) {
    lunkybot.bot.statsMessage(userData, 'kinni')
        .then(
            msg => expect(msg).toEqual(
                '<http://mossranking.mooo.com/stats.php?id_user=1>'))
        .finally(done);
  });

  beforeEach(function() {
    lunkybot.bot.fetch = url => {
      if (/getwr/.exec(url)) {
        return Promise.resolve(["Kinnijup", "99716", "1:39.716"]);
      }
      if (/userlist/.exec(url)) {
        return Promise.resolve(userData);
      }
      if (/catdef/.exec(url)) {
        return Promise.resolve(catData);
      }
      return Promise.reject('bad url passed to test function');
    };
  });
  it(`should match 'egg' to 'Eggplant%'`, function(done) {
    lunkybot.bot.wrMessage(catData, 'egg')
        .then(msg => expect(msg).toMatch('The world record for Eggplant% is'))
        .finally(done);
  });
  it(`should match 'low' to 'Low%'`, function(done) {
    lunkybot.bot.wrMessage(catData, 'low')
        .then(msg => expect(msg).toMatch('The world record for Low% is'))
        .finally(done);
  });
  it(`should match 'lowhell' to 'Low% Hell'`, function(done) {
    lunkybot.bot.wrMessage(catData, 'lowhell')
        .then(msg => expect(msg).toMatch('The world record for Low% Hell is'))
        .finally(done);
  });
  it(`should match 'lh' to 'Low% Hell'`, function(done) {
    lunkybot.bot.wrMessage(catData, 'lh')
        .then(msg => expect(msg).toMatch('The world record for Low% Hell is'))
        .finally(done);
  });
  it(`should match 'no gold' to 'No Gold'`, function(done) {
    lunkybot.bot.wrMessage(catData, 'no gold')
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

describe('Recent runs handler', function() {
  let zaxMessage = 'theZaxanator completed an All Shortcuts + Olmec run! ' +
      'The time was 23:02.096.';
  let brutMessage = 'Brutwarst set a new World Record for Low%! ' +
      'The time was 1:40.419.';
  let krilleMessage = 'krille71 completed a Score run! ' +
      'The score was $3,000,000.';

  beforeEach(done => {
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

  it(`should post a new run`, done => {
    lunkybot.bot.fetchAndPost()
        .then(() => {
          expect(lunkybot.bot.client.sendMessage)
              .toHaveBeenCalledWith(recentRunsChannelId, zaxMessage);
        })
        .then(done);
  });

  it(`should say if it's a world record`, done => {
    lunkybot.bot.fetchAndPost()
        .then(() => {
          expect(lunkybot.bot.client.sendMessage)
              .toHaveBeenCalledWith(recentRunsChannelId, brutMessage);
        })
        .then(done);
  });

  it(`shouldn't post a duplicate run`, done => {
    lunkybot.bot.client.getChannelLogs = () => Promise.resolve([
      {content: zaxMessage, timestamp: 923},
      {content: brutMessage, timestamp: 120},
      {content: krilleMessage, timestamp: 10103}
    ]);
    lunkybot.bot.fetchAndPost()
        .then(() => {
          expect(lunkybot.bot.client.sendMessage).not.toHaveBeenCalled();
        })
        .then(done);
  });

  it(`shouldn't post runs older than the oldest message in the logs`, done => {
    lunkybot.bot.client.getChannelLogs = () =>
        Promise.resolve([{content: krilleMessage, timestamp: 1465935555555}]);
    lunkybot.bot.fetchAndPost()
        .then(() => {
          // krilleMessage is in the logs; brut's run is older than the
          // timestamp given here; zax message should appear.
          expect(lunkybot.bot.client.sendMessage)
              .toHaveBeenCalledWith(recentRunsChannelId, zaxMessage);
        })
        .catch(console.log)
        .finally(done);
  });
  it(`should use 'an' for categories starting with a vowel`, done => {
    lunkybot.bot.client.getChannelLogs = () => Promise.resolve([
      {content: brutMessage, timestamp: 95},
      {content: krilleMessage, timestamp: 9238}
    ]);
    lunkybot.bot.fetchAndPost()
        .then(() => {
          expect(lunkybot.bot.client.sendMessage.calls.argsFor(0)[1])
              .toMatch('an All');
        })
        .catch(console.log)
        .finally(done);
  });

  it(`should format score`, done => {
    lunkybot.bot.client.channels[0].getChannelLogs = () => Promise.resolve([
      {content: zaxMessage, timestamp: 2},
      {content: brutMessage, timestamp: 5}
    ]);
    lunkybot.bot.fetchAndPost()
        .then(() => {
          expect(lunkybot.bot.client.sendMessage)
              .toHaveBeenCalledWith(recentRunsChannelId, krilleMessage);
        })
        .finally(done);
  });
});
