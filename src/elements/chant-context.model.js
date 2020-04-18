import Latin from 'language/latin';
import { LyricTypes, TextMeasuringStrategies } from 'elements/elements.constants';
import { Glyphs } from '../glyphs.constants';
import { QuickSvg } from 'elements/drawing.util';
import { Lyric } from 'elements/drawing';
import exsurgeCharactersFont from '../../assets/fonts/ExsurgeChar.otf';

/**
 * @class ChantContext
 */
export default class ChantContext {

    constructor(textMeasuringStrategy = TextMeasuringStrategies.SVG) {

        this.textMeasuringStrategy = textMeasuringStrategy;
        this.defs = {};
        this.makeDefs = [];
        this.defsNode = QuickSvg.createNode('defs');

        // font styles
        this.lyricTextSize = 16; // in pixels
        this.lyricTextFont = '"Palatino Linotype", "Book Antiqua", Palatino, serif';
        this.lyricTextColor = "#000";

        this.rubricColor = "#d00";
        this.specialCharProperties = {
            "font-family": "'Exsurge Characters'",
            "fill": this.rubricColor
        };
        this.textBeforeSpecialChar = '';
        this.textAfterSpecialChar = '.';
        this.specialCharText = char => char;

        // var boldMarkup = "*";
        // var italicMarkup = "_";
        // var redMarkup = "^";
        // var smallCapsMarkup = "%";

        this.fontStyleDictionary = {
            "*": { 'font-weight': 'bold' },
            "_": { 'font-style': 'italic' },
            "^": { 'fill': this.rubricColor },
            "%": {
                "font-variant": "small-caps",
                "font-feature-settings": "'smcp'",
                "-webkit-font-feature-settings": "'smcp'"
            }
        };

        this.alTextSize = this.lyricTextSize;
        this.alTextFont = this.lyricTextFont;
        this.alTextColor = this.lyricTextColor;
        this.alTextStyle = '_';

        this.translationTextSize = this.lyricTextSize;
        this.translationTextFont = this.lyricTextFont;
        this.translationTextColor = this.lyricTextColor;
        this.translationTextStyle = '_';

        this.dropCapTextSize = 64;
        this.dropCapTextFont = this.lyricTextFont;
        this.dropCapTextColor = this.lyricTextColor;
        this.dropCapPadding = 1; // minimum padding on either side of drop cap in staffIntervals

        this.annotationTextSize = 13;
        this.annotationTextFont = this.lyricTextFont;
        this.annotationTextColor = this.lyricTextColor;
        this.annotationPadding = 1;  // minimum padding on either side of annotation in staffIntervals

        this.minLedgerSeparation = 2; // multiple of staffInterval
        this.minSpaceAboveStaff = 1; // multiple of staffInterval
        this.minSpaceBelowStaff = 2; // multiple of staffInterval

        // everything depends on the scale of the punctum
        this.glyphPunctumWidth = Glyphs.PunctumQuadratum.bounds.width;
        this.glyphPunctumHeight = Glyphs.PunctumQuadratum.bounds.height;

        // max space to add between notations when justifying, in multiples of this.staffInterval
        this.maxExtraSpaceInStaffIntervals = 0.5;

        // for keeping track of the clef
        this.activeClef = null;

        this.neumeLineColor = "#000";
        this.staffLineColor = "#000";
        this.dividerLineColor = "#000";

        this.defaultLanguage = new Latin();

        this.canvas = document.createElement("canvas");
        this.canvasCtxt = this.canvas.getContext("2d");

        // calculate the pixel ratio for drawing to a canvas
        this.pixelRatio = window.devicePixelRatio || 1.0;

        //this.canvasCtxt.scale(this.pixelRatio, this.pixelRatio);

        if (textMeasuringStrategy === TextMeasuringStrategies.SVG) {
            this.svgTextMeasurer = QuickSvg.svg(0, 0);
            this.svgTextMeasurer.setAttribute('id', "TextMeasurer");
            this.svgTextMeasurer.setAttribute('style', "position:absolute");
            document.body.insertBefore(this.svgTextMeasurer, document.body.firstChild);
        }

        // for connecting neume syllables...
        this.syllableConnector = '-';

        // fixme: for now, we just set these using the glyph scales as noted above, presuming a
        // staff line size of 0.5 in. Really what we should do is scale the punctum size based
        // on the text metrics, right? 1 punctum ~ x height size?
        this.setGlyphScaling(1.0 / 16.0);

        // minimum space between puncta of different syllables, in multiples of this.intraNeumeSpacing
        this.interSyllabicMultiplier = 2.5;

        // space between an accidental and the following note, in multiples of this.intraNeumeSpacing
        this.accidentalSpaceMultiplier = 2;

        // space added between puncta of different words, in multiples of this.intraNeumeSpacing
        this.interVerbalMultiplier = 1;

        this.drawGuides = false;
        this.drawDebuggingBounds = true;

        // we keep track of where we are in processing notations, so that
        // we can maintain the context for notations to know about.
        //
        // these are only gauranteed to be valid during the performLayout phase!
        this.activeNotations = null;
        this.currNotationIndex = -1;

        // chant notation elements are normally separated by a minimum fixed amount of space
        // on the staff line. It can happen, however, that two text elements are almost close
        // enough to merge, only to be separated much more by the required hyphen (or other
        // connecting string).
        //
        // This tolerance value allows a little bit of flexibility to merge two close lyrical
        // elements, thus bringing the chant notation elements a bit closer than otherwise
        // would be normally allowed.
        //
        // condensing tolerance is a percentage value (0.0-1.0, inclusive) that indicates
        // how much the default spacing can shrink. E.g., a value of 0.20 allows the layout
        // engine to separate two glyphs by only 80% of the normal inter-neume spacing value.
        this.condensingTolerance = 0.3;

        // if auto color is true, then exsurge tries to automatically colorize
        // some elements of the chant (directives become rubric color, etc.)
        this.autoColor = true;

        this.insertFontsInDoc();
    }

