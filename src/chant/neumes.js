import { Glyphs } from '../glyphs.constants';
import { GlyphCodes } from 'elements/elements.constants';
import {
    ChantNotationElement,
    NeumeLineVisualizer,
    VirgaLineVisualizer
} from 'elements/drawing';
import {
    LiquescentTypes,
    NoteShapeModifiers,
    NoteShapes
} from 'chant/chant.constants';


class NeumeBuilder {

    constructor(ctxt, neume, startingX = 0) {
        this.ctxt = ctxt;
        this.neume = neume;
        this.x = startingX;
        this.lastNote = null;
        this.lineIsHanging = false;
        this.minX = 0;
    }

    // used to start a hanging line on the left of the next note
    lineFrom(note) {
        var previousNotation = this.ctxt.notations[this.ctxt.currNotationIndex - 1];
        if(this.x === 0 && previousNotation && previousNotation.notes && previousNotation.trailingSpace === 0) {
            this.lastNote = previousNotation.notes.slice(-1)[0];
            this.minX = -this.ctxt.neumeLineWeight;
        } else {
            this.lastNote = note;
            this.lineIsHanging = true;
        }
        return this;
    }

    // add a note, with a connecting line on the left if we have one
    noteAt(note, glyph, withLineTo = true) {

        if (!note)
            throw "NeumeBuilder.noteAt: note must be a valid note";

        if (!glyph)
            throw "NeumeBuilder.noteAt: glyph must be a valid glyph code";

        note.setGlyph(this.ctxt, glyph);
        var noteAlignsRight = note.glyphVisualizer.align === "right";

        var needsLine = withLineTo && this.lastNote !== null &&
            (this.lineIsHanging ||
                (this.lastNote.glyphVisualizer && this.lastNote.glyphVisualizer.align === 'right') ||
                Math.abs(this.lastNote.staffPosition - note.staffPosition) > 1);

        if (needsLine) {
            var line = new NeumeLineVisualizer(this.ctxt, this.lastNote, note, this.lineIsHanging);
            this.neume.addVisualizer(line);
            line.bounds.x = Math.max(this.minX, this.x - line.bounds.width);

            if (!noteAlignsRight)
                this.x = line.bounds.x;
        }

        // if this is the first note of a right aligned glyph (probably an initio debilis),
        // then there's nothing to worry about. but if it's not then first, then this
        // subtraction will right align it visually
        if (noteAlignsRight && this.lastNote)
            note.bounds.x = this.x - note.bounds.width;
        else {
            note.bounds.x = this.x;
            this.x += note.bounds.width;
        }

        this.neume.addVisualizer(note);

        this.lastNote = note;
        this.lineIsHanging = false;

        return this;
    }

    // a special form of noteAdd that creates a virga
    // uses a punctum cuadratum and a line rather than the virga glyphs
    virgaAt(note, withLineTo = true) {

        // add the punctum for the virga
        this.noteAt(note, GlyphCodes.PunctumQuadratum);

        // add a line for the virga
        var line = new VirgaLineVisualizer(this.ctxt, note);
        this.x -= line.bounds.width;
        line.bounds.x = this.x;
        this.neume.addVisualizer(line);

        this.lastNote = note;
        this.lineIsHanging = false;

        return this;
    }

    advanceBy(x) {
        this.lastNote = null;
        this.lineIsHanging = false;

        this.x += x;

        return this;
    }

    // for terminating hanging lines with no lower notes
    withLineEndingAt(note) {

        if (this.lastNote === null)
            return;

        var line = new NeumeLineVisualizer(this.ctxt, this.lastNote, note, true);
        this.neume.addVisualizer(line);
        this.x -= line.bounds.width;
        line.bounds.x = this.x;

        this.neume.addVisualizer(line);

        this.lastNote = note;

        return this;
    }

    withPodatus(lowerNote, upperNote) {

        var upperGlyph;
        var lowerGlyph;

        if (lowerNote.liquescent === LiquescentTypes.INITIO_DEBILIS) {

            // liquescent upper note or not?
            if (upperNote.liquescent === LiquescentTypes.NONE)
                upperGlyph = GlyphCodes.PunctumQuadratum;
            else
                upperGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;

            lowerGlyph = GlyphCodes.TerminatingDesLiquescent;
        } else if (upperNote.liquescent & LiquescentTypes.SMALL) {
            lowerGlyph = GlyphCodes.BeginningAscLiquescent;
            upperGlyph = GlyphCodes.TerminatingAscLiquescent;
        } else if (upperNote.liquescent & LiquescentTypes.ASCENDING) {
            lowerGlyph = GlyphCodes.PunctumQuadratum;
            upperGlyph = GlyphCodes.PunctumQuadratumAscLiquescent;
        } else if (upperNote.liquescent & LiquescentTypes.DESCENDING) {
            lowerGlyph = GlyphCodes.PunctumQuadratum;
            upperGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;
        } else {
            // standard shape
            lowerGlyph = GlyphCodes.PodatusLower;
            upperGlyph = GlyphCodes.PodatusUpper;
        }

        // allow a quilisma pes
        if (lowerNote.shape === NoteShapes.QUILISMA)
            lowerGlyph = GlyphCodes.Quilisma;

        this.noteAt(lowerNote, lowerGlyph).noteAt(upperNote, upperGlyph);

        // make sure we don't have lines connected to the podatus
        this.lastNote = null;

        return this;
    }

