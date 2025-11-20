export interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
  }
  
  export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface LoginResponse {
    user: User;
    token: string;
    message: string;
  }
  