const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_USER = {
  email: 'admin@ccs.edu',
  password: 'admin123'
};

let authToken = null;
let testEventId = null;
let testTaskId = null;
let testApplicationId = null;
let testUserId = null;

// Test utilities
const log = (message, data = null) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const makeRequest = async (method, endpoint, data = null, token = authToken) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data
    };
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message,
      status: error.response?.status 
    };
  }
};

// Test 1: Authentication Flow
async function testAuthentication() {
  log('🧪 Testing Authentication Flow');
  
  // Test login
  const loginResult = await makeRequest('POST', '/auth/login', TEST_USER);
  if (!loginResult.success) {
    log('❌ Login failed:', loginResult.error);
    return false;
  }
  
  authToken = loginResult.data.token;
  log('✅ Login successful, token obtained');
  
  // Test profile fetch
  const profileResult = await makeRequest('GET', '/auth/profile');
  if (!profileResult.success) {
    log('❌ Profile fetch failed:', profileResult.error);
    return false;
  }
  
  log('✅ Profile fetch successful:', profileResult.data);
  return true;
}

// Test 2: Users CRUD
async function testUsersCRUD() {
  log('🧪 Testing Users CRUD');
  
  // Test get users list
  const usersResult = await makeRequest('GET', '/users?role=student&page=1&limit=10');
  if (!usersResult.success) {
    log('❌ Get users failed:', usersResult.error);
    return false;
  }
  
  log('✅ Get users successful, found:', usersResult.data.users?.length || 0, 'users');
  
  // Test get single user (if any exist)
  if (usersResult.data.users?.length > 0) {
    testUserId = usersResult.data.users[0].id;
    const userResult = await makeRequest('GET', `/users/${testUserId}`);
    if (userResult.success) {
      log('✅ Get single user successful');
    } else {
      log('❌ Get single user failed:', userResult.error);
    }
  }
  
  return true;
}

// Test 3: Events CRUD
async function testEventsCRUD() {
  log('🧪 Testing Events CRUD');
  
  // Test create event
  const newEvent = {
    name: 'Test Event',
    type: 'Events',
    eventDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: 'Test Location',
    penaltyHours: 10,
    isMandatory: true
  };
  
  const createResult = await makeRequest('POST', '/events', newEvent);
  if (!createResult.success) {
    log('❌ Create event failed:', createResult.error);
    return false;
  }
  
  testEventId = createResult.data.id;
  log('✅ Create event successful, ID:', testEventId);
  
  // Test get events list
  const eventsResult = await makeRequest('GET', '/events?page=1&limit=10');
  if (!eventsResult.success) {
    log('❌ Get events failed:', eventsResult.error);
    return false;
  }
  
  log('✅ Get events successful, found:', eventsResult.data.length, 'events');
  
  // Test get single event
  const eventResult = await makeRequest('GET', `/events/${testEventId}`);
  if (!eventResult.success) {
    log('❌ Get single event failed:', eventResult.error);
    return false;
  }
  
  log('✅ Get single event successful');
  
  // Test update event
  const updateData = {
    name: 'Updated Test Event',
    location: 'Updated Location'
  };
  
  const updateResult = await makeRequest('PUT', `/events/${testEventId}`, updateData);
  if (!updateResult.success) {
    log('❌ Update event failed:', updateResult.error);
    return false;
  }
  
  log('✅ Update event successful');
  
  return true;
}

// Test 4: Tasks CRUD
async function testTasksCRUD() {
  log('🧪 Testing Tasks CRUD');
  
  // Test create task
  const newTask = {
    title: 'Test Task',
    description: 'Test task description',
    hoursOffered: 5,
    maxParticipants: 3,
    location: 'Test Task Location',
    taskDate: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '16:00'
  };
  
  const createResult = await makeRequest('POST', '/tasks', newTask);
  if (!createResult.success) {
    log('❌ Create task failed:', createResult.error);
    return false;
  }
  
  testTaskId = createResult.data.id;
  log('✅ Create task successful, ID:', testTaskId);
  
  // Test get tasks list
  const tasksResult = await makeRequest('GET', '/tasks?page=1&limit=10');
  if (!tasksResult.success) {
    log('❌ Get tasks failed:', tasksResult.error);
    return false;
  }
  
  log('✅ Get tasks successful, found:', tasksResult.data.length, 'tasks');
  
  // Test get single task
  const taskResult = await makeRequest('GET', `/tasks/${testTaskId}`);
  if (!taskResult.success) {
    log('❌ Get single task failed:', taskResult.error);
    return false;
  }
  
  log('✅ Get single task successful');
  
  // Test update task
  const updateData = {
    title: 'Updated Test Task',
    description: 'Updated task description'
  };
  
  const updateResult = await makeRequest('PUT', `/tasks/${testTaskId}`, updateData);
  if (!updateResult.success) {
    log('❌ Update task failed:', updateResult.error);
    return false;
  }
  
  log('✅ Update task successful');
  
  return true;
}

