//
// Author(s):
// Fr. Matthew Spencer, OSJ <mspencer@osjusa.org>
//
// Copyright (c) 2008-2016 Fr. Matthew Spencer, OSJ
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

import * as Exsurge from './Exsurge.Core.js'
import { QuickSvg, ChantLayoutElement, GlyphCode, GlyphVisualizer } from './Exsurge.Drawing.js'
import { Note, NoteShape } from './Exsurge.Chant.js'


// for positioning markings on notes
export var MarkingPositionHint = {
  Default:      0,
  Above:        1,
  Below:        2
};

export class AcuteAccent extends GlyphVisualizer {

  constructor(ctxt, note) {
    super(ctxt, GlyphCode.AcuteAccent);
    this.note = note;
    this.positionHint = MarkingPositionHint.Above;
  }

  performLayout(ctxt) {

    this.bounds.x += this.bounds.width / 2; // center on the note itself

    // this puts the acute accent either over the staff lines, or over the note if the
    // note is above the staff lines
    this.setStaffPosition(ctxt, Math.max(this.note.staffPosition + 1, 4));
  }
}

// for positioning markings on notes
export var HorizontalEpisemaAlignment = {
  Default:      0,
  Left:         1,
  Center:       2,
  Right:        3
};


/*
 * HorizontalEpisema
 *
 * A horizontal episema marking is it's own visualizer (that is, it implements createSvgFragment)
 */
export class HorizontalEpisema extends ChantLayoutElement {

  constructor(note) {
    super();

    this.note = note;
    
    this.positionHint = MarkingPositionHint.Default;
    this.terminating = false; // indicates if this episema should terminate itself or not
    this.alignment = HorizontalEpisemaAlignment.Default;
  }

  performLayout(ctxt) {

    // following logic helps to keep the episemata away from staff lines if they get too close

    var y = 0, step;
    var minDistanceAway = ctxt.staffInterval * 0.2; // min distance from neume
    var glyphCode = this.note.glyphVisualizer.glyphCode;
    
    if (this.positionHint === MarkingPositionHint.Below) {
      y = this.note.bounds.bottom() + minDistanceAway; // the highest the line could be at
      if (glyphCode === GlyphCode.None) // correction for episema under the second note of a porrectus
        y += ctxt.staffInterval;
      step = Math.ceil(y / ctxt.staffInterval);

      // if it's an odd step, that means we're on a staff line,
      // so we shift to between the staff line
      if (Math.abs(step % 2) === 1)
        step = step + 0.5;
    } else {
      y = this.note.bounds.y - minDistanceAway; // the lowest the line could be at
      step = Math.floor(y / ctxt.staffInterval);

      // if it's an odd step, that means we're on a staff line,
      // so we shift to between the staff line
      if (Math.abs(step % 2) === 1)
        step = step - 0.5;
    }

    y = step * ctxt.staffInterval;

    var width;
    var x = this.note.bounds.x;

    // The porrectus requires special handling of the note width,
    // otherwise the width is just that of the note itself
    if (glyphCode === GlyphCode.Porrectus1 ||
        glyphCode === GlyphCode.Porrectus2 ||
        glyphCode === GlyphCode.Porrectus3 ||
        glyphCode === GlyphCode.Porrectus4)
      width = ctxt.staffInterval;
    else if (glyphCode === GlyphCode.None) {
      width = ctxt.staffInterval;
      x -= width;
    } else {
      width = this.note.bounds.width;
    }

    // also, the position hint can affect the x/width of the episema
    if (this.alignment === HorizontalEpisemaAlignment.Left) {
      width *= .80;
    } else if (this.alignment === HorizontalEpisemaAlignment.Center) {
      x += width * .10;
      width *= .80;
    } else if (this.alignment === HorizontalEpisemaAlignment.Right) {
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
    super(ctxt, GlyphCode.VerticalEpisemaAbove);
    this.note = note;
    this.positionHint = MarkingPositionHint.Default;
  }

  performLayout(ctxt) {

    var glyphCode = this.note.glyphVisualizer.glyphCode;
    // we have to place the ictus futher from the note in some cases to avoid a collision with an episema on the same note:
    var staffPosition = this.note.staffPosition;
    var positionHint = this.positionHint || MarkingPositionHint.Below;
    var placeFurtherFromNote = (this.note.episemata.length > 0 && (this.note.episemata[0].positionHint || MarkingPositionHint.Above) === positionHint);
    var horizontalOffset;
    var verticalOffset = 1;
    var shortOffset = 0.8;

    // The porrectus requires special handling of the note width,
    // otherwise the width is just that of the note itself
    if (glyphCode === GlyphCode.Porrectus1 ||
        glyphCode === GlyphCode.Porrectus2 ||
        glyphCode === GlyphCode.Porrectus3 ||
        glyphCode === GlyphCode.Porrectus4)
      horizontalOffset = ctxt.staffInterval / 2;
    else if (glyphCode === GlyphCode.None) {
      horizontalOffset = -ctxt.staffInterval / 2;
    } else {
      horizontalOffset = this.note.bounds.width / 2;
      if (glyphCode === GlyphCode.PunctumInclinatum && staffPosition % 2 && !placeFurtherFromNote) {
        placeFurtherFromNote = 0.2;
      }
    }

    if (this.positionHint === MarkingPositionHint.Above) {
      glyphCode = GlyphCode.VerticalEpisemaAbove;
      verticalOffset *= -1;
    } else {
      glyphCode = GlyphCode.VerticalEpisemaBelow;
    }
    if (placeFurtherFromNote === true) {
      placeFurtherFromNote = 0.4;
    } else if (placeFurtherFromNote === false) {
      placeFurtherFromNote = 0;
    }
    verticalOffset *= ctxt.staffInterval * (placeFurtherFromNote + ((staffPosition % 2)? shortOffset : 1.3));

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
    super(ctxt, GlyphCode.Mora);
    this.note = note;
    this.positionHint = MarkingPositionHint.Default;
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
          } else if (this.note.shape !== NoteShape.Inclinatum) {
            this.note.neume.trailingSpace += this.origin.x;
          }
        }
      }
    }

    if (this.positionHint === MarkingPositionHint.Above) {
      if (staffPosition % 2 === 0)
        verticalOffset -= ctxt.staffInterval * 1.75;
      else
        verticalOffset -= ctxt.staffInterval * .75;
    } else if (this.positionHint === MarkingPositionHint.Below) {
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

// indicates the shape of the brace
export var BraceShape = {
  RoundBrace: 0,
  CurlyBrace: 1,
  AccentedCurlyBrace: 2
};

// indicates how the brace is alignerd to the note to which it's connected
export var BraceAttachment = {
  Left: 0,
  Right: 1
};


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
    if (this.attachment === BraceAttachment.Left)
      return (note.neume? note.neume.bounds.x : 0) + note.bounds.x;
    else
      return (note.neume? note.neume.bounds.x : 0) + note.bounds.right();
  }
}