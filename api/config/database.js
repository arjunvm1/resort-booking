import mongoose from "mongoose"
import { User, Room, Booking } from "../models/index.js"

export async function connectDatabase(uri, dbName) {
  mongoose.set("bufferCommands", false)
  let timeout
  // Keep a database named in the URI; avoid MongoDB's generic 'test' default.
  const databaseOptions = dbName
    ? { dbName }
    : /^mongodb(?:\+srv)?:\/\/[^/]+\/[^?]+/.test(uri)
      ? {}
      : { dbName: 'resort_booking' }
  try {
    await Promise.race([
      mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, ...databaseOptions }),
      new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('MongoDB connection timed out. Check the URI, network access and Atlas IP allowlist.')), 15000)
      }),
    ])
  } finally { clearTimeout(timeout) }
  const hello = await mongoose.connection.db.admin().command({ hello: 1 })
  if (!hello.setName && hello.msg !== "isdbgrid") {
    await mongoose.disconnect()
    throw new Error(
      "Booking inventory requires MongoDB Atlas or a local replica set for transactions",
    )
  }
  await Promise.all([User.init(), Room.init(), Booking.init()])
  console.log("MongoDB connected")
}
