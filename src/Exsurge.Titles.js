//
// Author(s):
// Benjamin Bloomfield <benjamin@sourceandsummit.com>
//
// Copyright (c) 2019
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
  Supertitle,
  Title,
  Subtitle,
  TextLeftRight
} from "./Exsurge.Drawing.js";

export class Titles extends ChantLayoutElement {
  constructor(ctxt, { supertitle, title, subtitle, textLeft, textRight } = {}) {
    super();
    this.setSupertitle(ctxt, supertitle);
    this.setTitle(ctxt, title);
    this.setSubtitle(ctxt, subtitle);
    this.setTextLeft(ctxt, textLeft);
    this.setTextRight(ctxt, textRight);
  }

  /**
   * Lays out the titles, and returns their total height
   * @param  {ChantContext} ctxt
   * @return {number}      the tottal height of titles laid out
   */
  layoutTitles(ctxt, width) {
    this.bounds = new Rect(0, 0, 0, 0);
    let y = 0,
      midX = width / 2;
    if (this.supertitle) {
      this.supertitle.recalculateMetrics(ctxt);
      this.supertitle.bounds.x = midX;
      this.supertitle.bounds.y = y;
      this.bounds.union(this.supertitle.bounds);
      this.supertitle.bounds.y += this.supertitle.origin.y;
      y += this.supertitle.bounds.height + this.supertitle.padding(ctxt);
    }
    if (this.title) {
      this.title.recalculateMetrics(ctxt);
      this.title.bounds.x = midX;
      this.title.bounds.y = y;
      this.bounds.union(this.title.bounds);
      this.title.bounds.y += this.title.origin.y;
      y += this.title.bounds.height + this.title.padding(ctxt);
    }
    if (this.subtitle) {
      this.subtitle.recalculateMetrics(ctxt);
      this.subtitle.bounds.x = midX;
      this.subtitle.bounds.y = y;
      this.bounds.union(this.subtitle.bounds);
      this.subtitle.bounds.y += this.subtitle.origin.y;
      y += this.subtitle.bounds.height + this.subtitle.padding(ctxt);
    }
    if (this.textLeft) {
      this.textLeft.recalculateMetrics(ctxt);
      this.textLeft.bounds.y = y;
      this.bounds.union(this.textLeft.bounds);
      this.textLeft.bounds.y += this.textLeft.origin.y;
    }
    if (this.textRight) {
      this.textRight.recalculateMetrics(ctxt);
      this.textRight.bounds.x = width;
      this.textRight.bounds.y = y;
      this.bounds.union(this.textRight.bounds);
      this.textRight.bounds.y += this.textRight.origin.y;
    }
    return this.bounds.height;
  }

  setSupertitle(ctxt, supertitle) {
    this.supertitle = supertitle ? new Supertitle(ctxt, supertitle) : null;
  }
  setTitle(ctxt, title) {
    this.title = title ? new Title(ctxt, title) : null;
  }
  setSubtitle(ctxt, subtitle) {
    this.subtitle = subtitle ? new Subtitle(ctxt, subtitle) : null;
  }
  setTextLeft(ctxt, textLeft) {
    this.textLeft = textLeft
      ? new TextLeftRight(ctxt, textLeft, "textLeft")
      : null;
  }
  setTextRight(ctxt, textRight) {
    this.textRight = textRight
      ? new TextLeftRight(ctxt, textRight, "textRight")
      : null;
  }

  hasSupertitle(ctxt, supertitle) {
    return !!this.supertitle;
  }
  hasTitle(ctxt, title) {
    return !!this.title;
  }
  hasSubtitle(ctxt, subtitle) {
    return !!this.subtitle;
  }
  hasTextLeft(ctxt, textLeft) {
    return !!this.textLeft;
  }
  hasTextRight(ctxt, textRight) {
    return !!this.textRight;
  }

  draw(ctxt, scale = 1) {
    canvasCtxt.translate(this.bounds.x, this.bounds.y);

    for (let el of [
      this.supertitle,
      this.title,
      this.subtitle,
      this.textLeft,
      this.textRight
    ]) {
      if (el) el.draw(ctxt);
    }

    canvasCtxt.translate(-this.bounds.x, -this.bounds.y);
  }

  createSvgNode(ctxt) {
    // create defs section
    var node = [];

    for (let el of [
      this.supertitle,
      this.title,
      this.subtitle,
      this.textLeft,
      this.textRight
    ]) {
      if (el) node.push(el.createSvgNode(ctxt));
    }

    node = QuickSvg.createNode("g", { class: "Titles" }, node);

    node.source = this;
    this.svg = node;

    return node;
  }

  createSvgFragment(ctxt) {
    var fragment = "";

    for (let el of [
      this.supertitle,
      this.title,
      this.subtitle,
      this.textLeft,
      this.textRight
    ]) {
      if (el) fragment += el.createSvgFragment(ctxt);
    }

    fragment = QuickSvg.createFragment("g", {}, fragment);
    return fragment;
  }
}
