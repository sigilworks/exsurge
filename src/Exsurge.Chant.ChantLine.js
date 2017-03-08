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

import * as Exsurge from 'Exsurge.Core'
import { Step, Pitch, Rect, Point, Margins } from 'Exsurge.Core'
import { QuickSvg, ChantLayoutElement, GlyphCode, GlyphVisualizer, RoundBraceVisualizer, CurlyBraceVisualizer, Lyric, LyricArray, DropCap } from 'Exsurge.Drawing'
import { ChantLineBreak, TextOnly } from 'Exsurge.Chant'
import { Glyphs } from 'Exsurge.Glyphs'
import { Custos, DoubleBar } from 'Exsurge.Chant.Signs'
import { MarkingPositionHint, HorizontalEpisemaAlignment, HorizontalEpisema, BraceShape, BracePoint } from 'Exsurge.Chant.Markings'


// a chant line represents one staff line on the page. ChantLines are created by the score
// and laid out by the page
export class ChantLine extends ChantLayoutElement {

  constructor(score) {
    super();

    this.score = score;

    this.notationsStartIndex = 0;
    this.numNotationsOnLine = 0;
    this.notationBounds = null; // Rect

    this.staffLeft = 0;
    this.staffRight = 0;

    this.startingClef = null; // necessary for the layout process
    this.custos = null;

    this.justify = true;

    // these are markings that exist at the chant line level rather than at the neume level.
    this.ledgerLines = [];
    this.braces = [];

    this.nextLine = null;
    this.previousLine = null; // for layout assistance

    this.lyricLineHeight = 0; // height of each text line
    this.lyricLineBaseline = 0; // offsets from the top of the text line to the baseline
    this.numLyricLines = 0; // maximum count of lyrics on the same syllable

    // fixme: make these configurable values from the score
    this.spaceAfterNotations = 0; // the space between the notation bounds and the first text track
    this.spaceBetweenTextTracks = 0; // spacing between each text track

    this.lastLyrics = [];
  }

  performLayout(ctxt) {

    // start off with a rectangle that holds at least the four staff lines
    // we fudge the 3 to 3.1 so that the svg doesn't crop off the upper/lower staff lines...
    this.notationBounds = new Rect(this.staffLeft, -3.1 * ctxt.staffInterval,
      this.staffRight - this.staffLeft, 6.2 * ctxt.staffInterval);

    // run through all the elements of the line and calculate the bounds of the notations,
    // as well as the bounds of each text track we will use
    var i;
    var notations = this.score.notations;
    var lastIndex = this.notationsStartIndex + this.numNotationsOnLine;
    var notation = null;

    this.notationBounds.union(this.startingClef.bounds);

    // reset the lyric line offsets before we [re]calculate them now
    this.lyricLineHeight = 0;
    this.lyricLineBaseline = 0;
    this.numLyricLines = 0;

    this.altLineHeight = 0;
    this.altLineBaseline = 0;
    this.numAltLines = 0;

    for (i = this.notationsStartIndex; i < lastIndex; i++) {
      notation = notations[i];

      this.notationBounds.union(notation.bounds);

      // keep track of lyric line offsets
      if(this.numLyricLines === 0 && notation.hasLyrics()) {
        if(notation.lyrics[0].bounds.height > this.lyricLineHeight) this.lyricLineHeight = notation.lyrics[0].bounds.height;
        if(notation.lyrics[0].origin.y > this.lyricLineBaseline) this.lyricLineBaseline = notation.lyrics[0].origin.y;
        if(notation.lyrics.length > this.numLyricLines) this.numLyricLines = notation.lyrics.length;
      }

      if(this.numAltLines === 0 && notation.alText) {
        if(notation.alText[0].bounds.height > this.altLineHeight) this.altLineHeight = notation.alText[0].bounds.height;
        if(notation.alText[0].origin.y > this.altLineBaseline) this.altLineBaseline = notation.alText[0].origin.y;
        if(notation.alText.length > this.numAltLines) this.numAltLines = notation.alText.length;        
      }
    }

    if (this.custos)
      this.notationBounds.union(this.custos.bounds);

    // add any braces to the notationBounds as well
    for (i = 0; i < this.braces.length; i++)
      this.notationBounds.union(this.braces[i].bounds);

    // finalize the lyrics placement
    for (i = this.notationsStartIndex; i < lastIndex; i++) {
      notation = notations[i];

      var offset = this.notationBounds.y + this.notationBounds.height;

      for (var j = 0; j < notation.lyrics.length; j++) {
        notation.lyrics[j].bounds.y = offset + this.lyricLineBaseline;
        offset += this.lyricLineHeight;
      }

      if(notation.alText) {
        offset = this.notationBounds.y;
        for (j = 0; j < notation.alText.length; j++) {
          offset -= this.altLineHeight;
          notation.alText[j].bounds.y = offset + this.altLineBaseline;
        }
      }
    }

    if(this.startingClef.hasLyrics()) {
      offset = this.notationBounds.y + this.notationBounds.height;
      for (j = 0; j < this.startingClef.lyrics.length; j++) {
        this.startingClef.lyrics[j].bounds.y = offset + this.lyricLineBaseline;
        offset += this.lyricLineHeight;
      }
    }

    // dropCap and the annotations
    if (this.notationsStartIndex === 0) {

      if (this.score.dropCap !== null) {

        var dropCapY;
        dropCapY = this.notationBounds.y + this.notationBounds.height + this.lyricLineBaseline + (this.altLineHeight * this.numAltLines) - (this.altLineHeight * this.numAltLines);

        // drop caps and annotations are drawn from their center, so aligning them
        // horizontally is as easy as this.staffLeft / 2
        this.score.dropCap.bounds.x = this.staffLeft / 2;
        this.score.dropCap.bounds.y = dropCapY;
      }

      if (this.score.annotation !== null) {
        // annotations use dominant-baseline to align text to the top
        this.score.annotation.bounds.x = this.staffLeft / 2;
        this.score.annotation.bounds.y = - ctxt.staffInterval * 3;
        if(this.score.dropCap !== null) {
          var lowestPossibleAnnotationY = this.score.dropCap.bounds.y - this.score.annotation.bounds.height - (this.score.dropCap.fontSize * 0.65);
          // if the annotation would overlap with the drop cap, move the annotation higher.
          // otherwise, center the annotation in the vertical space between the top of the drop cap and the top of the staff.
          if(lowestPossibleAnnotationY < this.score.annotation.bounds.y) {
            this.score.annotation.bounds.y = lowestPossibleAnnotationY;
          } else {
            this.score.annotation.bounds.y = (this.score.annotation.bounds.y + lowestPossibleAnnotationY) / 2;
          }
          var yDiff = this.score.annotation.bounds.y - this.notationBounds.y;
          if(yDiff < 0) {
            this.notationBounds.y = this.score.annotation.bounds.y;
            this.notationBounds.height -= yDiff;
          }
        }
        this.score.annotation.bounds.y += this.score.annotation.origin.y * 0.65;
      }
    }

    // add up the lyric line heights to get the total height of the chant line
    this.notationBounds.height += (this.lyricLineHeight * this.numLyricLines) + (this.altLineHeight * this.numAltLines);
    var totalHeight = this.notationBounds.height;
    this.notationBounds.y -= this.altLineHeight * this.numAltLines;

    this.bounds.x = 0;
    this.bounds.y = this.notationBounds.y;
    this.bounds.width = this.notationBounds.right();
    this.bounds.height = totalHeight;

    // the origin of the chant line's coordinate space is at the center line of the left extremity of the staff
    this.origin = new Point(this.staffLeft, -this.notationBounds.y);
  }

