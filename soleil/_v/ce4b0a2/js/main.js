/* Start-up: put the controls in step with the state, draw, list the saved suns. */
(function (Sun) {
  "use strict";

  Sun.syncControls();
  Sun.library.list();
})(window.Sun);
