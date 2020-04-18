
export const QuickSvg = {
    // namespaces
    ns: 'http://www.w3.org/2000/svg',
    xmlns: 'http://www.w3.org/2000/xmlns/',
    xlink: 'http://www.w3.org/1999/xlink',

    // create the root level svg object
    svg: function(width, height) {
        var node = document.createElementNS(this.ns, 'svg');

        node.setAttribute('xmlns', this.ns);
        node.setAttribute('version', '1.1');
        node.setAttributeNS(this.xmlns, 'xmlns:xlink', this.xlink);

        node.setAttribute('width', width);
        node.setAttribute('height', height);

        // create the defs element
        var defs = document.createElementNS(this.ns, 'defs');
        node.appendChild(defs);

        node.defs = defs;

        node.clearNotations = function() {
            // clear out all children except defs
            node.removeChild(defs);

            while (node.hasChildNodes())
                node.removeChild(node.lastChild);

            node.appendChild(defs);
        };

        return node;
    },

    rect: function(width, height) {
        var node = document.createElementNS(this.ns, 'rect');

        node.setAttribute('width', width);
        node.setAttribute('height', height);

        return node;
    },

    line: function(x1, y1, x2, y2) {
        var node = document.createElementNS(this.ns, 'line');

        node.setAttribute('x1', x1);
        node.setAttribute('y1', y1);
        node.setAttribute('x2', x2);
        node.setAttribute('y2', y2);

        return node;
    },

    g: function() {
        var node = document.createElementNS(this.ns, 'g');

        return node;
    },

    text: function() {
        var node = document.createElementNS(this.ns, 'text');

        return node;
    },

    tspan: function(str) {
        var node = document.createElementNS(this.ns, 'tspan');
        node.textContent = str;

        return node;
    },

    // nodeRef should be the id of the object in defs (without the #)
    use: function(nodeRef) {
        var node = document.createElementNS(this.ns, 'use');
        node.setAttributeNS(this.xlink, 'xlink:href', '#' + nodeRef);

        return node;
    },

    createFragment: function(name, attributes, child) {
        if (child === undefined || child === null)
            child = '';

        var fragment = '<' + name + ' ';

        for (var attr in attributes) {
            if (attributes.hasOwnProperty(attr))
                fragment += attr + '="' + attributes[attr] + '" ';
        }

        fragment += '>' + child + '</' + name + '>';

        return fragment;
    },

    parseFragment: function(fragment) {

        // create temporary holder
        var well = document.createElement('svg');

        // act as a setter if svg is given
        if (fragment) {

            var container = this.g();

            // dump raw svg
            // do this to allow the browser to automatically create svg nodes?
            well.innerHTML = '<svg>' + fragment.replace(/\n/, '').replace(/<(\w+)([^<]+?)\/>/g, '<$1$2></$1>') + '</svg>';

            // transplant nodes
            for (var i = 0, il = well.firstChild.childNodes.length; i < il; i++)
                container.appendChild(well.firstChild.firstChild);

            return container;
        }
    },

    translate: function(node, x, y) {
        node.setAttribute('transform', 'translate(' + x + ',' + y + ')');
        return node;
    },

    scale: function(node, sx, sy) {
        node.setAttribute('transform', 'scale(' + sx + ',' + sy + ')');
        return node;
    }
};
