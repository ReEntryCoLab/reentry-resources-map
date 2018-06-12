$(function () {
  // Show disclaimer modal if cookie not set
  var COOKIE_STR = 'dontShowReentryModal=true';
  if (document.cookie.indexOf(COOKIE_STR) === -1) {
    $("#disclaimer-modal-pop").modal();
  }
  $("#disclaimer-modal-pop .close-btn").on("click", function () {
    document.cookie = COOKIE_STR;
  });
});
