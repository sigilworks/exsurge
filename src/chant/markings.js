import { ChantLayoutElement, GlyphVisualizer } from 'elements/drawing';
import { GlyphCodes } from 'elements/elements.constants';
import { QuickSvg } from 'elements/drawing.util';
import {
    BraceAttachments,
    HorizontalEpisemaAlignments,
    MarkingPositionHints,
    NoteShapes
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

        // following logic helps to keep the episemata away from staff lines if they get too close

        var y = 0, step;
        var minDistanceAway = ctxt.staffInterval * 0.25; // min distance from neume
        var glyphCode = this.note.glyphVisualizer.glyphCode;
        var ledgerLine = this.note.neume.ledgerLines[0] || {};
        var punctumInclinatumShorten = false;

        if(glyphCode === GlyphCodes.PunctumInclinatum) {
            let notes = this.note.neume.notes,
                index = notes.indexOf(this.note),
                prevNote = notes[index - 1];
            if(prevNote && prevNote.glyphVisualizer.glyphCode === GlyphCodes.PunctumInclinatum && (prevNote.staffPosition - this.note.staffPosition) === 1) {
                punctumInclinatumShorten = true;
            }
        }

        if (this.positionHint === MarkingPositionHints.BELOW) {
            y = this.note.bounds.bottom() + minDistanceAway; // the highest the line could be at
            if (glyphCode === GlyphCodes.None) // correction for episema under the second note of a porrectus
                y += ctxt.staffInterval / 2;
            step = Math.ceil(y / ctxt.staffInterval);
            // if there's enough space, center the episema between the punctum and the next staff line
            if(step % 2 === 0) {
                step = (step + 3/4 + ((y - minDistanceAway) / ctxt.staffInterval)) / 2;
            } else {
                // otherwise, find nearest acceptable third between staff lines (or staff line)
                step = (Math.ceil((1.5 * y / ctxt.staffInterval) - 0.5) * 2 + 1) / 3;

                // if it's an odd step, that means we're on a staff line,
                // so we shift to between the staff line
                if (Math.abs(step) % 2 === 1) {
                    if (Math.abs(step) < 4 || ledgerLine.staffPosition === -step) {
                        step += 2/3;
                    } else {
                        // no ledger line, but we don't want the episema to be at exactly the same height the ledger line would occupy:
                        step += 1/3;
                    }
                }
            }
        } else {
            y = this.note.bounds.y - minDistanceAway; // the lowest the line could be at
            step = Math.floor(y / ctxt.staffInterval);
            // if there's enough space, center the episema between the punctum and the next staff line
            if(step % 2 === 0) {
                step = (step - 3/4 + ((y + minDistanceAway) / ctxt.staffInterval)) / 2;
            } else {
                // otherwise, find nearest acceptable third between staff lines (or staff line)
                step = (Math.floor((1.5 * y / ctxt.staffInterval) - 0.5) * 2 + 1) / 3;

                // find nearest acceptable third between staff lines (or staff line)
                if (Math.abs(step) % 2 === 1) {
                    // if it was a staff line, we need to adjust
                    if (Math.abs(step) < 4 || ledgerLine.staffPosition === -step) {
                        step -= 2/3;
                    } else {
                        // no ledger line, but we don't want the episema to be at exactly the same height the ledger line would occupy:
                        step -= 1/3;
                    }
                }
            }
        }

        y = step * ctxt.staffInterval;

        var width = this.note.bounds.width;
        var x = this.note.bounds.x;

        // The porrectus requires special handling of the note width,
        // otherwise the width is just that of the note itself
        if (glyphCode === GlyphCodes.Porrectus1 ||
            glyphCode === GlyphCodes.Porrectus2 ||
            glyphCode === GlyphCodes.Porrectus3 ||
            glyphCode === GlyphCodes.Porrectus4)
            width = ctxt.staffInterval;
        else if (glyphCode === GlyphCodes.None) {
            width = ctxt.staffInterval;
            x -= width;
        } else if(punctumInclinatumShorten) {
            width *= 2/3;
            x += 0.5 * width;
        } else if(glyphCode === GlyphCodes.PunctumInclinatumLiquescent) {
            width *= 2/3;
            x += 0.25 * width;
        }

        // also, the position hint can affect the x/width of the episema
        if (this.alignment === HorizontalEpisemaAlignments.LEFT) {
            width *= .80;
        } else if (this.alignment === HorizontalEpisemaAlignments.CENTER) {
            x += width * .10;
            width *= .80;
        } else if (this.alignment === HorizontalEpisemaAlignments.RIGHT) {
            x += width * .20;
            width *= .80;
        }

        this.bounds.x = x;
        this.bounds.y = y - ctxt.episemaLineWeight / 2;
        this.bounds.width = width;
        this.bounds.height = ctxt.episemaLineWeight;

        this.origin.x = 0;
        this.origin.y = 0;
    }

    draw(ctxt) {
        var canvasCtxt = ctxt.canvasCtxt;

        canvasCtxt.fillStyle = ctxt.neumeLineColor;

        canvasCtxt.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    }

    createSvgNode(ctxt) {

        return QuickSvg.createNode('rect', {
            'x': this.bounds.x,
            'y': this.bounds.y,
            'width': this.bounds.width,
            'height': this.bounds.height,
            'fill': ctxt.neumeLineColor,
            'class': 'horizontalEpisema'
        });
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

        var glyphCode = this.note.glyphVisualizer.glyphCode;
        // we have to place the ictus further from the note in some cases to avoid a collision with an episema on the same note:
        var positionHint = this.positionHint || MarkingPositionHints.BELOW;
        var staffPosition = this.note.staffPosition + (positionHint === MarkingPositionHints.ABOVE? 1 : -1);
        var collisionWithEpisema = (this.note.episemata.length > 0 && (this.note.episemata[0].positionHint || MarkingPositionHints.ABOVE) === positionHint);
        var horizontalOffset;
        var verticalOffset = 1;
        var shortOffset = -0.2;
        var extraOffset = 0;
        var collisionWithStaffLine = (staffPosition % 2) && (Math.abs(staffPosition) < 4 || (this.note.neume.ledgerLines[0] || {}).staffPosition === staffPosition);

        // The porrectus requires special handling of the note width,
        // otherwise the width is just that of the note itself
        if (glyphCode === GlyphCodes.Porrectus1 ||
            glyphCode === GlyphCodes.Porrectus2 ||
            glyphCode === GlyphCodes.Porrectus3 ||
            glyphCode === GlyphCodes.Porrectus4)
            horizontalOffset = ctxt.staffInterval / 2;
        else if (glyphCode === GlyphCodes.None) {
            horizontalOffset = -ctxt.staffInterval / 2;
        } else {
            horizontalOffset = this.note.bounds.width / 2;
            if (glyphCode === GlyphCodes.PunctumInclinatum && !collisionWithStaffLine && !collisionWithEpisema) {
                extraOffset = 0.3;
            }
        }

        if (this.positionHint === MarkingPositionHints.ABOVE) {
            glyphCode = GlyphCodes.VerticalEpisemaAbove;
            verticalOffset *= -1;
        } else {
            glyphCode = GlyphCodes.VerticalEpisemaBelow;
        }
        if (collisionWithEpisema) {
            extraOffset = 0.4;
        }
        verticalOffset *= ctxt.staffInterval * (extraOffset + (collisionWithStaffLine? 0.3 : shortOffset));

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
        this.horizontalOffset = (ctxt.staffInterval / 2) + this.origin.x;
    }

    performLayout(ctxt) {

        var staffPosition = this.note.staffPosition;

        this.setStaffPosition(ctxt, staffPosition);

        var verticalOffset = 0;
        if(this.horizontalOffset === (ctxt.staffInterval / 2) + this.origin.x) {
            // First, we need to find the next note in the neume.
            var noteIndex = this.note.neume.notes.indexOf(this.note);
            var nextNote;
            if (noteIndex >= 0) {
                ++noteIndex;
                if (this.note.neume.notes.length > noteIndex) {
                    nextNote = this.note.neume.notes[noteIndex];
                    if(nextNote.bounds.right() > this.note.bounds.right()) {
                        // center the dot over the following note.
                        this.horizontalOffset = (nextNote.bounds.right() - this.note.bounds.right() - this.bounds.right()) / 2;
                    } else {
                        nextNote = null;
                    }
                } else if (this.note.neume.notes.length === noteIndex) {
                    // this note is the last in its neume:
                    if(this.note.neume.trailingSpace === 0) {
                        // if this was the last note in its neume, we only care about the next note if there is no trailing space at the end of this neume.
                        var notationIndex = this.note.neume.score.notations.indexOf(this.note.neume);
                        if (notationIndex >= 0) {
                            var nextNotation = this.note.neume.score.notations[notationIndex+1];
                            if (nextNotation && nextNotation.notes) {
                                nextNote = nextNotation.notes[0];
                            }
                        }
                    } else if (this.note.shape !== NoteShapes.INCLINATUM) {
                        this.note.neume.trailingSpace += this.origin.x;
                    }
                }
            }
        }

        if (this.positionHint === MarkingPositionHints.ABOVE) {
            if (staffPosition % 2 === 0)
                verticalOffset -= ctxt.staffInterval * 1.75;
            else
                verticalOffset -= ctxt.staffInterval * .75;
        } else if (this.positionHint === MarkingPositionHints.BELOW) {
            if (staffPosition % 2 === 0)
                verticalOffset += ctxt.staffInterval * 1.75;
            else
                verticalOffset += ctxt.staffInterval * .75;
        } else {
            if (staffPosition % 2 === 0) {
                // if the note is in a space and followed by a note on the line below, we often want to move the mora dot up slightly so that it is centered
                // between the top of the note's space and the top of the following note.
                if(nextNote && nextNote.staffPosition === staffPosition - 1) {
                    verticalOffset -= ctxt.staffInterval * .25;
                }
            } else {
                verticalOffset -= ctxt.staffInterval * .75;
            }
        }

        this.bounds.x += this.horizontalOffset + this.note.bounds.right();
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

    getAttachmentX(note) {
        if(!note) note = this.note;
        if (this.attachment === BraceAttachments.LEFT)
            return (note.neume? note.neume.bounds.x : 0) + note.bounds.x;
        else
            return (note.neume? note.neume.bounds.x : 0) + note.bounds.right();
    }
}
