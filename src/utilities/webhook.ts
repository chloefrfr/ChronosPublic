import { config } from "..";

export namespace DiscordWebhook {
  export function SendBackendRestartWebhook() {
    fetch(config.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title: "Our Backend Services have restarted!",
            description:
              "All of our services have restarted! **Please restart your game if necessary!**",
            color: 0x7289da,
          },
        ],
      }),
    });
  }
}