// Test 5: Task Applications CRUD
async function testTaskApplicationsCRUD() {
  log('🧪 Testing Task Applications CRUD');
  
  if (!testTaskId) {
    log('⚠️ Skipping task applications test - no task ID available');
    return true;
  }
  
  // Login as a student to test application submission
  const studentLogin = await makeRequest('POST', '/auth/login', {
    email: 'john.doe@student.ccs.edu',
    password: 'password123'
  });
  const studentToken = studentLogin.success ? studentLogin.data.token : authToken;

  // Test apply for task as student
  const applyResult = await makeRequest('POST', `/tasks/${testTaskId}/apply`, null, studentToken);
  if (!applyResult.success) {
    log('❌ Apply for task failed:', applyResult.error);
    return false;
  }
  
  testApplicationId = applyResult.data.id;
  log('✅ Apply for task successful, application ID:', testApplicationId);
  
  // Test get my applications as student
  const myAppsResult = await makeRequest('GET', '/tasks/my-applications', null, studentToken);
  if (!myAppsResult.success) {
    log('❌ Get my applications failed:', myAppsResult.error);
    return false;
  }
  
  log('✅ Get my applications successful, found:', myAppsResult.data.length, 'applications');
  
  // Test get all applications (admin view)
  const allAppsResult = await makeRequest('GET', '/tasks/applications');
  if (!allAppsResult.success) {
    log('❌ Get all applications failed:', allAppsResult.error);
    return false;
  }
  
  log('✅ Get all applications successful, found:', allAppsResult.data.length, 'applications');
  
  // Test update application status (approve)
  const approveResult = await makeRequest('PUT', `/tasks/applications/${testApplicationId}`, {
    status: 'approved'
  });
  if (!approveResult.success) {
    log('❌ Approve application failed:', approveResult.error);
    return false;
  }
  
  log('✅ Approve application successful');
  
  return true;
}

// Test 6: Attendance CRUD
async function testAttendanceCRUD() {
  log('🧪 Testing Attendance CRUD');
  
  if (!testEventId || !testUserId) {
    log('⚠️ Skipping attendance test - missing event ID or user ID');
    return true;
  }
  
  // Test create attendance record
  const attendanceData = {
    eventId: testEventId,
    userId: testUserId,
    status: 'present'
  };
  
  const createResult = await makeRequest('POST', '/attendance', attendanceData);
  if (!createResult.success) {
    log('❌ Create attendance failed:', createResult.error);
    return false;
  }
  
  log('✅ Create attendance successful');
  
  // Test get attendance for event
  const attendanceResult = await makeRequest('GET', `/attendance?eventId=${testEventId}&all=true`);
  if (!attendanceResult.success) {
    log('❌ Get attendance failed:', attendanceResult.error);
    return false;
  }
  
  log('✅ Get attendance successful, found:', attendanceResult.data.length, 'records');
  
  // Test update attendance (change to absent)
  const updateData = {
    eventId: testEventId,
    userId: testUserId,
    status: 'absent'
  };
  
  const updateResult = await makeRequest('POST', '/attendance', updateData);
  if (!updateResult.success) {
    log('❌ Update attendance failed:', updateResult.error);
    return false;
  }
  
  log('✅ Update attendance successful');
  
  return true;
}

// Test 7: Analytics and Dashboard
async function testAnalyticsAndDashboard() {
  log('🧪 Testing Analytics and Dashboard');
  
  // Test dashboard
  const dashboardResult = await makeRequest('GET', '/dashboard');
  if (!dashboardResult.success) {
    log('❌ Dashboard failed:', dashboardResult.error);
    return false;
  }
  
  log('✅ Dashboard successful');
  
  // Test analytics overview
  const analyticsResult = await makeRequest('GET', '/analytics/overview');
  if (!analyticsResult.success) {
    log('❌ Analytics failed:', analyticsResult.error);
    return false;
  }
  
  log('✅ Analytics successful');
  
  return true;
}

// Test 8: Cleanup
async function testCleanup() {
  log('🧪 Testing Cleanup (Delete Operations)');
  
  // Test delete task application
  if (testApplicationId) {
    const deleteAppResult = await makeRequest('DELETE', `/tasks/applications/${testApplicationId}`);
    if (deleteAppResult.success) {
      log('✅ Delete task application successful');
    } else {
      log('❌ Delete task application failed:', deleteAppResult.error);
    }
  }
  
  // Test delete task
  if (testTaskId) {
    const deleteTaskResult = await makeRequest('DELETE', `/tasks/${testTaskId}`);
    if (deleteTaskResult.success) {
      log('✅ Delete task successful');
    } else {
      log('❌ Delete task failed:', deleteTaskResult.error);
    }
  }
  
  // Test delete event
  if (testEventId) {
    const deleteEventResult = await makeRequest('DELETE', `/events/${testEventId}`);
    if (deleteEventResult.success) {
      log('✅ Delete event successful');
    } else {
      log('❌ Delete event failed:', deleteEventResult.error);
    }
  }
  
  return true;
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting End-to-End CRUD Tests');
  log('=====================================');
  
  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Users CRUD', fn: testUsersCRUD },
    { name: 'Events CRUD', fn: testEventsCRUD },
    { name: 'Tasks CRUD', fn: testTasksCRUD },
    { name: 'Task Applications CRUD', fn: testTaskApplicationsCRUD },
    { name: 'Attendance CRUD', fn: testAttendanceCRUD },
    { name: 'Analytics and Dashboard', fn: testAnalyticsAndDashboard },
    { name: 'Cleanup', fn: testCleanup }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      log(`\n📋 Running ${test.name}...`);
      const result = await test.fn();
      if (result) {
        log(`✅ ${test.name} PASSED`);
        passed++;
      } else {
        log(`❌ ${test.name} FAILED`);
        failed++;
      }
    } catch (error) {
      log(`❌ ${test.name} ERROR:`, error.message);
      failed++;
    }
  }
  
  log('\n=====================================');
  log(`🎯 Test Results: ${passed} passed, ${failed} failed`);
  log('🚀 End-to-End CRUD Tests Complete');
  
  if (failed === 0) {
    log('🎉 All tests passed! CRUD flows are working correctly.');
  } else {
    log('⚠️ Some tests failed. Check the logs above for details.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