    withClivis(upper, lower) {

        var lowerGlyph;

        if (upper.shape === NoteShapes.ORISCUS)
            this.noteAt(upper, GlyphCodes.OriscusDes, false);
        else
            this.lineFrom(lower).noteAt(upper, GlyphCodes.PunctumQuadratum);

        if (lower.liquescent & LiquescentTypes.SMALL) {
            lowerGlyph = GlyphCodes.TerminatingDesLiquescent;
        } else if (lower.liquescent === LiquescentTypes.ASCENDING)
            lowerGlyph = GlyphCodes.PunctumQuadratumAscLiquescent;
        else if (lower.liquescent === LiquescentTypes.DESCENDING)
            lowerGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;
        else
            lowerGlyph = GlyphCodes.PunctumQuadratum;

        this.noteAt(lower, lowerGlyph);

        // make sure we don't have lines connected to the clivis
        this.lastNote = null;

        return this;
    }

    // lays out a sequence of notes that are inclinata (e.g., climacus, pes subpunctis)
    withInclinata(notes) {

        var staffPosition = notes[0].staffPosition, prevStaffPosition = notes[0].staffPosition;

        // it is important to advance by the width of the inclinatum glyph itself
        // rather than by individual note widths, so that any liquescents are spaced
        // the same as non-liquscents
        var advanceWidth = Glyphs.PunctumInclinatum.bounds.width * this.ctxt.glyphScaling;

        // now add all the punctum inclinatum
        for (var i = 0; i < notes.length; i++, prevStaffPosition = staffPosition) {
            var note = notes[i];

            if (note.liquescent & LiquescentTypes.SMALL)
                note.setGlyph(this.ctxt, GlyphCodes.PunctumInclinatumLiquescent);
            else if (note.liquescent & LiquescentTypes.LARGE)
                // fixme: is the large inclinatum liquescent the same as the apostropha?
                note.setGlyph(this.ctxt, GlyphCodes.Stropha);
            else
                // fixme: some climaci in the new chant books end with a punctum quadratum
                // (see, for example, the antiphon "Sancta Maria" for October 7).
                note.setGlyph(this.ctxt, GlyphCodes.PunctumInclinatum);

            staffPosition = note.staffPosition;

            var multiple = Math.abs(prevStaffPosition - staffPosition);
            switch (multiple) {
                case 0:
                    multiple = 1.1;
                    break;
                default:
                    multiple *= 2/3;
                    break;
            }

            if (i > 0)
                this.x += advanceWidth * multiple;

            note.bounds.x = this.x;

            this.neume.addVisualizer(note);
        }

        return this;
    }

    withPorrectusSwash(start, end) {

        var needsLine = this.lastNote !== null &&
            (this.lineIsHanging ||
                (this.lastNote.glyphVisualizer && this.lastNote.glyphVisualizer.align === 'right') ||
                Math.abs(this.lastNote.staffPosition - start.staffPosition) > 1);

        if (needsLine) {
            var line = new NeumeLineVisualizer(this.ctxt, this.lastNote, start, this.lineIsHanging);
            this.x = Math.max(this.minX, this.x - line.bounds.width);
            line.bounds.x = this.x;
            this.neume.addVisualizer(line);
        }

        var glyph;

        switch (start.staffPosition - end.staffPosition) {
            case 1:
                glyph = GlyphCodes.Porrectus1;
                break;
            case 2:
                glyph = GlyphCodes.Porrectus2;
                break;
            case 3:
                glyph = GlyphCodes.Porrectus3;
                break;
            case 4:
                glyph = GlyphCodes.Porrectus4;
                break;
            default:
                // fixme: should we generate an error here?
                glyph = GlyphCodes.None;
                break;
        }

        start.setGlyph(this.ctxt, glyph);
        start.bounds.x = this.x;

        // the second glyph does not draw anything, but it still has logical importance for the editing
        // environment...it can respond to changes which will then change the swash glyph of the first.
        end.setGlyph(this.ctxt, GlyphCodes.None);

        this.x = start.bounds.right();
        end.bounds.x = this.x - end.bounds.width;

        this.neume.addVisualizer(start);
        this.neume.addVisualizer(end);

        this.lastNote = end;
        this.lineIsHanging = false;

        return this;
    }
}

/*
 * Neumes base class
 */
export class Neume extends ChantNotationElement {

    constructor(notes = []) {

        super();

        this.isNeume = true;  // poor man's reflection
        this.notes = notes;

        for (var i = 0; i < notes.length; i++)
            notes[i].neume = this;
    }

