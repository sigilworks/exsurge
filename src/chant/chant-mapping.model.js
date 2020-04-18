// a chant mapping is a lightweight format independent way of
// tracking how a chant language (e.g., gabc) has been mapped to `exsurge` notations.
export default class ChantMapping {
    // source can be any object type. in the case of gabc, source is a text
    // string that maps to a gabc word (e.g.: 'no(g)bis(fg)').
    // notations is an array of ChantNotationElements
    constructor(source, notations) {
        this.source = source;
        this.notations = notations;
    }
}
