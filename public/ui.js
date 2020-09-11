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

const nameInput = document.getElementById("name-input");
const nameSave = document.getElementById("name-save");
nameInput.value = window.localStorage.getItem("name") || "John Doe";

nameSave.addEventListener("click", () => {
  window.localStorage.setItem("name", nameInput.value);
});

document.getElementById("call-button").addEventListener("click", openModal);
const modal = document.getElementById("modal");
const closeButton = document.querySelector(".close-modal-button");

function openModal() {
  modal.classList.add("open");
  modal.addEventListener("click", closeModal);
  closeButton.addEventListener("click", closeModal);
}

function closeModal(e) {
  if (e.target == modal || e.target == closeButton || e.target.parentNode == closeButton) {
    modal.removeEventListener("click", closeModal);
    closeButton.removeEventListener("click", closeModal);
    modal.classList.remove("open");
  }
}

function renderUsers() {
  videoGrid.innerHTML = "";
  users.forEach((user) => {
    const video = document.createElement("video");
    const userDiv = document.createElement("div");
    if (showBig && showBig !== user.id) userDiv.classList.add("notShow");
    userDiv.classList.add("user");

    const info = document.createElement("span");
    info.classList.add("info");

    if (!user.audio) {
      const noMic = document.createElement("span");
      noMic.classList.add("fas");
      noMic.classList.add("fa-microphone-slash");
      noMic.classList.add("data");
      info.append(noMic);
    }

    if (!user.video) {
      const noCam = document.createElement("span");
      noCam.classList.add("no-cam");
      noCam.classList.add("bg-" + user.color);
      noCam.innerHTML = "<span>";
      user.name.split(" ").forEach((word) => (noCam.innerHTML += word.charAt(0).toUpperCase()));
      noCam.innerHTML += "</span>";
      userDiv.append(noCam);
    }

    const name = document.createElement("span");
    name.innerText = user.name;
    info.append(name);
    userDiv.append(info);

    if (user.stream?.id) {
      video.srcObject = user.stream;
      video.addEventListener("loadedmetadata", () => {
        video.play();
      });
      if (user.id === userConfig.id) {
        video.muted = true;
      }
    }
    userDiv.ondblclick = () => {
      showBig = showBig !== user.id ? user.id : false;
      renderUsers();
    };
    userDiv.append(video);
    videoGrid.append(userDiv);
    videoGrid.classList = `users-${users.length}`;
  });

  resizeGrid();
}
