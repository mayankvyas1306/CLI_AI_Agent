import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";
import { config } from "../../config/google.config.js";
import chalk from "chalk";

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
      const streamConfig = {
        model: this.model,
        messages: messages,
      };

      const result = streamText(streamConfig);

      let fullResponse = "";

      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        if (onChunk) {
          onChunk(chunk);
        }
      }

      const fullResult = result;

      return {
        content: fullResponse,
        fnishedResponse: fullResult.finishReason,
        usage: fullResult.usage,
      };
    } catch (error) {
        console.error(chalk.red("AI Service Error :"),error.message);
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
    const result = await this.sendMessage(messages, (chunk) => {
      fullResponse += chunk;
    }, tools);
    return result.content;
  }

}
