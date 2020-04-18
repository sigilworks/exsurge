import { Point, Rect } from '../core';
import { Glyphs } from '../glyphs.constants';
import { QuickSvg } from 'elements/drawing.util';
import {
    GlyphCodes,
    LyricTypes,
    TextMeasuringStrategies
} from 'elements/elements.constants';

/*
 * ChantLayoutElement
 */
export class ChantLayoutElement {

    constructor() {

        this.bounds = new Rect();
        this.origin = new Point(0, 0);

        this.selected = false;
        this.highlighted = false;
    }

    // draws the element on an html5 canvas
    draw(ctxt) {

    }

    // returns svg code for the element, used for printing support
    createSvgFragment(ctxt) {
        throw 'ChantLayout Elements must implement createSvgFragment(ctxt)';
    }
}


export class DividerLineVisualizer extends ChantLayoutElement {

    constructor(ctxt, staffPosition0, staffPosition1) {
        super();

        var y0 = ctxt.calculateHeightFromStaffPosition(staffPosition0);
        var y1 = ctxt.calculateHeightFromStaffPosition(staffPosition1);

        if (y0 > y1) {
            var temp = y0;
            y0 = y1;
            y1 = temp;
        }

        this.bounds.x = 0;
        this.bounds.y = y0;
        this.bounds.width = ctxt.dividerLineWeight;
        this.bounds.height = y1 - y0;

        this.origin.x = this.bounds.width / 2;
        this.origin.y = y0;
    }

    draw(ctxt) {
        var canvasCtxt = ctxt.canvasCtxt;

        canvasCtxt.lineWidth = this.bounds.width;
        canvasCtxt.strokeStyle = ctxt.dividerLineColor;

        canvasCtxt.beginPath();
        canvasCtxt.moveTo(this.bounds.x - this.origin.x, this.bounds.y);
        canvasCtxt.lineTo(this.bounds.x - this.origin.x, this.bounds.y + this.bounds.height);
        canvasCtxt.stroke();
    }

    createSvgFragment(ctxt) {

        return QuickSvg.createFragment('rect', {
            'x': this.bounds.x,
            'y': this.bounds.y,
            'width': ctxt.dividerLineWeight,
            'height': this.bounds.height,
            'fill': ctxt.dividerLineColor,
            'class': 'dividerLine'
        });
    }
}

export class NeumeLineVisualizer extends ChantLayoutElement {

    constructor(ctxt, note0, note1, hanging) {
        super();

        var staffPosition0 = note0.staffPosition;
        var staffPosition1 = note1.staffPosition;

        // note0 should be the upper one for our calculations here
        if (staffPosition0 < staffPosition1) {
            var temp = staffPosition0;
            staffPosition0 = staffPosition1;
            staffPosition1 = temp;
        }

        var y0 = ctxt.calculateHeightFromStaffPosition(staffPosition0);
        var y1 = 0;

        if (hanging) {

            // if the difference between the notes is only one, and the upper
            // note is on a line, and the lower note is within the four staff lines,
            // then our hanging line goes past the lower note by a whole
            // staff interval
            if (staffPosition0 - staffPosition1 === 1 && Math.abs(staffPosition0) % 2 === 1 &&
                staffPosition1 > -3)
                staffPosition1--;

            y1 += ctxt.glyphPunctumHeight * ctxt.glyphScaling / 2.2;
        }

        y1 += ctxt.calculateHeightFromStaffPosition(staffPosition1);

        this.bounds.x = 0;
        this.bounds.y = y0;
        this.bounds.width = ctxt.neumeLineWeight;
        this.bounds.height = y1 - y0;

        this.origin.x = 0;
        this.origin.y = 0;
    }

    draw(ctxt) {
        var canvasCtxt = ctxt.canvasCtxt;

        canvasCtxt.lineWidth = this.bounds.width;
        canvasCtxt.strokeStyle = ctxt.neumeLineColor;

        canvasCtxt.beginPath();

        // since the canvas context draws strokes centered on the path
        // and neume lines are supposed to be draw left aligned,
        // we need to offset the line by half the line width.
        var x = this.bounds.x + this.bounds.width / 2;

        canvasCtxt.moveTo(x, this.bounds.y);
        canvasCtxt.lineTo(x, this.bounds.y + this.bounds.height);
        canvasCtxt.stroke();
    }

