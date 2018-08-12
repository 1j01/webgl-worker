
importScripts('../emshim.js');
importScripts('../webGLWorker.js');
importScripts('../proxyWorker.js');

importScripts('lightgl.js');
importScripts('doodle.js');

setMain(function() {
        
        // TODO...

        // Hm, LightGL wants to create its own canvas element...
        // This isn't gonna work without changing the LightGL API,
        // or extending the WebGLWorker proxy

        // ---------------------------------------

        var canvas = document.getElementById("application-canvas");

        // Setup update, render and tick functions
        var update = function (dt) {
            if (model) {
                model.getGraph().rotate(0, 90*dt, 0);
            }
            scene.update();
        };

        var render = function () {
            renderer.render(scene, camera);
        }

        var time = 0;
        var tick = function () {
            var now = (window.performance && window.performance.now) ? performance.now() : Date.now();
            var dt = (now - (time || now)) / 1000.0;
            time = now;

            update(dt);
            render();

            requestAnimationFrame(tick, canvas);
        }

        // start running
        tick();
});

