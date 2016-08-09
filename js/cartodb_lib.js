var CartoDbLib = CartoDbLib || {};
var CartoDbLib = {

  map_centroid:    [41.87811, -87.66677],
  defaultZoom:     11,
  lastClickedLayer: null,
  locationScope:   "chicago",
  currentPinpoint: null,
  layerUrl: 'https://clearstreets.carto.com/api/v2/viz/efcba8d2-4d16-11e6-a770-0e05a8b3e3d7/viz.json',
  tableName: 'probationresourcesmap_mergeddata_resources',
  userName: 'clearstreets',
  geoSearch: '',
  whereClause: '',
  ageSelections: '',
  langSelections: '',
  typeSelections: '',
  insuranceSelections: '',
  userSelection: '',
  radius: '',
  resultsCount: 0,
  fields: "cartodb_id, street_address, full_address, organization_name, hours_of_operation, website, intake_number, under_18, _18_to_24, _25_to_64, over_65, spanish, asl_or_assistance_for_hearing_impaired, housing, health, legal, education_and_employment, social_support, food_and_clothing, sliding_fee_scale, private_health_insurance, military_insurance, medicare, medicaid",

  initialize: function(){
    //reset filters
    $("#search-address").val(CartoDbLib.convertToPlainString($.address.parameter('address')));

    geocoder = new google.maps.Geocoder();
    // initiate leaflet map
    if (!CartoDbLib.map) {
      CartoDbLib.map = new L.Map('mapCanvas', {
        center: CartoDbLib.map_centroid,
        zoom: CartoDbLib.defaultZoom
      });

      CartoDbLib.google = new L.Google('ROADMAP', {animate: false});

      CartoDbLib.map.addLayer(CartoDbLib.google);

      CartoDbLib.info = L.control({position: 'bottomleft'});

      CartoDbLib.info.onAdd = function (map) {
          this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
          this.update();
          return this._div;
      };

      // method that we will use to update the control based on feature properties passed
      CartoDbLib.info.update = function (props) {
        if (props) {
          // this._div.innerHTML = props.full_address;
          this._div.innerHTML = "<ul><li><strong>" + props.organization_name + "</strong></li><li>" + props.full_address + "</li></ul>";
        }
        else {
          this._div.innerHTML = 'Hover over a location';
        }
      };

      CartoDbLib.info.clear = function(){
        this._div.innerHTML = 'Hover over a location';
      };

      CartoDbLib.makeResultsDiv();
      CartoDbLib.info.addTo(CartoDbLib.map);
      CartoDbLib.clearSearch();
      CartoDbLib.renderMap();
      CartoDbLib.renderList();
      CartoDbLib.renderSavedResults();
      CartoDbLib.updateSavedCounter();
    }
  },

  doSearch: function() {
    CartoDbLib.clearSearch();
    var address = $("#search-address").val();
    CartoDbLib.radius = $("#search-radius").val();

    if (address != "") {
      if (address.toLowerCase().indexOf(CartoDbLib.locationScope) == -1)
        address = address + " " + CartoDbLib.locationScope;

      geocoder.geocode( { 'address': address }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          CartoDbLib.currentPinpoint = [results[0].geometry.location.lat(), results[0].geometry.location.lng()];
          $.address.parameter('address', encodeURIComponent(address));
          $.address.parameter('radius', CartoDbLib.radius);
          CartoDbLib.address = address;
          // Must call create SQL before setting language parameter.
          CartoDbLib.createSQL();
          $.address.parameter('age', encodeURIComponent(CartoDbLib.ageSelections));
          $.address.parameter('lang', encodeURIComponent(CartoDbLib.langSelections));
          $.address.parameter('type', encodeURIComponent(CartoDbLib.typeSelections));
          $.address.parameter('insure', encodeURIComponent(CartoDbLib.insuranceSelections));

          CartoDbLib.setZoom();
          CartoDbLib.addIcon();
          CartoDbLib.addCircle();
          CartoDbLib.renderMap();
          CartoDbLib.renderList();
          CartoDbLib.getResults();

        }
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      CartoDbLib.map.setView(new L.LatLng( CartoDbLib.map_centroid[0], CartoDbLib.map_centroid[1] ), CartoDbLib.defaultZoom)
    }
  },

  renderMap: function() {
      var layerOpts = {
        user_name: CartoDbLib.userName,
        type: 'cartodb',
        cartodb_logo: false,
        sublayers: [
          {
            sql: "SELECT * FROM " + CartoDbLib.tableName + CartoDbLib.whereClause,
            cartocss: $('#probation-maps-styles').html().trim(),
            interactivity: CartoDbLib.fields
          }
        ]
      }

      CartoDbLib.dataLayer = cartodb.createLayer(CartoDbLib.map, layerOpts, { https: true })
        .addTo(CartoDbLib.map)
        .done(function(layer) {
          CartoDbLib.sublayer = layer.getSubLayer(0);
          CartoDbLib.sublayer.setInteraction(true);
          CartoDbLib.sublayer.on('featureOver', function(e, latlng, pos, data, subLayerIndex) {
            $('#mapCanvas div').css('cursor','pointer');
            CartoDbLib.info.update(data);
          })
          CartoDbLib.sublayer.on('featureOut', function(e, latlng, pos, data, subLayerIndex) {
            $('#mapCanvas div').css('cursor','inherit');
            CartoDbLib.info.clear();
          })
          CartoDbLib.sublayer.on('featureClick', function(e, latlng, pos, data) {
              CartoDbLib.modalPop(data);
          })
          CartoDbLib.sublayer.on('error', function(err) {
            console.log('error: ' + err);
          })
        }).on('error', function(e) {
          console.log('ERROR')
          console.log(e)
        });
  },

  renderList: function() {
    var sql = new cartodb.SQL({ user: CartoDbLib.userName });
    var results = $('#results-list');
    var elements = {
      facility: '',
      address: '',
      hours: '',
      phone: '',
      website: ''
    };

    if (CartoDbLib.whereClause == ' WHERE the_geom is not null AND ') {
      CartoDbLib.whereClause = '';
    }

    results.empty();

    sql.execute("SELECT " + CartoDbLib.fields + " FROM " + CartoDbLib.tableName + CartoDbLib.whereClause)
      .done(function(listData) {
        var obj_array = listData.rows;
        if (listData.rows.length == 0) {
          results.append("<p class='no-results'>No results. Please broaden your search.</p>");
        }
        else {
          for (idx in obj_array) {
            var attributeArr = new Array;
            var facilityName = obj_array[idx].organization_name;
            var facilityAddress = obj_array[idx].full_address;
            var facilityHours = obj_array[idx].hours_of_operation;
            var facilityNumber = obj_array[idx].intake_number;
            var facilityWebsite = obj_array[idx].website;

            attributeArr.push(facilityName, facilityAddress, facilityHours, facilityNumber, facilityWebsite)

            if (CartoDbLib.deleteBlankResults(attributeArr) < 5) {

              if (facilityName != "") {
                elements["facility"] = facilityName;
              }
              if (facilityAddress != "") {
                elements["address"] = facilityAddress;
              }
              if (facilityHours != "") {
                elements["hours"] = facilityHours;
              }
              if (facilityNumber != "") {
                elements["phone"] = facilityNumber;
              }
              if (facilityWebsite != "") {
                if (facilityWebsite.match(/^http/)) {
                  elements["website"] = facilityWebsite;
                }
                else {
                  elements["website"] = "http://" + facilityWebsite;
                }
              }

              var icon = ''
              // Check if facility is in 'location' cookie.
              if(CartoDbLib.checkCookieDuplicate(obj_array[idx].organization_name) == false) {
                icon = "<i class='fa fa-check-circle' aria-hidden='true' data-toggle='tooltip' title='Save location'></i>"
              }
              else {
                icon = "<i class='fa fa-bookmark' aria-hidden='true' data-toggle='tooltip' title='Save location'></i>"
              }

              var output = Mustache.render("<tr><td>" + icon + "</td><td class='facility-name'>{{facility}}</td><td class='facility-address'>{{address}}</td><td>{{hours}}</td><td><strong>Phone:</strong> {{phone}} <br><strong>Website:&nbsp</strong><a href='{{website}}' target='_blank'>{{website}}</a></td></tr>", elements);

              results.append(output);
              $('.fa-bookmark').tooltip();
            }
          }
        }
    })
    .error(function(errors) {
      console.log("errors:" + errors);
    });
  },

  deleteBlankResults: function(array) {
    var counter = 0;
    // Count number of instances of whitespace.
    $.each(array, function (index, value) {
      cleanText = value.trim();
      if (cleanText.length == 0) {
        counter++;
      }
    });
    return counter
  },

  getResults: function() {
    var sql = new cartodb.SQL({ user: CartoDbLib.userName });

    sql.execute("SELECT count(*) FROM " + CartoDbLib.tableName + CartoDbLib.whereClause)
      .done(function(data) {
        CartoDbLib.resultsCount = data.rows[0]["count"];
        $(".results-count").empty();
        $(".results-count").append("Results: " + CartoDbLib.resultsCount);
      });
  },

  makeResultsDiv: function() {
    var results = L.control({position: 'topright'});

    results.onAdd = function (map) {
      var div = L.DomUtil.create('div', 'results-count');
      div.innerHTML = "Results: " + CartoDbLib.resultsCount
      return div;
    };

    results.addTo(CartoDbLib.map);
  },

  modalPop: function(data) {
      var modalText = "<p>" + data.full_address + "</p>" + "<p>" + data.hours_of_operation + "</p>" + "<p>" + data.intake_number + "</p>" + "<p><a href='" + data.website + "' target='_blank'>" + data.website + "</a></p>"

      $('#modal-pop').modal();
      $('#modal-title, #modal-main, #language-header, #insurance-header, #insurance-subsection, #language-subsection').empty();
      $('#modal-title').append(data.organization_name)
      $('#modal-main').append(modalText);

      var insurance_count = 0
      var language_count = 0
      // Find all instances of "yes."
      for (prop in data) {
        var value = data[prop];
        if (String(value).toLowerCase() == "yes") {
          if ($.inArray(String(prop), insuranceOptions) > -1) {
            $("#insurance-subsection").append("<p>" + CartoDbLib.removeUnderscore(prop) + "</p>");
            insurance_count += 1;
          }
          if ($.inArray(String(prop), languageOptions) > -1) {
            $("#language-subsection").append("<p>" + CartoDbLib.removeUnderscore(prop) + "</p>");
            language_count += 1;
          }
        }
      }
      // Add headers or not.
      if (insurance_count > 0) {
        $("#insurance-header").append("Payment Options");
      }
      if (language_count > 0) {
        $("#language-header").append("Language");
      }
      $('#modal-main').append('<p><a href="http://maps.google.com/?q=' + data.full_address + '" target="_blank">Get Directions</a></p>')
  },

  clearSearch: function(){
    if (CartoDbLib.sublayer) {
      CartoDbLib.sublayer.remove();
    }
    if (CartoDbLib.centerMark)
      CartoDbLib.map.removeLayer( CartoDbLib.centerMark );
    if (CartoDbLib.radiusCircle)
      CartoDbLib.map.removeLayer( CartoDbLib.radiusCircle );
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        CartoDbLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search-address').val(results[1].formatted_address);
          $('.hint').focus();
          CartoDbLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
    return decodeURIComponent(text);
  },

  removeUnderscore: function(text) {
    // Find ASL. Capitalize first three letters.
    if (text.match(/^asl/)) {
      var capitalText = "ASL or assistance for hearing impaired"
    }
    else {
      var capitalText = text.charAt(0).toUpperCase() + text.slice(1);
    }

    return capitalText.replace(/_/g, ' ')
  },

  addUnderscore: function(text) {
    newText = text.replace(/\s/g, '_')
    if (newText[0].match(/^[1-9]\d*/)) {
      newText = "_" + newText
    }
    return newText.toLowerCase();
  },

  // Call this in createSearch, when creating SQL queries from user selection.
  userSelectSQL: function(array) {
    var results = '';

    $.each( array, function(index, obj) {
      CartoDbLib.userSelection += " AND LOWER(" + CartoDbLib.addUnderscore(obj.text) + ") LIKE 'yes'"
      results += (obj.text + ", ")
    })

    return results
  },

  createSQL: function() {
     // Devise SQL calls for geosearch and language search.
    CartoDbLib.geoSearch = "ST_DWithin(ST_SetSRID(ST_POINT(" + CartoDbLib.currentPinpoint[1] + ", " + CartoDbLib.currentPinpoint[0] + "), 4326)::geography, the_geom::geography, " + CartoDbLib.radius + ")";

    CartoDbLib.userSelection = '';
    // Gets selected elements in dropdown (represented as an array of objects).
    var ageUserSelections = ($("#select-age").select2('data'))
    var langUserSelections = ($("#select-language").select2('data'))
    var typeUserSelections = ($("#select-type").select2('data'))
    var insuranceUserSelections = ($("#select-insurance").select2('data'))

    // Set results equal to varaible – to be used when creating cookies.
    var ageResults = CartoDbLib.userSelectSQL(ageUserSelections);
    CartoDbLib.ageSelections = ageResults;

    var langResults = CartoDbLib.userSelectSQL(langUserSelections);
    CartoDbLib.langSelections = langResults;

    var facilityTypeResults = CartoDbLib.userSelectSQL(typeUserSelections);
    CartoDbLib.typeSelections = facilityTypeResults;

    var insuranceResults = CartoDbLib.userSelectSQL(insuranceUserSelections);
    CartoDbLib.insuranceSelections = insuranceResults;

    CartoDbLib.whereClause = " WHERE the_geom is not null AND "

    if (CartoDbLib.geoSearch != "") {
      CartoDbLib.whereClause += CartoDbLib.geoSearch;
      CartoDbLib.whereClause += CartoDbLib.userSelection;
    }

  },

  setZoom: function() {
    var zoom = '';
    if (CartoDbLib.radius >= 8050) zoom = 12; // 5 miles
    else if (CartoDbLib.radius >= 3220) zoom = 13; // 2 miles
    else if (CartoDbLib.radius >= 1610) zoom = 14; // 1 mile
    else if (CartoDbLib.radius >= 805) zoom = 15; // 1/2 mile
    else if (CartoDbLib.radius >= 400) zoom = 16; // 1/4 mile
    else zoom = 16;

    CartoDbLib.map.setView(new L.LatLng( CartoDbLib.currentPinpoint[0], CartoDbLib.currentPinpoint[1] ), zoom)
  },

  addIcon: function() {
    CartoDbLib.centerMark = new L.Marker(CartoDbLib.currentPinpoint, { icon: (new L.Icon({
            iconUrl: '/img/blue-pushpin.png',
            iconSize: [32, 32],
            iconAnchor: [10, 32]
    }))});

    CartoDbLib.centerMark.addTo(CartoDbLib.map);
  },

  addCircle: function() {
    CartoDbLib.radiusCircle = new L.circle(CartoDbLib.currentPinpoint, CartoDbLib.radius, {
        fillColor:'#1d5492',
        fillOpacity:'0.2',
        stroke: false,
        clickable: false
    });

    CartoDbLib.radiusCircle.addTo(CartoDbLib.map);
  },

  addCookieValues: function() {
    var objArr = new Array

    if ($.cookie("probationResources") != null) {
      storedObject = JSON.parse($.cookie("probationResources"));
      objArr.push(storedObject)
    }

    var path = $.address.value();
    var parameters = {
      "address": CartoDbLib.address,
      "radius": CartoDbLib.radius,
      "age": CartoDbLib.ageSelections,
      "language": CartoDbLib.langSelections,
      "type": CartoDbLib.typeSelections,
      "insurance": CartoDbLib.insuranceSelections,
      "path": path
    }

    objArr.push(parameters)
    flatArray = [].concat.apply([], objArr)
    $.cookie("probationResources", JSON.stringify(flatArray));
  },

  renderSavedResults: function() {
    $('.saved-searches').empty();
    $('.saved-searches').append('<li class="dropdown-header">Saved searches</li><li class="divider"></li>');

    var objArray = JSON.parse($.cookie("probationResources"));

    if (objArray == null || objArray.length == 0) {
      $('#saved-searches-nav').hide();
    }
    else {
      $('#saved-searches-nav').show();
      $.each(objArray, function( index, obj ) {
        $('.saved-searches').append('<li><a href="#" class="remove-icon"><i class="fa fa-times"></i></a><a class="saved-search" href="#"> ' + obj.address + '<span class="hidden">' + obj.path + '</span></a></li>');
      });
    }
  },

  returnSavedResults: function(path) {
    var objArray = JSON.parse($.cookie("probationResources"));

    $.each(objArray, function( index, obj ) {
      if (obj.path == path ) {
        $("#search-address").val(obj.address);
        $("#search-radius").val(obj.radius);

        var ageArr = CartoDbLib.makeSelectionArray(obj.age, ageOptions);
        $('#select-age').val(ageArr).trigger("change");

        var langArr = CartoDbLib.makeSelectionArray(obj.language, languageOptions);
        $('#select-language').val(langArr).trigger("change");

        var typeArr = CartoDbLib.makeSelectionArray(obj.type, facilityTypeOptions);
        $('#select-type').val(typeArr).trigger("change");

        var insureArr = CartoDbLib.makeSelectionArray(obj.insurance, insuranceOptions);
        $('#select-insurance').val(insureArr).trigger("change");
      }
    });

  },
// Resets select2 selectors to match CartoDb field names. Takes a string from returnSavedResults iteration, and takes an array from the array variables in map.js.
  makeSelectionArray: function(string, selectionArray){
    var newArr = string.split(",")
    newArr.pop();

    var indexArray = new Array

    $.each( newArr, function( index, el ) {
      var value = CartoDbLib.removeWhiteSpace(el);
      value = CartoDbLib.addUnderscore(value);
      indexArray.push(selectionArray.indexOf(value));
    });

    return indexArray
  },

  deleteSavedResult: function(path) {
    var objArray = JSON.parse($.cookie("probationResources"));

    for (var idx = 0; idx < objArray.length; idx++) {
      if (objArray[idx].path == path ) {
        objArray.splice(idx, 1);
      }
    }

    $.cookie("probationResources", JSON.stringify(objArray));
    CartoDbLib.renderSavedResults();
  },

  addFacilityCookie: function(name, address) {
    var objArr = new Array
    // if(CartoDbLib.checkCookieDuplicate(name) == false) {
    //   return;
    // }

    if ($.cookie("location") != null) {
      storedObject = JSON.parse($.cookie("location"));
      objArr.push(storedObject)
    }

    var parameters = {
      "name": name,
      "address": address
    }

    objArr.push(parameters)
    flatArray = [].concat.apply([], objArr)
    $.cookie("location", JSON.stringify(flatArray));
    CartoDbLib.updateSavedCounter();
  },

  // Call when rendering list. To determine icon.
  checkCookieDuplicate: function(name) {
    var objArray = JSON.parse($.cookie("location"));
    var returnVal = true;

    $.each(objArray, function( index, obj ) {
      if (obj.name == name) {
        returnVal = false;
      }
    });
    return returnVal;
  },

  renderSavedFacilities: function() {
    $("#locations-div").empty();

    var objArray = JSON.parse($.cookie("location"));
    // TODO: What if there are duplicate facilities?
    if (objArray != null) {
      $.each(objArray, function( index, obj ) {
        // TODO: Clean up with good CSS.
        $('#locations-div').append("<div><p>" + obj.name + "</p>" + "<p>" + obj.address + "</p><p><a class='remove-location' href='#'>Remove From List</a></p><hr></div>");
      });
    }

  },

  deleteSavedFacility: function(address) {
    var objArray = JSON.parse($.cookie("location"));

    for (var idx = 0; idx < objArray.length; idx++) {
      if (objArray[idx].address == address ) {
        objArray.splice(idx, 1);
      }
    }

    $.cookie("location", JSON.stringify(objArray));
    CartoDbLib.updateSavedCounter();
  },

  updateSavedCounter: function() {
    $("#saved-locations").empty();
    $("#no-locations").empty();

    var objArray = JSON.parse($.cookie("location"));
    if (objArray == null || objArray.length == 0) {
      $("#saved-locations").hide();
      $("#no-locations").append("No saved locations. Return <a href='/'>home</a> to search for more results.")
    }
    else if (objArray.length == 1) {
      $("#saved-locations").show();
      $("#saved-locations").append(objArray.length + " Location Saved")
    }
    else {
      $("#saved-locations").append(objArray.length + " Locations Saved")
    }
  },

  removeWhiteSpace: function(word) {
    while(word.charAt(0) === ' ')
        word = word.substr(1);
    return word;
  }

}