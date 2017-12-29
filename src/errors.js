export class ApplicationError {
  constructor(data = {}) {
    this.type = this.constructor.name;
    this.data = data;
  }
}

export function catchErrors(handlerByError) {
  const defaultHandler = handlerByError.default;
  return (error) => {
    console.error(error);
    const handler = handlerByError[error.type];
    return handler ? handler() : defaultHandler();
  };
};
