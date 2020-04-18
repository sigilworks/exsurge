import BaseLanguage from 'language/base-language';

/**
 * @class Spanish
 * @extends BaseLanguage
 */
export default class Spanish extends BaseLanguage {

    constructor() {
        super("Spanish");

        this.vowels = [
            'a', 'e', 'i', 'o', 'u', 'y',
            'á', 'é', 'í', 'ó', 'ú', 'ü'
        ];

        this.weakVowels = ['i', 'u', 'ü', 'y'];

        this.strongVowels = ['a', 'e', 'o', 'á', 'é', 'í', 'ó', 'ú'];

        this.diphthongs = [
            'ai', 'ei', 'oi', 'ui', 'ia', 'ie', 'io', 'iu', 'au', 'eu', 'ou', 'ua', 'ue', 'uo',
            'ái', 'éi', 'ói', 'úi', 'iá', 'ié', 'ió', 'iú', 'áu', 'éu', 'óu', 'uá', 'ué', 'uó',
            'üe', 'üi'
        ];

        this.uDiphthongExceptions = ['gue', 'gui', 'qua', 'que', 'qui', 'quo'];
    }

    // c must be lowercase!
    isVowel(c) {
        for (var i = 0, end = this.vowels.length; i < end; i++)
            if (this.vowels[i] === c)
                return true;

        return false;
    }

    /**
     * @param {String} c The character to test; must be lowercase
     * @return {boolean} true if c is an f or a mute consonant
     */
    isWeakVowel(c) {
        for (var i = 0, end = this.weakVowels.length; i < end; i++)
            if (this.weakVowels[i] === c)
                return true;

        return false;
    }

    /**
     * @param {String} c The character to test; must be lowercase
     * @return {boolean} true if c is an f or a mute consonant
     */
    isStrongVowel(c) {
        for (var i = 0, end = this.strongVowels.length; i < end; i++)
            if (this.strongVowels[i] === c)
                return true;

        return false;
    }

    /**
     *
     * @param {String} s The string to test; must be lowercase
     * @return {boolean} true if s is a diphthong
     */
    isDiphthong(s) {
        for (var i = 0, end = this.diphthongs.length; i < end; i++)
            if (this.diphthongs[i] === s)
                return true;

        return false;
    }

    createSyllable(text) {
        /*
            var accented = false;
            var ellidesToNext = false;

            if (text.length > 0) {

                if (text[0] == '`') {
                    accented = true;
                    text = text.substr(1);
                }

                if (text[text.length - 1] == '_') {
                    ellidesToNext = true;
                    text = text.substr(0, text.length - 1);
                }
            }

            var s = new Syllable(text);

            s.isMusicalAccent = accented;
            s.elidesToNext = ellidesToNext;*/

        return text;
    }

