const container = document.querySelector(".container");
const openChatButton = document.querySelector(".main-control-button.chat");

openChatButton.addEventListener("click", () => {
  container.classList.toggle("open-sidebar");
});
