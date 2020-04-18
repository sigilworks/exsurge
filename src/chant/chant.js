import {
    Pitch,
    Rect,
    Steps
} from '../core';
import {
    ChantLayoutElement,
    ChantNotationElement,
    GlyphVisualizer
} from 'elements/drawing';
import {
    AccidentalTypes,
    LiquescentTypes,
    NoteShapeModifiers,
    NoteShapes
} from 'chant/chant.constants';
import { GlyphCodes } from 'elements/elements.constants';



/**
 * @class
 */
export class Note extends ChantLayoutElement {

    /**
     * @para {Pitch} pitch
     */
    constructor(pitch) {
        super();

        if (typeof pitch !== 'undefined')
            this.pitch = pitch;
        else
            this.pitch = null;

        this.glyphVisualizer = null;

        // The staffPosition on a note is an integer that indicates the vertical position on the staff.
        // 0 is the center space on the staff (equivalent to gabc 'g'). Positive numbers go up
        // the staff, and negative numbers go down, i.e., 1 is gabc 'h', 2 is gabc 'i', -1 is gabc 'f', etc.
        this.staffPosition = 0;
        this.liquescent = LiquescentTypes.NONE;
        this.shape = NoteShapes.DEFAULT;
        this.shapeModifiers = NoteShapeModifiers.NONE;

        // notes keep track of the neume they belong to in order to facilitate layout
        // this.neume gets set when a note is added to a neume via Neume.addNote()
        this.neume = null;

        // various markings that can exist on a note, organized by type
        // for faster access and simpler code logic
        this.episemata = [];
        this.morae = []; // silly to have an array of these, but gabc allows multiple morae per note!

        // these are set on the note when they are needed, otherwise, they're undefined
        // this.ictus
        // this.accuteAccent
        // this.braceStart
        // this.braceEnd
    }

    setGlyph(ctxt, glyphCode) {
        if (this.glyphVisualizer)
            this.glyphVisualizer.setGlyph(ctxt, glyphCode);
        else
            this.glyphVisualizer = new GlyphVisualizer(ctxt, glyphCode);

        this.glyphVisualizer.setStaffPosition(ctxt, this.staffPosition);

        // assign glyphvisualizer metrics to this note
        this.bounds.x = this.glyphVisualizer.bounds.x;
        this.bounds.y = this.glyphVisualizer.bounds.y;
        this.bounds.width = this.glyphVisualizer.bounds.width;
        this.bounds.height = this.glyphVisualizer.bounds.height;

        this.origin.x = this.glyphVisualizer.origin.x;
        this.origin.y = this.glyphVisualizer.origin.y;
    }

    // a utility function for modifiers
    shapeModifierMatches(shapeModifier) {
        if (shapeModifier === NoteShapeModifiers.NONE)
            return this.shapeModifier === NoteShapeModifiers.NONE;
        else
            return this.shapeModifier & shapeModifier !== 0;
    }

    draw(ctxt) {

        this.glyphVisualizer.bounds.x = this.bounds.x;
        this.glyphVisualizer.bounds.y = this.bounds.y;

        this.glyphVisualizer.draw(ctxt);
    }

    createSvgNode(ctxt) {

        this.glyphVisualizer.bounds.x = this.bounds.x;
        this.glyphVisualizer.bounds.y = this.bounds.y;
        this.svgNode = this.glyphVisualizer.createSvgNode(ctxt, this);
        return this.svgNode;
    }

    createSvgFragment(ctxt) {

        this.glyphVisualizer.bounds.x = this.bounds.x;
        this.glyphVisualizer.bounds.y = this.bounds.y;
        return this.glyphVisualizer.createSvgFragment(ctxt, this);
    }
}


// TODO: where best to put this?
const DEFAULT_DO_CLEF = new DoClef(1, 2);

export class Clef extends ChantNotationElement {

    constructor(staffPosition, octave, defaultAccidental = null) {
        super();

        this.isClef = true;
        this.staffPosition = staffPosition;
        this.octave = octave;
        this.defaultAccidental = defaultAccidental;
        this.activeAccidental = defaultAccidental;
        this.keepWithNext = true;
    }