    createSvgFragment(ctxt) {

        return QuickSvg.createFragment('rect', {
            'x': this.bounds.x,
            'y': this.bounds.y,
            'width': ctxt.neumeLineWeight,
            'height': this.bounds.height,
            'fill': ctxt.neumeLineColor,
            'class': 'neumeLine'
        });
    }
}

export class VirgaLineVisualizer extends ChantLayoutElement {

    constructor(ctxt, note) {
        super();

        var staffPosition = note.staffPosition;

        var y0 = ctxt.calculateHeightFromStaffPosition(staffPosition);
        var y1;

        if (Math.abs(staffPosition % 2) === 0)
            y1 = y0 + ctxt.staffInterval * 1.8;
        else
            y1 = y0 + ctxt.staffInterval * 2.7;

        this.bounds.x = 0;
        this.bounds.y = y0;
        this.bounds.width = ctxt.neumeLineWeight;
        this.bounds.height = y1 - y0;

        this.origin.x = 0;
        this.origin.y = 0;
    }

    draw(ctxt) {
        var canvasCtxt = ctxt.canvasCtxt;

        canvasCtxt.lineWidth = this.bounds.width;
        canvasCtxt.strokeStyle = ctxt.neumeLineColor;

        canvasCtxt.beginPath();
        canvasCtxt.moveTo(this.bounds.x, this.bounds.y);
        canvasCtxt.lineTo(this.bounds.x, this.bounds.y + this.bounds.height);
        canvasCtxt.stroke();
    }

    createSvgFragment(ctxt) {

        return QuickSvg.createFragment('rect', {
            'x': this.bounds.x,
            'y': this.bounds.y,
            'width': ctxt.neumeLineWeight,
            'height': this.bounds.height,
            'fill': ctxt.neumeLineColor,
            'class': 'neumeLine'
        });
    }
}

export class GlyphVisualizer extends ChantLayoutElement {

    constructor(ctxt, glyphCode) {
        super();

        this.glyph = null;

        this.setGlyph(ctxt, glyphCode);
    }

    setGlyph(ctxt, glyphCode) {

        if (this.glyphCode === glyphCode)
            return;

        if (typeof glyphCode === 'undefined' || glyphCode === null || glyphCode === '')
            this.glyphCode = GlyphCodes.None;
        else
            this.glyphCode = glyphCode;

        this.glyph = Glyphs[this.glyphCode];

        // if this glyph hasn't been used yet, then load it up in the defs section for sharing
        if (!ctxt.defs.hasOwnProperty(this.glyphCode)) {
            var glyphSrc = this.glyph.svgSrc;

            // create the ref
            ctxt.defs[this.glyphCode] = QuickSvg.createFragment('g', {
                id: this.glyphCode,
                'class': 'glyph',
                transform: 'scale(' + ctxt.glyphScaling + ')'
            }, glyphSrc);
        }

        this.align = this.glyph.align;

        this.origin.x = this.glyph.origin.x * ctxt.glyphScaling;
        this.origin.y = this.glyph.origin.y * ctxt.glyphScaling;

        this.bounds.x = 0;
        this.bounds.y = -this.origin.y;
        this.bounds.width = this.glyph.bounds.width * ctxt.glyphScaling;
        this.bounds.height = this.glyph.bounds.height * ctxt.glyphScaling;
    }

    setStaffPosition(ctxt, staffPosition) {
        this.bounds.y += ctxt.calculateHeightFromStaffPosition(staffPosition);
    }

    draw(ctxt) {
        var canvasCtxt = ctxt.canvasCtxt;

        var x = this.bounds.x + this.origin.x;
        var y = this.bounds.y + this.origin.y;
        canvasCtxt.translate(x, y);
        canvasCtxt.scale(ctxt.glyphScaling, ctxt.glyphScaling);

        for (var i = 0; i < this.glyph.paths.length; i++) {
            var path = this.glyph.paths[i];
            canvasCtxt.fillStyle = ctxt.neumeLineColor;
            canvasCtxt.fill(new Path2D(path.data));
        }

        canvasCtxt.scale(1.0 / ctxt.glyphScaling, 1.0 / ctxt.glyphScaling);
        canvasCtxt.translate(-x, -y);
    }

    createSvgFragment(ctxt) {

        return QuickSvg.createFragment('use', {
            'xlink:href': '#' + this.glyphCode,
            x: this.bounds.x + this.origin.x,
            y: this.bounds.y + this.origin.y
        });
    }
}