    addNote(note) {
        note.neume = this;
        this.notes.push(note);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);
    }

    finishLayout(ctxt) {

        this.ledgerLines = this.requiresLedgerLine();

        // allow subclasses an opportunity to position their own markings...
        this.positionMarkings();

        // layout the markings of the notes
        for (var i = 0; i < this.notes.length; i++) {
            var note = this.notes[i];
            var j;

            for (j = 0; j < note.episemata.length; j++) {
                note.episemata[j].performLayout(ctxt);
                this.addVisualizer(note.episemata[j]);
            }

            for (j = 0; j < note.morae.length; j++) {
                note.morae[j].performLayout(ctxt);
                this.addVisualizer(note.morae[j]);
            }

            // if the note has an ictus, then add it here
            if (note.ictus) {
                note.ictus.performLayout(ctxt);
                this.addVisualizer(note.ictus);
            }

            if (note.acuteAccent) {
                note.acuteAccent.performLayout(ctxt);
                this.addVisualizer(note.acuteAccent);
            }

            // braces are handled by the chant line, so we don't mess with them here
            // this is because brace size depends on chant line logic (neume spacing,
            // justification, etc.) so they are considered chant line level
            // markings rather than note level markings
        }

        this.origin.x = this.notes[0].origin.x;
        this.origin.y = this.notes[0].origin.y;

        super.finishLayout(ctxt);
    }

    requiresLedgerLine() {
        var firstAbove = false,
            needsAbove = false,
            firstBelow = false,
            needsBelow = false,
            // isPorrectus = false,
            result = [];

        if (!this.notes) return result;

        for (var i = 0; i < this.notes.length; ++i) {
            var note = this.notes[i];
            var staffPosition = note.staffPosition;
            if (staffPosition >= 4) {
                needsAbove = needsAbove || staffPosition >= 5;
                if(firstAbove === false) firstAbove = Math.max(0, i - 1);
                if(staffPosition >= 5) continue;
            } else if (staffPosition <= -4) {
                needsBelow = needsBelow || staffPosition <= -5;
                if(firstBelow === false) firstBelow = Math.max(0, i - 1);
                if(staffPosition <= -5) continue;
            }
            if (needsAbove || needsBelow) {
                var endI = i; // Math.abs(staffPosition) >= 4? i : i - 1;
                result.push({
                    element: this.notes[firstAbove || firstBelow || 0],
                    endElem: this.notes[endI],
                    staffPosition: needsAbove? 5 : -5
                });
                firstAbove = firstBelow = needsAbove = needsBelow = false;
            }
            // isPorrectus = /^Porrectus\d$/.test(note.glyphVisualizer.glyphCode);
        }
        if (needsAbove || needsBelow) {
            result.push({
                element: this.notes[firstAbove || firstBelow || 0],
                endElem: this.notes[this.notes.length - 1],
                staffPosition: needsAbove? 5 : -5
            });
        }
        return result;
    }

    resetDependencies() {

    }

    build(ctxt) {
        return new NeumeBuilder(ctxt, this);
    }
    positionEpisemata(note, position) {
        var i;
        for (i = 0; i < note.episemata.length; i++)
            if (note.episemata[i].positionHint === MarkingPositionHint.Default)
                note.episemata[i].positionHint = position;
        return note.episemata.length;
    }
    positionEpisemataAbove(note) {
        return this.positionEpisemata(note, MarkingPositionHint.Above);
    }
    positionEpisemataBelow(note) {
        return this.positionEpisemata(note, MarkingPositionHint.Below);
    }

    positionPodatusEpisemata(bottomNote, topNote) {
        // 1. episema on lower note by default be below, upper note above
        this.positionEpisemataBelow(bottomNote);
        this.positionEpisemataAbove(topNote);
    }
    positionInclinataMorae(notes) {
        notes = notes.slice(-2);
        if (notes.length < 2 || notes[1].staffPosition > notes[0].staffPosition) return;
        var bottomNote = notes[1],
            topNote = notes[0],
            mark;

        // The mora on the second (lower) note should be below the punctum,
        // if the punctum is on a line and the previous punctum is in the space above.
        if (Math.abs(bottomNote.staffPosition % 2) === 1 && (topNote.staffPosition - bottomNote.staffPosition === 1) && bottomNote.morae.length > 0) {
            mark = bottomNote.morae.slice(-1)[0];
            if (mark.positionHint === MarkingPositionHint.Default) mark.positionHint = MarkingPositionHint.Below;
        }
    }
    positionPodatusMorae(bottomNote, topNote) {
        var mark;

        // The mora on the first (lower) note should be below it,
        // if it is on a line.
        if (Math.abs(bottomNote.staffPosition % 2) === 1) {
            if (bottomNote.morae.length === 1) {
                mark = bottomNote.morae[0];
            } else if (topNote.morae.length > 1) {
                mark = topNote.morae[0];
            }
            if(mark && mark.positionHint === MarkingPositionHint.Default) mark.positionHint = MarkingPositionHint.Below;
        }

        // if there is a mora on the first note but not on the second, and the neume
        // continues with a punctum higher than the second note, we need to adjust
        // the space after the neume so that it follows immediately with no gap
        if (bottomNote.morae.length > 0 && topNote.morae.length === 0) {
            bottomNote.morae[0].ignoreBounds = true;
        }
    }
    // for any subclasses that begin with a podatus, they can call this from their own positionMarkings()
    positionPodatusMarkings(bottomNote, topNote) {
        this.positionPodatusEpisemata(bottomNote, topNote);
        this.positionPodatusMorae(bottomNote, topNote);
    }

    // just like a clivis, but the first note of the three also works like the second note of the clivis:
    // episema below, unless the middle note also has an episema
    positionTorculusMarkings(firstNote, secondNote, thirdNote) {
        var hasTopEpisema = this.positionClivisMarkings(secondNote, thirdNote);
        hasTopEpisema = this.positionEpisemata(firstNote, hasTopEpisema ? MarkingPositionHint.Above : MarkingPositionHint.Below) && hasTopEpisema;
        return hasTopEpisema;
    }
    positionClivisMorae(firstNote, secondNote) {
        // 1. morae need to be lined up if both notes have morae
        var morae = firstNote.morae.concat(secondNote.morae);
        if (secondNote.morae.length) {
            if(morae.length > 1) morae[0].horizontalOffset += secondNote.bounds.right() - firstNote.bounds.right();
            if(firstNote.staffPosition - secondNote.staffPosition === 1 &&
                Math.abs(secondNote.staffPosition % 2) === 1) {
                morae.slice(-1)[0].positionHint = MarkingPositionHint.Below;
            }
        }
    }
    positionClivisEpisemata(firstNote, secondNote) {
        var hasTopEpisema = this.positionEpisemataAbove(firstNote);
        this.positionEpisemata(secondNote, hasTopEpisema ? MarkingPositionHint.Above : MarkingPositionHint.Below);
        return hasTopEpisema;
    }
    positionClivisMarkings(firstNote, secondNote) {
        this.positionClivisMorae(firstNote, secondNote);
        return this.positionClivisEpisemata(firstNote, secondNote);
    }

    positionPorrectusMarkings(firstNote, secondNote, thirdNote) {
        // episemata on first and second note work like a clivis,
        // the second note should have its episema below, unless the first note also has an episema.
        this.positionClivisEpisemata(firstNote, secondNote);
        this.positionPodatusMarkings(secondNote, thirdNote);
    }

    positionPorrectusFlexusMarkings(first, second, third, fourth) {
        var hasTopEpisema = this.positionEpisemataAbove(first);
        hasTopEpisema = this.positionClivisMarkings(third, fourth) || hasTopEpisema;
        this.positionEpisemata(second, hasTopEpisema? MarkingPositionHint.Above : MarkingPositionHint.Below);
    }

    // subclasses can override this in order to correctly place markings in a neume specific way
    positionMarkings() {

    }
}

