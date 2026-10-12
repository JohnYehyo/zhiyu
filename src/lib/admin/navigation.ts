export function shouldConfirmLink(
  href: string,
  current: string,
  target = "",
  download = false,
) {
  if (download || (target && target !== "_self")) return false;
  const from = new URL(current);
  const to = new URL(href, from);
  return (
    to.origin === from.origin &&
    (to.pathname !== from.pathname || to.search !== from.search)
  );
}

const leaveMessage =
  "当前内容尚未保存，或媒体仍在上传。离开会丢失本页修改，确定离开吗？";
const markerKey = "zhiyuEditorGuard";

export function isSameDocumentAnchor(from: string, to: string) {
  const previous = new URL(from);
  const next = new URL(to);
  return (
    previous.origin === next.origin &&
    previous.pathname === next.pathname &&
    previous.search === next.search &&
    previous.hash !== next.hash
  );
}

/** Protect existing links without replacing Next's navigation or touching its route data. */
export function protectEditorNavigation(isBlocked: () => boolean) {
  const marker = crypto.randomUUID();
  let armed = false;
  let restoring = false;
  let leaving = false;
  let cleanup: { state: Record<string, unknown>; url: string } | null = null;
  let currentUrl = window.location.href;
  let currentState = window.history.state;

  function cleanState() {
    const state = { ...window.history.state };
    delete state[markerKey];
    return state;
  }

  function update() {
    if (!cleanup && !restoring) {
      currentUrl = window.location.href;
      currentState = window.history.state;
    }
    if (cleanup || leaving) return;
    if (armed && !isBlocked() && window.history.state?.[markerKey] === marker) {
      cleanup = { state: cleanState(), url: window.location.href };
      armed = false;
      window.history.back();
      return;
    }
    if (armed || leaving || !isBlocked()) return;
    armed = true;
    // Back first reaches the same document, so cancellation never unmounts the editor.
    window.history.pushState(
      { ...window.history.state, [markerKey]: marker },
      "",
      window.location.href,
    );
  }

  function click(event: MouseEvent) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !isBlocked()
    )
      return;
    const anchor =
      event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (
      !(anchor instanceof HTMLAnchorElement) ||
      !shouldConfirmLink(
        anchor.href,
        window.location.href,
        anchor.target,
        anchor.hasAttribute("download"),
      )
    )
      return;
    if (window.confirm(leaveMessage)) {
      leaving = true;
    } else {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function beforeUnload(event: BeforeUnloadEvent) {
    if (!leaving && isBlocked()) event.preventDefault();
  }

  function popstate(event: PopStateEvent) {
    if (cleanup) {
      event.stopImmediatePropagation();
      window.history.replaceState(cleanup.state, "", cleanup.url);
      cleanup = null;
      currentUrl = window.location.href;
      currentState = window.history.state;
      update();
      return;
    }
    if (restoring) {
      restoring = false;
      currentUrl = window.location.href;
      currentState = window.history.state;
      event.stopImmediatePropagation();
      return;
    }
    if (!armed || leaving) return;
    if (isSameDocumentAnchor(currentUrl, window.location.href)) {
      event.stopImmediatePropagation();
      window.history.replaceState(
        { ...currentState, [markerKey]: marker },
        "",
        window.location.href,
      );
      currentUrl = window.location.href;
      currentState = window.history.state;
      return;
    }
    if (event.state?.[markerKey] === marker) return;
    // Capture runs before Next's popstate handler; stay on this editor until decided.
    event.stopImmediatePropagation();
    if (!isBlocked() || window.confirm(leaveMessage)) {
      leaving = true;
      window.history.back();
    } else {
      restoring = true;
      window.history.forward();
    }
  }

  function hashchange() {
    if (armed && !leaving)
      window.history.replaceState(
        { ...window.history.state, [markerKey]: marker },
        "",
        window.location.href,
      );
    currentUrl = window.location.href;
    currentState = window.history.state;
  }

  function pagehide() {
    if (window.history.state?.[markerKey] === marker)
      window.history.replaceState(cleanState(), "", window.location.href);
  }

  function pageshow() {
    leaving = false;
    armed = window.history.state?.[markerKey] === marker;
    update();
  }

  document.addEventListener("click", click, true);
  window.addEventListener("beforeunload", beforeUnload);
  window.addEventListener("popstate", popstate, true);
  window.addEventListener("hashchange", hashchange);
  window.addEventListener("pagehide", pagehide);
  window.addEventListener("pageshow", pageshow);
  update();
  return {
    update,
    dispose() {
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", popstate, true);
      window.removeEventListener("hashchange", hashchange);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
      if (window.history.state?.[markerKey] === marker) {
        window.history.replaceState(cleanState(), "", window.location.href);
      }
    },
  };
}
