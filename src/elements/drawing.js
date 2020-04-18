import { Point, Rect } from '../core';
import { Glyphs } from '../glyphs.constants';
import { QuickSvg } from 'elements/drawing.util';

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
        throw "ChantLayout Elements must implement draw(ctxt)";
    }

    // returns svg element
    createSvgNode(ctxt) {
        throw "ChantLayout Elements must implement createSvgNode(ctxt)";
    }

    // returns svg code for the element, used for printing support
    createSvgFragment(ctxt) {
        throw "ChantLayout Elements must implement createSvgFragment(ctxt)";
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

        canvasCtxt.fillStyle = ctxt.dividerLineColor;

        canvasCtxt.fillRect(this.bounds.x, this.bounds.y, ctxt.dividerLineWeight, this.bounds.height);
    }

    createSvgNode(ctxt) {

        return QuickSvg.createNode('rect', {
            'x': this.bounds.x,
            'y': this.bounds.y,
            'width': ctxt.dividerLineWeight,
            'height': this.bounds.height,
            'fill': ctxt.dividerLineColor,
            'class': 'dividerLine'
        });
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

        canvasCtxt.fillStyle = ctxt.neumeLineColor;

        canvasCtxt.fillRect(this.bounds.x, this.bounds.y, ctxt.neumeLineWeight, this.bounds.height);
    }

    createSvgNode(ctxt) {

        return QuickSvg.createNode('rect', {
            'x': this.bounds.x,
            'y': this.bounds.y,
            'width': ctxt.neumeLineWeight,
            'height': this.bounds.height,
            'fill': ctxt.neumeLineColor,
            'class': 'neumeLine'
        });
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

        canvasCtxt.fillStyle = ctxt.neumeLineColor;
        canvasCtxt.fillRect(this.bounds.x, this.bounds.y, ctxt.neumeLineWeight, this.bounds.height);
    }

    createSvgNode(ctxt) {

        return QuickSvg.createNode('rect', {
            'x': this.bounds.x,
            'y': this.bounds.y,
            'width': ctxt.neumeLineWeight,
            'height': this.bounds.height,
            'fill': ctxt.neumeLineColor,
            'class': 'neumeLine'
        });
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

        if (typeof glyphCode === 'undefined' || glyphCode === null || glyphCode === "")
            this.glyphCode = GlyphCode.None;
        else
            this.glyphCode = glyphCode;

        this.glyph = Glyphs[this.glyphCode];

        // if this glyph hasn't been used yet, then load it up in the defs section for sharing
        if (!ctxt.defs.hasOwnProperty(this.glyphCode)) {
            var makeDef = () => {
                // create the ref
                ctxt.defs[this.glyphCode] = QuickSvg.createFragment('g', {
                    id: this.glyphCode,
                    'class': 'glyph',
                    transform: 'scale(' + ctxt.glyphScaling + ')'
                }, QuickSvg.svgFragmentForGlyph(this.glyph));

                ctxt.defsNode.appendChild(QuickSvg.createNode('g', {
                    id: this.glyphCode,
                    'class': 'glyph',
                    transform: 'scale(' + ctxt.glyphScaling + ')'
                }, QuickSvg.nodesForGlyph(this.glyph)));
            };
            makeDef();
            ctxt.makeDefs.push(makeDef);
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
            canvasCtxt.fillStyle = path.type === 'negative' ? '#fff' : ctxt.neumeLineColor;
            canvasCtxt.fill(new Path2D(path.data));
        }

        canvasCtxt.scale(1.0 / ctxt.glyphScaling, 1.0 / ctxt.glyphScaling);
        canvasCtxt.translate(-x, -y);
    }

    createSvgNode(ctxt, source) {
        return QuickSvg.createNode('use', {
            source: source,
            'source-index': source.sourceIndex,
            'xlink:href': '#' + this.glyphCode,
            x: this.bounds.x + this.origin.x,
            y: this.bounds.y + this.origin.y
        });
    }

    createSvgFragment(ctxt, source) {
        return QuickSvg.createFragment('use', {
            'source-index': source.sourceIndex,
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
        this.braceHeight = 3 * ctxt.staffInterval / 2;

        this.bounds = new Rect(x1, isAbove ? y - this.braceHeight : y, x2 - x1, this.braceHeight);

        this.origin.x = 0;
        this.origin.y = 0;
    }

    createSvgNode(ctxt) {
        var node = QuickSvg.createNode('path', {
            'd': this.generatePathString(),
            'stroke': ctxt.neumeLineColor,
            'stroke-width': ctxt.staffLineWeight + 'px',
            'fill': 'none',
            'class': 'brace'
        });

        if (this.acuteAccent) {

            return QuickSvg.createNode('g', {
                'class': 'accentedBrace'
            }, [node, this.acuteAccent.createSvgNode(ctxt)]);
        } else
            return node;
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
        } else
            return fragment;
    }

    // returns svg path d string
    generatePathString() {

        var x1 = this.bounds.x;
        var x2 = this.bounds.right();
        var width = this.bounds.width;
        var y, dx, dy;

        dx = width / 6;
        dy = this.bounds.height;
        if (this.isAbove) {
            y = this.bounds.bottom();
            dy = -dy;
        } else {
            y = this.bounds.y;
        }

        //Calculate Control Points of path,
        var cx1 = x1 + dx;
        var cy = y + dy;
        var cx2 = x2 - dx;

        // two decimal points should be enough, but if we need more precision, we can
        // up it here.
        var dp = 2;
        return "M " + x1.toFixed(dp) + " " + y.toFixed(dp) +
            " C " + cx1.toFixed(dp) + " " + cy.toFixed(dp) +
            " " + cx2.toFixed(dp) + " " + cy.toFixed(dp) +
            " " + x2.toFixed(dp) + " " + y.toFixed(dp);
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

            this.acuteAccent = new GlyphVisualizer(ctxt, GlyphCode.AcuteAccent);
            this.acuteAccent.bounds.x += bounds.x + (x2 - x1) / 2;
            this.acuteAccent.bounds.y += bounds.y - ctxt.staffInterval / 4;

            bounds.union(this.acuteAccent.bounds);
        }

        this.bounds = bounds;

        this.origin.x = 0;
        this.origin.y = 0;
    }

    createSvgNode(ctxt) {
        var node = QuickSvg.createNode('path', {
            'd': this.generatePathString(),
            'stroke': ctxt.neumeLineColor,
            'stroke-width': ctxt.staffLineWeight + 'px',
            'fill': 'none',
            'class': 'brace'
        });

        if (this.acuteAccent) {

            return QuickSvg.createNode('g', {
                'class': 'accentedBrace'
            }, [node, this.acuteAccent.createSvgFragment(ctxt)]);
        } else
            return node;
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
        } else
            return fragment;
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
        return "M " + x1.toFixed(dp) + " " + y.toFixed(dp) +
            " Q " + x1.toFixed(dp) + " " + qy1.toFixed(dp) + " " + qx2.toFixed(dp) + " " + qy2.toFixed(dp) +
            " T " + tx1.toFixed(dp) + " " + ty1.toFixed(dp) +
            " M " + x2.toFixed(dp) + " " + y.toFixed(dp) +
            " Q " + x2.toFixed(dp) + " " + qy3.toFixed(dp) + " " + qx4.toFixed(dp) + " " + qy4.toFixed(dp) +
            " T " + tx1.toFixed(dp) + " " + ty1.toFixed(dp);
    }
}

