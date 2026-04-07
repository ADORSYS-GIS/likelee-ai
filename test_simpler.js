// PASTE THIS IN YOUR BROWSER CONSOLE
// Make sure you're on the Likelee application page (dashboard, settings, etc.)

console.log('='.repeat(60));
console.log('CHECKING LOCAL STORAGE');
console.log('='.repeat(60));

// Check all localStorage keys
console.log('\n📦 All localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`  - ${key}`);
}

// Try to find auth-related keys
const possibleKeys = [
  'supabase.auth.token',
  'supabase.auth.token.auto',
  'supabase.auth.token.custom',
  'sb-access-token',
  'sb-refresh-token',
  'supabase.session',
];

console.log('\n🔑 Checking for auth tokens:');
let foundToken = null;
let tokenKey = null;

for (const key of possibleKeys) {
  const value = localStorage.getItem(key);
  if (value) {
    console.log(`  ✓ Found: ${key}`);
    foundToken = value;
    tokenKey = key;
    break;
  } else {
    console.log(`  ✗ Not found: ${key}`);
  }
}

// If we found a token, test the API
if (foundToken) {
  console.log('\n✅ Auth token found! Testing API...\n');
  
  let accessToken = foundToken;
  
  // Parse if it's JSON
  try {
    const parsed = JSON.parse(foundToken);
    accessToken = parsed.access_token || parsed.access || foundToken;
  } catch (e) {
    // Not JSON, use as-is
  }
  
  // Test the API
  fetch('/api/team/context?organization_type=agency', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  .then(async response => {
    console.log('Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ API Error:', text);
      return null;
    }
    
    return response.json();
  })
  .then(data => {
    if (!data) return;
    
    console.log('\n📋 Team Context Response:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n🎯 Key Information:');
    console.log('  Organization ID:', data.organization_id);
    console.log('  Membership Role:', data.membership_role);
    console.log('  Permissions:', data.permissions);
    
    const hasManageBilling = data.permissions?.includes('manage_billing');
    console.log('\n✅ Has manage_billing permission?', hasManageBilling ? 'YES ✓' : 'NO ✗');
    
    if (!hasManageBilling) {
      console.log('\n❌ PROBLEM FOUND: Missing manage_billing permission!');
      console.log('   Your role is:', data.membership_role);
      console.log('   Backend is not returning the correct permissions.');
    }
  })
  .catch(err => {
    console.error('❌ Error calling API:', err);
  });
} else {
  console.log('\n❌ No auth token found in localStorage!');
  console.log('\n💡 Possible reasons:');
  console.log('  1. You\'re not logged in');
  console.log('  2. You\'re in a different browser tab');
  console.log('  3. Token is stored differently');
  console.log('\n🔍 Try this: Go to the Likelee dashboard page first, then run this test.');
}

console.log('\n' + '='.repeat(60));
