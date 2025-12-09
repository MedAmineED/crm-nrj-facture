import axios from 'axios';
import ApiUrls from './Urls';

// Define the User entity
interface User {
  id: number;
  username: string;
  password: string;
  roles: string[];
}

// Define the response shape for user data
interface UsersResponse {
  users: User[];
  totalCount: number;
  page: number;
  limit: number;
}

class UsersServices {
  async GetUsers(endpoint: string, token, page: number = 1, limit: number = 10): Promise<UsersResponse> {
    try {
      const response = await axios.get(`${ApiUrls.BASE_URL}${endpoint}`, 
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: { page, limit }
      });
      console.log("Fetched users:", response.data);
      return {
        users: response.data.users || response.data,
        totalCount: response.data.totalCount || response.data.length,
        page,
        limit,
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }
  
}

export default new UsersServices();