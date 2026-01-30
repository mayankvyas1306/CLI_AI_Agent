import {createAuthClient} from "better-auth/react"
import {deviceAuthorizationClient} from "better-auth/client/plugins"; 

export const authClient = createAuthClient({
    baseURL:"http://localhost:3005", //this should be your backend url
    
    //we have to include plugins
    plugins:[
        deviceAuthorizationClient()
    ]
})


// The client-side library helps you interact with the auth server. Better Auth comes with a client for all the popular web frameworks, including vanilla JavaScript.

// Import createAuthClient from the package for your framework (e.g., "better-auth/react" for React).
// Call the function to create your client.
// Pass the base URL of your auth server. (If the auth server is running on the same domain as your client, you can skip this step.)