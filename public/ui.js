const container = document.querySelector(".container");
const openChatButton = document.querySelector("#open-chat-button");
const fullscreenButton = document.querySelector("#fullscreen-button");
let fullscreen = false;

openChatButton.addEventListener("click", () => {
  container.classList.toggle("open-sidebar");
});

fullscreenButton.addEventListener("click", () => {
  if (!fullscreen) {
    document.getElementsByClassName("main")[0].requestFullscreen();
    fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>';
    fullscreen = true;
  } else {
    document.exitFullscreen();
    fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreen = false;
  }
});

const mainVideos = document.getElementsByClassName("main-videos")[0];
const videosContainer = document.getElementsByClassName("videos-container")[0];
window.addEventListener("resize", resizeGrid);

function resizeGrid() {
  if (users.length !== 2 && users.length < 5) {
    if (mainVideos.clientWidth / (document.documentElement.clientHeight - 68) > 1.63) {
      videosContainer.style.paddingTop = `${document.documentElement.clientHeight - 89}px`;
      videosContainer.style.width = `${(document.documentElement.clientHeight - 68) * 1.63}px`;
    } else {
      videosContainer.style.paddingTop = `60%`;
      videosContainer.style.width = `100%`;
    }
  } else {
    if (mainVideos.clientWidth / (document.documentElement.clientHeight - 68) > 2.474) {
      videosContainer.style.paddingTop = `${document.documentElement.clientHeight - 89}px`;
      videosContainer.style.width = `${(document.documentElement.clientHeight - 68) * 2.3}px`;
    } else {
      videosContainer.style.paddingTop = `40%`;
      videosContainer.style.width = `100%`;
    }
  }
}
