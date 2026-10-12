import { afterEach, expect, it, vi } from "vitest";
import {
  shouldConfirmLink,
  isSameDocumentAnchor,
  protectEditorNavigation,
} from "./navigation";

afterEach(() => vi.unstubAllGlobals());

/** Real guard + deterministic browser history boundary, without any routing framework. */
function browserHistory(previous?: string) {
  const location = { href: "https://journal.example/admin/demo" };
  const entries: { url: string; state: unknown }[] = previous
    ? [
        { url: previous, state: {} },
        { url: location.href, state: {} },
      ]
    : [{ url: location.href, state: {} }];
  let position = entries.length - 1;
  const browser = new EventTarget();
  const document = new EventTarget();
  const confirm = vi.fn(() => true);
  function traverse(delta: number) {
    const next = position + delta;
    if (next < 0 || next >= entries.length) return;
    position = next;
    location.href = entries[position].url;
    const event = new Event("popstate");
    Object.defineProperty(event, "state", { value: entries[position].state });
    browser.dispatchEvent(event);
  }
  const history = {
    get state() {
      return entries[position].state;
    },
    // Forward entries remain counted even when already at the first entry.
    get length() {
      return entries.length;
    },
    pushState(state: unknown, _title: string, url: string) {
      entries.splice(position + 1);
      entries.push({ url: new URL(url, location.href).href, state });
      position++;
      location.href = entries[position].url;
    },
    replaceState(state: unknown, _title: string, url: string) {
      entries[position] = { url: new URL(url, location.href).href, state };
      location.href = entries[position].url;
    },
    back: () => traverse(-1),
    forward: () => traverse(1),
  };
  class Anchor {
    href = "https://journal.example/admin";
    target = "";
    closest() {
      return this;
    }
    hasAttribute() {
      return false;
    }
  }
  vi.stubGlobal(
    "window",
    Object.assign(browser, { history, location, confirm }),
  );
  vi.stubGlobal("document", document);
  vi.stubGlobal("Element", Anchor);
  vi.stubGlobal("HTMLAnchorElement", Anchor);
  return {
    history,
    location,
    confirm,
    unload() {
      const event = new Event("beforeunload", { cancelable: true });
      browser.dispatchEvent(event);
      return event.defaultPrevented;
    },
    siteClick() {
      const event = new Event("click", { cancelable: true });
      Object.defineProperties(event, {
        button: { value: 0 },
        target: { value: new Anchor() },
      });
      document.dispatchEvent(event);
      return event.defaultPrevented;
    },
  };
}

const current = "https://journal.example/admin/posts/a";
it("protects same-window site links while allowing anchors, downloads and new tabs", () => {
  expect(shouldConfirmLink("/admin", current)).toBe(true);
  expect(shouldConfirmLink("/", current)).toBe(true);
  expect(shouldConfirmLink("/about#letter", current)).toBe(true);
  expect(shouldConfirmLink("#main", current)).toBe(false);
  expect(shouldConfirmLink("/admin/posts/a#main", current)).toBe(false);
  expect(shouldConfirmLink("/admin/posts/a", current)).toBe(false);
  expect(shouldConfirmLink("/posts/old-slug", current, "_blank")).toBe(false);
  expect(shouldConfirmLink("/admin", current, "_self", true)).toBe(false);
  expect(shouldConfirmLink("https://outside.example/", current)).toBe(false);
});

it("recognizes native anchor popstate before hashchange without treating route changes as anchors", () => {
  expect(isSameDocumentAnchor(current, `${current}#main`)).toBe(true);
  expect(isSameDocumentAnchor(`${current}#main`, current)).toBe(true);
  expect(isSameDocumentAnchor(current, current)).toBe(false);
  expect(
    isSameDocumentAnchor(current, "https://journal.example/admin#main"),
  ).toBe(false);
  expect(isSameDocumentAnchor(current, `${current}?draft=other#main`)).toBe(
    false,
  );
});

it("keeps unload and site-link protection after confirmed back has no preceding entry", () => {
  const browser = browserHistory();
  const guard = protectEditorNavigation(() => true);
  browser.history.back();
  expect(browser.confirm).toHaveBeenCalledTimes(1);
  expect(browser.location.href).toBe("https://journal.example/admin/demo");
  expect(browser.history.length).toBeGreaterThan(1);
  expect(browser.unload()).toBe(true);
  guard.update();
  expect(browser.history.state).toHaveProperty("zhiyuEditorGuard");
  expect(browser.unload()).toBe(true);
  browser.confirm.mockReturnValue(false);
  expect(browser.siteClick()).toBe(true);
  expect(browser.location.href).toBe("https://journal.example/admin/demo");
  guard.dispose();
});

it("allows a real preceding page after one back confirmation", () => {
  const browser = browserHistory("https://journal.example/admin");
  const guard = protectEditorNavigation(() => true);
  browser.history.back();
  expect(browser.confirm).toHaveBeenCalledTimes(1);
  expect(browser.location.href).toBe("https://journal.example/admin");
  expect(browser.unload()).toBe(false);
  guard.dispose();
});
