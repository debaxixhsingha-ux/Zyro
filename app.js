alert("v40 loaded");
console.log("[Zyro] app.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Zyro] DOM ready");

  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn){
    console.log("[Zyro] menuBtn found ✓");
    menuBtn.addEventListener("click", () => {
      alert("Menu button works!");
    });
  } else {
    console.log("[Zyro] menuBtn NOT found ✗");
  }

  const plusBtn = document.getElementById("plusBtn");
  if (plusBtn){
    console.log("[Zyro] plusBtn found ✓");
    plusBtn.addEventListener("click", () => {
      alert("Plus button works!");
    });
  } else {
    console.log("[Zyro] plusBtn NOT found ✗");
  }

  const send = document.getElementById("go");
  if (send){
    console.log("[Zyro] sendBtn found ✓");
  } else {
    console.log("[Zyro] sendBtn NOT found ✗");
  }
});
