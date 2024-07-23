import { createKikey } from "./kikey";
import markdownit from "markdown-it";
import { createSticky } from "./createSticky";
import { $ } from "./utils/dollars";
import "./commandPalette";
import "./setBackgroundImage";
import { n81i } from "./utils/n81i";

n81i.init();

const md = markdownit({
  html: true,
});
const kikey = createKikey();

kikey.on("C-q", () => {
  const sticky = createSticky();
  const stickyBody = sticky.$(".stickyBody")!;
  stickyBody.contentEditable = "true";
  stickyBody.setAttribute("placeholder", "Start typing...");

  const k = createKikey(sticky);
  let source = "";
  k.on("A-w", () => {
    if (stickyBody.contentEditable === "true") {
      source = stickyBody.innerText;
      const html = md.render(source);
      const fragment = document.createRange().createContextualFragment(html);
      stickyBody.replaceChildren(fragment);
    } else {
      stickyBody.innerText = source; // Only innerText can retain linebreak.
    }
    stickyBody.contentEditable = (
      stickyBody.contentEditable !== "true"
    ).toString();
  });

  k.once("A-x", sticky.close);
  $(".stickyContainer")?.append(sticky);
  stickyBody.focus();
});

kikey.on("A-r", () => {
  $(".stickyContainer")?.classList.toggle("autoArrange");
});

// theme
function isPrefersDarkMode() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

// init
$("#lightIcon")!.hidden = !isPrefersDarkMode();
$("#darkIcon")!.hidden = isPrefersDarkMode();
$<HTMLInputElement>("#themeToggle")!.checked = !isPrefersDarkMode();

$<HTMLInputElement>("#themeToggle")!.addEventListener("change", (e) => {
  // true = light mode
  // false = dark mode
  $("#lightIcon")!.hidden = e.target.checked;
  $("#darkIcon")!.hidden = !e.target.checked;
  document.firstElementChild?.setAttribute(
    "data-theme",
    e.target.checked ? "light" : "dark",
  );
});
