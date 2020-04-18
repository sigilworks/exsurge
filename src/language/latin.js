import BaseLanguage from 'language/base-language';

/**
 * @class
 */
export default class Latin extends BaseLanguage {

    /**
     * @constructor
     */
    constructor() {
        super('Latin');

        // fixme: ui is only diphthong in the exceptional cases below (according to Wheelock's Latin)
        this.diphthongs = ['ae', 'au', 'oe', 'aé', 'áu', 'oé'];
        // for centering over the vowel, we will need to know any combinations that might be diphthongs:
        this.possibleDiphthongs = this.diphthongs.concat(['ei', 'eu', 'ui', 'éi', 'éu', 'úi']);
        this.regexVowel = /(i|(?:[qg]|^)u)?([eé][iu]|[uú]i|[ao][eé]|[aá]u|[aeiouáéíóúäëïöüāēīōūăĕĭŏŭåe̊o̊ůæœǽyýÿ])/i;

        // some words that are simply exceptions to standard syllabification rules!
        var wordExceptions = {};

        // ui combos pronounced as diphthongs
        wordExceptions["huius"] = ["hui", "us"];
        wordExceptions["cuius"] = ["cui", "us"];
        wordExceptions["huic"] = ["huic"];
        wordExceptions["cui"] = ["cui"];
        wordExceptions["hui"] = ["hui"];

        // eu combos pronounced as diphthongs
        wordExceptions["euge"] = ["eu", "ge"];
        wordExceptions["seu"] = ["seu"];

        this.vowels = ['a', 'e', 'i', 'o', 'u',
            'á', 'é', 'í', 'ó', 'ú',
            'ä', 'ë', 'ï', 'ö', 'ü',
            'ā', 'ē', 'ī', 'ō', 'ū',
            'ă', 'ĕ', 'ĭ', 'ŏ', 'ŭ',
            'å', 'e̊', 'o̊', 'ů',
            'æ', 'œ',
            'ǽ',  // no accented œ in unicode?
            'y', 'ý', 'ÿ']; // y is treated as a vowel; not native to Latin but useful for words borrowed from Greek

        this.vowelsThatMightBeConsonants = ['i', 'u'];

        this.muteConsonantsAndF = ['b', 'c', 'd', 'g', 'p', 't', 'f'];

        this.liquidConsonants = ['l', 'r'];
    }

    // c must be lowercase!
    isVowel(c) {
        for (var i = 0, end = this.vowels.length; i < end; i++)
            if (this.vowels[i] === c)
                return true;

        return false;
    }

    isVowelThatMightBeConsonant(c) {
        for (var i = 0, end = this.vowelsThatMightBeConsonants.length; i < end; i++)
            if (this.vowelsThatMightBeConsonants[i] === c)
                return true;

        return false;
    }

    // substring should be a vowel and the character following
    isVowelActingAsConsonant(substring) {
        return this.isVowelThatMightBeConsonant(substring[0]) && this.isVowel(substring[1]);
    }

    /**
     * f is not a mute consonant, but we lump it together for syllabification
     * since it is syntactically treated the same way
     *
     * @param {String} c The character to test; must be lowercase
     * @return {boolean} true if c is an f or a mute consonant
     */
    isMuteConsonantOrF(c) {
        for (var i = 0, end = this.muteConsonantsAndF.length; i < end; i++)
            if (this.muteConsonantsAndF[i] === c)
                return true;

        return false;
    }