  draw(ctxt) {

    var canvasCtxt = ctxt.canvasCtxt;

    canvasCtxt.translate(this.bounds.x, this.bounds.y);

    // draw the chant lines
    var i, x1 = this.staffLeft, x2 = this.staffRight, y;

    canvasCtxt.lineWidth = Math.round(ctxt.staffLineWeight);
    canvasCtxt.strokeStyle = ctxt.staffLineWeight;

    for (i = -3; i <= 3; i += 2) {

      y = Math.round(ctxt.staffInterval * i) + 0.5;

      canvasCtxt.beginPath();
      canvasCtxt.moveTo(x1, y);
      canvasCtxt.lineTo(x2, y);
      canvasCtxt.stroke();
    }

    // draw the ledger lines
    for (i = 0; i < this.ledgerLines.length; i++) {

      var ledgerLine = this.ledgerLines[i];
      y = ctxt.calculateHeightFromStaffPosition(ledgerLine.staffPosition);

      canvasCtxt.beginPath();
      canvasCtxt.moveTo(ledgerLine.x1, y);
      canvasCtxt.lineTo(ledgerLine.x2, y);
      canvasCtxt.stroke();
    }

    // fixme: draw the braces

    // draw the dropCap and the annotations
    if (this.notationsStartIndex === 0) {

      if (this.score.dropCap !== null)
        this.score.dropCap.draw(ctxt);

      if (this.score.annotation !== null)
        this.score.annotation.draw(ctxt);
    }

    // draw the notations
    var notations = this.score.notations;
    var lastIndex = this.notationsStartIndex + this.numNotationsOnLine;

    for (i = this.notationsStartIndex; i < lastIndex; i++)
      notations[i].draw(ctxt);

    this.startingClef.draw(ctxt);

    if (this.custos)
      this.custos.draw(ctxt);

    canvasCtxt.translate(-this.bounds.x, -this.bounds.y);
  }