/*
 * Apostropha
 */
export class Apostropha extends Neume {

    positionMarkings() {
        var positionHint = MarkingPositionHint.Above;

        // logic here is this: if first episema is default position, place it above.
        // then place the second one (if there is one) opposite of the first.
        for (var i = 0; i < this.notes[0].episemata.length; i++) {
            if (this.notes[0].episemata[i].positionHint === MarkingPositionHint.Default)
                this.notes[0].episemata[i].positionHint = positionHint;
            else
                positionHint = this.notes[0].episemata[i].positionHint;

            // now place the next one in the opposite position
            positionHint = (positionHint === MarkingPositionHint.Above) ? MarkingPositionHint.Below : MarkingPositionHint.Above;
        }
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt).noteAt(this.notes[0], Apostropha.getNoteGlyphCode(this.notes[0]));

        this.finishLayout(ctxt);
    }

    static getNoteGlyphCode(note) {

        if (note.shape === NoteShapes.STROPHA)
            return GlyphCodes.Stropha;

        if (note.liquescent & LiquescentTypes.ASCENDING)
            return GlyphCodes.PunctumQuadratumAscLiquescent;
        else if (note.liquescent & LiquescentTypes.DESCENDING)
            return GlyphCodes.PunctumQuadratumDesLiquescent;

        if (note.shapeModifiers & NoteShapeModifiers.Cavum)
            return GlyphCodes.PunctumCavum;

        return GlyphCodes.PunctumQuadratum;
    }
}

/*
 * Bivirga
 *
 * For simplicity in implementation, Bivirga's have two notes in the object
 * structure. These technically must be the same pitch though.
 */
export class Bivirga extends Neume {

    positionMarkings() {
        this.positionEpisemataAbove(this.notes[0]);
        this.positionEpisemataAbove(this.notes[1]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt)
            .virgaAt(this.notes[0])
            .advanceBy(ctxt.intraNeumeSpacing)
            .virgaAt(this.notes[1]);

        this.finishLayout(ctxt);
    }
}

/*
 * Trivirga
 *
 * For simplicity in implementation, Trivirga's have three notes in the object
 * structure. These technically must be the same pitch though.
 */
export class Trivirga extends Neume {

    positionMarkings() {
        this.positionEpisemataAbove(this.notes[0]);
        this.positionEpisemataAbove(this.notes[1]);
        this.positionEpisemataAbove(this.notes[2]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt)
            .virgaAt(this.notes[0])
            .advanceBy(ctxt.intraNeumeSpacing)
            .virgaAt(this.notes[1])
            .advanceBy(ctxt.intraNeumeSpacing)
            .virgaAt(this.notes[2]);

        this.finishLayout(ctxt);
    }
}

/*
 * Climacus
 */
export class Climacus extends Neume {

