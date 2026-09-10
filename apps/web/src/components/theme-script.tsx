/**
 * Stamps the theme before first paint.
 *
 * Without this the page renders in one theme and snaps to the saved one after
 * hydration — a flash on every navigation. It has to be inline and synchronous,
 * which is the one legitimate use for a blocking script in the document.
 *
 * There is no "auto" state to preserve, so this always stamps: the saved
 * choice if there is one, otherwise the system preference as a starting point.
 */
export function ThemeScript() {
  const js = `try{var s=localStorage.getItem("lavion.theme");var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
