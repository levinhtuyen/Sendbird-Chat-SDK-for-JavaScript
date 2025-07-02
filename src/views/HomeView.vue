<template>
  <div class="h-screen w-screen flex bg-gray-100">
     <!-- Sidebar -->
    <div class="w-[340px] bg-gray-100  p-2 space-y-4">
      <div class="bg-white rounded-lg shadow p-4 mb-4 h-full">
        <h2 class="text-xs font-bold text-gray-500 mb-2">Channel Chat</h2>
        <div
          v-for="(channel, index) in channelList"
          :key="index"
          class="flex items-center gap-1 cursor-pointer py- line-clamp-1 py-2"
          :class="channel.name === selectedUser.name ? 'font-bold': ''"
          @click="changeChannel(channel)"
        >
          <div >
            <div
            
              class="w-8 h-8 rounded-full flex items-center bg-white justify-center text-white font-semibold text-sm "
              >
               <!-- {{ channel?.name?.slice(0,1) }} -->
               <img class="rounded-full " src="https://static.sendbird.com/sample/cover/cover_13.jpg" width="26" height="26" alt="">
            </div>
          </div>
          <div class="line-clamp-1">
            {{ channel?.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Panel -->
    <div class="flex-1 flex flex-col" > 
      <!-- Header -->
      <div class="flex justify-center p-4 ">
        <button class="bg-gray-100 text-lg font-bold px-4 py-1 rounded-full text-gray-600">
          {{ selectedUser?.name ? selectedUser?.name : selectedUser?.userId || 'Select User' }}
        </button>
      </div>

      <!-- Messages -->
      <div class="flex-1 px-6 py-4 space-y-4 overflow-y-auto bg-white">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="flex items-end  gap-2"
          :class=" msg?.sender?.userId === currentUser.userId ? 'justify-end' : 'justify-start'"
        >
          <!-- Avatar -->
          <!-- Avatar (Right) -->
          <div
            v-if="msg.sender?.userId === 'unknown' || msg?.sender?.userId !== currentUser?.userId"
            class="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ml-2"
            :class="msg.sender === selectedUser.userId ? 'bg-amber-400' : 'bg-gray-400'"
          >
            {{ msg.sender?.nickname !== '' ? msg.sender?.nickname?.slice(0, 1) :  msg.sender?.userId.slice(0, 1) }}
          </div>
          <!-- Message bubble -->
          
          <div
            class="max-w-sm px-4 py-2 rounded-xl text-sm bg-white shadow"
            :class="[{
               'bg-gray-100 text-gray-900 ' : msg?.sender?.userId === selectedUser?.userId,
               'shadow': !isImage(msg) && !isPdf(msg) && !isOtherFile(msg),
           
            }]"
          >
            <p class="flex pb-1 text-gray-400">{{ msg.sender?.nickname ?? msg.sender?.userId }}</p>
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
              <a
                :href="(msg as any).url"
                target="_blank"
                class="text-blue-500"
              >
                📎 {{ (msg as any).name || 'Download file' }}
              </a>
            </template>
            <p v-else>{{ msg?.message }}</p>
            <p class="text-xs text-gray-500 mt-1" :class="msg?.sender?.userId === currentUser.userId ? 'text-right' : 'text-left'">
              {{ new Date(msg?.createdAt).toLocaleTimeString([], {  hour: '2-digit', minute: '2-digit' }) }}
            </p>
          </div>
        </div>
        <div ref="bottomAnchor"></div> <!-- điểm cuộn tới -->
      </div>
      <!-- Input -->
      <div class="p-4 w-full">
        <div class="w-full">
          <div class="flex items-center border rounded-lg px-4 py-2 bg-white w-full shadow-sm">
            <input
              v-model="message"
              type="text"
              :disabled="isPendingChat"
              placeholder="Type your message..."
              class="flex-1 text-sm text-gray-700 focus:outline-none placeholder-gray-400"
              @keydown.enter="send"
            />
            <input v-if="!isPendingChat" type="file" ref="fileInput" class="hidden " @change="onFileChange" />
            <button v-if="!isPendingChat"  @click="triggerFileInput" class="!px-0">
              <img width="30" height="30" src="@/assets/choosefile.png" alt="">
            </button>
            <button v-if="!isPendingChat"
              @click="send"
              class=" text-sm text-gray-600 font-semibold  py-1.5 rounded-full hover:bg-gray-100 flex items-center gap-1"
            >
              Send
              <span>➤</span>
            
            </button>
            <img v-else width="30" height="30" src="@/assets/loading_2.gif" alt="">
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { ref,watch, onMounted, nextTick, onBeforeMount,toRaw } from 'vue'
import {
  connectSendbird,
  createOrOpenChannel,
  loadMessages,
  registerOnMessageCallback,
  sendMessage,
  createOrGet1on1Channel,
  onMessage,
  sendFileMessage,
  registerMessageListener ,
  initSendbird,
  isPendingChat,
  sendFileSuccess
  } from '../lib/sendbirdClient'
  import { useRoute, useRouter } from 'vue-router';

