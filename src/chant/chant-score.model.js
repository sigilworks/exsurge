import Gabc from 'gabc/gabc';
import { Rect } from '../core';
import { ChantLine } from 'chant/chant-line';
import { QuickSvg } from 'elements/drawing.util';
import { Annotation } from 'elements/drawing';
import { DoClef } from 'chant/chant';

/*
 * Score, document
 */
export default class ChantScore {

    // mappings is an array of ChantMappings.
    constructor(ctxt, mappings = [], useDropCap) {

        this.mappings = mappings;

        this.lines = [];
        this.notes = [];

        this.startingClef = null;

        this.useDropCap = useDropCap;
        this.dropCap = null;

        this.annotation = null;

        this.compiled = false;

        this.autoColoring = true;
        this.needsLayout = true;

        // valid after chant lines are created...
        this.bounds = new Rect();

        this.updateNotations(ctxt);
    }

    updateNotations(ctxt) {

        var i, j, mapping, notation;

        // flatten all mappings into one array for N(0) access to notations
        this.notations = [];
        for (i = 0; i < this.mappings.length; i++) {
            mapping = this.mappings[i];
            for (j = 0; j < mapping.notations.length; j++) {
                notation = mapping.notations[j];
                notation.score = this;
                notation.mapping = mapping;
                this.notations.push(notation);
            }
        }

        // find the starting clef...
        // start with a default clef in case the notations don't provide one.
        this.startingClef = null;
        var defaultClef = new DoClef(1, 2);

        for (i = 0; i < this.notations.length; i++) {

            // if there are neumes before the clef, then we just keep the default clef above
            if (this.notations[i].isNeume) {
                this.startingClef = defaultClef;
                break;
            }

            // otherwise, if we find a clef, before neumes then we use that as our default
            if (this.notations[i].isClef) {
                this.startingClef = this.notations[i];

                // the clef is taken out of the notations...
                this.notations.splice(i, 1); // remove a single notation

                break;
            }
        }

        // if we've reached this far and we *still* don't have a clef, then there aren't even
        // any neumes in the score. still, set the default clef just for good measure
        if (!this.startingClef)
            this.startingClef = defaultClef;

        // update drop cap
        if (this.useDropCap)
            this.recreateDropCap(ctxt);

        this.needsLayout = true;
    }

    recreateDropCap(ctxt) {

        // find the first notation with lyrics to use
        for (var i = 0; i < this.notations.length; i++) {
            if (this.notations[i].hasLyrics() && this.notations[i].lyrics[0] !== null) {
                this.dropCap = this.notations[i].lyrics[0].generateDropCap(ctxt);
                return;
            }
        }
    }

    // this is the the synchronous version of performLayout that
    // process everything without yielding to any other workers/threads.
    // good for server side processing or very small chant pieces.
    performLayout(ctxt) {

        if (this.needsLayout === false)
            return; // nothing to do here!

        ctxt.updateHyphenWidth();

        // setup the context
        ctxt.activeClef = this.startingClef;
        ctxt.notations = this.notations;
        ctxt.currNotationIndex = 0;

        if (this.dropCap)
            this.dropCap.recalculateMetrics(ctxt);

        if (this.annotation)
            this.annotation.recalculateMetrics(ctxt);

        for (var i = 0; i < this.notations.length; i++) {
            var notation = this.notations[i];
            if (notation.needsLayout) {
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
            if (finishedCallback)
                setTimeout(() => finishedCallback(), 0);

            return; // nothing to do here!
        }

        // check for sane value of hyphen width:
        ctxt.updateHyphenWidth();
        if (ctxt.hyphenWidth / ctxt.lyricTextSize > 0.6) {
            setTimeout(() => {
                this.performLayoutAsync(ctxt, finishedCallback);
            }, 100);
            return;
        }

        // setup the context
        ctxt.activeClef = this.startingClef;
        ctxt.notations = this.notations;
        ctxt.currNotationIndex = 0;

        if (this.dropCap)
            this.dropCap.recalculateMetrics(ctxt);

        if (this.annotation)
            this.annotation.recalculateMetrics(ctxt);

        setTimeout(() => this.layoutElementsAsync(ctxt, 0, finishedCallback), 0);
    }

    layoutElementsAsync(ctxt, index, finishedCallback) {

        if (index >= this.notations.length) {
            this.needsLayout = false;

            if (finishedCallback)
                setTimeout(() => finishedCallback(), 0);

            return;
        }

        if (index === 0)
            ctxt.activeClef = this.startingClef;

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
        setTimeout(() => this.layoutElementsAsync(ctxt, index, finishedCallback), 0);
    }

    layoutChantLines(ctxt, width, finishedCallback) {

        this.lines = [];

        var y = 0;
        var currIndex = 0;

        ctxt.activeClef = this.startingClef;

        do {

            var line = new ChantLine(this);

            line.buildFromChantNotationIndex(ctxt, currIndex, width);
            currIndex = line.notationsStartIndex + line.numNotationsOnLine;
            line.performLayout(ctxt);
            this.lines.push(line);

            line.bounds.y = -line.bounds.y + y;
            y += line.bounds.height + ctxt.staffInterval * 1.5;

        } while (currIndex < this.notations.length);

        var lastLine = this.lines[this.lines.length - 1];

        this.bounds.x = 0;
        this.bounds.y = 0;
        this.bounds.width = lastLine.bounds.width;
        this.bounds.height = y;

        if (finishedCallback)
            finishedCallback(this);
    }

    draw(ctxt, scale = 1) {

        var canvasCtxt = ctxt.canvasCtxt;

        canvasCtxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);

        ctxt.setCanvasSize(this.bounds.width, this.bounds.height, scale);
        canvasCtxt.translate(this.bounds.x, this.bounds.y);

        for (var i = 0; i < this.lines.length; i++)
            this.lines[i].draw(ctxt);

        canvasCtxt.translate(-this.bounds.x, -this.bounds.y);
    }

