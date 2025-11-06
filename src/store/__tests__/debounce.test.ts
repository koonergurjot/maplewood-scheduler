import { describe, expect, it, vi } from "vitest";

import { debounce } from "../utils";

describe("debounce", () => {
  it("invokes only the last call after the delay", async () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced("first");
    debounced("second");
    debounced("third");

    expect(spy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(99);
    expect(spy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("third");

    debounced.cancel();
    vi.useRealTimers();
  });
});
