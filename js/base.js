const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

const toggleNav = (className) => {
    const list = $$('.nav-bar-bottom-icon')
    for (let items of list) {
        items.classList.remove("active");
    }
    $(`.${className}`).classList.add('active');
};

const toggleSwitchMyShoe = (className) => {
    const list = $$('.my-shoe-section-item')
    for (let items of list) {
        items.classList.remove("active");
    }
    $(`.my-shoe-section-item.${className}`).classList.add('active');

    className === 'old' 
    ? 
    $('.my-shoe-section-bg').style.transform = "translate(0,-50%)" 
    : 
    $('.my-shoe-section-bg').style.transform = "translate(96%,-50%)"
};

const toggleTabDetail = () => {
    $('.user-detail').classList.toggle("active");
}

const stopPropagation = (e) => {
    e.stopPropagation();
}

// Handle Durability Change

$('#durabilityPercent') !== null 

?

$('#durabilityPercent').oninput = function() {
    $('.fix-cost-value').innerHTML = `${(this.value*4.78).toFixed(2)} WSP` 
}
:
console.log("Dont have Fix element")


// FIX

const toggleFixPopUp = () => {
    $(".fix").classList.toggle("active");
}

const toggleElement = (className) => {
    $(`.${className}`).classList.toggle("active");
}