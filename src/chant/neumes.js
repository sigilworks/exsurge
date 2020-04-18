import { Glyphs } from '../glyphs.constants';
import { GlyphCodes } from 'elements/elements.constants';
import {
    ChantNotationElement,
    NeumeLineVisualizer,
    VirgaLineVisualizer
} from 'elements/drawing';
import {
    LiquescentTypes,
    MarkingPositionHints,
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
    }

    // used to start a hanging line on the left of the next note
    lineFrom(note) {
        this.lastNote = note;
        this.lineIsHanging = true;

        return this;
    }

    // add a note, with a connecting line on the left if we have one
    noteAt(note, glyph, withLineTo = true) {

        if (!note)
            throw 'NeumeBuilder.noteAt: note must be a valid note';

        if (!glyph)
            throw 'NeumeBuilder.noteAt: glyph must be a valid glyph code';

        note.setGlyph(this.ctxt, glyph);
        var noteAlignsRight = note.glyphVisualizer.align === 'right';

        var needsLine = withLineTo && this.lastNote !== null &&
            (this.lineIsHanging ||
                this.lastNote.glyphVisualizer.align === 'right' ||
                Math.abs(this.lastNote.staffPosition - note.staffPosition) > 1);

        if (needsLine) {
            var line = new NeumeLineVisualizer(this.ctxt, this.lastNote, note, this.lineIsHanging);
            this.neume.addVisualizer(line);
            line.bounds.x = Math.max(0, this.x - line.bounds.width);

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

        var line;

        var upperGlyph;
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

    // lays out a sequence of notes that are inclinati (e.g., climacus, pes subpunctis)
    withInclinati(notes) {

        var staffPosition = notes[0].staffPosition, prevStaffPosition = notes[0].staffPosition;

        // it is important to advance by the width of the inclinatum glyph itself
        // rather than by individual note widths, so that any liquescents are spaced
        // the same as non-liquscents
        var advanceWidth = Glyphs.PunctumInclinatum.bounds.width * this.ctxt.glyphScaling;

        // now add all the punctum inclinati
        for (var i = 0; i < notes.length; i++, prevStaffPosition = staffPosition) {
            var note = notes[i];

            if (note.liquescent & LiquescentTypes.SMALL)
                note.setGlyph(this.ctxt, GlyphCodes.PunctumInclinatumLiquescent);
            else if (note.liquescent & LiquescentTypes.LARGE)
                // fixme: is the large inclinatum liquescent the same as the apostropha?
                note.setGlyph(this.ctxt, GlyphCodes.Stropha);
            else
                // fixme: some climaci in the new chant books end with a punctum quadratum
                // (see, for example, the antiphon 'Sancta Maria' for October 7).
                note.setGlyph(this.ctxt, GlyphCodes.PunctumInclinatum);

            staffPosition = note.staffPosition;

            // fixme: how do these calculations look for puncti inclinati based on staff position offsets?
            var multiple;
            switch (Math.abs(prevStaffPosition - staffPosition)) {
                case 0:
                    multiple = 1.1;
                    break;
                case 1:
                    multiple = 0.8;
                    break;
                default:
                    multiple = 1.2;
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
                this.lastNote.glyphVisualizer.align === 'right' ||
                Math.abs(this.lastNote.staffPosition - start.staffPosition) > 1);

        if (needsLine) {
            var line = new NeumeLineVisualizer(this.ctxt, this.lastNote, start, this.lineIsHanging);
            this.x = Math.max(0, this.x - line.bounds.width);
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

        // allow subclasses an opportunity to position their own markings...
        this.positionMarkings();

        // layout the markings of the notes
        for (var i = 0; i < this.notes.length; i++) {
            var note = this.notes[i];
            var j;

            for (j = 0; j < note.epismata.length; j++) {
                note.epismata[j].performLayout(ctxt);
                this.addVisualizer(note.epismata[j]);
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

    resetDependencies() {

    }

    build(ctxt) {
        return new NeumeBuilder(ctxt, this);
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
        var positionHint = MarkingPositionHints.ABOVE;

        // logic here is this: if first episema is default position, place it above.
        // then place the second one (if there is one) opposite of the first.
        for (var i = 0; i < this.notes[0].epismata.length; i++) {
            if (this.notes[0].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[0].epismata[i].positionHint = positionHint;
            else
                positionHint = this.notes[0].epismata[i].positionHint;

            // now place the next one in the opposite position
            positionHint = (positionHint === MarkingPositionHints.ABOVE) ? MarkingPositionHints.BELOW : MarkingPositionHints.ABOVE;
        }
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var y = ctxt.calculateHeightFromStaffPosition(4);

        this.build(ctxt).noteAt(this.notes[0], Apostropha.getNoteGlyphCode(this.notes[0]));

        this.finishLayout(ctxt);
    }

    static getNoteGlyphCode(note) {

        if (note.shape === NoteShapes.STROPHA)
            return GlyphCodes.Stropha;

        if (note.liquescent !== LiquescentTypes.NONE)
            return GlyphCodes.StrophaLiquescent;

        if (note.shapeModifiers & NoteShapeModifiers.CAVUM)
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
        var marking, i, j;

        for (i = 0; i < this.notes.length; i++) {
            var positionHint = MarkingPositionHints.ABOVE;

            // logic here is this: if first episema is default position, place it above.
            // then place the second one (if there is one) opposite of the first.
            for (j = 0; j < this.notes[i].epismata.length; j++) {
                if (this.notes[i].epismata[j].positionHint === MarkingPositionHints.DEFAULT)
                    this.notes[i].epismata[j].positionHint = positionHint;
                else
                    positionHint = this.notes[i].epismata[j].positionHint;

                // now place the next one in the opposite position
                positionHint = (positionHint === MarkingPositionHints.ABOVE) ? MarkingPositionHints.BELOW : MarkingPositionHints.ABOVE;
            }
        }
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
        var marking, i, j;

        for (i = 0; i < this.notes.length; i++) {
            var positionHint = MarkingPositionHints.ABOVE;

            // logic here is this: if first episema is default position, place it above.
            // then place the second one (if there is one) opposite of the first.
            for (j = 0; j < this.notes[i].epismata.length; j++) {
                if (this.notes[i].epismata[j].positionHint === MarkingPositionHints.DEFAULT)
                    this.notes[i].epismata[j].positionHint = positionHint;
                else
                    positionHint = this.notes[i].epismata[j].positionHint;

                // now place the next one in the opposite position
                positionHint = (positionHint === MarkingPositionHints.ABOVE) ? MarkingPositionHints.BELOW : MarkingPositionHints.ABOVE;
            }
        }
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
            for (var j = 0; j < this.notes[i].epismata.length; j++) {
                var mark = this.notes[i].epismata[j];

                if (mark.positionHint === MarkingPositionHints.DEFAULT)
                    mark.positionHint = MarkingPositionHints.ABOVE;
            }
        }
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt)
            .virgaAt(this.notes[0])
            .advanceBy(ctxt.intraNeumeSpacing / 2)
            .withInclinati(this.notes.slice(1));

        this.finishLayout(ctxt);
    }
}

/*
 * Clivis
 */
export class Clivis extends Neume {

    positionMarkings() {

        var hasLowerMora = false;
        var mark, i;

        // 1. morae need to be lined up if both notes have morae
        // 2. like the podatus, mora on lower note needs to below
        //    under certain circumstances
        for (i = 0; i < this.notes[1].morae.length; i++) {
            mark = this.notes[1].morae[i];

            if (this.notes[0].staffPosition - this.notes[1].staffPosition === 1 &&
                Math.abs(this.notes[1].staffPosition % 2) === 1)
                mark.positionHint = MarkingPositionHints.BELOW;
        }

        for (i = 0; i < this.notes[0].morae.length; i++) {

            if (hasLowerMora) {
                mark = this.notes[0].morae[i];
                mark.positionHint = MarkingPositionHints.ABOVE;
                mark.horizontalOffset += this.notes[1].bounds.right() - this.notes[0].bounds.right();
            }
        }

        for (i = 0; i < this.notes[0].epismata.length; i++) {
            mark = this.notes[0].epismata[i];

            if (mark.positionHint === MarkingPositionHints.DEFAULT)
                mark.positionHint = MarkingPositionHints.ABOVE;
        }

        for (i = 0; i < this.notes[1].epismata.length; i++) {
            mark = this.notes[1].epismata[i];

            if (mark.positionHint === MarkingPositionHints.DEFAULT)
                mark.positionHint = MarkingPositionHints.ABOVE;
        }
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

        for (var i = 0; i < this.notes.length; i++) {
            var positionHint = MarkingPositionHints.ABOVE;

            // logic here is this: if first episema is default position, place it above.
            // then place the second one (if there is one) opposite of the first.
            for (var j = 0; j < this.notes[i].epismata.length; j++) {
                if (this.notes[i].epismata[j].positionHint === MarkingPositionHints.DEFAULT)
                    this.notes[i].epismata[j].positionHint = positionHint;
                else
                    positionHint = this.notes[i].epismata[j].positionHint;

                // now place the next one in the opposite position
                positionHint = (positionHint === MarkingPositionHints.ABOVE) ? MarkingPositionHints.BELOW : MarkingPositionHints.ABOVE;
            }
        }
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
 * ORISCUS
 */
export class Oriscus extends Neume {

    positionMarkings() {
        var positionHint = MarkingPositionHints.ABOVE;

        // logic here is this: if first episema is default position, place it above.
        // then place the second one (if there is one) opposite of the first.
        for (var i = 0; i < this.notes[0].epismata.length; i++) {
            if (this.notes[0].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[0].epismata[i].positionHint = positionHint;
            else
                positionHint = this.notes[0].epismata[i].positionHint;

            // now place the next one in the opposite position
            positionHint = (positionHint === MarkingPositionHints.ABOVE) ? MarkingPositionHints.BELOW : MarkingPositionHints.ABOVE;
        }
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        // determine the glyph to use
        var note = this.notes[0];
        var glyph;

        if (note.liquescent !== LiquescentTypes.NONE) {
            glyph = GlyphCodes.OriscusLiquescent;
        } else {
            if (note.shapeModifiers & NoteShapeModifiers.ASCENDING)
                glyph = GlyphCodes.OriscusAsc;
            else if (note.shapeModifiers & NoteShapeModifiers.DESCENDING)
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
        if (this.notes[0].shapeModifiers & NoteShapeModifiers.ASCENDING ||
            this.notes[0].shapeModifiers & NoteShapeModifiers.DESCENDING)
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

        var lowerGlyph, upperGlyph;

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
        else if (upper.liquescent === LiquescentTypes.LARGE_DESCENDING)
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

    performLayout(ctxt) {
        super.performLayout(ctxt);

        // podatus followed by inclinati
        this.build(ctxt)
            .withPodatus(this.notes[0], this.notes[1])
            .advanceBy(ctxt.intraNeumeSpacing / 2)
            .withInclinati(this.notes.slice(2));

        this.finishLayout(ctxt);
    }
}

/*
 * Podatus
 *
 * This podatus class handles a few neume types actually, depending on the note
 * data: Podatus (including various liquescent types on the upper note),
 * Podatus initio debilis, and QUILISMA-Pes
 */
export class Podatus extends Neume {

    positionMarkings() {
        var marking, i;

        // 1. episema on lower note by default be below, upper note above
        // 2. morae:
        //   a. if podatus difference is 1 and lower note is on a line,
        //      the lower mora should be below
        for (i = 0; i < this.notes[0].epismata.length; i++)
            if (this.notes[0].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[0].epismata[i].positionHint = MarkingPositionHints.BELOW;

        // if this note has two or more (!?) morae then we just leave them be
        // since they have already been assigned position hints.
        if (this.notes[0].morae.length < 2) {
            for (i = 0; i < this.notes[0].morae.length; i++) {
                marking = this.notes[0].morae[i];

                if ((this.notes[1].staffPosition - this.notes[0].staffPosition) === 1 &&
                    Math.abs(this.notes[0].staffPosition % 2) === 1)
                    marking.positionHint = MarkingPositionHints.BELOW;
            }
        }

        for (i = 0; i < this.notes[1].epismata.length; i++)
            if (this.notes[1].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[1].epismata[i].positionHint = MarkingPositionHints.ABOVE;
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

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt).withInclinati(this.notes);

        this.finishLayout(ctxt);
    }
}

/*
 * Punctum
 */
export class Punctum extends Neume {

    positionMarkings() {
        var marking, i;
        var positionHint = MarkingPositionHints.ABOVE;

        // logic here is this: if first episema is default position, place it above.
        // then place the second one (if there is one) opposite of the first.
        for (i = 0; i < this.notes[0].epismata.length; i++) {
            if (this.notes[0].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[0].epismata[i].positionHint = positionHint;
            else
                positionHint = this.notes[0].epismata[i].positionHint;

            // now place the next one in the opposite position
            positionHint = (positionHint === MarkingPositionHints.ABOVE) ? MarkingPositionHints.BELOW : MarkingPositionHints.ABOVE;
        }
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

            if (note.shapeModifiers & NoteShapeModifiers.CAVUM)
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
        var marking, i, j;

        // by default place episema below
        // fixme: is this correct?
        for (i = 0; i < this.notes.length; i++)
            for (j = 0; j < this.notes[i].epismata.length; j++)
                if (this.notes[i].epismata[j].positionHint === MarkingPositionHints.DEFAULT)
                    this.notes[i].epismata[j].positionHint = MarkingPositionHints.BELOW;
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var first = this.notes[0];
        var second = this.notes[1];
        var third = this.notes[2];

        var builder = this.build(ctxt).noteAt(first, GlyphCodes.PunctumQuadratum);

        // if the next note doesn't require a stem connector, then add a tad bit
        // of spacing here
        if (!(second.shapeModifiers & NoteShapeModifiers.STEMMED))
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
        var marking, i, j;

        // by default place episema below
        // fixme: is this correct?
        for (i = 0; i < this.notes.length; i++)
            for (j = 0; j < this.notes[i].epismata.length; j++)
                if (this.notes[i].epismata[j].positionHint === MarkingPositionHints.DEFAULT)
                    this.notes[i].epismata[j].positionHint = MarkingPositionHints.BELOW;
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
        if (!(second.shapeModifiers & NoteShapeModifiers.STEMMED))
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
        var marking, i;

        // by default place first note epismata below
        for (i = 0; i < this.notes[0].epismata.length; i++)
            if (this.notes[0].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[0].epismata[i].positionHint = MarkingPositionHints.BELOW;

        var positionHint = this.notes[2].shape === NoteShapes.VIRGA ? MarkingPositionHints.ABOVE : MarkingPositionHints.BELOW;
        for (i = 0; i < this.notes[1].epismata.length; i++)
            if (this.notes[1].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[1].epismata[i].positionHint = positionHint;

        // by default place third note epismata above
        for (i = 0; i < this.notes[2].epismata.length; i++)
            if (this.notes[2].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[2].epismata[i].positionHint = MarkingPositionHints.ABOVE;
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
                .noteAt(first, GlyphCodes.PunctumQuadratum)
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
        var marking, i;

        // by default place first note epismata below
        for (i = 0; i < this.notes[0].epismata.length; i++)
            if (this.notes[0].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[0].epismata[i].positionHint = MarkingPositionHints.BELOW;

        var positionHint = this.notes[2].shape === NoteShapes.VIRGA ? MarkingPositionHints.ABOVE : MarkingPositionHints.BELOW;
        for (i = 0; i < this.notes[1].epismata.length; i++)
            if (this.notes[1].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[1].epismata[i].positionHint = positionHint;

        // by default place third note epismata above
        for (i = 0; i < this.notes[2].epismata.length; i++)
            if (this.notes[2].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[2].epismata[i].positionHint = MarkingPositionHints.ABOVE;

        // by default place fourth note epismata above
        for (i = 0; i < this.notes[3].epismata.length; i++)
            if (this.notes[3].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[3].epismata[i].positionHint = MarkingPositionHints.ABOVE;
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
        var marking, i;
        var hasMiddleEpisema = false;

        // first do the middle note to see if we should try to move
        // epismata on the other two lower notes
        for (i = 0; i < this.notes[1].epismata.length; i++) {
            marking = this.notes[1].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT) {
                marking.positionHint = MarkingPositionHints.ABOVE;
                hasMiddleEpisema = true;
            }
        }

        // 1. episema on lower notes should be below, upper note above
        // 2. morae: fixme: implement
        for (i = 0; i < this.notes[0].epismata.length; i++) {
            marking = this.notes[0].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT)
                marking.positionHint = hasMiddleEpisema ? MarkingPositionHints.ABOVE : MarkingPositionHints.BELOW;
        }

        for (i = 0; i < this.notes[2].epismata.length; i++) {
            marking = this.notes[2].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT)
                marking.positionHint = hasMiddleEpisema ? MarkingPositionHints.ABOVE : MarkingPositionHints.BELOW;
        }
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
        var marking, i;
        var hasMiddleEpisema = false;

        // first do the middle note to see if we should try to move
        // epismata on the other two lower notes
        for (i = 0; i < this.notes[1].epismata.length; i++) {
            marking = this.notes[1].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT) {
                marking.positionHint = MarkingPositionHints.ABOVE;
                hasMiddleEpisema = true;
            }
        }

        // 1. episema on lower notes should be below, upper note above
        // 2. morae: fixme: implement
        for (i = 0; i < this.notes[0].epismata.length; i++) {
            marking = this.notes[0].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT)
                marking.positionHint = hasMiddleEpisema ? MarkingPositionHints.ABOVE : MarkingPositionHints.BELOW;
        }

        for (i = 0; i < this.notes[2].epismata.length; i++) {
            marking = this.notes[2].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT)
                marking.positionHint = hasMiddleEpisema ? MarkingPositionHints.ABOVE : MarkingPositionHints.BELOW;
        }

        for (i = 0; i < this.notes[3].epismata.length; i++) {
            marking = this.notes[3].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT)
                marking.positionHint = MarkingPositionHints.ABOVE;
        }
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
        var marking, i;
        var hasMiddleEpisema = false;

        // first do the middle note to see if we should try to move
        // epismata on the other two lower notes
        for (i = 0; i < this.notes[1].epismata.length; i++) {
            marking = this.notes[1].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT) {
                marking.positionHint = MarkingPositionHints.ABOVE;
                hasMiddleEpisema = true;
            }
        }

        // 1. episema on lower notes should be below, upper note above
        // 2. morae: fixme: implement
        for (i = 0; i < this.notes[0].epismata.length; i++) {
            marking = this.notes[0].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT)
                marking.positionHint = hasMiddleEpisema ? MarkingPositionHints.ABOVE : MarkingPositionHints.BELOW;
        }

        for (i = 0; i < this.notes[2].epismata.length; i++) {
            marking = this.notes[2].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT)
                marking.positionHint = hasMiddleEpisema ? MarkingPositionHints.ABOVE : MarkingPositionHints.BELOW;
        }

        for (i = 0; i < this.notes[3].epismata.length; i++) {
            marking = this.notes[3].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT)
                marking.positionHint = MarkingPositionHints.ABOVE;
        }

        for (i = 0; i < this.notes[4].epismata.length; i++) {
            marking = this.notes[4].epismata[i];

            if (marking.positionHint === MarkingPositionHints.DEFAULT)
                marking.positionHint = MarkingPositionHints.ABOVE;
        }
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
        var marking, i, j;

        for (i = 0; i < this.notes.length; i++) {
            var positionHint = MarkingPositionHints.ABOVE;

            // logic here is this: if first episema is default position, place it above.
            // then place the second one (if there is one) opposite of the first.
            for (j = 0; j < this.notes[i].epismata.length; j++) {
                if (this.notes[i].epismata[j].positionHint === MarkingPositionHints.DEFAULT)
                    this.notes[i].epismata[j].positionHint = positionHint;
                else
                    positionHint = this.notes[i].epismata[j].positionHint;

                // now place the next one in the opposite position
                positionHint = (positionHint === MarkingPositionHints.ABOVE) ? MarkingPositionHints.BELOW : MarkingPositionHints.ABOVE;
            }
        }
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
 * VIRGA
 */
export class Virga extends Neume {

    positionMarkings() {
        var positionHint = MarkingPositionHints.ABOVE;

        // logic here is this: if first episema is default position, place it above.
        // then place the second one (if there is one) opposite of the first.
        for (var i = 0; i < this.notes[0].epismata.length; i++) {
            if (this.notes[0].epismata[i].positionHint === MarkingPositionHints.DEFAULT)
                this.notes[0].epismata[i].positionHint = positionHint;
            else
                positionHint = this.notes[0].epismata[i].positionHint;

            // now place the next one in the opposite position
            positionHint = (positionHint === MarkingPositionHints.ABOVE) ? MarkingPositionHints.BELOW : MarkingPositionHints.ABOVE;
        }
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.build(ctxt).virgaAt(this.notes[0]);

        this.finishLayout(ctxt);
    }
}
