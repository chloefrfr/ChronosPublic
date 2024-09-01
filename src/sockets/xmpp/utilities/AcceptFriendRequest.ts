import { friendsService, userService } from "../../..";
import { Friends, type Friend } from "../../../tables/friends";
import { SendMessageToId } from "./SendMessageToId";

export async function acceptFriendRequest(accountId: string, friendId: string): Promise<boolean> {
  const [frienduser, friendInList, user, friend] = await Promise.all([
    friendsService.findFriendByAccountId(accountId),
    friendsService.findFriendByAccountId(friendId),
    userService.findUserByAccountId(accountId),
    userService.findUserByAccountId(friendId),
  ]);

  if (!frienduser || !friendInList || !user || !friend || user.banned || friend.banned) {
    return false;
  }

  const incomingFriendsIndex = frienduser.incoming.findIndex(
    (incoming) => incoming.accountId === friend.accountId,
  );
  const outgoingFriendsIndex = friendInList.outgoing.findIndex(
    (outgoing) => outgoing.accountId === user.accountId,
  );

  if (incomingFriendsIndex === -1) return false;
  if (outgoingFriendsIndex === -1) return false;

  frienduser.incoming.splice(incomingFriendsIndex, 1);
  friendInList.outgoing.splice(outgoingFriendsIndex, 1);

  const updatedAccepted: Friend[] = [];

  updatedAccepted.push({
    accountId: friend.accountId,
    createdAt: new Date().toISOString(),
    alias: "",
  });

  const friendUpdatedAccept: Friend[] = [];
  friendUpdatedAccept.push({
    accountId: user.accountId,
    createdAt: new Date().toISOString(),
    alias: "",
  });

  await Friends.createQueryBuilder()
    .update()
    .set({ accepted: updatedAccepted, incoming: frienduser.incoming })
    .where("accountId = :accountId", { accountId: frienduser.accountId })
    .execute();

  SendMessageToId(
    JSON.stringify({
      payload: {
        accountId: friend.accountId,
        status: "ACCEPTED",
        direction: "OUTBOUND",
        created: new Date().toISOString(),
        favorite: false,
      },
      type: "com.epicgames.friends.core.apiobjects.Friend",
      timestamp: new Date().toISOString(),
    }),
    user.accountId,
  );

  await Friends.createQueryBuilder()
    .update()
    .set({ accepted: friendUpdatedAccept, outgoing: friendInList.outgoing })
    .where("accountId = :accountId", { accountId: friendInList.accountId })
    .execute();

  SendMessageToId(
    JSON.stringify({
      payload: {
        accountId: user.accountId,
        status: "ACCEPTED",
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
