import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import { logger } from "better-auth";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { storeToken, TOKEN_FILE } from "../../../lib/token.js";
import chalk from "chalk";
import { Command } from "commander";
import fs from "node:fs/promises";
import open from "open";// to open any link from cli
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod/v4"; // to verify the inputs
import dotenv from "dotenv";
import prisma from "../../../lib/db.js";
import { log } from "node:console";
import { getStoredToken, isTokenExpired } from "../../../lib/token.js";
import { clearStoredToken } from "../../../lib/token.js";
import { requireAuth } from "../../../lib/token.js";

dotenv.config();


//1.add the url, clientId which is github client Id
const URL = process.env.ORBITAL_SERVER_URL || "http://localhost:3005";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CONFIG_DIR = path.join(os.homedir(), ".better-auth");


export async function loginAction(opts) {
  const options = z
    .object({
      serverUrl: z.string().optional(),
      clientId: z.string().optional(),
    })
    .parse(opts);

  const serverUrl = options.serverUrl || URL;
  const clientId = options.clientId || CLIENT_ID;
  intro(chalk.redBright("Auth Cli Login"));

  //TOKEN MANAGEMENT UTILS
  const existingToken = await getStoredToken;
  const expired = await isTokenExpired;

  if (existingToken && !expired) {
    const shouldReAuth = await confirm({
      message: "You are already loggedIn. Do You Want to login Again?",
      initialValue: false,
    });

    if (isCancel(shouldReAuth) || !shouldReAuth) {
      cancel("Login Cancelled");
      process.exit(0);
    }
  }

  //creating auth client for that we need plugins and base url
  const authClient = createAuthClient({
    baseUrl: serverUrl,
    plugins: [deviceAuthorizationClient()],
  });

  const spinner = yoctoSpinner({ text: "Requesting device authorization..." });
  spinner.start();

  try {
    //Request device code
    const { data, error } = await authClient.device.code({
      client_id: clientId,
      scope: "openid profile email",
    });

    spinner.stop();

    if (error || !data) {
      //we got logger from plugin
      logger.error(
        `Failed to Request device authorization : ${
          error?.error_description || error?.message || "Unknown error"
        }`
      );

      if (error?.status === 404) {
        console.log(chalk.red("\n❌ Device authorization endpoint not found."));
        console.log(chalk.yellow("   Make sure your auth server is running."));
      } else if (error?.status === 400) {
        console.log(
          chalk.red("\n❌ Bad request - check your CLIENT_ID configuration.")
        );
      }
      process.exit(1);
    }
    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      interval = 5,
      expires_in,
    } = data;

    //Display authorization instructions
    console.log("");
    console.log(chalk.cyanBright("📱 Device Authorization Required"));
    console.log("");
    console.log(
      `Please visit: ${chalk.underline.blue(
        verification_uri_complete || verification_uri
      )}`
    );

    console.log(`Enter code : ${chalk.bold.green(user_code)}`);
    console.log("");

    //Ask if user wants to open browser
    const shouldOpen = await confirm({
      message: "open browser automatically?",
      initialValue: true,
    });

    if (!isCancel(shouldOpen) && shouldOpen) {
      const urlToOpen = verification_uri_complete || verification_uri;
      await open(urlToOpen);
    }

    console.log(
      chalk.gray(
        `Waiting for authorization (expires in ${Math.floor(
          expires_in / 60
        )}minutes)...`
      )
    );

    
    //getting the token
    const token = await pollForToken(
      authClient,
      device_code,
      clientId,
      interval
    );

    if (token) {
      //store the token
      const saved = await storeToken(token);

      if (!saved) {
        console.log(
          chalk.yellow("\n⚠️  Warning: Could not save authentication token.")
        );
        console.log(chalk.yellow(" You May need to login again on next use."));
      }

      //Get user Info
      const { data: session } = await authClient.getSession({
        fetchOptions: {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        },
      });

      outro(
        chalk.green(
          `✅ Login successful! Welcome ${
            session?.user?.name || session?.user?.email || "User"
          }`
        )
      );
      console.log(chalk.gray(`\n📁 Token saved to: ${TOKEN_FILE}`));
      console.log(
        chalk.gray("  You can now use AI Commands without logging in again.\n")
      );
    }
  } catch (err) {
    spinner.stop();
    console.error(chalk.red("\nLogin failed:"), err.message);
    process.exit(1);
  }
}

async function pollForToken(authClient, deviceCode, clientId, initialInterval) {
  let pollingInterval = initialInterval;
  const spinner = yoctoSpinner({ text: "", color: "cyan" });
  let dots = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      dots = (dots + 1) % 4;
      spinner.text = chalk.gray(
        `Polling for authorization${".".repeat(dots)}${" ".repeat(3 - dots)}`
      );
      if (!spinner.isSpinning) spinner.start();
      try {
        const { data, error } = await authClient.device.token({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
          client_id: clientId,
          fetchOptions: {
            headers: {
              "user-agent": `Better Auth CLI`,
            },
          },
        });

        if (data?.access_token) {
          console.log(
            chalk.bold.yellow(`Your access token: ${data.access_token}`)
          );
          spinner.stop();
          resolve(data);
          return;
        } else if (error) {
          switch (error.error) {
            case "authorization_pending":
              // Continue polling
              break;
            case "slow_down":
              pollingInterval += 5;
              break;
            case "access_denied":
              spinner.stop();
              logger.error("Access was denied by the user");
              process.exit(1);
              break;
            case "expired_token":
              spinner.stop();
              logger.error("The device code has expired. Please try again.");
              process.exit(1);
              break;
            default:
              spinner.stop();
              logger.error(`Error: ${error.error_description}`);
              process.exit(1);
          }
        }
      } catch (err) {
        spinner.stop();
        logger.error(`Network error: ${err.message}`);
        process.exit(1);
      }
      setTimeout(poll, pollingInterval * 1000);
    };
    setTimeout(poll, pollingInterval * 1000);
  });
}


// ============================================
// LOGOUT COMMAND
// ============================================

export async function logoutAction() {
  intro(chalk.bold("👋 Logout"));

  const token = await getStoredToken();

  if (!token) {
    console.log(chalk.yellow("You're not logged in."));
    process.exit(0);
  }

  const shouldLogout = await confirm({
    message: "Are you sure you want to logout?",
    initialValue: false,
  });

  if (isCancel(shouldLogout) || !shouldLogout) {
    cancel("Logout cancelled");
    process.exit(0);
  }

  const cleared = await clearStoredToken();

  if (cleared) {
    outro(chalk.green("✅ Successfully logged out!"));
  } else {
    console.log(chalk.yellow("⚠️  Could not clear token file."));
  }
}

// ============================================
// WHOAMI COMMAND
// ============================================

export async function whoamiAction(opts) {
  const token = await requireAuth();
  if (!token?.access_token) {
    console.log("No access token found. Please login.");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: {
          token: token.access_token,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  // Output user session info
  console.log(
    chalk.bold.greenBright(`\n👤 User: ${user.name}
📧 Email: ${user.email}
👤 ID: ${user.id}`)
  );
}

// ============================================
// COMMANDER SETUP
// ============================================

export const login = new Command("login")
  .description("Login to Better Auth")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .option("--client-id <id>", "The OAuth client ID", CLIENT_ID)
  .action(loginAction);

  export const logout = new Command("logout")
  .description("Logout and clear stored credentials")
  .action(logoutAction);

export const whoami = new Command("whoami")
  .description("Show current authenticated user")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .action(whoamiAction);