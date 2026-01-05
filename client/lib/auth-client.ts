import {createAuthClient} from "better-auth/react"
import {deviceAuthorizationClient} from "better-auth/client/plugins"; 

export const authClient = createAuthClient({
    baseURL:"http://localhost:3005", //this should be your backend url
    
    //we have to include plugins
    plugins:[
        deviceAuthorizationClient()
    ]
})