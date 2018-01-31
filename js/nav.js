$(function() {
  $("#download-guide").on("click", function() {
    var source = $('#modal-guide-template').html();
    var template = Handlebars.compile(source);
    var result = template({});
    $('#modal-pop').html(result);
    $('#modal-pop').modal();
  });
});
