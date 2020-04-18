
export const RGX_SYLLABLES = /(?=.)((?:[^(])*)(?:\(?([^)]*)\)?)?/g;

export const RGX_NOTATIONS = /z0|z|Z|::|:|[,;][1-6]?|`|[cf][1-4]|cb3|cb4|\/\/|\/| |\!|-?[a-mA-M][oOwWvVrRsxy#~\+><_\.'012345]*(?:\[[^\]]*\]?)*|\{([^}]+)\}?/g;
export const RGX_NOTATIONS_GROUP_INSIDE_BRACES = 1;

export const RGX_BRACKETED_COMMAND = /^([a-z]+):(.*)/;

export const RGX_ALT_TAG = /<alt>(.*?)<\/alt>/g;
export const RGX_TRANSLATION = /\[(alt:)?(.*?)\]/g

// for the brace string inside of [ and ] in notation data
// the capturing groups are:
//  1. o or u, to indicate over or under
//  2. b, cb, or cba, to indicate the brace type
//  3. 0 or 1 to indicate the attachment point
//  4. { or } to indicate opening/closing (this group will be null if the metric version is used)
//  5. a float indicating the millimeter length of the brace (not supported yet)
export const RGX_BRACE_SPEC = /([ou])(b|cb|cba):([01])(?:([{}])|;(\d*(?:\.\d+)?)mm)/;

export const Atoms = {
    COMMA: ',',
    TICK: '`',
    SEMICOLON: ';',
    COLON: ':',
    DOUBLE_COLON: '::',
    C1: 'c1',
    C2: 'c2',
    C3: 'c3',
    C4: 'c4',
    F3: 'f3',
    F4: 'f4',
    CB3: 'cb3',
    CB4: 'cb4',
    Z_LOWER: 'z',
    Z_UPPER: 'Z',
    Z0: 'z0',
    BANG: '!',
    SLASH: '/',
    DOUBLE_SLASH: '//',
    SPACE: ' ',
    Y: 'y',
    HASH: '#'
};
