import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE,
  withCredentials: true, // สำคัญถ้าใช้ cookie จาก backend
})

// ถ้าอยากรองรับ token จาก localStorage ชั่วคราว (ฝั่ง client เท่านั้น)
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('token')
  if (token) axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export default axiosInstance