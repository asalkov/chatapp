import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';

describe('WebSocket 1-to-1 Communication (e2e)', () => {
  let app: INestApplication;
  let clientSocket1: Socket;
  let clientSocket2: Socket;
  let clientSocket3: Socket;
  const PORT = 3001; // Use different port for testing

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(PORT);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();
    if (clientSocket3?.connected) clientSocket3.disconnect();
  });

  describe('User Registration', () => {
    it('should allow a user to register with valid username', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);

      clientSocket1.on('connect', () => {
        clientSocket1.emit(
          'register',
          { username: 'testuser1' },
          (response) => {
            expect(response.success).toBe(true);
            done();
          },
        );
      });
    });

    it('should reject registration with username less than 2 characters', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);

      clientSocket1.on('connect', () => {
        clientSocket1.emit('register', { username: 'a' }, (response) => {
          expect(response.success).toBe(false);
          expect(response.message).toContain('at least 2 characters');
          done();
        });
      });
    });

    it('should disconnect old session when same user logs in from new location', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);

      clientSocket1.on('connect', () => {
        clientSocket1.emit(
          'register',
          { username: 'duplicateuser' },
          (response1) => {
            expect(response1.success).toBe(true);

            // Now connect with same username from different socket
            clientSocket2 = io(`http://localhost:${PORT}`);

            let oldSessionDisconnected = false;

            clientSocket1.on('error', (error) => {
              expect(error.message).toContain(
                'logged in from another location',
              );
              oldSessionDisconnected = true;
            });

            clientSocket2.on('connect', () => {
              clientSocket2.emit(
                'register',
                { username: 'duplicateuser' },
                (response2) => {
                  expect(response2.success).toBe(true);

                  // Give time for old session to disconnect
                  setTimeout(() => {
                    expect(oldSessionDisconnected).toBe(true);
                    done();
                  }, 100);
                },
              );
            });
          },
        );
      });
    });
  });

  describe('1-to-1 Private Messaging', () => {
    it('should send private message from user1 to user2', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);
      clientSocket2 = io(`http://localhost:${PORT}`);

      let user1Registered = false;
      let user2Registered = false;

      clientSocket1.on('connect', () => {
        clientSocket1.emit('register', { username: 'alice' }, (response) => {
          expect(response.success).toBe(true);
          user1Registered = true;
          tryToSendMessage();
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('register', { username: 'bob' }, (response) => {
          expect(response.success).toBe(true);
          user2Registered = true;
          tryToSendMessage();
        });
      });

      function tryToSendMessage() {
        if (user1Registered && user2Registered) {
          // Bob should receive the message
          clientSocket2.on('msgToClient', (payload) => {
            expect(payload.sender).toBe('alice');
            expect(payload.message).toBe('Hello Bob!');
            expect(payload.isPrivate).toBe(true);
            done();
          });

          // Alice sends message to Bob
          clientSocket1.emit('privateMessage', {
            to: clientSocket2.id,
            message: 'Hello Bob!',
          });
        }
      }
    });

    it('should echo message back to sender', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);
      clientSocket2 = io(`http://localhost:${PORT}`);

      let user1Registered = false;
      let user2Registered = false;

      clientSocket1.on('connect', () => {
        clientSocket1.emit('register', { username: 'charlie' }, (response) => {
          expect(response.success).toBe(true);
          user1Registered = true;
          tryToSendMessage();
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('register', { username: 'diana' }, (response) => {
          expect(response.success).toBe(true);
          user2Registered = true;
          tryToSendMessage();
        });
      });

      function tryToSendMessage() {
        if (user1Registered && user2Registered) {
          // Charlie should receive echo of their own message
          clientSocket1.on('msgToClient', (payload) => {
            expect(payload.sender).toBe('charlie');
            expect(payload.message).toBe('Test message');
            expect(payload.recipient).toBe('diana');
            expect(payload.toId).toBe(clientSocket2.id);
            done();
          });

          // Charlie sends message to Diana
          clientSocket1.emit('privateMessage', {
            to: clientSocket2.id,
            message: 'Test message',
          });
        }
      }
    });

    it('should NOT deliver message to third party user', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);
      clientSocket2 = io(`http://localhost:${PORT}`);
      clientSocket3 = io(`http://localhost:${PORT}`);

      let user1Registered = false;
      let user2Registered = false;
      let user3Registered = false;
      let messageReceived = false;

      clientSocket1.on('connect', () => {
        clientSocket1.emit('register', { username: 'eve' }, (response) => {
          expect(response.success).toBe(true);
          user1Registered = true;
          tryToSendMessage();
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('register', { username: 'frank' }, (response) => {
          expect(response.success).toBe(true);
          user2Registered = true;
          tryToSendMessage();
        });
      });

      clientSocket3.on('connect', () => {
        clientSocket3.emit('register', { username: 'grace' }, (response) => {
          expect(response.success).toBe(true);
          user3Registered = true;
          tryToSendMessage();
        });
      });

      function tryToSendMessage() {
        if (user1Registered && user2Registered && user3Registered) {
          // Grace (third party) should NOT receive the message
          clientSocket3.on('msgToClient', (payload) => {
            // This should never be called
            messageReceived = true;
            fail('Third party user received private message!');
          });

          // Frank should receive the message
          clientSocket2.on('msgToClient', (payload) => {
            expect(payload.sender).toBe('eve');
            expect(payload.message).toBe('Private message');

            // Wait a bit to ensure Grace doesn't receive it
            setTimeout(() => {
              expect(messageReceived).toBe(false);
              done();
            }, 200);
          });

          // Eve sends private message to Frank
          clientSocket1.emit('privateMessage', {
            to: clientSocket2.id,
            message: 'Private message',
          });
        }
      }
    });

    it('should handle message to non-existent user', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);

      clientSocket1.on('connect', () => {
        clientSocket1.emit('register', { username: 'henry' }, (response) => {
          expect(response.success).toBe(true);

          // Listen for error
          clientSocket1.on('error', (error) => {
            expect(error.message).toContain('User not found or disconnected');
            done();
          });

          // Try to send message to non-existent socket ID
          clientSocket1.emit('privateMessage', {
            to: 'invalid-socket-id',
            message: 'This should fail',
          });
        });
      });
    });
  });

  describe('Message Persistence', () => {
    it('should persist messages and deliver on reconnection', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);
      clientSocket2 = io(`http://localhost:${PORT}`);

      let irisRegistered = false;
      let jackRegistered = false;
      let messageSent = false;

      clientSocket1.on('connect', () => {
        clientSocket1.emit('register', { username: 'iris' }, (response) => {
          expect(response.success).toBe(true);
          irisRegistered = true;
          trySendMessage();
        });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('register', { username: 'jack' }, (response2) => {
          expect(response2.success).toBe(true);
          jackRegistered = true;
          trySendMessage();
        });
      });

      function trySendMessage() {
        if (irisRegistered && jackRegistered && !messageSent) {
          messageSent = true;
          
          // Iris sends message to Jack
          clientSocket1.emit('privateMessage', {
            to: clientSocket2.id,
            message: 'Persisted message',
          });

          // Wait for message to be saved, then disconnect and reconnect Jack
          setTimeout(() => {
            clientSocket2.disconnect();
            
            // Reconnect Jack and check for persisted messages
            setTimeout(() => {
              const newJackSocket = io(`http://localhost:${PORT}`);
              
              newJackSocket.on('connect', () => {
                newJackSocket.on('persistedMessages', (data) => {
                  expect(data.totalMessages).toBeGreaterThan(0);
                  expect(data.conversations).toBeDefined();
                  expect(data.conversations['iris']).toBeDefined();
                  newJackSocket.disconnect();
                  done();
                });

                newJackSocket.emit('register', { username: 'jack' });
              });
            }, 100);
          }, 100);
        }
      }
    });
  });

  describe('User List Broadcasting', () => {
    it('should broadcast updated user list when user joins', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);
      clientSocket2 = io(`http://localhost:${PORT}`);

      let kateRegistered = false;

      clientSocket1.on('connect', () => {
        // Kate should receive user list update when Leo joins
        clientSocket1.on('userList', (users) => {
          const usernames = users.map((u: any) => u.username);
          if (usernames.includes('leo') && kateRegistered) {
            expect(usernames).toContain('kate');
            expect(usernames).toContain('leo');
            done();
          }
        });

        clientSocket1.emit('register', { username: 'kate' }, (response) => {
          expect(response.success).toBe(true);
          kateRegistered = true;
        });
      });

      // Leo joins - set up connection handler immediately
      clientSocket2.on('connect', () => {
        clientSocket2.emit('register', { username: 'leo' }, (response2) => {
          expect(response2.success).toBe(true);
        });
      });
    });
  });

  describe('Message Deduplication', () => {
    it('should not create duplicate messages', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);
      clientSocket2 = io(`http://localhost:${PORT}`);

      let messagesReceived = 0;
      let mikeRegistered = false;
      let ninaRegistered = false;

      clientSocket1.on('connect', () => {
        clientSocket1.emit('register', { username: 'mike' }, (response) => {
          expect(response.success).toBe(true);
          mikeRegistered = true;
          trySendMessage();
        });
      });

      clientSocket2.on('connect', () => {
        // Nina counts messages received - attach listener before registration
        clientSocket2.on('msgToClient', (payload) => {
          if (payload.message === 'Unique message') {
            messagesReceived++;
          }
        });

        clientSocket2.emit('register', { username: 'nina' }, (response2) => {
          expect(response2.success).toBe(true);
          ninaRegistered = true;
          trySendMessage();
        });
      });

      function trySendMessage() {
        if (mikeRegistered && ninaRegistered) {
          // Mike sends message once
          clientSocket1.emit('privateMessage', {
            to: clientSocket2.id,
            message: 'Unique message',
          });

          // Wait and verify only one message received
          setTimeout(() => {
            expect(messagesReceived).toBe(1);
            done();
          }, 500);
        }
      }
    });
  });
});
