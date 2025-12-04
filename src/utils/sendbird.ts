// utils/sendbird.ts
import axios from 'axios'

const APP_ID = 'A63E8391-FA54-476B-A089-FF6883C8129A'
const MASTER_TOKEN = 'fac7809fbb3dc2bab184589a5eac247c20ebd5db'

const baseURL = `https://api-${APP_ID}.sendbird.com/v3`

const sendbirdAPI = axios.create({
  baseURL,
  headers: {
    'Api-Token': MASTER_TOKEN,
    'Content-Type': 'application/json'
  }
})

export async function getAllUsers(limit = 50, token = '') {
  try {
    const res = await sendbirdAPI.get('/users', {
      params: {
        limit,
        token
      }
    })
    console.log('res :>> ', res);

    return res.data.users
  } catch (err) {
    console.error('[Sendbird] Lỗi lấy users:', err)
    return []
  }
}
export async function getUserById(userId: string) {
  try {
    const res = await sendbirdAPI.get(`/users/${userId}`)
    return res.data
  } catch (err) {
    console.error(`[Sendbird] Lỗi lấy user ${userId}:`, err)
    return null
  }
}