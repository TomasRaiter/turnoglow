export class AppError extends Error {
  constructor(status, message, rule = null) {
    super(message);
    this.status = status;
    this.rule = rule;
  }
}

export const badRequest = (msg, rule) => new AppError(400, msg, rule);
export const unauthorized = (msg = 'Tenés que iniciar sesión') => new AppError(401, msg, 'RN-04');
export const forbidden = (msg = 'No tenés permiso para esta acción', rule = 'RN-04') => new AppError(403, msg, rule);
export const notFound = (msg = 'No encontrado') => new AppError(404, msg);
export const conflict = (msg, rule) => new AppError(409, msg, rule);
