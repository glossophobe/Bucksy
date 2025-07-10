import { GuildMember, TextChannel, EmbedBuilder } from "discord.js";
import { BucksyClient } from "../types";
import * as config from "../../config.json";

/**
 * Sends a welcome message to a new guild member
 * @param member The new guild member
 * @param client The bot client
 */
export const sayHello = async (
  member: GuildMember,
  client: BucksyClient,
): Promise<void> => {
  try {
    const guild = member.guild;

    // Get the system channel or a designated welcome channel
    const welcomeChannelId = config.channels.admin?.id || guild.systemChannelId;
    if (!welcomeChannelId) {
      console.error("No welcome channel found");
      return;
    }

    const welcomeChannel = guild.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel || !welcomeChannel.isTextBased()) {
      console.error("Welcome channel not found or not a text channel");
      return;
    }

    // Create a welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`Welcome to ${guild.name}!`)
      .setDescription(
        `Hey ${member}, welcome to the server! We're glad to have you here.`,
      )
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        {
          name: "Member Count",
          value: `You are member #${guild.memberCount}!`,
          inline: true,
        },
        {
          name: "Getting Started",
          value:
            "Check out the rules and introduction channels to get started.",
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({
        text: `${client.user?.username}`,
        iconURL: client.user?.displayAvatarURL(),
      });

    // Send the welcome message
    await (welcomeChannel as TextChannel).send({ embeds: [welcomeEmbed] });

    // Try to send a DM to the new member
    try {
      await member.send(
        `Welcome to ${guild.name}! We're glad to have you here. If you have any questions, feel free to ask in the server.`,
      );
    } catch (error) {
      console.log(`Could not send DM to ${member.user.tag}`);
    }

    console.info(`Sent welcome message to ${member.user.tag}`);
  } catch (error) {
    console.error("Error sending welcome message:", error);
  }
};

/**
 * Sends a goodbye message when a member leaves the guild
 * @param member The member who left
 * @param client The bot client
 */
export const sayGoodbye = async (
  member: GuildMember,
  client: BucksyClient,
): Promise<void> => {
  try {
    const guild = member.guild;

    // Get the system channel or a designated goodbye channel
    const goodbyeChannelId =
      config.channels.felicia?.id || guild.systemChannelId;
    if (!goodbyeChannelId) {
      console.error("No goodbye channel found");
      return;
    }

    const goodbyeChannel = guild.channels.cache.get(goodbyeChannelId);
    if (!goodbyeChannel || !goodbyeChannel.isTextBased()) {
      console.error("Goodbye channel not found or not a text channel");
      return;
    }

    // Create a goodbye embed
    const goodbyeEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("A Member Has Left")
      .setDescription(`${member.user.tag} has left the server. We'll miss you!`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({
        text: `${client.user?.username}`,
        iconURL: client.user?.displayAvatarURL(),
      });

    // Send the goodbye message
    await (goodbyeChannel as TextChannel).send({ embeds: [goodbyeEmbed] });

    console.info(`Sent goodbye message for ${member.user.tag}`);
  } catch (error) {
    console.error("Error sending goodbye message:", error);
  }
};