  createSvgNode(ctxt, top = 0) {
    var inner = [];

    // add the chant lines
    var i, x1 = this.staffLeft, x2 = this.staffRight;

    // create the staff lines
    for (i = -3; i <= 3; i += 2) {

      inner.push( QuickSvg.createNode('line', {
        'x1': x1,
        'y1': ctxt.staffInterval * i,
        'x2': x2,
        'y2': ctxt.staffInterval * i,
        'stroke': ctxt.staffLineColor,
        'stroke-width': ctxt.staffLineWeight,
        'class': 'staffLine'
      }) );
    }

    // create the ledger lines
    for (i = 0; i < this.ledgerLines.length; i++) {

      var ledgerLine = this.ledgerLines[i];
      var y = ctxt.calculateHeightFromStaffPosition(ledgerLine.staffPosition);

      inner.push( QuickSvg.createNode('line', {
        'x1': ledgerLine.x1,
        'y1': y,
        'x2': ledgerLine.x2,
        'y2': y,
        'stroke': ctxt.staffLineColor,
        'stroke-width': ctxt.staffLineWeight,
        'class': 'ledgerLine'
      }) );
    }

    // add any braces
    for (i = 0; i < this.braces.length; i++)
      inner.push( this.braces[i].createSvgNode(ctxt) );

    // dropCap and the annotations
    if (this.notationsStartIndex === 0) {

      if (this.score.dropCap !== null)
        inner.push( this.score.dropCap.createSvgNode(ctxt) );

      if (this.score.annotation !== null)
        inner = inner.concat( this.score.annotation.createSvgNode(ctxt) );
    }

    inner.push( this.startingClef.createSvgNode(ctxt) );

    var notations = this.score.notations;
    var lastIndex = this.notationsStartIndex + this.numNotationsOnLine;

    // add all of the notations
    for (i = this.notationsStartIndex; i < lastIndex; i++)
      inner.push( notations[i].createSvgNode(ctxt) );

    if (this.custos)
      inner.push( this.custos.createSvgNode(ctxt) );

    return QuickSvg.createNode('g', {
      'class': 'chantLine',
      'transform': 'translate(' + this.bounds.x + ',' + (this.bounds.y - top) + ')'
    }, inner);
  }

  createSvgFragment(ctxt, top = 0) {
    var inner = "";

    // add the chant lines
    var i, x1 = this.staffLeft, x2 = this.staffRight;

    // create the staff lines
    for (i = -3; i <= 3; i += 2) {

      inner += QuickSvg.createFragment('line', {
        'x1': x1,
        'y1': ctxt.staffInterval * i,
        'x2': x2,
        'y2': ctxt.staffInterval * i,
        'stroke': ctxt.staffLineColor,
        'stroke-width': ctxt.staffLineWeight,
        'class': 'staffLine'
      });
    }

    // create the ledger lines
    for (i = 0; i < this.ledgerLines.length; i++) {

      var ledgerLine = this.ledgerLines[i];
      var y = ctxt.calculateHeightFromStaffPosition(ledgerLine.staffPosition);

      inner += QuickSvg.createFragment('line', {
        'x1': ledgerLine.x1,
        'y1': y,
        'x2': ledgerLine.x2,
        'y2': y,
        'stroke': ctxt.staffLineColor,
        'stroke-width': ctxt.staffLineWeight,
        'class': 'ledgerLine'
      });
    }

    // add any braces
    for (i = 0; i < this.braces.length; i++)
      inner += this.braces[i].createSvgFragment(ctxt);

    // dropCap and the annotations
    if (this.notationsStartIndex === 0) {

      if (this.score.dropCap !== null)
        inner += this.score.dropCap.createSvgFragment(ctxt);

      if (this.score.annotation !== null)
          inner += this.score.annotation.createSvgFragment(ctxt);
    }

    inner += this.startingClef.createSvgFragment(ctxt);

    var notations = this.score.notations;
    var lastIndex = this.notationsStartIndex + this.numNotationsOnLine;

    // add all of the notations
    for (i = this.notationsStartIndex; i < lastIndex; i++)
      inner += notations[i].createSvgFragment(ctxt);

    if (this.custos)
      inner += this.custos.createSvgFragment(ctxt);

    return QuickSvg.createFragment('g', {
      'class': 'chantLine',
      'transform': 'translate(' + this.bounds.x + ',' + (this.bounds.y - top) + ')'
    }, inner);
  }

