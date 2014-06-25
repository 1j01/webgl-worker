
// COPY BACK, CHAK DIFF

function Element() { throw 'Element' }
function Image() { throw 'Element' }
function HTMLCanvasElement() { throw 'HTMLCanvasElement' }
function HTMLImageElement() { throw 'HTMLImageElement' }
function HTMLVideoElement() { throw 'HTMLVideoElement' }

//... XXX

function FPSTracker(text) {
  var last = 0;
  var mean = 0;
  var counter = 0;
  this.tick = function() {
    var now = Date.now();
    if (last > 0) {
      var diff = now - last;
      mean = 0.99*mean + 0.01*diff;
      if (counter++ === 60) {
        counter = 0;
        dump(text + ' fps: ' + (1000/mean).toFixed(2) + '\n');
      }
    }
    last = now;
  }
}

function PropertyBag() {
  this.addProperty = function(){};
  this.removeProperty = function(){};
};

function EventListener() {
  this.listeners = {};

  this.addEventListener = function addEventListener(event, func) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(func);
  };

  this.removeEventListener = function(event, func) {
    var list = this.listeners[event];
    if (!list) return;
    var me = list.indexOf(func);
    if (me < 0) return;
    list.splice(me, 1);
  };

  this.fireEvent = function fireEvent(event) {
    event.preventDefault = function(){};

    if (event.type in this.listeners) {
      this.listeners[event.type].forEach(function(listener) {
        listener(event);
      });
    }
  };
};

var window = this;
var windowExtra = new EventListener();
for (var x in windowExtra) window[x] = windowExtra[x];

window.close = function window_close() {
  postMessage({ target: 'window', method: 'close' });
};

window.scrollX = window.scrollY = 0; // TODO: proxy these

window.WebGLRenderingContext = WebGLWorker;

var timesLeft = 1;
window.requestAnimationFrame = function(func) {
  if (timesLeft-- > 0) setTimeout(func, 1000/60);
};

var webGLWorker = new WebGLWorker();

var document = new EventListener();

document.createElement = function document_createElement(what) {
  switch(what) {
    case 'canvas': {
      var canvas = new EventListener();
      canvas.ensureData = function canvas_ensureData() {
        if (!canvas.data || canvas.data.width !== canvas.width || canvas.data.height !== canvas.height) {
          canvas.data = {
            width: canvas.width,
            height: canvas.height,
            data: new Uint8Array(canvas.width*canvas.height*4)
          };
          if (canvas === Module['canvas']) {
            postMessage({ target: 'canvas', op: 'resize', width: canvas.width, height: canvas.height });
          }
        }
      };
      canvas.getContext = function canvas_getContext(type, attributes) {
        if (canvas === Module['canvas']) {
          postMessage({ target: 'canvas', op: 'getContext', type: type, attributes: attributes });
        }
        if (type === '2d') {
          return {
            getImageData: function(x, y, w, h) {
              assert(x == 0 && y == 0 && w == canvas.width && h == canvas.height);
              canvas.ensureData();
              return {
                width: canvas.data.width,
                height: canvas.data.height,
                data: new Uint8Array(canvas.data.data) // TODO: can we avoid this copy?
              };
            },
            putImageData: function(image, x, y) {
              canvas.ensureData();
              assert(x == 0 && y == 0 && image.width == canvas.width && image.height == canvas.height);
              canvas.data.data.set(image.data); // TODO: can we avoid this copy?
              if (canvas === Module['canvas']) {
                postMessage({ target: 'canvas', op: 'render', image: canvas.data });
              }
            }
          };
        } else {
          return webGLWorker;
        }
      };
      canvas.boundingClientRect = {};
      canvas.getBoundingClientRect = function canvas_getBoundingClientRect() {
        return {
          width: canvas.boundingClientRect.width,
          height: canvas.boundingClientRect.height,
          top: canvas.boundingClientRect.top,
          left: canvas.boundingClientRect.left,
          bottom: canvas.boundingClientRect.bottom,
          right: canvas.boundingClientRect.right
        };
      };
      canvas.style = new PropertyBag();
      canvas.exitPointerLock = function(){};
      return canvas;
    }
    default: throw 'document.createElement ' + what;
  }
};

document.getElementById = function(id) {
  if (id === 'application-canvas') {
    if (Module.canvas) return Module.canvas;
    return Module.canvas = document.createElement('canvas');
  }
};

document.documentElement = {};

document.styleSheets = [{
  cssRules: [], // TODO: forward to client
  insertRule: function(rule, i) {
    this.cssRules.splice(i, 0, rule);
  }
}];

function Audio() {
  Runtime.warnOnce('faking Audio elements, no actual sound will play');
}

Audio.prototype.play = function(){};
Audio.prototype.pause = function(){};

Audio.prototype.cloneNode = function() {
  return new Audio;
}

if (typeof console === 'undefined') {
  var console = {
    info: function(x) {
      //Module.printErr(x);
    },
    debug: function(x) {
      //Module.printErr(x);
    },
    log: function(x) {
      //Module.printErr(x);
    },
    error: function(x) {
      //Module.printErr(x);
    },
  };
}

Module.canvas = document.createElement('canvas');

Module.setStatus = function(){};

Module.print = function Module_print(x) {
  //dump('OUT: ' + x + '\n');
  postMessage({ target: 'stdout', content: x });
};
Module.printErr = function Module_printErr(x) {
  //dump('ERR: ' + x + '\n');
  postMessage({ target: 'stderr', content: x });
};

// Browser hooks

Browser.resizeListeners.push(function(width, height) {
  postMessage({ target: 'canvas', op: 'resize', width: width, height: height });
});

// Frame throttling

var frameId = 0;
var clientFrameId = 0;

var postMainLoop = Module['postMainLoop'];
Module['postMainLoop'] = function() {
  if (postMainLoop) postMainLoop();
  // frame complete, send a frame id
  postMessage({ target: 'tick', id: frameId++ });
  commandBuffer = [];
};

// buffer messages until the program starts to run

var messageBuffer = null;

function messageResender() {
  if (calledMain) {
    assert(messageBuffer && messageBuffer.length > 0);
    messageBuffer.forEach(function(message) {
      onmessage(message);
    });
    messageBuffer = null;
  } else {
    setTimeout(messageResender, 100);
  }
}

onmessage = function onmessage(message) {
  if (!calledMain) {
    if (!messageBuffer) {
      messageBuffer = [];
      setTimeout(messageResender, 100);
    }
    messageBuffer.push(message);
  }
  //dump('worker got ' + JSON.stringify(message.data) + '\n');
  switch (message.data.target) {
    case 'document': {
      document.fireEvent(message.data.event);
      break;
    }
    case 'window': {
      window.fireEvent(message.data.event);
      break;
    }
    case 'canvas': {
      if (message.data.event) {
        Module.canvas.fireEvent(message.data.event);
      } else if (message.data.boundingClientRect) {
        Module.canvas.boundingClientRect = message.data.boundingClientRect;
      } else throw 'ey?';
      break;
    }
    case 'gl': {
      webGLWorker.onmessage(message.data);
      break;
    }
    case 'tock': {
      clientFrameId = message.data.id;
      break;
    }
    default: throw 'wha? ' + message.data.target;
  }
};