var TextSpan = function(text, properties) {
    if (typeof properties === 'undefined' || properties === null)
        properties = {};

    this.text = text;
    this.properties = properties;
};

function MarkupStackFrame(symbol, startIndex, properties = {}) {
    this.symbol = symbol;
    this.startIndex = startIndex;
    this.properties = properties;
}

MarkupStackFrame.createStackFrame = function(ctxt, symbol, startIndex) {
    return new MarkupStackFrame(symbol, startIndex, ctxt.fontStyleDictionary[symbol]);
};


// for escaping html strings before they go into the svgs
// adapted from http://stackoverflow.com/a/12034334/5720160
var __subsForTspans = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;"
};

export class TextElement extends ChantLayoutElement {

    constructor(ctxt, text, fontFamily, fontSize, textAnchor, sourceIndex) {
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
        this.sourceIndex = sourceIndex;
        this.dominantBaseline = 'baseline'; // default placement

        this.generateSpansFromText(ctxt, text);

        this.recalculateMetrics(ctxt);
    }

    generateSpansFromText(ctxt, text) {
        text = text.replace(/\s+/g, ' ');
        this.text = "";
        this.spans = [];

        // save ourselves a lot of grief for a very common text:
        if (text === "*" || text === "†") {
            this.spans.push(new TextSpan(text));
            return;
        }

        var markupStack = [];
        var spanStartIndex = 0;

        var filterFrames = (frame, symbol) => frame.Symbol === symbol;

        var closeSpan = (spanText, extraProperties) => {
            if (spanText === "" && !this.dropCap)
                return;

            this.text += spanText;

            var properties = {};
            for (var i = 0; i < markupStack.length; i++)
                Object.assign(properties, markupStack[i].properties);

            if (extraProperties)
                Object.assign(properties, extraProperties);

            this.spans.push(new TextSpan(spanText, properties));
        };

        var markupRegex = /\\?([arv])(?:bar|\/\.)|([*_^%])(?=(?:(.+?)\2)?)/gi;

        var match = null;
        while ((match = markupRegex.exec(text))) {

            var markupSymbol = match[2];

            // non-matching symbols first
            if (match[1]) {
                closeSpan(ctxt.textBeforeSpecialChar + ctxt.specialCharText(match[1]) + ctxt.textAfterSpecialChar, ctxt.specialCharProperties);
            } else if (markupStack.length === 0) {
                // otherwise we're dealing with matching markup delimeters
                // if this is our first markup frame, then just create an inline for preceding text and push the stack frame
                if (markupSymbol === '*' && !match[3]) // we are only strict with the asterisk, because there are cases when it needs to be displayed rather than count as a markup symbol
                    continue;
                closeSpan(text.substring(spanStartIndex, match.index));
                markupStack.push(MarkupStackFrame.createStackFrame(ctxt, markupSymbol, match.index));
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
                    if (markupSymbol === '*' && !match[3])
                        continue;
                    closeSpan(text.substring(spanStartIndex, match.index));
                    markupStack.push(MarkupStackFrame.createStackFrame(ctxt, markupSymbol, match.index));
                }
            }

            // advance the start index past the current markup
            spanStartIndex = match.index + match[0].length;
        }

