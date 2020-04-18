import { Steps } from '../core';
import { GlyphCodes } from 'elements/elements.constants';
import { AccidentalTypes } from 'chant/chant.constants';
import {
    ChantNotationElement,
    DividerLineVisualizer,
    GlyphVisualizer
} from 'elements/drawing';

/*
 *
 */
export class Custos extends ChantNotationElement {

    // if auto is true, then the custos will automatically try to determine it's height based on
    // subsequent notations
    constructor(auto = false) {
        super();
        this.auto = auto;
        this.staffPosition = 0; // default sane value
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        if (this.auto) {

            var neume = ctxt.findNextNeume();

            if (neume)
                this.staffPosition = ctxt.activeClef.pitchToStaffPosition(neume.notes[0].pitch);

            // in case there was a weird fa/do clef change, let's sanitize the staffPosition by making sure it is
            // within reasonable bounds
            while (this.staffPosition < -6)
                this.staffPosition += 7;

            while (this.staffPosition > 6)
                this.staffPosition -= 7;
        }

        var glyph = new GlyphVisualizer(ctxt, Custos.getGlyphCode(this.staffPosition));
        glyph.setStaffPosition(ctxt, this.staffPosition);
        this.addVisualizer(glyph);

        this.finishLayout(ctxt);
    }

    // called when layout has changed and our dependencies are no longer good
    resetDependencies() {

        // we only need to resolve new dependencies if we're an automatic custos
        if (this.auto)
            this.needsLayout = true;
    }

    static getGlyphCode(staffPosition) {

        if (staffPosition <= 2) {

            // ascending custodes
            if (Math.abs(staffPosition) % 2 === 1)
                return GlyphCodes.CustosLong;
            else
                return GlyphCodes.CustosShort;
        } else {

            // descending custodes
            if (Math.abs(staffPosition) % 2 === 1)
                return GlyphCodes.CustosDescLong;
            else
                return GlyphCodes.CustosDescShort;
        }
    }
}

/*
 * Divider
 */
export class Divider extends ChantNotationElement {

    constructor() {
        super();

        this.isDivider = true;
        this.resetsAccidentals = true;
    }
}

/*
 * QuarterBar
 */
export class QuarterBar extends Divider {

    performLayout(ctxt) {
        super.performLayout(ctxt);
        this.addVisualizer(new DividerLineVisualizer(ctxt, 2, 4));

        this.origin.x = this.bounds.width / 2;

        this.finishLayout(ctxt);
    }
}

/*
 * HalfBar
 */
export class HalfBar extends Divider {

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.addVisualizer(new DividerLineVisualizer(ctxt, -2, 2));

        this.origin.x = this.bounds.width / 2;

        this.finishLayout(ctxt);
    }
}

/*
 * FullBar
 */
export class FullBar extends Divider {

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.addVisualizer(new DividerLineVisualizer(ctxt, -3, 3));

        this.origin.x = this.bounds.width / 2;

        this.finishLayout(ctxt);
    }
}

/*
 * DominicanBar
 */
export class DominicanBar extends Divider {

    constructor(staffPosition) {
        super();
        staffPosition--;
        var parity = staffPosition % 2;

        this.staffPosition = staffPosition - (2 * parity);
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);
        this.addVisualizer(new DividerLineVisualizer(ctxt, this.staffPosition - 3, this.staffPosition));

        this.origin.x = this.bounds.width / 2;

        this.finishLayout(ctxt);
    }
}

/*
 * DoubleBar
 */
export class DoubleBar extends Divider {

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var line0 = new DividerLineVisualizer(ctxt, -3, 3);
        line0.bounds.x = 0;
        this.addVisualizer(line0);

        var line1 = new DividerLineVisualizer(ctxt, -3, 3);
        line1.bounds.x = ctxt.intraNeumeSpacing * 2 - line1.bounds.width;
        this.addVisualizer(line1);

        this.origin.x = this.bounds.width / 2;

        this.finishLayout(ctxt);
    }
}

export const AccidentalType = {
    Flat: -1,
    Natural: 0,
    Sharp: 1
};

/*
 * Accidental
 */
export class Accidental extends ChantNotationElement {

    constructor(staffPosition, accidentalType) {
        super();
        this.isAccidental = true;
        this.keepWithNext = true; // accidentals should always stay connected...

        this.staffPosition = staffPosition;
        this.accidentalType = accidentalType;
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        this.addVisualizer(this.createGlyphVisualizer(ctxt));

        this.finishLayout(ctxt);
    }

    // creation of the glyph visualizer is refactored out or performLayout
    // so that clefs can use the same logic for their accidental glyph
    createGlyphVisualizer(ctxt) {

        var glyphCode = GlyphCodes.Flat;

        switch (this.accidentalType) {
            case AccidentalTypes.NATURAL:
                glyphCode = GlyphCodes.Natural;
                break;
            case AccidentalTypes.SHARP:
                glyphCode = GlyphCodes.Sharp;
                break;
            default:
                glyphCode = GlyphCodes.Flat;
                break;
        }

        var glyph = new GlyphVisualizer(ctxt, glyphCode);
        glyph.setStaffPosition(ctxt, this.staffPosition);

        return glyph;
    }

    adjustStep(step) {
        switch (this.accidentalType) {
            case AccidentalTypes.FLAT:
                if (step === Steps.Ti) return Steps.Te;
                if (step === Steps.Mi) return Steps.Me;
                break;
            case AccidentalTypes.SHARP:
                if (step === Steps.Do) return Steps.Du;
                if (step === Steps.Fa) return Steps.Fu;
                break;
            case AccidentalTypes.NATURAL:
                if (step === Steps.Te) return Steps.Ti;
                if (step === Steps.Me) return Steps.Mi;
                if (step === Steps.Du) return Steps.Do;
                if (step === Steps.Fu) return Steps.Fa;
                break;
        }

        // no adjustment needed
        return step;
    }

    applyToPitch(pitch) {

        // no adjusment needed
        if (this.pitch.octave !== pitch.octave)
            return;

        pitch.step = this.adjustStep(pitch.step);
    }
}

/*
 * Virgula
 */
export class Virgula extends Divider {

    constructor() {
        super();

        // unlike other dividers a virgula does not reset accidentals
        this.resetsAccidentals = false;

        // the staff position of the virgula is customizable, so that it
        // can be placed on different lines (top or bottom) depending on the
        // notation tradition of what is being notated (e.g., Benedictine has it
        //  on top line, Norbertine at the bottom)
        this.staffPosition = 3;
    }

    performLayout(ctxt) {
        super.performLayout(ctxt);

        var glyph = new GlyphVisualizer(ctxt, GlyphCodes.Virgula);
        glyph.setStaffPosition(ctxt, this.staffPosition);

        this.addVisualizer(glyph);

        this.origin.x = this.bounds.width / 2;

        this.finishLayout(ctxt);
    }
}
