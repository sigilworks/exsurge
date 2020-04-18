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

        // font styles
        this.lyricTextSize = 16; // in points?
        this.lyricTextFont = '"Palatino Linotype", "Book Antiqua", Palatino, serif';
        this.lyricTextColor = '#000';

        this.dropCapTextSize = 64;
        this.dropCapTextFont = this.lyricTextFont;
        this.dropCapTextColor = this.lyricTextColor;

        this.annotationTextSize = 13;
        this.annotationTextFont = this.lyricTextFont;
        this.annotationTextColor = this.lyricTextColor;

        // everything depends on the scale of the punctum
        this.glyphPunctumWidth = Glyphs.PunctumQuadratum.bounds.width;
        this.glyphPunctumHeight = Glyphs.PunctumQuadratum.bounds.height;

        // FIXME: for now, we just set these using the glyph scales as noted above, presuming a
        // staff line size of 0.5 in. Really what we should do is scale the punctum size based
        // on the text metrics, right? 1 punctum ~ x height size?
        this.glyphScaling = 1.0 / 16.0;

        this.staffInterval = this.glyphPunctumWidth * this.glyphScaling;

        // setup the line weights for the various elements.
        this.staffLineWeight = Math.round(this.glyphPunctumWidth * this.glyphScaling / 8);
        this.neumeLineWeight = this.staffLineWeight; // the weight of connecting lines in the glyphs.
        this.dividerLineWeight = this.neumeLineWeight; // of quarter bar, half bar, etc.
        this.episemaLineWeight = this.neumeLineWeight; // of horizontal episemae

        // for keeping track of the clef
        this.activeClef = null;

        this.neumeLineColor = '#000';
        this.staffLineColor = '#000';
        this.dividerLineColor = '#000';

        this.defaultLanguage = new Latin();

        this.canvas = document.createElement('canvas');
        this.canvasCtxt = this.canvas.getContext('2d');

        // calculate the pixel ratio for drawing to a canvas
        var dpr = window.devicePixelRatio || 1.0;
        var bsr = this.canvasCtxt.webkitBackingStorePixelRatio ||
            this.canvasCtxt.mozBackingStorePixelRatio ||
            this.canvasCtxt.msBackingStorePixelRatio ||
            this.canvasCtxt.oBackingStorePixelRatio ||
            this.canvasCtxt.backingStorePixelRatio || 1.0;

        this.pixelRatio = dpr / bsr;

        this.canvasCtxt.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

        if (textMeasuringStrategy === TextMeasuringStrategies.SVG) {
            this.svgTextMeasurer = QuickSvg.svg(1, 1);
            this.svgTextMeasurer.setAttribute('id', 'TextMeasurer');
            document.querySelector('body').appendChild(this.svgTextMeasurer);
        }

        // measure the size of a hyphen for the lyrics
        var hyphen = new Lyric(this, '-', LyricTypes.SINGLE_SYLLABLE);
        this.hyphenWidth = hyphen.bounds.width;

        this.minLyricWordSpacing = this.hyphenWidth;

        this.intraNeumeSpacing = this.staffInterval / 2.0;

        // for connecting neume syllables...
        this.syllableConnector = '-';

        this.drawGuides = false;
        this.drawDebuggingBounds = true;

        // we keep track of where we are in processing notations, so that
        // we can maintain the context for notations to know about.
        //
        // these are only guaranteed to be valid during the performLayout phase!
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
        // how much the default spacing can shrink. E.g., a value of 0.80 allows the layout
        // engine to separate two glyphs by only 80% of the normal inter-neume spacing value.
        //
        // FIXME: condensing tolerance is not implemented yet!
        this.condensingTolerance = 0.9;

        // if auto color is true, then exsurge tries to automatically colorize
        // some elements of the chant (directives become rubric color, etc.)
        this.autoColor = true;

        this.insertFontsInDoc();
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

    // returns the next neume starting at `this.currNotationIndex`
    // (or `null`, if there isn't a neume after this one...)
    findNextNeume() {
        if (typeof this.currNotationIndex === 'undefined')
            throw 'findNextNeume() called without a valid currNotationIndex set';

        for (var i = this.currNotationIndex + 1; i < this.notations.length; i++) {
            var notation = this.notations[i];

            if (notation.isNeume)
                return notation;
        }

        return null;
    }

    setCanvasSize(width, height) {
        this.canvas.width = width * this.pixelRatio;
        this.canvas.height = height * this.pixelRatio;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        this.canvasCtxt.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }
}
