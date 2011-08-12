(function(jQuery) {
  "use strict";

  var $ = jQuery;

  var pressed = {};

  var keys = {
    DELETE: 8,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ESC: 27,
    SPACE: 32
  };

  var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  for (var i = 0; i < alphabet.length; i++)
    keys[alphabet[i]] = alphabet.charCodeAt(i);

  jQuery.extend({
    keys: keys,
    mouseMonitor: function mouseMonitor() {
      function onMouseMove(event) {
        self.lastPosition.pageX = event.pageX;
        self.lastPosition.pageY = event.pageY;
        self.emit('move', self);
      }
      $(document).mousemove(onMouseMove);
      
      var self = jQuery.eventEmitter({
        lastPosition: {
          pageX: 0,
          pageY: 0
        },
        unload: function() {
          $(document).unbind('mousemove', onMouseMove);
          self.removeAllListeners();
        }
      });
      
      return self;
    },
    xRayInput: function xRayInput(options) {
      var focused = options.focusedOverlay;
      var mixMaster = options.mixMaster;
      var commandManager = options.commandManager;
      var eventSource = options.eventSource;
      var onQuit = options.onQuit;
      var persistence = options.persistence;
      var styleInfo = options.styleInfoOverlay;

      function handleKeyUp(event) {
        switch (event.keyCode) {
          case keys.C:
          styleInfo.hide();
          return true;
        }
        return false;
      }

      function handleKeyDown(event) {
        if (event.altKey || event.ctrlKey ||
            event.altGraphKey || event.metaKey) {
          return false;
        }

        switch (event.keyCode) {
          case keys.LEFT:
          mixMaster.undo();
          return true;

          case keys.RIGHT:
          mixMaster.redo();
          return true;        

          case keys.UP:
          focused.upfocus();
          return true;

          case keys.DOWN:
          focused.downfocus();
          return true;            

          case keys.ESC:
          if (onQuit)
            onQuit();
          return true;

          // TODO: Eventually, remove keys.E.
          case keys.E:
          case keys.R:
          mixMaster.replaceFocusedElementWithDialog({
            input: self,
            dialogURL: jQuery.webxraySettings.url("easyRemixDialogURL"),
            sendFullDocument: true
          });
          return true;
          
          case keys.T:
          persistence.saveHistoryToDOM();
          jQuery.openUprootDialog(self);
          return true;

          case keys.DELETE:
          mixMaster.deleteFocusedElement();
          return true;
          
          case keys.I:
          mixMaster.infoForFocusedElement();
          return true;

          case keys.X:
          mixMaster.xpathForFocusedElement();
          return true;
          
          case keys.SPACE:
          if (pressed[keys.C]) {
            pressed[keys.C] = false;
            styleInfo.lock(self);
          }
          return true;

          case keys.C:
          if (!pressed[keys.C])
            styleInfo.show();
          return true;
        }
        return false;
      }

      var listeners = {
        keydown: function(event) {
          if (handleKeyDown(event)) {
            event.preventDefault();
            event.stopPropagation();
          }
          pressed[event.keyCode] = true;
        },
        keyup: function(event) {
          if (handleKeyUp(event)) {
            event.preventDefault();
            event.stopPropagation();
          }
          pressed[event.keyCode] = false;
        },
        click: function(event) {
          if ($(event.target).closest('a').length) {
            var msg = jQuery.locale.get("input:link-click-blocked");
            jQuery.transparentMessage($('<div></div>').text(msg));
            event.preventDefault();
            event.stopPropagation();
          }
        },
        mouseout: function(event) {
          event.stopPropagation();
          focused.unfocus();
        },
        mouseover: function(event) {
          event.stopPropagation();
          focused.set(event.target);
        }
      };

      var isActive = false;

      var self = jQuery.eventEmitter({
        handleEvent: function handleEvent(event) {
          if (event.type in listeners)
            listeners[event.type](event);
          else
            throw new Error("Unexpected event type: " + event.type);
        },
        activate: function() {
          // We're listening during the capture phase to intercept
          // any events at the earliest point before they're
          // handled by the page itself. Because JQuery's bind() doesn't
          // appear to allow for listening during the capture phase,
          // we're using document.addEventListener() directly.
          if (!isActive) {
            isActive = true;
            for (var name in listeners)
              eventSource.addEventListener(name, self.handleEvent, true);
            self.emit('activate');
          }
        },
        deactivate: function() {
          if (isActive) {
            isActive = false;
            for (var name in listeners)
              eventSource.removeEventListener(name, self.handleEvent, true);
            self.emit('deactivate');
          }
        }
      });
      
      return self;
    }
  });
})(jQuery);
