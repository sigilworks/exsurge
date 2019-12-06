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

import * as Exsurge from "./Exsurge.Core.js";
import { Step, Pitch, Rect, Point, Margins } from "./Exsurge.Core.js";
import {
  QuickSvg,
  ChantLayoutElement,
  ChantNotationElement,
  GlyphCode,
  GlyphVisualizer,
  Lyric,
  Annotation,
  DropCap,
  TextLeftRight,
  TextSpan
} from "./Exsurge.Drawing.js";
import { ChantLine } from "./Exsurge.Chant.ChantLine.js";
import { AccidentalType } from "./Exsurge.Chant.Signs.js";
import {
  MarkingPositionHint,
  HorizontalEpisemaAlignment,
  HorizontalEpisema
} from "./Exsurge.Chant.Markings.js";
import { Gabc } from "./Exsurge.Gabc.js";
import { Titles } from "./Exsurge.Titles.js";

export var LiquescentType = {
  None: 0,

  // flags that can be combined, though of course it
  // it doesn't make sense to combine some!
  Large: 1 << 0,
  Small: 1 << 1,
  Ascending: 1 << 2,
  Descending: 1 << 3,
  InitioDebilis: 1 << 4,

  // handy liquescent types
  LargeAscending: (1 << 0) | (1 << 2),
  LargeDescending: (1 << 0) | (1 << 3),
  SmallAscending: (1 << 1) | (1 << 2),
  SmallDescending: (1 << 1) | (1 << 3)
};

export var NoteShape = {
  // shapes
  Default: 0,
  Virga: 1,
  Inclinatum: 2,
  Quilisma: 3,
  Stropha: 4,
  Oriscus: 5
};

export var NoteShapeModifiers = {
  // flags which modify the shape
  // not all of them apply to every shape of course
  None: 0,
  Ascending: 1 << 0,
  Descending: 1 << 1,
  Cavum: 1 << 2,
  Stemmed: 1 << 3
};

/**
 * @class
 */
export class Note extends ChantLayoutElement {
  /**
   * @para {Pitch} pitch
   */
  constructor(pitch) {
    super();

    if (typeof pitch !== "undefined") this.pitch = pitch;
    else this.pitch = null;

    this.glyphVisualizer = null;

    // The staffPosition on a note is an integer that indicates the vertical position on the staff.
    // 0 is the center space on the staff (equivalent to gabc 'g'). Positive numbers go up
    // the staff, and negative numbers go down, i.e., 1 is gabc 'h', 2 is gabc 'i', -1 is gabc 'f', etc.
    this.staffPosition = 0;
    this.liquescent = LiquescentType.None;
    this.shape = NoteShape.Default;
    this.shapeModifiers = NoteShapeModifiers.None;

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
    if (this.glyphVisualizer) this.glyphVisualizer.setGlyph(ctxt, glyphCode);
    else this.glyphVisualizer = new GlyphVisualizer(ctxt, glyphCode);

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
    if (shapeModifier === NoteShapeModifiers.None)
      return this.shapeModifier === NoteShapeModifiers.None;
    else return this.shapeModifier & (shapeModifier !== 0);
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
  createReact(ctxt) {
    this.glyphVisualizer.bounds.x = this.bounds.x;
    this.glyphVisualizer.bounds.y = this.bounds.y;
    return this.glyphVisualizer.createReact(ctxt, this);
  }

  createSvgFragment(ctxt) {
    this.glyphVisualizer.bounds.x = this.bounds.x;
    this.glyphVisualizer.bounds.y = this.bounds.y;
    return this.glyphVisualizer.createSvgFragment(ctxt, this);
  }
}

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

  pitchToStaffPosition(pitch) {}

  performLayout(ctxt) {
    ctxt.activeClef = this;

    if (this.defaultAccidental) this.defaultAccidental.performLayout(ctxt);

    super.performLayout(ctxt);
  }

