import { describe, expect, it } from "vitest";
import { estClientTerminal } from "./client-terminal";

describe("estClientTerminal", () => {
  it.each(["curl/8.5.0", "Wget/1.21.4", "HTTPie/3.2.2", "xh/0.22.0"])("reconnaît %s", (userAgent) => {
    expect(estClientTerminal(userAgent)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; curl)",
    "Curl/8.5.0",
    "",
    null,
    undefined,
  ])("laisse passer %s", (userAgent) => {
    expect(estClientTerminal(userAgent)).toBe(false);
  });
});
