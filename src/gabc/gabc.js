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
    RGX_SYLLABLES,
    RGX_ALT_TAG,
    RGX_BRACKETED_COMMAND,
    RGX_NOTATIONS_GROUP_INSIDE_BRACES,
    RGX_TRANSLATION
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
import { AboveLinesText, LiquescentType, LyricType, NoteShape, Step, TranslationText } from '../../src_from_bbloomf';


export default class Gabc {

    // Takes GABC source code (without the header info) and returns an array
    // of `ChantMapping`s describing the chant.
    //
    // A chant score can then be created from the chant mappings and later
    // updated via `updateMappings`, if need be...
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
    // This is definitely not the most efficient diff algorithm, but for our
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
        for (i = 0; i < before.length; i ++) {
            oldIndexMap[before[i].source] = oldIndexMap[before[i].source] || [];
            oldIndexMap[before[i].source].push(i);
        }

        var overlap = [], startOld, startNew, subLength, inew;

        startOld = startNew = subLength = 0;

        for (inew = 0; inew < after.length; inew++) {
            var _overlap                = [];
            oldIndexMap[after[inew]]    = oldIndexMap[after[inew]] || [];
            for (i = 0; i < oldIndexMap[after[inew]].length; i++) {
                var iold        = oldIndexMap[after[inew]][i];
                // now we are considering all values of val such that
                // `before[iold] == after[inew]`
                _overlap[iold]  = ((iold && overlap[iold-1]) || 0) + 1;
                if (_overlap[iold] > subLength) {
                    // this is the largest substring seen so far, so store its indices
                    subLength   = _overlap[iold];
                    startOld    = iold - subLength + 1;
                    startNew    = inew - subLength + 1;
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

        var index = 0, j, k, l, sourceIndex = 0, wordLength = 0, mapping;

        ctxt.activeClef = Clef.default();

        // apply the results to the mappings, marking notations that need to be processed
        for (var i = 0; i < results.length; i++) {

            var resultCode = results[i][0];
            var resultValues = results[i][1];
            var lastTranslationNeumes = [];

            if(index>0) sourceIndex = mappings[index-1].sourceIndex + mappings[index-1].source.length + 1;
            if (resultCode === '=') {
                var sourceIndexDiff = sourceIndex - mappings[index].sourceIndex;
                // skip over ones that haven't changed, but updating the clef and source index (and pitch in case clef or accidentals have changed) as we go
                for (j = 0; j < resultValues.length; j++, index++) {
                    mapping = mappings[index];
                    mapping.sourceIndex += sourceIndexDiff;
                    for (k = 0; k < mapping.notations.length; k++) {
                        var curNotation = mapping.notations[k];
                        // notify the notation that its dependencies are no longer valid
                        curNotation.resetDependencies();

                        if (curNotation.isClef)
                            ctxt.activeClef = mappings[index].notations[k];

                        if (curNotation.isAccidental) {
                            ctxt.activeClef.activeAccidental = curNotation;
                        }

                        // update source index, pitch, and automatic braces
                        if(curNotation.notes) {
                            for(l=0; l < curNotation.notes.length; ++l) {
                                let note = curNotation.notes[l];
                                note.sourceIndex += sourceIndexDiff;
                                note.pitch = ctxt.activeClef.staffPositionToPitch(note.staffPosition);
                                if(note.braceEnd && note.braceEnd.automatic) delete note.braceEnd;
                                if(this.needToEndBrace && !note.braceStart && !note.braceEnd) {
                                    note.braceEnd = new Markings.BracePoint(note, this.needToEndBrace.isAbove, this.needToEndBrace.shape, this.needToEndBrace.attachment === Markings.BraceAttachment.Left? Markings.BraceAttachment.Right : Markings.BraceAttachment.Left);
                                    note.braceEnd.automatic = true;
                                    delete this.needToEndBrace;
                                } else if(note.braceStart && note.braceStart.automatic) {
                                    this.needToEndBrace = note.braceStart;
                                }
                            }
                        }
                        if(curNotation.translationText) {
                            for(l=0; l < curNotation.translationText.length; ++l) {
                                var transText = curNotation.translationText[l];
                                delete transText.endNeume;
                                curNotation.translationText[l].sourceIndex += sourceIndexDiff;
                                if(transText.textAnchor === 'end' && lastTranslationNeumes[0]) {
                                    var lastTranslationText = lastTranslationNeumes[0].translationText[l];
                                    if(lastTranslationText) lastTranslationText.endNeume = curNotation;
                                }
                            }
                            lastTranslationNeumes[0] = curNotation;
                        }
                        if(sourceIndexDiff) {
                            if(typeof curNotation.sourceIndex === 'number') {
                                curNotation.sourceIndex += sourceIndexDiff;
                            }
                            for(l=0; l < curNotation.lyrics.length; ++l) {
                                curNotation.lyrics[l].sourceIndex += sourceIndexDiff;
                            }
                            if(curNotation.alText) {
                                for(l=0; l < curNotation.alText.length; ++l) {
                                    curNotation.alText[l].sourceIndex += sourceIndexDiff;
                                }
                            }
                        }
                    }
                }
            } else if (resultCode === '-') {
                // delete elements that no longer exist, but first notify all
                // elements of the change
                mappings.splice(index, resultValues.length);
            } else if (resultCode === '+') {
                // insert new ones
                for (j = 0; j < resultValues.length; j++) {
                    wordLength = resultValues[j].length + 1;
                    mapping = this.createMappingFromWord(ctxt, resultValues[j], sourceIndex, lastTranslationNeumes);

                    for (k = 0; k < mapping.notations.length; k++)
                        if (mapping.notations[k].isClef)
                            ctxt.activeClef = mapping.notations[k];

                    mappings.splice(index++, 0, mapping);
                    sourceIndex += wordLength;
                }
            }
        }

        // always set the last notation to have a trailingSpace of 0. This makes layout for the last chant line simpler
        if (mappings.length > 0 && mappings[mappings.length - 1].notations.length > 0)
            mappings[mappings.length - 1].notations[mappings[mappings.length - 1].notations.length - 1].trailingSpace = 0;
    }

    // takes an array of GABC words (like that returned by `splitWords` below)
    // and returns an array of `ChantMapping` objects, one for each word.
    static createMappingsFromWords(ctxt, words) {
        var mappings = [];
        var sourceIndex = 0,
            wordLength = 0,
            lastTranslationNeumes = [];

        for (var i = 0; i < words.length; i++) {
            sourceIndex += wordLength;
            wordLength = words[i].length + 1;
            var word = words[i].trim();

            if (word === '')
                continue;

            var mapping = this.createMappingFromWord(ctxt, word, sourceIndex, lastTranslationNeumes);

            if (mapping)
                mappings.push(mapping);
        }

        return mappings;
    }

    // takes a gabc word (like those returned by splitWords below) and returns
    // a ChantMapping object that contains the gabc word source text as well
    // as the generated notations.
    static createMappingFromWord(ctxt, word, sourceIndex, lastTranslationNeumes) {
        var matches = [];
        var notations = [];
        var currSyllable = 0;
        var makeAlText = function(text, sourceIndex) {
            return new AboveLinesText(ctxt, text, sourceIndex);
        };

        while ((match = RGX_SYLLABLES.exec(word)))
            matches.push(match);

        for (var j = 0; j < matches.length; j++) {
            var match = matches[j];

            var lyricText = match[1].replace(/^\s+/,'').replace(/~/g,' ');
            var alText = [];
            var translationText = [];
            var notationData = match[2];

            // new words reset the accidentals, per the Solesmes style (see LU xviij)
            // but we need to also make sure that there _is_ a word and that it has notes associated with it.
            if (currSyllable === 0 && /[a-z]/i.test(lyricText) && /[a-m]/i.test(notationData))
                ctxt.activeClef.resetAccidentals();

            var items = this.parseNotations(ctxt, notationData, sourceIndex + match.index + match[1].length + 1);

            if (items.length === 0)
                continue;

            items[0].firstOfSyllable = !!lyricText;
            notations.push(...items);

            var m = RGX_ALT_TAG.exec();
            while ((m = RGX_ALT_TAG.exec(lyricText))) {
                let index = m.index;
                lyricText = lyricText.slice(0,index) + lyricText.slice(index + m[0].length);
                alText.push(makeAlText(m[1], sourceIndex+index+5));
                RGX_ALT_TAG.exec();
            }

            m = RGX_TRANSLATION.exec();
            while ((m = RGX_TRANSLATION.exec(lyricText))) {
                let index = m.index;
                lyricText = lyricText.slice(0,index) + lyricText.slice(index + m[0].length);
                index += sourceIndex + 1
                if(m[1]) {
                    alText.push(new AboveLinesText(ctxt, m[2], index + m[1].length));
                } else {
                    translationText.push(new TranslationText(ctxt, m[2], index));
                }
                RGX_TRANSLATION.exec();
            }
            if (lyricText === '' && alText.length === 0)
                continue;

            // add the lyrics and/or alText to the first notation that makes sense...
            var notationWithLyrics = null;
            for (var i = 0; i < items.length; i++) {
                var cne = items[i];

                if (cne.isAccidental && i + 1 < items.length)
                    continue;

                notationWithLyrics = cne
                break;
            }

            if (notationWithLyrics === null)
                return new ChantMapping(word, notations, sourceIndex);

            if (alText.length)
                notationWithLyrics.alText = alText;

            if (translationText.length) {
                notationWithLyrics.translationText = translationText;
                for(i=0; i < translationText.length; ++i) {
                    var transText = translationText[i];
                    if(transText.textAnchor === 'end' && lastTranslationNeumes[0]) {
                        var lastTranslationText = lastTranslationNeumes[0].translationText[i];
                        if(lastTranslationText) lastTranslationText.endNeume = notationWithLyrics;
                    }
                }
                lastTranslationNeumes[0] = notationWithLyrics;
            }

            if (lyricText === '')
                continue;

            var proposedLyricType;

            // if it's not a neume or a TextOnly notation, then make the lyrics a directive
            if (!cne.isNeume && cne.constructor !== TextOnly)
                proposedLyricType = LyricType.Directive;
            // otherwise trye to guess the lyricType for the first lyric anyway
            else if (currSyllable === 0 && j === (matches.length - 1))
                proposedLyricType = LyricType.SingleSyllable;
            else if (currSyllable === 0 && j < (matches.length - 1))
                proposedLyricType = LyricType.BeginningSyllable;
            else if (j === matches.length - 1)
                proposedLyricType = LyricType.EndingSyllable;
            else
                proposedLyricType = LyricType.MiddleSyllable;

            currSyllable++;

            var lyrics = this.createSyllableLyrics(ctxt, lyricText, proposedLyricType, notationWithLyrics, items, sourceIndex + match.index);

            if (lyrics === null || lyrics.length === 0)
                continue;

            notationWithLyrics.lyrics = lyrics;
        }

        return new ChantMapping(word, notations, sourceIndex);
    }

    // returns an array of lyrics (an array because each syllable can have multiple lyrics)
    static createSyllableLyrics(ctxt, text, proposedLyricType, notation, notations, sourceIndex) {

        var lyrics = [];

        // an extension to gabc: multiple lyrics per syllable can be separated by a |
        var lyricTexts = text.split('|');

        for (var i = 0; i < lyricTexts.length; i++) {

            var lyricText = lyricTexts[i];

            if (i > 0 ) {
                if (lyricText.match(/\s$/)) {
                    lyricText = lyricText.replace(/s+$/,'');
                    proposedLyricType = LyricType.EndingSyllable;
                } else {
                    proposedLyricType = LyricType.MiddleSyllable;
                }
            }

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

            var lyric = this.makeLyric(ctxt, lyricText, proposedLyricType, notation, notations, sourceIndex);

            // if we have manual lyric centering, then set it now
            if (centerStartIndex >= 0) {
                lyric.centerStartIndex = centerStartIndex;
                lyric.centerLength = centerLength;
            }

            lyrics.push(lyric);
        }
        notation.lyrics = lyrics
        return lyrics;
    }

    static makeLyric(ctxt, text, lyricType, notation, notations, sourceIndex) {

        var elides = false;
        var forceConnector = false;
        if (text.length > 1) {
            if (text[text.length - 1] === '-') {
                forceConnector = true;
                if (lyricType === LyricType.EndingSyllable)
                    lyricType = LyricType.MiddleSyllable;
                else if (lyricType === LyricType.SingleSyllable)
                    lyricType = LyricType.BeginningSyllable;

                text = text.slice(0, -1);
            } else if (text[text.length - 1] === ' ') {
                if (lyricType === LyricType.MiddleSyllable)
                    lyricType = LyricType.EndingSyllable;
                else if (lyricType === LyricType.BeginningSyllable)
                    lyricType = LyricType.SingleSyllable;

                text = text.slice(0, -1)
            } else if (text[text.length - 1] === '_') {
                // must be an elision
                elides = true;
                text = text.slice(0, -1);
            }
        }

        if (text.match(/^(?:[*†]+|i+j|\d+)\.?$/))
            lyricType = LyricType.Directive;

        var lyric = new Lyric(ctxt, text, lyricType, notation, notations, sourceIndex);
        lyric.elidesToNext = elides;
        if (forceConnector) lyric.setForceConnector(true);

        return lyric;
    }

    // takes a string of gabc notations and creates exsurge objects out of them.
    // returns an array of notations.
    static parseNotations(ctxt, data, sourceIndex) {

        // if there is no data, then this must be a text only object
        if (!data)
            return [new TextOnly()];

        var baseSourceIndex = sourceIndex;
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

                notes = [];
            }

            // reset the trailing space
            trailingSpace = -1;

            // then, if we're passed a notation, let's add it
            // also, perform chant logic here
            if (notation !== null) {
                let prevNotation = notations[notations.length - 1];
                notation.sourceIndex = sourceIndex;
                if (notation.isClef) {
                    ctxt.activeClef = notation;
                    if (prevNotation && prevNotation.trailingSpace < 0 && prevNotation.isDivider) {
                        prevNotation.trailingSpace = ctxt.intraNeumeSpacing * ctxt.accidentalSpaceMultiplier;
                    }
                } else if (notation.isAccidental) {
                    ctxt.activeClef.activeAccidental = notation;
                } else if (notation.trailingSpace < 0 && notation instanceof Signs.Custos) {
                    notation.trailingSpace = ctxt.intraNeumeSpacing * ctxt.accidentalSpaceMultiplier;
                }
                else if (notation.resetsAccidentals)
                    ctxt.activeClef.resetAccidentals();

                notations.push(notation);
            }
        };

        var regex = new RegExp(RGX_NOTATIONS.source, 'g');
        var match;

        while ((match = regex.exec(data))) {
            sourceIndex = baseSourceIndex + match.index;
            var atom = match[0];

            // TODO: bring the `Atoms` enum back in here and update its members

            // handle the clefs and dividers here
            switch (atom) {
                case ",":
                    addNotation(new Signs.QuarterBar());
                    break;
                case "`":
                    addNotation(new Signs.Virgula());
                    break;
                case ";":
                    addNotation(new Signs.HalfBar());
                    break;
                case ";1":
                case ";2":
                case ";3":
                case ";4":
                case ";5":
                case ";6":
                case ",1":
                case ",2":
                case ",3":
                case ",4":
                case ",5":
                case ",6":
                    addNotation(new Signs.DominicanBar(parseInt(atom[1],10)));
                    break;
                case ":":
                    addNotation(new Signs.FullBar());
                    break;
                case "::":
                    addNotation(new Signs.DoubleBar());
                    break;
                // other gregorio dividers are not supported yet

                case "c1":
                    addNotation(ctxt.activeClef = new DoClef(-3, 2));
                    break;

                case "c2":
                    addNotation(ctxt.activeClef = new DoClef(-1, 2));
                    break;

                case "c3":
                    addNotation(ctxt.activeClef = new DoClef(1, 2));
                    break;

                case "c4":
                    addNotation(ctxt.activeClef = new DoClef(3, 2));
                    break;

                case "f1":
                    addNotation(ctxt.activeClef = new FaClef(-3, 2));
                    break;

                case "f2":
                    addNotation(ctxt.activeClef = new FaClef(-1, 2));
                    break;

                case "f3":
                    addNotation(ctxt.activeClef = new FaClef(1, 2));
                    break;

                case "f4":
                    addNotation(ctxt.activeClef = new FaClef(3, 2));
                    break;

                case "cb3":
                    addNotation(ctxt.activeClef = new DoClef(1, 2, new Signs.Accidental(0, Signs.AccidentalType.Flat)));
                    break;

                case "cb4":
                    addNotation(ctxt.activeClef = new DoClef(3, 2, new Signs.Accidental(2, Signs.AccidentalType.Flat)));
                    break;

                case "z":
                    addNotation(new ChantLineBreak(true));
                    break;
                case "Z":
                    addNotation(new ChantLineBreak(false));
                    break;
                case "z0":
                    addNotation(new Signs.Custos(true));
                    break;

                // spacing indicators
                case "!":
                    trailingSpace = 0;
                    addNotation(null);
                    break;
                case "/":
                    trailingSpace = ctxt.intraNeumeSpacing;
                    addNotation(null);
                    break;
                case "//":
                    trailingSpace = ctxt.intraNeumeSpacing * 2;
                    addNotation(null);
                    break;
                case ' ':
                    // fixme: is this correct? logically what is the difference in gabc
                    // between putting a space between notes vs putting '//' between notes?
                    trailingSpace = ctxt.intraNeumeSpacing * 2;
                    addNotation(null);
                    break;


                default:
                    // might be a custos, might be an accidental, or might be a note
                    if (atom.length > 1 && atom[1] === '+') {
                        // custos
                        var custos = new Signs.Custos();

                        custos.staffPosition = this.gabcHeightToExsurgeHeight(atom[0]);

                        addNotation(custos);

                    } else if (atom.length > 1 && /[xy#]/.test(atom[1])) {


                        var accidentalType;

                        switch (atom[1]) {
                            case 'y':
                                accidentalType = Signs.AccidentalType.Natural;
                                break;
                            case '#':
                                accidentalType = Signs.AccidentalType.Sharp;
                                break;
                            default:
                                accidentalType = Signs.AccidentalType.Flat;
                                break;
                        }

                        var noteArray = [];
                        this.createNoteFromData(ctxt, ctxt.activeClef, atom, noteArray, sourceIndex);
                        var accidental = new Signs.Accidental(noteArray[0].staffPosition, accidentalType);
                        accidental.pitch = this.gabcHeightToExsurgePitch(ctxt.activeClef, atom[0]);
                        accidental.sourceIndex = sourceIndex;
                        accidental.trailingSpace = ctxt.intraNeumeSpacing * ctxt.accidentalSpaceMultiplier;

                        ctxt.activeClef.activeAccidental = accidental;

                        addNotation(accidental);
                    } else if (atom.length > 1 && atom[0]==='{') {
                        trailingSpace = 0;
                        addNotation(null);
                        let bracketedNotations = this.parseNotations(ctxt, match[RGX_NOTATIONS_GROUP_INSIDE_BRACES], sourceIndex + 1);
                        // Set the width of these notations to 0
                        bracketedNotations.forEach(neume => {
                            neume.hasNoWidth = true;
                            neume.firstWithNoWidth = bracketedNotations[0];
                        });
                        notations.push(...bracketedNotations);
                    } else {

                        // looks like it's a note
                        this.createNoteFromData(ctxt, ctxt.activeClef, atom, notes, sourceIndex);
                    }
                    break;
            }
        }

        // finish up any remaining notes we have left
        addNotation(null);

        return notations;
    }

    // TODO: this is ripe to be broken up in several utilities
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

        var createNeume = function (neume, includeCurrNote, includePrevNote = true) {

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

            while (firstNoteIndex <= lastNoteIndex) {
                let note = notes[firstNoteIndex++];
                neume.addNote(note);
                if (note.alText) {
                    if (!neume.alText) neume.alText = [];
                    neume.alText.push(note.alText);
                }
            }

            neumes.push(neume);

            if (includeCurrNote === false) {
                currNoteIndex--;

                if (includePrevNote === false)
                    currNoteIndex--;

                neume.keepWithNext = true;
                if (notes[currNoteIndex+1].shape === NoteShape.Quilisma)
                    neume.trailingSpace = 0;
                else {
                    neume.trailingSpace = ctxt.intraNeumeSpacing;
                    neume.allowLineBreakBeforeNext = true;
                }
            }

            return unknownState;
        };

        var unknownState = {
            neume: function() {
                return new Neumes.Punctum();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShape.Virga)
                    return virgaState;
                else if (currNote.shape === NoteShape.Stropha)
                    return apostrophaState;
                else if (currNote.shape === NoteShape.Oriscus)
                    return oriscusState;
                else if (currNote.shape === NoteShape.Inclinatum)
                    return punctaInclinataState;
                else if (currNote.shapeModifiers & NoteShapeModifiers.Cavum)
                    return createNeume(new Neumes.Punctum(), true);
                else
                    return punctumState;
            }
        };

