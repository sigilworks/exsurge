import ChantMapping from 'chant/chant-mapping.model';
import * as Markings from 'chant/markings';
import * as Signs from 'chant/signs';
import * as Neumes from 'chant/neumes';
import { Steps } from '../core';
import { Lyric } from 'elements/drawing';
import {
    AccidentalTypes,
    BraceAttachments,
    BraceShapes,
    HorizontalEpisemaAlignments,
    LiquescentTypes,
    MarkingPositionHints,
    NoteShapeModifiers,
    NoteShapes
} from 'chant/chant.constants';
import {
    Atoms,
    RGX_BRACE_SPEC,
    RGX_NOTATIONS,
    RGX_SYLLABLES
} from 'gabc/gabc.constants';
import {
    ChantLineBreak,
    Clef,
    DoClef,
    FaClef,
    Note,
    TextOnly
} from 'chant/chant';
import { LyricTypes } from 'elements/elements.constants';


export default class Gabc {

    // takes gabc source code (without the header info) and returns an array
    // of `ChantMapping`s describing the chant. A chant score can then be created
    // fron the chant mappings and later updated via updateMappings() if need
    // be...
    static createMappingsFromSource(ctxt, gabcSource) {

        var words = this.splitWords(gabcSource);

        // set the default clef
        ctxt.activeClef = Clef.default();

        var mappings = this.createMappingsFromWords(ctxt, words, (clef) => ctxt.activeClef = clef);

        // always set the last notation to have a trailingSpace of 0. This makes layout for the last chant line simpler
        if (mappings.length > 0 && mappings[mappings.length - 1].notations.length > 0)
            mappings[mappings.length - 1].notations[mappings[mappings.length - 1].notations.length - 1].trailingSpace = 0;

        return mappings;
    }


    // A simple general purpose diff algorithm adapted here for comparing
    // an array of existing mappings with an updated list of gabc words.
    // note before is an array of mappings, and after is an array of strings
    // (gabc words).
    //
    // This is definitely not the most effecient diff algorithm, but for our
    // limited needs and source size it seems to work just fine...
    //
    // code is adapted from: https://github.com/paulgb/simplediff
    //
    // Returns:
    //   A list of pairs, with the first part of the pair being one of three
    //   strings ('-', '+', '=') and the second part being a list of values from
    //   the original before and/or after lists. The first part of the pair
    //   corresponds to whether the list of values is a deletion, insertion, or
    //   unchanged, respectively.
    static diffDescriptorsAndNewWords(before, after) {

        // Create a map from before values to their indices
        var oldIndexMap = {}, i;
        for (i = 0; i < before.length; i++) {
            oldIndexMap[before[i].source] = oldIndexMap[before[i].source] || [];
            oldIndexMap[before[i].source].push(i);
        }

        var overlap = [], startOld, startNew, subLength, inew;

        startOld = startNew = subLength = 0;

        for (inew = 0; inew < after.length; inew++) {
            var _overlap = [];
            oldIndexMap[after[inew]] = oldIndexMap[after[inew]] || [];
            for (i = 0; i < oldIndexMap[after[inew]].length; i++) {
                var iold = oldIndexMap[after[inew]][i];
                // now we are considering all values of val such that
                // `before[iold] == after[inew]`
                _overlap[iold] = ((iold && overlap[iold - 1]) || 0) + 1;
                if (_overlap[iold] > subLength) {
                    // this is the largest substring seen so far, so store its indices
                    subLength = _overlap[iold];
                    startOld = iold - subLength + 1;
                    startNew = inew - subLength + 1;
                }
            }
            overlap = _overlap;
        }

        if (subLength === 0) {
            // If no common substring is found, we return an insert and delete...
            var result = [];

            if (before.length)
                result.push(['-', before]);

            if (after.length)
                result.push(['+', after]);

            return result;
        }

        // ...otherwise, the common substring is unchanged and we recursively
        // diff the text before and after that substring
        return [].concat(
            this.diffDescriptorsAndNewWords(before.slice(0, startOld), after.slice(0, startNew)),
            [['=', after.slice(startNew, startNew + subLength)]],
            this.diffDescriptorsAndNewWords(before.slice(startOld + subLength), after.slice(startNew + subLength))
        );
    }

