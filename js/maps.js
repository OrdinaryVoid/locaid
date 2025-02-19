document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
});

const darkModeStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

/** Hides a DOM element and optionally focuses on focusEl. */
function hideElement(el, focusEl) {
  el.style.display = 'none';
  if (focusEl) focusEl.focus();
}



/** Shows a DOM element that has been hidden and optionally focuses on focusEl. */
function showElement(el, focusEl) {
  el.style.display = 'block';
  if (focusEl) focusEl.focus();
}

/** Determines if a DOM element contains content that cannot be scrolled into view. */
function hasHiddenContent(el) {
  const noscroll = window.getComputedStyle(el).overflowY.includes('hidden');
  return noscroll && el.scrollHeight > el.clientHeight;
}

/** Format a Place Type string by capitalizing and replacing underscores with spaces. */
function formatPlaceType(str) {
  const capitalized = str.charAt(0).toUpperCase() + str.slice(1);
  return capitalized.replace(/_/g, ' ');
}

/** Initializes an array of zeros with the given size. */
function initArray(arraySize) {
  const array = [];
  while (array.length < arraySize) {
    array.push(0);
  }
  return array;
}

/** Assigns star icons to an object given its rating (out of 5). */
function addStarIcons(obj) {
  if (!obj.rating) return;
  const starsOutOfTen = Math.round(2 * obj.rating);
  const fullStars = Math.floor(starsOutOfTen / 2);
  const halfStars = fullStars !== starsOutOfTen / 2 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStars;

  // Express stars as arrays to make iterating in Handlebars easy.
  obj.fullStarIcons = initArray(fullStars);
  obj.halfStarIcons = initArray(halfStars);
  obj.emptyStarIcons = initArray(emptyStars);
}

/**
 * Constructs an array of opening hours by day from a PlaceOpeningHours object,
 * where adjacent days of week with the same hours are collapsed into one element.
 */
function parseDaysHours(openingHours) {
  const daysHours = openingHours.weekday_text.map((e) => e.split(/\:\s+/))
            .map((e) => ({'days': e[0].substr(0, 3), 'hours': e[1]}));

  for (let i = 1; i < daysHours.length; i++) {
    if (daysHours[i - 1].hours === daysHours[i].hours) {
      if (daysHours[i - 1].days.indexOf('-') !== -1) {
        daysHours[i - 1].days =
            daysHours[i - 1].days.replace(/\w+$/, daysHours[i].days);
      } else {
        daysHours[i - 1].days += ' - ' + daysHours[i].days;
      }
      daysHours.splice(i--, 1);
    }
  }
  return daysHours;
}

/** Number of POIs to show on widget load. */
const ND_NUM_PLACES_INITIAL = 5;

/** Number of additional POIs to show when 'Show More' button is clicked. */
const ND_NUM_PLACES_SHOW_MORE = 5;

/** Maximum number of place photos to show on the details panel. */
const ND_NUM_PLACE_PHOTOS_MAX = 6;

/** Minimum zoom level at which the default map POI pins will be shown. */
const ND_DEFAULT_POI_MIN_ZOOM = 9;

/** Mapping of Place Types to Material Icons used to render custom map markers. */
const ND_MARKER_ICONS_BY_TYPE = {
  // Full list of icons can be found at https://fonts.google.com/icons
  '_default': 'circle',
  'restaurant': 'restaurant',
  'cafe': 'local_cafe',
  'museum': 'museum',
};

/**
 * Defines an instance of the Neighborhood Discovery widget, to be
 * instantiated when the Maps library is loaded.
 */