        // if we finished matches, and there is still some text left, create one final run
        if (spanStartIndex < text.length)
            closeSpan(text.substring(spanStartIndex, text.length));

        // if after all of that we still didn't create any runs, then just add the entire text
        // string itself as a run
        if (this.spans.length === 0)
            closeSpan(text);
    }

    getCanvasFontForProperties(properties = {}) {
        var font = '';
        if (properties['font-style'] === 'italic') font += 'italic ';
        if (properties['font-variant'] === 'small-caps') font += 'small-caps ';
        if (properties['font-weight'] === 'bold') font += 'bold ';
        font += (properties['font-size'] || `${this.fontSize * (this.resize || 1)}px`) + ' ';
        font += properties['font-family'] || this.fontFamily;
        return font;
    }

    // if length is undefined and this.rightAligned === true, then offsets will be marked for each newLine span
    measureSubstring(ctxt, length) {
        if (length === 0) return 0;
        if (!length) length = Infinity;
        if (length < 0) {
            var lines = -length;
            length = Infinity;
        }
        var canvasCtxt = ctxt.canvasCtxt;
        var width = 0;
        var widths = [];
        var newLineSpans = [this.spans[0]];
        var subStringLength = 0;
        for (var i = 0; i < this.spans.length; i++) {
            var span = this.spans[i],
                myText = span.text.slice(0, length - subStringLength);
            if (span.properties.newLine) {
                if (!lines && this.rightAligned === true && length === Infinity) {
                    newLineSpans[newLineSpans.length - 1].properties.xOffset = this.firstLineMaxWidth - width;
                    newLineSpans.push(span);
                } else if ((--lines === 0))
                    break;
                widths.push(width);
                width = 0;
            }
            canvasCtxt.font = this.getCanvasFontForProperties(span.properties);
            var metrics = canvasCtxt.measureText(myText, this.bounds.x, this.bounds.y);
            width += metrics.width;
            subStringLength += myText.length;
            if (subStringLength === length) break;
        }
        if (!lines && width && newLineSpans.length && this.rightAligned === true && length === Infinity) {
            newLineSpans[newLineSpans.length - 1].properties.xOffset = this.firstLineMaxWidth - width;
        }
        return Math.max(width, ...widths);
    }

    recalculateMetrics(ctxt) {

        this.bounds.x = 0;
        this.bounds.y = 0;

        this.origin.x = 0;

        if (ctxt.textMeasuringStrategy === TextMeasuringStrategy.Svg) {
            while (ctxt.svgTextMeasurer.firstChild)
                ctxt.svgTextMeasurer.removeChild(ctxt.svgTextMeasurer.firstChild);
            ctxt.svgTextMeasurer.appendChild(this.createSvgNode(ctxt));
            ctxt.svgTextMeasurer.appendChild(ctxt.createStyleNode());

            var bbox = ctxt.svgTextMeasurer.firstChild.getBBox();
            this.bounds.width = bbox.width;
            this.bounds.height = bbox.height;
            this.origin.y = -bbox.y; // offset to baseline from top
        } else if (ctxt.textMeasuringStrategy === TextMeasuringStrategy.Canvas) {
            var numLines = this.spans.reduce((r, i) => (r + (i.properties.newLine ? 1 : 0)), 1);
            this.bounds.width = this.measureSubstring(ctxt, this.rightAligned ? -1 : undefined);
            this.bounds.height = this.fontSize * Math.min(1, numLines + 0.2);
            this.origin.y = this.fontSize;
        }
    }

    setMaxWidth(ctxt, maxWidth, firstLineMaxWidth = maxWidth) {
        if (this.spans.filter(s => s.properties.newLine).length) {
            // first get rid of any new lines set from a previous maxWidth
            this.recalculateMetrics(ctxt);
        }
        if (this.bounds.width > maxWidth) {
            this.maxWidth = maxWidth;
            var percentage = maxWidth / this.bounds.width;
            if (percentage >= 0.85) {
                this.resize = percentage;
                console.info(percentage, this.text)
            } else {
                if (firstLineMaxWidth < 0) firstLineMaxWidth = maxWidth;
                this.firstLineMaxWidth = firstLineMaxWidth;
                var lastWidth = 0,
                    lastMatch = null,
                    regex = /\s+|$/g,
                    max = firstLineMaxWidth,
                    match;
                while ((match = regex.exec(this.text)) && (!lastMatch || match.index > lastMatch.index)) {
                    var width = this.measureSubstring(ctxt, match.index);
                    if (width > max && lastMatch) {
                        var spanIndex = 0,
                            length = 0;
                        while (length < lastMatch.index && spanIndex < this.spans.length) {
                            let span = this.spans[spanIndex++];
                            length += span.text.length + (span.properties.newLine ? 1 : 0);
                        }
                        if (length > lastMatch.index) {
                            let span = this.spans[--spanIndex];
                            length -= span.text.length;
                        }
                        var splitSpan = this.spans[spanIndex],
                            textLeft = splitSpan.text.slice(0, lastMatch.index - length),
                            textRight = splitSpan.text.slice(lastMatch.index + lastMatch[0].length - length),
                            newSpans = [];
                        this.rightAligned = (max === firstLineMaxWidth && firstLineMaxWidth !== maxWidth);
                        if (textLeft) newSpans.push(new TextSpan(textLeft, splitSpan.properties));
                        if (textRight) {
                            newSpans.push(new TextSpan(textRight, Object.assign({}, splitSpan.properties, { newLine: true })));
                        } else if (this.spans[spanIndex + 1]) {
                            this.spans[spanIndex + 1].properties.newLine = true;
                        }
                        this.spans.splice(spanIndex, 1, ...newSpans);
                        this.needsLayout = true;
                        max = maxWidth;
                        if (match.index === this.text.length || this.measureSubstring(ctxt) <= maxWidth) break;
                        width = 0;
                        match = lastMatch = null;
                    }
                    lastWidth = width;
                    lastMatch = match;
                }
            }
            this.recalculateMetrics(ctxt, false);
        }
    }

    getCssClasses() {
        return "";
    }

    getExtraStyleProperties(ctxt) {
        return {};
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

        var translateWidth = 0,
            translateHeight = 0;
        for (var i = 0; i < this.spans.length; i++) {
            var span = this.spans[i];
            var xOffset = span.properties.xOffset || 0;
            if (span.properties.newLine) {
                canvasCtxt.translate(translateWidth + xOffset, this.fontSize);
                translateWidth = -xOffset;
                translateHeight -= this.fontSize;
            } else if (xOffset) {
                canvasCtxt.translate(translateWidth + xOffset, 0);
                translateWidth = -xOffset;
            }
            var properties = Object.assign({}, this.getExtraStyleProperties(ctxt), span.properties);
            canvasCtxt.font = this.getCanvasFontForProperties(properties);
            canvasCtxt.fillStyle = properties.fill || '#000';
            canvasCtxt.fillText(span.text, this.bounds.x, this.bounds.y, span.properties.textLength || undefined);
            var metrics = canvasCtxt.measureText(span.text, this.bounds.x, this.bounds.y);
            translateWidth -= metrics.width;
            canvasCtxt.translate(metrics.width, 0);
        }
        canvasCtxt.translate(translateWidth, translateHeight);
    }

    createSvgNode(ctxt) {

        var spans = [];

        for (var i = 0; i < this.spans.length; i++) {
            var span = this.spans[i];
            var options = {};

            options['style'] = getCssForProperties(span.properties);
            if (span.properties.newLine) {
                var xOffset = span.properties.xOffset || 0;
                options.dy = '1em';
                options.x = this.bounds.x + xOffset;
            } else if (span.properties.xOffset) {
                options.x = this.bounds.x + span.properties.xOffset;
            }
            if (span.properties.textLength) {
                options.textLength = span.properties.textLength;
                options.lengthAdjust = "spacingAndGlyphs";
                options.y = this.bounds.y;
            }
            if (this.resize) {
                options['font-size'] = span.properties['font-size'] || (this.fontSize * this.resize);
            }

            spans.push(QuickSvg.createNode('tspan', options, span.text));
        }

        var styleProperties = getCssForProperties(this.getExtraStyleProperties(ctxt));

        return QuickSvg.createNode('text', {
            'source': this,
            'source-index': this.sourceIndex,
            'x': this.bounds.x,
            'y': this.bounds.y,
            'class': this.getCssClasses().trim(),
            'text-anchor': this.textAnchor,
            //'dominant-baseline': this.dominantBaseline, // hanging baseline doesn't work in Safari
            'style': styleProperties
        }, spans);
    }

    createSvgFragment(ctxt) {

        var spans = "";

        for (var i = 0; i < this.spans.length; i++) {
            var span = this.spans[i];
            var options = {};

            options['style'] = getCssForProperties(span.properties);
            if (span.properties.newLine) {
                var xOffset = span.properties.xOffset || 0;
                options.dy = '1em';
                options.x = this.bounds.x + xOffset;
            } else if (span.properties.xOffset) {
                options.x = this.bounds.x + span.properties.xOffset;
            }
            if (span.properties.textLength) {
                options.textLength = span.properties.textLength;
                options.lengthAdjust = "spacingAndGlyphs";
                options.y = this.bounds.y;
            }
            if (this.resize) {
                options['font-size'] = span.properties['font-size'] || (this.fontSize * this.resize);
            }

            spans += QuickSvg.createFragment('tspan', options, TextElement.escapeForTspan(span.text));
        }

        var styleProperties = getCssForProperties(this.getExtraStyleProperties(ctxt));

        return QuickSvg.createFragment('text', {
            'source-index': this.sourceIndex,
            'x': this.bounds.x,
            'y': this.bounds.y,
            'class': this.getCssClasses().trim(),
            'text-anchor': this.textAnchor,
            //'dominant-baseline': this.dominantBaseline, // hanging baseline doesn't work in Safari
            'style': styleProperties
        }, spans);
    }
}


