function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 38, lng: -106 }, // Default center
    zoom: 1, // Default zoom
     streetViewControl: false, // Disable Pegman
      streetView: null, // Disable Street View feature entirely
  });
  console.log(map.get('streetViewControl'));
  const input = document.getElementById("pac-input");
  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["place_id", "geometry", "formatted_address", "name"],
  });

  autocomplete.bindTo("bounds", map);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  let infoWindow = new google.maps.InfoWindow();
  const infowindow = new google.maps.InfoWindow();
  const infowindowContent = document.getElementById("infowindow-content");
  infowindow.setContent(infowindowContent);

  const marker = new google.maps.Marker({ map: map });

  // Create a custom button to request geolocation
  const locationButton = document.createElement("button");
  locationButton.textContent = "Pan to Current Location";
  locationButton.classList.add("custom-map-control-button");
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);

  locationButton.addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          infoWindow.setPosition(pos);
          infoWindow.setContent("Location found.");
          infoWindow.open(map);
          map.setCenter(pos);
          map.setZoom(14); // Zoom in to the user's location
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      // Browser doesn't support geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
  });

  // Error handling function
  function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
      browserHasGeolocation
        ? "Error: The Geolocation service failed."
        : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
  }

  // Handle clicks on the map for unmarked locations
  map.addListener("click", (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    // Update form fields for latitude and longitude
    document.getElementById("latitude").value = lat.toFixed(6);
    document.getElementById("longitude").value = lng.toFixed(6);

    // Set the marker at the clicked position
    marker.setPosition(event.latLng);
    marker.setVisible(true);

    // Clear Place ID since it's a custom location
    document.getElementById("placeID").value = "";
    infowindow.close();
  });

  // Handle place selection via autocomplete
  autocomplete.addListener("place_changed", () => {
    infowindow.close();

    const place = autocomplete.getPlace();

    if (!place.geometry || !place.geometry.location) {
      return;
    }

    // Center map on the selected place
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }

    // Set the marker for the selected place
    marker.setPlace({
      placeId: place.place_id,
      location: place.geometry.location,
    });
    marker.setVisible(true);

    // Update form fields with place information
    document.getElementById("placeID").value = place.place_id;
    document.getElementById("latitude").value = place.geometry.location.lat().toFixed(6);
    document.getElementById("longitude").value = place.geometry.location.lng().toFixed(6);

    // Display info window with place details
    infowindowContent.children.namedItem("place-name").textContent = place.name;
    infowindowContent.children.namedItem("place-id").textContent = place.place_id;
    infowindowContent.children.namedItem("place-address").textContent = place.formatted_address;
    infowindow.open(map, marker);
  });
}

window.initMap = initMap;