    positionMarkings() {

        for (var i = 0; i < this.notes.length; i++) {
            this.positionEpisemataAbove(this.notes[i]);
        }
        this.positionInclinataMorae(this.notes);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt)
            .virgaAt(this.notes[0])
            .advanceBy(ctxt.intraNeumeSpacing)
            .withInclinata(this.notes.slice(1));

        this.finishLayout(ctxt);
    }
}

/*
 * Clivis
 */
export class Clivis extends Neume {

    positionMarkings() {
        this.positionClivisMarkings(this.notes[0], this.notes[1]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var upper = this.notes[0];
        var lower = this.notes[1];

        this.build(ctxt).withClivis(upper, lower);

        this.finishLayout(ctxt);
    }
}



/*
 * Distropha
 *
 * For simplicity in implementation, Distropha's have two notes in the object
 * structure. These technically must be the same pitch though (like Bivirga).
 */
export class Distropha extends Neume {

    positionMarkings() {
        this.positionEpisemataAbove(this.notes[0]);
        this.positionEpisemataAbove(this.notes[1]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt)
            .noteAt(this.notes[0], Apostropha.getNoteGlyphCode(this.notes[0]))
            .advanceBy(ctxt.intraNeumeSpacing)
            .noteAt(this.notes[1], Apostropha.getNoteGlyphCode(this.notes[1]));

        this.finishLayout(ctxt);
    }
}

/*
 * Oriscus
 */
export class Oriscus extends Neume {

    positionMarkings() {
        this.positionEpisemataAbove(this.notes[0]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        // determine the glyph to use
        var note = this.notes[0];
        var glyph;

        if (note.liquescent !== LiquescentTypes.NONE) {
            glyph = GlyphCodes.OriscusLiquescent;
        } else {
            if (note.shapeModifiers & NoteShapeModifiers.Ascending)
                glyph = GlyphCodes.OriscusAsc;
            else if (note.shapeModifiers & NoteShapeModifiers.Descending)
                glyph = GlyphCodes.OriscusDes;
            else {
                // by default we take the descending form, unless we can figure out by a lookahead here
                glyph = GlyphCodes.OriscusDes;

                // try to find a neume following this one
                var neume = ctxt.findNextNeume();

                if (neume) {
                    var nextNoteStaffPosition = ctxt.activeClef.pitchToStaffPosition(neume.notes[0].pitch);

                    if (nextNoteStaffPosition > note.staffPosition)
                        glyph = GlyphCodes.OriscusAsc;
                }
            }
        }

        this.build(ctxt).noteAt(note, glyph);

        this.finishLayout(ctxt);
    }

    resetDependencies() {

        // a single oriscus tries to automatically use the right direction
        // based on the following neumes. if we don't have a manually designated
        // direction, then we reset our layout so that we can try to guess it
        // at next layout phase.
        if (this.notes[0].shapeModifiers & NoteShapeModifiers.Ascending ||
            this.notes[0].shapeModifiers & NoteShapeModifiers.Descending)
            return;

        this.needsLayout = true;
    }
}

/*
 * PesQuassus
 */
export class PesQuassus extends Neume {

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var lower = this.notes[0];
        var upper = this.notes[1];

        var lowerGlyph;

        var lowerStaffPos = lower.staffPosition;
        var upperStaffPos = upper.staffPosition;

        if (lower.shape === NoteShapes.ORISCUS)
            lowerGlyph = GlyphCodes.OriscusAsc;
        else
            lowerGlyph = GlyphCodes.PunctumQuadratum;

        var builder = this.build(ctxt)
            .noteAt(lower, lowerGlyph);

        if (upperStaffPos - lowerStaffPos === 1)// use a virga glyph in this case
            builder.virgaAt(upper);
        else if (upper.liquescent === LiquescentTypes.LARGEDESCENDING)
            builder.noteAt(upper, GlyphCodes.PunctumQuadratumDesLiquescent).withLineEndingAt(lower);
        else
            builder.noteAt(upper, GlyphCodes.PunctumQuadratum).withLineEndingAt(lower);

        this.finishLayout(ctxt);
    }
}

/*
 * PesSubpunctis
 */
export class PesSubpunctis extends Neume {

    positionMarkings() {
        this.positionPodatusEpisemata(this.notes[0], this.notes[1]);
        for(var i=2; i < this.notes.length; ++i) {
            this.positionEpisemataAbove(this.notes[i]);
        }
        this.positionInclinataMorae(this.notes.slice(1));
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        // podatus followed by inclinata
        this.build(ctxt)
            .withPodatus(this.notes[0], this.notes[1])
            .advanceBy(ctxt.intraNeumeSpacing * 0.68)
            .withInclinata(this.notes.slice(2));

        this.finishLayout(ctxt);
    }
}

/*
 * Podatus
 *
 * This podatus class handles a few neume types actually, depending on the note
 * data: Podatus (including various liquescent types on the upper note),
 * Podatus initio debilis, and Quilisma-Pes
 */
export class Podatus extends Neume {

    positionMarkings() {
        this.positionPodatusMarkings(this.notes[0], this.notes[1]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt).withPodatus(this.notes[0], this.notes[1]);

        this.finishLayout(ctxt);
    }
}

/*
 * Porrectus
 */
export class Porrectus extends Neume {

