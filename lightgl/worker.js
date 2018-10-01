
importScripts('../emshim.js');
importScripts('../webGLWorker.js');
importScripts('../proxyWorker.js');

importScripts('lightgl.js'); // NOTE: patched
importScripts('pixelweaver-shim.js'); // could move this in here
importScripts('doodle.js');

setMain(function() {
    var time = 0;
    var animate = function () {
        gl.onupdate();
        gl.ondraw();
        requestAnimationFrame(animate);
    }
    animate();
});
