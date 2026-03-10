let momentGroups = {}
let currentMomentId = null
let currentIndex = 0
let mainElement = null
let viewImg = null
let viewBox = null
let viewPrev = null
let viewNext = null
let viewCounter = null
let viewClose = null

function initElements() {
    mainElement = document.getElementsByTagName("main")[0]
    viewImg = document.getElementById('view-img')
    viewBox = document.getElementById('view-box')
    viewPrev = document.getElementById('view-prev')
    viewNext = document.getElementById('view-next')
    viewCounter = document.getElementById('view-counter')
    viewClose = document.getElementById('view-close')
}

function collectImages() {
    momentGroups = {}
    let moments = document.querySelectorAll('.moment-images')
    moments.forEach(function(momentSection) {
        let momentId = momentSection.getAttribute('data-moment-id')
        if (!momentId) return
        
        let imgsData = momentSection.getAttribute('data-imgs')
        let imgList = []
        try {
            imgList = JSON.parse(imgsData)
        } catch(e) {
            imgList = []
        }
        
        momentGroups[momentId] = imgList
        
        let imgs = momentSection.querySelectorAll('img')
        imgs.forEach(function(img, idx) {
            img.addEventListener('click', function() {
                if (!mainElement.classList.contains("aside-show")) {
                    currentMomentId = momentId
                    currentIndex = idx
                    showImage()
                    viewBox.className = "view-box-show"
                    document.body.style.overflow = 'hidden'
                }
            })
        })
        
        let overlay = momentSection.querySelector('.img-mask-overlay')
        if (overlay) {
            overlay.addEventListener('click', function() {
                if (!mainElement.classList.contains("aside-show")) {
                    currentMomentId = momentId
                    currentIndex = 8
                    showImage()
                    viewBox.className = "view-box-show"
                    document.body.style.overflow = 'hidden'
                }
            })
        }
    })
}

function showImage() {
    let imgList = momentGroups[currentMomentId]
    if (!imgList || !imgList[currentIndex]) return
    
    viewImg.src = imgList[currentIndex].url
    viewImg.alt = imgList[currentIndex].alt || ''
    
    if (imgList.length > 1) {
        viewCounter.textContent = (currentIndex + 1) + ' / ' + imgList.length
        viewPrev.style.display = 'flex'
        viewNext.style.display = 'flex'
        viewCounter.style.display = 'block'
        viewPrev.disabled = currentIndex === 0
        viewNext.disabled = currentIndex === imgList.length - 1
    } else {
        viewPrev.style.display = 'none'
        viewNext.style.display = 'none'
        viewCounter.style.display = 'none'
    }
}

function closeView() {
    viewBox.className = "view-box-hide"
    document.body.style.overflow = ''
}

function showPrev() {
    let imgList = momentGroups[currentMomentId]
    if (!imgList) return
    if (currentIndex > 0) {
        currentIndex--
        showImage()
    }
}

function showNext() {
    let imgList = momentGroups[currentMomentId]
    if (!imgList) return
    if (currentIndex < imgList.length - 1) {
        currentIndex++
        showImage()
    }
}

function bindEvents() {
    if (viewClose) {
        viewClose.addEventListener('click', function(e) {
            e.stopPropagation()
            closeView()
        })
    }

    if (viewPrev) {
        viewPrev.addEventListener('click', function(e) {
            e.stopPropagation()
            showPrev()
        })
    }

    if (viewNext) {
        viewNext.addEventListener('click', function(e) {
            e.stopPropagation()
            showNext()
        })
    }

    if (viewBox) {
        viewBox.addEventListener('click', function(e) {
            if (e.target === viewBox) {
                closeView()
            }
        })
    }

    document.addEventListener('keydown', function(e) {
        if (viewBox && viewBox.classList.contains('view-box-show')) {
            if (e.key === 'Escape') closeView()
            if (e.key === 'ArrowLeft') showPrev()
            if (e.key === 'ArrowRight') showNext()
        }
    })
}

function init() {
    initElements()
    if (viewBox) {
        collectImages()
        bindEvents()
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
} else {
    init()
}
