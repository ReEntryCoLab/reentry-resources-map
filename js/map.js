var WHO_FILTER_OPTIONS = [
  { id: 0, text: "Veterans", value: "veterans", type: "who", icon: "icon-vets" },
  { id: 1, text: "Immigrants", value: "immigrants", type: "who" },
  { id: 2, text: "Currently incarcerated", value: "currentlyincarcerated", type: "who" },
  { id: 3, text: "Women", value: "menonly", type: "restriction", icon: "icon-female" },
  { id: 4, text: "Men", value: "womenonly", type: "restriction", icon: "icon-male" },
];

$(window).resize(function () {
  var h = $(window).height(),
    offsetTop = 120; // Calculate the top offset

  $('#mapCanvas').css('height', (h - offsetTop));
}).resize();

$(function() {
  ResourceLib.initialize();
  new Clipboard('#copy-button');
  var autocomplete = new google.maps.places.Autocomplete(document.getElementById('search-address'));

  $('#btnViewMode').tooltip();
  $('[data-tooltip="true"]').tooltip();

  $('#btnSearch').click(function(){
    // Temporary fix for map load issue: set show map as default.
    if (!$('#mapCanvas').is(":visible")) {
      $('#btnViewMode').html("<i class='icon-map-marker'></i> Map View");
      $('#listCanvas').show();
      $('#mapCanvas').hide();
    }
    ResourceLib.doSearch();
  });

  $("#btnReset").click(function() {
    ResourceLib.clearFilters();
  });

  $('.btnViewMode').click(function(){
    if ($('#mapCanvas').is(":visible")){
      $('#listCanvas').show();
      ResourceLib.renderList();
      $('#mapCanvas').hide();
      $("#seeListContainer").hide();
      $('#listControls').show();
    }
    else {
      $('#listCanvas').hide();
      $('#listControls').hide();
      $('#mapCanvas').show();
      $("#seeListContainer").show();
      ResourceLib.map.invalidateSize();
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
    categories: makeSelectData(FACILITY_TYPE_OPTIONS),
    who_options: WHO_FILTER_OPTIONS
  };
  ResourceLib.renderTemplate('#filter-option-template', '#filters', filterData);

  // Check if there are any type parameters in the address
  // if so, check the associated inputs and trigger a search
  var addressTypeStr = ResourceLib.convertToPlainString($.address.parameter('type'));
  FACILITY_TYPE_OPTIONS.forEach(function (t) {
    if (addressTypeStr.indexOf(t) !== -1) {
      $('input.filter-option[value="' + ResourceLib.formatText(t) + '"]').prop('checked', true);
    }
  });
  FLAG_OPTIONS.forEach(function (f) {
    // Modifying string because men_only is in str women_only
    var checkStr = f === "menonly" ? addressTypeStr.replace("womenonly", "") : addressTypeStr; 
    if (checkStr.indexOf(f) !== -1) {
      $('input.filter-option[value="' + f + '"]').prop('checked', true);
    }
  });

  $(".close-btn").on('click', function() {
    $.address.parameter('modal_id', null)
  });

  $(".btn-print").on("click", function() {
    window.print();
  });
});

function makeSelectData(array) {
  data_arr = [];
  for(var i = 0; i < array.length; i++) {
    var obj = {id: i, text: ResourceLib.formatText(array[i]), value: array[i]};
    if (ICON_MAP.hasOwnProperty(array[i])) {
      obj.icon = ICON_MAP[array[i]];
    }
    data_arr.push(obj);
  }
  return data_arr;
};
