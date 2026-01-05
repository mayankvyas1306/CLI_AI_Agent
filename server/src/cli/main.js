#!/usr/bin/env node

import dotenv from "dotenv";
import chalk from "chalk";
import figlet from "figlet";
import { Command } from "commander";
import { login,logout, whoami } from "./commands/auth/login.js";

dotenv.config();

async function main(){
    //Display banner
    console.log(
        chalk.cyanBright(
            figlet.textSync("Orbital CLI",{
                font:"Standard",
                horizontalLayout:"default",
            })
        )
    );
    console.log(chalk.gray("A CLI based AI tool \n"));
    
    const program = new Command("orbital");

    program.version("0.0.1")
    .description("Orbital CLI - A CLI Based AI Tool")
    .addCommand(login)
    .addCommand(logout)
    .addCommand(whoami)

    //Default actions shows help
    program.action(()=>{
        program.help();
    });

    program.parse()

}
main();