export class RoundBraceVisualizer extends ChantLayoutElement {

    constructor(ctxt, x1, x2, y, isAbove) {
        super();

        if (x1 > x2) {
            // swap the xs
            var temp = x1;
            x1 = x2;
            x2 = temp;
        }

        this.isAbove = isAbove;
        this.braceHeight = ctxt.staffInterval / 2;

        this.bounds = new Rect(x1, y, x2 - x1, this.braceHeight);

        this.origin.x = 0;
        this.origin.y = 0;
    }

    createSvgFragment(ctxt) {
        var fragment = QuickSvg.createFragment('path', {
            'd': this.generatePathString(),
            'stroke': ctxt.neumeLineColor,
            'stroke-width': ctxt.staffLineWeight + 'px',
            'fill': 'none',
            'class': 'brace'
        });

        if (this.acuteAccent) {

            fragment += this.acuteAccent.createSvgFragment(ctxt);

            return QuickSvg.createFragment('g', {
                'class': 'accentedBrace'
            }, fragment);
        } return fragment;
    }

    // returns svg path d string
    generatePathString() {

        var x1 = this.bounds.x;
        var x2 = this.bounds.right();
        var width = this.bounds.width;
        var y, dx, dy;

        if (this.isAbove) {
            y = this.bounds.bottom();
            dx = width / 6;
            dy = -width / 6;
        } else {
            y = this.bounds.y;
            dx = width / 6;
            dy = width / 6;
        }

        //Calculate Control Points of path,
        var cx1 = x1 + dx;
        var cy = y + dy;
        var cx2 = x2 - dx;

        // two decimal points should be enough, but if we need more precision, we can
        // up it here.
        var dp = 2;
        return 'M ' + x1.toFixed(dp) + ' ' + y.toFixed(dp) +
            ' C ' + cx1.toFixed(dp) + ' ' + cy.toFixed(dp) +
            ' ' + cx2.toFixed(dp) + ' ' + cy.toFixed(dp) +
            ' ' + x2.toFixed(dp) + ' ' + y.toFixed(dp);
    }
}

export class CurlyBraceVisualizer extends ChantLayoutElement {

    constructor(ctxt, x1, x2, y, isAbove = true, addAcuteAccent = false) {
        super();

        if (x1 > x2) {
            // swap the xs
            var temp = x1;
            x1 = x2;
            x2 = temp;
        }

        this.isAbove = isAbove;
        this.braceHeight = ctxt.staffInterval / 2;

        // y is the actual vertical start of the brace (left hand side)
        // thus for a brace over notes, bounds.y is the bottom of brace,
        // but for a brace under the notes, y is simply the y passed in.
        if (isAbove)
            y -= this.braceHeight;

        var bounds = new Rect(x1, y, x2 - x1, this.braceHeight);

        if (addAcuteAccent && isAbove) {

            this.acuteAccent = new GlyphVisualizer(ctxt, GlyphCodes.AcuteAccent);
            this.acuteAccent.bounds.x += bounds.x + (x2 - x1) / 2;
            this.acuteAccent.bounds.y += bounds.y - ctxt.staffInterval / 4;

            bounds.union(this.acuteAccent.bounds);
        }

        this.bounds = bounds;

        this.origin.x = 0;
        this.origin.y = 0;
    }

    createSvgFragment(ctxt) {
        var fragment = QuickSvg.createFragment('path', {
            'd': this.generatePathString(),
            'stroke': ctxt.neumeLineColor,
            'stroke-width': ctxt.staffLineWeight + 'px',
            'fill': 'none',
            'class': 'brace'
        });

        if (this.acuteAccent) {

            fragment += this.acuteAccent.createSvgFragment(ctxt);

            return QuickSvg.createFragment('g', {
                'class': 'accentedBrace'
            }, fragment);
        } return fragment;
    }

