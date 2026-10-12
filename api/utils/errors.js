export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error)
  if (error.name === "ZodError") {
    return response
      .status(400)
      .json({
        error: "Invalid request",
        details: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      })
  }
  if (error.code === 11000) return response.status(409).json({ error: "Record already exists" })
  if (error.type === "entity.parse.failed")
    return response.status(400).json({ error: "Invalid JSON body" })
  if (error.type === "entity.too.large")
    return response.status(413).json({ error: "Request body too large" })
  if (error instanceof ApiError) return response.status(error.status).json({ error: error.message })
  console.error("Request failed:", error.name)
  response.status(500).json({ error: "An unexpected server error occurred" })
}