  // code below based on code by: https://gist.github.com/alexhornbake
  //
  // optimized for braces that are only drawn horizontally.
  // returns svg path string ready to insert into svg doc
  generateCurlyBraceDrawable(ctxt, x1, x2, y, isAbove) {

    var h;

    if (isAbove)
      h = -ctxt.staffInterval / 2;
    else
      h = ctxt.staffInterval / 2;

    // and q factor, .5 is normal, higher q = more expressive bracket 
    var q = 0.6;

    var dx = -1;
    var len = x2 - x1;

    //Calculate Control Points of path,
    var qx1 = x1;
    var qy1 = y  + q*h;
    var qx2 = x1 + .25*len;
    var qy2 = y  + (1-q)*h;
    var tx1 = x1 + .5*len;
    var ty1 = y  + h;
    var qx3 = x2;
    var qy3 = y  + q*h;
    var qx4 = x1 + .75*len;
    var qy4 = y  + (1-q)*h;
    var d   =  ( "M " +  x1 + " " +  y +
            " Q " + qx1 + " " + qy1 + " " + qx2 + " " + qy2 + 
            " T " + tx1 + " " + ty1 +
            " M " +  x2 + " " +  y +
            " Q " + qx3 + " " + qy3 + " " + qx4 + " " + qy4 + 
            " T " + tx1 + " " + ty1);

    return QuickSvg.createFragment('path', {
      'd': d,
      'stroke': ctxt.neumeLineColor,
      'stroke-width': ctxt.neumeLineWeight + 'px',
      'fill': 'none'
    });
  }


