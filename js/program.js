function toggleDropdown(dropdownId) {
    var dropdown = document.getElementById(dropdownId + '-dropdown');
    
    if (dropdown.classList.contains('visible')) {
        dropdown.classList.remove('visible');
    } else {
        dropdown.classList.add('visible');
    }
}

window.onclick = function(event) {
    if (!event.target.matches('.dropdown-button')) {
        var dropdowns = document.querySelectorAll('.dropdown-content.visible');
        dropdowns.forEach(dropdown => dropdown.classList.remove('visible'));
    }
};


document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.getElementById("menuButton");
    const header = document.querySelector("header");

    menuButton.addEventListener("click", () => {
        header.classList.toggle("active");
    });
});