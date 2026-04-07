// Paste this in your browser console (F12 > Console tab) while logged in
// This will test the team context API and show you exactly what's happening

(async function testBillingAccess() {
  console.log('='.repeat(60));
  console.log('BILLING ACCESS DIAGNOSTIC TEST');
  console.log('='.repeat(60));
  console.log('');

  // Get auth token
  const authToken = localStorage.getItem('supabase.auth.token');
  if (!authToken) {
    console.error('❌ No auth token found. Are you logged in?');
    return;
  }

  let parsedToken;
  try {
    parsedToken = JSON.parse(authToken);
  } catch (e) {
    console.error('❌ Failed to parse auth token:', e);
    return;
  }

  const accessToken = parsedToken.access_token;
  if (!accessToken) {
    console.error('❌ No access token found in auth token');
    return;
  }

  // Decode JWT to see user info
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    console.log('✅ Logged in as:');
    console.log('   User ID:', payload.sub);
    console.log('   Email:', payload.email);
    console.log('   Role:', payload.user_metadata?.role || 'unknown');
    console.log('');
  } catch (e) {
    console.warn('⚠️  Could not decode JWT:', e);
  }

  // Test team context API
  console.log('🔍 Testing /api/team/context...');
  console.log('');

  try {
    const response = await fetch('/api/team/context?organization_type=agency', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API returned error:');
      console.error('   Status:', response.status);
      console.error('   Error:', errorText);
      console.log('');
      console.log('💡 This is the problem! The API should return 200 OK.');
      console.log('   Check backend server logs for details.');
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    // Check permissions
    console.log('📋 Permission Check:');
    console.log('   Membership Role:', data.membership_role);
    console.log('   Permissions:', data.permissions);
    console.log('');

    const hasBillingPermission = data.permissions?.includes('manage_billing');
    if (hasBillingPermission) {
      console.log('✅ Has manage_billing permission');
      console.log('');
      console.log('🤔 Strange! You have the permission but still getting denied.');
      console.log('   Possible causes:');
      console.log('   1. Frontend cache issue - Try clearing localStorage and logging in again');
      console.log('   2. Race condition - Permission check happening before context loads');
      console.log('   3. Multiple API calls returning different data');
    } else {
      console.log('❌ Missing manage_billing permission');
      console.log('');
      console.log('🔧 Problem found! Your role is:', data.membership_role);
      console.log('   Expected permissions for owner role:');
      console.log('   ', [
        'create_campaigns',
        'approve_deliverables',
        'view_deliverables',
        'manage_billing',
        'invite_team_members',
        'update_member_roles',
        'view_team_members',
        'view_brand_connections',
        'manage_brand_connections',
        'view_licenses',
        'manage_licenses',
        'transfer_ownership',
        'delete_organisation'
      ]);
      console.log('');
      console.log('💡 Solution:');
      console.log('   The backend is returning wrong permissions for your role.');
      console.log('   Check backend logs for errors.');
    }

  } catch (error) {
    console.error('❌ Failed to call API:', error);
    console.log('');
    console.log('💡 Possible causes:');
    console.log('   1. Backend server not running');
    console.log('   2. Network error');
    console.log('   3. CORS issue');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('END OF DIAGNOSTIC TEST');
  console.log('='.repeat(60));
})();
