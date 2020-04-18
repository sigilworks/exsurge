import ChantScore from 'chant/chant-score.model';

export default class ChantDocument {
    constructor() {

        var defaults = {
            layout: {
                units: 'mm',
                'default-font': {
                    'font-family': 'Crimson',
                    'font-size': 14
                },
                page: {
                    width: 8.5,
                    height: 11,
                    'margin-left': 0,
                    'margin-top': 0,
                    'margin-right': 0,
                    'margin-bottom': 0
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
            'default-font': {
                'font-family': from.layout['default-font']['font-family'],
                'font-size': from.layout['default-font']['font-size']
            },
            page: {
                width: from.layout.page.width,
                height: from.layout.page.height,
                'margin-left': from.layout.page['margin-left'],
                'margin-top': from.layout.page['margin-top'],
                'margin-right': from.layout.page['margin-right'],
                'margin-bottom': from.layout.page['margin-bottom']
            }
        };
    }

    deserializeFromJson(data) {

        this.copyLayout(this, data);

        this.scores = [];

        // read in the scores
        for (var i = 0; i < data.scores.length; i++) {
            var score = new ChantScore();

            score.deserializeFromJson(data.scores[i]);
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
