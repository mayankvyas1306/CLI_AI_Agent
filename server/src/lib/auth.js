import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db.js";
import { deviceAuthorization } from "better-auth/plugins";

// creating and exporting instance of better auth is auth here
export const auth = betterAuth({
  //Better Auth requires a database to store user data. You can easily configure Better Auth to use SQLite, PostgreSQL, or MySQL, and more!
  database: prismaAdapter(prisma, {
    provider: "postgresql", //or "mysql" , etc
  }),

  //adding base path
  basePath: "/api/auth",

  //adding trusted origin
  trustedOrigins: ["http://localhost:3000"],
  plugins: [
    deviceAuthorization({
      verificationUri: "/device",
    }),
  ],

  //Add authentication methods
  //to add github auth
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
});
