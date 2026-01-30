import express from "express";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import cors from "cors";
import { fromNodeHeaders } from "better-auth/node";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3005",
  process.env.FRONTEND_URL,
].filter(Boolean);

// Configure CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }, // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }),
);

//Mount handler
//for express v5 this is route handler for auth
app.all("/api/auth/*splat", toNodeHandler(auth));

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

//Now we have problem that we are redirecting to local host 3005 but our ui is at 3000 so we will use proxy to redirect to 3000
app.get("/device", async (req, res) => {
  const { user_code } = req.query;
  res.redirect(`http://localhost:3000/device?user_code=${user_code}`);
});

app.listen(process.env.PORT, () => {
  console.log(
    `Your application is running on https://localhost:${process.env.PORT}`,
  );
});
