import { TextChannel } from "discord.js";
import { BucksyClient } from "../types";
import * as config from "../../config.json";
import * as cron from "cron";
import axios from "axios";
import * as DatabaseController from "./database";

// Store the cron job
let qotdJob: cron.CronJob | null = null;

/**
 * Fetches a random question from Reddit's AskReddit
 * @returns A random question
 */
async function fetchRandomQuestion(): Promise<string> {
  try {
    // Fetch top posts from AskReddit
    const response = await axios.get(
      "https://www.reddit.com/r/AskReddit/top.json?limit=25&t=day",
    );

    if (response.status !== 200) {
      throw new Error(`Failed to fetch questions: ${response.status}`);
    }

    const posts = response.data.data.children;

    // Filter out posts that are not questions
    const questions = posts.filter((post: any) => {
      const title = post.data.title;
      return (
        title.endsWith("?") && !title.includes("NSFW") && !post.data.over_18
      );
    });

    if (questions.length === 0) {
      return "What is your favorite Pokémon and why?";
    }

    // Try to find an unused question
    for (let i = 0; i < questions.length; i++) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      const question = questions[randomIndex].data.title;

      // Check if question has been used before
      const exists = await DatabaseController.questionExists(question);
      if (!exists) {
        // Add the question to the database
        await DatabaseController.addQuestion(question);
        return question;
      }
    }

    // If all questions have been used, return a fallback
    return "What is your favorite Pokémon and why?";
  } catch (error) {
    console.error("Error fetching question:", error);
    return "If you could have any Pokémon as a pet, which would you choose and why?";
  }
}

/**
 * Fetches a question from the database based on priority
 * @returns A question based on priority
 */
async function getQuestionFromDatabase(): Promise<string | null> {
  try {
    // First try to get the highest priority unused question
    const priorityQuestion =
      await DatabaseController.getNextQuestionByPriority();

    if (priorityQuestion) {
      // Mark the question as used
      await DatabaseController.updateQuestion(priorityQuestion._id.toString(), {
        used: true,
      });
      return priorityQuestion.text;
    }

    // If no unused questions, get all questions
    const questions = await DatabaseController.getAllQuestions();

    if (questions.length > 0) {
      // If all questions have been used, reset one random question and use it
      const randomIndex = Math.floor(Math.random() * questions.length);
      const question = questions[randomIndex];

      // Mark the question as used with a new timestamp
      await DatabaseController.updateQuestion(question._id.toString(), {
        used: true,
      });

      return question.text;
    }

    return null;
  } catch (error) {
    console.error("Error getting question from database:", error);
    return null;
  }
}

/**
 * Posts a question of the day to the designated channel
 * @param client The bot client
 */
async function postQuestion(client: BucksyClient): Promise<void> {
  try {
    // Get the guild
    const guild = client.guilds.cache.get(config.guildID);
    if (!guild) {
      console.error("Guild not found");
      return;
    }

    // Get the QOTD channel
    const channel = guild.channels.cache.get(config.channels.qotd.id);
    if (!channel || !channel.isTextBased()) {
      console.error("QOTD channel not found or not a text channel");
      return;
    }

    // First try to get a question from the database
    let question = await getQuestionFromDatabase();

    // If no question is found in the database, fetch one from Reddit
    if (question) {
      question.used = true;
      await updateQuestionInDatabase(question);
    } else {
      question = await fetchRandomQuestion();
    }

    // Post the question
    await (channel as TextChannel).send(`**Question of the Day**: ${question}`);

    console.log("Posted Question of the Day");
  } catch (error) {
    console.error("Error posting Question of the Day:", error);
  }
}

/**
 * Starts the Question of the Day feature
 * @param client The bot client
 */
export const start = async (client: BucksyClient): Promise<void> => {
  try {
    console.log("Starting Question of the Day...");

    // Stop existing job if it exists
    if (qotdJob) {
      qotdJob.stop();
    }

    // Create a new cron job to post a question every day at the configured time
    qotdJob = new cron.CronJob(
      config.qotdTime,
      () => postQuestion(client),
      null,
      true,
      config.qotdTimezone || "America/New_York",
    );

    // Start the job
    qotdJob.start();

    console.log(
      `Question of the Day scheduled for ${config.qotdTime} (${config.qotdTimezone || "America/New_York"})`,
    );

    // Post an initial question if requested
    if (process.env.POST_INITIAL_QOTD === "true") {
      await postQuestion(client);
    }
  } catch (error) {
    console.error("Error starting Question of the Day:", error);
  }
};
