import _ from 'lodash';

// reports version of `exsurge` package to the debugging log
import 'utils/version-reporter.util';

import { Annotation } from 'elements/drawing';
import Gabc from 'gabc/gabc';
import ChantContext from 'elements/chant-context.model';
import ChantScore from 'chant/chant-score.model';

export * from './core';
export * from 'language/base-language';
export * from './glyphs.constants';
export * from 'elements/drawing';
export * from 'chant/chant';
export * from 'chant/markings';
export * from 'chant/signs';
export * from 'chant/neumes';
export * from 'gabc/gabc';

// constants
export { LiquescentTypes } from 'chant/chant.constants';
export { NoteShapeModifiers } from 'chant/chant.constants';
export { NoteShapes } from 'chant/chant.constants';
export { TextMeasuringStrategies } from 'elements/elements.constants';
export { GlyphCodes } from 'elements/elements.constants';
export { QuickSvg } from 'elements/drawing.util';
export { LyricTypes } from 'elements/elements.constants';
export { AccidentalTypes } from 'chant/chant.constants';
export { HorizontalEpisemaAlignments } from 'chant/chant.constants';
export { MarkingPositionHints } from 'chant/chant.constants';
export { BraceAttachments } from 'chant/chant.constants';
export { BraceShapes } from 'chant/chant.constants';

export ChantMapping from 'chant/chant-mapping.model';
export ChantContext from 'elements/chant-context.model';
export ChantScore from 'chant/chant-score.model';
export ChantDocument from 'chant/chant-document.model';

export Latin from 'language/latin';
export Spanish from 'language/spanish';


// client side support

if (!_.isUndefined(document)) {
    const ChantVisualElementPrototype = Object.create(HTMLElement.prototype);

    ChantVisualElementPrototype.createdCallback = () => {
        const ctxt = new ChantContext();

        ctxt.setFont('"Crimson Text", serif', 19.2);

        ctxt.lyricTextFont = '"Crimson Text", serif';
        ctxt.lyricTextSize *= 1.2;
        ctxt.dropCapTextFont = ctxt.lyricTextFont;
        ctxt.annotationTextFont = ctxt.lyricTextFont;

        const useDropCap = this.getAttribute('use-drop-cap') !== 'false';

        const mappings = Gabc.createMappingsFromSource(ctxt, this.innerText);
        const score = new ChantScore(ctxt, mappings, useDropCap);

        const annotationAttr = this.getAttribute('annotation');
        if (annotationAttr) {
            // add an annotation
            score.annotation = new Annotation(ctxt, annotationAttr);
        }


        let width = 0;

        const doLayout = () => {
            const newWidth = this.parentElement.clientWidth;

            if (width === newWidth) {
                return;
            }

            width = newWidth;

            // perform layout on the chant
            score.performLayout(ctxt, () => {
                score.layoutChantLines(ctxt, width, () => {
                    // render the score to svg code
                    this.appendElement(score.createSvgNode(ctxt));
                });
            });
        };

        doLayout();

        if (window.addEventListener) {
            window.addEventListener('resize', doLayout, false);
        } else if (window.attachEvent) {
            window.attachEvent('onresize', doLayout);
        }
    };

    ChantVisualElementPrototype.attachedCallback = _.noop;

    document.registerElement = document.registerElement || _.noop;

    // register the custom element
    const ChantVisualElement = document.registerElement('chant-visual', {
        prototype: ChantVisualElementPrototype
    });
}

/*

    // TODO: this seems more up-to-date, from working example at: http://frmatthew.github.io/exsurge/chant.html

 var ctxt = new exsurge.ChantContext();
    ctxt.lyricTextFont = "'Crimson Text', serif";
    ctxt.lyricTextSize *= 1.2;
    ctxt.dropCapTextFont = ctxt.lyricTextFont;
    ctxt.annotationTextFont = ctxt.lyricTextFont;
    var score;
    var gabcSource = document.getElementById('gabcSource');
    var chantContainer = document.getElementById('chant-container');
    //
    // to use canvas drawing, you should use the canvas object belonging to the
    // canvas, resizing it as below. The reason for custom resizing is that the
    // canvas drawing takes into consideration screen dpi in order to render
    // the highest possibly quality on lots of different screens.
    //
    //
    // document.querySelector('body').appendChild(ctxt.canvas);
    // ctxt.setCanvasSize(1280, 720);
    //
    // To render to the canvas, you can use a standard animation loop, which
    // draws to the canvas at the desired intervals, e.g.:
    //
    //
    // function animloop() {
    //   requestAnimationFrame(animloop);
    //
    //   if (score)
    //     score.draw(ctxt);
    // };
    //
    var updateChant = function() {
      if (score) {
        exsurge.Gabc.updateMappingsFromSource(ctxt, score.mappings, gabcSource.value);
        score.updateNotations(ctxt);
      } else {
        mappings = exsurge.Gabc.createMappingsFromSource(ctxt, gabcSource.value);
        score = new exsurge.ChantScore(ctxt, mappings, true);
        score.annotation = new exsurge.Annotation(ctxt, "%V%");
      }
      layoutChant();
    }
    var layoutChant = function() {
      // perform layout on the chant
      score.performLayoutAsync(ctxt, function() {
        score.layoutChantLines(ctxt, chantContainer.clientWidth, function() {
          // render the score to svg code
          chantContainer.innerHTML = score.createSvg(ctxt);
        });
      });
    }
 */
