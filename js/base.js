const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

const toggleNav = (className) => {
    const list = $$('.nav-bar-bottom-icon')
    for (let items of list) {
        items.classList.remove("active");
    }
    $(`.${className}`).classList.add('active');
};

const toggleTabDetail = () => {
    $('.user-detail').classList.toggle("active");
}

const stopPropagation = (e) => {
    e.stopPropagation();
}