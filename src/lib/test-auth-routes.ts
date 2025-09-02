/**
 * Manual test script to verify authentication API routes
 * This script can be used to test the API routes functionality
 */

import { NextRequest } from 'next/server';

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'TestPassword123!'
};

/**
 * Test the register route
 */
export async function testRegisterRoute() {
  try {
    const { POST } = await import('@/app/api/auth/register/route');
    
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    const response = await POST(request);
    const data = await response.json();
    
    console.log('Register Route Test:');
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    return { success: response.status === 201, data };
  } catch (error) {
    console.error('Register route test failed:', error);
    return { success: false, error };
  }
}

/**
 * Test the login route
 */
export async function testLoginRoute() {
  try {
    const { POST } = await import('@/app/api/auth/login/route');
    
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    const response = await POST(request);
    const data = await response.json();
    
    console.log('Login Route Test:');
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    return { success: response.status === 200, data };
  } catch (error) {
    console.error('Login route test failed:', error);
    return { success: false, error };
  }
}

/**
 * Test the verify email route
 */
export async function testVerifyEmailRoute() {
  try {
    const { GET } = await import('@/app/api/auth/verify-email/route');
    
    const request = new NextRequest('http://localhost:3000/api/auth/verify-email?token=test-token', {
      method: 'GET'
    });

    const response = await GET(request);
    const data = await response.json();
    
    console.log('Verify Email Route Test:');
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    return { success: response.status === 400, data }; // Should fail with invalid token
  } catch (error) {
    console.error('Verify email route test failed:', error);
    return { success: false, error };
  }
}

/**
 * Test the logout route
 */
export async function testLogoutRoute() {
  try {
    const { POST } = await import('@/app/api/auth/logout/route');
    
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST'
    });

    const response = await POST(request);
    const data = await response.json();
    
    console.log('Logout Route Test:');
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    return { success: response.status === 200, data };
  } catch (error) {
    console.error('Logout route test failed:', error);
    return { success: false, error };
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('=== Authentication API Routes Test ===\n');
  
  const results = {
    register: await testRegisterRoute(),
    login: await testLoginRoute(),
    verifyEmail: await testVerifyEmailRoute(),
    logout: await testLogoutRoute()
  };
  
  console.log('\n=== Test Summary ===');
  console.log('Register:', results.register.success ? '✅ PASS' : '❌ FAIL');
  console.log('Login:', results.login.success ? '✅ PASS' : '❌ FAIL');
  console.log('Verify Email:', results.verifyEmail.success ? '✅ PASS' : '❌ FAIL');
  console.log('Logout:', results.logout.success ? '✅ PASS' : '❌ FAIL');
  
  return results;
}

// Assign to variable before exporting as default
const authTestUtils = {
  testRegisterRoute,
  testLoginRoute,
  testVerifyEmailRoute,
  testLogoutRoute,
  runAllTests
};

export default authTestUtils;