  buildFromChantNotationIndex(ctxt, newElementStart, width) {

    // todo: reset / clear the children we have in case they have data
    var notations = this.score.notations, beginningLyrics = null, prev = null, prevLyrics = [];
    this.notationsStartIndex = newElementStart;
    this.numNotationsOnLine = 0;

    this.staffLeft = 0;

    if (width > 0)
      this.staffRight = width;
    else
      this.staffRight = 99999999; // no limit to staff size

    // If this is the first chant line, then we have to make room for a
    // drop cap and/or annotation, if present
    if (this.notationsStartIndex === 0) {

      var padding = 0;

      if (this.score.dropCap !== null)
        padding = this.score.dropCap.bounds.width + this.score.dropCap.padding * 2;

      if (this.score.annotation !== null)
        padding = Math.max(padding, this.score.annotation.bounds.width + this.score.annotation.padding * 4);

      this.staffLeft += padding;
    } else {
      prev = notations[newElementStart - 1];
      if(prev.constructor === DoubleBar && prev.hasLyrics() && (prev.lyrics.length > 1 || !prev.lyrics[0].text.match(/^(i\.?)+j\.?/))) {
        beginningLyrics = prev.lyrics.map(function(lyric){
          var newLyric = new Lyric(ctxt, lyric.originalText, lyric.lyricType, lyric.notation);
          newLyric.elidesToNext = lyric.elidesToNext;
          // Hide the original lyric by setting its bounds.y to an extremely high number.
          // If the chant is re-laid out, this value will be recalculated so that it won't stay hidden.
          lyric.bounds.y = Number.MAX_SAFE_INTEGER;
          return newLyric;
        });
        var minX = beginningLyrics.map(function(l) {
          return l.bounds.x;
        }).reduce(function(a,b){ return a < b? a : b; });
        beginningLyrics.forEach(function(l) {
          l.bounds.x -= minX;
        })
      }
    }

    // set up the clef...
    // if the first notation on the line is a starting clef, then we treat it a little differently...
    // the clef becomes this line's starting clef and we skip over the clef in the notations array
    if (notations[newElementStart].isClef) {
      ctxt.activeClef = notations[newElementStart].clone();
      newElementStart++;
      this.notationsStartIndex++;
    }

    // make a copy for this line to use at the beginning
    this.startingClef = ctxt.activeClef.clone();
    this.startingClef.performLayout(ctxt);
    this.startingClef.bounds.x = this.staffLeft;

    var curr = this.startingClef;

    if(beginningLyrics) {
      curr.lyrics = beginningLyrics;
    }

    // estimate how much space we have available to us
    var rightNotationBoundary = this.staffRight - Glyphs.CustosLong.bounds.width * ctxt.glyphScaling - ctxt.intraNeumeSpacing * 4; // possible custos on the line

    // iterate through the notations, fittng what we can on this line
    var i, j, lastNotationIndex = notations.length - 1;


    for (i = newElementStart; i <= lastNotationIndex; i++) {

      if (curr.hasLyrics())
        LyricArray.mergeIn(this.lastLyrics, curr.lyrics);

      prev = curr;
      curr = notations[i];
      
      var actualRightBoundary;
      if(i === lastNotationIndex || curr.constructor === Custos || (prev.constructor === Custos && curr.isDivider)) {
        // on the last notation of the score, we don't need a custos or trailing space, so we use staffRight as the
        // right boundary.
        // Also, if the current notation is a divider and the previous was a custos, we don't need extra space
        // because if the following notation won't fit, we can switch the order and use the custos as the end-of-the-line custos
        actualRightBoundary = this.staffRight;
      } else if (i === lastNotationIndex - 1) {
        // on the penultimate notation, make sure there is at least enough room for whichever takes up less space,
        // between the final notation and a custos:
        actualRightBoundary = Math.max(rightNotationBoundary, this.staffRight - notations[lastNotationIndex].bounds.width);
      } else {
        // Otherwise, we use rightNotationBoundary, which leaves room for a custos...
        actualRightBoundary = rightNotationBoundary;
      }

      // try to fit the curr element on this line.
      // if it doesn't fit, we finish up here.
      var fitsOnLine = this.positionNotationElement(ctxt, this.lastLyrics, prev, curr, actualRightBoundary);
      if (fitsOnLine === false) {

        // first check for elements that cannot begin a system: dividers and custodes
        while(this.numNotationsOnLine > 0 && (curr.isDivider || curr.constructor === Custos)) {
          curr = notations[ --i ];
          this.numNotationsOnLine--;
        }

        // check for an end brace in the curr element
        var braceEndIndex = curr.notes && curr.notes.reduce(function(result,n,i){ return result || (n.braceEnd && (i + 1)) || 0}, 0);
        var braceStartIndex = curr.notes && curr.notes.reduce(function(result,n,i){ return result || (n.braceStart && (i + 1)) || 0}, 0);
        // if there is not a start brace earlier in the element than the end brace, we need to find the earlier start brace
        // to keep the entire brace together on the next line
        if(braceEndIndex && (!braceStartIndex || braceStartIndex > braceEndIndex)) {
          // find last index of start brace
          var index = notations.slice(this.notationsStartIndex, i).reduceRight(function(accum,cne,index){
            if(accum === -1 && cne.notes) {
              var braceStart = cne.notes.filter(function(n){ return n.braceStart; }).length;
              var braceEnd = cne.notes.filter(function(n){ return n.braceEnd; }).length;
              // if we see another end brace before we get to a start brace, short circuit
              if(braceEnd) return -2;
              if(braceStart) return index;
            }
            return accum;
          },-1);
          // if the start brace was found, this line needs to end just before it:
          if(index > 0) {
            this.numNotationsOnLine = index;
            i = index + this.notationsStartIndex;
          }
        }

        // check if the prev elements want to be kept with this one
        for (j = i - 1; j > this.notationsStartIndex; j--) {
          var cne = notations[j];

          // if the line break is allowed (cne.allowLineBreakBeforeNext), keep this number of notations around so we can check during justification
          // whether there would be too much space introduced between 
          if (cne.keepWithNext === true) {
            if(cne.allowLineBreakBeforeNext && !this.maxNumNotationsOnLine)
              this.maxNumNotationsOnLine = this.numNotationsOnLine;
            this.numNotationsOnLine--;
          } else
            break;
        }

        // determine the neumes we can space apart, if we do end up justifying
        this.toJustify = [];
        curr = null;
        var lastIndex = this.notationsStartIndex + this.numNotationsOnLine;
        for (i = this.notationsStartIndex; i < lastIndex; i++) {

          prev = curr;
          curr = notations[i];

          if (prev !== null && prev.keepWithNext === true)
            continue;

          if (prevLyrics !== null && prevLyrics.length && prevLyrics[0].allowsConnector() && !prevLyrics[0].needsConnector)
            continue;

          if (curr.constructor === ChantLineBreak)
            continue;

          if (curr === this.custos)
            continue;

          // otherwise, we can add space before this element
          this.toJustify.push(curr);
        }
        
        if(this.maxNumNotationsOnLine) {
          // Check whether we should squeeze some extra notations on the line to avoid too much space after justification:
          // Check how much space we would have without the extra notations
          var extraSpace = this.staffRight;

          if (this.numNotationsOnLine > 0) {
            var last = notations[lastIndex - 1], lastLyrics = this.lastLyrics;
                

            if (lastLyrics)
              extraSpace -= Math.max(LyricArray.getRight(lastLyrics), last.bounds.right() + last.trailingSpace);
            else
              extraSpace -= (last.bounds.right() + last.trailingSpace);

            extraSpace -= Glyphs.CustosLong.bounds.width;

            if(extraSpace / this.toJustify.length > ctxt.staffInterval * 2) {
              if(notations[lastIndex].hasLyrics()) LyricArray.mergeIn(this.lastLyrics, notations[lastIndex].lyrics);
              this.numNotationsOnLine = this.maxNumNotationsOnLine;
              delete this.maxNumNotationsOnLine;
            }
          }
        }

        if(notations[j].isDivider && notations[j - 1].constructor === Custos) {
          // reverse the order: put the divider first, and end the line with the custos.
          prevLyrics = [];
          for (i = j - 2; i >= this.notationsStartIndex; i--) {
            if(notations[i].hasLyrics()) {
              LyricArray.mergeIn(prevLyrics, notations[i].lyrics);
              break;
            }
          }
          this.positionNotationElement(ctxt, prevLyrics, notations[j - 2], notations[j], this.staffRight);
          this.custos = notations[j - 1];
          this.custos.bounds.x = this.staffRight - this.custos.bounds.width - this.custos.leadingSpace;
        }

        // we are at the end of the line!
        break;
      }

      curr.chantLine = this;
      this.numNotationsOnLine++;

      if (curr.isClef)
        ctxt.activeClef = curr;

      // line breaks are a special case indicating to stop processing here
      if (curr.constructor === ChantLineBreak && width > 0) {
        this.justify = curr.justify;
        break;
      }
    }

    if(!this.custos) {
      // create the automatic custos at the end of the line if there are neumes left in the notations
      for (i = this.notationsStartIndex + this.numNotationsOnLine; i < notations.length; i++) {
        var notation = notations[i];

        if (notation.isNeume) {

          this.custos = new Custos(true);
          ctxt.currNotationIndex = i - 1; // make sure the context knows where the custos is
          this.custos.performLayout(ctxt);

          // Put the custos at the very end of the line
          this.custos.bounds.x = this.staffRight - this.custos.bounds.width - this.custos.leadingSpace;
          // nothing more to see here...
          break;
        }
      }
    }

    // find the final lyric and mark it as connecting if needed.
    lastLyrics = this.lastLyrics;
    i = 0;
    while (lastLyrics && lastLyrics[i]) {
      if(lastLyrics[i].allowsConnector()) lastLyrics[i].setNeedsConnector(true);
      ++i;
    }


    // if the provided width is less than zero, then set the width of the line
    // based on the last notation
    last = notations[this.notationsStartIndex + this.numNotationsOnLine - 1];
    if (width <= 0) {
      this.staffRight = last.bounds.right();
      this.justify = false;
    } else if (this.notationsStartIndex + this.numNotationsOnLine === notations.length) {
      // this is the last chant line.
      this.justify = true;
      this.justify = last.isDivider && ((this.staffRight - last.bounds.right()) / this.staffRight < .1);
    }
    
    // Justify the line if we need to
    if (this.justify === true)
      this.justifyElements();

    this.finishLayout(ctxt);
  }

