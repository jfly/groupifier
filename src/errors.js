export class ApplicationError {
  /* A constant string is used instead of `this.constructor.name` to ensure minimization safety. */
  get type() { return 'ApplicationError'; }

  constructor(data = {}) {
    this.data = data;
  }
}

export function catchErrors(handlerByError) {
  const defaultHandler = handlerByError.default;
  return (error) => {
    console.error(`An error occurred: ${error.type}`, error.data);
    const handler = handlerByError[error.type];
    return handler ? handler(error) : defaultHandler(error);
  };
};
