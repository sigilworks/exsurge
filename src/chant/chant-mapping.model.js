// a chant mapping is a lightweight format independent way of
// tracking how a chant language (e.g., GABC) has been mapped to `exsurge` notations.
export default class ChantMapping {
    // source can be any object type. in the case of GABC, `source` is a text
    // string that maps to a GABC word (e.g.: "no(g)bis(fg)").
    // notations is an array of `ChantNotationElement`s
    constructor(source, notations, sourceIndex) {
        this.source = source;
        this.notations = notations;
        this.sourceIndex = sourceIndex;
    }
}