    positionMarkings() {
        this.positionPorrectusMarkings(this.notes[0], this.notes[1], this.notes[2]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var first = this.notes[0];
        var second = this.notes[1];
        var third = this.notes[2];

        var thirdGlyph;

        if (third.liquescent & LiquescentTypes.SMALL)
            thirdGlyph = GlyphCodes.TerminatingAscLiquescent;
        else if (third.liquescent & LiquescentTypes.DESCENDING)
            thirdGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;
        else
            thirdGlyph = GlyphCodes.PodatusUpper;

        this.build(ctxt)
            .lineFrom(second)
            .withPorrectusSwash(first, second)
            .noteAt(third, thirdGlyph);

        this.finishLayout(ctxt);
    }
}

/*
 * PorrectusFlexus
 */
export class PorrectusFlexus extends Neume {

    positionMarkings() {
        this.positionPorrectusFlexusMarkings(this.notes[0], this.notes[1], this.notes[2], this.notes[3]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var first = this.notes[0];
        var second = this.notes[1];
        var third = this.notes[2];
        var fourth = this.notes[3];

        var thirdGlyph = GlyphCodes.PunctumQuadratum, fourthGlyph;

        if (fourth.liquescent & LiquescentTypes.SMALL) {
            thirdGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;
            fourthGlyph = GlyphCodes.TerminatingDesLiquescent;
        } else if (fourth.liquescent & LiquescentTypes.ASCENDING)
            fourthGlyph = GlyphCodes.PunctumQuadratumAscLiquescent;
        else if (fourth.liquescent & LiquescentTypes.DESCENDING)
            fourthGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;
        else
            fourthGlyph = GlyphCodes.PunctumQuadratum;

        this.build(ctxt)
            .lineFrom(second)
            .withPorrectusSwash(first, second)
            .noteAt(third, thirdGlyph)
            .noteAt(fourth, fourthGlyph);

        this.finishLayout(ctxt);
    }
}

// this is some type of pseudo nume right? there is no such thing as a neume
// of puncta inclinata, but this will be part of other composite neumes.
export class PunctaInclinata extends Neume {

    positionMarkings() {
        this.positionInclinataMorae(this.notes);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt).withInclinata(this.notes);

        this.finishLayout(ctxt);
    }
}

/*
 * Punctum
 */
export class Punctum extends Neume {

    positionMarkings() {
        this.positionEpisemataAbove(this.notes[0]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var note = this.notes[0];
        var glyph = GlyphCodes.PunctumQuadratum;

        // determine the glyph to use
        if (note.liquescent !== LiquescentTypes.NONE) {
            if (note.shape === NoteShapes.INCLINATUM)
                glyph = GlyphCodes.PunctumInclinatumLiquescent;
            else if (note.shape === NoteShapes.ORISCUS)
                glyph = GlyphCodes.OriscusLiquescent;
            else if (note.liquescent & LiquescentTypes.ASCENDING)
                glyph = GlyphCodes.PunctumQuadratumAscLiquescent;
            else if (note.liquescent & LiquescentTypes.DESCENDING)
                glyph = GlyphCodes.PunctumQuadratumDesLiquescent;

        } else {

            if (note.shapeModifiers & NoteShapeModifiers.Cavum)
                glyph = GlyphCodes.PunctumCavum;
            else if (note.shape === NoteShapes.INCLINATUM)
                glyph = GlyphCodes.PunctumInclinatum;
            else if (note.shape === NoteShapes.QUILISMA)
                glyph = GlyphCodes.Quilisma;
            else
                glyph = GlyphCodes.PunctumQuadratum;
        }

        this.build(ctxt).noteAt(note, glyph);

        this.finishLayout(ctxt);
    }
}

/*
 * Salicus
 */
export class Salicus extends Neume {

    positionMarkings() {
        // by default place episema below
        // fixme: is this correct?
        for (var i = 0; i < this.notes.length; i++)
            this.positionEpisemataBelow(this.notes[i]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var first = this.notes[0];
        var second = this.notes[1];
        var third = this.notes[2];

        var builder = this.build(ctxt).noteAt(first, GlyphCodes.PunctumQuadratum);

        // if the next note doesn't require a stem connector, then add a tad bit
        // of spacing here
        if (!(second.shapeModifiers & NoteShapeModifiers.Stemmed))
            builder.advanceBy(ctxt.intraNeumeSpacing);

        // second note is always an oriscus, which may or may not be stemmed
        // to the first
        builder.noteAt(second, GlyphCodes.OriscusAsc);

        // third note can be a punctum quadratum or various liquescent forms
        if (third.liquescent & LiquescentTypes.SMALL)
            builder.noteAt(third, GlyphCodes.TerminatingAscLiquescent);
        else if (third.liquescent === LiquescentTypes.ASCENDING)
            builder.noteAt(third, GlyphCodes.PunctumQuadratumAscLiquescent);
        else if (third.liquescent === LiquescentTypes.DESCENDING)
            builder.noteAt(third, GlyphCodes.PunctumQuadratumDesLiquescent);
        else
            builder.virgaAt(third);

        this.finishLayout(ctxt);
    }
}

/*
 * Salicus Flexus
 */
export class SalicusFlexus extends Neume {

