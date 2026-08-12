import axios from 'axios'
import { API } from './config.js'

const api = axios.create({
  baseURL: API,
})

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('accessToken')

//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`
//   }

//   return config
// });

export default api