export var LyricArray = {
    getLeft: function(lyricArray) {
        if (lyricArray.length === 0)
            return NaN;

        var x = Number.MAX_VALUE;
        for (var i = 0; i < lyricArray.length; i++) {
            if (lyricArray[i])
                x = Math.min(x, lyricArray[i].notation.bounds.x + lyricArray[i].bounds.x);
        }

        return x;
    },

    getRight: function(lyricArray, presumeConnectorNeeded) {
        if (lyricArray.length === 0)
            return NaN;

        var x = Number.MIN_VALUE;
        for (var i = 0; i < lyricArray.length; i++) {
            let l = lyricArray[i];
            if (l)
                x = Math.max(x, l.notation.bounds.x + l.bounds.x + l.bounds.width + ((presumeConnectorNeeded && l.allowsConnector() && !l.needsConnector) ? l.getConnectorWidth() : 0));
        }

        return x;
    },

    hasOnlyOneLyric: function(lyricArray) {
        return lyricArray.filter(l => l.originalText).length === 1;
    },

    indexOfLyric: function(lyricArray) {
        return lyricArray.indexOf(lyricArray.filter(l => l.originalText)[0]);
    },

    mergeIn: function(lyricArray, newLyrics) {
        for (var i = 0; i < newLyrics.length; ++i) {
            if (newLyrics[i].originalText || !lyricArray[i]) lyricArray[i] = newLyrics[i];
        }
    },

    mergeInArray: function(lyricArray, notations) {
        for (var i = 0; i < notations.length; ++i) {
            this.mergeIn(lyricArray, notations[i].lyrics);
        }
    },

    setNotation: function(lyricArray, notation) {
        notation.lyrics = lyricArray;
        for (var i = 0; i < lyricArray.length; ++i) {
            lyricArray[i].notation = notation;
        }
    }
};

