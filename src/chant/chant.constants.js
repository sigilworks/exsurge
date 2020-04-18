
export const LiquescentTypes = {
    NONE: 0,
    // flags that can be combined, though of course it
    // it doesn't make sense to combine some!
    LARGE: 1 << 0,
    SMALL: 1 << 1,
    ASCENDING: 1 << 2,
    DESCENDING: 1 << 3,
    INITIO_DEBILIS: 1 << 4,
    // handy liquescent types
    LARGE_ASCENDING: 1 << 0 | 1 << 2,
    LARGE_DESCENDING: 1 << 0 | 1 << 3,
    SMALL_ASCENDING: 1 << 1 | 1 << 2,
    SMALL_DESCENDING: 1 << 1 | 1 << 3
};

export const NoteShapes = {
    // shapes
    DEFAULT: 0,
    VIRGA: 1,
    INCLINATUM: 2,
    QUILISMA: 3,
    STROPHA: 4,
    ORISCUS: 5
};

export const NoteShapeModifiers = {
    // flags which modify the shape
    // not all of them apply to every shape, of course
    NONE: 0,
    ASCENDING: 1 << 0,
    DESCENDING: 1 << 1,
    CAVUM: 1 << 2,
    STEMMED: 1 << 3
};

export const AccidentalTypes = {
    FLAT: -1,
    NATURAL: 0,
    SHARP: 1
};

// for positioning markings on notes
export const MarkingPositionHints = {
    DEFAULT: 0,
    ABOVE: 1,
    BELOW: 2
};

// for positioning markings on notes
export const HorizontalEpisemaAlignments = {
    DEFAULT: 0,
    LEFT: 1,
    CENTER: 2,
    RIGHT: 3
};

// indicates the shape of the brace
export const BraceShapes = {
    ROUND_BRACE: 0,
    CURLY_BRACE: 1,
    ACCENTED_CURLY_BRACE: 2
};

// indicates how the brace is aligned to the note to which it's connected
export const BraceAttachments = {
    LEFT: 0,
    RIGHT: 1
};