  finishLayout(ctxt) {
    // if we have a default accidental, then add a glyph for it now
    if (this.defaultAccidental) {
      var accidentalGlyph = this.defaultAccidental.createGlyphVisualizer(ctxt);
      accidentalGlyph.bounds.x +=
        this.visualizers[0].bounds.right() + ctxt.intraNeumeSpacing;
      this.addVisualizer(accidentalGlyph);
    }

    super.finishLayout(ctxt);
  }

  static default() {
    return __defaultDoClef;
  }
}

export class DoClef extends Clef {
  constructor(staffPosition, octave, defaultAccidental = null) {
    super(staffPosition, octave, defaultAccidental);

    this.leadingSpace = 0.0;
  }

  pitchToStaffPosition(pitch) {
    return (
      (pitch.octave - this.octave) * 7 +
      this.staffPosition +
      Pitch.stepToStaffOffset(pitch.step) -
      Pitch.stepToStaffOffset(Step.Do)
    );
  }

  staffPositionToPitch(staffPosition) {
    var offset = staffPosition - this.staffPosition;
    var octaveOffset = Math.floor(offset / 7);

    var step = Pitch.staffOffsetToStep(offset);

    if (
      this.activeAccidental &&
      this.activeAccidental.staffPosition === staffPosition
    )
      step += this.activeAccidental.accidentalType;

    return new Pitch(step, this.octave + octaveOffset);
  }

  performLayout(ctxt) {
    super.performLayout(ctxt);

    var glyph = new GlyphVisualizer(ctxt, GlyphCode.DoClef);
    glyph.setStaffPosition(ctxt, this.staffPosition);
    this.addVisualizer(glyph);

    this.finishLayout(ctxt);
  }

  clone() {
    return new DoClef(this.staffPosition, this.octave, this.defaultAccidental);
  }
}

var __defaultDoClef = new DoClef(3, 2);

export class FaClef extends Clef {
  constructor(staffPosition, octave, defaultAccidental = null) {
    super(staffPosition, octave, defaultAccidental);

    this.octave = octave;

    this.leadingSpace = 0;
  }

  pitchToStaffPosition(pitch) {
    return (
      (pitch.octave - this.octave) * 7 +
      this.staffPosition +
      Pitch.stepToStaffOffset(pitch.step) -
      Pitch.stepToStaffOffset(Step.Fa)
    );
  }

  staffPositionToPitch(staffPosition) {
    var offset = staffPosition - this.staffPosition + 3; // + 3 because it's a fa clef (3 == offset from Do)
    var octaveOffset = Math.floor(offset / 7);

    var step = Pitch.staffOffsetToStep(offset);

    if (
      this.activeAccidental &&
      this.activeAccidental.staffPosition === staffPosition
    )
      step += this.activeAccidental.accidentalType;

    return new Pitch(step, this.octave + octaveOffset);
  }

  performLayout(ctxt) {
    super.performLayout(ctxt);

    var glyph = new GlyphVisualizer(ctxt, GlyphCode.FaClef);
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
    this.addVisualizer(new GlyphVisualizer(ctxt, GlyphCode.None));

    this.origin.x = 0;
    this.origin.y = 0;

    this.finishLayout(ctxt);
  }
}

