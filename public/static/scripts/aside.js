let btn = document.getElementsByClassName('aside-btn')[0];
let aside = document.getElementsByTagName('main')[0];
let num = 0;
clickAsideBtn = function () {
    num = num + 1;
    num = num % 2;
    if (num == 0) {
        aside.className = "aside-hide";
    }
    else {
        aside.className = "aside-show";
    }
}

hideAside = function () {
    if (num == 1) {
        num = 0;
        aside.className = "aside-hide";
    }
    else {
        aside.className = "aside-init";
    }

}

showAside = function () {
    num = 1;
    aside.className = "aside-show";
}