var lunkybot = require('./lunkybot');

let testdata = [
  'headers',
  [1, 'kinnijup', null, null, null],
  [2, 'saturnin55', null, null, null],
  [3, 'samots', null, null, null]
];

describe('The matching algorithm', function() {
  it(`should match 'sat' to 'saturnin55'`, function() {
    expect(lunkybot.statsMessage(testdata, 'sat'))
        .toEqual('<http://mossranking.mooo.com/stats.php?id_user=2>');
  });
  it(`should match 'kinni' to 'kinnijup'`, function() {
    expect(lunkybot.statsMessage(testdata, 'kinni'))
        .toEqual('<http://mossranking.mooo.com/stats.php?id_user=1>');
  });
});