    // code below inspired by: https://gist.github.com/alexhornbake
    // optimized for braces that are only drawn horizontally.
    // returns svg path d string
    generatePathString() {

        var q = 0.6; // .5 is normal, higher q = more expressive bracket

        var x1 = this.bounds.x;
        var x2 = this.bounds.right();
        var width = this.bounds.width;
        var y, h;

        if (this.isAbove) {
            y = this.bounds.bottom();
            h = -this.braceHeight;
        } else {
            y = this.bounds.y;
            h = this.braceHeight;
        }

        // calculate Control Points of path
        var qy1 = y + q * h;
        var qx2 = x1 + .25 * width;
        var qy2 = y + (1 - q) * h;
        var tx1 = x1 + .5 * width;
        var ty1 = y + h;
        var qy3 = y + q * h;
        var qx4 = x1 + .75 * width;
        var qy4 = y + (1 - q) * h;

        // two decimal points should be enough, but if we need more precision, we can
        // up it here.
        var dp = 2;
        return 'M ' + x1.toFixed(dp) + ' ' + y.toFixed(dp) +
            ' Q ' + x1.toFixed(dp) + ' ' + qy1.toFixed(dp) + ' ' + qx2.toFixed(dp) + ' ' + qy2.toFixed(dp) +
            ' T ' + tx1.toFixed(dp) + ' ' + ty1.toFixed(dp) +
            ' M ' + x2.toFixed(dp) + ' ' + y.toFixed(dp) +
            ' Q ' + x2.toFixed(dp) + ' ' + qy3.toFixed(dp) + ' ' + qx4.toFixed(dp) + ' ' + qy4.toFixed(dp) +
            ' T ' + tx1.toFixed(dp) + ' ' + ty1.toFixed(dp);
    }
}

var TextSpan = function(text, properties) {
    if (typeof properties === 'undefined' || properties === null)
        properties = '';

    this.text = text;
    this.properties = properties;
};

var boldMarkup = '*';
var italicMarkup = '_';
var redMarkup = '^';
var smallCapsMarkup = '%';

function MarkupStackFrame(symbol, startIndex, properties) {
    this.symbol = symbol;
    this.startIndex = startIndex;
    this.properties = properties;
}

MarkupStackFrame.createStackFrame = function(symbol, startIndex) {

    var properties = '';

    switch (symbol) {
        case boldMarkup:
            properties = 'font-weight:bold;';
            break;
        case italicMarkup:
            properties = 'font-style:italic;';
            break;
        case redMarkup:
            properties = 'fill:#f00;'; // SVG text color is set by the fill property
            break;
        case smallCapsMarkup:
            properties = 'font-variant:small-caps;font-feature-settings:"smcp";-webkit-font-feature-settings:"smcp";';
            break;
    }

    return new MarkupStackFrame(symbol, startIndex, properties);
};


// for escaping html strings before they go into the svgs
// adapted from http://stackoverflow.com/a/12034334/5720160
var __subsForTspans = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};

export class TextElement extends ChantLayoutElement {

    constructor(ctxt, text, fontFamily, fontSize, textAnchor) {
        super();

        // set these to some sane values for now...
        this.bounds.x = 0;
        this.bounds.y = 0;
        this.bounds.width = 0;
        this.bounds.height = 0;
        this.origin.x = 0;
        this.origin.y = 0;

        this.fontFamily = fontFamily;
        this.fontSize = fontSize;
        this.textAnchor = textAnchor;
        this.dominantBaseline = 'baseline'; // default placement

        this.generateSpansFromText(ctxt, text);

        this.recalculateMetrics(ctxt);
    }

