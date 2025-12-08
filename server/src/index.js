import express from "express";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import cors from "cors";
import { fromNodeHeaders } from "better-auth/node";

dotenv.config();

const app=express();


// Configure CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);

//for express v5
app.all("/api/auth/*splat",toNodeHandler(auth));

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());


app.get("/api/me", async (req, res) => {
 	const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
	return res.json(session);
});

app.get("/health",(req,res)=>{
    res.send("OK")
})

app.listen(process.env.PORT,()=>{
    console.log(`Your application is running on https://localhost:${process.env.PORT}`);
})