/**
 * Applies the saved theme before first paint.
 *
 * Without this the page renders in the system theme and then snaps to the
 * saved one after hydration — a flash on every navigation. It has to be
 * inline and synchronous, which is the one legitimate use for a blocking
 * script in the document.
 */
export function ThemeScript() {
  const js = `try{var t=localStorage.getItem("lavion.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
