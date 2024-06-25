import { logger } from "..";

export namespace HTTPRequests {
  export async function RefreshAccount(accountId: string, username: string) {
    try {
      const response = await fetch(
        `http://127.0.0.1:5555/fortnite/profile/${accountId}/client/emptygift`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Fortnite/++Fortnite+Release-13.40-CL-34261954 Windows/10.0.22631.1.256.64bit",
          },
          body: JSON.stringify({
            offerId: "e406693aa12adbc8b04ba7e6409c8ab3d598e8c3",
            currency: "MtxCurrency",
            currencySubType: "",
            expectedTotalPrice: "0",
            gameContext: "",
            receiverAccountIds: [accountId],
            giftWrapTemplateId: "GiftBox:gb_makegood",
            personalMessage: "Thank you for playing Atlas!",
            accountId: accountId,
            playerName: username,
            receiverPlayerName: username,
          }),
        },
      );

      if (!response.ok) {
        logger.error(`HTTP Error: ${response.status} - ${response.statusText}`);
        return;
      }
    } catch (error) {
      logger.error(`Error: ${error}`);
    }
  }
}