const channelList = ref<any>([])
const unreadChannelUrls = ref<string[]>([]);
const route = useRoute();
const router = useRouter();
const currentUser = ref<any>({
  userId: route.query.currenUserId,
  nickname: route.query.currentUserNickname 
})
const userChat = ref<any>({
  userId: route.query.userChatId ,
  nickname: route.query.userChatNickname
})
watch(sendFileSuccess, (newVal) => {
  send()
  setTimeout(() => {
    scrollToBottom()
  }, 1000);
})
const fileInput = ref<HTMLInputElement | null>(null);
const selectedUser = ref()
const updateRouterQuery = (channel:any) => {
  console.log('channel :>> ', channel);
  router.replace({
    name: route.name,
    query: {
      currenUserId: route.query?.currenUserId,
      currentUserNickname: route.query?.currentUserNickname,
      userChatId: channel.members[1]?.userId,
      userChatNickname: channel.members[1]?.nickname
    }
  })
}
const  changeChannel = async (channel:any) =>  {
  selectedUser.value = channel
  await updateRouterQuery(channel)
  await connect(userChat.value.userId)
  await connect(currentUser.value.userId)
  setTimeout(async() => {
    await openChannel()
  }, 500);
  setTimeout(() => {
    scrollToBottom()
  }, 500);
}

const message = ref('')
const messages = ref<any[]>([])
const keyReload = ref(0)
const connected = ref(false)
const channelReady = ref(false)
const channelName = ref('')
const channelUrlCurren = ref('')

const connect = async(userId: string) => {
  try {
    await connectSendbird(userId)
    connected.value = true
    console.log('connect success :>> ');
  } catch (err) {
    console.error('❌ Kết nối thất bại:', err)
  }
}
const triggerFileInput = () => {
  fileInput.value?.click();
};

const onFileChange = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    let fileSuccess = await sendFileMessage(file);
    if (fileSuccess) {
      // Tải lại tin nhắn để hiển thị tệp đã gửi
      setTimeout(async() => {
         const oldMsgs = await loadMessages();
        messages.value = oldMsgs.reverse();
        keyReload.value += 1; // Tăng key để buộc Vue cập nhật
        // Cuộn xuống cuối để hiển thị tin nhắn mới
        
      },  1000);
      scrollToBottom();
    } else {
      console.error('Gửi tệp không thành công');
    }
  }
};


const openChannel = async() => {
  try {
    console.log('selectedUser.value openChannel :>> ', selectedUser.value);
    const channelInfo = await createOrOpenChannel(selectedUser.value)
    channelName.value = channelInfo.name
    channelUrlCurren.value = channelInfo.channelUrl
    const oldMsgs = await loadMessages()
     messages.value = oldMsgs.reverse() 
    console.log('messages :>> ', messages);
    onMessage((text, sender) => {
      messages.value.push({ text, sender  })
    })
    await loadMessages()
    channelReady.value = true
  } catch (err) {
    console.error(' Mở channel lỗi:', err)
  }
}


const send = async() => {
  if (!message.value.trim()) return
  try {
    await sendMessage(message.value)
    messages.value.push({ message: message.value, sender: {
     userId: currentUser.value.userId, nickname: currentUser.value.nickname, 
    } })
    message.value = ''
    scrollToBottom()
  } catch (err) {
    console.error(' Gửi lỗi:', err)
  }
}
onBeforeMount(async () => {
  initSendbird(currentUser.value.userId, currentUser.value.nickname).then((sb) => {
    
  }).catch((err) => {
    console.error('Error initializing Sendbird:', err)
  })
})

const getAllChannelForUserid = async() => {
  channelList.value  = await createOrGet1on1Channel(currentUser.value.userId, currentUser.value.nickname, userChat.value.userId, userChat.value.nickname)
  channelList.value =  JSON.parse(JSON.stringify(channelList.value))
  console.log('channelList.value :>> ', channelList.value);
  const channel = channelList.value.find((channel:any) => {
  const memberIds = channel.members.map((m:any) => m.userId);
    return (
      channel.memberCount === 2 &&
      memberIds.includes(currentUser.value.userId) &&
      memberIds.includes(userChat.value.userId)
    );
  });
  if(channel) {
    selectedUser.value = channel
  } else {
    selectedUser.value = channelList.value[0]
  }
  await changeChannel(selectedUser.value)
  await openChannel()
  registerOnMessageCallback(async () => {
    const oldMsgs = await loadMessages()
    messages.value = oldMsgs.reverse() 
    keyReload.value+=1
    setTimeout(() => {
      scrollToBottom()
    }, 300);
  })
}
onMounted(async() => {
  setTimeout(async() => {
    await getAllChannelForUserid()
  }, 500);
  registerMessageListener((channel, message) => {
    unreadChannelUrls.value.push(channel.url);
    console.log('unreadChannelUrls.value :>> ', unreadChannelUrls.value);
    if (message.isUserMessage?.()) {
      console.log('message component :>> ', message);
    } else if (message.isFileMessage?.()) {
      
    }
  })
})
const bottomAnchor = ref<HTMLElement | null>(null)
const isImage = (msg: any) => {
  return msg && typeof msg === 'object' && 'url' in msg && typeof msg.type === 'string' && msg.type.startsWith('image');
};
const isPdf = (msg: any) => {
  return msg && typeof msg === 'object' && 'url' in msg && typeof msg.type === 'string' && msg.type === 'application/pdf';
};
const isOtherFile = (msg: any) => {
  return msg && typeof msg === 'object' && 'url' in msg && typeof msg.type === 'string' && !msg.type.startsWith('image') && msg.type !== 'application/pdf';
};
const scrollToBottom = () => {
  nextTick(() => {
    bottomAnchor.value?.scrollIntoView({ behavior: 'smooth' })
  })
}
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
