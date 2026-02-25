let imgs = document.getElementsByTagName("article")[0].getElementsByTagName("img")
let mainElement = document.getElementsByTagName("main")[0]
let viewImg = document.getElementById('view-img')
let viewBox = document.getElementById('view-box')
for (let i = 0; i < imgs.length; i++) {
    imgs[i].onclick = function () {
        if (!imgs[i].classList.contains("view-none") && !mainElement.classList.contains("aside-show")) {
            viewBox.className = "view-box-show"
            viewImg.src = imgs[i].src
        }
    }
}
viewBox.onclick = function () {
    viewBox.className = "view-box-hide"
}