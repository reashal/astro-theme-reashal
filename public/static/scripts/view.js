let imgs = document.getElementsByTagName("article")[0].getElementsByTagName("img");
let img = document.getElementById('view-img')
let box = document.getElementById('view-box')
for (let i = 0; i < imgs.length; i++) {
    if (imgs[i].parentNode.children.length > 1)
        imgs[i].parentNode.className = "p-has-img"
    imgs[i].onclick = function () {
        if (!imgs[i].classList.contains("view-none")) {
            box.className = "view-box-show"
            img.src = imgs[i].src
        }
    }
}
box.onclick = function () {
    box.className = "view-box-hide"
}