export class ChantLineBreak extends ChantNotationElement {
  constructor(justify) {
    super();
    this.calculatedTrailingSpace = this.trailingSpace = 0;
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

// a chant mapping is a lightweight format independent way of
// tracking how a chant language (e.g., gabc) has been
// mapped to exsurge notations.
export class ChantMapping {
  // source can be any object type. in the case of gabc, source is a text
  // string that maps to a gabc word (e.g.: "no(g)bis(fg)").
  // notations is an array of ChantNotationElements
  constructor(source, notations, sourceIndex) {
    this.source = source;
    this.notations = notations;
    this.sourceIndex = sourceIndex;
  }
}

const __connectorSpan = new TextSpan(" • "),
  __mergeAnnotationWithTextLeft = (...annotationSpans) =>
    annotationSpans.reduce((result, spans) => {
      if (result && result.length) {
        if (spans && spans.length) return result.concat(__connectorSpan, spans);
        else return result;
      } else if (spans && spans.length) {
        return spans;
      }
      return [];
    });

/*
 * Score, document
 */
export class ChantScore {
  // mappings is an array of ChantMappings.
  constructor(ctxt, mappings = [], useDropCap) {
    this.mappings = mappings;

    this.lines = [];
    this.notes = [];
    if (ctxt) this.titles = new Titles(ctxt, this);

    this.startingClef = null;

    this.useDropCap = useDropCap;
    this.dropCap = null;

    this.annotation = null;

    this.compiled = false;

    this.autoColoring = true;
    this.needsLayout = true;

    // valid after chant lines are created...
    this.bounds = new Rect();

    this.mergeAnnotationWithTextLeft = __mergeAnnotationWithTextLeft;

    if (ctxt) this.updateNotations(ctxt);
  }

  /**
   * Make a copy of the score, only including the specified lines
   * @param  {number} startLine starting index
   * @param  {number} endLine   ending index
   * @return {ChantScore}           the partial score
   */
  copyLines(startLine, endLine) {
    let result = new ChantScore();
    result.lines = this.lines.slice(startLine, endLine);
    result.bounds = this.bounds.clone();
    let lastLine = result.lines.slice(-1)[0];
    result.bounds.height = lastLine.bounds.bottom() - lastLine.origin.y;
    if (startLine === 0) {
      result.titles = this.titles;
      result.dropCap = this.dropCap;
      result.annotation = this.annotation;
    }
    return result;
  }

  updateSelection(selection) {
    this.selection = selection;
    const elementSelection = (this.selection && this.selection.element) || [];
    for (let i = 0; i < this.notes.length; ++i) {
      let element = this.notes[i];
      element.selected = elementSelection.includes(i);
    }
  }

  updateNotations(ctxt) {
    var i, j, mapping, notation;

    // flatten all mappings into one array for N(0) access to notations
    this.notations = [];
    this.notes = [];
    this.hasLyrics = false;
    this.hasAboveLinesText = false;
    this.hasTranslations = false;
    const elementSelection = (this.selection && this.selection.element) || [];

    // find the starting clef...
    // start with a default clef in case the notations don't provide one.
    this.startingClef = null;

    for (i = 0; i < this.mappings.length; i++) {
      mapping = this.mappings[i];
      for (j = 0; j < mapping.notations.length; j++) {
        notation = mapping.notations[j];
        notation.score = this;
        notation.mapping = mapping;

        if (!this.startingClef) {
          if (notation.isNeume) {
            this.startingClef = Clef.default();
          } else if (notation.isClef) {
            this.startingClef = notation;
            continue;
          }
        }

        notation.notationIndex = this.notations.push(notation) - 1;
        if (!this.hasLyrics && notation.hasLyrics()) this.hasLyrics = true;
        if (!this.hasAboveLinesText && notation.alText)
          this.hasAboveLinesText = true;
        if (!this.hasTranslations && notation.translationText)
          this.hasTranslations = true;

        // Update this.notes and find element indices:
        let elements = notation.notes || [notation];
        for (let element of elements) {
          let elementIndex = (element.elementIndex =
            this.notes.push(element) - 1);
          element.selected = elementSelection.includes(elementIndex);
        }
      }
    }

    // if we've reached this far and we *still* don't have a clef, then there aren't even
    // any neumes in the score. still, set the default clef just for good measure
    if (!this.startingClef) this.startingClef = Clef.default();

    // update drop cap
    if (this.useDropCap) this.recreateDropCap(ctxt);
    else this.dropCap = null;

    this.needsLayout = true;
  }

  recreateDropCap(ctxt) {
    this.dropCap = null;

    // find the first notation with lyrics to use
    for (var i = 0; i < this.notations.length; i++) {
      if (
        this.notations[i].hasLyrics() &&
        this.notations[i].lyrics[0] !== null
      ) {
        let notation = this.notations[i],
          lyrics = notation.lyrics[0];
        if (this.useDropCap) {
          this.dropCap = lyrics.generateDropCap(ctxt);
        } else {
          lyrics.dropCap = null;
          lyrics.generateSpansFromText(ctxt, lyrics.originalText);
        }
        notation.needsLayout = true;
        return;
      }
    }
  }

  /**
   * Shared layout initialization method for performLayout() and performLayoutAsync()
   * @param  {ChantContext} ctxt
   */
  initializeLayout(ctxt) {
    // setup the context
    ctxt.activeClef = this.startingClef;
    ctxt.notations = this.notations;
    ctxt.currNotationIndex = 0;

    if (this.dropCap) this.dropCap.recalculateMetrics(ctxt);

    if (this.annotation) this.annotation.recalculateMetrics(ctxt);
  }

  // this is the the synchronous version of performLayout that
  // process everything without yielding to any other workers/threads.
  // good for server side processing or very small chant pieces.
  performLayout(ctxt, force) {
    if (!force && this.needsLayout === false) return; // nothing to do here!

    ctxt.updateHyphenWidth();

    this.initializeLayout(ctxt);

    for (let i = 0; i < this.notations.length; i++) {
      let notation = this.notations[i];
      if (force || notation.needsLayout) {
        ctxt.currNotationIndex = i;
        notation.performLayout(ctxt);
      }
    }

    this.needsLayout = false;
  }

  // for web applications, probably performLayoutAsync would be more
  // apppropriate that the above performLayout, since it will process
  // the notations without locking up the UI thread.
  performLayoutAsync(ctxt, finishedCallback) {
    if (this.needsLayout === false) {
      if (finishedCallback) setTimeout(() => finishedCallback(), 0);

      return; // nothing to do here!
    }

    if (ctxt.onFontLoaded) {
      ctxt.onFontLoaded.push(() =>
        this.performLayoutAsync(ctxt, finishedCallback)
      );
      return;
    }

    // check for sane value of hyphen width:
    ctxt.updateHyphenWidth();
    if (!ctxt.hyphenWidth || ctxt.hyphenWidth / ctxt.lyricTextSize > 0.6) {
      setTimeout(() => {
        this.performLayoutAsync(ctxt, finishedCallback);
      }, 100);
      return;
    }

    this.initializeLayout(ctxt);

    setTimeout(() => this.layoutElementsAsync(ctxt, 0, finishedCallback), 0);
  }

  layoutElementsAsync(ctxt, index, finishedCallback) {
    if (index >= this.notations.length) {
      this.needsLayout = false;

      if (finishedCallback) setTimeout(() => finishedCallback(), 0);

      return;
    }

    if (index === 0) ctxt.activeClef = this.startingClef;

    var timeout = new Date().getTime() + 50; // process for fifty milliseconds
    do {
      var notation = this.notations[index];
      if (notation.needsLayout) {
        ctxt.currNotationIndex = index;
        notation.performLayout(ctxt);
      }

      index++;
    } while (index < this.notations.length && new Date().getTime() < timeout);

    // schedule the next block of processing
    setTimeout(
      () => this.layoutElementsAsync(ctxt, index, finishedCallback),
      0
    );
  }

  layoutChantLines(ctxt, width, finishedCallback) {
    this.lines = [];

    if (this.mergeAnnotationWithTextLeft && this.annotation && !this.dropCap) {
      let annotation = this.annotation,
        annotationSpans = annotation.annotations
          ? annotation.annotations.map(annotation => annotation.spans)
          : [annotation.spans];
      this.overrideTextLeft = new TextLeftRight(ctxt, "", "textLeft");
      this.overrideTextLeft.spans = this.mergeAnnotationWithTextLeft(
        ...annotationSpans,
        this.titles.textLeft && this.titles.textLeft.spans
      );
    } else {
      this.overrideTextLeft = null;
    }

    var y = width > 0 ? this.titles.layoutTitles(ctxt, width) : 0;
    var currIndex = 0;

    ctxt.activeClef = this.startingClef;

    var spaceBetweenSystems = ctxt.staffInterval * ctxt.spaceBetweenSystems;

    do {
      var line = new ChantLine(this);

      line.buildFromChantNotationIndex(ctxt, currIndex, width);
      currIndex = line.notationsStartIndex + line.numNotationsOnLine;
      line.performLayout(ctxt);
      this.lines.push(line);

      line.bounds.y = -line.bounds.y + y;
      y += line.bounds.height + spaceBetweenSystems;
    } while (currIndex < this.notations.length);

    var lastLine = this.lines[this.lines.length - 1];

    this.bounds.x = 0;
    this.bounds.y = 0;
    this.bounds.width = lastLine.bounds.width;
    this.bounds.height = y - spaceBetweenSystems;

    this.pages = [this];

    if (finishedCallback) finishedCallback(this);
  }

  paginate(height) {
    if (!height) return;
    this.pages = [];
    let pageHeightOffset = 0,
    startLineIndex = 0;
    for (let i = 1; i < this.lines.length; ++i) {
      let line = this.lines[i];
      let pageHeight = line.bounds.bottom() - pageHeightOffset - line.origin.y;

      if(pageHeight > height) {
        // this line will be the first on the new page
        this.pages.push(this.copyLines(startLineIndex, i));
        startLineIndex = i;
        pageHeightOffset = line.bounds.y - line.origin.y;
        line.bounds.y = line.origin.y;
      } else {
        // not a new page yet...update the bounds:
        line.bounds.y -= pageHeightOffset;
      }
    }
    this.pages.push(this.copyLines(startLineIndex, this.lines.length));
  }

  draw(ctxt, scale = 1) {
    ctxt.setCanvasSize(this.bounds.width, this.bounds.height, scale);

    var canvasCtxt = ctxt.canvasCtxt;

    canvasCtxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);

    canvasCtxt.translate(this.bounds.x, this.bounds.y);

    if (this.titles) this.titles.draw(ctxt);

    for (var i = 0; i < this.lines.length; i++) this.lines[i].draw(ctxt);

    canvasCtxt.translate(-this.bounds.x, -this.bounds.y);
  }

  getSvgProps() {
    return {
      xmlns: "http://www.w3.org/2000/svg",
      version: "1.1",
      class: "ChantScore",
      width: this.bounds.width,
      height: this.bounds.height,
      viewBox: [0, 0, this.bounds.width, this.bounds.height].join(" ")
    };
  }

  createSvgNode(ctxt) {
    // create defs section
    var node = [ctxt.defsNode.cloneNode(true)];
    node[0].appendChild(ctxt.createStyleNode());

    if (this.titles) node.push(this.titles.createSvgNode(ctxt));

    for (var i = 0; i < this.lines.length; i++)
      node.push(this.lines[i].createSvgNode(ctxt));

    node = QuickSvg.createNode("g", {}, node);

    node = QuickSvg.createNode("svg", this.getSvgProps(), node);

    node.source = this;
    this.svg = node;

    return node;
  }

  createReact(ctxt) {
    // create defs section
    var node = [
      QuickSvg.createReact(
        "defs",
        {},
        ...ctxt.makeDefs.map(makeDef => makeDef.makeReact()),
        ctxt.createStyleReact()
      )
    ];

    if (this.titles) node.push(this.titles.createReact(ctxt));

    for (var i = 0; i < this.lines.length; i++)
      node.push(this.lines[i].createReact(ctxt));

    node = QuickSvg.createReact("g", {}, ...node);
    let svgProps = this.getSvgProps();
    svgProps.source = this;
    node = QuickSvg.createReact("svg", svgProps, node);

    return node;
  }

  createSvg(ctxt) {
    var fragment = "";

    // create defs section
    for (var def in ctxt.defs)
      if (ctxt.defs.hasOwnProperty(def)) fragment += ctxt.defs[def];
    fragment += ctxt.createStyle();

    fragment = QuickSvg.createFragment("defs", {}, fragment);

    if (this.titles) fragment += this.titles.createSvgFragment(ctxt);

    for (var i = 0; i < this.lines.length; i++)
      fragment += this.lines[i].createSvgFragment(ctxt);

    fragment = QuickSvg.createFragment("g", {}, fragment);

    fragment = QuickSvg.createFragment("svg", this.getSvgProps(), fragment);

    return fragment;
  }

  createSvgNodeForEachLine(ctxt) {
    var node = [];

    var top = 0;
    for (var i = 0; i < this.lines.length; i++) {
      var lineFragment = [
        ctxt.defsNode.cloneNode(true),
        this.lines[i].createSvgNode(ctxt, top)
      ];
      lineFragment[0].appendChild(ctxt.createStyleNode());
      var height = this.lines[i].bounds.height + ctxt.staffInterval * 1.5;
      lineFragment = QuickSvg.createNode("g", {}, lineFragment);
      lineFragment = QuickSvg.createNode(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          version: "1.1",
          class: "ChantScore",
          width: this.bounds.width,
          height: height,
          viewBox: [0, 0, this.bounds.width, height].join(" ")
        },
        lineFragment
      );
      node.push(lineFragment);
      top += height;
    }
    return node;
  }

