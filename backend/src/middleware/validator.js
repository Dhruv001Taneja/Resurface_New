/**
 * Express middleware for Zod schema validation.
 * Supports validating req.body, req.query, and req.params.
 *
 * @param {Object} schemas - { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 */
export const validateRequest = (schemas) => {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body)
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query)
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params)
      }
      next()
    } catch (error) {
      if (error?.issues || error?.errors) {
        const issues = error.issues || error.errors
        const details = issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: details[0]?.message || 'Invalid input provided',
          details,
        })
      }

      next(error)
    }
  }
}

export default validateRequest
