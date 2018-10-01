
importScripts('../emshim.js');
importScripts('../webGLWorker.js');
importScripts('../proxyWorker.js');

importScripts('lightgl.js'); // NOTE: patched
importScripts('doodle.js');

setMain(function() {

    var view_width = 10
    var view_height = 10
    var view_scale = 100
    var camera_x = 0
    var camera_y = 0
    var camera_z = -500

    var gl

    var program_context = self

    var init_gl = function() {
        gl = GL.create({preserveDrawingBuffer: true})

        gl.enable(gl.DEPTH_TEST)

        gl.canvas.width = view_width * view_scale
        gl.canvas.height = view_height * view_scale
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        
        gl.matrixMode(gl.PROJECTION)
        gl.loadIdentity()
        gl.ortho(-view_width/2, view_width/2, -view_height/2, view_height/2, 0.1, 1000)
        // gl.perspective(view_fov, view_width/view_height, 0.1, 1000)
        gl.matrixMode(gl.MODELVIEW)
        
        // NOTE: these don't need to be attached to gl; that's just how it's done in the examples
        gl.onupdate = function() {
            if (program_context && program_context.update) {
                program_context.update()
            }
        }
        gl.ondraw = function() {
            if (program_context && program_context.draw) {
                gl.loadIdentity()
                gl.translate(camera_x, camera_y, camera_z)
                // gl should probably just be global for the program
                // or at least there should be an init method you can define that also gets gl
                program_context.draw(gl)
            }
        }
    }

    init_gl()

    var time = 0;
    var animate = function () {
        gl.onupdate();
        gl.ondraw();
        requestAnimationFrame(animate);
    }
    animate();
});