    positionMarkings() {
        var hasTopEpisema = this.positionTorculusMarkings(this.notes[1], this.notes[2], this.notes[3]);
        this.positionEpisemata(this.notes[0], hasTopEpisema? MarkingPositionHint.Above : MarkingPositionHint.Below);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var first = this.notes[0];
        var second = this.notes[1];
        var third = this.notes[2];
        var fourth = this.notes[3];

        var builder = this.build(ctxt).noteAt(first, GlyphCodes.PunctumQuadratum);

        // if the next note doesn't require a stem connector, then add a tad bit
        // of spacing here
        if (!(second.shapeModifiers & NoteShapeModifiers.Stemmed))
            builder.advanceBy(ctxt.intraNeumeSpacing);

        // second note is always an oriscus, which may or may not be stemmed
        // to the first
        builder.noteAt(second, GlyphCodes.OriscusAsc);

        // third note can be a punctum quadratum or various liquescent forms,
        // ...based on note four though!
        if (fourth.liquescent & LiquescentTypes.SMALL)
            builder.noteAt(third, GlyphCodes.PunctumQuadratumDesLiquescent);
        else
            builder.noteAt(third, GlyphCodes.PunctumQuadratum);

        // finally, do the fourth note
        if (fourth.liquescent & LiquescentTypes.SMALL)
            builder.noteAt(fourth, GlyphCodes.TerminatingDesLiquescent);
        else if (fourth.liquescent & LiquescentTypes.ASCENDING)
            builder.noteAt(fourth, GlyphCodes.PunctumQuadratumAscLiquescent);
        else if (fourth.liquescent & LiquescentTypes.DESCENDING)
            builder.noteAt(fourth, GlyphCodes.PunctumQuadratumDesLiquescent);
        else
            builder.noteAt(fourth, GlyphCodes.PunctumQuadratum);

        this.finishLayout(ctxt);
    }
}

/*
 * Scandicus
 */
export class Scandicus extends Neume {

    positionMarkings() {
        if (this.notes[2].shape === NoteShapes.VIRGA) {
            this.positionPodatusMarkings(this.notes[0], this.notes[1]);
            this.positionEpisemataAbove(this.notes[2]);
        } else {
            this.positionEpisemataBelow(this.notes[0]);
            this.positionPodatusMarkings(this.notes[1], this.notes[2]);
        }
    }

    // if the third note shape is a virga, then the scadicus is rendered
    // as a podatus followed by a virga. Otherwise, it's rendered as a
    // punctum followed by a podatus...
    performLayout(ctxt) {
        super.performLayout(ctxt);

        var first = this.notes[0];
        var second = this.notes[1];
        var third = this.notes[2];

        if (third.shape === NoteShapes.VIRGA) {
            this.build(ctxt)
                .withPodatus(first, second)
                .virgaAt(third);
        } else {
            this.build(ctxt)
                .noteAt(first, first.shape === NoteShapes.QUILISMA? GlyphCodes.Quilisma : GlyphCodes.PunctumQuadratum)
                .withPodatus(second, third);
        }

        this.finishLayout(ctxt);
    }
}


/*
 * Scandicus Flexus
 */
export class ScandicusFlexus extends Neume {

    positionMarkings() {
        if (this.notes[2].shape === NoteShapes.VIRGA) {
            this.positionPodatusMarkings(this.notes[0], this.notes[1]);
            this.positionClivisMarkings(this.notes[2], this.notes[3]);
        } else {
            this.positionEpisemataBelow(this.notes[0]);
            this.positionPodatusMarkings(this.notes[1], this.notes[2]);
            this.positionEpisemataAbove(this.notes[3]);
        }
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var first = this.notes[0];
        var second = this.notes[1];
        var third = this.notes[2];
        var fourth = this.notes[3];

        if (third.shape === NoteShapes.VIRGA) {
            this.build(ctxt)
                .withPodatus(first, second)
                .advanceBy(ctxt.intraNeumeSpacing)
                .withClivis(third, fourth);
        } else {
            var fourthGlyph = GlyphCodes.PunctumQuadratum;

            if (fourth.liquescent & LiquescentTypes.ASCENDING)
                fourthGlyph = GlyphCodes.PunctumQuadratumAscLiquescent;
            else if (fourth.liquescent & LiquescentTypes.DESCENDING)
                fourthGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;

            this.build(ctxt)
                .noteAt(first, GlyphCodes.PunctumQuadratum)
                .withPodatus(second, third)
                .advanceBy(ctxt.intraNeumeSpacing)
                .noteAt(fourth, fourthGlyph);
        }

        this.finishLayout(ctxt);
    }
}

/*
 * Torculus
 */
export class Torculus extends Neume {

