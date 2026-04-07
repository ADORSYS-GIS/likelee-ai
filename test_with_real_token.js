// PASTE THIS IN YOUR BROWSER CONSOLE
// This will test the team context API with your actual auth token

console.log('='.repeat(60));
console.log('TESTING WITH ACTUAL AUTH TOKEN');
console.log('='.repeat(60));

// Find the Supabase auth token (format: sb-{project-id}-auth-token)
let authToken = null;
let tokenKey = null;

for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.includes('-auth-token')) {
    authToken = localStorage.getItem(key);
    tokenKey = key;
    console.log('✅ Found auth token:', key);
    break;
  }
}

if (!authToken) {
  console.error('❌ No auth token found!');
  throw new Error('No auth token');
}

// Parse the token
let accessToken = null;
try {
  const parsed = JSON.parse(authToken);
  accessToken = parsed.access_token;
  console.log('✅ Access token extracted');
  
  // Decode JWT to see user info
  const payload = JSON.parse(atob(accessToken.split('.')[1]));
  console.log('\n👤 User Info:');
  console.log('  User ID:', payload.sub);
  console.log('  Email:', payload.email);
  console.log('  Role:', payload.user_metadata?.role || 'N/A');
} catch (e) {
  console.error('Failed to parse token:', e);
  throw e;
}

// Test the team context API
console.log('\n🔍 Testing /api/team/context...\n');

fetch('/api/team/context?organization_type=agency', {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
})
.then(async response => {
  console.log('Response Status:', response.status, response.statusText);
  
  if (!response.ok) {
    const text = await response.text();
    console.error('\n❌ API ERROR:');
    console.error(text);
    throw new Error('API returned error');
  }
  
  return response.json();
})
.then(data => {
  console.log('\n✅ API SUCCESS!\n');
  console.log('📋 Full Response:');
  console.log(JSON.stringify(data, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 KEY INFORMATION');
  console.log('='.repeat(60));
  console.log('Organization ID:', data.organization_id);
  console.log('Organization Name:', data.organization_name);
  console.log('Membership Role:', data.membership_role);
  console.log('Permissions Count:', data.permissions?.length || 0);
  console.log('\nPermissions:');
  data.permissions?.forEach((p, i) => console.log(`  ${i+1}. ${p}`));
  
  const hasManageBilling = data.permissions?.includes('manage_billing');
  console.log('\n' + '='.repeat(60));
  console.log('✅ HAS manage_billing PERMISSION?', hasManageBilling ? 'YES ✓' : 'NO ✗');
  console.log('='.repeat(60));
  
  if (!hasManageBilling) {
    console.log('\n❌ PROBLEM IDENTIFIED!');
    console.log('Your membership role is:', data.membership_role);
    console.log('But the backend is NOT returning manage_billing permission.');
    console.log('\nExpected permissions for owner:');
    console.log('  - manage_billing');
    console.log('  - invite_team_members');
    console.log('  - create_campaigns');
    console.log('  - etc.');
    console.log('\nActual permissions received:');
    console.log(' ', data.permissions);
  } else {
    console.log('\n✅ PERMISSION IS CORRECT!');
    console.log('If you still see "Access Denied", try:');
    console.log('  1. Clear browser cache and reload');
    console.log('  2. Log out and log back in');
    console.log('  3. Check browser console for other errors');
  }
})
.catch(err => {
  console.error('\n❌ ERROR:', err.message || err);
});

console.log('\nFetching...');
