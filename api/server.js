import mongoose from "mongoose"
import { parseEnv } from "./config/env.js"
import { connectDatabase } from "./config/database.js"
import { createApp } from "./app.js"

let server
let shuttingDown = false
async function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  const timeout = setTimeout(() => process.exit(1), 10000).unref()
  if (server)
    await new Promise((resolve) => {
      server.close(resolve)
      server.closeIdleConnections()
    })
  await mongoose.disconnect()
  clearTimeout(timeout)
  process.exitCode = code
}

try {
  const env = parseEnv(process.env)
  await connectDatabase(env.MONGODB_URI)
  const app = createApp(env)
  server = app.listen(env.PORT, env.HOST, () =>
    console.log(`Resort API listening on ${env.HOST}:${env.PORT}`),
  )
  server.on("error", (error) => {
    console.error("API listener failed:", error.code)
    void shutdown(1)
  })
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => void shutdown())
} catch (error) {
  console.error(
    "Startup failed:",
    error.name === "MongoServerSelectionError"
      ? "Cannot connect to MongoDB. Check MONGODB_URI and database access."
      : error.message,
  )
  await shutdown(1)
}