    createSvgNode(ctxt) {

        // create defs section
        var node = [ctxt.defsNode.cloneNode(true)];
        node[0].appendChild(ctxt.createStyleNode());

        for (var i = 0; i < this.lines.length; i++)
            node.push(this.lines[i].createSvgNode(ctxt));

        node = QuickSvg.createNode('g', {}, node);

        node = QuickSvg.createNode('svg', {
            'xmlns': 'http://www.w3.org/2000/svg',
            'version': '1.1',
            'class': 'ChantScore',
            'width': this.bounds.width,
            'height': this.bounds.height,
            'viewBox': [0, 0, this.bounds.width, this.bounds.height].join(' ')
        }, node);

        node.source = this;
        this.svg = node;

        return node;
    }

    createSvg(ctxt) {

        var fragment = "";

        // create defs section
        for (var def in ctxt.defs)
            if (ctxt.defs.hasOwnProperty(def))
                fragment += ctxt.defs[def];
        fragment += ctxt.createStyle();

        fragment = QuickSvg.createFragment('defs', {}, fragment);

        for (var i = 0; i < this.lines.length; i++)
            fragment += this.lines[i].createSvgFragment(ctxt);

        fragment = QuickSvg.createFragment('g', {}, fragment);

        fragment = QuickSvg.createFragment('svg', {
            'xmlns': 'http://www.w3.org/2000/svg',
            'version': '1.1',
            'xmlns:xlink': 'http://www.w3.org/1999/xlink',
            'class': 'ChantScore',
            'width': this.bounds.width,
            'height': this.bounds.height
        }, fragment);

        return fragment;
    }

    createSvgNodeForEachLine(ctxt) {

        var node = [];

        var top = 0;
        for (var i = 0; i < this.lines.length; i++) {
            var lineFragment = [ctxt.defsNode.cloneNode(true), this.lines[i].createSvgNode(ctxt, top)];
            lineFragment[0].appendChild(ctxt.createStyleNode());
            var height = this.lines[i].bounds.height + ctxt.staffInterval * 1.5;
            lineFragment = QuickSvg.createNode('g', {}, lineFragment);
            lineFragment = QuickSvg.createNode('svg', {
                'xmlns': 'http://www.w3.org/2000/svg',
                'version': '1.1',
                'class': 'ChantScore',
                'width': this.bounds.width,
                'height': height,
                'viewBox': [0, 0, this.bounds.width, height].join(' ')
            }, lineFragment);
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
            if (ctxt.defs.hasOwnProperty(def))
                fragmentDefs += ctxt.defs[def];
        fragmentDefs += ctxt.createStyle();

        fragmentDefs = QuickSvg.createFragment('defs', {}, fragmentDefs);
        var top = 0;
        for (var i = 0; i < this.lines.length; i++) {
            var lineFragment = fragmentDefs + this.lines[i].createSvgFragment(ctxt, top);
            var height = this.lines[i].bounds.height + ctxt.staffInterval * 1.5;
            lineFragment = QuickSvg.createFragment('g', {}, lineFragment);
            lineFragment = QuickSvg.createFragment('svg', {
                'xmlns': 'http://www.w3.org/2000/svg',
                'version': '1.1',
                'xmlns:xlink': 'http://www.w3.org/1999/xlink',
                'class': 'ChantScore',
                'width': this.bounds.width,
                'height': height
            }, lineFragment);
            fragment += lineFragment;
            top += height;
        }
        return fragment;
    }

    deserializeFromJson(data) {
        this.autoColoring = data['auto-coloring'];

        if (data.annotation !== null && data.annotation !== "") {
            // create the annotation
            this.annotation = new Annotation(ctxt, data.annotation);
        } else
            this.annotation = null;

        var createDropCap = !!data['drop-cap'] === 'auto';

        Gabc.parseChantNotations(data.notations, this, createDropCap);
    }

    serializeToJson() {
        var data = {};

        data['type'] = 'score';
        data['auto-coloring'] = true;

        if (this.annotation !== null)
            data.annotation = this.annotation.unsanitizedText;
        else
            data.annotation = '';


        return data;
    }
}