    generateSpansFromText(ctxt, text) {

        this.text = '';
        this.spans = [];

        // save ourselves a lot of grief for a very common text:
        if (text === '*' || text === '†') {
            this.spans.push(new TextSpan(text));
            return;
        }

        var markupStack = [];
        var spanStartIndex = 0;

        var filterFrames = (frame, symbol) => frame.Symbol === symbol;

        var that = this;
        var closeSpan = function(spanText, extraProperties) {
            if (spanText === '')
                return;

            that.text += spanText;

            var properties = '';
            for (var i = 0; i < markupStack.length; i++)
                properties += markupStack[i].properties;

            if (extraProperties)
                properties = properties + extraProperties;

            that.spans.push(new TextSpan(spanText, properties));
        };

        var markupRegex = /(\*|_|\^|%|[ARVarv]\/\.)/g;

        var match = null;
        while ((match = markupRegex.exec(text))) {

            var markupSymbol = match[0];

            // non-matching symbols first
            if (markupSymbol === 'A/.' || markupSymbol === 'R/.' || markupSymbol === 'V/.' ||
                markupSymbol === 'a/.' || markupSymbol === 'r/.' || markupSymbol === 'v/.') {
                closeSpan(text[match.index] + '.', 'font-family:"Exsurge Characters";fill:#f00;');
            } else if (markupStack.length === 0) {
                // otherwise we're dealing with matching markup delimeters
                // if this is our first markup frame, then just create an inline for preceding text and push the stack frame
                closeSpan(text.substring(spanStartIndex, match.index));
                markupStack.push(MarkupStackFrame.createStackFrame(markupSymbol, match.index));
            } else {

                if (markupStack[markupStack.length - 1].symbol === markupSymbol) {
                    // group close
                    closeSpan(text.substring(spanStartIndex, match.index));
                    markupStack.pop();
                } else if (markupStack.filter(filterFrames).length > 0) {
                    // trying to open a recursive group (or forgot to close a previous group)
                    // in either case, we just unwind to the previous stack frame
                    spanStartIndex = markupStack[markupStack.length - 1].startIndex;
                    markupStack.pop();
                    continue;
                } else {
                    // group open
                    closeSpan(text.substring(spanStartIndex, match.index));
                    markupStack.push(MarkupStackFrame.createStackFrame(markupSymbol, match.index));
                }
            }

            // advance the start index past the current markup
            spanStartIndex = match.index + markupSymbol.length;
        }

        // if we finished matches, and there is still some text left, create one final run
        if (spanStartIndex < text.length)
            closeSpan(text.substring(spanStartIndex, text.length));

        // if after all of that we still didn't create any runs, then just add the entire text
        // string itself as a run
        if (this.spans.length === 0)
            closeSpan(text);
    }

    measureSubstring(ctxt, length) {
        if (length === 0) return 0;
        if (!length) length = Infinity;
        var canvasCtxt = ctxt.canvasCtxt;
        var baseFont = this.fontSize + 'px ' + this.fontFamily;
        var width = 0;
        var subStringLength = 0;
        for (var i = 0; i < this.spans.length; i++) {
            var font = '',
                span = this.spans[i],
                myText = span.text.slice(0, length - subStringLength);
            if (span.properties.indexOf('font-style:italic;') >= 0) font += 'italic ';
            if (span.properties.indexOf('font-variant:small-caps;') >= 0) font += 'small-caps ';
            if (span.properties.indexOf('font-weight:bold;') >= 0) font += 'bold ';
            font += baseFont;
            canvasCtxt.font = font;
            var metrics = canvasCtxt.measureText(myText, this.bounds.x, this.bounds.y);
            width += metrics.width;
            subStringLength += myText.length;
            if (subStringLength === length) break;
        }
        return width;
    }

    recalculateMetrics(ctxt) {

        this.bounds.x = 0;
        this.bounds.y = 0;

        this.bounds.x = 0;
        this.bounds.y = 0;

        this.origin.x = 0;

        if (ctxt.textMeasuringStrategy === TextMeasuringStrategies.SVG) {
            var xml = '<svg xmlns="http://www.w3.org/2000/svg">' + this.createSvgFragment(ctxt) + '</svg>';
            var doc = new DOMParser().parseFromString(xml, 'application/xml');

            while (ctxt.svgTextMeasurer.firstChild)
                ctxt.svgTextMeasurer.firstChild.remove();

            ctxt.svgTextMeasurer.appendChild(ctxt.svgTextMeasurer.ownerDocument.importNode(doc.documentElement, true).firstChild);

            var bbox = ctxt.svgTextMeasurer.firstChild.getBBox();
            this.bounds.width = bbox.width;
            this.bounds.height = bbox.height;
            this.origin.y = -bbox.y; // offset to baseline from top
        } else if (ctxt.textMeasuringStrategy === TextMeasuringStrategies.CANVAS) {
            this.bounds.width = this.measureSubstring(ctxt);
            this.bounds.height = this.fontSize * 1.2;
            this.origin.y = this.fontSize;
        }
    }

    getCssClasses() {
        return '';
    }

    getExtraStyleProperties(ctxt) {
        return '';
    }

    static escapeForTspan(string) {
        return String(string).replace(/[&<>]/g, function(s) {
            return __subsForTspans[s];
        });
    }

