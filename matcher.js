const difflib = require('difflib');

function argmax(f, seq) {
  let best = seq.pop();
  let highscore = f(best);
  for (let elem of seq) {
    let score = f(elem);
    if (score > highscore) {
      highscore = score;
      best = elem;
    }
  }
  return best;
}

module.exports.getClosestMatch = function(left, pool) {
  return argmax(right => score(left, right), pool);
};

function score(left, right) {
  let blocks =
      new difflib.SequenceMatcher(null, left, right).getMatchingBlocks();
  return blocks.map(([a, b, l]) => l * l).reduce((prev, cur) => prev + cur) /
         (left.length + right.length);
}
