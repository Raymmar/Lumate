import * as objectStorage from '@replit/object-storage';

async function testStorage() {
  try {
    console.log('Testing storage initialization...');
    console.log('Available exports:', Object.keys(objectStorage));

    // Test basic operations
    const testKey = 'test/hello.txt';
    const testData = Buffer.from('Hello World');

    console.log('Testing put operation...');
    await objectStorage.put(testKey, testData, {
      'Content-Type': 'text/plain'
    });

    console.log('Testing get operation...');
    const retrieved = await objectStorage.get(testKey);

    console.log('Testing delete operation...');
    await objectStorage.delete(testKey);

    console.log('All operations successful!');
    return true;
  } catch (error) {
    console.error('Storage test failed:', error);
    return false;
  }
}

testStorage().then(success => {
  console.log('Test completed:', success ? 'PASSED' : 'FAILED');
});