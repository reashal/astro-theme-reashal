const initializedPlayers = new WeakSet<HTMLElement>();
let activeAudio: HTMLAudioElement | null = null;

const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    const wholeSeconds = Math.floor(seconds);
    const minutes = Math.floor(wholeSeconds / 60);
    return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
};

const setProgress = (
    input: HTMLInputElement,
    currentTime: number,
    duration: number,
) => {
    const percent =
        Number.isFinite(duration) && duration > 0
            ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
            : 0;
    input.value = String(percent);
    input.style.setProperty("--music-progress", `${percent}%`);
};

const initializePlayer = (player: HTMLElement) => {
    if (initializedPlayers.has(player)) return;

    const audio = player.querySelector<HTMLAudioElement>("audio");
    const toggle = player.querySelector<HTMLButtonElement>(".music-toggle");
    const progress =
        player.querySelector<HTMLInputElement>(".music-progress");
    const current = player.querySelector<HTMLElement>(".music-current");
    const duration = player.querySelector<HTMLElement>(".music-duration");
    const errorMessage = player.querySelector<HTMLElement>(".music-error");
    const title =
        player.querySelector<HTMLElement>(".music-title")?.textContent?.trim() ??
        "音乐";
    if (!audio || !toggle || !progress || !current || !duration) return;

    initializedPlayers.add(player);

    const updateTime = () => {
        current.textContent = formatTime(audio.currentTime);
        duration.textContent = formatTime(audio.duration);
        setProgress(progress, audio.currentTime, audio.duration);
    };

    const updatePlaybackState = () => {
        const isPlaying = !audio.paused && !audio.ended;
        player.classList.toggle("is-playing", isPlaying);
        toggle.ariaLabel = `${isPlaying ? "暂停" : "播放"} ${title}`;
    };

    const ensureSource = () => {
        const source = audio.dataset.audioSrc;
        if (!source || audio.getAttribute("src")) return;
        audio.src = source;
        audio.preload = "metadata";
        audio.load();
    };

    const setErrorState = (hasError: boolean) => {
        player.classList.toggle("has-error", hasError);
        if (errorMessage) errorMessage.hidden = !hasError;
    };

    toggle.addEventListener("click", async () => {
        if (!audio.paused) {
            audio.pause();
            return;
        }

        setErrorState(false);
        ensureSource();
        if (activeAudio && activeAudio !== audio) activeAudio.pause();
        activeAudio = audio;
        try {
            await audio.play();
        } catch {
            setErrorState(true);
            toggle.ariaLabel = `${title} 暂时无法播放`;
        }
    });

    progress.addEventListener("input", () => {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        audio.currentTime = (Number(progress.value) / 100) * audio.duration;
        updateTime();
    });

    audio.addEventListener("loadedmetadata", updateTime);
    audio.addEventListener("durationchange", updateTime);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("play", updatePlaybackState);
    audio.addEventListener("pause", updatePlaybackState);
    audio.addEventListener("ended", updatePlaybackState);
    audio.addEventListener("error", () => {
        setErrorState(true);
        updatePlaybackState();
    });

    updateTime();
    updatePlaybackState();
};

const initializePlayers = () => {
    document
        .querySelectorAll<HTMLElement>("[data-music-player]")
        .forEach(initializePlayer);
};

initializePlayers();
document.addEventListener("moments:updated", initializePlayers);
document.addEventListener("media-viewer:video", () => {
    activeAudio?.pause();
});