  createSvgForEachLine(ctxt) {
    var fragment = "",
      fragmentDefs = "";

    // create defs section
    for (var def in ctxt.defs)
      if (ctxt.defs.hasOwnProperty(def)) fragmentDefs += ctxt.defs[def];
    fragmentDefs += ctxt.createStyle();

    fragmentDefs = QuickSvg.createFragment("defs", {}, fragmentDefs);
    var top = 0;
    for (var i = 0; i < this.lines.length; i++) {
      var lineFragment =
        fragmentDefs + this.lines[i].createSvgFragment(ctxt, top);
      var height = this.lines[i].bounds.height + ctxt.staffInterval * 1.5;
      lineFragment = QuickSvg.createFragment("g", {}, lineFragment);
      lineFragment = QuickSvg.createFragment(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          version: "1.1",
          "xmlns:xlink": "http://www.w3.org/1999/xlink",
          class: "ChantScore",
          width: this.bounds.width,
          height: height
        },
        lineFragment
      );
      fragment += lineFragment;
      top += height;
    }
    return fragment;
  }

  unserializeFromJson(data, ctxt) {
    this.autoColoring = data["auto-coloring"];

    if (data.annotation !== null && data.annotation !== "") {
      // create the annotation
      this.annotation = new Annotation(ctxt, data.annotation);
    } else this.annotation = null;

    var createDropCap = data["drop-cap"] === "auto" ? true : false;

    Gabc.parseChantNotations(data.notations, this, createDropCap);
  }

  serializeToJson() {
    var data = {};

    data["type"] = "score";
    data["auto-coloring"] = true;

    if (this.annotation !== null)
      data.annotation = this.annotation.unsanitizedText;
    else data.annotation = "";

    return data;
  }
}

