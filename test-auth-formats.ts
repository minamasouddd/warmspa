/**
 * Test script to verify different Authorization header formats
 * Run this in the browser console after logging in
 */

// Get the token from localStorage
const token = localStorage.getItem('token');
const apiEndpoint = 'https://warm-spa.vercel.app/api/v1/users/get-user-data';

if (!token) {
  console.error('❌ No token found in localStorage. Please login first.');
} else {
  console.log('✅ Token found:', token.substring(0, 30) + '...');
  console.log('\n📋 Testing different Authorization header formats...\n');

  // Test formats in order of priority
  const formats = [
    { name: 'User', header: `User ${token}` },
    { name: 'Client', header: `Client ${token}` },
    { name: 'Bearer', header: `Bearer ${token}` },
    { name: 'Token only', header: token }
  ];

  let testIndex = 0;

  function testNextFormat() {
    if (testIndex >= formats.length) {
      console.log('\n✅ All formats tested. Check the results above.');
      return;
    }

    const format = formats[testIndex];
    console.log(`\n🔄 Testing format ${testIndex + 1}/${formats.length}: "${format.name}"`);
    console.log(`📤 Authorization header: ${format.header.substring(0, 50)}...`);

    fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': format.header,
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        console.log(`   Status: ${response.status} ${response.statusText}`);
        return response.json().then(data => ({ status: response.status, data }));
      })
      .then(({ status, data }) => {
        if (status === 200 || status === 201) {
          console.log(`✅ SUCCESS with "${format.name}" format!`);
          console.log('   Response:', data);
        } else {
          console.log(`❌ Failed with "${format.name}" format`);
          console.log('   Error:', data?.message || data?.error || 'Unknown error');
        }
        testIndex++;
        testNextFormat();
      })
      .catch(error => {
        console.log(`❌ Error with "${format.name}" format:`, error.message);
        testIndex++;
        testNextFormat();
      });
  }

  testNextFormat();
}
