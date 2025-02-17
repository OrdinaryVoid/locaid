const userLanguage = localStorage.getItem("language") || "en"; // Default to English if not set
const translationAPIKey = "AIzaSyA90o0-BpfI7NmwgajX_frr51V7O1hhHes";
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  });
  const firebaseConfig = {
    apiKey: "AIzaSyDonvH2K7wGLRC0-JKQfGnONIR3Ci60TbI",
    authDomain: "nedc-ff079.firebaseapp.com",
    databaseURL: "https://nedc-ff079-default-rtdb.firebaseio.com",
    projectId: "nedc-ff079",
    storageBucket: "nedc-ff079.firebasestorage.app",
    messagingSenderId: "716378802400",
    appId: "1:716378802400:web:c2471dc10b526976096885",
    measurementId: "G-GRX6SZTYMR"
  };
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
// Function to translate text
async function translateText(text, targetLanguage) {
  if (targetLanguage === "en") {
    return text;
  }
  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${translationAPIKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
        }),
      }
    );
    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error("Error translating text:", error);
    return text; // Fallback to original text
  }
}

// Function to translate elements dynamically
// Function to translate elements dynamically for both events and programs
async function translatePage(elementsToTranslate) {
    if (userLanguage === "en") {
      console.log("Page is in English; skipping translation.");
      return;
    }
  
    for (const el of elementsToTranslate) {
      if (el.isSelect) {
        // Handle <select> element options
        const selectElement = document.getElementById(el.id);
        if (selectElement) {
          for (const option of selectElement.options) {
            const translatedText = await translateText(option.text, userLanguage);
            option.text = translatedText;
          }
        }
      } else if (el.attribute) {
        // Handle element attributes (e.g., placeholder)
        const element = document.getElementById(el.id);
        if (element) {
          const translatedText = await translateText(el.text, userLanguage);
          element.setAttribute(el.attribute, translatedText);
        }
      } else if (el.isDynamic) {
        // Handle dynamically generated content (for both events and programs)
        const container = document.getElementById(el.id);
        if (container) {
          const items = container.querySelectorAll(".event, .program, .map-place"); // Target both types
          
          for (const item of items) {
            const titleEl = item.querySelector(".dropdown-button");
            const descriptionEl = item.querySelector(".description");
            const learnMoreBtn = item.querySelector(".learn-more-btn");
            const typeEl = item.querySelector(".place-type");
            const addressEl = item.querySelector(".place-adress");
  
            if (titleEl) {
              const translatedTitle = await translateText(titleEl.textContent, userLanguage);
              titleEl.textContent = translatedTitle;
            }
            if (descriptionEl) {
              const translatedDescription = await translateText(descriptionEl.textContent, userLanguage);
              descriptionEl.textContent = translatedDescription;
            }
            if (learnMoreBtn) {
              const translatedBtnText = await translateText(learnMoreBtn.textContent, userLanguage);
              learnMoreBtn.textContent = translatedBtnText;
            }
            if (typeEl) {
                const translatedType = await translateText(typeEl.textContent, userLanguage);
                typeEl.textContent = translatedType;
            }
            if (addressEl) {
                const translatedAddress = await translateText(addressEl.textContent, userLanguage);
                addressEl.textContent = translatedAddress;
            }
          }
        }
      } else {
        // Handle regular text content
        const element = document.getElementById(el.id);
        if (element) {
          const translatedText = await translateText(element.textContent, userLanguage);
          element.textContent = translatedText;
        }
      }
    }
  }
  
function getFavorites(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

  // Save favorites to localStorage
function setFavorites(key, items) {
    localStorage.setItem(key, JSON.stringify(items));
}

  // Toggle favorite status
function toggleFavorite(key, itemId, itemDetails) {
    let favorites = getFavorites(key);
    const index = favorites.findIndex(fav => fav.id === itemId);

    if (index > -1) {
      // Remove from favorites if already present
      favorites.splice(index, 1);
    } else {
      // Add to favorites
      favorites.push({ id: itemId, ...itemDetails });
    }

    // Save updated favorites
    setFavorites(key, favorites);
}

  // Check if item is in favorites
function isFavorite(key, itemId) {
    const favorites = getFavorites(key);
    return favorites.some(fav => fav.id === itemId);
}
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