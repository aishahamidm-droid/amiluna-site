document.addEventListener("DOMContentLoaded", () => {
  const revealElements = document.querySelectorAll(".reveal");

  const revealOnScroll = () => {
    revealElements.forEach((element) => {
      const top = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (top < windowHeight - 100) {
        element.classList.add("active");
      }
    });
  };

  revealOnScroll();
  window.addEventListener("scroll", revealOnScroll);
});