    syllabifyWord(word) {
        var syllables = [];

        var haveCompleteSyllable = false;
        var previousIsVowel = false;
        var previousIsStrongVowel = false; // only valid if previousIsVowel == true
        var startSyllable = 0;

        // fixme: first check for prefixes

        for (var i = 0; i < word.length; i++) {

            var c = word[i].toLowerCase();

            if (this.isVowel(c)) {

                // we have a complete syllable as soon as we have a vowel
                haveCompleteSyllable = true;

                var cIsStrongVowel = this.isStrongVowel(c);

                if (previousIsVowel) {
                    // if we're at a strong vowel, then we finish out the last syllable
                    if (cIsStrongVowel) {
                        if (previousIsStrongVowel) {
                            syllables.push(this.createSyllable(word.substr(startSyllable, i - startSyllable)));
                            startSyllable = i;
                        }
                    }
                }

                previousIsVowel = true;
                previousIsStrongVowel = cIsStrongVowel;

            } else {
                if (!haveCompleteSyllable) {
                    // do nothing since we don't have a complete syllable yet...
                } else {

                    // handle explicit syllable breaks
                    if (word[i] === '-') {
                        // start new syllable
                        syllables.push(this.createSyllable(word.substr(startSyllable, i - startSyllable)));
                        startSyllable = ++i;
                    } else {

                        var numberOfConsonants = 1, consonant2;

                        // count how many more consonants there are
                        for (var j = i + 1; j < word.length; j++) {
                            if (this.isVowel(word[j]))
                                break;
                            numberOfConsonants++;
                        }

                        if (numberOfConsonants === 1) {
                            // start new syllable
                            syllables.push(this.createSyllable(word.substr(startSyllable, i - startSyllable)));
                            startSyllable = i;

                        } else if (numberOfConsonants === 2) {
                            consonant2 = word[i + 1].toLowerCase();
                            if (consonant2 === 'l' || consonant2 === 'r' || (c === 'c' && consonant2 === 'h')) {
                                // split before the consonant pair
                                syllables.push(this.createSyllable(word.substr(startSyllable, i - startSyllable)));
                                startSyllable = i++;
                            } else {
                                //split the consonants
                                syllables.push(this.createSyllable(word.substr(startSyllable, ++i - startSyllable)));
                                startSyllable = i;
                            }

                        } else if (numberOfConsonants === 3) {
                            consonant2 = word[i + 1].toLowerCase();

                            // if second consonant is s, divide cc-c, otherwise divide c-cc
                            if (consonant2 === 's') {
                                i += 2;
                                syllables.push(this.createSyllable(word.substr(startSyllable, i - startSyllable)));
                            } else
                                syllables.push(this.createSyllable(word.substr(startSyllable, ++i - startSyllable)));

                            startSyllable = i;

                        } else if (numberOfConsonants === 4) {
                            // four always get split cc-cc
                            syllables.push(this.createSyllable(word.substr(startSyllable, i - startSyllable + 2)));
                            startSyllable = i + 2;
                            i += 3;
                        }
                    }

                    haveCompleteSyllable = false;
                }

                previousIsVowel = false;
            }
        }


        // if we have a complete syllable, we can add it as a new one. Otherwise
        // we tack the remaining characters onto the last syllable.
        if (haveCompleteSyllable)
            syllables.push(word.substr(startSyllable));
        else if (startSyllable > 0)
            syllables[syllables.length - 1] += word.substr(startSyllable);
        else if (syllables.length === 0)
            syllables.push(this.createSyllable(word))

        return syllables;
    }

    /**
     * @param {String} s the string to search
     * @param {Number} startIndex The index at which to start searching for a vowel in the string
     * @retuns a custom class with three properties: {found: (true/false) startIndex: (start index in s of vowel segment) length ()}
     */
    findVowelSegment(s, startIndex) {

        var i, end, index;
        var workingString = s.toLowerCase();

        // do we have a diphthongs?
        for (i = 0, end = this.diphthongs.length; i < end; i++) {
            var d = this.diphthongs[i];
            index = workingString.indexOf(d, startIndex);

            if (index >= 0) {

                // check the exceptions...
                if (d[0] === 'u' && index > 0) {
                    var tripthong = s.substr(index - 1, 3).toLowerCase();

                    for (var j = 0, endj = this.uDiphthongExceptions.length; i < endj; j++) {
                        if (tripthong === this.uDiphthongExceptions[j]) {
                            // search from after the u...
                            return this.findVowelSegment(s, index + 1);
                        }
                    }
                }

                return { found: true, startIndex: index, length: d.length };
            }
        }

        // no diphthongs. Let's look for single vowels then...
        for (i = 0, end = this.vowels.length; i < end; i++) {
            index = workingString.indexOf(this.vowels[i], startIndex);

            if (index >= 0)
                return { found: true, startIndex: index, length: 1 };
        }

        // no vowels sets found after startIndex!
        return { found: false, startIndex: -1, length: -1 };
    }
}