    resetAccidentals() {
        this.activeAccidental = this.defaultAccidental;
    }

    pitchToStaffPosition(pitch) {

    }

    performLayout(ctxt) {

        ctxt.activeClef = this;

        if (this.defaultAccidental)
            this.defaultAccidental.performLayout(ctxt);

        super.performLayout(ctxt);
    }

    finishLayout(ctxt) {

        // if we have a default accidental, then add a glyph for it now
        if (this.defaultAccidental) {
            var accidentalGlyph = this.defaultAccidental.createGlyphVisualizer(ctxt);
            accidentalGlyph.bounds.x += this.visualizers[0].bounds.right() + ctxt.intraNeumeSpacing;
            this.addVisualizer(accidentalGlyph);
        }

        super.finishLayout(ctxt);
    }

    static default() {
        return DEFAULT_DO_CLEF;
    }
}

export class DoClef extends Clef {

    constructor(staffPosition, octave, defaultAccidental = null) {
        super(staffPosition, octave, defaultAccidental);

        this.leadingSpace = 0.0;
    }

    pitchToStaffPosition(pitch) {
        return (pitch.octave - this.octave) * 7 + this.staffPosition +
            Pitch.stepToStaffOffset(pitch.step) -
            Pitch.stepToStaffOffset(Steps.Do);
    }

    staffPositionToPitch(staffPosition) {
        var offset = staffPosition - this.staffPosition;
        var octaveOffset = Math.floor(offset / 7);

        var step = Pitch.staffOffsetToStep(offset);

        if (this.activeAccidental && this.activeAccidental.staffPosition === staffPosition)
            step += this.activeAccidental.accidentalType;

        return new Pitch(step, this.octave + octaveOffset);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var glyph = new GlyphVisualizer(ctxt, GlyphCodes.DoClef);
        glyph.setStaffPosition(ctxt, this.staffPosition);
        this.addVisualizer(glyph);

        this.finishLayout(ctxt);
    }

    clone() {
        return new DoClef(this.staffPosition, this.octave, this.defaultAccidental);
    }
}

export class FaClef extends Clef {

    constructor(staffPosition, octave, defaultAccidental = null) {
        super(staffPosition, octave, defaultAccidental);

        this.octave = octave;

        this.leadingSpace = 0;
    }

    pitchToStaffPosition(pitch) {
        return (pitch.octave - this.octave) * 7 + this.staffPosition +
            Pitch.stepToStaffOffset(pitch.step) -
            Pitch.stepToStaffOffset(Steps.Fa);
    }

    staffPositionToPitch(staffPosition) {
        var offset = staffPosition - this.staffPosition + 3; // + 3 because it's a fa clef (3 == offset from Do)
        var octaveOffset = Math.floor(offset / 7);

        var step = Pitch.staffOffsetToStep(offset);

        if (this.activeAccidental && this.activeAccidental.staffPosition === staffPosition)
            step += this.activeAccidental.accidentalType;

        return new Pitch(step, this.octave + octaveOffset);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var glyph = new GlyphVisualizer(ctxt, GlyphCodes.FaClef);
        glyph.setStaffPosition(ctxt, this.staffPosition);
        this.addVisualizer(glyph);

        this.finishLayout(ctxt);
    }

    clone() {
        return new FaClef(this.staffPosition, this.octave, this.defaultAccidental);
    }
}

/*
 * TextOnly
 */
export class TextOnly extends ChantNotationElement {

    constructor() {
        super();
        this.trailingSpace = 0;
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        // add an empty glyph as a placeholder
        this.addVisualizer(new GlyphVisualizer(ctxt, GlyphCodes.None));

        this.origin.x = 0;
        this.origin.y = 0;

        this.finishLayout(ctxt);
    }
}

export class ChantLineBreak extends ChantNotationElement {

    constructor(justify) {
        super();

        this.justify = justify;
    }

    performLayout(ctxt) {

        // reset the bounds before doing a layout
        this.bounds = new Rect(0, 0, 0, 0);
    }

    clone() {
        var lb = new ChantLineBreak();
        lb.justify = this.justify;

        return lb;
    }
}
