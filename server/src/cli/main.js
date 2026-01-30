#!/usr/bin/env node
// ^^ This is shebang which makes it executable by Node.js


import dotenv from "dotenv";
import chalk from "chalk";
import figlet from "figlet";
import { Command } from "commander";
import { login,logout, whoami } from "./commands/auth/login.js";
import { wakeUp } from "./commands/ai/wakeup.js";

dotenv.config();// Loads .env file into process.env

async function main(){
    //Display banner - First thing user sees
    console.log(
        chalk.cyanBright(
            figlet.textSync("Orbital CLI",{
                font:"Standard",
                horizontalLayout:"default",
            })
        )
    );
    console.log(chalk.gray("A CLI based AI tool \n"));
    
    // Create Commander instance
    const program = new Command("orbital");

    // Configure the CLI
    program.version("0.0.1")// Shows when: orbital --version
    .description("Orbital CLI - A CLI Based AI Tool")
    .addCommand(login)// Register login command
    .addCommand(logout)// Register logout command
    .addCommand(whoami)// Register whoami command
    .addCommand(wakeUp) // Register wakeup command
    
    //Default actions shows help if no command
    program.action(()=>{
        program.help();
    });

    // Parse command line arguments
    //commander parses this and matches wakeup to the registered command
    program.parse()// Reads process.argv

}
main();