  justifyElements() {

    var i;
    var toJustify = this.toJustify || [];
    var notations = this.score.notations;
    var lastIndex = this.notationsStartIndex + this.numNotationsOnLine;

    // first step of justification is to determine how much space we have to use up
    var extraSpace = 0;

    if (this.numNotationsOnLine > 0) {
      var last = notations[lastIndex - 1], lastLyrics = this.lastLyrics;

      if (lastLyrics)
        extraSpace = this.staffRight - Math.max(LyricArray.getRight(lastLyrics), last.bounds.right() + last.trailingSpace);
      else
        extraSpace = this.staffRight - (last.bounds.right() + last.trailingSpace);  
    }

    if (this.custos)
      extraSpace -= this.custos.bounds.width + this.custos.leadingSpace;

    if (extraSpace === 0)
      return;

    if (toJustify.length === 0)
      return;

    var curr = null;
    var offset = 0;
    var increment = extraSpace / toJustify.length;
    var toJustifyIndex = 0;
    for (i = this.notationsStartIndex; i < lastIndex; i++) {

      curr = notations[i];

      if (curr === this.custos)
        continue;

      if (toJustifyIndex < toJustify.length && toJustify[toJustifyIndex] === curr) {
        offset += increment;
        toJustifyIndex++;
      }

      curr.bounds.x += offset;
    }
  }