    setFont(font, size = 16) {
        this.lyricTextSize = size;
        this.lyricTextFont = font;

        this.alTextSize = size;
        this.alTextFont = font;

        this.translationTextSize = size;
        this.translationTextFont = font;

        this.dropCapTextSize = size * 4;
        this.dropCapTextFont = font;

        this.annotationTextSize = size * 2 / 3;
        this.annotationTextFont = font;

    }

    setRubricColor(color) {
        this.rubricColor = color;
        this.specialCharProperties.fill = color;
        this.fontStyleDictionary["^"].fill = color;
    }

    createStyleCss() {
        var textStyles = ['lyric', 'aboveLinesText', 'translation', 'dropCap', 'annotation'];
        var style = '';
        for (var i = 0; i < textStyles.length; ++i) {
            var key = i === 1 ? 'al' : textStyles[i],
                color = this[key + 'TextColor'],
                font = this[key + 'TextFont'],
                size = this[key + 'TextSize'];
            style += `.${textStyles[i]}{fill:${color};font-family:${font};font-size:${size}px;font-kerning:normal}`;
        }
        return style;
    }

    createStyleNode() {
        var node = QuickSvg.createNode('style', {});
        node.textContent = this.createStyleCss(this);
        return node;
    }

    createStyle() {
        return '<style>' + this.createStyleCss(this) + '</style>';
    }

    updateHyphenWidth() {
        // measure the size of a hyphen for the lyrics
        var hyphen = new Lyric(this, this.syllableConnector, LyricTypes.SINGLE_SYLLABLE);
        var multiplier = (this.minLyricWordSpacing / (this.hyphenWidth || this.minLyricWordSpacing)) || 1;
        this.hyphenWidth = hyphen.bounds.width;

        this.minLyricWordSpacing = multiplier * this.hyphenWidth;
    }

    setGlyphScaling(glyphScaling) {
        this.glyphScaling = glyphScaling;

        this.staffInterval = this.glyphPunctumWidth * this.glyphScaling;

        // setup the line weights for the various elements.
        this.staffLineWeight = Math.round(this.staffInterval / 8);
        this.neumeLineWeight = this.staffLineWeight; // the weight of connecting lines in the glyphs.
        this.dividerLineWeight = this.neumeLineWeight; // of quarter bar, half bar, etc.
        this.episemaLineWeight = this.neumeLineWeight * 1.25; // of horizontal episemata

        this.updateHyphenWidth();

        this.intraNeumeSpacing = this.staffInterval / 2.0;

        while (this.defsNode.firstChild)
            this.defsNode.removeChild(this.defsNode.firstChild);
        for (var i = 0; i < this.makeDefs.length; ++i) {
            this.makeDefs[i]();
        }
    }

    calculateHeightFromStaffPosition(staffPosition) {
        return -staffPosition * this.staffInterval;
    }

    insertFontsInDoc() {

        var styleElement = document.getElementById('exsurge-fonts');

        if (styleElement === null) {
            // create it since it doesn't exist yet.
            styleElement = document.createElement('style');
            styleElement.id = 'exsurge-fonts';

            styleElement.appendChild(
                document.createTextNode(
                    `@font-face{font-family: "Exsurge Characters"; font-weight: normal; font-style: normal; src: url(${exsurgeCharactersFont}) format("opentype");}`
                )
            );

            document.head.appendChild(styleElement);
        }
    }

    // returns the next neume starting at this.currNotationIndex, or null
    // if there isn't a neume after this one...
    findNextNeume() {

        if (typeof this.currNotationIndex === 'undefined')
            throw "findNextNeume() called without a valid currNotationIndex set";

        for (var i = this.currNotationIndex + 1; i < this.notations.length; i++) {
            var notation = this.notations[i];

            if (notation.isNeume && !notation.hasNoWidth)
                return notation;
        }

        return null;
    }

    setCanvasSize(width, height, scale = 1) {
        this.canvas.style.width = (width * scale) + "px";
        this.canvas.style.height = (height * scale) + "px";
        scale *= this.pixelRatio;
        this.canvas.width = width * scale;
        this.canvas.height = height * scale;

        this.canvasCtxt.setTransform(scale, 0, 0, scale, 0, 0);
    }

}