    draw(ctxt) {

        var canvasCtxt = ctxt.canvasCtxt;

        if (this.textAnchor === 'middle')
            canvasCtxt.textAlign = 'center';
        else
            canvasCtxt.textAlign = 'start';

        canvasCtxt.font = this.fontSize + 'px ' + this.fontFamily;

        for (var i = 0; i < this.spans.length; i++)
            canvasCtxt.fillText(this.spans[i].text, this.bounds.x, this.bounds.y);
    }

    createSvgFragment(ctxt) {

        var spans = '';

        for (var i = 0; i < this.spans.length; i++) {
            var options = {};

            if (this.spans[i].properties)
                options['style'] = this.spans[i].properties;

            spans += QuickSvg.createFragment('tspan', options, TextElement.escapeForTspan(this.spans[i].text));
        }

        var styleProperties = 'font-family:' + this.fontFamily +
            ';font-size:' + this.fontSize + 'px' +
            ';font-kerning:normal;' +
            this.getExtraStyleProperties(ctxt);

        return QuickSvg.createFragment('text', {
            'x': this.bounds.x,
            'y': this.bounds.y,
            'class': this.getCssClasses().trim(),
            'text-anchor': this.textAnchor,
            'dominant-baseline': this.dominantBaseline,
            'style': styleProperties
        }, spans);
    }
}

export class Lyric extends TextElement {
    constructor(ctxt, text, lyricType) {
        super(ctxt, text, ctxt.lyricTextFont, ctxt.lyricTextSize, 'start');

        // save the original text in case we need to later use the lyric
        // in a dropcap...
        this.originalText = text;

        if (typeof lyricType === 'undefined' || lyricType === null || lyricType === '')
            this.lyricType = LyricTypes.SINGLE_SYLLABLE;
        else
            this.lyricType = lyricType;

        // Lyrics keep track of how to center them on notation elements.
        // centerTextIndex is the index in this.text where the centering starts,
        // centerLength is how many characters comprise the center point.
        // performLayout will do the processing
        this.centerStartIndex = -1;
        this.centerLength = text.length;

        this.needsConnector = false;

        // Lyrics can have their own language defined, which affects the alignment
        // of the text with the notation element
        this.language = null;
    }

    allowsConnector() {
        return this.lyricType === LyricTypes.BEGINNING_SYLLABLE ||
            this.lyricType === LyricTypes.MIDDLE_SYLLABLE;
    }

    setNeedsConnector(needs) {
        if (needs === true) {
            this.needsConnector = true;
            this.bounds.width = this.widthWithConnector;

            if (this.spans.length > 0)
                this.spans[this.spans.length - 1].text = this.lastSpanTextWithConnector;
        } else {
            this.needsConnector = false;
            this.bounds.width = this.widthWithoutConnector;

            if (this.spans.length > 0)
                this.spans[this.spans.length - 1].text = this.lastSpanText;
        }
    }

    generateSpansFromText(ctxt, text) {
        super.generateSpansFromText(ctxt, text);

        if (this.spans.length > 0) {
            this.lastSpanText = this.spans[this.spans.length - 1].text;
            this.lastSpanTextWithConnector = this.lastSpanText + ctxt.syllableConnector;
        } else {
            this.lastSpanText = '';
            this.lastSpanTextWithConnector = '';
        }
    }

