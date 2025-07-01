// utils/sendbird.ts
import axios from 'axios'

const APP_ID = '133CC8F6-6ECE-459D-B738-04F6C8C8C59D'
const MASTER_TOKEN = '7826a2ae5fdd37fab6e4030ab867771c9a5ed012'

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