export class ChantDocument {
  constructor() {
    var defaults = {
      layout: {
        units: "mm",
        "default-font": {
          "font-family": "Crimson",
          "font-size": 14
        },
        page: {
          width: 8.5,
          height: 11,
          "margin-left": 0,
          "margin-top": 0,
          "margin-right": 0,
          "margin-bottom": 0
        }
      },
      scores: []
    };

    // default layout
    this.copyLayout(this, defaults);

    this.scores = defaults.scores;
  }

  copyLayout(to, from) {
    to.layout = {
      units: from.layout.units,
      "default-font": {
        "font-family": from.layout["default-font"]["font-family"],
        "font-size": from.layout["default-font"]["font-size"]
      },
      page: {
        width: from.layout.page.width,
        height: from.layout.page.height,
        "margin-left": from.layout.page["margin-left"],
        "margin-top": from.layout.page["margin-top"],
        "margin-right": from.layout.page["margin-right"],
        "margin-bottom": from.layout.page["margin-bottom"]
      }
    };
  }

  unserializeFromJson(data) {
    this.copyLayout(this, data);

    this.scores = [];

    // read in the scores
    for (var i = 0; i < data.scores.length; i++) {
      var score = new ChantScore();

      score.unserializeFromJson(data.scores[i]);
      this.scores.push(score);
    }
  }

  serializeToJson() {
    var data = {};

    this.copyLayout(data, this);

    data.scores = [];

    // save scores...
    for (var i = 0; i < this.scores.length; i++)
      data.scores.push(this.scores[i].serializeToJson());

    return data;
  }
}
