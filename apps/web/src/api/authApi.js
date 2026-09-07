import axios from "axios";
import { API } from './config.js';

export const registerUser = (email, password, fullName) => {
   return axios.post(`${API}/auth/register`, 
    { email, password,fullName, },
    { headers: { 'Content-Type': 'application/json' }}
   );
};

export const loginUser = (email, password) => {
  return axios.post(`${API}/auth/login`, 
    { email, password },
    { headers: { 'Content-Type': 'application/json' }}
  );
};