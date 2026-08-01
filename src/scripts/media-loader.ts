const initializedMedia = new WeakSet<HTMLMediaElement>();
const scrollRoot = document.querySelector<HTMLElement>(".main");
const mediaRoot = document.getElementById("moments-list");

const loadMediaSource = (media: HTMLMediaElement) => {
    const source = media.dataset.mediaSrc ?? media.dataset.audioSrc;
    if (!source || media.getAttribute("src")) return;
    media.src = source;
    media.preload = "metadata";
    media.load();
};

const handleMediaError = (media: HTMLMediaElement) => {
    if (media instanceof HTMLVideoElement) {
        media.closest(".moment-media-item")?.classList.add("has-media-error");
    }
};

const observer =
    "IntersectionObserver" in window
        ? new IntersectionObserver(
              (entries) => {
                  entries.forEach((entry) => {
                      if (!entry.isIntersecting) return;
                      const media = entry.target as HTMLMediaElement;
                      loadMediaSource(media);
                      observer?.unobserve(media);
                  });
              },
              {
                  root: scrollRoot,
                  rootMargin: "320px 0px",
                  threshold: 0.01,
              },
          )
        : null;

const initializeMedia = () => {
    mediaRoot
        ?.querySelectorAll<HTMLMediaElement>(
            "video[data-media-src], audio[data-audio-src]",
        )
        .forEach((media) => {
            if (initializedMedia.has(media)) return;
            initializedMedia.add(media);
            media.addEventListener("error", () => handleMediaError(media));
            if (observer) {
                observer.observe(media);
            } else {
                loadMediaSource(media);
            }
        });
};

if (mediaRoot) {
    initializeMedia();
    document.addEventListener("moments:updated", initializeMedia);
}

export {};
