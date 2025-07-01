<template>
  <div class="h-screen w-screen flex bg-gray-100">
     <!-- Sidebar -->
    <div class="w-[240px] bg-gray-100  p-2 space-y-4">
      <div class="bg-white rounded-lg shadow p-4 mb-4 h-full">
        <h2 class="text-xs font-bold text-gray-500 mb-2">Channel Chat</h2>
        <div
          v-for="user in users"
          :key="user?.userId"
          class="flex items-center gap-3 cursor-pointer py- line-clamp-1 py-2"
          :class="user.userId === selectedUser?.userId ? 'font-bold text-black' : 'text-gray-600'"
          @click="chooseUser(user)"
        >
          <div >
            <div
            :class="user.connectionStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'"
              class="w-8 h-8 rounded-full flex items-center bg-amber-500 justify-center text-white font-semibold text-sm "
         
              >
                {{ user.userId.slice(0,1) }}
            </div>
          </div>
          <div class="line-clamp-1">
            {{ user.userId }}
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Panel -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <div class="flex justify-center p-4 ">
        <button class="bg-gray-100 text-lg font-bold px-4 py-1 rounded-full text-gray-600">
          {{ selectedUser?.userId || 'Select User' }}
        </button>
      </div>

      <!-- Messages -->
      <div class="flex-1 px-6 py-4 space-y-4 overflow-y-auto bg-white">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="flex items-end  gap-2"
          :class=" msg?.sender === currentUser.userId ? 'justify-end' : 'justify-start'"
        >
          <!-- Avatar -->
          <!-- Avatar (Right) -->
          <div
            v-if="msg.sender === 'unknown' || msg?.sender !== currentUser.userId"
            class="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ml-2"
            :class="msg.sender === selectedUser.userId ? 'bg-amber-400' : 'bg-gray-400'"
          >
            {{ msg.sender !== 'unknown' ? 'You' :  msg.sender.slice(0, 1) }}
          </div>
          <!-- Message bubble -->
          <div
            class="max-w-sm px-4 py-2 rounded-xl shadow text-sm"
            :class="msg?.sender === selectedUser.userId
              ? 'bg-gray-100 text-gray-900 rounded-br-none'
              : 'bg-white border rounded-bl-none'"
          >
            <p>{{ msg?.text }}</p>
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
              placeholder="Type your message..."
              class="flex-1 text-sm text-gray-700 focus:outline-none placeholder-gray-400"
              @keydown.enter="send"
            />
            <button
              @click="send"
              class="ml-2 text-sm text-gray-600 font-semibold px-4 py-1.5 rounded-full hover:bg-gray-100 flex items-center gap-1"
            >
              Send
              <span>➤</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeMount } from 'vue'
import {
  connectSendbird,
  createOrOpenChannel,
  loadMessages,
  registerOnMessageCallback,
  sendMessage,
  getAllApplicationUsers,
  onMessage,
  initSendbird,
  } from '../lib/sendbirdClient'
  
const users = ref<any>([])
const currentUser = ref({
  bg: "bg-gray-500",
  userId: "User1",
  initial: undefined,
  nickname: "User1"
})


const selectedUser = ref()
const  chooseUser = async (user:any) =>  {
  selectedUser.value = user
  await connect()
  await openChannel()
  scrollToBottom()
}

const message = ref('')
const messages = ref<any[]>([])
const keyReload = ref(0)
const connected = ref(false)
const channelReady = ref(false)
const channelName = ref('')

const connect = async() => {
  try {
    await connectSendbird(currentUser.value.userId)
    connected.value = true
  } catch (err) {
    console.error('❌ Kết nối thất bại:', err)
  }
}

const openChannel = async() => {
  
  try {
    const channelInfo = await createOrOpenChannel([ selectedUser.value.userId, currentUser.value.userId,])
    channelName.value = channelInfo.name

    const oldMsgs = await loadMessages()
    console.log('oldMsgs :>> ', oldMsgs);
     messages.value = oldMsgs.reverse() 

    onMessage((text, sender) => {
      messages.value.push({ text, sender,isHighlighted: sender !== currentUser.value.nickname  })
    })
    channelReady.value = true
  } catch (err) {
    console.error(' Mở channel lỗi:', err)
  }
}


const send = async() => {
  if (!message.value.trim()) return
  try {
    await sendMessage(message.value)
    messages.value.push({ text: message.value, sender: currentUser.value.userId })
    message.value = ''
    scrollToBottom()
  } catch (err) {
    console.error(' Gửi lỗi:', err)
  }
}
onBeforeMount(async () => {
  initSendbird(currentUser.value.userId).then((sb) => {
  console.log('Sendbird initialized with sb:', sb)
}).catch((err) => {
  console.error('Error initializing Sendbird:', err)
})
})
onMounted(async() => {
  let allUsers = await getAllApplicationUsers(currentUser.value.userId)
  users.value = await allUsers.filter((user:any) => user.userId !== currentUser.value.userId)
  


  registerOnMessageCallback(async () => {
    console.log('📩 Nhận tin nhắn mới từ người khác')
    const oldMsgs = await loadMessages()
    console.log('oldMsgs :>> ', oldMsgs);
    messages.value = oldMsgs.reverse() 
    keyReload.value+=1
    scrollToBottom()
  })
})
const bottomAnchor = ref<HTMLElement | null>(null)

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