    positionMarkings() {
        this.positionTorculusMarkings(this.notes[0], this.notes[1], this.notes[2]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var note1 = this.notes[0];
        var note2 = this.notes[1];
        var note3 = this.notes[2];

        var glyph1, glyph3;

        if (note1.liquescent === LiquescentTypes.INITIO_DEBILIS)
            glyph1 = GlyphCodes.TerminatingDesLiquescent;
        else if (note1.shape === NoteShapes.QUILISMA)
            glyph1 = GlyphCodes.Quilisma;
        else
            glyph1 = GlyphCodes.PunctumQuadratum;

        if (note3.liquescent & LiquescentTypes.SMALL)
            glyph3 = GlyphCodes.TerminatingDesLiquescent;
        else if (note3.liquescent & LiquescentTypes.ASCENDING)
            glyph3 = GlyphCodes.PunctumQuadratumAscLiquescent;
        else if (note3.liquescent & LiquescentTypes.DESCENDING)
            glyph3 = GlyphCodes.PunctumQuadratumDesLiquescent;
        else
            glyph3 = GlyphCodes.PunctumQuadratum;

        this.build(ctxt)
            .noteAt(note1, glyph1)
            .noteAt(note2, GlyphCodes.PunctumQuadratum)
            .noteAt(note3, glyph3);

        this.finishLayout(ctxt);
    }
}

/*
 * TorculusResupinus
 */
export class TorculusResupinus extends Neume {

    positionMarkings() {
        this.positionPorrectusMarkings(this.notes[1], this.notes[2], this.notes[3]);
        this.positionClivisEpisemata(this.notes[1], this.notes[0]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var first = this.notes[0];
        var second = this.notes[1];
        var third = this.notes[2];
        var fourth = this.notes[3];

        var firstGlyph, fourthGlyph;

        if (first.liquescent === LiquescentTypes.INITIO_DEBILIS) {
            firstGlyph = GlyphCodes.TerminatingDesLiquescent;
        } else if (first.shape === NoteShapes.QUILISMA)
            firstGlyph = GlyphCodes.Quilisma;
        else
            firstGlyph = GlyphCodes.PunctumQuadratum;

        if (fourth.liquescent & LiquescentTypes.SMALL)
            fourthGlyph = GlyphCodes.TerminatingAscLiquescent;
        else if (third.liquescent & LiquescentTypes.DESCENDING)
            fourthGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;
        else
            fourthGlyph = GlyphCodes.PodatusUpper;

        this.build(ctxt)
            .noteAt(first, firstGlyph)
            .withPorrectusSwash(second, third)
            .noteAt(fourth, fourthGlyph);

        this.finishLayout(ctxt);
    }
}

/*
 * TorculusResupinusFlexus
 */
export class TorculusResupinusFlexus extends Neume {

    positionMarkings() {
        this.positionPorrectusFlexusMarkings(this.notes[1], this.notes[2], this.notes[3], this.notes[4]);
        this.positionClivisEpisemata(this.notes[1], this.notes[0]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var first = this.notes[0];
        var second = this.notes[1];
        var third = this.notes[2];
        var fourth = this.notes[3];
        var fifth = this.notes[4];

        var firstGlyph, fourthGlyph = GlyphCodes.PunctumQuadratum, fifthGlyph;

        if (first.liquescent === LiquescentTypes.INITIO_DEBILIS) {
            firstGlyph = GlyphCodes.TerminatingDesLiquescent;
        } else if (first.shape === NoteShapes.QUILISMA)
            firstGlyph = GlyphCodes.Quilisma;
        else
            firstGlyph = GlyphCodes.PunctumQuadratum;

        if (fifth.liquescent & LiquescentTypes.SMALL) {
            fourthGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;
            fifthGlyph = GlyphCodes.TerminatingDesLiquescent;
        } else if (fifth.liquescent & LiquescentTypes.ASCENDING)
            fifthGlyph = GlyphCodes.PunctumQuadratumAscLiquescent;
        else if (fifth.liquescent & LiquescentTypes.DESCENDING)
            fifthGlyph = GlyphCodes.PunctumQuadratumDesLiquescent;
        else
            fifthGlyph = GlyphCodes.PunctumQuadratum;

        this.build(ctxt)
            .noteAt(first, firstGlyph)
            .withPorrectusSwash(second, third)
            .noteAt(fourth, fourthGlyph)
            .noteAt(fifth, fifthGlyph);

        this.finishLayout(ctxt);
    }
}

/*
 * Tristropha
 *
 * For simplicity in implementation, Tristropha's have three notes in the object
 * structure. These technically must be the same pitch though (like the
 * Distropha and Bivirga).
 */
export class Tristropha extends Neume {

    positionMarkings() {
        this.positionEpisemataAbove(this.notes[0]);
        this.positionEpisemataAbove(this.notes[1]);
        this.positionEpisemataAbove(this.notes[2]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt)
            .noteAt(this.notes[0], Apostropha.getNoteGlyphCode(this.notes[0]))
            .advanceBy(ctxt.intraNeumeSpacing)
            .noteAt(this.notes[1], Apostropha.getNoteGlyphCode(this.notes[1]))
            .advanceBy(ctxt.intraNeumeSpacing)
            .noteAt(this.notes[2], Apostropha.getNoteGlyphCode(this.notes[2]));

        this.finishLayout(ctxt);
    }
}

/*
 * Virga
 */
export class Virga extends Neume {

    positionMarkings() {
        this.positionEpisemataAbove(this.notes[0]);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt).virgaAt(this.notes[0]);

        this.finishLayout(ctxt);
    }
}