        var punctumState = {
            neume: function() {
                return new Neumes.Punctum();
            },
            handle: function(currNote, prevNote, notesRemaining) {

                if (currNote.shape) {
                    var neume = new Neumes.Punctum();
                    var state = createNeume(neume, false);
                    // if the current note is on a space within the staff AND the previous note is on the line below AND the previous note has a mora,
                    // then we went the trailing space at its default of intraNeumeSpacing to prevent the dot from running up into the current note.
                    // Otherwise, we want no trailing space.
                    if ((currNote.staffPosition > prevNote.staffPosition) && (currNote.staffPosition % 2 === 1 || prevNote.staffPosition !== currNote.staffPosition - 1 || !prevNote.morae || prevNote.morae.length === 0))
                        neume.trailingSpace = 0;
                    return state;
                }

                if (currNote.staffPosition > prevNote.staffPosition) {
                    if (currNote.ictus) currNote.ictus.positionHint = Markings.MarkingPositionHint.Above;
                    return podatusState;
                } else if (currNote.staffPosition < prevNote.staffPosition) {
                    if(prevNote.ictus) prevNote.ictus.positionHint = Markings.MarkingPositionHint.Above;
                    if (currNote.shape === NoteShape.Inclinatum)
                        return climacusState;
                    else {
                        return clivisState;
                    }
                } else if(prevNote.morae && prevNote.morae.length) {
                    return createNeume(new Neumes.Punctum(), false);
                } else {
                    return distrophaState;
                }
            }
        };