export class Lyric extends TextElement {
    constructor(ctxt, text, lyricType, notation, notations, sourceIndex) {
        super(ctxt, (ctxt.lyricTextStyle || '') + text, ctxt.lyricTextFont, ctxt.lyricTextSize, 'start', sourceIndex);

        // save the original text in case we need to later use the lyric
        // in a dropcap...
        this.originalText = text;

        this.notation = notation;
        this.notations = notations;

        if (typeof lyricType === 'undefined' || lyricType === null || lyricType === "")
            this.lyricType = LyricType.SingleSyllable;
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

        if (this.allowsConnector)
            this.connectorSpan = new TextSpan(ctxt.syllableConnector);
    }

    allowsConnector() {
        return this.lyricType === LyricType.BeginningSyllable ||
            this.lyricType === LyricType.MiddleSyllable;
    }

    setForceConnector(force) {
        this.forceConnector = force && this.allowsConnector();
    }

    setNeedsConnector(needs, width) {
        if (needs === true || this.forceConnector) {
            this.needsConnector = true;
            if (typeof width !== 'undefined') {
                this.setConnectorWidth(width)
            } else {
                this.bounds.width = this.widthWithoutConnector + this.getConnectorWidth();
            }

            if (this.spans.length > 0 && this.spans[this.spans.length - 1] !== this.connectorSpan)
                this.spans.push(this.connectorSpan)
        } else {
            this.connectorWidth = 0;
            this.needsConnector = false;
            this.bounds.width = this.widthWithoutConnector;

            var span = this.spans.pop();
            if (span && span !== this.connectorSpan)
                this.spans.push(span);
        }
    }

