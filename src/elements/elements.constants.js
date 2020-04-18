export const GlyphCodes = {
    None: 'None',

    AcuteAccent: 'AcuteAccent',
    Stropha: 'Stropha',
    StrophaLiquescent: 'StrophaLiquescent',

    BeginningAscLiquescent: 'BeginningAscLiquescent',
    BeginningDesLiquescent: 'BeginningDesLiquescent',

    CustosDescLong: 'CustosDescLong',
    CustosDescShort: 'CustosDescShort',
    CustosLong: 'CustosLong',
    CustosShort: 'CustosShort',

    // clefs and other markings
    DoClef: 'DoClef',
    FaClef: 'FaClef',
    Flat: 'Flat',
    Mora: 'Mora',
    Natural: 'Natural',
    OriscusAsc: 'OriscusAsc',
    OriscusDes: 'OriscusDes',
    OriscusLiquescent: 'OriscusLiquescent',

    PodatusLower: 'PodatusLower',
    PodatusUpper: 'PodatusUpper',

    Porrectus1: 'Porrectus1', // 1 staff line difference,
    Porrectus2: 'Porrectus2', // 2 lines difference, etc...
    Porrectus3: 'Porrectus3',
    Porrectus4: 'Porrectus4',

    PunctumCavum: 'PunctumCavum',
    PunctumQuadratum: 'PunctumQuadratum',
    PunctumQuadratumAscLiquescent: 'PunctumQuadratumAscLiquescent',
    PunctumQuadratumDesLiquescent: 'PunctumQuadratumDesLiquescent',
    PunctumInclinatum: 'PunctumInclinatum',
    PunctumInclinatumLiquescent: 'PunctumInclinatumLiquescent',
    Quilisma: 'Quilisma',

    Sharp: 'Sharp',
    TerminatingAscLiquescent: 'TerminatingAscLiquescent',
    TerminatingDesLiquescent: 'TerminatingDesLiquescent',
    VerticalEpisemaAbove: 'VerticalEpisemaAbove',
    VerticalEpisemaBelow: 'VerticalEpisemaBelow',
    VirgaLong: 'VirgaLong',
    VirgaShort: 'VirgaShort',
    Virgula: 'Virgula',

    UpperBrace: 'UpperBrace'
};

export const TextMeasuringStrategies = {
    // shapes
    SVG: 0,
    CANVAS: 1
};

export const LyricTypes = {
    SINGLE_SYLLABLE: 0,
    BEGINNING_SYLLABLE: 1,
    MIDDLE_SYLLABLE: 2,
    ENDING_SYLLABLE: 3,
    // for asterisks, 'ij.' elements, or other performance notes.
    DIRECTIVE: 4
};
