import { friendsService, userService } from "../../..";
import { Friends, type Friend } from "../../../tables/friends";
import { SendMessageToId } from "./SendMessageToId";

export async function sendFriendRequest(accountId: string, friendId: string): Promise<boolean> {
  const [frienduser, friendInList, user, friend] = await Promise.all([
    friendsService.findFriendByAccountId(accountId),
    friendsService.findFriendByAccountId(friendId),
    userService.findUserByAccountId(accountId),
    userService.findUserByAccountId(friendId),
  ]);

  if (!frienduser || !friendInList || !user || !friend || user.banned || friend.banned) {
    return false;
  }

  const updatedOutgoing: Friend[] = [];
  updatedOutgoing.push({
    accountId: friend.accountId,
    createdAt: new Date().toISOString(),
    alias: "",
  });

  await Friends.createQueryBuilder()
    .update()
    .set({ outgoing: updatedOutgoing })
    .where("accountId = :accountId", { accountId: frienduser.accountId })
    .execute();

  const updatedIncoming: Friend[] = [];
  updatedIncoming.push({
    accountId: user.accountId,
    createdAt: new Date().toISOString(),
    alias: "",
  });

  await Friends.createQueryBuilder()
    .update()
    .set({ incoming: updatedIncoming })
    .where("accountId = :accountId", { accountId: friendInList.accountId })
    .execute();

  SendMessageToId(
    JSON.stringify({
      payload: {
        accountId: friend.accountId,
        status: "PENDING",
        direction: "OUTBOUND",
        created: new Date().toISOString(),
        favorite: false,
      },
      type: "com.epicgames.friends.core.apiobjects.Friend",
      timestamp: new Date().toISOString(),
    }),
    user.accountId,
  );

  SendMessageToId(
    JSON.stringify({
      payload: {
        accountId: user.accountId,
        status: "PENDING",
        direction: "INBOUND",
        created: new Date().toISOString(),
        favorite: false,
      },
      type: "com.epicgames.friends.core.apiobjects.Friend",
      timestamp: new Date().toISOString(),
    }),
    friend.accountId,
  );

  return true;
}
