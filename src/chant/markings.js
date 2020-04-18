import { ChantLayoutElement, GlyphVisualizer } from 'elements/drawing';
import { GlyphCodes } from 'elements/elements.constants';
import { QuickSvg } from 'elements/drawing.util';
import {
    BraceAttachments,
    HorizontalEpisemaAlignments,
    MarkingPositionHints
} from 'chant/chant.constants';


export class AcuteAccent extends GlyphVisualizer {

    constructor(ctxt, note) {
        super(ctxt, GlyphCodes.AcuteAccent);
        this.note = note;
        this.positionHint = MarkingPositionHints.ABOVE;
    }

    performLayout(ctxt) {

        this.bounds.x += this.bounds.width / 2; // center on the note itself

        // this puts the acute accent either over the staff lines, or over the note if the
        // note is above the staff lines
        this.setStaffPosition(ctxt, Math.max(this.note.staffPosition + 1, 4));
    }
}


/*
 * HorizontalEpisema
 *
 * A horizontal episema marking is it's own visualizer (that is, it implements createSvgFragment)
 */
export class HorizontalEpisema extends ChantLayoutElement {

    constructor(note) {
        super();

        this.note = note;
    
        this.positionHint = MarkingPositionHints.DEFAULT;
        this.terminating = false; // indicates if this episema should terminate itself or not
        this.alignment = HorizontalEpisemaAlignments.DEFAULT;
    }

    performLayout(ctxt) {

        // following logic helps to keep the episemae away from staff lines if they get too close
        // the placement is based on a review of the Vatican and solesmes editions, which
        // seem to always place the epismata centered between staff lines. Probably helps
        // for visual layout, rather than letting epismata be at various heights.

        var y = 0, step;
        var minDistanceAway = ctxt.staffInterval * 0.4; // min distance from neume

        if (this.positionHint === MarkingPositionHints.BELOW) {
            y = this.note.bounds.bottom() + minDistanceAway; // the highest the line could be at
            step = Math.floor(y / ctxt.staffInterval);

            // if it's an odd step, that means we're on a staff line,
            // so we shift to between the staff line
            if (Math.abs(step % 2) === 1)
                step = step + 1;
        } else {
            y = this.note.bounds.y - minDistanceAway; // the lowest the line could be at
            step = Math.ceil(y / ctxt.staffInterval);

            // if it's an odd step, that means we're on a staff line,
            // so we shift to between the staff line
            if (Math.abs(step % 2) === 1)
                step = step - 1;
        }

        y = step * ctxt.staffInterval;

        var glyphCode = this.note.glyphVisualizer.glyphCode;
        var width;

        // The porrectus requires special handling of the note width,
        // otherwise the width is just that of the note itself
        if (glyphCode === GlyphCodes.Porrectus1 ||
        glyphCode === GlyphCodes.Porrectus2 ||
        glyphCode === GlyphCodes.Porrectus3 ||
        glyphCode === GlyphCodes.Porrectus4)
            width = ctxt.staffInterval;
        else
            width = this.note.bounds.width;

        var x = this.note.bounds.x;

        // also, the position hint can affect the x/width of the episema
        if (this.alignment === HorizontalEpisemaAlignments.LEFT) {
            width *= .80;
        } else if (this.alignment === HorizontalEpisemaAlignments.CENTER) {
            x += width * .20;
            width *= .60;
        } else if (this.alignment === HorizontalEpisemaAlignments.RIGHT) {
            x += width * .20;
            width *= .80;
        }

        this.bounds.x = x;
        this.bounds.y = y;
        this.bounds.width = width;
        this.bounds.height = ctxt.episemaLineWeight;

        this.origin.x = 0;
        this.origin.y = 0;
    }

    createSvgFragment(ctxt) {

        return QuickSvg.createFragment('rect', {
            'x': this.bounds.x,
            'y': this.bounds.y,
            'width': this.bounds.width,
            'height': this.bounds.height,
            'fill': ctxt.neumeLineColor,
            'class': 'horizontalEpisema'
        });
    }
}

/*
 * Ictus
 */
export class Ictus extends GlyphVisualizer {

    constructor(ctxt, note) {
        super(ctxt, GlyphCodes.VerticalEpisemaAbove);
        this.note = note;
        this.positionHint = MarkingPositionHints.DEFAULT;
    }

    performLayout(ctxt) {

        var glyphCode;

        // fixme: this positioning logic doesn't work for the ictus on a virga apparently...?

        if (this.positionHint === MarkingPositionHints.ABOVE) {
            glyphCode = GlyphCodes.VerticalEpisemaAbove;
        } else {
            glyphCode = GlyphCodes.VerticalEpisemaBelow;
        }

        var staffPosition = this.note.staffPosition;
    
        var horizontalOffset = this.note.bounds.width / 2;
        var verticalOffset = 0;

        switch (glyphCode) {
            case GlyphCodes.VerticalEpisemaAbove:
                if (staffPosition % 2 === 0)
                    verticalOffset -= ctxt.staffInterval * 1.5;
                else
                    verticalOffset -= ctxt.staffInterval * .9;
                break;

            case GlyphCodes.VerticalEpisemaBelow:
            default:
                if (staffPosition % 2 === 0)
                    verticalOffset += ctxt.staffInterval * 1.5;
                else
                    verticalOffset += ctxt.staffInterval * .8;
                break;
        }

        this.setGlyph(ctxt, glyphCode);
        this.setStaffPosition(ctxt, staffPosition);

        this.bounds.x =  this.note.bounds.x + horizontalOffset - this.origin.x;
        this.bounds.y += verticalOffset;
    }
}

/*
 * Mora
 */
export class Mora extends GlyphVisualizer {

    constructor(ctxt, note) {
        super(ctxt, GlyphCodes.Mora);
        this.note = note;
        this.positionHint = MarkingPositionHints.DEFAULT;
    }

    performLayout(ctxt) {

        var staffPosition = this.note.staffPosition;

        this.setStaffPosition(ctxt, staffPosition);

        var verticalOffset = 0;
        if (this.positionHint === MarkingPositionHints.ABOVE) {
            if (staffPosition % 2 === 0)
                verticalOffset -= ctxt.staffInterval + ctxt.staffInterval * .75;
            else
                verticalOffset -= ctxt.staffInterval * .75;
        } else if (this.positionHint === MarkingPositionHints.BELOW) {
            if (staffPosition % 2 === 0)
                verticalOffset += ctxt.staffInterval + ctxt.staffInterval * .75;
            else
                verticalOffset += ctxt.staffInterval * .75;
        } else {
            if (Math.abs(staffPosition) % 2 === 1)
                verticalOffset -= ctxt.staffInterval * .75;
        }

        this.bounds.x += this.note.bounds.right() + ctxt.staffInterval / 4.0;
        this.bounds.y += verticalOffset;
    }
}


export class BracePoint extends ChantLayoutElement {

    constructor(note, isAbove, shape, attachment) {
        super();

        this.note = note;
        this.isAbove = isAbove;
        this.shape = shape;
        this.attachment = attachment;
    }

    getAttachmentX() {
        if (this.attachment === BraceAttachments.LEFT)
            return this.note.neume.bounds.x + this.note.bounds.x;
        return this.note.neume.bounds.x + this.note.bounds.right();
    }
}
