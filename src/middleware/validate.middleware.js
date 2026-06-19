// const { AppError } = require("../libs/errors");

// module.exports = (schema) => (req, res, next) => {
//   const parsed = schema.safeParse(req.body);
//   if (!parsed.success) {
//     return next(new AppError(parsed.error.errors[0].message, 422));
//   }
//   req.body = parsed.data;
//   next();
// };
// src/middlewares/validate.middleware.js
const { ZodError } = require("zod");

module.exports = (schema, options = {}) => (req, res, next) => {
  try {
    const source = options.source || "body";
    const input = req[source];

    // parse + also apply defaults/transforms
    const parsed = schema.parse(input);

    // replace request section with validated data
    req[source] = parsed;
    next();
  } catch (err) {
    // Zod validation error
    if (err instanceof ZodError) {
      const first = err.issues?.[0];

      return res.fail(first?.message || "Validation failed", 400, {
        field: first?.path?.join(".") || undefined,
      });
    }

    // other errors
    return res.fail(err?.message || "Validation failed", 400);
  }
};