    // this function essentially performs and applies a rudimentary diff between a
    // previously parsed set of mappings and between a new gabc source text.
    // the mappings array passed in is changed in place to be updated from the
    // new source
    static updateMappingsFromSource(ctxt, mappings, newGabcSource) {

        // always remove the last old mapping since it's spacing/trailingSpace is handled specially
        mappings.pop();

        var newWords = this.splitWords(newGabcSource);

        var results = this.diffDescriptorsAndNewWords(mappings, newWords);

        var index = 0, j, k;

        ctxt.activeClef = Clef.default();

        // apply the results to the mappings, marking notations that need to be processed
        for (var i = 0; i < results.length; i++) {

            var resultCode = results[i][0];
            var resultValues = results[i][1];

            if (resultCode === '=') {
                // skip over ones that haven't changed, but updating the clef as we go
                for (j = 0; j < resultValues.length; j++, index++) {
                    for (k = 0; k < mappings[index].notations.length; k++) {
                        // notify the notation that its dependencies are no longer valid
                        mappings[index].notations[k].resetDependencies();

                        if (mappings[index].notations[k].isClef)
                            ctxt.activeClef = mappings[index].notations[k];
                    }
                }

            } else if (resultCode === '-') {
                // delete elements that no longer exist, but first notify all
                // elements of the change
                mappings.splice(index, resultValues.length);

            } else if (resultCode === '+') {
                // insert new ones
                for (j = 0; j < resultValues.length; j++) {
                    var mapping = this.createMappingFromWord(ctxt, resultValues[j]);

                    for (k = 0; k < mapping.notations.length; k++)
                        if (mapping.notations[k].isClef)
                            ctxt.activeClef = mapping.notations[k];

                    mappings.splice(index++, 0, mapping);
                }
            }
        }

        // always set the last notation to have a trailingSpace of 0. This makes layout for the last chant line simpler
        if (mappings.length > 0 && mappings[mappings.length - 1].notations.length > 0)
            mappings[mappings.length - 1].notations[mappings[mappings.length - 1].notations.length - 1].trailingSpace = 0;
    }

    // takes an array of gabc words (like that returned by splitWords below)
    // and returns an array of ChantMapping objects, one for each word.
    static createMappingsFromWords(ctxt, words) {
        var mappings = [];

        for (var i = 0; i < words.length; i++) {
            var word = words[i].trim();

            if (word === '')
                continue;

            var mapping = this.createMappingFromWord(ctxt, word);

            if (mapping)
                mappings.push(mapping);
        }

        return mappings;
    }

    // takes a gabc word (like those returned by splitWords below) and returns
    // a `ChantMapping` object that contains the gabc word source text as well
    // as the generated notations.
    static createMappingFromWord(ctxt, word) {

        var matches = [];
        var notations = [];
        var currSyllable = 0;

        while ((match = RGX_SYLLABLES.exec(word)))
            matches.push(match);

        for (var j = 0; j < matches.length; j++) {
            var match = matches[j];

            var lyricText = match[1].trim();
            var notationData = match[2];

            var items = this.parseNotations(ctxt, notationData);

            if (items.length === 0)
                continue;

            notations = notations.concat(items);

            if (lyricText === '')
                continue;

            // add the lyrics to the first notation that makes sense...
            var notationWithLyrics = null;
            for (var i = 0; i < items.length; i++) {
                var cne = items[i];

                if (cne.isAccidental || cne.constructor === Signs.Custos)
                    continue;

                notationWithLyrics = cne;
                break;
            }

            if (notationWithLyrics === null)
                return notations;

            var proposedLyricType;

            // if it's not a neume or a TextOnly notation, then make the lyrics a directive
            if (!cne.isNeume && cne.constructor !== TextOnly)
                proposedLyricType = LyricTypes.DIRECTIVE;
            // otherwise trye to guess the lyricType for the first lyric anyway
            else if (currSyllable === 0 && j === (matches.length - 1))
                proposedLyricType = LyricTypes.SINGLE_SYLLABLE;
            else if (currSyllable === 0 && j < (matches.length - 1))
                proposedLyricType = LyricTypes.BEGINNING_SYLLABLE;
            else if (j === matches.length - 1)
                proposedLyricType = LyricTypes.ENDING_SYLLABLE;
            else
                proposedLyricType = LyricTypes.MIDDLE_SYLLABLE;

            currSyllable++;

            // also, new words reset the accidentals, per the Solesmes style (see LU xviij)
            if (proposedLyricType === LyricTypes.BEGINNING_SYLLABLE ||
                proposedLyricType === LyricTypes.SINGLE_SYLLABLE)
                ctxt.activeClef.resetAccidentals();

            var lyrics = this.createSyllableLyrics(ctxt, lyricText, proposedLyricType);

            if (lyrics === null || lyrics.length === 0)
                continue;

            notationWithLyrics.lyrics = lyrics;
        }

        return new ChantMapping(word, notations);
    }

