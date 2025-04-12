// Simple script to test admin login
import axios from 'axios';
import http from 'http';
import https from 'https';

// Create axios instance with keep-alive to reuse connections
const api = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  withCredentials: true,
  validateStatus: status => status < 500
});

// First, test if we can access /api/auth/me
async function checkCurrentUser() {
  try {
    console.log('Checking current user...');
    const response = await api.get('/api/auth/me');
    console.log('Current user status:', response.status);
    console.log('Current user data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking current user:', error.message);
    return null;
  }
}

// Login as admin
async function loginAsAdmin() {
  try {
    console.log('Attempting to login...');
    const response = await api.post('/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    console.log('Login status:', response.status);
    console.log('Login response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error during login:', error.message);
    return null;
  }
}

// Check admin API
async function checkAdminAPI() {
  try {
    console.log('Checking admin stats API...');
    const response = await api.get('/api/admin/stats');
    console.log('Admin stats status:', response.status);
    console.log('Admin stats data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking admin stats:', error.message);
    return null;
  }
}

// Check revenue API
async function checkRevenueAPI() {
  try {
    console.log('Checking revenue API...');
    const response = await api.get('/api/stripe/revenue');
    console.log('Revenue API status:', response.status);
    console.log('Revenue data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking revenue API:', error.message);
    return null;
  }
}

// Run all tests
async function runTests() {
  // Check if we're already logged in
  const currentUser = await checkCurrentUser();
  
  // If not logged in or not admin, try to log in
  if (!currentUser || !currentUser.isAdmin) {
    await loginAsAdmin();
    // Check user again after login
    await checkCurrentUser();
  }
  
  // Now check admin APIs
  await checkAdminAPI();
  await checkRevenueAPI();
}

runTests().catch(console.error);