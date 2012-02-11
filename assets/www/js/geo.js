window.geo = function() {

	function showNearbyArticles( args ) {
		var args = $.extend(
			{
				lat: 0,
				lon: 0,
				current: true
			},
			args
		);
		
		chrome.hideOverlays();
		chrome.hideContent();
		$("#nearby-overlay").localize().show();
		chrome.doFocusHack();
		
		if (!geo.map) {
			geo.map = new L.Map('map');
			var tiles = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 18,
				attribution: 'Map data &copy; 2011 OpenStreetMap contributors'
			});
			geo.map.addLayer(tiles);
		}

		// @fixme load last-seen coordinates
		geo.map.setView(new L.LatLng(args.lat, args.lon), 13);
		
		var findAndDisplayNearby = function( lat, lon ) {
			geoLookup( lat, lon, preferencesDB.get("language"), function( data ) {
				geoAddMarkers( data );
			}, function(err) {
				console.log(JSON.stringify(err));
			});
		};
		
		var ping = function() {
			var pos = geo.map.getCenter();
			findAndDisplayNearby( pos.lat, pos.lng );
		};
		
		if ( args.current ) {
			geo.map.on('viewreset', ping);
			geo.map.on('locationfound', ping);
			geo.map.on('moveend', ping);
			geo.map.locateAndSetView(13);
		}
		else {
			findAndDisplayNearby( args.lat, args.lon );
		}
	}
	
	function getFloatFromDMS( dms ) {
		var multiplier = /[sw]/i.test( dms ) ? -1 : 1;
		var bits = dms.match(/[\d.]+/g);

		var coord = 0;
		
		for ( var i = 0, iLen=bits.length; i<iLen; i++ ) {
			coord += bits[i] / multiplier;
			multiplier *= 60;
		}
		
		return coord;
	}
	
	function addShowNearbyLinks() {
		$( 'span.geo-dms' ).each( function() { 
			var $coords = $( this ),
			lat = $coords.find( 'span.latitude' ).text(),
			lon = $coords.find( 'span.longitude' ).text();
			
			$coords.closest( 'a' ).attr( 'href', '#' ).click( function() {
				showNearbyArticles( {
					'lat': getFloatFromDMS( lat ),
					'lon': getFloatFromDMS( lon ),
					'current': false,
				} );				
			} );
		} );
	}
	
	function geoLookup(latitude, longitude, lang, success, error) {
		var requestUrl = "http://ws.geonames.net/findNearbyWikipediaJSON?formatted=true&";
		requestUrl += "lat=" + latitude + "&";
		requestUrl += "lng=" + longitude + "&";
		requestUrl += "username=wikimedia&";
		requestUrl += "lang=" + lang;
		$.ajax({
			url: requestUrl,
			success: function(data) {
				success(data);
			},
			error: error
		});
	}
	
	function geoAddMarkers( data ) {
		if (geo.markers) {
			geo.map.removeLayer(geo.markers);
		}
		geo.markers = new L.LayerGroup();
		var zoomLevel = geo.map.getZoom();
		//console.log("Zoom level =" + zoomLevel);
		$.each(data.geonames, function(i, item) {
			var url = item.wikipediaUrl.replace(/^([a-z0-9-]+)\.wikipedia\.org/, 'https://$1.m.wikipedia.org');
			var marker = new L.Marker(new L.LatLng(item.lat, item.lng));
			geo.markers.addLayer(marker);
			marker.bindPopup('<div onclick="app.navigateToPage(&quot;' + url + '&quot;);hideOverlays();">' +
			                 '<strong>' + item.title + '</strong>' +
			                 '<p>' + item.summary + '</p>' +
			                 '</div>');
		   		   
		   // @manishh - return results as per zoom level, bug # 31891
		   // https://bugzilla.wikimedia.org/show_bug.cgi?id=31891
		   //console.log(i + " - " + item.lng);  
		   if(0 == i && zoomLevel <= 4){
		   		return false;
		   }else if(1 == i && zoomLevel > 4 && zoomLevel <= 8){ 
				return false;		   	
		   }else if(2 == i && zoomLevel > 8 && zoomLevel <= 12){ 
				return false;		   	
		   }else if(3 == i && zoomLevel > 12 && zoomLevel <= 14){ 
				return false;		   	
		   } 			                 
		});
		geo.map.addLayer(geo.markers);
	}
	
	return {
		showNearbyArticles: showNearbyArticles,
		addShowNearbyLinks: addShowNearbyLinks,
		markers: null,
		map: null
	};

}();
