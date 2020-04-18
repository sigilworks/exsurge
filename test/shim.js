// polyfill in test env since React v16 will throw warning about polyfills expected
global.requestAnimationFrame = (callback) => {
    setTimeout(callback, 0);
};