    // returns an array of lyrics (an array because each syllable can have multiple lyrics)
    static createSyllableLyrics(ctxt, text, proposedLyricType) {

        var lyrics = [];

        // an extension to gabc: multiple lyrics per syllable can be separated by a |
        var lyricTexts = text.split('|');

        for (var i = 0; i < lyricTexts.length; i++) {

            var lyricText = lyricTexts[i];

            // gabc allows lyrics to indicate the centering part of the text by
            // using braces to indicate how to center the lyric. So a lyric can
            // look like "f{i}re" or "{fenced}" to center on the i or on the entire
            // word, respectively. Here we determine if the lyric should be spaced
            // manually with this method of using braces.
            var centerStartIndex = lyricText.indexOf('{');
            var centerLength = 0;

            if (centerStartIndex >= 0) {
                var indexClosingBracket = lyricText.indexOf('}');

                if (indexClosingBracket >= 0 && indexClosingBracket > centerStartIndex) {
                    centerLength = indexClosingBracket - centerStartIndex - 1;

                    // strip out the brackets...is this better than string.replace?
                    lyricText = lyricText.substring(0, centerStartIndex) +
                        lyricText.substring(centerStartIndex + 1, indexClosingBracket) +
                        lyricText.substring(indexClosingBracket + 1, lyricText.length);
                } else
                    centerStartIndex = -1; // if there's no closing bracket, don't enable centering
            }

            var lyric = this.makeLyric(ctxt, lyricText, proposedLyricType);

            // if we have manual lyric centering, then set it now
            if (centerStartIndex >= 0) {
                lyric.centerStartIndex = centerStartIndex;
                lyric.centerLength = centerLength;
            }

            lyrics.push(lyric);
        }

        return lyrics;
    }

    static makeLyric(ctxt, text, lyricType) {

        if (text.length > 1 && text[text.length - 1] === '-') {
            if (lyricType === LyricTypes.ENDING_SYLLABLE)
                lyricType = LyricTypes.MIDDLE_SYLLABLE;
            else if (lyricType === LyricTypes.SINGLE_SYLLABLE)
                lyricType = LyricTypes.BEGINNING_SYLLABLE;

            text = text.substring(0, text.length - 1);
        }

        var elides = false;
        if (text.length > 1 && text[text.length - 1] === '_') {
            // must be an elision
            elides = true;
            text = text.substring(0, text.length - 1);
        }

        if (text === "*" || text === "†")
            lyricType = LyricTypes.DIRECTIVE;

        var lyric = new Lyric(ctxt, text, lyricType);
        lyric.elidesToNext = elides;

        return lyric;
    }

    // takes a string of gabc notations and creates exsurge objects out of them.
    // returns an array of notations.
    static parseNotations(ctxt, data) {

        // if there is no data, then this must be a text only object
        if (!data)
            return [new TextOnly()];

        var notations = [];
        var notes = [];
        var trailingSpace = -1;

        var addNotation = (notation) => {

            // first, if we have any notes left over, we create a neume out of them
            if (notes.length > 0) {

                // create neume(s)
                var neumes = this.createNeumesFromNotes(ctxt, notes, trailingSpace);
                for (var i = 0; i < neumes.length; i++)
                    notations.push(neumes[i]);

                // reset the trailing space
                trailingSpace = -1;

                notes = [];
            }

            // then, if we're passed a notation, let's add it
            // also, perform chant logic here
            if (notation !== null) {

                if (notation.isClef) {
                    ctxt.activeClef = notation;
                } else if (notation.isAccidental)
                    ctxt.activeClef.activeAccidental = notation;
                else if (notation.resetsAccidentals)
                    ctxt.activeClef.resetAccidentals();

                notations.push(notation);
            }
        };

        var atoms = data.match(RGX_NOTATIONS);

        if (atoms === null)
            return notations;

        for (var i = 0; i < atoms.length; i++) {

            var atom = atoms[i];

            // handle the clefs and dividers here
            switch (atom) {
                case Atoms.COMMA:
                    addNotation(new Signs.QuarterBar());
                    break;
                case Atoms.TICK:
                    addNotation(new Signs.Virgula());
                    break;
                case Atoms.SEMICOLON:
                    addNotation(new Signs.HalfBar());
                    break;
                case Atoms.COLON:
                    addNotation(new Signs.FullBar());
                    break;
                case Atoms.DOUBLE_COLON:
                    addNotation(new Signs.DoubleBar());
                    break;
                    // other gregorio dividers are not supported yet

                case Atoms.C1:
                    addNotation(ctxt.activeClef = new DoClef(-3, 2));
                    break;

                case Atoms.C2:
                    addNotation(ctxt.activeClef = new DoClef(-1, 2));
                    break;

                case Atoms.C3:
                    addNotation(ctxt.activeClef = new DoClef(1, 2));
                    break;

                case Atoms.C4:
                    addNotation(ctxt.activeClef = new DoClef(3, 2));
                    break;

                case Atoms.F3:
                    addNotation(ctxt.activeClef = new FaClef(1, 2));
                    break;

                case Atoms.F4:
                    addNotation(ctxt.activeClef = new FaClef(3, 2));
                    break;

                case Atoms.CB3:
                    addNotation(ctxt.activeClef = new DoClef(1, 2, new Signs.Accidental(0, AccidentalTypes.FLAT)));
                    break;

                case Atoms.CB4:
                    addNotation(ctxt.activeClef = new DoClef(3, 2, new Signs.Accidental(2, AccidentalTypes.FLAT)));
                    break;

                case Atoms.Z_LOWER:
                    addNotation(new ChantLineBreak(true));
                    break;
                case Atoms.Z_UPPER:
                    addNotation(new ChantLineBreak(false));
                    break;
                case Atoms.Z0:
                    addNotation(new Signs.Custos(true));
                    break;

                // spacing indicators
                case Atoms.BANG:
                    trailingSpace = 0;
                    addNotation(null);
                    break;
                case Atoms.SLASH:
                    trailingSpace = ctxt.intraNeumeSpacing;
                    addNotation(null);
                    break;
                case Atoms.DOUBLE_SLASH:
                    trailingSpace = ctxt.intraNeumeSpacing * 2;
                    addNotation(null);
                    break;
                case Atoms.SPACE:
                    // FIXME: is this correct? logically what is the difference in gabc
                    // between putting a space between notes vs putting '//' between notes?
                    trailingSpace = ctxt.intraNeumeSpacing * 2;
                    addNotation(null);
                    break;


                default:
                    // might be a custos, might be an accidental, or might be a note
                    if (atom.length > 1 && atom[1] === '+') {
                        // custos
                        var custos = new Signs.Custos();

                        custos.staffPosition = this.gabcHeightToExsurgeHeight(data[0]);

                        addNotation(custos);

                    } else if (atom.length > 1 && (atom[1] === 'x' || atom[1] === 'y' || atom[1] === '#')) {

                        var accidentalType;

                        switch (atom[1]) {
                            case Atoms.Y:
                                accidentalType = AccidentalTypes.NATURAL;
                                break;
                            case Atoms.HASH:
                                accidentalType = AccidentalTypes.SHARP;
                                break;
                            default:
                                accidentalType = AccidentalTypes.FLAT;
                                break;
                        }

                        var noteArray = [];
                        this.createNoteFromData(ctxt, ctxt.activeClef, atom, noteArray);
                        var accidental = new Signs.Accidental(noteArray[0].staffPosition, accidentalType);
                        accidental.trailingSpace = ctxt.intraNeumeSpacing * 2;

                        ctxt.activeClef.activeAccidental = accidental;

                        addNotation(accidental);
                    } else {

                        // looks like it's a note
                        this.createNoteFromData(ctxt, ctxt.activeClef, atom, notes);
                    }
                    break;
            }
        }

        // finish up any remaining notes we have left
        addNotation(null);

        return notations;
    }