    /**
     *
     * @param {String} c The character to test; must be lowercase
     * @return {boolean} true if c is a liquid consonant
     */
    isLiquidConsonant(c) {
        for (var i = 0, end = this.liquidConsonants.length; i < end; i++)
            if (this.liquidConsonants[i] === c)
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

    /**
     *
     * @param {String} s The string to test; must be lowercase
     * @return {boolean} true if s is a diphthong
     */
    isPossibleDiphthong(s) {
        for (var i = 0, end = this.possibleDiphthongs.length; i < end; i++)
            if (this.possibleDiphthongs[i] === s)
                return true;

        return false;
    }

    /**
     * Rules for Latin syllabification (from Collins, "A Primer on Ecclesiastical Latin")
     *
     * Divisions occur when:
     *   1. After open vowels (those not followed by a consonant) (e.g., "pi-us" and "De-us")
     *   2. After vowels followed by a single consonant (e.g., "vi-ta" and "ho-ra")
     *   3. After the first consonant when two or more consonants follow a vowel
     *      (e.g., "mis-sa", "minis-ter", and "san-ctus").
     *
     * Exceptions:
     *   1. In compound words the consonants stay together (e.g., "de-scribo").
     *   2. A mute consonant (b, c, d, g, p, t) or f followed by a liquid consonant (l, r)
     *      go with the succeeding vowel: "la-crima", "pa-tris"
     *
     * In addition to these rules, Wheelock's Latin provides this sound exception:
     *   -  Also counted as single consonants are qu and the aspirates ch, ph,
     *      th, which should never be separated in syllabification:
     *      architectus, ar-chi-tec-tus; loquacem, lo-qua-cem.
     *
     */
    syllabifyWord(word) {
        var syllables = [];
        var haveCompleteSyllable = false;
        var previousWasVowel = false;
        var workingString = word.toLowerCase();
        var startSyllable = 0;

        var c, lookahead, haveLookahead;

        // a helper function to create syllables
        var makeSyllable = function(length) {
            if (haveCompleteSyllable) {
                syllables.push(word.substr(startSyllable, length));
                startSyllable += length;
            }

            haveCompleteSyllable = false;
        }

        for (var i = 0, wordLength = workingString.length; i < wordLength; i++) {

            c = workingString[i];

            // get our lookahead in case we need them...
            lookahead = '*';
            haveLookahead = (i + 1) < wordLength;

            if (haveLookahead)
                lookahead = workingString[i + 1];

            var cIsVowel = this.isVowel(c);

            // i is a special case for a vowel. when i is at the beginning
            // of the word (Iesu) or i is between vowels (alleluia),
            // then the i is treated as a consonant (y)
            if (c === 'i') {
                if (i === 0 && haveLookahead && this.isVowel(lookahead))
                    cIsVowel = false;
                else if (previousWasVowel && haveLookahead && this.isVowel(lookahead)) {
                    cIsVowel = false;
                }
            }

            if (c === '-') {

                // a hyphen forces a syllable break, which effectively resets
                // the logic...

                haveCompleteSyllable = true;
                previousWasVowel = false;
                makeSyllable(i - startSyllable);
                startSyllable++;

            } else if (cIsVowel) {

                // once we get a vowel, we have a complete syllable
                haveCompleteSyllable = true;

                if (previousWasVowel && !this.isDiphthong(workingString[i - 1] + "" + c)) {
                    makeSyllable(i - startSyllable);
                    haveCompleteSyllable = true;
                }

                previousWasVowel = true;

            } else if (haveLookahead) {

                if ((c === 'q' && lookahead === 'u') ||
                    (lookahead === 'h' && (c === 'c' || c === 'p' || c === 't'))) {
                    // handle wheelock's exceptions for qu, ch, ph and th
                    makeSyllable(i - startSyllable);
                    i++; // skip over the 'h' or 'u'
                } else if (previousWasVowel && this.isVowel(lookahead)) {
                    // handle division rule 2
                    makeSyllable(i - startSyllable);
                } else if (this.isMuteConsonantOrF(c) && this.isLiquidConsonant(lookahead)) {
                    // handle exception 2
                    makeSyllable(i - startSyllable);
                } else if (haveCompleteSyllable) {
                    // handle division rule 3
                    makeSyllable(i + 1 - startSyllable);
                }

                previousWasVowel = false;
            }
        }

        // if we have a complete syllable, we can add it as a new one. Otherwise
        // we tack the remaining characters onto the last syllable.
        if (haveCompleteSyllable)
            syllables.push(word.substr(startSyllable));
        else if (startSyllable > 0)
            syllables[syllables.length - 1] += word.substr(startSyllable);

        return syllables;
    }

    /**
     * @param {String} s the string to search
     * @param {Number} startIndex The index at which to start searching for a vowel in the string
     * @retuns a custom class with three properties: {found: (true/false) startIndex: (start index in s of vowel segment) length ()}
     */
    findVowelSegment(s, startIndex) {

        var match = this.regexVowel.exec(s.slice(startIndex));
        if (match) {
            if (match[1]) {
                // the first group should be ignored, as it is to separate an i or u that is used as a consonant.
                match.index += match[1].length;
            }
            return { found: true, startIndex: startIndex + match.index, length: match[2].length }
        }

        // no vowels sets found after startIndex!
        return { found: false, startIndex: -1, length: -1 };
    }
}
