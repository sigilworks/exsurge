var should = require('chai').should(), Exsurge = require('../dist/exsurge.js');


describe('Core functionality', function() {

  it('Point object', function() {
    var point = new Exsurge.Point(3.14, 159.26);
    point.x.should.equal(3.14);
    point.y.should.equal(159.26);

    var clone = point.clone();
    clone.x.should.equal(3.14);
    clone.y.should.equal(159.26);

    point.equals(clone).should.equal(true);
    point.equals(new Exsurge.Point()).should.equal(false);
  });

  it('Rect object', function() {

    var rect = new Exsurge.Rect(3, 1, 4, 5);
    rect.x.should.equal(3);
    rect.y.should.equal(1);
    rect.width.should.equal(4);
    rect.height.should.equal(5);

    var clone = rect.clone();
    clone.x.should.equal(3);
    clone.y.should.equal(1);
    clone.width.should.equal(4);
    clone.height.should.equal(5);

    rect.isEmpty().should.equal(false);

    rect.right().should.equal(3 + 4);
    rect.bottom().should.equal(1 + 5);

    rect.equals(clone).should.equal(true);

    var badRect = new Exsurge.Rect();
    badRect.isEmpty().should.equal(true);

    rect.equals(badRect).should.equal(false);

    // fixme: test Rect.contains and Rect.union
  });

  it('Margins object', function() {
    var margins = new Exsurge.Margins(10, 11, 12, 13);
    margins.left.should.equal(10);
    margins.top.should.equal(11);
    margins.right.should.equal(12);
    margins.bottom.should.equal(13);

    var clone = margins.clone();
    clone.left.should.equal(10);
    clone.top.should.equal(11);
    clone.right.should.equal(12);
    clone.bottom.should.equal(13);

    margins.equals(clone).should.equal(true);
  });

  it('Size object', function() {
    var size = new Exsurge.Size(3.14, 159.26);
    size.width.should.equal(3.14);
    size.height.should.equal(159.26);

    var clone = size.clone();
    clone.width.should.equal(3.14);
    clone.height.should.equal(159.26);

    size.equals(clone).should.equal(true);
    size.equals(new Exsurge.Size()).should.equal(false);
  });
});

describe('Latin syllabification', function() {

  var lang = new Exsurge.Latin();

  var assertWordSyllables = function(word, syllables) {
    word.length.should.equal(syllables.length);

    for (var i = 0; i < word.length; i++) {
      word[i].should.equal(syllables[i]);
    }
  }

  it("Syllabify 'Puer natus est'", function() {

    var words = lang.syllabify('Puer natus est');
    words.length.should.equal(3);

    assertWordSyllables(words[0], ['Pu', 'er']);
    assertWordSyllables(words[1], ['na', 'tus']);
    assertWordSyllables(words[2], ['est']);
  });
});