function NeighborhoodDiscovery(configuration) {
  const widget = this;
  const widgetEl = document.querySelector('.neighborhood-discovery');

  widget.center = configuration.mapOptions.center;
  widget.places = configuration.pois || [];
  widget.placeMarkers = [];

  // Initialize core functionalities -------------------------------------

  initializeMap();
  
  initializePlaceDetails();
  initializeSidePanel();
  initializeFilter();
  // Initialize additional capabilities ----------------------------------

  initializeSearchInput();

  // Initializer function definitions ------------------------------------

  /** Initializes the interactive map and adds place markers. */
  function initializeMap() {
    const mapOptions = configuration.mapOptions;
    const filterButton = document.getElementById("filterButton");
    widget.mapBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(-30, -180), // Bottom-left corner (Southwest)
      new google.maps.LatLng(65, 180)    // Northeast corner of bounds (lat, lng)
    );
    mapOptions.restriction = {latLngBounds: widget.mapBounds};
    mapOptions.mapTypeControlOptions = {position: google.maps.ControlPosition.TOP_RIGHT};
    widget.map = new google.maps.Map(widgetEl.querySelector('.map'), mapOptions);
   
    widget.map.fitBounds(widget.mapBounds, 0);
    widget.map.controls[google.maps.ControlPosition.TOP_LEFT].push(filterButton);
    widget.map.addListener('click', (e) => {
      // Check if user clicks on a POI pin from the base map.
      if (e.placeId) {
        e.stop();
        widget.selectPlaceById(e.placeId);
      }
    });
    widget.map.addListener('zoom_changed', () => {
      // Customize map styling to show/hide default POI pins or text based on zoom level.
      const hideDefaultPoiPins = widget.map.getZoom() < ND_DEFAULT_POI_MIN_ZOOM;
      widget.map.setOptions({
      });
    });
    
    const markerPath = widgetEl.querySelector('.marker-pin path').getAttribute('d');
    const drawMarker = function(title, position, fillColor, strokeColor, labelText) {
      // Ensure labelText is a string
      const validLabelText = labelText && typeof labelText === 'string' ? labelText : '';
      const validStrokeColor = typeof strokeColor === 'string' ? strokeColor : '#000000';  // Default to black if invalid
    
      const marker = new google.maps.Marker({
          title: title,
          position: position,
          map: widget.map,
          icon: {
              path: markerPath,
              fillColor: fillColor,
              fillOpacity: 1,
              strokeColor: validStrokeColor,
              anchor: new google.maps.Point(13, 35),
              labelOrigin: new google.maps.Point(13, 13),
          },
          label: {
              text: validLabelText,  // Ensure it's a valid string
              color: 'white',
              fontSize: '16px',
              fontFamily: 'Material Icons',
          },
      });
  
      // Make sure placeId is accessible when updating markers// Explicitly store the placeId in the marker
  
      return marker;
    };
  
    // Add marker for the specified Place object.
    widget.addPlaceMarker = function(place) {
      place.marker = drawMarker(place.name, place.coords, '#EA4335', '#C5221F', place.icon);
      place.marker.addListener('click', () => void widget.selectPlaceById(place.placeId));
      place.marker.placeType = place.type || "Unknown type"; // Add placeType for filtering
      widget.placeMarkers.push(place.marker); // Add marker to the list
    };

    // Fit map to bounds that contain all markers of the specified Place objects.
    widget.updateBounds = function(places) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(widget.center);
      for (let place of places) {
        bounds.extend(place.marker.getPosition());
      }
      widget.map.fitBounds(bounds, /* padding= */ 100);
    };

    // Marker used to highlight a place from Autocomplete search.
    widget.selectedPlaceMarker = new google.maps.Marker({title: 'Point of Interest'});
  }
  const savedTheme = localStorage.getItem('theme') || 'light';
  const isDarkMode = savedTheme === 'dark';
  if (isDarkMode) {
      widget.map.setOptions({ styles: darkModeStyles });  // Apply dark mode styles
  }
  addCustomMarkers();
  /** Initializes Place Details service for the widget. */
  function initializePlaceDetails() {
    const detailsService = new google.maps.places.PlacesService(widget.map);
    const placeIdsToDetails = new Map();  // Create object to hold Place results.

    for (let place of widget.places) {
        placeIdsToDetails.set(place.placeId, place);
        place.fetchedFields = new Set(['place_id']);
    }

    widget.fetchPlaceDetails = function(placeId, fields, callback) {
        if (!placeId || !fields) return;

        // Check for field existence in Place object.
        let place = placeIdsToDetails.get(placeId);
        if (!place) {
            place = {placeId: placeId, fetchedFields: new Set(['place_id'])};
            placeIdsToDetails.set(placeId, place);
        }
        const missingFields = fields.filter((field) => !place.fetchedFields.has(field));
        if (missingFields.length === 0) {
            callback(place);
            return;
        }

        const request = {placeId: placeId, fields: missingFields};
        let retryCount = 0;
        const processResult = function(result, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK) {
                // If query limit has been reached, wait before making another call;
                // Increase wait time of each successive retry with exponential backoff
                // and terminate after five failed attempts.
                if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT &&
                    retryCount < 5) {
                    const delay = (Math.pow(2, retryCount) + Math.random()) * 500;
                    setTimeout(() => void detailsService.getDetails(request, processResult), delay);
                    retryCount++;
                }
                return;
            }

            // Basic details.
            if (result.name) place.name = result.name || "Unknown Place";  
          
            if (result.geometry) place.coords = result.geometry.location;
            
            if (result.formatted_address) place.address = result.formatted_address || "Unknown Place";
            if (result.photos) {
                place.photos = result.photos.map((photo) => ({
                    urlSmall: photo.getUrl({maxWidth: 200, maxHeight: 200}),
                    urlLarge: photo.getUrl({maxWidth: 1200, maxHeight: 1200}),
                    attrs: photo.html_attributions,
                })).slice(0, ND_NUM_PLACE_PHOTOS_MAX);
            }
            if (result.types) {
              database.ref('locations/places').once('value', (snapshot) => {
                  const data = snapshot.val();
                  if (data) {
                      Object.entries(data).forEach(([id, details]) => {
                          // Check if placeId matches and status is 'approved'
                          if (details.placeID === placeId && details.status === 'approved') {
                              place.type = details.type || "Unknown type"; // Get type from Firebase
                              place.icon = ND_MARKER_ICONS_BY_TYPE[place.type] || ND_MARKER_ICONS_BY_TYPE['_default'];
                          }
                      });
                  } else {
                      console.log("No places found in the database.");
                  }
               
              });
           }
          
            if (result.url) place.url = result.url;

            // Filter out the place if its type is "food"
         

            // Contact details.
            if (result.website) {
                place.website = result.website;
                const url = new URL(place.website);
                place.websiteDomain = url.hostname;
            }
            if (result.formatted_phone_number) place.phoneNumber = result.formatted_phone_number;
            if (result.opening_hours) place.openingHours = parseDaysHours(result.opening_hours);

            // Review details.
            if (result.rating) {
                place.rating = result.rating;
                addStarIcons(place);
            }
            if (result.user_ratings_total) place.numReviews = result.user_ratings_total;
            if (result.price_level) {
                place.priceLevel = result.price_level;
                place.dollarSigns = initArray(result.price_level);
            }
            if (result.reviews) {
                place.reviews = result.reviews;
                for (let review of place.reviews) {
                    addStarIcons(review);
                }
            }

            for (let field of missingFields) {
                place.fetchedFields.add(field);
            }
            callback(place);
        };

        // Use result from Place Autocomplete if available.
        if (widget.placeIdsToAutocompleteResults) {
            const autoCompleteResult = widget.placeIdsToAutocompleteResults.get(placeId);
            if (autoCompleteResult) {
                processResult(autoCompleteResult, google.maps.places.PlacesServiceStatus.OK);
                return;
            }
        }
        detailsService.getDetails(request, processResult);
    };
  }
  let infoWindow = new google.maps.InfoWindow();
  const locationButton = document.getElementById("locationButton");

  widget.map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);

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
          infoWindow.open(widget.map);
          widget.map.setCenter(pos);
          widget.map.setZoom(14); // Zoom in to the user's location
        },
        () => {
          handleLocationError(true, infoWindow, widget.map.getCenter());
        },
      );
    } else {
      // Browser doesn't support geolocation
      handleLocationError(false, infoWindow, widget.map.getCenter());
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
    infoWindow.open(widget.map);
  }
  const favoritesKey = "favoritePlaces"; // Define a single key for localStorage

  function getFavorites() {
    return JSON.parse(localStorage.getItem(favoritesKey)) || [];
  }

  // Check if a place is a favorite
  function isFavorite(placeId) {
    const favorites = getFavorites();
    console.log("Checking if place is favorite:", placeId, favorites);
    return favorites.some((fav) => fav.placeId === placeId);
  }

  function setFavoriteButtonState(buttonElement, placeId) {
    const isFav = isFavorite(placeId);
    console.log("Setting favorite button state for:", placeId, "isFavorite:", isFav);
    buttonElement.textContent = isFav ? "★" : "☆";
  }
  function toggleFavorite(placeDetails) {
    const favoritesKey = 'favoritePlaces'; // Key for localStorage
    const favorites = JSON.parse(localStorage.getItem(favoritesKey)) || [];
  
    const existingIndex = favorites.findIndex((fav) => fav.placeId === placeDetails.placeId);
  
    if (existingIndex !== -1) {
      // Remove from favorites if already present
      console.log("Removing from favorites:", placeDetails.placeId);
      favorites.splice(existingIndex, 1);
      localStorage.setItem(favoritesKey, JSON.stringify(favorites));
      console.log("Updated favorites after removal:", favorites);
      return;
    }
  
    // Fetch detailed place information
    widget.fetchPlaceDetails(placeDetails.placeId, ['name', 'formatted_address', 'types'], (fetchedPlace) => {
      // Once place details are fetched, add them to favorites
      if (!fetchedPlace) {
        console.log('Place details not found or failed to fetch');
        return;
      }
  
      console.log('Fetched place details:', fetchedPlace);
  
      // Remove circular references and irrelevant data before saving
      const { coords, marker, photos, ...placeWithoutCircularRefs } = fetchedPlace;
  
      // Now you can add the place details to favorites without circular references or photos
      favorites.push(placeWithoutCircularRefs);
      console.log('Fetched place without ciruclar details:', placeWithoutCircularRefs);
      // Save updated favorites to localStorage
      localStorage.setItem(favoritesKey, JSON.stringify(favorites));
      console.log("Updated favorites after addition:", favorites);
    });
  }
  
  /** Initializes the side panel that holds curated POI results. */
  function initializeSidePanel() {
    const placesPanelEl = widgetEl.querySelector('.places-panel');
    const favoriteButton = widgetEl.querySelector('.mapfavorite-btn');
    const reportBtn = widgetEl.querySelector('.report-btn');
    const detailsPanelEl = widgetEl.querySelector('.details-panel');
    const placeResultsEl = widgetEl.querySelector('.place-results-list');
    const showMoreButtonEl = widgetEl.querySelector('.show-more-button');
    const photoModalEl = widgetEl.querySelector('.photo-modal');
    const detailsTemplate = Handlebars.compile(
        document.getElementById('nd-place-details-tmpl').innerHTML);
    const resultsTemplate = Handlebars.compile(
        document.getElementById('nd-place-results-tmpl').innerHTML);

    // Show specified POI photo in a modal.
    const showPhotoModal = function(photo, placeName) {
        const prevFocusEl = document.activeElement;
        const imgEl = photoModalEl.querySelector('img');
        imgEl.src = photo.urlLarge;
        const backButtonEl = photoModalEl.querySelector('.back-button');
        backButtonEl.addEventListener('click', () => {
            hideElement(photoModalEl, prevFocusEl);
            imgEl.src = '';
        });
        photoModalEl.querySelector('.photo-place').innerHTML = placeName;
        photoModalEl.querySelector('.photo-attrs span').innerHTML = photo.attrs;
        const attributionEl = photoModalEl.querySelector('.photo-attrs a');
        if (attributionEl) attributionEl.setAttribute('target', '_blank');
        photoModalEl.addEventListener('click', (e) => {
            if (e.target === photoModalEl) {
                hideElement(photoModalEl, prevFocusEl);
                imgEl.src = '';
            }
        });
        showElement(photoModalEl, backButtonEl);
    };

    // Select a place by id and show details.
    let selectedPlaceId;
    widget.selectPlaceById = function(placeId, panToMarker) {
        if (selectedPlaceId === placeId) return;
        selectedPlaceId = placeId;
        const prevFocusEl = document.activeElement;

        const showDetailsPanel = function(place) {
            detailsPanelEl.innerHTML = detailsTemplate(place);
            favoriteButton.textContent = isFavorite(place.placeId) ? '★' : '☆'; // Star for favorite
            favoriteButton.classList.add('mapfavorite-btn');
            setFavoriteButtonState(favoriteButton, place.placeId);
            // Attach click event to toggle favorite
            favoriteButton.onclick = () => {
                console.log(`Favorite button clicked for: ${place.placeId}`);
                toggleFavorite(place);
                console.log("Updated favorites:", getFavorites());
                setFavoriteButtonState(favoriteButton, place.placeId);
            };

            reportBtn.onclick = () => {
                localStorage.removeItem('reportTitle');
                localStorage.removeItem('reportType');
                localStorage.setItem('reportTitle', place.name);
                localStorage.setItem('reportType', 'place');
            };
            detailsPanelEl.appendChild(reportBtn);
            // Append Favorite Button to Details Panel
            detailsPanelEl.appendChild(favoriteButton);
            const backButtonEl = detailsPanelEl.querySelector('.back-button');
            backButtonEl.addEventListener('click', () => {
                hideElement(detailsPanelEl, prevFocusEl);
                selectedPlaceId = undefined;
                widget.selectedPlaceMarker.setMap(null);
            });
            detailsPanelEl.querySelectorAll('.photo').forEach((photoEl, i) => {
                photoEl.addEventListener('click', () => {
                    showPhotoModal(place.photos[i], place.name);
                });
            });
            showElement(detailsPanelEl, backButtonEl);
            detailsPanelEl.scrollTop = 0;
        };

        const processResult = function(place) {
            if (place.marker) {
                widget.selectedPlaceMarker.setMap(null);
            } else {
                widget.selectedPlaceMarker.setPosition(place.coords);
                widget.selectedPlaceMarker.setMap(widget.map);
            }
            if (panToMarker) {
                widget.map.panTo(place.coords);
            }
            showDetailsPanel(place);
        };

        widget.fetchPlaceDetails(placeId, [
            'name', 'types', 'geometry.location', 'formatted_address', 'photo', 'url',
            'website', 'formatted_phone_number', 'opening_hours',
            'rating', 'user_ratings_total', 'price_level', 'review',
        ], processResult);
    };

    // Render the specified place objects and append them to the POI list.
    window.renderPlaceResults = function(places, startIndex) {
      // Clear existing results completely
      placeResultsEl.innerHTML = '';  // This ensures that all previous content is removed
  
      // Render the new places
      placeResultsEl.insertAdjacentHTML('beforeend', resultsTemplate({places: places}));
  
      placeResultsEl.querySelectorAll('.place-result').forEach((resultEl, i) => {
          const place = places[i];
          if (!place) return;
  
          // Add event listeners for interactions
          resultEl.addEventListener('click', () => {
              widget.selectPlaceById(place.placeId, true);
          });
  
          resultEl.querySelector('.name').addEventListener('click', (e) => {
              widget.selectPlaceById(place.placeId, true);
              e.stopPropagation();  // Prevent bubbling up to the parent click event
          });
  
          resultEl.querySelector('.photo').addEventListener('click', (e) => {
              showPhotoModal(place.photos[0], place.name);
              e.stopPropagation();  // Prevent bubbling up to the parent click event
          });
  
          // Add place marker to the map
          widget.addPlaceMarker(place);
      });
    };
  


    // Example log of initialized state
    console.log("Side panel initialized");
      
      
    // Index of next Place object to show in the POI list.
    let nextPlaceIndex = 0;

    // Fetch and show basic info for the next N places.
    const showNextPlaces = function(n) {
      const nextPlaces = widget.places.slice(nextPlaceIndex, nextPlaceIndex + n);
      if (nextPlaces.length < 1) {
        hideElement(showMoreButtonEl);
        return;
      }
      showMoreButtonEl.disabled = true;
      // Keep track of the number of Places calls that have not finished.
      let count = nextPlaces.length;
      for (let place of nextPlaces) {
        const processResult = function(place) {
          count--;
          if (count > 0) return;
          renderPlaceResults(nextPlaces, nextPlaceIndex);
          nextPlaceIndex += n;
          widget.updateBounds(widget.places.slice(0, nextPlaceIndex));
          const hasMorePlacesToShow = nextPlaceIndex < widget.places.length;
          if (hasMorePlacesToShow || hasHiddenContent(placesPanelEl)) {
            showElement(showMoreButtonEl);
            showMoreButtonEl.disabled = false;
          } else {
            hideElement(showMoreButtonEl);
          }
        };
        widget.fetchPlaceDetails(place.placeId, [
          'name', 'types', 'geometry.location',
          'photo',
          'rating', 'user_ratings_total', 'price_level',
        ], processResult);
      }
    };
    showNextPlaces(ND_NUM_PLACES_INITIAL);

    showMoreButtonEl.addEventListener('click', () => {
      placesPanelEl.classList.remove('no-scroll');
      showMoreButtonEl.classList.remove('sticky');
      showNextPlaces(ND_NUM_PLACES_SHOW_MORE);
    });
  }
  function addCustomMarkers(){
    const customMarkers = [];
  locations.forEach((location, index) => {
        customMarkers.push({
            position: { lat: location.lat, lng: location.lng },
            title: `Water Fountain`, // Optional: Add a unique title
            iconUrl: "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png", // Example icon URL
        });
    });

  // Loop to add custom markers
  customMarkers.forEach((markerData) => {
    const marker = new google.maps.Marker({
      position: markerData.position,
      map: widget.map,
      title: markerData.title,
      icon: {
        url: markerData.iconUrl, // Custom marker image URL
        scaledSize: new google.maps.Size(32, 32), // Set size of the icon
      },
    });
    marker.placeType = 'water_fountain'; // Custom place type
    widget.placeMarkers.push(marker); // Add to placeMarkers array
  });
  
  }
  function initializeFilter() {
    const typeSelect = document.getElementById("type-select");
    const distanceButton = document.getElementById("distance-select");
    
    // Event listener for type select
    typeSelect.addEventListener("change", () => {
      const selectedType = typeSelect.value;
        // Show all types if 'All Types' is selected
      if (selectedType === "allType") {
        console.log("All Types selected. Showing all markers.");
        filterMarkers([]); // Show all markers
        filterPlacesByType([]); // Show all places
      } else if  (selectedType === "openNow") {
        filterPlacesByOpenNow(); // Filter places that are open now
      }else {
        filterMarkers([selectedType]); // Filter markers by selected type
        filterPlacesByType([selectedType]); // Filter places by selected type
      }
    });
    
    // Event listener for distance select
    distanceButton.addEventListener("change", async () => {
      placehandleDistanceChange(distanceButton);
      handleDistanceChange(distanceButton);
    });
  }    
    
    function handleDistanceChange(distanceButton) {
      const selectedDistance = parseInt(distanceButton.value);  // Get selected distance (in miles)
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
    
            // Loop through all markers to check if they are within the selected distance
            widget.placeMarkers.forEach((marker) => {
              const markerPosition = marker.getPosition();
    
              // Calculate distance between user location and marker position
              const distanceToPlace = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(userLocation.lat, userLocation.lng),
                markerPosition
              );
             
              if (distanceToPlace <= selectedDistance * 1609.34) { // Convert miles to meters
                marker.setMap(widget.map); // Show marker if it's within the distance
              } else {
                marker.setMap(null); // Hide marker if it's out of range
              }
            });
          },
          () => {
            handleLocationError(true, infoWindow, widget.map.getCenter());
          }
        );
      }
    }    
    function placehandleDistanceChange(distanceButton) {
      const selectedDistance = parseInt(distanceButton.value);  // Get selected distance in miles
    
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
    
            // Initialize the array for places that are within the distance
            const openNowPlaces = [];
    
            // Loop through all places to check if they are within the selected distance from the user
            widget.places.forEach((place) => {
              const placePosition = place.coords;
    
              // Calculate the distance between the user location and the place's coordinates
              const distance = google.maps.geometry.spherical.computeDistanceBetween(userLocation, placePosition);
    
    
              // If the place is within the selected distance, add it to the list of openNowPlaces
              if (distance <= selectedDistance * 1609.34) {  // Convert miles to meters
                console.log(("yes"))
                openNowPlaces.push(place); // Add place to the list if it's within the distance
              }

            });
    
            // Render the filtered places based on distance
            renderPlaceResults(openNowPlaces, 0);
    
          },
          () => {
            handleLocationError(true, infoWindow, widget.map.getCenter());
          }
        );
      }
    }
    
    function calculateDistance(start, end) {
      const R = 3958.8; // Radius of the Earth in miles
      const lat1 = start.lat * (Math.PI / 180); // Convert degrees to radians
      const lon1 = start.lng * (Math.PI / 180);
      const lat2 = end.lat() * (Math.PI / 180);
      const lon2 = end.lng() * (Math.PI / 180);
  
      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;
      
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // Distance in miles
  
      return distance;
    }
    
    function filterPlacesByOpenNow() {
     
  
      const currentDate = new Date();
      const currentDay = currentDate.getDay();
      const currentTime = currentDate.getHours() * 100 + currentDate.getMinutes();

      const openNowPlaces = [];
      
      widget.places.forEach((place) => {
          const placeId = place.placeId;
          const request = { placeId: placeId, fields: ["name", "opening_hours"] };
          const detailsService = new google.maps.places.PlacesService(widget.map);
  
          detailsService.getDetails(request, (result, status) => processResult(place, result, status));
      });
  
      function processResult(place, result, status) {
          if (status !== google.maps.places.PlacesServiceStatus.OK) {
              console.log(`Error retrieving details for ${place.name || "Unknown Place"}: ${status}`);
              return;
          }
  
          const openingHours = result.opening_hours;
          if (!openingHours || !openingHours.weekday_text) {
              console.log(`${result.name || "Unknown Place"} does not have valid opening hours.`);
              return;
          }
  
          const parsedHours = sparseDaysHours(openingHours);
          const daySchedule = parsedHours[currentDay];
  
          console.log(`Place: ${result.name || "Unknown Location"}, Opening Hours for Today: ${daySchedule ? daySchedule.hours : 'N/A'}`);
  
          if (!daySchedule) {
              console.log(`${result.name || "Unknown Location"} has no opening hours for today.`);
              return;
          }
  
          if (daySchedule.hours.toLowerCase().includes("open 24 hours")) {
              console.log(`${result.name || "Unknown Location"} is open 24 hours!`);
              openNowPlaces.push(place);
              renderPlaceResults(openNowPlaces, 0);
              updateMarkers(place, true);
              return;
          }
  
          if (daySchedule.hours.toLowerCase().includes("closed")) {
              console.log(`${result.name || "Unknown Location"} is closed for today.`);
              updateMarkers(place, false);
              return;
          }
  
          // Normalize time format (fix Unicode issues)
          const cleanedTimeRange = daySchedule.hours
              .replace(/\u2013|\u2014/g, "-")  // Replace en dash/em dash with hyphen
              .replace(/\u202F|\u00A0/g, " ")  // Replace non-breaking spaces with normal spaces
              .trim();
  
          console.log(`Normalized Opening Hours: ${cleanedTimeRange}`);
  
          // Ensure proper splitting
          const times = cleanedTimeRange.split(/\s*-\s*/);
  
          if (times.length !== 2) {
              console.log("Time format is incorrect:", cleanedTimeRange);
              return;
          }
  
          const openTime = convertToMinutes(times[0].trim());
          const closeTime = convertToMinutes(times[1].trim());
  
          if (openTime === null || closeTime === null) {
              console.log(`Skipping ${result.name || "Unknown Location"} due to invalid time conversion.`);
              return;
          }
  

  
          // Handle 24-hour time boundary and check if the location is open
          if (openTime <= currentTime && currentTime <= closeTime) {
              console.log(`${result.place|| "Unknown Location"} is open now!`);
              openNowPlaces.push(place);
              renderPlaceResults(openNowPlaces, 0);
              updateMarkers(place, true);
          } else if (openTime > closeTime) {
              // Handle late-night openings (spans midnight)
              if (currentTime >= openTime || currentTime <= closeTime) {
                  console.log(`${result.name|| "Unknown Location"} is open now!`);
                  openNowPlaces.push(place);
                  renderPlaceResults(openNowPlaces, 0);
                  updateMarkers(place, true);
              } else {
                  console.log(`${result.name || "Unknown Location"} is closed now.`);
                  updateMarkers(place, false);
              }
          } else {
              console.log(`${result.name || "Unknown Location"} is closed now.`);
              updateMarkers(place, false);
          }
      }
  }
  function updateMarkers(place, isOpen) {
  

    widget.placeMarkers.forEach((marker, index) => {
        const markerPosition = marker.getPosition();
        const placePosition = place.coords;

        // Log marker positio
        // Compute distance between marker and place
        const distance = google.maps.geometry.spherical.computeDistanceBetween(markerPosition, placePosition);
        

        // Debug why the condition isn't passing
        if (distance < 20) { 
            console.log(`✅ Marker #${index} matches place ${place.name} (distance < 20m)`);

            if (isOpen) {
                marker.setMap(widget.map);  
                console.log(`🟢 Showing marker for ${place.name}`);
            } else {
                marker.setMap(null);  
                console.log(`🔴 Hiding marker for ${place.name}`);
            }
        } else {
            console.log(`❌ Marker #${index} does NOT match (distance >= 20m)`);
        }
    });
  }

  /**
   * Convert time (12-hour AM/PM format) to 24-hour minutes.
   */
  function convertToMinutes(time) {
      if (!time || typeof time !== "string") {
          console.log("Invalid time string:", time);
          return null;
      }
  
      let normalizedTime = time
          .replace(/\u202F|\u00A0/g, " ")  // Normalize spaces
          .replace(/\u2013|\u2014/g, "-")  // Normalize dashes
          .trim();
  
      console.log("Normalized time:", normalizedTime);
  
      // Match HH:MM AM/PM format
      const match = normalizedTime.match(/^(\d{1,2}):?(\d{0,2})?\s?(AM|PM)?$/i);
  
      if (!match) {
          console.log("Time format is incorrect:", normalizedTime);
          return null;
      }
  
      let [_, hour, minute, period] = match;
      hour = parseInt(hour, 10);
      minute = minute ? parseInt(minute, 10) : 0;
  
      if (isNaN(hour) || isNaN(minute)) {
          console.log("Invalid time components:", hour, minute);
          return null;
      }
  
      if (period) {
          // Convert 12-hour format to 24-hour format
          if (period.toUpperCase() === "PM" && hour !== 12) {
              hour += 12;
          } else if (period.toUpperCase() === "AM" && hour === 12) {
              hour = 0;
          }
      }
  
      return hour * 100 + minute;
    }
    
    /**
     * Parse opening hours into a structured format.
     */
    function sparseDaysHours(openingHours) {
        return openingHours.weekday_text.map((e) => {
            const [day, hours] = e.split(": ");
            return { days: day, hours: hours };
        });
    }
    
  
    
    
    function filterPlacesByType(types) {
      console.log("Filtering places by types:", types);
      console.log("All place types:", widget.places.map(p => p.type));
  
      // If the types array is empty, show all places
      if (types.length === 0) {
          console.log("No types selected. Showing all places.");
          renderPlaceResults(widget.places, 0); // Show all places
          return; // Exit early to avoid further filtering
      }
  
      const filteredPlaces = widget.places.filter((place) => {
          if (!place.type) {
              console.warn(`Skipping place ${place.name || "Unknown"} due to missing type.`);
              return false; // Ignore places without types
          }
  
          const placeTypes = Array.isArray(place.type) ? place.type : [place.type]; // Ensure it's an array
          const normalizedPlaceTypes = placeTypes.map(type => type?.toLowerCase().trim());
          const normalizedFilterTypes = types.map(type => type.toLowerCase().trim());
  
          return normalizedFilterTypes.some(type => normalizedPlaceTypes.includes(type));
      });
  
      console.log(`Found ${filteredPlaces.length} places after filter`, filteredPlaces);
      renderPlaceResults(filteredPlaces, 0); // Re-render filtered places
    }
    

    // Filter markers by selected types
    function filterMarkers(types) {
      

      widget.placeMarkers.forEach((marker) => {
        const normalizedPlaceType = marker.placeType?.toLowerCase().trim(); // Normalize marker placeType
        const normalizedTypes = types.map((type) => type.toLowerCase().trim()); // Normalize types array
        if (normalizedTypes.length === 0 || normalizedTypes.includes(normalizedPlaceType)) {
          marker.setMap(widget.map); // Show marker
        } else {
          marker.setMap(null); // Hide marker
        }
      });
    }

  /** Initializes Search Input for the widget. */
  function initializeSearchInput() {
    const searchInputEl = widgetEl.querySelector('.place-search-input');
    widget.placeIdsToAutocompleteResults = new Map();

    // Set up Autocomplete on the search input.
    const autocomplete = new google.maps.places.Autocomplete(searchInputEl, {
      types: ['establishment'],
      fields: [
        'place_id', 'name', 'types', 'geometry.location', 'formatted_address', 'photo', 'url',
        'website', 'formatted_phone_number', 'opening_hours',
        'rating', 'user_ratings_total', 'price_level', 'review',
      ],
      bounds: widget.mapBounds,
      strictBounds: true,
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      widget.placeIdsToAutocompleteResults.set(place.place_id, place);
      widget.selectPlaceById(place.place_id, /* panToMarker= */ true);
      searchInputEl.value = '';
    });
  }
}