    setConnectorWidth(width) {
        this.connectorWidth = width;
        this.connectorSpan.properties.textLength = width;
        if (this.needsConnector)
            this.bounds.width = this.widthWithoutConnector + this.getConnectorWidth();
    }

    getConnectorWidth() {
        return this.connectorWidth || this.defaultConnectorWidth;
    }

    generateSpansFromText(ctxt, text) {
        super.generateSpansFromText(ctxt, text);
    }

    getLeft() {
        return this.notation.bounds.x + this.bounds.x;
    }

    getRight(index) {
        return this.notation.bounds.x + this.bounds.x + this.bounds.width;
    }

    recalculateMetrics(ctxt, resetNewLines = true) {
        if (resetNewLines) {
            delete this.maxWidth;
            delete this.firstLineMaxWidth;
            delete this.rightAligned;
            delete this.resize;
            // replace newlines with spaces
            this.spans.forEach(span => {
                delete span.properties.xOffset;
                if (span.properties.newLine) {
                    delete span.properties.newLine;
                    span.text = ' ' + span.text;
                }
            });
        }

        super.recalculateMetrics(ctxt);

        this.widthWithoutConnector = this.bounds.width;

        this.connectorWidth = 0;
        this.defaultConnectorWidth = ctxt.hyphenWidth;
        this.setNeedsConnector();

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
            // Unless it's a drop cap, in which case we center the connector:
            if (this.dropCap && this.originalText) {
                offset = ctxt.hyphenWidth / 2;
            }
        } else if (this.centerStartIndex >= 0) {
            // if we have manually overriden the centering logic for this lyric,
            // then always use that.
            if (ctxt.textMeasuringStrategy === TextMeasuringStrategy.Svg) {
                // svgTextMeasurer still has the current lyric in it...
                x1 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, this.centerStartIndex);
                x2 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, this.centerStartIndex + this.centerLength);
            } else if (ctxt.textMeasuringStrategy === TextMeasuringStrategy.Canvas) {
                x1 = this.measureSubstring(ctxt, this.centerStartIndex);
                x2 = this.measureSubstring(ctxt, this.centerStartIndex + this.centerLength);
            }
            offset = x1 + (x2 - x1) / 2;
        } else {

            // if it's a directive with no manual centering override, then
            // just center the text.
            if (this.lyricType !== LyricType.Directive) {

                // only consider text content after the last space (if any)
                var startIndex = this.text.lastIndexOf(' ') + 1;

                // unless there are no text characters following the space:
                if (startIndex > 0 && !this.text.slice(startIndex).match(/[a-záéíóúýäëïöüÿàèìòùỳāēīōūȳăĕĭŏŭ]/i)) {
                    startIndex = 0;
                }

                // Non-directive elements are lined up to the chant notation based on vowel segments,
                var result = activeLanguage.findVowelSegment(this.text, startIndex);

                if (result.found !== true) {
                    var match = this.text.slice(startIndex).match(/[a-z]+/i);
                    if (match) {
                        result.startIndex = startIndex + match.index;
                        result.length = match[0].length;
                    } else {
                        result.startIndex = startIndex;
                        result.length = this.text.length - startIndex;
                    }
                }
                if (ctxt.textMeasuringStrategy === TextMeasuringStrategy.Svg) {
                    // svgTextMeasurer still has the current lyric in it...
                    x1 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, result.startIndex);
                    x2 = ctxt.svgTextMeasurer.firstChild.getSubStringLength(0, result.startIndex + result.length);
                } else if (ctxt.textMeasuringStrategy === TextMeasuringStrategy.Canvas) {
                    x1 = this.measureSubstring(ctxt, result.startIndex);
                    x2 = this.measureSubstring(ctxt, result.startIndex + result.length);
                }
                offset = x1 + (x2 - x1) / 2;
            }
        }

        this.bounds.x = -offset;
        this.bounds.y = 0;

        this.origin.x = offset;
    }

    generateDropCap(ctxt) {
        if (this.dropCap) return this.dropCap;
        var dropCap = this.dropCap = new DropCap(ctxt, this.originalText.substring(0, 1), this.sourceIndex);
        this.sourceIndex++;

        this.generateSpansFromText(ctxt, this.originalText.substring(1));
        this.centerStartIndex--; // lost a letter, so adjust centering accordingly

        return dropCap;
    }

    getCssClasses() {

        var classes = "lyric ";

        if (this.lyricType === LyricType.Directive)
            classes += "directive ";

        return classes + super.getCssClasses();
    }

    getExtraStyleProperties(ctxt) {
        var props = super.getExtraStyleProperties();

        if (this.lyricType === LyricType.Directive && ctxt.autoColor === true)
            props = Object.assign({}, props, { fill: ctxt.rubricColor });

        return props;
    }

    createSvgNode(ctxt) {
        return super.createSvgNode(ctxt);
    }

    createSvgFragment(ctxt) {
        return super.createSvgFragment(ctxt);
    }
}

