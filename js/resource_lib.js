var ResourceLib = ResourceLib || {};

var ResourceLib = {
  center: [40.1242, -89.1486],
  defaultZoom: 7,
  sheetUrl: "https://spreadsheets.google.com/feeds/list/1Q4ET2Rg-SlRWjDIyg_lApfGTqdyjKGs8NOHlhu7LT2s/default/public/values?alt=json",
  address: "",
  currentLocation: [],
  typeSelections: [],
  radius: '',
  offset: 0,
  allResults: [],
  clerkResults: [],
  results: [],
  resultsCount: 0,
  pageSize: 20,
  infoBox: L.control({position: 'bottomleft'}),
  showDistance: false,

  // MAIN FILTER FUNCTIONS

  setup: function(){
    var that = this;
    $("#search-address").val(that.convertToPlainString($.address.parameter('address')));
    if ($.address.parameter('radius')) {
      $("#search-radius").val(+that.convertToPlainString($.address.parameter('radius')));
    }

    var num = $.address.parameter('modal_id');

    if (typeof num !== 'undefined') {
      var modalMatches = that.allResults.filter(function(r) { return r.id === num});
      if (modalMatches.length > 0) {
        that.modalPop(modalMatches[0]);
      }
    }

    // Create Leaflet map
    if (!that.map) {
      that.map = new L.Map('mapCanvas', {
        center: that.center,
        zoom: that.defaultZoom
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        maxZoom: 16,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution"> CARTO</a>'
      }).addTo(that.map);

      that.infoBox.onAdd = function(map){
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
      };

      that.infoBox.update = function(properties){
        var facilityType = ""

        if (properties) {
          $.each(properties, function (prop, value) {
            if ($.inArray(String(prop), FACILITY_TYPE_OPTIONS.concat(WHO_OPTIONS)) > -1 && value == 'Yes') {
              facilityType += (that.formatText(prop) + ", ")
            }
          });
          facilityType = facilityType.slice(0, -2);

          this._div.innerHTML = "<strong>" + properties.name + "</strong><br />" + facilityType + "<br />" + properties.address;
        }
        else {
          this._div.innerHTML = 'Hover over a location';
        }
      }

      that.infoBox.clear = function(){
          this._div.innerHTML = 'Hover over a location';
      }

      that.infoBox.addTo(that.map);

      // Add GeoJSON layer for displaying results
      that.geojsonLayer = L.geoJSON([], {
        onEachFeature: function(feature, layer) {
          layer.on('click', function() {
            that.modalPop(feature.properties);
          });
          layer.on('mouseover', function(){
            that.infoBox.update(feature.properties);
          });
          layer.on('mouseout', function(){
            that.infoBox.clear();
          })
        },
        pointToLayer: function(feature, latlng){
          var marker_opts = {
              color: '#fff',
              opacity: 0.8,
              fillColor: '#71b1d7',
              fillOpacity: 0.8,
              weight: 1,
              radius: 7
          }
          return L.circleMarker(latlng, marker_opts);
        }
      }).addTo(that.map);

      // Add results control
      that.results_div = L.control({position: 'topright'});
      that.results_div.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'resources-count');
        this._div.innerHTML = "";
        return this._div;
      };
      that.results_div.update = function (count){
        this._div.innerHTML = count + ' locations found';
      };
      that.results_div.addTo(that.map);

      that.clearSearch();
    }
    // Check query args, load and select if supplied for type
    if (that.convertToPlainString($.address.parameter('type')).length > 0) {
      that.typeSelections = that.convertToPlainString($.address.parameter('type')).split(',')
        .map(function(v) { return v.replace(/ /g, ''); })
        .filter(function (v) { return v.length > 0; });
      that.typeSelections.forEach(function(t) {
        $("input.filter-option[value='" + t + "']").prop("checked", true);
      });
    }
    that.doSearch();
  },

  // Load initial results from Google sheet, processing data. Only called once
  initialize: function() {
    var that = this;
    // Loading animation, removed when search header updated
    $("#search-header").html("<h4>Loading... <div class='spinner'></div></h4>");

    $.getJSON(ResourceLib.sheetUrl, function(data) {
      var rows = data.feed.entry;
      var properties = Object.keys(rows[0])
        .filter(function(p) { return p.startsWith("gsx$"); })
        .map(function(p) { return p.substr(4); });

      that.allResults = rows.map(function(r) {
        var row = {};
        properties.forEach(function (p) {
          if (CATEGORIES.indexOf(p) !== -1) {
            row[p] = r["gsx$" + p].$t === "Yes" ? true : false;
          }
          // Convert lat and lon to numbers
          else if (["lat", "lon"].indexOf(p) !== -1) {
            row[p] = +r["gsx$" + p].$t;
          }
          // Convert value to null if empty, otherwise return it
          else {
            row[p] = r["gsx$" + p].$t === "" ? null : r["gsx$" + p].$t;
          }
        });
        // Format website value if exists
        if (row.website !== null && !row.website.match(/^http/)) {
          row.website = "http://" + row.website;
        }
        row.icons = that.getIcons(row);
        row.flags = that.getFlags(row);
        return row;
      }).sort(that.sortByName);
      // Separate clerk results from the rest
      that.clerkResults = that.allResults.filter(function(r) { return r.clerks; });
      that.allResults = that.allResults.filter(function(r) { return !r.clerks; });
      that.results = that.allResults;
      that.setup();
    });
  },

  // Update filters to prepare for search
  updateFilters: function() {
    var that = this;
    that.clearSearch();
    that.radius = +$("#search-radius").val();
    that.address = $("#search-address").val();

    if (that.radius == null && that.address != "") {
      that.radius = 5;
    }
    that.typeSelections = [];
    document.querySelectorAll(".filter-option:checked").forEach(function(obj) {
      that.typeSelections.push(obj.value.toLowerCase());
    });
  },

  // Apply filters and update results and count
  filterResults: function() {
    var that = this;
    that.offset = 0;

    // Filter first based on location, then on categories
    if (that.currentLocation.length > 0) {
      var loc = {lat: that.currentLocation[0], lon: that.currentLocation[1]};
      that.showDistance = true;
      that.results = that.allResults.map(function(r) { 
        if (r.lat !== 0 && r.lon !== 0) { r.distance = haversine(loc, r); }
        return r;
      }).filter(function(r) {
        // Include results with null geography in location searches
        if (!r.distance) { return true; }
        return r.distance <= that.radius;
      }).sort(function (a, b) {
        if (a.distance < b.distance || !b.distance) return -1;
        if (a.distance > b.distance || !a.distance) return 1;
        return 0;
      });
    } else {
      that.showDistance = false;
      that.results = that.allResults.sort(that.sortByName);
    }
    // Apply category filters to already filtered results if filters selected
    if (that.typeSelections.length > 0) {
      var restrictions = [];
      var filters = [];
      that.typeSelections.forEach(function (t) {
        if (RESTRICTION_OPTIONS.indexOf(t) > -1) {
          restrictions.push(t);
        } else {
          filters.push(t);
        }
      });
      that.results = that.results.filter(function (r) {
        var passesRestrictions = true;
        var passesFilters = true;
        if (restrictions.length > 0) {
          passesRestrictions = restrictions.map(function (res) { return r[res]; })
            .some(function (v) { return !v; });
        }
        if (filters.length > 0) {
          passesFilters = filters.map(function (f) { return r[f]; })
            .some(function (v) { return v; });
        }
        return passesRestrictions && passesFilters;
      });
    }
    that.resultsCount = that.results.length;
    $.address.parameter('type', encodeURIComponent(that.typeSelections.join(",")));
  },

  sortByName: function(a, b) {
    var nameA = a.name.trim().toUpperCase();
    var nameB = b.name.trim().toUpperCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  },

  // Searches for address, then executes callback
  searchAddress: function(callback) {
    var that = this;
    if (that.address != "") {
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({ 'address': that.address }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          that.currentLocation = [results[0].geometry.location.lat(), results[0].geometry.location.lng()];
          // that.getClerk(results[0].address_components);
          $.address.parameter('address', encodeURIComponent(that.address));
          $.address.parameter('radius', that.radius);

          that.setZoom();
          that.addIcon();
          that.addCircle();
          callback();
        } else {
          alert("We could not find your address: " + status);
        }
      });
    } else {
      that.currentLocation = [];
      that.map.setView(new L.LatLng(that.center[0], that.center[1]), that.defaultZoom)
      callback();
    }
  },

  getClerk: function (addr) {
    var that = this;
    // Clear county clerk section, add if found
    $("#countyClerk").empty();
    for (var i = 0; i < addr.length; ++i) {
      if (addr[i].long_name.indexOf("County") !== -1) {
        var clerkStr = addr[i].long_name + " Clerk";
        break;
      }
    }
    var clerks = this.allResults.filter(function (r) { return r.name === clerkStr; });
    if (clerks.length > 0) {
      that.renderTemplate('#countyClerk-template', '#countyClerk', clerks[0]);
    }
  },

  // Run all search functions
  doSearch: function() {
    var that = this;
    that.updateFilters();
    this.searchAddress(function() {
      that.filterResults();
      that.renderMap();
      that.renderList();
    });
  },

  // Remove all filters, reload full list of resources
  clearFilters: function() {
    var that = this;
    // Clear type selections
    that.typeSelections.forEach(function (t) {
      $("input.filter-option[value='" + t + "']").prop("checked", false);
    });
    that.typeSelections = [];
    $("#search-address").val("");
    that.doSearch();
  },

  // MAP FUNCTIONS

  // Update map with current results
  renderMap: function () {
    var that = this;
    that.geojsonLayer.clearLayers();
    that.geojsonLayer.addData(that.results.map(that.makePointFeature));
    that.results_div.update(that.resultsCount);
  },

  setZoom: function () {
    var that = this;
    var zoom = '';
    if (that.radius >= 50) zoom = 9;
    else if (that.radius >= 25) zoom = 10;
    else if (that.radius >= 10) zoom = 11;
    else if (that.radius >= 5) zoom = 12;
    else if (that.radius >= 2) zoom = 13;
    else if (that.radius >= 1) zoom = 14;
    else if (that.radius >= 0.5) zoom = 15;
    else if (that.radius >= 0.25) zoom = 16;
    else zoom = 16;

    that.map.setView(new L.LatLng(that.currentLocation[0], that.currentLocation[1]), zoom);
  },

  addIcon: function () {
    var that = this;
    that.centerMark = new L.Marker(that.currentLocation, {
      icon: (new L.Icon({
        iconUrl: baseUrl + '/img/blue-pushpin.png',
        iconSize: [32, 32],
        iconAnchor: [10, 32]
      }))
    });

    that.centerMark.addTo(that.map);
  },

  addCircle: function () {
    var that = this;
    that.radiusCircle = new L.circle(that.currentLocation, {
      // Convert radius from miles to meters
      radius: that.radius * 1609.344
    },
      {
        fillColor: '#1d5492',
        fillOpacity: '0.2',
        stroke: false,
        clickable: false
      });

    that.radiusCircle.addTo(that.map);
  },

  // Remove map location search layers
  clearSearch: function () {
    var that = this;
    if (that.centerMark)
      that.map.removeLayer(that.centerMark);
    if (that.radiusCircle)
      that.map.removeLayer(that.radiusCircle);
  },

  findMe: function () {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        ResourceLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function (latLngPoint) {
    var that = this;
    geocoder.geocode({ 'latLng': latLngPoint }, function (results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search-address').val(results[1].formatted_address);
          $('.hint').focus();
          that.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  // Create GeoJSON point from result object
  makePointFeature: function (data) {
    return {
      "type": "Feature",
      "properties": data,
      "geometry": {
        "type": "Point",
        "coordinates": [data.lon, data.lat]
      }
    };
  },

  // LIST FUNCTIONS

  // Render list, updating with most recent results
  renderList: function () {
    var results = $('#results-list');
    results.empty();
    $("#prevButton").hide().off("click");
    $("#nextButton").hide().off("click");

    var that = this;
    var listOffset = that.offset;
    var pageResults = that.results.slice(listOffset, listOffset + that.pageSize);

    if (that.resultsCount == 0) {
      $("#search-header").html("<h4 class='no-results'>No results. Please broaden your search.</h4>");
      return;
    }

    that.createSearchHeader();

    that.renderTemplate('#results-list-template', '#results-list', {
      results: pageResults, showDistance: that.showDistance
    });

    if (listOffset > 0) {
      $("#prevButton").click(function () {
        that.pageUpdate(listOffset - that.pageSize);
      }).show();
    }
    if (listOffset + that.pageSize < that.resultsCount) {
      $("#nextButton").click(function () {
        that.pageUpdate(listOffset + that.pageSize);
      }).show();
    }
  },

  pageUpdate: function (offset) {
    this.offset = offset;
    this.renderList();
  },

  createSearchHeader: function () {
    var that = this;
    var resultObj = { count: that.resultsCount };
    var radiusMap = {
      0.25: "2 blocks",
      0.5: "1/2 mile",
      1: "1 mile",
      2: "2 miles",
      5: "5 miles",
      10: "10 miles",
      25: "25 miles",
      50: "50 miles"
    };

    var address = $("#search-address").val();
    if (address != "") {
      resultObj.location = {
        address: address.split(",").slice(0, 2).join(", "),
        distance: radiusMap[that.radius]
      }
    }
    var catSelections = $.map($('.filter-option.category:checked, .filter-option.who:checked'), function (obj, i) {
      return that.formatText(obj.value);
    });
    var resSelections = $.map($('.filter-option.restriction:checked').parent(), function (obj, i) {
      return $.trim(obj.textContent).toLowerCase() || $.trim(obj.innerText).toLowerCase();
    });
    resultObj.categories = catSelections.length ? catSelections.join(", ") : false;
    resultObj.restrictions = resSelections.length ? resSelections.join(", ") : false;
    resultObj.page = (this.offset / 20) + 1;
    resultObj.totalPages = Math.ceil(this.resultsCount / 20);

    that.renderTemplate('#search-header-template', '#search-header', resultObj);
  },

  // UTILITY FUNCTIONS

  modalPop: function(data) {
    var that = this;
    data.showDistance = that.showDistance;
    if (data.website != null) {
      data.url =  data.website;
    }

    that.renderTemplate('#modal-pop-template', '#modal-pop', data);

    $.address.parameter('modal_id', data.id);
    $("#post-shortlink").val(location.href);

    $('#modal-pop').modal();
  },

  // Convenience method for rendering a Handlebars template from data
  renderTemplate: function(templateId, elementId, data) {
    var source = $(templateId).html();
    var template = Handlebars.compile(source);
    var result = template(data);
    $(elementId).html(result);
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
    return decodeURIComponent(text);
  },

  formatText: function(text) {
    // Format text with acronyms.
    if (text in LABEL_MAP) {
      var capitalText = LABEL_MAP[text]
    }
    else {
      var capitalText = text.charAt(0).toUpperCase() + text.slice(1);
    }
    return capitalText.replace(/_/g, ' ');
  },

  getIcons: function(obj) {
    var iconArr = [];
    $.each(FACILITY_TYPE_OPTIONS.concat(WHO_OPTIONS), function( index, cat ) {
      if (obj[cat] == true) {
        if (ICON_MAP.hasOwnProperty(cat)) {
          iconArr.push(ICON_MAP[cat]);
        }
      }
    });
    return iconArr;
  },

  getFlags: function(obj) {
    var flagArr = [];
    $.each(FLAG_OPTIONS, function( index, flag ) {
      if (obj[flag] == true) {
        var flagObj = {flag: ResourceLib.formatText(flag)};
        if (ICON_MAP.hasOwnProperty(flag)) {
          flagObj.icon = ICON_MAP[flag];
        }
        flagArr.push(flagObj);
      }
    });
    return flagArr;
  }
}