    recalculateMetrics(ctxt) {
        super.recalculateMetrics(ctxt);

        this.widthWithoutConnector = this.bounds.width;
        this.textWithConnector = this.text + ctxt.syllableConnector;

        this.widthWithConnector = this.bounds.width + ctxt.hyphenWidth;

        var activeLanguage = this.language || ctxt.defaultLanguage;

        // calculate the point where the text lines up to the staff notation
        // and offset the rect that much. By default we just center the text,
        // but the logic below allows for smarter lyric alignment based
        // on manual override or language control.
        var offset = this.widthWithoutConnector / 2, x1, x2;

        // some simple checks for sanity, and disable manual centering if the numbers are bad
        if (this.centerStartIndex >= 0 && (this.centerStartIndex >= this.text.length ||
            this.centerLength < 0 ||
            this.centerStartIndex + this.centerLength > this.text.length))
            this.centerStartIndex = -1;

        if (this.text.length === 0) {
            // if we have no text to work with, then there's nothing to do!
        } else if (this.centerStartIndex >= 0) {
            // if we have manually overriden the centering logic for this lyric,
            // then always use that.
            if (ctxt.textMeasuringStrategy === TextMeasuringStrategies.SVG) {
                // svgTextMeasurer still has the current lyric in it...
                x1 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, this.centerStartIndex);
                x2 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, this.centerStartIndex + this.centerLength);
            } else if (ctxt.textMeasuringStrategy === TextMeasuringStrategies.CANVAS) {
                x1 = this.measureSubstring(ctxt, this.centerStartIndex);
                x2 = this.measureSubstring(ctxt, this.centerStartIndex + this.centerLength);
            }
            offset = x1 + (x2 - x1) / 2;
        } else {

            // if it's a directive with no manual centering override, then
            // just center the text.
            if (this.lyricType !== LyricTypes.DIRECTIVE) {

                // Non-directive elements are lined up to the chant notation based on vowel segments,
                var result = activeLanguage.findVowelSegment(this.text, 0);

                if (result.found === true) {
                    if (ctxt.textMeasuringStrategy === TextMeasuringStrategies.SVG) {
                        // svgTextMeasurer still has the current lyric in it...
                        x1 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, result.startIndex);
                        x2 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, result.startIndex + result.length);
                    } else if (ctxt.textMeasuringStrategy === TextMeasuringStrategies.CANVAS) {
                        x1 = this.measureSubstring(ctxt, result.startIndex);
                        x2 = this.measureSubstring(ctxt, result.startIndex + result.length);
                    }
                    offset = x1 + (x2 - x1) / 2;
                }
            }
        }

        this.bounds.x = -offset;
        this.bounds.y = 0;

        this.origin.x = offset;

        this.bounds.width = this.widthWithoutConnector;
        this.bounds.height = ctxt.lyricTextSize;
    }

    generateDropCap(ctxt) {

        var dropCap = new DropCap(ctxt, this.originalText.substring(0, 1));

        // if the dropcap is a single character syllable (vowel) that is the
        // beginning of the word, then we use a hyphen in place of the lyric text
        // and treat it as a single syllable.
        if (this.originalText.length === 1) {
            this.generateSpansFromText(ctxt, ctxt.syllableConnector);
            this.centerStartIndex = -1;
            this.lyricType = LyricTypes.SINGLE_SYLLABLE;
        } else {
            this.generateSpansFromText(ctxt, this.originalText.substring(1));
            this.centerStartIndex--; // lost a letter, so adjust centering accordingly
        }

        return dropCap;
    }

    getCssClasses() {

        var classes = 'lyric ';

        if (this.lyricType === LyricTypes.DIRECTIVE)
            classes += 'directive ';

        return classes + super.getCssClasses();
    }

    getExtraStyleProperties(ctxt) {
        var props = super.getExtraStyleProperties();

        if (this.lyricType === LyricTypes.DIRECTIVE && ctxt.autoColor === true)
            props += 'fill:#f00;';

        return props;
    }

    createSvgFragment(ctxt) {
        if (this.spans.length > 0) {
            if (this.needsConnector)
                this.spans[this.spans.length - 1].text = this.lastSpanTextWithConnector;
            else
                this.spans[this.spans.length - 1].text = this.lastSpanText;
        }

        return super.createSvgFragment(ctxt);
    }
}

export class DropCap extends TextElement {

    /**
     * @param {String} text
     */
    constructor(ctxt, text) {
        super(ctxt, text, ctxt.dropCapTextFont, ctxt.dropCapTextSize, 'middle');

        this.padding = ctxt.staffInterval * 2;
    }

    getCssClasses() {
        return 'dropCap ' + super.getCssClasses();
    }
}

export class Annotation extends TextElement {

    /**
     * @param {String} text
     */
    constructor(ctxt, text) {
        super(ctxt, text, ctxt.annotationTextFont, ctxt.annotationTextSize, 'middle');
        this.padding = ctxt.staffInterval;
        this.dominantBaseline = 'hanging'; // so that annotations can be aligned at the top.
    }

    getCssClasses() {
        return 'annotation ' + super.getCssClasses();
    }
}


export class ChantNotationElement extends ChantLayoutElement {

    constructor() {
        super();

        //double
        this.leadingSpace = 0.0;
        this.trailingSpace = -1; // if less than zero, this is automatically calculated at layout time
        this.keepWithNext = false;
        this.needsLayout = true;

        this.lyrics = [];

        this.score = null; // the ChantScore
        this.line = null; // the ChantLine

        this.visualizers = [];
    }

