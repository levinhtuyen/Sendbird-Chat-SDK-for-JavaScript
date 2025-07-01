import { GroupChannel } from "@sendbird/chat/groupChannel";
import { UserMessage } from "@sendbird/chat/message";

export interface InviteUsersToChannelParams {
  channel: GroupChannel;
  userIds: string[];
}
export interface CreateChannelParams {
  channelName: string;
  userIdsToInvite: string[];
}

export interface DeleteChannelResult {
  channel: GroupChannel | null;
  error: Error | null;
}
export interface DeleteMessageParams {
  currentlyJoinedChannel: GroupChannel;
  messageToDelete: UserMessage;
}