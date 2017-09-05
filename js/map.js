var restrictionOptions = [
  {id: 0, text: "Women", value: "men_only"},
  {id: 1, text: "Men", value: "women_only"},
  {id: 2, text: "People on the sex offenders registry", value: "prohibits_sex_offenders"}
];

$(window).resize(function () {
  var h = $(window).height(),
    offsetTop = 120; // Calculate the top offset

  $('#mapCanvas').css('height', (h - offsetTop));
}).resize();

$(function() {
  CartoDbLib.initialize();
  new Clipboard('#copy-button');

  var autocomplete = new google.maps.places.Autocomplete(document.getElementById('search-address'));

  $('#btnReset').tooltip();
  $('#btnViewMode').tooltip();
  $('[data-tooltip="true"]').tooltip();

  $('#btnSearch').click(function(){
    // Temporary fix for map load issue: set show map as default.
    if ($('#mapCanvas').is(":visible")){
      CartoDbLib.doSearch();
    }
    else {
      $('#btnViewMode').html("<i class='icon-map-marker'></i> Map View");
      $('#listCanvas').show();
      $('#mapCanvas').hide();

      CartoDbLib.doSearch();
    }
  });

  $('#btnViewMode').click(function(){
    if ($('#mapCanvas').is(":visible")){
      $('#btnViewMode').html("<i class='icon-map-marker'></i> Map View");
      $('#listCanvas').show();
      CartoDbLib.renderList();
      $('#mapCanvas').hide();
    }
    else {
      $('#btnViewMode').html("<i class='icon-list'></i> List View");
      $('#listCanvas').hide();
      $("#nextButton").hide();
      $("#prevButton").hide();
      $('#mapCanvas').show();
      CartoDbLib.map.invalidateSize();
    }
  });

  $("#search-address").keydown(function(e){
      var key =  e.keyCode ? e.keyCode : e.which;
      if(key == 13) {
          $('#btnSearch').click();
          return false;
      }
  });

  // Render filters template
  var filterData = {
    categories: makeSelectData(facilityTypeOptions),
    restrictions: restrictionOptions
  };
  var source = $('#filter-option-template').html();
  var template = Handlebars.compile(source);
  var result = template(filterData);
  $('#filters').html(result);

  $("#btnSave").on('click', function() {
    CartoDbLib.addCookieValues();
    CartoDbLib.renderSavedResults();
  });

  $("#dropdown-results").on('click', '.saved-search', function() {
    var path = $(this).children().text();
    CartoDbLib.returnSavedResults(path);
    CartoDbLib.doSearch();
  });

  $("#dropdown-results").on('click', '.remove-icon', function() {
    var path = ($(this).siblings().children().text());
    CartoDbLib.deleteSavedResult(path);
    $(this).parent().remove();
  });

  $(".list-table").on('click', '.icon-star-o', function() {
    var tr = ($(this).parents().eq(1));
    var address = tr.find("span.facility-address").text();
    var id_nbr = tr.find("span.given-id").text();
    $(this).removeClass('icon-star-o');
    $(this).addClass('icon-star');
    $(this).removeAttr('data-original-title');
    $(this).attr('title', 'Location saved');
    CartoDbLib.addFacilityCookie(address, id_nbr);
  });

  $(".modal-header").on('click', '.icon-star-o', function() {
    var address = $("#modal-address").text();
    var id_nbr = $.address.parameter('modal_id');
    $(this).removeClass('icon-star-o');
    $(this).addClass('icon-star');
    $(this).removeAttr('data-original-title');
    $(this).attr('title', 'Location saved');
    CartoDbLib.addFacilityCookie(address, id_nbr);
  });

  $(".close-btn").on('click', function() {
    $.address.parameter('modal_id', null)
  });

  $(".list-table").on('click', '.icon-star', function() {
    var tr = ($(this).parents().eq(1));
    var id_nbr = tr.find('.given-id').text();
    $(this).removeClass('icon-star');
    $(this).addClass('icon-star-o');
    CartoDbLib.deleteSavedFacility(id_nbr);
  });

  $(".btn-print").on("click", function() {
    window.print();
  });

  $("#download-guide").on("click", function() {
    var source = $('#modal-guide-template').html();
    var template = Handlebars.compile(source);
    var result = template({});
    $('#modal-pop').html(result);
    $('#modal-pop').modal();
  });
});

function makeSelectData(array) {
  data_arr = [];
  for(var i = 0; i < array.length; i++) {
    var obj = {id: i, text: CartoDbLib.formatText(array[i])};
    if (iconMap.hasOwnProperty(array[i])) {
      obj.icon = iconMap[array[i]];
    }
    data_arr.push(obj);
  }
  return data_arr;
};