export class AboveLinesText extends TextElement {

    /**
     * @param {String} text
     */
    constructor(ctxt, text, sourceIndex) {
        super(ctxt, (ctxt.alTextStyle || '') + text, ctxt.alTextFont, ctxt.alTextSize, 'start', sourceIndex);

        this.padding = ctxt.staffInterval / 2;
    }

    getCssClasses() {
        return "aboveLinesText " + super.getCssClasses();
    }
}

export class TranslationText extends TextElement {

    /**
     * @param {String} text
     */
    constructor(ctxt, text, sourceIndex) {
        var anchor = 'start';
        if (text === '/') {
            text = '';
            anchor = 'end';
        } else {
            text = (ctxt.translationTextStyle || '') + text;
        }
        super(ctxt, text, ctxt.translationTextFont, ctxt.translationTextSize, anchor, sourceIndex);

        this.padding = ctxt.staffInterval / 2;
    }

    getCssClasses() {
        return "translation " + super.getCssClasses();
    }
}

export class DropCap extends TextElement {

    /**
     * @param {String} text
     */
    constructor(ctxt, text, sourceIndex) {
        super(ctxt, text, (ctxt.dropCapTextStyle || '') + ctxt.dropCapTextFont, ctxt.dropCapTextSize, 'middle', sourceIndex);

        this.padding = ctxt.staffInterval * ctxt.dropCapPadding;
    }

    getCssClasses() {
        return "dropCap " + super.getCssClasses();
    }
}

export class Annotation extends TextElement {

    /**
     * @param {String} text
     */
    constructor(ctxt, text) {
        super(ctxt, (ctxt.annotationTextStyle || '') + text, ctxt.annotationTextFont, ctxt.annotationTextSize, 'middle');
        this.padding = ctxt.staffInterval * ctxt.annotationPadding;
        this.dominantBaseline = 'hanging'; // so that annotations can be aligned at the top.
    }

    getCssClasses() {
        return "annotation " + super.getCssClasses();
    }
}

export class Annotations extends ChantLayoutElement {
    /**
     * @param {String} text
     */
    constructor(ctxt, ...texts) {
        super();

        this.annotations = texts.map(function(text) {
            return new Annotation(ctxt, text);
        });
        this.padding = Math.max.apply(null, this.annotations.map(function(annotation) {
            return annotation.padding;
        }));
    }

    updateBounds(multiplier) {
        if (!multiplier) multiplier = 1;
        for (var i = 0; i < this.annotations.length; ++i) {
            var annotation = this.annotations[i];
            annotation.bounds.x += this.bounds.x * multiplier;
            annotation.bounds.y += this.bounds.y * multiplier;
        }
    }

