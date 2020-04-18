import _ from 'lodash';

/**
 * @class BaseLanguage
 * @abstract
 */
export default class BaseLanguage {
    constructor(name = '<unknown>') {
        this.name = name;
    }

    /**
     * @param {string} text The string to parsed into words.
     * @return {string[]} the resulting parsed words from syllabification
     */
    syllabify(text) {
        if (_.isEmpty(text)) {
            return [];
        }

        // divide the text into words separated by whitespace
        const words = text.split(/[\s]+/);
        return _.map(words, (word) => this.syllabifyWord(word));
    }
}
