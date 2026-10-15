import assert from "node:assert/strict";
import { test } from "node:test";
import { errorDetails } from "./errorDetails";

test("error details preserve real errors and handle non-Error throws", () => {
  const error = new TypeError("Invalid profile");
  assert.deepEqual(errorDetails(error), {
    name: "TypeError", message: "Invalid profile", stack: error.stack,
  });
  for (const value of [null, undefined, "failed", 42]) {
    assert.deepEqual(errorDetails(value), {
      name: "UnknownError", message: String(value), stack: undefined,
    });
  }
});