    recalculateMetrics(ctxt) {
        this.bounds.x = 0;
        this.bounds.y = 0;

        this.bounds.width = 0;
        this.bounds.height = 0;

        this.origin.x = 0;
        this.origin.y = 0;

        for (var i = 0; i < this.annotations.length; ++i) {
            var annotation = this.annotations[i];
            annotation.recalculateMetrics(ctxt);
            this.bounds.width = Math.max(this.bounds.width, annotation.bounds.width);
            annotation.bounds.y += this.bounds.height;
            this.bounds.height += annotation.bounds.height / 1.2;
            this.origin.y = this.origin.y || annotation.origin.y;
        }
    }

    draw(ctxt) {
        this.updateBounds();
        this.annotations.forEach(function(annotation) {
            annotation.draw(ctxt);
        });
        this.updateBounds(-1);
    }

    createSvgNode(ctxt) {
        this.updateBounds();
        var result = this.annotations.map(function(annotation) {
            return annotation.createSvgNode(ctxt);
        });
        this.updateBounds(-1);
        return result;
    }

    createSvgFragment(ctxt) {
        this.updateBounds();
        var result = this.annotations.map(function(annotation) {
            return annotation.createSvgFragment(ctxt);
        }).join('');
        this.updateBounds(-1);
        return result;
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
        else
            return false;
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
        if (!chantLayoutElement.ignoreBounds) {
            if (this.bounds.isEmpty())
                this.bounds = chantLayoutElement.bounds.clone();
            else
                this.bounds.union(chantLayoutElement.bounds);
        }

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
            this.trailingSpace = ctxt.intraNeumeSpacing * ctxt.interSyllabicMultiplier;

        // reset the bounds and the staff notations before doing a layout
        this.visualizers = [];
        this.bounds = new Rect(Infinity, Infinity, -Infinity, -Infinity);

        for (var i = 0; i < this.lyrics.length; i++)
            this.lyrics[i].recalculateMetrics(ctxt);

        if (this.alText)
            for (i = 0; i < this.alText.length; i++)
                this.alText[i].recalculateMetrics(ctxt);

        if (this.translationText)
            for (i = 0; i < this.translationText.length; i++)
                this.translationText[i].recalculateMetrics(ctxt);
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

        if (this.translationText)
            for (i = 0; i < this.translationText.length; i++)
                this.translationText[i].draw(ctxt);

        if (this.alText)
            for (i = 0; i < this.alText.length; i++)
                this.alText[i].draw(ctxt);

        canvasCtxt.translate(-this.bounds.x, 0);
    }

    createSvgNode(ctxt) {
        var inner = [];

        for (var i = 0; i < this.visualizers.length; i++)
            inner.push(this.visualizers[i].createSvgNode(ctxt, this));
        if (inner.length) {
            inner = [QuickSvg.createNode('g', { class: 'Notations' }, inner)];
        }

        for (i = 0; i < this.lyrics.length; i++)
            inner.push(this.lyrics[i].createSvgNode(ctxt));

        if (this.translationText)
            for (i = 0; i < this.translationText.length; i++)
                inner.push(this.translationText[i].createSvgNode(ctxt));

        if (this.alText)
            for (i = 0; i < this.alText.length; i++)
                inner.push(this.alText[i].createSvgNode(ctxt));

        return QuickSvg.createNode('g', {
            'source': this,
            // this.constructor.name will not be the same after being mangled by UglifyJS
            'class': 'ChantNotationElement ' + this.constructor.name,
            'transform': 'translate(' + this.bounds.x + ',' + 0 + ')'
        }, inner);
    }

    createSvgFragment(ctxt) {
        var inner = "";

        for (var i = 0; i < this.visualizers.length; i++)
            inner += this.visualizers[i].createSvgFragment(ctxt, this);

        for (i = 0; i < this.lyrics.length; i++)
            inner += this.lyrics[i].createSvgFragment(ctxt);

        if (this.translationText)
            for (i = 0; i < this.translationText.length; i++)
                inner += this.translationText[i].createSvgFragment(ctxt);

        if (this.alText)
            for (i = 0; i < this.alText.length; i++)
                inner += this.alText[i].createSvgFragment(ctxt);

        return QuickSvg.createFragment('g', {
            // this.constructor.name will not be the same after being mangled by UglifyJS
            'class': 'ChantNotationElement ' + this.constructor.name,
            'transform': 'translate(' + this.bounds.x + ',' + 0 + ')'
        }, inner);
    }
}
