import {betterAuth} from "better-auth";
import {prismaAdapter} from "better-auth/adapters/prisma"
import prisma from "./db.js"

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", 
    }),
    
    //adding base path
    basePath:"/api/auth",

    //adding trusted origin
    trustedOrigins:["http://localhost:3000"],

    //to add github auth
    socialProviders:{
        github:{
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
        }
    }
});