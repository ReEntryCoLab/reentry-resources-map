// Based on https://gist.github.com/SimonJThompson/c9d01f0feeb95b18c7b0
function toRad(v) { return v * Math.PI / 180; }
function kmToMiles(km) { return (km * 0.62137).toFixed(2); }

// Points are objects with the properties lat and lon
function haversine(p1, p2) {
    var R = 6371; // km 
    var x1 = p2.lat - p1.lat;
    var dLat = toRad(x1);
    var x2 = p2.lon - p1.lon;
    var dLon = toRad(x2);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return +kmToMiles(d);
}
