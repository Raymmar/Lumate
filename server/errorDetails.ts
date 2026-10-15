/** Safely describe thrown values without assuming every rejection is an Error. */
export function errorDetails(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { name: "UnknownError", message: String(error), stack: undefined };
}
