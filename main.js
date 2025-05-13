document.querySelectorAll(".collapsible-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const content = this.nextElementSibling;
  
      if (content.style.display === "block") {
        content.style.display = "none";
        this.innerHTML = this.innerHTML.replace("▾", "▸");
      } else {
        content.style.display = "block";
        this.innerHTML = this.innerHTML.replace("▸", "▾");
      }
    });
  });