    static createNeumesFromNotes(ctxt, notes, finalTrailingSpace) {

        var neumes = [];
        var firstNoteIndex = 0;
        var currNoteIndex = 0;

        // here we use a simple finite state machine to create the neumes from the notes
        // createNeume is helper function which returns the next state after a neume is created
        // (unknownState). Each state object has a neume() function and a handle() function.
        // neume() allows us to create the neume of the state in the event that we run out
        // of notes. handle() gives the state an opportunity to examine the currNote and
        // determine what to do...either transition to a different neume/state, or
        // continue building the neume of that state. handle() returns the next state

        var createNeume = function(neume, includeCurrNote, includePrevNote = true) {

            // add the notes to the neume
            var lastNoteIndex;
            if (includeCurrNote)
                lastNoteIndex = currNoteIndex;
            else if (includePrevNote)
                lastNoteIndex = currNoteIndex - 1;
            else
                lastNoteIndex = currNoteIndex - 2;

            if (lastNoteIndex < 0)
                return;

            while (firstNoteIndex <= lastNoteIndex)
                neume.addNote(notes[firstNoteIndex++]);

            neumes.push(neume);

            if (includeCurrNote === false) {
                currNoteIndex--;

                if (includePrevNote === false)
                    currNoteIndex--;

                neume.keepWithNext = true;
                neume.trailingSpace = ctxt.intraNeumeSpacing;
            }

            return unknownState;
        };

        var unknownState = {
            neume: function() {
                return new Neumes.Punctum();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShapes.VIRGA)
                    return virgaState;
                else if (currNote.shape === NoteShapes.STROPHA)
                    return apostrophaState;
                else if (currNote.shape === NoteShapes.ORISCUS)
                    return oriscusState;
                else if (currNote.shape === NoteShapes.INCLINATUM)
                    return punctaInclinataState;
                else if (currNote.shapeModifiers & NoteShapeModifiers.CAVUM)
                    return createNeume(new Neumes.Punctum(), true);
                return punctumState;
            }
        };

        var punctumState = {
            neume: function() {
                return new Neumes.Punctum();
            },
            handle: function(currNote, prevNote) {

                if (currNote.staffPosition > prevNote.staffPosition)
                    return podatusState;
                else if (currNote.staffPosition < prevNote.staffPosition) {
                    if (currNote.shape === NoteShapes.INCLINATUM)
                        return climacusState;
                    return clivisState;
                } return distrophaState;
            }
        };

