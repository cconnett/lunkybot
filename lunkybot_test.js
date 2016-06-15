const rewire = require('rewire');
const lunkybot = rewire('./lunkybot');

// Get unexported symbols for testing and spying.
const spies = {
  actions: lunkybot.__get__('actions'),
  statsMessage: lunkybot.__get__('statsMessage'),
  wrMessage: lunkybot.__get__('wrMessage'),
  get: lunkybot.__get__('get'),
};

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
    spies.statsMessage(statsData, 'sat')
        .then(
            msg => expect(msg).toEqual(
                '<http://mossranking.mooo.com/stats.php?id_user=2>'))
        .finally(done);
  });
  it(`should match 'kinni' to 'kinnijup'`, function(done) {
    spies.statsMessage(statsData, 'kinni')
        .then(
            msg => expect(msg).toEqual(
                '<http://mossranking.mooo.com/stats.php?id_user=1>'))
        .finally(done);
  });

  beforeEach(function() {
    spyOn(spies, 'get')
        .and.returnValue(
            new Promise((res, rej) => res('["Kinnijup","99716","1:39.716"]')));
  });
  it(`should match 'egg' to 'Eggplant%`, function(done) {
    spies.wrMessage(catData, 'egg')
        .then(msg => expect(msg).toMatch('The world record for Eggplant% is'))
        .finally(done);
  });
  it(`should match 'low' to 'Low%`, function(done) {
    spies.wrMessage(catData, 'low')
        .then(msg => expect(msg).toMatch('The world record for Low% is'))
        .finally(done);
  });
  it(`should match 'lowhell' to 'Low% Hell`, function(done) {
    spies.wrMessage(catData, 'lowhell')
        .then(msg => expect(msg).toMatch('The world record for Low% Hell is'))
        .finally(done);
  });
  it(`should match 'lh' to 'Low% Hell`, function(done) {
    spies.wrMessage(catData, 'lh')
        .then(msg => expect(msg).toMatch('The world record for Low% Hell is'))
        .finally(done);
  });
  it(`should match 'no gold' to 'No Gold`, function(done) {
    spies.wrMessage(catData, 'no gold')
        .then(msg => expect(msg).toMatch('The world record for No Gold is'))
        .finally(done);
  });
});