  finishLayout(ctxt) {

    this.ledgerLines = []; // clear any existing ledger lines

    var notations = this.score.notations;
    var lastIndex = this.notationsStartIndex + this.numNotationsOnLine;

    // an element needs to have a staffPosition property, as well as the standard
    // bounds property. so it could be a note, or it could be a custos
    // offsetX and offsetY can be used to add to the position info for the element,
    // useful in the case of notes.
    var processElementForLedgerLine = (element, offsetX = 0, offsetY = 0) => {

      // do we need a ledger line for this note?
      var staffPosition = element.staffPosition;

      if (staffPosition >= 5 || staffPosition <= -5) {

        var x1 = offsetX + element.bounds.x - ctxt.intraNeumeSpacing;
        var x2 = offsetX + element.bounds.x + element.bounds.width + ctxt.intraNeumeSpacing;

        // round the staffPosition to the nearest line
        if (staffPosition > 0)
          staffPosition = staffPosition - (staffPosition - 1) % 2;
        else
          staffPosition = staffPosition - (staffPosition + 1) % 2;

        // if we have a ledger line close by, then average out the distance between the two
        var minLedgerSeparation = ctxt.staffInterval * ctxt.minLedgerSeparation;

        if (this.ledgerLines.length > 0 &&
            this.ledgerLines[this.ledgerLines.length - 1].x2 + minLedgerSeparation >= x1) {

          // average out the distance
          var half = (x1 - this.ledgerLines[this.ledgerLines.length - 1].x2) / 2;
          this.ledgerLines[this.ledgerLines.length - 1].x2 += half;
          x1 -= half;
        }

        // never let a ledger line extend past the staff width
        if (x2 > this.staffRight)
          x2 = this.staffRight;

        // finally, add the ledger line
        this.ledgerLines.push({
          x1: x1,
          x2: x2,
          staffPosition: staffPosition
        });
      }
    };

    var episemata = []; // keep track of episemata in case we can connect some
    var startBrace = null, startBraceNotationIndex = 0;
    var minY = Number.MAX_VALUE, maxY = Number.MIN_VALUE; // for braces

    // make a final pass over all of the notes to add any necessary
    // ledger lines and to smooth out episemata
    for (var i = this.notationsStartIndex; i < lastIndex; i++) {

      var neume = notations[i];

      minY = Math.min(minY, neume.bounds.y);
      maxY = Math.max(maxY, neume.bounds.bottom());

      if (neume.constructor === Custos) {
        processElementForLedgerLine(neume);
        continue;
      }

      // if the AboveLinesText would extend beyond the right edge of the staff, right align it instead
      if (neume.alText) {
        for (var j = 0; j < neume.alText.length; j++) {
          neume.alText[j].bounds.x = neume.hasLyrics()? neume.lyrics[j].bounds.x : 0;
          var beyondStaffRight = neume.bounds.x + neume.alText[j].bounds.right() - this.staffRight;
          if (beyondStaffRight > 0)
            neume.alText[j].bounds.x -= beyondStaffRight;
        }
      }

      // if it's not a neume then just skip here
      if (!neume.isNeume)
        continue;

      for (j = 0; j < neume.notes.length; j++) {
        var k, note = neume.notes[j];

        processElementForLedgerLine(note, neume.bounds.x, neume.bounds.y);

        // blend episemata as we're able
        if (note.episemata.length === 0)
          episemata = [];
        for (k = 0; k < note.episemata.length; k++) {

          var episema = note.episemata[k];

          var spaceBetweenEpisemata = 0;

          // calculate the distance between the last episemata and this one...
          // lots of code for a simple: currEpisemata.left - prevEpisemata.right
          if (episemata.length > 0)
            spaceBetweenEpisemata = neume.bounds.x + episema.bounds.x - (episemata[episemata.length - 1].note.neume.bounds.x + episemata[episemata.length - 1].bounds.right());

          // we try to blend the episema if we're able.
          if (episemata.length === 0 ||
              episemata[episemata.length - 1].positionHint !== episema.positionHint ||
              episemata[episemata.length - 1].terminating === true ||
              episemata[episemata.length - 1].alignment === HorizontalEpisemaAlignment.Left ||
              episemata[episemata.length - 1].alignment === HorizontalEpisemaAlignment.Center ||
              episema.alignment === HorizontalEpisemaAlignment.Right ||
              episema.alignment === HorizontalEpisemaAlignment.Center ||
              (spaceBetweenEpisemata > ctxt.intraNeumeSpacing * 2 && (note.glyphVisualizer.glyphCode !== GlyphCode.None))) {

            // start a new set of episemata to potentially blend
            episemata = [episema];
          } else {
            // blend all previous with this one
            var newY;

            if (episema.positionHint === MarkingPositionHint.Below)
              newY = Math.max(episema.bounds.y, episemata[episemata.length - 1].bounds.y);
            else
              newY = Math.min(episema.bounds.y, episemata[episemata.length - 1].bounds.y);

            if (episema.bounds.y !== newY)
              episema.bounds.y = newY;
            else {
              for (var l = 0; l < episemata.length; l++)
                episemata[l].bounds.y = newY;
            }

            // extend the last episema to meet the new one
            var newWidth = (neume.bounds.x + episema.bounds.x) - (episemata[episemata.length - 1].note.neume.bounds.x + episemata[episemata.length - 1].bounds.x);
            if(newWidth < 0) {
              newWidth *= -1;
              episemata[episemata.length - 1].bounds.x -= newWidth;
            }
            episemata[episemata.length - 1].bounds.width = newWidth;

            episemata.push(episema);
          }
        }

        if (note.braceEnd) {

          // calculate the y value of the brace by iterating over all notations
          // under/over the brace.
          var y;
          var dy = ctxt.intraNeumeSpacing / 2; // some safe space between brace and notes.
          if (startBrace === null) {
            // fixme: this brace must have started on the previous line...what to do here, draw half a brace?
          } else {
            if (startBrace.isAbove) {
              y = ctxt.calculateHeightFromStaffPosition(4);
              for (k = startBraceNotationIndex; k <= i; k++)
                y = Math.min(y, notations[k].bounds.y - dy);
            } else {
              y = ctxt.calculateHeightFromStaffPosition(-4);
              for (k = startBraceNotationIndex; k <= i; k++)
                y = Math.max(y, notations[k].bounds.y + dy);
            }

            var addAcuteAccent = false;

            if (startBrace.shape === BraceShape.RoundBrace) {

              this.braces.push(new RoundBraceVisualizer(ctxt,
                startBrace.getAttachmentX(),
                note.braceEnd.getAttachmentX(),
                y,
                startBrace.isAbove));

            } else {

              if (startBrace.shape === BraceShape.AccentedCurlyBrace)
                addAcuteAccent = true;

              this.braces.push(new CurlyBraceVisualizer(ctxt,
                startBrace.getAttachmentX(),
                note.braceEnd.getAttachmentX(),
                y,
                startBrace.isAbove,
                addAcuteAccent));
            }
          }
        }

        if (note.braceStart) {
          startBrace = note.braceStart;
          startBraceNotationIndex = i;
        }

        // update the active brace y position if there is one
        if (startBrace !== null) {
          if (startBrace.isAbove)
            startBrace.bounds.y = Math.min(startBrace.bounds.y, note.bounds.y);
          else
            startBrace.bounds.y = Math.max(startBrace.bounds.y, note.bounds.bottom());
        }
      }
    }

    // if we still have an active brace, that means it spands two chant lines!
    if (startBrace !== null) {
      startBrace = startBrace;
    }

    // don't forget to also include the final custos, which may need a ledger line too
    if (this.custos)
      processElementForLedgerLine(this.custos);
  }


