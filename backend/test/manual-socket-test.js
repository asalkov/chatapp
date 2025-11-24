/**
 * Manual Socket Test Script
 * 
 * This script tests 1-to-1 communication between two users.
 * Run this while your backend server is running on port 3000.
 * 
 * Usage: node test/manual-socket-test.js
 */

const io = require('socket.io-client');

const BACKEND_URL = 'http://localhost:3000';

console.log('🧪 Starting Socket 1-to-1 Communication Test\n');

// Create two client connections
const alice = io(BACKEND_URL);
const bob = io(BACKEND_URL);

let aliceId = null;
let bobId = null;
let testsPassed = 0;
let testsFailed = 0;

// Test 1: Connection
alice.on('connect', () => {
  aliceId = alice.id;
  console.log('✅ Test 1: Alice connected (Socket ID:', aliceId + ')');
  testsPassed++;
});

bob.on('connect', () => {
  bobId = bob.id;
  console.log('✅ Test 2: Bob connected (Socket ID:', bobId + ')');
  testsPassed++;
  
  // Once both connected, start registration
  setTimeout(registerUsers, 100);
});

// Test 2: Registration
function registerUsers() {
  console.log('\n📝 Registering users...');
  
  alice.emit('register', { username: 'alice' }, (response) => {
    if (response.success) {
      console.log('✅ Test 3: Alice registered successfully');
      testsPassed++;
    } else {
      console.log('❌ Test 3 FAILED: Alice registration failed:', response.message);
      testsFailed++;
    }
  });

  bob.emit('register', { username: 'bob' }, (response) => {
    if (response.success) {
      console.log('✅ Test 4: Bob registered successfully');
      testsPassed++;
      
      // Once both registered, start messaging tests
      setTimeout(testMessaging, 100);
    } else {
      console.log('❌ Test 4 FAILED: Bob registration failed:', response.message);
      testsFailed++;
    }
  });
}

// Test 3: 1-to-1 Messaging
function testMessaging() {
  console.log('\n💬 Testing 1-to-1 messaging...');
  
  let aliceReceivedEcho = false;
  let bobReceivedMessage = false;

  // Alice should receive echo of her own message
  alice.on('msgToClient', (payload) => {
    if (payload.sender === 'alice' && payload.message === 'Hello Bob!') {
      console.log('✅ Test 5: Alice received echo of her message');
      console.log('   Message:', payload.message);
      console.log('   Recipient:', payload.recipient);
      aliceReceivedEcho = true;
      testsPassed++;
      checkMessagingComplete();
    }
  });

  // Bob should receive message from Alice
  bob.on('msgToClient', (payload) => {
    if (payload.sender === 'alice' && payload.message === 'Hello Bob!') {
      console.log('✅ Test 6: Bob received message from Alice');
      console.log('   Sender:', payload.sender);
      console.log('   Message:', payload.message);
      bobReceivedMessage = true;
      testsPassed++;
      checkMessagingComplete();
    }
  });

  // Alice sends message to Bob
  console.log('📤 Alice sending message to Bob...');
  alice.emit('privateMessage', {
    to: bobId,
    message: 'Hello Bob!',
  });

  function checkMessagingComplete() {
    if (aliceReceivedEcho && bobReceivedMessage) {
      // Test reverse direction
      setTimeout(testReverseMessaging, 100);
    }
  }
}

// Test 4: Reverse Direction Messaging
function testReverseMessaging() {
  console.log('\n💬 Testing reverse direction (Bob to Alice)...');
  
  let bobReceivedEcho = false;
  let aliceReceivedMessage = false;

  // Bob should receive echo
  bob.on('msgToClient', (payload) => {
    if (payload.sender === 'bob' && payload.message === 'Hi Alice!') {
      console.log('✅ Test 7: Bob received echo of his message');
      bobReceivedEcho = true;
      testsPassed++;
      checkReverseComplete();
    }
  });

  // Alice should receive message
  alice.on('msgToClient', (payload) => {
    if (payload.sender === 'bob' && payload.message === 'Hi Alice!') {
      console.log('✅ Test 8: Alice received message from Bob');
      aliceReceivedMessage = true;
      testsPassed++;
      checkReverseComplete();
    }
  });

  // Bob sends message to Alice
  console.log('📤 Bob sending message to Alice...');
  bob.emit('privateMessage', {
    to: aliceId,
    message: 'Hi Alice!',
  });

  function checkReverseComplete() {
    if (bobReceivedEcho && aliceReceivedMessage) {
      setTimeout(testUserList, 100);
    }
  }
}

// Test 5: User List
function testUserList() {
  console.log('\n👥 Testing user list broadcast...');
  
  alice.on('userList', (users) => {
    const usernames = users.map(u => u.username);
    if (usernames.includes('alice') && usernames.includes('bob')) {
      console.log('✅ Test 9: User list contains both Alice and Bob');
      console.log('   Users:', usernames.join(', '));
      testsPassed++;
      setTimeout(testInvalidRecipient, 100);
    }
  });
}

// Test 6: Invalid Recipient
function testInvalidRecipient() {
  console.log('\n❌ Testing error handling (invalid recipient)...');
  
  alice.on('error', (error) => {
    if (error.message.includes('User not found')) {
      console.log('✅ Test 10: Proper error for invalid recipient');
      console.log('   Error:', error.message);
      testsPassed++;
      setTimeout(showResults, 100);
    }
  });

  // Alice tries to send to invalid socket ID
  alice.emit('privateMessage', {
    to: 'invalid-socket-id',
    message: 'This should fail',
  });
}

// Show final results
function showResults() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${testsPassed}/10`);
  console.log(`❌ Tests Failed: ${testsFailed}/10`);
  
  if (testsFailed === 0 && testsPassed === 10) {
    console.log('\n🎉 ALL TESTS PASSED! Socket 1-to-1 communication works correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
  
  console.log('\n🔌 Disconnecting clients...');
  alice.disconnect();
  bob.disconnect();
  
  setTimeout(() => {
    console.log('✅ Test complete. Exiting...');
    process.exit(testsFailed === 0 ? 0 : 1);
  }, 500);
}

// Error handlers
alice.on('connect_error', (error) => {
  console.error('❌ Alice connection error:', error.message);
  testsFailed++;
});

bob.on('connect_error', (error) => {
  console.error('❌ Bob connection error:', error.message);
  testsFailed++;
});

// Timeout safety
setTimeout(() => {
  console.log('\n⏱️  Test timeout! Not all tests completed.');
  showResults();
}, 10000);
