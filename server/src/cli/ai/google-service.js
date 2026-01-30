import { google } from "@ai-sdk/google";
import {  streamText } from "ai";
import { config } from "../../config/google.config.js";
import chalk from "chalk";
import { generateObject } from "ai";

export class AIServices {
  constructor() {
    if (!config.googleApiKey) {
      throw new Error("Google_API_KEY is not set in env");
    }

    this.model = google(config.model, {
      apiKey: config.googleApiKey,
    });
  }

  /**
   * Send a message and get streaming response
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Function} onChunk - Callback for each text chunk
   * @param {Object} tools - Optional tools object
   * @param {Function} onToolCall - Callback for tool calls
   * @returns {Promise<Object>} Full response with content, tool calls, and usage
   */
  async sendMessage(messages, onChunk, tools = undefined, onToolCall = null) {
    try {
      tools = tools ?? {};
      const streamConfig = {
        model: this.model,
        messages: messages,
      };

      if (tools && Object.keys(tools).length > 0) {
        streamConfig.tools = tools;
        streamConfig.maxSteps = 5; //Allow upto 5 tool call steps
      }

      console.log(
        chalk.gray(`[DEBUG] Tools enabled: ${tools?Object.keys(tools).join(", "):"none"}`)
      );

      //this will give us the result
      //dont make it await because streaming need not to be await
      const result = streamText(streamConfig);

      let fullResponse = "";

      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        if (onChunk) {
          onChunk(chunk);
        }
      }

      const fullResult = result.result? await result.result:null;

      const toolCalls = [];
      const toolResults = [];

      //calling all the toolcall for all the steps
      if (fullResult?.steps && Array.isArray(fullResult.steps)) {
        for (const step of fullResult.steps) {
          if (step.toolCalls && step.toolCalls.length > 0) {
            for (const toolCall of step.toolCalls) {
              toolCalls.push(toolCall);

              if (onToolCall) {
                onToolCall(toolCall);
              }
            }
          }

          if (step.toolResults && step.toolResults.length > 0) {
            toolResults.push(...step.toolResults);
          }
        }
      }

      return {
        content: fullResponse,
        finishResponse: fullResult?.finishReason??"stop",
        usage: fullResult?.usage??null,
        toolCalls,
        toolResults,
        steps: fullResult?.steps??[],
      };
    } catch (error) {
      console.error(chalk.red("AI Service Error :"), error.message);
      throw error;
    }
  }

  /**
   * Get a non-streaming response
   * @param {Array} messages - Array of message objects
   * @param {Object} tools - Optional tools
   * @returns {Promise<string>} Response text
   */
  async getMessage(messages, tools = undefined) {
    let fullResponse = "";
    const result = await this.sendMessage(
      messages,
      (chunk) => {
        fullResponse += chunk;
      },
      tools
    );
    return result.content;
  }
  /**
   * Generate Structures output using a Zod schema
   * @param {Object} schema - Zod schema
   * @param {string} prompt - Prompt for generation
   * @returns {Promise<Object>} Parsed object matching the schema
   */
  async generateStructures(schema, prompt) {
    try {
      const result = await generateObject({
        model: this.model,
        schema: schema,
        prompt: prompt,
      });

      return result.object;
    } catch (error) {
      console.error(
        chalk.red("AI structured Generation Error:"),
        error.message
      );
      throw error;
    }
  }
}
