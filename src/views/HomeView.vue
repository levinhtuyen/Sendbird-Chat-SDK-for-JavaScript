<template>
  <div class="h-screen w-screen flex relative">
    <!-- Sidebar -->
    <div class="w-[340px]">
      <div class="bg-white p-4 h-full relative overflow-hidden">
        <!-- Search -->
        <div class="mb-2">
          <div class="relative">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full  bg-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
            </div>
            <input
              v-model="searchTerm"
              aria-label="Tìm kênh"
              placeholder="Tìm theo tên khách hàng"
              class="w-full !pl-10 pr-4 py-3 rounded-full border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-100 bg-white"
            />
          </div>
        </div>
        <!-- Tabs -->
        <div class="flex items-center gap-2 mt-4 mb-2">
          <button
            @click="activeTab = 'all'"
            :class="
              activeTab === 'all'
                ? 'bg-gray-200 px-3 py-1 rounded-full text-sm font-semibold'
                : 'px-3 py-1 rounded-full text-sm'
            "
          >
            Tất cả
          </button>
          <button
            @click="activeTab = 'unread'"
            :class="
              activeTab === 'unread'
                ? 'bg-gray-200 px-3 py-1 rounded-full text-sm font-semibold'
                : 'px-3 py-1 rounded-full text-sm'
            "
          >
            Chưa đọc
          </button>
          <button
            @click="activeTab = 'read'"
            :class="
              activeTab === 'read'
                ? 'bg-gray-200 px-3 py-1 rounded-full text-sm font-semibold'
                : 'px-3 py-1 rounded-full text-sm'
            "
          >
            Đã đọc
          </button>
        </div>
        <div
          v-for="(channel, index) in displayChannelList"
          :key="channel.url"
          class="flex items-start gap-3 p-2 rounded-md transition-colors cursor-pointer hover:bg-gray-50"
          :class="[
            channel.url === selectedChannelCurrent?.url ? 'bg-gray-50' : '',
            channel.unreadMessageCount > 0 ? 'font-semibold' : ''
          ]"
          @click="changeChannel(channel)"
        >
          <div class="flex gap-2 w-full">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden text-sm font-semibold text-white"
              :class="userChat.isGender === 'male' ? 'bg-amber-400' : 'bg-gray-400'"
            >
              <img
                class="w-full h-full object-cover"
                :src="getChannelAvatar(channel)"
                width="40"
                height="40"
                alt=""
              />
            </div>
            <div class="flex-1 ">
              <div class="flex items-center justify-between gap-2">
                <div class=" font-semibold text-base line-clamp-1">
                  {{ getChannelDisplayName(channel) }}
                </div>
                <div class="text-gray-500 text-xs w-26 flex">
                  {{
                    formatTime(
                      channel?.lastMessage?.createdAt || channel.lastMessageAt
                    )
                  }}
                </div>
              </div>
              <div class="flex ">
                <div class="flex-1 min-w-0">
                  <p
                    class="text-gray-500 text-sm truncate"
                    :class="
                      channel.unreadMessageCount > 0
                        ? 'font-semibold text-gray-900'
                        : userSeen.isSeen === false &&
                          channel?.lastMessage?.message === userSeen.message
                        ? 'font-semibold text-gray-800 animate-bounce'
                        : ''
                    "
                  >
                    {{ channel?.lastMessage?.message }}
                  </p>
                </div>
                <div class="flex items-center gap-2 ml-3">
                  <div v-if="channel.unreadMessageCount > 0" class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {{ channel.unreadMessageCount }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Panel -->
    <div class="flex-1 relative flex flex-col rounded-[12px] bg-white border border-[#EAECF0]">
      <!-- Header -->
      <div class="flex items-center gap-4 p-4 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div
              class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-semibold text-sm"
              :class="userChat.isGender === 'male' ? 'bg-sky-400' : 'bg-blue-300'"
            >
              <template v-if="selectedChannelCurrent?.members?.find((m: any) => m.userId !== currentUser.currenUserId)?.profileUrl">
                <img
                  :src="selectedChannelCurrent.members.find((m: any) => m.userId !== currentUser.currenUserId)?.profileUrl"
                  alt="avatar"
                  class="w-full h-full object-cover"
                />
              </template>
              <template v-else>
                <span>
                  {{
                    (selectedChannelCurrent?.members?.find((m: any) => m.userId !== currentUser.currenUserId)?.nickname || selectedChannelCurrent?.name || "?")?.slice(0, 1)
                  }}
                </span>
              </template>
            </div>
          </div>
          <div class="flex flex-col">
            <div class="text-sm font-semibold text-gray-900">
              {{ selectedChannelCurrent ? getChannelDisplayName(selectedChannelCurrent) : getChatTitle() }}
            </div>
            <div class="text-xs text-gray-500 flex gap-2 items-center">            
              <div class="w-3 h-3 rounded-full border-2 border-white bg-green-400"></div>
              <span>{{ selectedChannelCurrent ? 'Trực tuyến' : '' }}</span>
            </div>
          </div>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <!-- Optional action buttons (status, info, more) can be placed here -->
        </div>
      </div>

      <!-- Messages -->
      <div
        ref="messagesContainer"
        class="flex-1 px-6 py-6 space-y-6 overflow-y-auto overflow-x-hidden bg-white mb-24"
      >
        <div class="">
          <div v-for="(msg, idx) in messages" :key="idx" class="w-full">
            <!-- date divider -->
            <div v-if="showDateDivider(idx)" class="flex justify-center mb-2">
              <div class="bg-gray-100 rounded-full px-3 py-1 text-xs text-gray-500">
                {{ formatDividerDate(msg.createdAt) }}
              </div>
            </div>

            <div
              class="flex items-end gap-2 w-full"
              :class="msg?.sender?.userId === currentUser.currenUserId ? 'justify-end' : 'justify-start'"
            >
            <!-- Avatar -->
            <!-- Avatar (Right) -->
            <div
              v-if="
                msg.sender?.userId === 'unknown' ||
                msg?.sender?.userId !== currentUser?.currenUserId
              "
              class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ml-2"
              :class="
                msg.sender === selectedChannelCurrent?.currenUserId
                  ? 'bg-amber-400'
                  : 'bg-gray-400'
              "
            >
              {{
                msg.sender?.nickname !== ""
                  ? msg.sender?.nickname?.slice(0, 1)
                  : msg.sender?.userId.slice(0, 1)
              }}
            </div>
            <!-- Message bubble -->

              <div
                class="px-4 py-2 rounded-xl text-sm max-w-[70%]"
              :class="[
                msg?.sender?.userId === selectedChannelCurrent?.currenUserId
                  ? 'bg-sky-200 text-sky-900'
                  : 'bg-white text-gray-900 shadow',
                !isImage(msg) && !isPdf(msg) && !isOtherFile(msg) ? 'shadow' : ''
              ]"
            >
              <p class="flex pb-1 text-gray-400">
                {{ msg.sender?.nickname ?? msg.sender?.userId }}
              </p>
              <div v-if="isImage(msg)">
                <img :src="msg.url" class="max-w-[200px] rounded" />
              </div>

              <template v-else-if="isPdf(msg)">
                <a
                  :href="(msg as any).url"
                  target="_blank"
                  class="text-blue-500 underline"
                >
                  📄 PDF file - Download
                </a>
              </template>

              <template v-else-if="isOtherFile(msg)">
                <a :href="(msg as any).url" target="_blank" class="text-blue-500">
                  📎 {{ (msg as any).name || "Download file" }}
                </a>
              </template>
              <div v-else>
                <!-- booking card: detect if message contains booking code (#digits) and 'Phòng' keyword -->
                <template v-if="isBookingMessage(msg)">
                  <div class="bg-gray-50 rounded-md p-3 border border-gray-200">
                    <div class="text-xs text-gray-500">{{ extractBookingHeader(msg) }}</div>
                    <div class="mt-2 text-sm text-gray-700">{{ extractBookingDetails(msg) }}</div>
                  </div>
                </template>
                <template v-else>
                  <p>{{ msg?.message }}</p>
                </template>
                <!-- Show warning if message contains the sanitized marker '***' -->
                <p
                  v-if="messageHasViolation(msg)"
                  class="text-xs text-red-600 mt-1 font-semibold"
                >
                  ⚠️ Bạn đã vi phạm quy tắc ứng xử
                </p>
              </div>
              <p
                class="text-xs text-gray-500 mt-1"
                style="line-break: anywhere"
                :class="
                  msg?.sender?.userId === currentUser.currenUserId
                    ? 'text-right'
                    : 'text-left'
                "
              >
                {{
                  new Date(msg?.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </p>
            </div>
          </div>
          <div ref="bottomAnchor"></div>
          <!-- điểm cuộn tới -->
        </div>
      </div>
      <!-- Input -->
      <div class="p-4 w-full absolute  bottom-0 right-0">
        <div class="w-full">
          <div class="flex items-center border border-blue-300 rounded-full px-4 py-2 bg-white w-full shadow-sm">
            <input
              v-model="message"
              type="text"
              :disabled="isPendingChat"
              placeholder="Nhập tin nhắn..."
              class="flex-1 text-sm text-gray-600 focus:outline-none placeholder-gray-400 bg-transparent px-2 py-1"
              @keydown.enter="sendMessageToChannel"
            />
            <input
              v-if="!isPendingChat"
              type="file"
              ref="fileInput"
              class="hidden"
              @change="onFileChange"
            />
            <!-- <button
              v-if="!isPendingChat"
              @click="triggerFileInput"
              class="!px-0"
            >
              <img
                width="30"
                height="30"
                src="@/assets/choosefile.png"
                alt=""
              />
            </button> -->
            <div
              v-if="!isPendingChat"
              @click="sendMessageToChannel"
              class="w-9 h-9 flex items-center justify-center text-blue-500"
            >
              <img
                width="16"
                height="16"
                class="hover:scale-110 transition-transform cursor-pointer"
                src="@/assets/send.svg"
                alt=""
              />
            </div>
            <img
              v-else
              width="30"
              height="30"
              src="@/assets/loading_2.gif"
              alt=""
            />
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  connectSendbird,
  createOrGet1on1Channel,
  getAndOpenChannel,
  // registerMessageListener ,
  initSendbird,
  isPendingChat,
  listenToNewChannels,
  loadMessages,
  markChannelAsRead,
  registerMessageHandler,
  sanitizeMessage,
  sendFileMessage,
  sendFileSuccess,
  sendMessageListener,
} from "../lib/sendbirdClient";

const channelList = ref<any>([]);
const sortedChannelList = ref<any>([]);
const searchTerm = ref("");
const activeTab = ref<"all" | "unread" | "read">("all");
const unreadChannelUrls = ref<string[]>([]);
const route = useRoute();
const hotelAvatar = new URL("../assets/avatar_hotel.svg", import.meta.url).href;
const profileMale = new URL("../assets/profile_male.svg", import.meta.url).href;
const profileFemale = new URL("../assets/profile_female.svg", import.meta.url).href;
const profileNone = new URL("../assets/profile_none.svg", import.meta.url).href;

const userSeen = ref({
  message: "",
  isSeen: true,
  channelUrl: "",
});
const router = useRouter();
const currentUser = ref<any>({
  currenUserId: route.query.currenUserId,
  currentUserNickname: route.query.currentUserNickname,
});
const userChat = ref<any>({
  userChatId: route.query.userChatId,
  userChatNickname: route.query.userChatNickname,
  isUser: route.query.isUser === "true" ? true : false,
});
watch(sendFileSuccess, (newVal) => {
  sendMessageToChannel();
  setTimeout(() => {
    scrollToBottom();
  }, 1000);
});
const fileInput = ref<HTMLInputElement | null>(null);
const selectedChannelCurrent = ref();
const updateRouterQuery = (channel: any) => {
  let memberDif = channel.members.filter((member: any) => {
    if (
      member.userId !== currentUser.value.currenUserId &&
      member.userId !== "undefined"
    ) {
      return member;
    }
  });
  userChat.value.userChatId = memberDif[0]?.userId;
  userChat.value.userChatNickname = memberDif[0]?.nickname;
  router.replace({
    name: route.name,
    query: {
      currenUserId: route.query?.currenUserId,
      currentUserNickname: route.query?.currentUserNickname,
      userChatId: memberDif[0]?.userId,
      userChatNickname: memberDif[0]?.nickname,
      isUser: route.query?.isUser,
    },
  });
};
const changeChannel = async (channel: any, shouldUpdateUrl = true) => {
  selectedChannelCurrent.value = channel;
  // Mark channel as read when user opens it
  try {
    await markChannelAsRead(channel);
    channel.unreadMessageCount = 0;
    sortChannels();
  } catch (err) {
    console.warn("Failed to mark as read:", err);
  }
  if (channel.url === userSeen.value.channelUrl) {
    userSeen.value.isSeen = true;
    userSeen.value.message = "";
    userSeen.value.channelUrl = "";
  }

  // Only update URL when user manually clicks on a channel (not on initial load)
  if (shouldUpdateUrl) {
    await updateRouterQuery(channel);
  }

  // Only connect if userId is valid
  if (
    currentUser.value.currenUserId &&
    currentUser.value.currenUserId !== "undefined"
  ) {
    await connectToUser(currentUser.value.currenUserId);
  }

  // Open channel and load messages
  await openChannel();
  scrollToBottom();
};

const message = ref("");
const messages = ref<any[]>([]);
const keyReload = ref(0);
const connected = ref(false);
const channelReady = ref(false);
const channelName = ref("");
const channelUrlCurren = ref("");

// Get chat title based on isUser value
const getChatTitle = () => {
  if (!selectedChannelCurrent.value?.name && !userChat.value.userChatNickname) {
    return "Select User";
  }

  const nickname =
    userChat.value.userChatNickname ||
    getChannelDisplayName(selectedChannelCurrent.value);
  if (userChat.value.isUser) {
    return `Chat với người dùng ${nickname}`;
  } else {
    return `Chat với khách sạn ${nickname}`;
  }
};

const getChannelDisplayName = (channel: any) => {
  if (!channel) return "Unknown";
  if (channel.name) return channel.name;
  // Fallback to member nickname
  const other = channel.members?.find(
    (m: any) => m.userId !== currentUser.value.currenUserId
  );
  return other?.nickname || other?.userId || channel.url || "Unknown";
};

const getChannelAvatar = (channel: any) => {
  if (!channel) return "";
  // If the conversation is in 'hotel' mode (not user), show hotel avatar
  if (userChat.value.isUser === false) {
    return hotelAvatar;
  } else {
    if (userChat.value.isGender === "male") {
      return profileMale;
    } else if (userChat.value.isGender === "female") {
      return profileFemale;
    } else {
      return profileNone;
    }
  }
};

const connectToUser = async (userId: string) => {
  try {
    await connectSendbird(userId);
    connected.value = true;
  } catch (err) {
    console.error("❌ Kết nối thất bại:", err);
  }
};
const triggerFileInput = () => {
  fileInput.value?.click();
};

const onFileChange = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    let fileSuccess = await sendFileMessage(file);
    if (fileSuccess) {
      // Tải lại tin nhắn để hiển thị tệp đã gửi
      setTimeout(async () => {
        const oldMsgs = await loadMessages();
        messages.value = oldMsgs.reverse();
        keyReload.value += 1; // Tăng key để buộc Vue cập nhật
        // Cuộn xuống cuối để hiển thị tin nhắn mới
      }, 1000);
      scrollToBottom();
    } else {
      console.error("Gửi tệp không thành công");
    }
  }
};

const openChannel = async () => {
  // Use current userChat values (may be updated when clicking different channels)
  let paramsUser = {
    currenUserId: currentUser.value.currenUserId,
    currentUserNickname: currentUser.value.currentUserNickname,
    userChatId: userChat.value.userChatId,
    userChatNickname: userChat.value.userChatNickname,
  };

  if (!selectedChannelCurrent.value?.url) {
    console.warn("No channel selected");
    return;
  }

  try {
    const channelInfo = await getAndOpenChannel(
      selectedChannelCurrent.value,
      paramsUser
    );
    channelName.value = channelInfo.name;
    channelUrlCurren.value = channelInfo.channelUrl;
    const oldMsgs = await loadMessages();
    messages.value = oldMsgs.reverse();
    console.log("messages :>> ", messages);
    channelReady.value = true;
    // Ensure channel is marked read and unread count reset
    try {
      await markChannelAsRead(selectedChannelCurrent.value);
      selectedChannelCurrent.value.unreadMessageCount = 0;
    } catch (err) {
      // ignore
    }
    scrollToBottom();
  } catch (err) {
    console.error(" Mở channel lỗi:", err);
  }
};

const sendMessageToChannel = async () => {
  if (!message.value.trim()) return;
  if (!channelReady.value) {
    console.warn("Channel is not ready");
    return;
  }
  try {
    const messageText = message.value;
    if (!messageText.trim()) return;
    // Sanitize message both for sending and for UI preview
    const sanitizedMessage = sanitizeMessage(messageText);
    message.value = ""; // Clear input immediately
    await sendMessageListener(sanitizedMessage);
    // Update UI quickly: set lastMessage and reset unread for selected channel
    try {
      if (selectedChannelCurrent.value) {
        selectedChannelCurrent.value.lastMessage = {
          message: sanitizedMessage,
          createdAt: Date.now(),
        };
        selectedChannelCurrent.value.unreadMessageCount = 0;
        // find in channelList and update
        const idx = channelList.value.findIndex(
          (c: any) => c.url === selectedChannelCurrent.value.url
        );
        if (idx >= 0) {
          channelList.value[idx].lastMessage = {
            message: sanitizedMessage,
            createdAt: Date.now(),
          };
          channelList.value[idx].unreadMessageCount = 0;
        }
      }
    } catch (err) {
      // ignore
    }
    // Messages reloaded in sendMessageListener via reloadMessagesNow
    scrollToBottom();
  } catch (err) {
    console.error(" Gửi lỗi:", err);
  }
};
const getAllChannelForUserid = async () => {
  const result = await createOrGet1on1Channel(
    currentUser.value.currenUserId,
    currentUser.value.currentUserNickname,
    userChat.value.userChatId,
    userChat.value.userChatNickname
  );

  if (!result) {
    console.warn("Failed to get/create channel");
    return;
  }

  channelList.value = result.channels || [];
  // Ensure every channel has a display name (to avoid missing name on UI)
  channelList.value.forEach((ch: any) => {
    if (!ch.name) ch.name = getChannelDisplayName(ch);
  });
  // Load unread counts for each channel
  await Promise.all(
    channelList.value.map(async (ch: any) => {
      try {
        // `getUnreadMessageCount` expects a GroupChannel; if channel is serialised object this may not work
        // Try to use `unreadMessageCount` from the object or fallback to 0
        const localCount = ch.unreadMessageCount ?? 0;
        ch.unreadMessageCount = localCount;
      } catch (e) {
        ch.unreadMessageCount = ch.unreadMessageCount ?? 0;
      }
    })
  );
  // Sort after setting unread counts
  sortChannels();
  console.log("channelList.value :>> ", channelList.value);

  if (channelList.value?.length) {
    // If we have a target channel from query params, use it
    if (result.targetChannel) {
      selectedChannelCurrent.value = result.targetChannel;
    } else {
      // Otherwise find channel matching userChatId or use first channel
      const channel = channelList.value.find((channel: any) => {
        const memberIds = channel.members.map((m: any) => m.userId);
        return (
          channel.memberCount === 2 &&
          memberIds.includes(currentUser.value.currenUserId) &&
          memberIds.includes(userChat.value.userChatId)
        );
      });
      selectedChannelCurrent.value = channel || channelList.value[0];
    }

    await changeChannel(selectedChannelCurrent.value, false); // Don't update URL on initial load
  }

  // Register message handler for real-time updates (only once)
  registerMessageHandler(
    async () => {
      const oldMsgs = await loadMessages();
      messages.value = oldMsgs.reverse();
      keyReload.value += 1;

      // Also refresh channel list to update last message preview and unread counts
      const result = await createOrGet1on1Channel(
        currentUser.value.currenUserId,
        currentUser.value.currentUserNickname,
        userChat.value.userChatId,
        userChat.value.userChatNickname
      );
      if (result?.channels) {
        channelList.value = result.channels;
        // ensure name and unread count for each channel
        channelList.value.forEach((ch: any) => {
          if (!ch.name) ch.name = getChannelDisplayName(ch);
          ch.unreadMessageCount = ch.unreadMessageCount || 0;
        });
        sortChannels();
      }

      setTimeout(() => {
        scrollToBottom();
      }, 300);
    },
    async (channel, message) => {
      // Inbox update callback - update channel last message preview and unread count
      try {
        const channelUrl = channel.url;
        // Find in list
        const idx = channelList.value.findIndex(
          (c: any) => c.url === channelUrl
        );
        if (idx >= 0) {
          // Update last message preview and unread count
          channelList.value[idx].lastMessage = message || channel.lastMessage;
          channelList.value[idx].unreadMessageCount =
            channel.unreadMessageCount !== undefined &&
            channel.unreadMessageCount !== null
              ? channel.unreadMessageCount
              : (channelList.value[idx].unreadMessageCount || 0) + 1;
          // Move to top
          const updated = channelList.value.splice(idx, 1)[0];
          channelList.value.unshift(updated);
        } else {
          // Prepend new channel
          channel.unreadMessageCount = channel.unreadMessageCount ?? 1;
          if (!channel.name) channel.name = getChannelDisplayName(channel);
          channelList.value.unshift(channel);
        }
        sortChannels();
        // Update userSeen so the UI can highlight the preview of the channel with unread messages
        if (userSeen.value.channelUrl !== channel.url) {
          userSeen.value.isSeen = false;
          userSeen.value.message = channel.lastMessage?.message || "";
          userSeen.value.channelUrl = channel.url;
        }
      } catch (err) {
        console.warn("Inbox update failed", err);
      }
    }
  );
};
const onNewMessage = async (channel: any, message: any) => {
  // This is now only called for channel-level events, not message events
  console.log("Channel event - channel:", channel);
  try {
    if (channel.url !== selectedChannelCurrent.value?.url) {
      userSeen.value.isSeen = false;
      userSeen.value.message = channel.lastMessage?.message;
      userSeen.value.channelUrl = channel.url;
      // Find channel in list and update preview & unread
      const idx = channelList.value.findIndex(
        (c: any) => c.url === channel.url
      );
      if (idx >= 0) {
        channelList.value[idx].lastMessage = message || channel.lastMessage;
        channelList.value[idx].unreadMessageCount =
          channel.unreadMessageCount !== undefined &&
          channel.unreadMessageCount !== null
            ? channel.unreadMessageCount
            : channelList.value[idx].unreadMessageCount || 0;
        // Move to top
        const updated = channelList.value.splice(idx, 1)[0];
        channelList.value.unshift(updated);
      } else {
        // Prepend as new channel
        channel.unreadMessageCount = channel.unreadMessageCount ?? 1;
        if (!channel.name) channel.name = getChannelDisplayName(channel);
        channelList.value.unshift(channel);
      }
      sortChannels();
    }
  } catch (err) {
    console.warn("onNewMessage event error:", err);
  }
};

const onNewChannel = () => {
  console.log("Có kênh mới liên quan tới bạn :>> ");
  // Khi có kênh mới, refresh danh sách channel
  setTimeout(async () => {
    try {
      const result = await createOrGet1on1Channel(
        currentUser.value.currenUserId,
        currentUser.value.currentUserNickname,
        userChat.value.userChatId,
        userChat.value.userChatNickname
      );
      if (result?.channels) {
        channelList.value = result.channels;
        channelList.value.forEach((ch: any) => {
          if (!ch.name) ch.name = getChannelDisplayName(ch);
          ch.unreadMessageCount = ch.unreadMessageCount || 0;
        });
        sortChannels();
      }
    } catch (err) {
      console.warn("Error refreshing channels on new channel:", err);
    }
  }, 400);
};
// onBeforeMount trước khi khởi tạo DOM
onBeforeMount(async () => {
  const userId = currentUser.value.currenUserId;
  const nickname = currentUser.value.currentUserNickname;

  if (!userId || userId === "undefined") {
    console.warn(
      "Missing currenUserId in query params. Please provide currenUserId."
    );
    return;
  }

  initSendbird(userId, nickname || userId)
    .then((sb) => {})
    .catch((err) => {
      console.error("Error initializing Sendbird:", err);
    });
});

// onMounted sau khi khởi tạo DOM
onMounted(async () => {
  setTimeout(async () => {
    await getAllChannelForUserid();
  }, 500);
  listenToNewChannels(onNewMessage, onNewChannel);
  // registerMessageListener((channel, message) => {
  //   unreadChannelUrls.value.push(channel.url);
  //   console.log('unreadChannelUrls.value :>> ', unreadChannelUrls.value);
  //   if (message.isUserMessage?.()) {
  //     console.log('message component :>> ', message);
  //   } else if (message.isFileMessage?.()) {

  //   }
  // })
});
const bottomAnchor = ref<HTMLElement | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);
const isImage = (msg: any) => {
  return (
    msg &&
    typeof msg === "object" &&
    "url" in msg &&
    typeof msg.type === "string" &&
    msg.type.startsWith("image")
  );
};
const isPdf = (msg: any) => {
  return (
    msg &&
    typeof msg === "object" &&
    "url" in msg &&
    typeof msg.type === "string" &&
    msg.type === "application/pdf"
  );
};
const isOtherFile = (msg: any) => {
  return (
    msg &&
    typeof msg === "object" &&
    "url" in msg &&
    typeof msg.type === "string" &&
    !msg.type.startsWith("image") &&
    msg.type !== "application/pdf"
  );
};
// Check if a message contains sanitized marker '***' (used to signal replacements of profanity)
function messageHasViolation(msg: any) {
  if (!msg) return false;
  const text = typeof msg === "string" ? msg : msg?.message;
  if (!text || typeof text !== "string") return false;
  return text.includes("***");
}
const formatTime = (ts: number | undefined | null) => {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "";
  }
};

