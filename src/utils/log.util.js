import debug from 'debug';

const DEBUG_PREFIX = 'exsurge';

export default (namespace = '*') => debug(`${DEBUG_PREFIX}:${namespace}`);
