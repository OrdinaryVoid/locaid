//Function for the dropdown Navigation bar 
function toggleDropdown(dropdownId) {
    //Gets the ID of the specific dropdown from the HTML
    var dropdown = document.getElementById(dropdownId + '-dropdown');
    //Checks if it's visible
    if (dropdown.classList.contains('visible')) {
        // Removes the visibility (through a class in CSS) of the dropdown when not clicked
        dropdown.classList.remove('visible');
    } else {
        //Makes it visible when the dropdown button is clicked
        dropdown.classList.add('visible');
    }
}
//Function for when a user clicks outside the dropdown, the dropdown closes
window.onclick = function(event) {
    //Checks if the user input from the click matches a dropdown button
    if (!event.target.matches('.dropdown-button')) {
        //If not, it makes it not visible
        var dropdowns = document.querySelectorAll('.dropdown-content.visible');
        dropdowns.forEach(dropdown => dropdown.classList.remove('visible'));
    }
};

//Function for the dropdown Navigation Bar for Mobile
document.addEventListener("DOMContentLoaded", () => {
    //Constants to get the elements from the HTML to use
    const menuButton = document.getElementById("menuButton");
    const header = document.querySelector("header");
//If the button is clicked, it will be activated 
    menuButton.addEventListener("click", () => {
        header.classList.toggle("active");
    });
});
