import axios from "axios";
import { API } from './config.js';

export const registerUser = (email, password) => {
   return axios.post(`${API}/auth/register`, 
    { Email: email, Password: password },
    { headers: { 'Content-Type': 'application/json' }}
   );
};

export const loginUser = (email, password) => {
  return axios.post(`${API}/auth/login`, 
    { Email: email, Password: password },
    { headers: { 'Content-Type': 'application/json' }}
  );
};