  // this is where the real core of positioning neumes takes place
  // returns true if positioning was able to fit the neume before rightNotationBoundary.
  // returns false if cannot fit before given right margin.
  // fixme: if this returns false, shouldn't we set the connectors on prev to be activated?!
  positionNotationElement(ctxt, prevLyrics, prev, curr, rightNotationBoundary) {

    var i;

    // To begin we just place the current notation right after the previous,
    // irrespective of lyrics.
    curr.bounds.x = prev.bounds.right() + prev.trailingSpace;

    // if the previous notation has no lyrics, then we simply make sure the
    // current notation with lyrics is in the bounds of the line
    if (prevLyrics.length === 0) {

      var maxRight = curr.bounds.right() + curr.trailingSpace;

      // if the lyric left is negative, then offset the neume appropriately
      for (i = 0; i < curr.lyrics.length; i++) {

        curr.lyrics[i].setNeedsConnector(false); // we hope for the best!

        if (curr.lyrics[i].getLeft() < 0)
          curr.bounds.x += -curr.lyrics[i].getLeft();

        maxRight = Math.max(maxRight, curr.lyrics[i].getRight());
      }

      if (maxRight > rightNotationBoundary)
        return false;
      else
        return true;
    }

    // if the curr notation has no lyrics, then simply check whether there is enough room
    if (curr.hasLyrics() === false) {

      if (curr.bounds.right() + curr.trailingSpace < rightNotationBoundary)
        return true;
      else
        return false;
    }

    // if we have multiple lyrics on the current or the previous notation,
    // we will have to run several passes over each set of lyrics:

    // on the first pass, we will check the absolute left-most placement of the new syllables
    // we will make additional passes until everything is stable
    do {
      var hasShifted = false;
      var atLeastOneWithoutConnector = false;
      for (i = 0; i < curr.lyrics.length; i++) {
        if (!curr.lyrics[i].text) continue;
        if (i < prevLyrics.length && prevLyrics[i] !== null) {
          var prevLyricRight = prevLyrics[i].getRight();
        }

        curr.lyrics[i].setNeedsConnector(false); // we hope for the best!
        var currLyricLeft = curr.lyrics[i].getLeft();
        if (!prevLyrics[i] || prevLyrics[i].allowsConnector() === false) {
          // No connector needed, but include space between words if necessary!
          if (prevLyricRight + ctxt.minLyricWordSpacing > currLyricLeft) {
            // push the current element over a bit.
            curr.bounds.x += prevLyricRight + ctxt.minLyricWordSpacing - currLyricLeft;
            hasShifted = true;
          }
        } else {
          // we may need a connector yet...
          if (prevLyricRight + 0.1 > currLyricLeft) {
            // in this case, the lyric elements actually overlap.
            // so nope, no connector needed. instead, we just place the lyrics together
            // fixme: for better text layout, we could actually use the kerning values
            // between the prev and curr lyric elements!
            curr.bounds.x += prevLyricRight - currLyricLeft;
            atLeastOneWithoutConnector = true;
            hasShifted = prevLyricRight - currLyricLeft > 0.5;
          } else {
            // bummer, looks like we couldn't merge the syllables together. Better add a connector...
            prevLyrics[i].setNeedsConnector(true);
            prevLyricRight = prevLyrics[i].getRight();

            if (prevLyricRight > currLyricLeft) {
              curr.bounds.x += prevLyricRight - currLyricLeft;
              hasShifted = true;
            }
          }
        }
   
      }
    } while(curr.lyrics.length > 1 && hasShifted && atLeastOneWithoutConnector);

    if (curr.bounds.right() + curr.trailingSpace < rightNotationBoundary &&
        curr.lyrics[0].getRight() <= this.staffRight) {
      if(prev.isAccidental) {
        // move the previous accidental up next to the current note:
        prev.bounds.x = curr.bounds.x - prev.bounds.width - prev.trailingSpace;
      }
      return true;
    }

    // if we made it this far, then the element won't fit on this line.
    return false;
  }
}