    hasLyrics() {
        if (this.lyrics.length !== 0)
            return true;
        return false;
    }

    getLyricLeft(index) {
        // warning: no error checking on index or on whether lyric[index] is valid
        return this.bounds.x + this.lyrics[index].bounds.x;
    }

    getAllLyricsLeft() {
        if (this.lyrics.length === 0)
            return this.bounds.right();

        var x = Number.MAX_VALUE;
        for (var i = 0; i < this.lyrics.length; i++) {
            if (this.lyrics[i])
                x = Math.min(x, this.lyrics[i].bounds.x);
        }

        return this.bounds.x + x;
    }

    getLyricRight(index) {
        // warning: no error checking on index or on whether lyric[index] is valid
        return this.bounds.x + this.lyrics[index].bounds.x + this.lyrics[index].bounds.width;
    }

    getAllLyricsRight() {
        if (this.lyrics.length === 0)
            return this.bounds.x;

        var x = Number.MIN_VALUE;
        for (var i = 0; i < this.lyrics.length; i++) {
            if (this.lyrics[i])
                x = Math.max(x, this.lyrics[i].bounds.x + this.lyrics[i].bounds.width);
        }

        return this.bounds.x + x;
    }

    // used by subclasses while building up the chant notations.
    addVisualizer(chantLayoutElement) {
        if (this.bounds.isEmpty())
            this.bounds = chantLayoutElement.bounds.clone();
        else
            this.bounds.union(chantLayoutElement.bounds);

        this.visualizers.push(chantLayoutElement);
    }

    // same as addVisualizer, except the element is unshifted to the front
    // of the visualizer array rather than the end. This way, some
    // visualizers can be placed behind the others...ledger lines for example.
    prependVisualizer(chantLayoutElement) {
        if (this.bounds.isEmpty())
            this.bounds = chantLayoutElement.bounds.clone();
        else
            this.bounds.union(chantLayoutElement.bounds);

        this.visualizers.unshift(chantLayoutElement);
    }

    // chant notation elements are given an opportunity to perform their layout via this function.
    // subclasses should call this function first in overrides of this function.
    // on completion, exsurge presumes that the bounds, the origin, and the fragment objects are
    // all valid and prepared for higher level layout.
    performLayout(ctxt) {

        if (this.trailingSpace < 0)
            this.trailingSpace = ctxt.intraNeumeSpacing * 4;

        // reset the bounds and the staff notations before doing a layout
        this.visualizers = [];
        this.bounds = new Rect(Infinity, Infinity, -Infinity, -Infinity);

        for (var i = 0; i < this.lyrics.length; i++)
            this.lyrics[i].recalculateMetrics(ctxt);
    }

    // some subclasses have internal dependencies on other notations (for example,
    // a custos can depend on a later neume which it uses to set its height).
    // subclasses can override this function so that when the notations are
    // altered, the subclass can correctly invalidate (and later restore) its own
    // dependencies
    resetDependencies() {

    }

    // a helper function for subclasses to call after they are done performing layout...
    finishLayout(ctxt) {

        this.bounds.x = 0;

        for (var i = 0; i < this.lyrics.length; i++)
            this.lyrics[i].bounds.x = this.origin.x - this.lyrics[i].origin.x;

        this.needsLayout = false;
    }

    draw(ctxt) {

        var canvasCtxt = ctxt.canvasCtxt;
        canvasCtxt.translate(this.bounds.x, 0);

        for (var i = 0; i < this.visualizers.length; i++)
            this.visualizers[i].draw(ctxt);

        for (i = 0; i < this.lyrics.length; i++)
            this.lyrics[i].draw(ctxt);

        canvasCtxt.translate(-this.bounds.x, 0);
    }

    createSvgFragment(ctxt) {
        var inner = '';

        for (var i = 0; i < this.visualizers.length; i++)
            inner += this.visualizers[i].createSvgFragment(ctxt);

        for (i = 0; i < this.lyrics.length; i++)
            inner += this.lyrics[i].createSvgFragment(ctxt);

        return QuickSvg.createFragment('g', {
            // this.constructor.name will not be the same after being mangled by UglifyJS
            'class': 'ChantNotationElement ' + this.constructor.name,
            'transform': 'translate(' + this.bounds.x + ',' + 0 + ')'
        }, inner);
    }
}