        var punctaInclinataState = {
            neume: function() {
                return new Neumes.PunctaInclinata();
            },
            handle: function() {
                if (currNote.shape !== NoteShape.Inclinatum)
                    return createNeume(new Neumes.PunctaInclinata(), false);
                else
                    return punctaInclinataState;
            }
        }

        var oriscusState = {
            neume: function() {
                return new Neumes.Oriscus();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShape.Default) {

                    if (currNote.staffPosition > prevNote.staffPosition) {
                        prevNote.shapeModifiers |= NoteShapeModifiers.Ascending;
                        return createNeume(new Neumes.PesQuassus(), true);
                    } else if (currNote.staffPosition < prevNote.staffPosition) {
                        prevNote.shapeModifiers |= NoteShapeModifiers.Descending;
                        return createNeume(new Neumes.Clivis(), true);
                    }
                } else {
                    // stand alone oriscus
                    var neume = new Neumes.Oriscus(),
                        state = createNeume(neume, false);
                    // if the current note is on a space within the staff AND the previous note is on the line below AND the previous note has a mora,
                    // then we went the trailing space at its default of intraNeumeSpacing to prevent the dot from running up into the current note.
                    // Otherwise, we want no trailing space.
                    if ((currNote.staffPosition > prevNote.staffPosition) && (currNote.staffPosition % 2 === 1 || prevNote.staffPosition !== currNote.staffPosition - 1 || !prevNote.morae || prevNote.morae.length === 0))
                        neume.trailingSpace = 0;
                    return state;
                }
            }
        };

        var podatusState = {
            neume: function() {
                return new Neumes.Podatus();
            },
            handle: function(currNote, prevNote) {

                if (currNote.staffPosition > prevNote.staffPosition) {
                    if (currNote.ictus) currNote.ictus.positionHint = Markings.MarkingPositionHint.Above;
                    if (prevNote.ictus) prevNote.ictus.positionHint = Markings.MarkingPositionHint.Below;

                    if (prevNote.shape === NoteShape.Oriscus)
                        return salicusState;
                    else
                        return scandicusState;

                } else if (currNote.staffPosition < prevNote.staffPosition) {
                    if (currNote.shape === NoteShape.Inclinatum)
                        return pesSubpunctisState;
                    else
                        return torculusState;
                } else
                    return createNeume(new Neumes.Podatus(), false);
            }
        };

        var clivisState = {
            neume: function() {
                return new Neumes.Clivis();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShape.Default && currNote.staffPosition > prevNote.staffPosition) {
                    if (currNote.ictus) currNote.ictus.positionHint = Markings.MarkingPositionHint.Above;
                    return porrectusState;
                } else
                    return createNeume(new Neumes.Clivis(), false);
            }
        };

        var climacusState = {
            neume: function() {
                return new Neumes.Climacus();
            },
            handle: function(currNote, prevNote) {
                if (currNote.shape !== NoteShape.Inclinatum)
                    return createNeume(new Neumes.Climacus(), false);
                else
                    return state;
            }
        };

        var porrectusState = {
            neume: function() {
                return new Neumes.Porrectus();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShape.Default && currNote.staffPosition < prevNote.staffPosition)
                    return createNeume(new Neumes.PorrectusFlexus(), true);
                else
                    return createNeume(new Neumes.Porrectus(), false);
            }
        };

        var pesSubpunctisState = {
            neume: function() {
                return new Neumes.PesSubpunctis();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape !== NoteShape.Inclinatum)
                    return createNeume(new Neumes.PesSubpunctis(), false);
                else
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
                else
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

                if (prevNote.shape === NoteShape.Virga && currNote.shape === NoteShape.Inclinatum &&
                    currNote.staffPosition < prevNote.staffPosition) {
                    // if we get here, then it seems we have a podatus, now being followed by a climacus
                    // rather than a scandicus. react accordingly
                    return createNeume(new Neumes.Podatus(), false, false);
                } else if (currNote.shape === NoteShape.Default && currNote.staffPosition < prevNote.staffPosition)
                    return scandicusFlexusState;
                else
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

                if (currNote.shape === NoteShape.Inclinatum && currNote.staffPosition < prevNote.staffPosition)
                    return climacusState;
                else if (currNote.shape === NoteShape.Virga && currNote.staffPosition === prevNote.staffPosition)
                    return bivirgaState;
                else
                    return createNeume(new Neumes.Virga(), false);
            }
        };

        var bivirgaState = {
            neume: function() {
                return new Neumes.Bivirga();
            },
            handle: function(currNote, prevNote) {

                if (currNote.shape === NoteShape.Virga && currNote.staffPosition === prevNote.staffPosition)
                    return createNeume(new Neumes.Trivirga(), true);
                else
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
                else
                    return createNeume(new Neumes.Apostropha(), false);
            }
        };

        var distrophaState = {
            neume: function() {
                return new Neumes.Distropha();
            },
            handle: function(currNote, prevNote) {
                if (currNote.staffPosition === prevNote.staffPosition) {
                    if(prevNote.morae && prevNote.morae.length) {
                        return createNeume(new Neumes.Distropha(), false);
                    } else {
                        return tristrophaState;
                    }
                } else
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
                if (currNote.shape === NoteShape.Default && currNote.staffPosition > prevNote.staffPosition) {
                    if (currNote.ictus) currNote.ictus.positionHint = Markings.MarkingPositionHint.Above;
                    return torculusResupinusState;
                } else {
                    return createNeume(new Neumes.Torculus(), false);
                }
            }
        };

        var torculusResupinusState = {
            neume: function() {
                return new Neumes.TorculusResupinus();
            },
            handle: function(currNote, prevNote) {
                if (currNote.shape === NoteShape.Default && currNote.staffPosition < prevNote.staffPosition)
                    return createNeume(new Neumes.TorculusResupinusFlexus(), true);
                else
                    return createNeume(new Neumes.TorculusResupinus(), false);
            }
        };

        var state = unknownState;

        while (currNoteIndex < notes.length) {

            var prevNote = currNoteIndex > 0 ? notes[currNoteIndex - 1] : null;
            var currNote = notes[currNoteIndex];

            state = state.handle(currNote, prevNote, notes.length - 1 - currNoteIndex);

            // if we are on the last note, then try to create a neume if we need to.
            if (currNoteIndex === notes.length - 1 && state !== unknownState)
                createNeume(state.neume(), true);

            currNoteIndex++;
        }

        if (neumes.length > 0) {
            if (finalTrailingSpace >= 0) {
                neumes[neumes.length - 1].trailingSpace = finalTrailingSpace;
                neumes[neumes.length - 1].keepWithNext = true;

                if (finalTrailingSpace >= ctxt.intraNeumeSpacing)
                    neumes[neumes.length - 1].allowLineBreakBeforeNext = neumes[neumes.length - 1].keepWithNext = true;
            }
        }

        return neumes;
    }

    // appends any notes created to the notes array argument
    static createNoteFromData(ctxt, clef, data, notes, sourceIndex) {

        var note = new Note();
        note.sourceIndex = sourceIndex;

        if (data.length < 1)
            throw 'Invalid note data: ' + data;

        if (data[0] === '-') { // liquescent initio debilis
            note.liquescent = LiquescentType.InitioDebilis;
            data = data.substring(1);
        }

        if (data.length < 1)
            throw 'Invalid note data: ' + data;

        // the next char is always the pitch
        var pitch = this.gabcHeightToExsurgePitch(clef, data[0]);

        if (data[0] === data[0].toUpperCase())
            note.shape = NoteShape.Inclinatum;

        note.staffPosition = this.gabcHeightToExsurgeHeight(data[0]);
        note.pitch = pitch;

        var mark;

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
                    // note, and if so, we simply force the second one to have an Above
                    // position hint. if a user decides to try to put position indicators
                    // on the double morae (such as 1 or 2), then really the behavior is
                    // not defined by gabc, so it's on the user to figure it out.
                    if (note.morae.length > 0 && notes.length) {
                        var previousNote = notes.slice(-1)[0];
                        var previousMora = note.morae.slice(-1)[0];
                        previousMora.note = previousNote;
                    }

                    mark = new Markings.Mora(ctxt, note);
                    if (haveLookahead && lookahead === '1')
                        mark.positionHint = Markings.MarkingPositionHint.Above;
                    else if (haveLookahead && lookahead === '0')
                        mark.positionHint = Markings.MarkingPositionHint.Below;

                    note.morae.push(mark);
                    break;

                case '_':

                    var episemaHadModifier = false;

                    mark = new Markings.HorizontalEpisema(episemaNote);
                    while (haveLookahead) {

                        if (lookahead === '0')
                            mark.positionHint = Markings.MarkingPositionHint.Below;
                        else if (lookahead === '1')
                            mark.positionHint = Markings.MarkingPositionHint.Above;
                        else if (lookahead === '2')
                            mark.terminating = true; // episema terminates
                        else if (lookahead === '3')
                            mark.alignment = Markings.HorizontalEpisemaAlignment.Left;
                        else if (lookahead === '4')
                            mark.alignment = Markings.HorizontalEpisemaAlignment.Center;
                        else if (lookahead === '5')
                            mark.alignment = Markings.HorizontalEpisemaAlignment.Right;
                        else
                            break;

                        // the gabc definition for episemata is so convoluted...
                        // - double underscores create episemata over multiple notes.
                        // - unless the _ has a 0, 1, 3, 4, or 5 modifier, which means
                        //   another underscore puts a second episema on the same note
                        // - (when there's a 2 lookahead, then this is treated as an
                        //   unmodified underscore, so another underscore would be
                        //   added to previous notes
                        if (mark.alignment !== Markings.HorizontalEpisemaAlignment.Default &&
                            mark.positionHint !== Markings.MarkingPositionHint.Below)
                            episemaHadModifier = true;

                        i++;
                        haveLookahead = i + 1 < data.length;

                        if (haveLookahead)
                            lookahead = data[i + 1];
                    }

                    // since gabc allows consecutive underscores which is a shortcut to
                    // apply the episemata to previous notes, we keep track of that here
                    // in order to add the new episema to the correct note.

                    if (episemaNote)
                        episemaNote.episemata.push(mark);

                    if (episemaNote === note && episemaHadModifier)
                        episemaNote = note;
                    else if (episemaNoteIndex >= 0 && notes.length > 0)
                        episemaNote = notes[--episemaNoteIndex];

                    break;

                case '\'':
                    mark = new Markings.Ictus(ctxt, note);
                    if (haveLookahead && lookahead === '1')
                        mark.positionHint = Markings.MarkingPositionHint.Above;
                    else if (haveLookahead && lookahead === '0')
                        mark.positionHint = Markings.MarkingPositionHint.Below;
                    else if (note.shape === NoteShape.Virga) // ictus on a virga goes above by default:
                        mark.positionHint = Markings.MarkingPositionHint.Above;

                    note.ictus = mark;
                    break;

                //note shapes
                case 'r':
                    if (haveLookahead && lookahead === '1') {
                        note.acuteAccent = new Markings.AcuteAccent(ctxt, note);
                        i++;
                    } else
                        note.shapeModifiers |= NoteShapeModifiers.Cavum;
                    break;

                case 's':

                    if (note.shape === NoteShape.Stropha) {
                        // if we're already a stropha, that means this is gabc's
                        // quick stropha feature (e.g., gsss). create a new note
                        let newNote = new Note();
                        newNote.sourceIndex = sourceIndex + i;
                        newNote.staffPosition = note.staffPosition;
                        newNote.pitch = note.pitch;
                        notes.push(note);
                        note = newNote;
                        episemaNoteIndex++; // since a new note was added, increase the index here
                    }

                    note.shape = NoteShape.Stropha;
                    break;

                case 'v':

                    if (note.shape === NoteShape.Virga) {
                        // if we're already a stropha, that means this is gabc's
                        // quick virga feature (e.g., gvvv). create a new note
                        let newNote = new Note();
                        newNote.sourceIndex = sourceIndex + i;
                        newNote.staffPosition = note.staffPosition;
                        newNote.pitch = note.pitch;
                        notes.push(note);
                        note = newNote;
                        episemaNoteIndex++; // since a new note was added, increase the index here
                    }

                    note.shape = NoteShape.Virga;
                    break;

                case 'w':
                    note.shape = NoteShape.Quilisma;
                    break;

                case 'o':
                    note.shape = NoteShape.Oriscus;
                    if (haveLookahead && lookahead === '<') {
                        note.shapeModifiers |= NoteShapeModifiers.Ascending;
                        i++;
                    } else if (haveLookahead && lookahead === '>') {
                        note.shapeModifiers |= NoteShapeModifiers.Descending;
                        i++;
                    }
                    break;

                case 'O':
                    note.shape = NoteShape.Oriscus;
                    if (haveLookahead && lookahead === '<') {
                        note.shapeModifiers |= NoteShapeModifiers.Ascending | NoteShapeModifiers.Stemmed;
                        i++;
                    } else if (haveLookahead && lookahead === '>') {
                        note.shapeModifiers |= NoteShapeModifiers.Descending | NoteShapeModifiers.Stemmed;
                        i++;
                    } else
                        note.shapeModifiers |= NoteShapeModifiers.Stemmed;
                    break;

                // liquescents
                case '~':
                    if (note.shape === NoteShape.Inclinatum)
                        note.liquescent |= LiquescentType.Small;
                    else if (note.shape === NoteShape.Oriscus)
                        note.liquescent |= LiquescentType.Large;
                    else
                        note.liquescent |= LiquescentType.Small;
                    break;
                case '<':
                    note.liquescent |= LiquescentType.Ascending;
                    break;
                case '>':
                    note.liquescent |= LiquescentType.Descending;
                    break;

                // accidentals
                case 'x':
                    if (note.pitch.step === Step.Mi)
                        note.pitch.step = Step.Me;
                    else if (note.pitch.step === Step.Ti)
                        note.pitch.step = Step.Te;
                    break;
                case 'y':
                    if (note.pitch.step === Step.Te)
                        note.pitch.step = Step.Ti;
                    else if (note.pitch.step === Step.Me)
                        note.pitch.step = Step.Mi;
                    else if (note.pitch.step === Step.Du)
                        note.pitch.step = Step.Do;
                    else if (note.pitch.step === Step.Fu)
                        note.pitch.step = Step.Fa;
                    break;
                case '#':
                    if (note.pitch.step === Step.Do)
                        note.pitch.step = Step.Du;
                    else if (note.pitch.step === Step.Fa)
                        note.pitch.step = Step.Fu;
                    break;

                // gabc special item groups
                case '[':
                    // read in the whole group and parse it
                    var startIndex = ++i;
                    while (i < data.length && data[i] !== ']')
                        i++;

                    this.processInstructionForNote(ctxt, note, data.substring(startIndex, i), startIndex);
                    break;
            }
        }

        if(this.needToEndBrace && !note.braceStart && !note.braceEnd && !/[xy#]/.test(c)) {
            note.braceEnd = new Markings.BracePoint(note, this.needToEndBrace.isAbove, this.needToEndBrace.shape, this.needToEndBrace.attachment === Markings.BraceAttachment.Left? Markings.BraceAttachment.Right : Markings.BraceAttachment.Left);
            note.braceEnd.automatic = true;
            delete this.needToEndBrace;
        }

        notes.push(note);
    }

    // an instruction in this context is referring to a special gabc coding found after
    // notes between ['s and ]'s. choral signs and braces fall into this
    // category.
    //
    // currently only brace instructions are supported here!
    static processInstructionForNote(ctxt, note, instruction, sourceIndexOffset) {

        var results = instruction.match(__bracketedCommandRegex);
        if (results === null)
            return;
        var cmd = results[1];
        var data = results[2];
        switch(cmd) {
            case "cs":
                // TODO: support choral signs
                return;
            case "alt":
                note.alText = new AboveLinesText(ctxt, data, note.sourceIndex + sourceIndexOffset);
                note.alText.alignToNote = true;
                return;
        }


        results = instruction.match(RGX_BRACE_SPEC);

        if (results === null)
            return;

        // see the comments at the definition of __braceSpecRegex for the
        // capturing groups
        var above = results[1] === 'o';
        var shape = Markings.BraceShape.CurlyBrace; // default

        switch(results[2]) {
            case 'b':
                shape = Markings.BraceShape.RoundBrace;
                break;
            case 'cb':
                shape = Markings.BraceShape.CurlyBrace;
                break;
            case 'cba':
                shape = Markings.BraceShape.AccentedCurlyBrace;
                break;
        }

        var attachmentPoint = results[3] === '1' ? Markings.BraceAttachment.Left : Markings.BraceAttachment.Right;

        if (results[4] === '{' || results[5])
            note.braceStart = new Markings.BracePoint(note, above, shape, attachmentPoint);
        else
            note.braceEnd = new Markings.BracePoint(note, above, shape, attachmentPoint);

        // just have the next note end a brace that uses length;
        if(results[5]) {
            note.braceStart.automatic = true;
            this.needToEndBrace = note.braceStart;
        }
    }

    // takes raw gabc text source and parses it into words. For example, passing
    // in a string of "me(f.) (,) ma(fff)num(d!ewf) tu(fgF'E)am,(f.)" would return
    // an array of four strings: ["me(f.)", "(,)", "ma(fff)num(d!ewf)", "tu(fgF'E)am,(f.)"]
    static splitWords(gabcNotations) {
        // split the notations on whitespace boundaries, as long as the space
        // immediately follows a set of parentheses. Prior to doing that, we replace
        // all whitespace with spaces, which prevents tabs and newlines from ending
        // up in the notation data.
        gabcNotations = gabcNotations.trim().replace(/\s/g, ' ').replace(/\) (?=[^\)]*(?:\(|$))/g,')\n');
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

        syllables.wordLength = gabcWord.length;

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
        var exsurgeHeight = this.gabcHeightToExsurgeHeight(gabcHeight)

        var pitch = clef.staffPositionToPitch(exsurgeHeight);

        return pitch;
    }
}