        var punctaInclinataState = {
            neume: function() {
                return new Neumes.PunctaInclinata();
            },
            handle: function() {
                if (currNote.shape !== NoteShapes.INCLINATUM)
                    return createNeume(new Neumes.PunctaInclinata(), false);
                return punctaInclinataState;
            }
        };

        var oriscusState = {
            neume: function() {
                return new Neumes.Oriscus();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShapes.DEFAULT) {

                    if (currNote.staffPosition > prevNote.staffPosition) {
                        prevNote.shapeModifiers |= NoteShapeModifiers.ASCENDING;
                        return createNeume(new Neumes.PesQuassus(), true);
                    } else if (currNote.staffPosition < prevNote.staffPosition) {
                        prevNote.shapeModifiers |= NoteShapeModifiers.DESCENDING;
                        return createNeume(new Neumes.Clivis(), true);
                    }
                } else
                    // stand alone oriscus
                    return createNeume(new Neumes.Oriscus(), true);
            }
        };

        var podatusState = {
            neume: function() {
                return new Neumes.Podatus();
            },
            handle: function(currNote, prevNote) {

                if (currNote.staffPosition > prevNote.staffPosition) {

                    if (prevNote.shape === NoteShapes.ORISCUS)
                        return salicusState;
                    return scandicusState;

                } else if (currNote.staffPosition < prevNote.staffPosition) {
                    if (currNote.shape === NoteShapes.INCLINATUM)
                        return pesSubpunctisState;
                    return torculusState;
                } return createNeume(new Neumes.Podatus(), false);
            }
        };

        var clivisState = {
            neume: function() {
                return new Neumes.Clivis();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShapes.DEFAULT && currNote.staffPosition > prevNote.staffPosition)
                    return porrectusState;
                return createNeume(new Neumes.Clivis(), false);
            }
        };

        var climacusState = {
            neume: function() {
                return new Neumes.Climacus();
            },
            handle: function(currNote, prevNote) {
                if (currNote.shape !== NoteShapes.INCLINATUM)
                    return createNeume(new Neumes.Climacus(), false);
                return state;
            }
        };

        var porrectusState = {
            neume: function() {
                return new Neumes.Porrectus();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShapes.DEFAULT && currNote.staffPosition < prevNote.staffPosition)
                    return createNeume(new Neumes.PorrectusFlexus(), true);
                return createNeume(new Neumes.Porrectus(), false);
            }
        };

        var pesSubpunctisState = {
            neume: function() {
                return new Neumes.PesSubpunctis();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape !== NoteShapes.INCLINATUM)
                    return createNeume(new Neumes.PesSubpunctis(), false);
                return state;
            }
        };

        var salicusState = {
            neume: function() {
                return new Neumes.Salicus();
            },
            handle: function(currNote, prevNote) {

                if (currNote.staffPosition < prevNote.staffPosition)
                    return salicusFlexusState;
                return createNeume(new Neumes.Salicus(), false);
            }
        };

        var salicusFlexusState = {
            neume: function() {
                return new Neumes.SalicusFlexus();
            },
            handle: function(currNote, prevNote) {
                return createNeume(new Neumes.SalicusFlexus(), false);
            }
        };

        var scandicusState = {
            neume: function() {
                return new Neumes.Scandicus();
            },
            handle: function(currNote, prevNote) {

                if (prevNote.shape === NoteShapes.VIRGA && currNote.shape === NoteShapes.INCLINATUM &&
                    currNote.staffPosition < prevNote.staffPosition) {
                    // if we get here, then it seems we have a podatus, now being followed by a climacus
                    // rather than a scandicus. react accordingly
                    return createNeume(new Neumes.Podatus(), false, false);
                } else if (currNote.shape === NoteShapes.DEFAULT && currNote.staffPosition < prevNote.staffPosition)
                    return scandicusFlexusState;
                return createNeume(new Neumes.Scandicus(), false);
            }
        };

        var scandicusFlexusState = {
            neume: function() {
                return new Neumes.ScandicusFlexus();
            },
            handle: function(currNote, prevNote) {
                return createNeume(new Neumes.ScandicusFlexus(), false);
            }
        };

        var virgaState = {
            neume: function() {
                return new Neumes.Virga();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShapes.INCLINATUM && currNote.staffPosition < prevNote.staffPosition)
                    return climacusState;
                else if (currNote.shape === NoteShapes.VIRGA && currNote.staffPosition === prevNote.staffPosition)
                    return bivirgaState;
                return createNeume(new Neumes.Virga(), false);
            }
        };

        var bivirgaState = {
            neume: function() {
                return new Neumes.Bivirga();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShapes.VIRGA && currNote.staffPosition === prevNote.staffPosition)
                    return createNeume(new Neumes.Trivirga(), true);
                return createNeume(new Neumes.Bivirga(), false);
            }
        };

        var apostrophaState = {
            neume: function() {
                return new Neumes.Apostropha();
            },
            handle: function(currNote, prevNote) {
                if (currNote.staffPosition === prevNote.staffPosition)
                    return distrophaState;
                return createNeume(new Neumes.Apostropha(), false);
            }
        };

        var distrophaState = {
            neume: function() {
                return new Neumes.Distropha();
            },
            handle: function(currNote, prevNote) {
                if (currNote.staffPosition === prevNote.staffPosition)
                    return tristrophaState;
                return createNeume(new Neumes.Apostropha(), false, false);
            }
        };

        var tristrophaState = {
            neume: function() {
                return new Neumes.Tristropha();
            },
            handle: function(currNote, prevNote) {
                // we only create a tristropha when the note run ends after three
                // and the neume() function of this state is called. Otherwise
                // we always interpret the third note to belong to the next sequence
                // of notes.
                //
                // fixme: gabc allows any number of punctum/stropha in succession...
                // is this a valid neume type? Or is it just multiple *stropha neumes
                // in succession? Should we simplify the apostropha/distropha/
                // tristropha classes to a generic stropha neume that can have 1 or
                // more successive notes?
                return createNeume(new Neumes.Distropha(), false, false);
            }
        };

        var torculusState = {
            neume: function() {
                return new Neumes.Torculus();
            },
            handle: function(currNote, prevNote) {
                if (currNote.shape === NoteShapes.DEFAULT && currNote.staffPosition > prevNote.staffPosition)
                    return torculusResupinusState;
                return createNeume(new Neumes.Torculus(), false);
            }
        };

        var torculusResupinusState = {
            neume: function() {
                return new Neumes.TorculusResupinus();
            },
            handle: function(currNote, prevNote) {
                if (currNote.shape === NoteShapes.DEFAULT && currNote.staffPosition < prevNote.staffPosition)
                    return createNeume(new Neumes.TorculusResupinusFlexus(), true);
                return createNeume(new Neumes.TorculusResupinus(), false);
            }
        };

        var state = unknownState;

        while (currNoteIndex < notes.length) {

            var prevNote = currNoteIndex > 0 ? notes[currNoteIndex - 1] : null;
            var currNote = notes[currNoteIndex];

            state = state.handle(currNote, prevNote);

            // if we are on the last note, then try to create a neume if we need to.
            if (currNoteIndex === notes.length - 1 && state !== unknownState)
                createNeume(state.neume(), true);

            currNoteIndex++;
        }

        if (neumes.length > 0) {
            if (finalTrailingSpace >= 0) {
                neumes[neumes.length - 1].trailingSpace = finalTrailingSpace;

                if (finalTrailingSpace > ctxt.intraNeumeSpacing)
                    neumes[neumes.length - 1].keepWithNext = false;
                else
                    neumes[neumes.length - 1].keepWithNext = true;
            }
        }

        return neumes;
    }

    // appends any notes created to the notes array argument
    static createNoteFromData(ctxt, clef, data, notes) {

        var note = new Note();

        if (data.length < 1)
            throw 'Invalid note data: ' + data;

        if (data[0] === '-') { // liquescent initio debilis
            note.liquescent = LiquescentTypes.INITIO_DEBILIS;
            data = data.substring(1);
        }

        if (data.length < 1)
            throw 'Invalid note data: ' + data;

        // the next char is always the pitch
        var pitch = this.gabcHeightToExsurgePitch(clef, data[0]);

        if (data[0] === data[0].toUpperCase())
            note.shape = NoteShapes.INCLINATUM;

        note.staffPosition = this.gabcHeightToExsurgeHeight(data[0]);
        note.pitch = pitch;

        var mark;
        var j;

        var episemaNoteIndex = notes.length;
        var episemaNote = note;

        // process the modifiers
        for (var i = 1; i < data.length; i++) {

            var c = data[i];
            var lookahead = '\0';

            var haveLookahead = i + 1 < data.length;
            if (haveLookahead)
                lookahead = data[i + 1];

            switch (c) {

                // rhythmic markings
                case '.':

                    mark = null;

                    // gabc supports putting up to two morae on each note, by repeating the
                    // period. here, we check to see if we've already created a mora for the
                    // note, and if so, we simply force the second one to have an ABOVE
                    // position hint. if a user decides to try to put position indicators
                    // on the double morae (such as 1 or 2), then really the behavior is
                    // not defined by gabc, so it's on the user to figure it out.
                    if (note.morae.length > 0) {
                        // if we already have one mora, then create another but force a
                        // an alternative positionHint
                        haveLookahead = true;
                        if (Math.abs(note.staffPosition) % 2 === 0)
                            lookahead = '1';
                        else
                            lookahead = '0';
                    }

                    mark = new Markings.Mora(ctxt, note);
                    if (haveLookahead && lookahead === '1')
                        mark.positionHint = MarkingPositionHints.ABOVE;
                    else if (haveLookahead && lookahead === '0')
                        mark.positionHint = MarkingPositionHints.BELOW;

                    note.morae.push(mark);
                    break;

                case '_':

                    var episemaHadModifier = false;

                    mark = new Markings.HorizontalEpisema(episemaNote);
                    while (haveLookahead) {

                        if (lookahead === '0')
                            mark.positionHint = MarkingPositionHints.BELOW;
                        else if (lookahead === '1')
                            mark.positionHint = MarkingPositionHints.ABOVE;
                        else if (lookahead === '2')
                            mark.terminating = true; // episema terminates
                        else if (lookahead === '3')
                            mark.alignment = HorizontalEpisemaAlignments.LEFT;
                        else if (lookahead === '4')
                            mark.alignment = HorizontalEpisemaAlignments.CENTER;
                        else if (lookahead === '5')
                            mark.alignment = HorizontalEpisemaAlignments.RIGHT;
                        else
                            break;

                        // the gabc definition for epismata is so convoluted...
                        // - double underscores create epismata over multiple notes.
                        // - unless the _ has a 0, 1, 3, 4, or 5 modifier, which means
                        //   another underscore puts a second epismata on the same note
                        // - (when there's a 2 lookahead, then this is treated as an
                        //   unmodified underscore, so another underscore would be
                        //   added to previous notes
                        if (mark.alignment !== HorizontalEpisemaAlignments.DEFAULT &&
                            mark.positionHint !== MarkingPositionHints.BELOW)
                            episemaHadModifier = true;

                        i++;
                        haveLookahead = i + 1 < data.length;

                        if (haveLookahead)
                            lookahead = data[i + 1];
                    }

                    // since gabc allows consecutive underscores which is a shortcut to
                    // apply the epismata to previous notes, we keep track of that here
                    // in order to add the new episema to the correct note.

                    if (episemaNote)
                        episemaNote.epismata.push(mark);

                    if (episemaNote === note && episemaHadModifier)
                        episemaNote = note;
                    else if (episemaNoteIndex >= 0 && notes.length > 0)
                        episemaNote = notes[--episemaNoteIndex];

                    break;

                case '\'':
                    mark = new Markings.Ictus(ctxt, note);
                    if (haveLookahead && lookahead === '1')
                        mark.positionHint = MarkingPositionHints.ABOVE;
                    else if (haveLookahead && lookahead === '0')
                        mark.positionHint = MarkingPositionHints.BELOW;

                    note.ictus = mark;
                    break;

                //note shapes
                case 'r':
                    if (haveLookahead && lookahead === '1') {
                        note.acuteAccent = new Markings.AcuteAccent(ctxt, note);
                        i++;
                    } else
                        note.shapeModifiers |= NoteShapeModifiers.CAVUM;
                    break;

                case 's':

                    if (note.shape === NoteShapes.STROPHA) {
                        // if we're already a stropha, that means this is gabc's
                        // quick stropha feature (e.g., gsss). create a new note
                        notes.push(note);
                        note = new Note();
                        episemaNoteIndex++; // since a new note was added, increase the index here
                    }

                    note.shape = NoteShapes.STROPHA;
                    break;

                case 'v':

                    if (note.shape === NoteShapes.VIRGA) {
                        // if we're already a stropha, that means this is gabc's
                        // quick virga feature (e.g., gvvv). create a new note
                        notes.push(note);
                        note = new Note();
                        episemaNoteIndex++; // since a new note was added, increase the index here
                    }

                    note.shape = NoteShapes.VIRGA;
                    break;

                case 'w':
                    note.shape = NoteShapes.QUILISMA;
                    break;

                case 'o':
                    note.shape = NoteShapes.ORISCUS;
                    if (haveLookahead && lookahead === '<') {
                        note.shapeModifiers |= NoteShapeModifiers.ASCENDING;
                        i++;
                    } else if (haveLookahead && lookahead === '>') {
                        note.shapeModifiers |= NoteShapeModifiers.DESCENDING;
                        i++;
                    }
                    break;

                case 'O':
                    note.shape = NoteShapes.ORISCUS;
                    if (haveLookahead && lookahead === '<') {
                        note.shapeModifiers |= NoteShapeModifiers.ASCENDING | NoteShapeModifiers.STEMMED;
                        i++;
                    } else if (haveLookahead && lookahead === '>') {
                        note.shapeModifiers |= NoteShapeModifiers.DESCENDING | NoteShapeModifiers.STEMMED;
                        i++;
                    } else
                        note.shapeModifiers |= NoteShapeModifiers.STEMMED;
                    break;

                // liquescents
                case '~':
                    if (note.shape === NoteShapes.INCLINATUM)
                        note.liquescent |= LiquescentTypes.SMALL;
                    else if (note.shape === NoteShapes.ORISCUS)
                        note.liquescent |= LiquescentTypes.LARGE;
                    else
                        note.liquescent |= LiquescentTypes.SMALL;
                    break;
                case '<':
                    note.liquescent |= LiquescentTypes.ASCENDING;
                    break;
                case '>':
                    note.liquescent |= LiquescentTypes.DESCENDING;
                    break;

                // accidentals
                case 'x':
                    if (note.pitch.step === Steps.Mi)
                        note.pitch.step = Steps.Me;
                    else if (note.pitch.step === Steps.Ti)
                        note.pitch.step = Steps.Te;
                    break;
                case 'y':
                    if (note.pitch.step === Steps.Te)
                        note.pitch.step = Steps.Ti;
                    else if (note.pitch.step === Steps.Me)
                        note.pitch.step = Steps.Mi;
                    else if (note.pitch.step === Steps.Du)
                        note.pitch.step = Steps.Do;
                    else if (note.pitch.step === Steps.Fu)
                        note.pitch.step = Steps.Fa;
                    break;
                case '#':
                    if (note.pitch.step === Steps.Do)
                        note.pitch.step = Steps.Du;
                    else if (note.pitch.step === Steps.Fa)
                        note.pitch.step = Steps.Fu;
                    break;

                // gabc special item groups
                case '[':
                    // read in the whole group and parse it
                    var startIndex = ++i;
                    while (i < data.length && data[i] !== ']')
                        i++;

                    this.processInstructionForNote(ctxt, note, data.substring(startIndex, i));
                    break;
            }
        }

        notes.push(note);
    }

    // an instruction in this context is referring to a special gabc coding found after
    // notes between ['s and ]'s. choral signs and braces fall into this
    // category.
    //
    // currently only brace instructions are supported here!
    static processInstructionForNote(ctxt, note, instruction) {

        var results = instruction.match(RGX_BRACE_SPEC);

        if (results === null)
            return;

        // see the comments at the definition of RGX_BRACE_SPEC for the
        // capturing groups
        var above = results[1] === 'o';
        var shape = BraceShapes.CURLY_BRACE; // default

        switch (results[2]) {
            case 'b':
                shape = BraceShapes.ROUND_BRACE;
                break;
            case 'cb':
                shape = BraceShapes.CURLY_BRACE;
                break;
            case 'cba':
                shape = BraceShapes.ACCENTED_CURLY_BRACE;
                break;
        }

        var attachmentPoint = results[3] === '0' ? BraceAttachments.LEFT : BraceAttachments.RIGHT;
        var brace = null;
        var type;

        if (results[4] === '{')
            note.braceStart = new Markings.BracePoint(note, above, shape, attachmentPoint);
        else
            note.braceEnd = new Markings.BracePoint(note, above, shape, attachmentPoint);
    }

    // takes raw gabc text source and parses it into words. For example, passing
    // in a string of "me(f.) (,) ma(fff)num(d!ewf) tu(fgF'E)am,(f.)" would return
    // an array of four strings: ["me(f.)", "(,)", "ma(fff)num(d!ewf)", "tu(fgF'E)am,(f.)"]
    static splitWords(gabcNotations) {
        // split the notations on whitespace boundaries, as long as the space
        // immediately follows a set of parentheses. Prior to doing that, we replace
        // all whitespace with spaces, which prevents tabs and newlines from ending
        // up in the notation data.
        gabcNotations = gabcNotations.trim().replace(/\s/g, ' ').replace(/\) (?=[^\)]*(?:\(|$))/g, ')\n');
        return gabcNotations.split(/\n/g);
    }

    static parseSource(gabcSource) {
        return this.parseWords(this.splitWords(gabcSource));
    }

    // gabcWords is an array of strings, e.g., the result of splitWords above
    static parseWords(gabcWords) {
        var words = [];

        for (var i = 0; i < gabcWords.length; i++)
            words.push(this.parseWord(gabcWords[i]));

        return words;
    }

    // returns an array of objects, each of which has the following properties
    //  - notations (string)
    //  - lyrics (array of strings)
    static parseWord(gabcWord) {

        var syllables = [];
        var matches = [];

        while ((match = RGX_SYLLABLES.exec(gabcWord)))
            matches.push(match);

        for (var j = 0; j < matches.length; j++) {
            var match = matches[j];

            var lyrics = match[1].trim().split('|');
            var notations = match[2];

            syllables.push({
                notations: notations,
                lyrics: lyrics
            });
        }

        return syllables;
    }

    // returns pitch
    static gabcHeightToExsurgeHeight(gabcHeight) {
        return gabcHeight.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) - 6;
    }

    // returns pitch
    static gabcHeightToExsurgePitch(clef, gabcHeight) {
        var exsurgeHeight = this.gabcHeightToExsurgeHeight(gabcHeight);

        var pitch = clef.staffPositionToPitch(exsurgeHeight);

        if (clef.activeAccidental !== null)
            clef.activeAccidental.applyToPitch(pitch);

        return pitch;
    }
}