// Show a date divider between messages when days change
const showDateDivider = (idx: number) => {
  if (idx === 0) return true;
  const cur = messages.value?.[idx];
  const prev = messages.value?.[idx - 1];
  if (!cur || !prev) return true;
  const curDate = new Date(cur.createdAt).setHours(0, 0, 0, 0);
  const prevDate = new Date(prev.createdAt).setHours(0, 0, 0, 0);
  return curDate !== prevDate;
};

// Format the divider label (Hôm nay, Hôm qua or date)
const formatDividerDate = (ts: number | string | undefined | null) => {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hôm nay";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Booking message detection and parsing helpers
const isBookingMessage = (msg: any) => {
  if (!msg || !msg.message) return false;
  return /#\d{4,}/.test(msg.message) && /Phòng/i.test(msg.message);
};

const extractBookingHeader = (msg: any) => {
  if (!msg || !msg.message) return "";
  const text = msg.message as string;
  const codeMatch = text.match(/#\d{4,}/);
  const roomMatch = text.match(/Phòng\s*([^.,\n]+)/i);
  const code = codeMatch ? codeMatch[0] : "";
  const room = roomMatch ? roomMatch[1].trim() : "";
  let parts: string[] = [];
  if (code) parts.push(code);
  if (room) parts.push(room);
  return parts.join(" • ");
};

const extractBookingDetails = (msg: any) => {
  if (!msg || !msg.message) return "";
  const text = msg.message as string;
  // Try to extract times and date
  const dtMatch = text.match(/(\d{1,2}:\d{2})\s*[-→–]\s*(\d{1,2}:\d{2})[,\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dtMatch) {
    return `${dtMatch[1]} → ${dtMatch[2]}, ${dtMatch[3]}`;
  }
  // fallback: look for date-like fragments
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dateMatch) return dateMatch[0];
  return "";
};

const displayChannelList = computed(() => {
  const term = (searchTerm.value || "").toLowerCase();
  let list = sortedChannelList.value || [];
  if (activeTab.value === "unread") {
    list = list.filter((c: any) => (c.unreadMessageCount || 0) > 0);
  } else if (activeTab.value === "read") {
    list = list.filter((c: any) => (c.unreadMessageCount || 0) === 0);
  }
  if (term) {
    list = list.filter((c: any) =>
      (getChannelDisplayName(c) || "").toLowerCase().includes(term)
    );
  }
  return list;
});

const sortChannels = () => {
  // Sắp xếp channels: unreadMessageCount desc, sau đó theo last message time desc
  const sorted = [...channelList.value].sort((a, b) => {
    const aUnread = a.unreadMessageCount ?? 0;
    const bUnread = b.unreadMessageCount ?? 0;
    if (aUnread !== bUnread) return bUnread - aUnread;
    const aTime = a?.lastMessage?.createdAt || a.lastMessageAt || 0;
    const bTime = b?.lastMessage?.createdAt || b.lastMessageAt || 0;
    return bTime - aTime;
  });
  sortedChannelList.value = sorted;
};

// Watch channelList to re-sort
watch(
  () => channelList.value,
  () => {
    sortChannels();
  },
  { deep: true }
);

const scrollToBottom = () => {
  nextTick(() => {
    const el = bottomAnchor.value ?? messagesContainer.value;
    if (!el) return;
    // Prefer scrollIntoView; if not available, fallback to setting scrollTop
    const scrollFn: any = (el as any)?.scrollIntoView;
    if (typeof scrollFn === "function") {
      scrollFn.call(el, { behavior: "smooth" });
      return;
    }
    // Fallback for message container: set scrollTop
    if ((messagesContainer.value as any)?.scrollTop !== undefined) {
      const c = messagesContainer.value as HTMLElement;
      c.scrollTop = c.scrollHeight;
    }
  });
};

const unreadCount = computed(() => {
  return channelList.value.reduce(
    (acc: number, ch: any) => acc + ((ch.unreadMessageCount || 0) > 0 ? 1 : 0),
    0
  );
});
const readCount = computed(() => {
  const total = channelList.value?.length ?? 0;
  return Math.max(0, total - (unreadCount.value ?? 0));
});
</script>

<style scoped>
.chat-container {
  max-width: 500px;
  margin: auto;
  padding: 16px;
}
.messages {
  border: 1px solid #ccc;
  padding: 10px;
  max-height: 300px;
  overflow-y: auto;
  margin: 12px 0;
  background: #f9f9f9;
}
.input-box {
  display: flex;
  gap: 8px;
}
input {
  flex: 1;
  padding: 6px;
}
button {
  padding: 6px 12px;
}
</style>
